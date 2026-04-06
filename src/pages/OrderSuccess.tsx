import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Package, Truck, ArrowRight, ShoppingBag } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { formatCurrency } from '../lib/utils';

export default function OrderSuccess() {
  const navigate = useNavigate();
  const location = useLocation();
  const orderData = location.state?.order;

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bento-card text-center space-y-8 p-10"
      >
        <div className="relative mx-auto w-24 h-24">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-full h-full bg-green-100 rounded-full flex items-center justify-center text-green-600"
          >
            <CheckCircle2 size={48} />
          </motion.div>
          <motion.div 
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="absolute -top-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white shadow-lg"
          >
            <Truck size={16} />
          </motion.div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl font-display font-bold tracking-tighter text-slate-900">Order Confirmed!</h1>
          <p className="text-slate-500 font-medium">Your essentials are being packed and will arrive in 15 minutes.</p>
        </div>

        {orderData && (
          <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 text-left space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Order ID</span>
              <span className="text-xs font-bold text-slate-900">#{orderData.id.slice(0, 8)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Paid</span>
              <span className="text-sm font-bold text-primary">{formatCurrency(orderData.total_amount)}</span>
            </div>
            <div className="h-px bg-slate-200" />
            <div className="flex -space-x-2">
              {orderData.items?.slice(0, 5).map((item: any, i: number) => (
                <div key={i} className="w-8 h-8 rounded-lg border-2 border-white overflow-hidden bg-white shadow-sm">
                  <img src={item.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
              ))}
              {orderData.items?.length > 5 && (
                <div className="w-8 h-8 rounded-lg border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-400">
                  +{orderData.items.length - 5}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3">
          <button
            onClick={() => navigate('/profile')}
            className="w-full bg-secondary hover:bg-slate-800 text-white py-4 rounded-2xl font-bold transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-2"
          >
            Track Order
            <Package size={18} />
          </button>
          <button
            onClick={() => navigate('/')}
            className="w-full bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-2"
          >
            Continue Shopping
            <ShoppingBag size={18} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
