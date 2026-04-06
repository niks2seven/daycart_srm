import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingCart, Trash2, Plus, Minus, ArrowRight, ShieldCheck, Zap, AlertCircle, Star, Wallet } from 'lucide-react';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { cn, formatCurrency } from '../lib/utils';
import { useNavigate } from 'react-router-dom';

export default function Cart() {
  const { 
    items, 
    subtotal, 
    deliveryFee, 
    handlingFee, 
    total, 
    updateQuantity, 
    removeFromCart, 
    clearCart,
    loyaltyPointsToEarn,
    redeemedPoints,
    setRedeemedPoints
  } = useCart();
  const { profile, refreshProfile } = useAuth();
  const [checkingOut, setCheckingOut] = useState(false);
  const navigate = useNavigate();

  const maxRedeemable = Math.min(profile?.loyalty_points || 0, Math.floor(subtotal * 10));
  const [redeemInput, setRedeemInput] = useState(0);

  const handleCheckout = async () => {
    if (!profile?.id || items.length === 0) return;
    
    if (profile.wallet_balance < total) {
      alert('Insufficient wallet balance. Please top up your wallet.');
      navigate('/wallet');
      return;
    }

    setCheckingOut(true);
    try {
      // 1. Create Order Record
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: profile.id,
          total_amount: total,
          status: 'processing',
          items: items 
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 2. Update Profile (Wallet & Loyalty Points)
      const newLoyaltyPoints = (profile.loyalty_points || 0) - redeemedPoints + loyaltyPointsToEarn;
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ 
          wallet_balance: profile.wallet_balance - total,
          loyalty_points: newLoyaltyPoints
        })
        .eq('id', profile.id);
      
      if (profileUpdateError) throw profileUpdateError;

      // 3. Record Transaction
      await supabase.from('transactions').insert({
        user_id: profile.id,
        amount: total,
        type: 'debit',
        description: `Order #${orderData.id.slice(0, 8)}: ${items.length} items`
      });

      clearCart();
      await refreshProfile();
      navigate('/order-success', { state: { order: orderData } });
    } catch (err) {
      console.error(err);
      alert('Checkout failed. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  };

  const handleRedeem = () => {
    if (redeemInput > (profile?.loyalty_points || 0)) {
      alert('Not enough points!');
      return;
    }
    setRedeemedPoints(redeemInput);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
          <ShoppingCart className="text-slate-200" size={48} />
        </div>
        <h2 className="text-3xl font-display font-bold text-slate-900 mb-4 tracking-tighter">Your cart is empty</h2>
        <p className="text-slate-500 max-w-xs mb-10 font-medium">
          Looks like you haven't added any essentials yet. Start shopping for 15-minute delivery!
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary hover:bg-orange-600 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-orange-100"
        >
          Start Shopping
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      <header>
        <h1 className="text-4xl font-display font-bold tracking-tighter mb-2">My Cart</h1>
        <p className="text-slate-500 font-medium">Review your items for instant delivery.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Items List */}
        <div className="lg:col-span-2 space-y-4">
          <AnimatePresence mode="popLayout">
            {items.map(item => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="bento-card flex items-center gap-6 p-4"
              >
                <div className="w-20 h-20 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex-shrink-0">
                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-slate-900 truncate">{item.name}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mb-2">{item.category}</p>
                  <p className="text-primary font-display font-bold">{formatCurrency(item.price)}</p>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <button 
                    onClick={() => updateQuantity(item.id, -1)}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="w-6 text-center font-bold text-slate-900">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, 1)}
                    className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-primary transition-colors"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loyalty Points Redemption */}
          <div className="bento-card bg-orange-50 border-orange-100">
            <div className="flex items-center gap-2 text-orange-600 mb-4">
              <Star size={20} fill="currentColor" />
              <h3 className="text-lg font-display font-bold">Redeem Loyalty Points</h3>
            </div>
            <p className="text-xs font-medium text-slate-600 mb-4">
              You have <span className="font-bold text-primary">{profile?.loyalty_points || 0} points</span>. 
              10 points = ₹1 discount.
            </p>
            <div className="flex gap-3">
              <input 
                type="number" 
                max={profile?.loyalty_points || 0}
                value={redeemInput}
                onChange={(e) => setRedeemInput(parseInt(e.target.value) || 0)}
                className="flex-1 bg-white border border-orange-200 rounded-xl px-4 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="Points to redeem"
              />
              <button 
                onClick={handleRedeem}
                className="bg-primary text-white px-6 py-2 rounded-xl text-xs font-bold hover:bg-orange-600 transition-colors"
              >
                Apply
              </button>
            </div>
            {redeemedPoints > 0 && (
              <p className="text-xs font-bold text-green-600 mt-2">
                Applied ₹{redeemedPoints / 10} discount!
              </p>
            )}
          </div>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <div className="bento-card">
            <h3 className="text-xl font-display font-bold mb-6">Order Summary</h3>
            <div className="space-y-4 mb-8">
              <div className="flex justify-between text-sm font-medium text-slate-500">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm font-medium text-slate-500">
                <span>Delivery Fee</span>
                {deliveryFee === 0 ? (
                  <span className="text-green-600 font-bold">FREE</span>
                ) : (
                  <span>{formatCurrency(deliveryFee)}</span>
                )}
              </div>
              <div className="flex justify-between text-sm font-medium text-slate-500">
                <span>Handling Fee</span>
                <span>{formatCurrency(handlingFee)}</span>
              </div>
              {redeemedPoints > 0 && (
                <div className="flex justify-between text-sm font-bold text-green-600">
                  <span>Points Discount</span>
                  <span>-{formatCurrency(redeemedPoints / 10)}</span>
                </div>
              )}
              <div className="h-px bg-slate-100 my-4" />
              <div className="flex justify-between items-end">
                <span className="text-sm font-bold text-slate-900 uppercase tracking-widest">Total</span>
                <span className="text-3xl font-display font-bold text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 mb-8">
              <div className="flex items-center gap-2 text-orange-600 mb-2">
                <Zap size={16} fill="currentColor" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Loyalty Reward</span>
              </div>
              <p className="text-xs font-medium text-slate-600">
                You'll earn <span className="font-bold text-primary">{loyaltyPointsToEarn} points</span> with this order.
              </p>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full bg-secondary hover:bg-slate-800 text-white py-5 rounded-2xl font-bold transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {checkingOut ? 'Processing...' : 'Place Order'}
              <ArrowRight size={20} />
            </button>

            <div className="mt-6 flex items-center justify-center gap-2 text-slate-400">
              <ShieldCheck size={16} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Secure Wallet Payment</span>
            </div>
          </div>

          {profile && profile.wallet_balance < total && (
            <div className="bento-card border-red-100 bg-red-50">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
                <div>
                  <p className="text-sm font-bold text-red-900 mb-1">Insufficient Balance</p>
                  <p className="text-xs text-red-700 mb-4">Your wallet balance is {formatCurrency(profile.wallet_balance)}. You need {formatCurrency(total - profile.wallet_balance)} more.</p>
                  <button 
                    onClick={() => navigate('/wallet')}
                    className="text-xs font-bold text-red-900 underline underline-offset-4"
                  >
                    Top up now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
