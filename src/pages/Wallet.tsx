import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Wallet as WalletIcon, Plus, History, TrendingUp, TrendingDown, CreditCard, ShieldCheck, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatCurrency } from '../lib/utils';

const ADD_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function Wallet() {
  const { profile, refreshProfile } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [customAmount, setCustomAmount] = useState('');

  const fetchTransactions = async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    
    if (!error && data) setTransactions(data);
    setLoading(false);
  };

  useEffect(() => {
    if (!profile?.id) return;
    
    fetchTransactions();

    // Set up real-time listener
    const channel = supabase
      .channel(`wallet-trans-${profile.id}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'transactions', 
        filter: `user_id=eq.${profile.id}` 
      }, () => fetchTransactions())
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  const addMoney = async (amount: number) => {
    if (!profile?.id || amount <= 0) return;
    setAdding(true);
    
    try {
      // 1. Update Profile Balance
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ wallet_balance: (profile.wallet_balance || 0) + amount })
        .eq('id', profile.id);
      
      if (profileError) throw profileError;

      // 2. Record Transaction
      const { error: transError } = await supabase
        .from('transactions')
        .insert({
          user_id: profile.id,
          amount,
          type: 'credit',
          description: 'Wallet Top-up'
        });
      
      if (transError) throw transError;

      await refreshProfile();
      await fetchTransactions();
      setCustomAmount('');
    } catch (err) {
      console.error(err);
      alert('Failed to add money. Please try again.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-4xl font-display font-bold tracking-tighter mb-2">My Wallet</h1>
        <p className="text-slate-500 font-medium">Manage your prepaid balance and rewards.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Balance Card */}
        <div className="lg:col-span-2 space-y-8">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bento-card bg-white border border-slate-100 text-slate-900 relative overflow-hidden p-10"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 text-slate-500 mb-6">
                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                  <WalletIcon size={20} />
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.2em]">Current Balance</span>
              </div>
              <h2 className="text-6xl font-display font-bold mb-4 tracking-tighter text-slate-900">
                {formatCurrency(profile?.wallet_balance || 0)}
              </h2>
              <div className="flex items-center gap-4 text-slate-500 font-medium">
                <div className="flex items-center gap-1">
                  <ShieldCheck size={16} className="text-green-500" />
                  <span className="text-sm">Secure Prepaid Vault</span>
                </div>
                <div className="w-1 h-1 bg-slate-200 rounded-full" />
                <span className="text-sm">Instant Refunds</span>
              </div>
            </div>
            <div className="absolute right-[-5%] top-[-5%] w-64 h-64 bg-primary/5 rounded-full blur-[100px]" />
          </motion.div>

          {/* Add Money Section */}
          <div className="bento-card">
            <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
              <Plus size={20} className="text-primary" />
              Add Money to Wallet
            </h3>
            <div className="grid grid-cols-3 md:grid-cols-6 gap-4 mb-8">
              {ADD_AMOUNTS.map(amount => (
                <button
                  key={amount}
                  onClick={() => addMoney(amount)}
                  disabled={adding}
                  className="bg-slate-50 border border-slate-100 hover:border-primary hover:bg-orange-50 p-4 rounded-2xl transition-all group disabled:opacity-50"
                >
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1 group-hover:text-primary transition-colors">Add</p>
                  <p className="text-xl font-display font-bold text-slate-900">{formatCurrency(amount)}</p>
                </button>
              ))}
            </div>
            <div className="flex gap-4">
              <div className="relative flex-1">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="number" 
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="Enter custom amount" 
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>
              <button 
                onClick={() => addMoney(Number(customAmount))}
                disabled={adding || !customAmount}
                className="bg-primary hover:bg-orange-600 text-white px-8 rounded-2xl font-bold transition-all shadow-lg shadow-orange-100 disabled:opacity-50 flex items-center gap-2"
              >
                {adding ? 'Adding...' : 'Top Up'}
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Transaction History */}
        <div className="bento-card flex flex-col h-[600px]">
          <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
            <History size={20} className="text-primary" />
            Recent History
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-16 bg-slate-50 rounded-2xl animate-pulse" />
              ))
            ) : transactions.length > 0 ? (
              transactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center",
                      tx.type === 'credit' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                    )}>
                      {tx.type === 'credit' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{tx.description}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                        {new Date(tx.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "font-display font-bold",
                    tx.type === 'credit' ? "text-green-600" : "text-red-600"
                  )}>
                    {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                  <History className="text-slate-300" size={32} />
                </div>
                <p className="text-slate-400 font-medium">No transactions yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
