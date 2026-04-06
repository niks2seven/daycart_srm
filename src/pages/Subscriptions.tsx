import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calendar as CalendarIcon, Plus, Package, Clock, CheckCircle2, AlertCircle, Trash2, ArrowRight, X, Minus, ShoppingCart, ChevronLeft, ChevronRight, Star, Info, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatCurrency } from '../lib/utils';
import { useNavigate, Link } from 'react-router-dom';
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isBefore, startOfToday, isToday, addDays } from 'date-fns';

interface SubCartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
}

export default function Subscriptions() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [eligibleProducts, setEligibleProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [updatingSlot, setUpdatingSlot] = useState(false);

  // New Subscription State
  const [subCart, setSubCart] = useState<SubCartItem[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<'full_month' | 'custom'>('full_month');
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<'morning' | 'evening'>('morning');
  const [redeemedPoints, setRedeemedPoints] = useState(0);
  const [redeemInput, setRedeemInput] = useState(0);
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const fetchSubscriptions = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) setSubscriptions(data);
    setLoading(false);
  };

  const fetchEligibleProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('is_subscription_eligible', true);
    
    if (!error && data) setEligibleProducts(data);
  };

  useEffect(() => {
    if (!profile?.id) return;
    
    fetchSubscriptions();
    fetchEligibleProducts();

    // Set up real-time listener for subscriptions
    const channel = supabase
      .channel(`subs-page-${profile.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'subscriptions', 
        filter: `user_id=eq.${profile.id}` 
      }, () => fetchSubscriptions())
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const handleUpdateSlot = async (subId: string, slot: string) => {
    setUpdatingSlot(true);
    const { error } = await supabase
      .from('subscriptions')
      .update({ delivery_slot: slot })
      .eq('id', subId);
    
    if (error) {
      alert('Failed to update delivery slot');
    } else {
      await fetchSubscriptions();
      if (selectedSub?.id === subId) {
        setSelectedSub((prev: any) => ({ ...prev, delivery_slot: slot }));
      }
    }
    setUpdatingSlot(false);
  };

  const addToSubCart = (product: any) => {
    setSubCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1, image_url: product.image_url }];
    });
  };

  const updateSubCartQuantity = (id: string, delta: number) => {
    setSubCart(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const calculateCosts = () => {
    const cartTotal = subCart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    let fee = 0;
    let total = 0;

    if (selectedPlan === 'full_month') {
      fee = 700;
      total = fee + (cartTotal * 30);
    } else {
      const perDayFee = cartTotal > 50 ? 28 : 33;
      fee = perDayFee * selectedDates.length;
      total = (cartTotal * selectedDates.length) + fee;
    }

    const discount = redeemedPoints / 10;
    total = Math.max(0, total - discount);

    return { cartTotal, fee, total, discount };
  };

  const { cartTotal, fee, total, discount } = calculateCosts();

  const handleCreateSubscription = async () => {
    if (!profile?.id || subCart.length === 0) return;
    setError(null);
    
    if (profile.wallet_balance < total) {
      setError('Insufficient wallet balance. Please top up your wallet.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create Subscription Record
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: profile.id,
          items: subCart,
          plan_type: selectedPlan,
          selected_dates: selectedPlan === 'custom' ? selectedDates.map(d => format(d, 'yyyy-MM-dd')) : null,
          start_date: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
          subscription_fee: fee,
          total_cost: total,
          monthly_cost: total,
          status: 'active',
          delivery_slot: selectedSlot
        });
      
      if (subError) {
        console.error('Subscription Insert Error:', subError);
        throw new Error(subError.message);
      }

      // 2. Update Profile
      const newLoyaltyPoints = (profile.loyalty_points || 0) - redeemedPoints + Math.floor(total);
      const { error: profileError } = await supabase.from('profiles').update({ 
        wallet_balance: profile.wallet_balance - total,
        loyalty_points: newLoyaltyPoints
      }).eq('id', profile.id);

      if (profileError) {
        console.error('Profile Update Error:', profileError);
        throw new Error(profileError.message);
      }

      // 3. Record Transaction
      const { error: transError } = await supabase.from('transactions').insert({
        user_id: profile.id,
        amount: total,
        type: 'debit',
        description: `Subscription: ${subCart.length} items (${selectedPlan})`
      });

      if (transError) {
        console.error('Transaction Insert Error:', transError);
        // We don't throw here as the main actions succeeded, but we log it
      }

      await refreshProfile();
      await fetchSubscriptions();
      setShowPlanModal(false);
      setSubCart([]);
      setSelectedDates([]);
      setRedeemedPoints(0);
      setRedeemInput(0);
    } catch (err: any) {
      console.error('Subscription Creation Failed:', err);
      setError(err.message || 'Failed to create subscription. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (subId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'paused' : 'active';
    const { error } = await supabase
      .from('subscriptions')
      .update({ status: newStatus })
      .eq('id', subId);
    
    if (error) {
      alert('Failed to update status: ' + error.message);
    } else {
      fetchSubscriptions();
    }
  };

  const handleSkipTomorrow = async (subId: string, currentSkipped: string[] = []) => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    
    if (currentSkipped?.includes(tomorrowStr)) {
      alert('Already skipped for tomorrow');
      return;
    }

    const { error } = await supabase
      .from('subscriptions')
      .update({ skipped_dates: [...(currentSkipped || []), tomorrowStr] })
      .eq('id', subId);
    
    if (error) {
      alert('Failed to skip: ' + error.message);
    } else {
      fetchSubscriptions();
    }
  };

  const handleCancelSubscription = async (subId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) return;

    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subId);
    
    if (error) {
      alert('Failed to cancel: ' + error.message);
    } else {
      fetchSubscriptions();
    }
  };

  const toggleDate = (date: Date) => {
    if (isBefore(date, startOfToday())) return;
    setSelectedDates(prev => {
      const exists = prev.find(d => isSameDay(d, date));
      if (exists) return prev.filter(d => !isSameDay(d, date));
      return [...prev, date];
    });
  };

  const renderCalendar = () => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between mb-2">
          <h4 className="font-display font-bold text-slate-900 text-sm">{format(currentMonth, 'MMMM yyyy')}</h4>
          <div className="flex gap-1">
            <button onClick={() => setCurrentMonth(prev => addMonths(prev, -1))} className="p-1.5 hover:bg-slate-100 rounded-lg">
              <ChevronLeft size={16} />
            </button>
            <button onClick={() => setCurrentMonth(prev => addMonths(prev, 1))} className="p-1.5 hover:bg-slate-100 rounded-lg">
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
            <div key={`${d}-${i}`} className="text-center text-[9px] font-bold text-slate-400 py-1">{d}</div>
          ))}
          {Array.from({ length: start.getDay() }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}
          {days.map(day => {
            const isSelected = selectedDates.find(d => isSameDay(d, day));
            const isPast = isBefore(day, startOfToday());
            return (
              <button
                key={day.toString()}
                disabled={isPast}
                onClick={() => toggleDate(day)}
                className={cn(
                  "aspect-square rounded-lg flex items-center justify-center text-[10px] font-bold transition-all border",
                  isSelected ? "bg-primary border-primary text-white" : "bg-white border-slate-100 text-slate-700 hover:border-slate-200",
                  isPast ? "opacity-20 cursor-not-allowed" : "",
                  isToday(day) && !isSelected ? "border-primary text-primary" : ""
                )}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-12">
      <header>
        <h1 className="text-4xl font-display font-bold tracking-tighter mb-2">Smart Subscriptions</h1>
        <p className="text-slate-500 font-medium">Select essentials for automated daily delivery.</p>
      </header>

      {/* Product Grid - Main View */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <Package size={24} className="text-primary" />
            Subscription Eligible
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {eligibleProducts.map(product => {
            const cartItem = subCart.find(i => i.id === product.id);
            return (
              <motion.div
                key={product.id}
                whileHover={{ y: -4 }}
                className="bento-card group"
              >
                <div className="aspect-square rounded-2xl bg-slate-50 mb-4 overflow-hidden relative">
                  <img 
                    src={product.image_url} 
                    alt={product.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <h4 className="font-bold text-slate-900 mb-1 truncate">{product.name}</h4>
                <p className="text-slate-400 text-xs font-medium mb-4">{product.category}</p>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-display font-bold text-primary">{formatCurrency(product.price)}</span>
                  
                  {cartItem ? (
                    <div className="flex items-center gap-3 bg-slate-900 text-white rounded-xl px-2 py-1">
                      <button 
                        onClick={() => updateSubCartQuantity(product.id, -1)}
                        className="p-1 hover:text-primary transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="text-sm font-bold w-4 text-center">{cartItem.quantity}</span>
                      <button 
                        onClick={() => updateSubCartQuantity(product.id, 1)}
                        className="p-1 hover:text-primary transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToSubCart(product)}
                      className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-primary transition-colors shadow-lg shadow-slate-200"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Active Subscriptions Section */}
      {subscriptions.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-display font-bold flex items-center gap-2">
            <CheckCircle2 size={24} className="text-green-500" />
            My Active Subscriptions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subscriptions.map(sub => (
              <motion.div
                key={sub.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("bento-card relative overflow-hidden", sub.status === 'cancelled' ? "opacity-60" : "")}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex -space-x-4 mb-4">
                      {sub.items.map((item: any, i: number) => (
                        <div key={i} className="w-12 h-12 rounded-xl border-4 border-white overflow-hidden bg-slate-100 shadow-sm">
                          <img src={item.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        </div>
                      ))}
                    </div>
                    <h3 className="text-xl font-display font-bold text-slate-900">
                      {sub.items.length} Items Subscription
                    </h3>
                    <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                      <Clock size={12} />
                      <span>{sub.plan_type === 'full_month' ? 'Daily' : 'Custom Dates'}</span>
                    </div>
                  </div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                    sub.status === 'active' ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-500"
                  )}>
                    {sub.status}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Cost</p>
                    <p className="text-lg font-display font-bold text-primary">{formatCurrency(sub.total_cost)}</p>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Status</p>
                    <p className="text-lg font-display font-bold text-slate-900 capitalize">{sub.status}</p>
                  </div>
                </div>

                {sub.status !== 'cancelled' && (
                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleToggleStatus(sub.id, sub.status)}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-xs font-bold transition-all",
                        sub.status === 'active' ? "bg-orange-100 text-orange-600 hover:bg-orange-200" : "bg-green-100 text-green-600 hover:bg-green-200"
                      )}
                    >
                      {sub.status === 'active' ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      onClick={() => setSelectedSub(sub)}
                      className="flex-1 py-3 rounded-xl text-xs font-bold bg-primary/10 text-primary hover:bg-primary/20 transition-all flex items-center justify-center gap-2"
                    >
                      <Info size={14} />
                      Details
                    </button>
                    <button
                      onClick={() => handleSkipTomorrow(sub.id, sub.skipped_dates)}
                      className="flex-1 py-3 rounded-xl text-xs font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                    >
                      Skip Tomorrow
                    </button>
                    <button
                      onClick={() => handleCancelSubscription(sub.id)}
                      className="px-4 py-3 rounded-xl text-xs font-bold bg-red-50 text-red-500 hover:bg-red-100 transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </section>
      )}

      {/* Floating Subscription Cart */}
      <AnimatePresence>
        {subCart.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md bg-secondary text-white rounded-3xl p-4 shadow-2xl flex items-center justify-between z-40"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center relative">
                <CalendarIcon size={24} />
                <span className="absolute -top-2 -right-2 bg-white text-primary text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-primary">
                  {subCart.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold">{subCart.length} Items Selected</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Smart Subscription</p>
              </div>
            </div>
            <button
              onClick={() => setShowPlanModal(true)}
              className="bg-primary hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold transition-colors"
            >
              View Cart
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Plan & Calendar Modal */}
      <AnimatePresence>
        {showPlanModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowPlanModal(false)} className="absolute inset-0 bg-secondary/40 backdrop-blur-sm" />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[40px] p-8 md:p-10 shadow-2xl relative z-10 overflow-hidden max-h-[90vh] flex flex-col"
            >
              <button onClick={() => setShowPlanModal(false)} className="absolute top-8 right-8 p-2 hover:bg-slate-50 rounded-full transition-colors z-20">
                <X size={24} className="text-slate-400" />
              </button>

              <h2 className="text-3xl font-display font-bold tracking-tighter mb-8">Subscription Setup</h2>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-red-900">{error}</p>
                    {error.includes('wallet balance') && (
                      <button 
                        onClick={() => navigate('/wallet')}
                        className="text-xs font-bold text-red-700 underline mt-1"
                      >
                        Top up wallet
                      </button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex-1 overflow-y-auto pr-2 no-scrollbar space-y-8">
                {/* Cart Review */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Review Items</label>
                    <button onClick={() => setSubCart([])} className="text-[10px] font-bold text-red-500">Clear All</button>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {subCart.map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <img src={item.image_url} alt="" className="w-8 h-8 object-cover rounded-lg" referrerPolicy="no-referrer" />
                          <span className="text-xs font-bold text-slate-900">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateSubCartQuantity(item.id, -1)} className="p-1 hover:text-primary"><Minus size={14} /></button>
                          <span className="text-xs font-bold">{item.quantity}</span>
                          <button onClick={() => updateSubCartQuantity(item.id, 1)} className="p-1 hover:text-primary"><Plus size={14} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Plan Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Choose Plan</label>
                      <div className="space-y-2">
                        <button
                          onClick={() => setSelectedPlan('full_month')}
                          className={cn(
                            "w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all",
                            selectedPlan === 'full_month' ? "border-primary bg-orange-50" : "border-slate-100"
                          )}
                        >
                          <div className="text-left">
                            <p className="font-bold text-slate-900">Full Month</p>
                            <p className="text-[10px] text-slate-500 font-medium">₹700 flat fee + daily items</p>
                          </div>
                          {selectedPlan === 'full_month' && <CheckCircle2 size={20} className="text-primary" />}
                        </button>
                        <button
                          onClick={() => setSelectedPlan('custom')}
                          className={cn(
                            "w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all",
                            selectedPlan === 'custom' ? "border-primary bg-orange-50" : "border-slate-100"
                          )}
                        >
                          <div className="text-left">
                            <p className="font-bold text-slate-900">Custom Days</p>
                            <p className="text-[10px] text-slate-500 font-medium">₹28/₹33 per delivery</p>
                          </div>
                          {selectedPlan === 'custom' && <CheckCircle2 size={20} className="text-primary" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Delivery Slot</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => setSelectedSlot('morning')}
                          className={cn(
                            "p-3 rounded-xl border-2 text-left transition-all",
                            selectedSlot === 'morning' ? "border-primary bg-orange-50" : "border-slate-100"
                          )}
                        >
                          <p className="text-xs font-bold text-slate-900">Morning</p>
                          <p className="text-[9px] text-slate-500">6:00 AM - 8:00 AM</p>
                        </button>
                        <button
                          onClick={() => setSelectedSlot('evening')}
                          className={cn(
                            "p-3 rounded-xl border-2 text-left transition-all",
                            selectedSlot === 'evening' ? "border-primary bg-orange-50" : "border-slate-100"
                          )}
                        >
                          <p className="text-xs font-bold text-slate-900">Evening</p>
                          <p className="text-[9px] text-slate-500">6:00 PM - 8:00 PM</p>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                      <div className="flex items-center gap-2 text-orange-600">
                        <Star size={16} fill="currentColor" />
                        <label className="text-xs font-bold uppercase tracking-widest">Redeem Points</label>
                      </div>
                      <p className="text-[10px] font-medium text-slate-600">
                        Balance: <span className="font-bold text-primary">{profile?.loyalty_points || 0} points</span> (10 pts = ₹1)
                      </p>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          max={profile?.loyalty_points || 0}
                          value={redeemInput}
                          onChange={(e) => setRedeemInput(parseInt(e.target.value) || 0)}
                          className="flex-1 bg-white border border-orange-200 rounded-xl px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                          placeholder="Points"
                        />
                        <button 
                          onClick={() => {
                            if (redeemInput > (profile?.loyalty_points || 0)) {
                              alert('Not enough points!');
                              return;
                            }
                            setRedeemedPoints(redeemInput);
                          }}
                          className="bg-primary text-white px-4 py-2 rounded-xl text-[10px] font-bold hover:bg-orange-600 transition-colors"
                        >
                          Apply
                        </button>
                      </div>
                      {redeemedPoints > 0 && (
                        <p className="text-[10px] font-bold text-green-600">
                          Applied ₹{redeemedPoints / 10} discount!
                        </p>
                      )}
                    </div>

                    <div className="bg-slate-50 rounded-3xl p-6 space-y-3">
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Sub-Cart Total</span>
                        <span>{formatCurrency(cartTotal)}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        <span>Plan Fee</span>
                        <span>{formatCurrency(fee)}</span>
                      </div>
                      {discount > 0 && (
                        <div className="flex justify-between text-[10px] font-bold text-green-600 uppercase tracking-widest">
                          <span>Points Discount</span>
                          <span>-{formatCurrency(discount)}</span>
                        </div>
                      )}
                      <div className="h-px bg-slate-200" />
                      <div className="flex justify-between items-end">
                        <span className="text-xs font-bold text-slate-900 uppercase tracking-widest">Total</span>
                        <span className="text-2xl font-display font-bold text-primary">{formatCurrency(total)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {selectedPlan === 'custom' ? (
                      <>
                        <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Select Dates</label>
                        {renderCalendar()}
                      </>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                        <CalendarIcon className="text-slate-300 mb-4" size={40} />
                        <p className="text-sm font-bold text-slate-900">Full Month Plan</p>
                        <p className="text-xs text-slate-500 mt-2">Daily delivery for the next 30 days starting tomorrow.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button
                  onClick={handleCreateSubscription}
                  disabled={submitting || !profile?.id || subCart.length === 0 || (selectedPlan === 'custom' && selectedDates.length === 0)}
                  className="w-full bg-primary hover:bg-orange-600 text-white py-5 rounded-2xl font-bold transition-all shadow-xl shadow-orange-100 flex items-center justify-center gap-3 disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Confirm Subscription'}
                  <ArrowRight size={20} />
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSub(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
            >
              <div className="p-8 md:p-10">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-3xl font-display font-bold text-slate-900">Subscription Details</h2>
                    <p className="text-slate-500 font-medium mt-1">Manage your recurring delivery</p>
                  </div>
                  <button 
                    onClick={() => setSelectedSub(null)}
                    className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 hover:text-slate-600 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Delivery Items</h3>
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 no-scrollbar">
                        {selectedSub.items.map((item: any, i: number) => (
                          <div key={i} className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                            <img src={item.image_url} alt="" className="w-12 h-12 rounded-xl object-cover" referrerPolicy="no-referrer" />
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-900">{item.name}</p>
                              <p className="text-xs text-slate-500 font-medium">{formatCurrency(item.price)} × {item.quantity}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-6 bg-primary/5 rounded-[32px] border border-primary/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Value</span>
                        <span className="text-xl font-display font-bold text-primary">{formatCurrency(selectedSub.total_cost)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Plan</span>
                        <span className="text-xs font-bold text-slate-700 uppercase tracking-widest">
                          {selectedSub.plan_type === 'full_month' ? 'Daily' : 'Custom Dates'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-8">
                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Delivery Slot</h3>
                      <div className="grid grid-cols-2 gap-3">
                        {['morning', 'evening'].map((slot) => (
                          <button
                            key={slot}
                            disabled={updatingSlot}
                            onClick={() => handleUpdateSlot(selectedSub.id, slot)}
                            className={cn(
                              "p-4 rounded-2xl border-2 transition-all text-center group",
                              selectedSub.delivery_slot === slot 
                                ? "border-primary bg-orange-50 text-primary" 
                                : "border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200"
                            )}
                          >
                            <Clock size={20} className={cn(
                              "mx-auto mb-2",
                              selectedSub.delivery_slot === slot ? "text-primary" : "text-slate-300 group-hover:text-slate-400"
                            )} />
                            <p className="text-xs font-bold uppercase tracking-widest">{slot}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Skipped Dates</h3>
                      <div className="bg-slate-50 rounded-[32px] p-6 border border-slate-100">
                        {selectedSub.skipped_dates?.length > 0 ? (
                          <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2 no-scrollbar">
                            {selectedSub.skipped_dates.sort().reverse().map((date: string, i: number) => (
                              <div key={i} className="flex items-center gap-3 text-slate-600">
                                <Calendar size={14} className="text-slate-300" />
                                <span className="text-sm font-medium">{new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-4">
                            <Calendar size={24} className="mx-auto text-slate-200 mb-2" />
                            <p className="text-xs text-slate-400 font-medium">No skipped dates yet</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
