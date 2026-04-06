import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ShoppingCart, Plus, Minus, RefreshCw, Zap, Calendar, Star, TrendingUp, Search, ArrowRight, Database } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatCurrency } from '../lib/utils';

const CATEGORIES = ['All', 'Dairy', 'Bakery', 'Fruits', 'Vegetables', 'Beverages'];

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const { items, addToCart, updateQuantity } = useCart();
  const { profile } = useAuth();

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase.from('products').select('*');
    
    if (selectedCategory !== 'All') {
      query = query.eq('category', selectedCategory);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (!error && data) setProducts(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory]);

  const syncProducts = async () => {
    setSyncing(true);
    const sampleProducts = [
      { name: 'Organic Whole Milk', price: 65, category: 'Dairy', is_subscription_eligible: true, image_url: 'https://images.unsplash.com/photo-1563636619-e9107da5a163?w=800&q=80', description: 'Fresh farm-to-table organic whole milk.' },
      { name: 'Artisanal Sourdough', price: 120, category: 'Bakery', is_subscription_eligible: true, image_url: 'https://images.unsplash.com/photo-1585478259715-876acc5be8eb?w=800&q=80', description: 'Hand-crafted sourdough bread baked daily.' },
      { name: 'Free-Range Eggs (12pk)', price: 180, category: 'Dairy', is_subscription_eligible: true, image_url: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=800&q=80', description: 'Large brown free-range eggs.' },
      { name: 'Hass Avocado', price: 90, category: 'Fruits', is_subscription_eligible: false, image_url: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=800&q=80', description: 'Perfectly ripe Hass avocados.' },
      { name: 'Fresh Strawberries', price: 250, category: 'Fruits', is_subscription_eligible: false, image_url: 'https://images.unsplash.com/photo-1464960350423-93c6770463bc?w=800&q=80', description: 'Sweet and juicy seasonal strawberries.' },
      { name: 'Baby Spinach (200g)', price: 45, category: 'Vegetables', is_subscription_eligible: true, image_url: 'https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=800&q=80', description: 'Pre-washed baby spinach leaves.' },
      { name: 'Cold Brew Coffee', price: 150, category: 'Beverages', is_subscription_eligible: true, image_url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=800&q=80', description: 'Smooth 12-hour steeped cold brew.' },
      { name: 'Greek Yogurt', price: 85, category: 'Dairy', is_subscription_eligible: true, image_url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80', description: 'Thick and creamy plain Greek yogurt.' },
    ];

    const { error } = await supabase.from('products').upsert(sampleProducts, { onConflict: 'name' });
    if (error) console.error(error);
    await fetchProducts();
    setSyncing(false);
  };

  return (
    <div className="space-y-10">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tighter mb-2">
            Good Morning, <span className="text-primary">{profile?.full_name?.split(' ')[0] || 'User'}</span>
          </h1>
          <p className="text-slate-500 font-medium">What can we deliver in 15 minutes today?</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search essentials..." 
              className="w-full bg-white border border-slate-100 rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary/20 transition-all font-medium shadow-sm"
            />
          </div>
          <button 
            onClick={syncProducts}
            disabled={syncing}
            className="bg-white border border-slate-100 p-3 rounded-2xl text-slate-400 hover:text-primary transition-all shadow-sm disabled:opacity-50"
          >
            <RefreshCw size={20} className={syncing ? "animate-spin" : ""} />
          </button>
        </div>
      </header>

      {/* Bento Grid Features */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          whileHover={{ y: -4 }}
          className="md:col-span-2 bento-card bg-secondary text-white overflow-hidden relative group min-h-[200px] flex items-center"
        >
          <div className="absolute inset-0 z-0">
            <img 
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?w=1200&q=80" 
              alt="Fresh Groceries" 
              className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-secondary via-secondary/80 to-transparent" />
          </div>

          <div className="relative z-10 p-2">
            <div className="flex items-center gap-2 text-primary mb-2">
              <Zap size={16} fill="currentColor" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Flash Delivery</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold mb-1 leading-tight">
              Day<span className="text-primary">Cart</span>
            </h2>
            <p className="text-slate-300 text-sm font-medium mb-4 max-w-xs">
              Everyday groceries, made easy. Delivered in <span className="text-primary font-bold">15 minutes</span>.
            </p>
            <button className="bg-primary hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-orange-900/20 flex items-center gap-2 text-sm">
              Order Now
              <ArrowRight size={16} />
            </button>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -4 }}
          className="bento-card bg-orange-50 border-orange-100"
        >
          <div className="flex items-center gap-2 text-orange-600 mb-4">
            <Star size={20} fill="currentColor" />
            <span className="text-xs font-bold uppercase tracking-[0.2em]">Loyalty</span>
          </div>
          <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">
            {profile?.loyalty_points || 0} Points
          </h3>
          <p className="text-slate-500 text-sm font-medium mb-6">
            You're ₹200 away from your next reward.
          </p>
          <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-orange-200">
            <div 
              className="h-full bg-primary transition-all duration-1000" 
              style={{ width: `${((profile?.loyalty_points || 0) % 100)}%` }} 
            />
          </div>
          <div className="mt-8 flex items-center gap-2 text-primary font-bold text-sm">
            <TrendingUp size={16} />
            <span>View Rewards</span>
          </div>
        </motion.div>
      </section>

      {/* Categories */}
      <section className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={cn(
              "px-6 py-3 rounded-2xl font-bold whitespace-nowrap transition-all border",
              selectedCategory === cat 
                ? "bg-secondary text-white border-secondary shadow-lg shadow-slate-200" 
                : "bg-white text-slate-400 border-slate-100 hover:border-slate-200"
            )}
          >
            {cat}
          </button>
        ))}
      </section>

      {/* Product Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bento-card animate-pulse h-64 bg-slate-100" />
          ))
        ) : products.length > 0 ? (
          products.map(product => {
            const cartItem = items.find(i => i.id === product.id);
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
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
                        onClick={() => updateQuantity(product.id, -1)}
                        className="p-1 hover:text-primary transition-colors"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="text-sm font-bold w-4 text-center">{cartItem.quantity}</span>
                      <button 
                        onClick={() => updateQuantity(product.id, 1)}
                        className="p-1 hover:text-primary transition-colors"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => addToCart(product)}
                      className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-primary transition-colors shadow-lg shadow-slate-200"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full bento-card py-20 flex flex-col items-center justify-center text-center bg-white border-dashed border-2 border-slate-200">
            <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
              <Database className="text-primary" size={40} />
            </div>
            <h3 className="text-2xl font-display font-bold text-slate-900 mb-2">No Products Found</h3>
            <p className="text-slate-500 max-w-xs mb-8 font-medium">
              Your database is connected but empty. Click below to seed it with premium sample products.
            </p>
            <button
              onClick={syncProducts}
              disabled={syncing}
              className="bg-primary hover:bg-orange-600 text-white px-10 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-orange-100 flex items-center gap-3"
            >
              <RefreshCw size={20} className={syncing ? "animate-spin" : ""} />
              {syncing ? 'Seeding Database...' : 'Seed Sample Products'}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
