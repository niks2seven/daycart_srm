import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Wallet, Package, Clock, CheckCircle2, History, CreditCard, LogOut, Settings, ShieldCheck, ArrowRight, ShoppingCart, Star, Pause, Play, XCircle, FastForward, Plus, X, Calendar, Info, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { cn, formatCurrency } from '../lib/utils';
import { Link } from 'react-router-dom';
import { format, addDays } from 'date-fns';

export default function Profile() {
  const { profile, signOut, refreshProfile } = useAuth();
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<any>(null);
  const [updatingSlot, setUpdatingSlot] = useState(false);
  const [skippingId, setSkippingId] = useState<string | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');

  const fetchData = async () => {
    if (!profile?.id) return;
    const [subsRes, transRes, ordersRes] = await Promise.all([
      supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('transactions')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('orders')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false })
        .limit(5)
    ]);

    if (!subsRes.error) setSubscriptions(subsRes.data || []);
    if (!transRes.error) setTransactions(transRes.data || []);
    if (!ordersRes.error) setOrders(ordersRes.data || []);
    
    setLoading(false);
  };

  useEffect(() => {
    if (!profile?.id) return;

    setEditName(profile.full_name || '');
    setLoading(true);
    fetchData();

    // Set up real-time listeners
    const subsChannel = supabase
      .channel(`profile-subs-${profile.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'subscriptions', 
        filter: `user_id=eq.${profile.id}` 
      }, () => fetchData())
      .subscribe();

    const transChannel = supabase
      .channel(`profile-trans-${profile.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'transactions', 
        filter: `user_id=eq.${profile.id}` 
      }, () => fetchData())
      .subscribe();

    const ordersChannel = supabase
      .channel(`profile-orders-${profile.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders', 
        filter: `user_id=eq.${profile.id}` 
      }, () => fetchData())
      .subscribe();

    return () => {
      subsChannel.unsubscribe();
      transChannel.unsubscribe();
      ordersChannel.unsubscribe();
      supabase.removeChannel(subsChannel);
      supabase.removeChannel(transChannel);
      supabase.removeChannel(ordersChannel);
    };
  }, [profile?.id]);

  const handleUpdateSubscription = async (id: string, updates: any) => {
    const { error } = await supabase
      .from('subscriptions')
      .update(updates)
      .eq('id', id);
    
    if (error) {
      alert('Failed to update subscription');
    } else {
      fetchData();
    }
  };

  const handleSkipNext = async (sub: any) => {
    setSkippingId(sub.id);
    const nextDate = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const skippedDates = sub.skipped_dates || [];
    if (skippedDates.includes(nextDate)) {
      setSkippingId(null);
      return;
    }

    await handleUpdateSubscription(sub.id, {
      skipped_dates: [...skippedDates, nextDate]
    });
    setSkippingId(null);
  };

  const handleUpdateProfile = async () => {
    if (!profile?.id) return;
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: editName })
      .eq('id', profile.id);
    
    if (error) {
      alert('Failed to update profile');
    } else {
      await refreshProfile();
      setShowEditModal(false);
    }
  };

  const handleUpdateSlot = async (subId: string, slot: string) => {
    setUpdatingSlot(true);
    const { error } = await supabase
      .from('subscriptions')
      .update({ delivery_slot: slot })
      .eq('id', subId);
    
    if (error) {
      alert('Failed to update delivery slot');
    } else {
      await fetchData();
      if (selectedSub?.id === subId) {
        setSelectedSub((prev: any) => ({ ...prev, delivery_slot: slot }));
      }
    }
    setUpdatingSlot(false);
  };

  if (!profile) return null;

  return (
    <div className="space-y-10 pb-20">
      <header className="flex items-center justify-between">
        <h1 className="text-4xl font-display font-bold tracking-tighter">My Profile</h1>
        <div className="flex gap-2">
          <Link 
            to="/admin" 
            className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors"
            title="Admin Panel"
          >
            <ShieldCheck size={20} />
          </Link>
          <button 
            onClick={signOut}
            className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Info Card */}
        <div className="lg:col-span-1 space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bento-card bg-white border border-slate-100 p-8 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative z-10">
              <div className="w-20 h-20 bg-slate-50 rounded-[32px] flex items-center justify-center mb-6 border border-slate-100">
                <User size={40} className="text-primary" />
              </div>
              <h2 className="text-2xl font-display font-bold mb-1 text-slate-900">{profile.full_name || 'User'}</h2>
              <p className="text-slate-500 text-sm font-medium mb-8">{profile.email}</p>
              
              <div className="space-y-4">
                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Wallet size={16} className="text-primary" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Wallet Balance</span>
                    </div>
                    <Link 
                      to="/wallet" 
                      className="text-[10px] font-bold text-primary uppercase tracking-widest hover:underline flex items-center gap-1"
                    >
                      Top Up <Plus size={10} />
                    </Link>
                  </div>
                  <p className="text-3xl font-display font-bold text-slate-900">{formatCurrency(profile.wallet_balance)}</p>
                </div>

                <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <div className="flex items-center gap-3 mb-2">
                    <Star size={16} className="text-orange-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Loyalty Points</span>
                  </div>
                  <p className="text-3xl font-display font-bold text-orange-400">{profile.loyalty_points || 0}</p>
                  <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest">
                    Value: {formatCurrency((profile.loyalty_points || 0) / 10)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="bento-card bg-primary/5 border-primary/10 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                <Settings size={14} />
                Account Settings
              </h3>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => setShowEditModal(true)}
                className="w-full text-left p-5 bg-white border border-slate-100 rounded-3xl hover:border-primary hover:shadow-lg hover:shadow-primary/5 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <User size={20} />
                  </div>
                  <div>
                    <span className="block text-base font-bold text-slate-900">Edit Profile</span>
                    <span className="text-xs text-slate-500 font-medium">Update your personal info</span>
                  </div>
                </div>
                <ArrowRight size={20} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </button>
              
              <button className="w-full text-left p-5 bg-white border border-slate-100 rounded-3xl hover:border-primary hover:shadow-lg hover:shadow-primary/5 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-all">
                    <CreditCard size={20} />
                  </div>
                  <div>
                    <span className="block text-base font-bold text-slate-900">Payment Methods</span>
                    <span className="text-xs text-slate-500 font-medium">Manage your cards & UPI</span>
                  </div>
                </div>
                <ArrowRight size={20} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
              </button>

              <button className="w-full text-left p-5 bg-red-50/50 border border-red-100 rounded-3xl hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center text-red-500">
                    <XCircle size={20} />
                  </div>
                  <div>
                    <span className="block text-base font-bold text-red-600">Delete Account</span>
                    <span className="text-xs text-red-400 font-medium">Permanently remove data</span>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Subscriptions & Activity */}
        <div className="lg:col-span-2 space-y-10">
          {/* Active Subscriptions */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                <CheckCircle2 size={24} className="text-green-500" />
                Active Subscriptions
              </h2>
              <Link to="/subscriptions" className="text-xs font-bold text-primary hover:underline">Manage All</Link>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {loading ? (
                <div className="h-32 bg-slate-50 rounded-3xl animate-pulse" />
              ) : subscriptions.filter(s => s.status !== 'cancelled').length > 0 ? (
                subscriptions.filter(s => s.status !== 'cancelled').map(sub => (
                  <motion.div
                    key={sub.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={cn(
                      "bento-card border-l-8",
                      sub.status === 'active' ? "border-l-green-500" : "border-l-orange-400 bg-orange-50/30"
                    )}
                  >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="flex -space-x-3">
                          {sub.items.slice(0, 3).map((item: any, i: number) => (
                            <div key={i} className="w-12 h-12 rounded-xl border-2 border-white overflow-hidden bg-slate-100 shadow-sm">
                              <img src={item.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                          ))}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900">{sub.items.length} Items Subscription</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{sub.plan_type === 'full_month' ? 'Daily' : 'Custom Dates'}</span>
                            <span className="w-1 h-1 bg-slate-300 rounded-full" />
                            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">{sub.delivery_slot || 'Morning'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Cost</p>
                          <p className="text-lg font-display font-bold text-primary">{formatCurrency(sub.total_cost)}</p>
                        </div>
                        <div className={cn(
                          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                          sub.status === 'active' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                        )}>
                          {sub.status}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-6 border-t border-slate-100">
                      {sub.status === 'active' ? (
                        <button 
                          onClick={() => handleUpdateSubscription(sub.id, { status: 'paused' })}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-xs font-bold hover:bg-orange-100 transition-colors"
                        >
                          <Pause size={14} />
                          Pause
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleUpdateSubscription(sub.id, { status: 'active' })}
                          className="flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100 transition-colors"
                        >
                          <Play size={14} />
                          Resume
                        </button>
                      )}
                      <button 
                        onClick={() => handleSkipNext(sub)}
                        disabled={skippingId === sub.id}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                          skippingId === sub.id 
                            ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                            : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                        )}
                      >
                        {skippingId === sub.id ? (
                          <RefreshCw size={14} className="animate-spin" />
                        ) : (
                          <FastForward size={14} />
                        )}
                        {skippingId === sub.id ? 'Skipping...' : 'Skip Next Day'}
                      </button>
                      <button 
                        onClick={() => setSelectedSub(sub)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-colors"
                      >
                        <Info size={14} />
                        Details
                      </button>
                      <button 
                        onClick={() => handleUpdateSubscription(sub.id, { status: 'cancelled' })}
                        className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-500 rounded-xl text-xs font-bold hover:bg-red-100 transition-colors ml-auto"
                      >
                        <XCircle size={14} />
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-12 text-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                  <Package className="mx-auto text-slate-300 mb-4" size={32} />
                  <p className="text-sm font-bold text-slate-900">No active subscriptions</p>
                  <Link to="/subscriptions" className="text-xs text-primary font-bold mt-2 inline-block">Browse Essentials</Link>
                </div>
              )}
            </div>
          </section>

          {/* Recent Orders */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold flex items-center gap-2">
                <Package size={24} className="text-primary" />
                Recent Orders
              </h2>
            </div>
            
            <div className="grid grid-cols-1 gap-4">
              {loading ? (
                <div className="h-32 bg-slate-50 rounded-3xl animate-pulse" />
              ) : orders.length > 0 ? (
                orders.map(order => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bento-card"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                          <Package size={18} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">Order #{order.id.slice(0, 8)}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {new Date(order.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                        order.status === 'delivered' ? "bg-green-100 text-green-600" : "bg-orange-100 text-orange-600"
                      )}>
                        {order.status}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <div className="flex -space-x-2">
                        {order.items?.slice(0, 4).map((item: any, i: number) => (
                          <div key={i} className="w-8 h-8 rounded-lg border-2 border-white overflow-hidden bg-slate-100">
                            <img src={item.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          </div>
                        ))}
                        {order.items?.length > 4 && (
                          <div className="w-8 h-8 rounded-lg border-2 border-white bg-slate-50 flex items-center justify-center text-[8px] font-bold text-slate-400">
                            +{order.items.length - 4}
                          </div>
                        )}
                      </div>
                      <p className="text-lg font-display font-bold text-primary">{formatCurrency(order.total_amount)}</p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="p-12 text-center bg-slate-50 rounded-[32px] border border-dashed border-slate-200">
                  <ShoppingCart className="mx-auto text-slate-300 mb-4" size={32} />
                  <p className="text-sm font-bold text-slate-900">No orders yet</p>
                  <Link to="/" className="text-xs text-primary font-bold mt-2 inline-block">Start Shopping</Link>
                </div>
              )}
            </div>
          </section>

          {/* Recent Activity */}
          <section className="space-y-6">
            <h2 className="text-2xl font-display font-bold flex items-center gap-2">
              <History size={24} className="text-primary" />
              Recent Activity
            </h2>
            
            <div className="bento-card p-0 overflow-hidden">
              <div className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="p-6 h-20 animate-pulse bg-slate-50/50" />
                  ))
                ) : transactions.length > 0 ? (
                  transactions.map(tx => (
                    <div key={tx.id} className="p-6 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          tx.type === 'credit' ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500"
                        )}>
                          {tx.type === 'credit' ? <CreditCard size={18} /> : <ShoppingCart size={18} />}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{tx.description}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {new Date(tx.created_at).toLocaleDateString()} • {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                      <span className={cn(
                        "text-sm font-display font-bold",
                        tx.type === 'credit' ? "text-green-500" : "text-red-500"
                      )}>
                        {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center">
                    <History className="mx-auto text-slate-300 mb-4" size={32} />
                    <p className="text-sm font-bold text-slate-900">No recent activity</p>
                  </div>
                )}
              </div>
              {transactions.length > 0 && (
                <div className="p-4 bg-slate-50 text-center">
                  <Link to="/wallet" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-primary transition-colors">View Full History</Link>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {showEditModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowEditModal(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden p-10"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-display font-bold text-slate-900">Edit Profile</h2>
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="p-3 bg-slate-100 text-slate-400 rounded-2xl hover:bg-slate-200 transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 px-6 focus:ring-2 focus:ring-primary/20 transition-all font-bold text-slate-900"
                    placeholder="Enter your name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                  <input 
                    type="email" 
                    value={profile.email}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-2xl py-4 px-6 text-slate-400 font-bold cursor-not-allowed"
                  />
                  <p className="text-[10px] text-slate-400 font-medium ml-1">Email cannot be changed for security reasons.</p>
                </div>

                <button 
                  onClick={handleUpdateProfile}
                  className="w-full py-5 bg-primary text-white rounded-[24px] font-bold text-lg shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all mt-4"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}

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
