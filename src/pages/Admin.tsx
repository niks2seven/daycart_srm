import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Package, Plus, Minus, Trash2, Edit3, Image as ImageIcon, Tag, IndianRupee, CheckCircle2, AlertCircle, RefreshCw, ShoppingCart, User, Clock, CheckCircle, Truck, X, Calendar, Layers } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { cn, formatCurrency } from '../lib/utils';

type AdminTab = 'inventory' | 'orders' | 'subscriptions' | 'transactions' | 'users';

export default function Admin() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('inventory');
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('Dairy');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [isSubEligible, setIsSubEligible] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setProducts(data);
    setLoading(false);
  };

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('orders')
      .select(`
        *,
        profiles (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });
    
    if (!error && data) setOrders(data);
    setLoading(false);
  };

  const fetchSubscriptions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        profiles (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });
    
    if (!error && data) setSubscriptions(data || []);
    setLoading(false);
  };

  const fetchTransactions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('transactions')
      .select(`
        *,
        profiles (
          full_name,
          email
        )
      `)
      .order('created_at', { ascending: false });
    
    if (!error && data) setTransactions(data || []);
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) setUsers(data || []);
    setLoading(false);
  };

  useEffect(() => {
    let channel: any = null;

    if (activeTab === 'inventory') {
      fetchProducts();
    } else if (activeTab === 'orders') {
      fetchOrders();
      
      // Set up real-time listener for all orders
      channel = supabase
        .channel('admin-orders-all')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        }, () => fetchOrders())
        .subscribe();
    } else if (activeTab === 'subscriptions') {
      fetchSubscriptions();
      
      // Set up real-time listener for all subscriptions
      channel = supabase
        .channel('admin-subs-all')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'subscriptions' 
        }, () => fetchSubscriptions())
        .subscribe();
    } else if (activeTab === 'transactions') {
      fetchTransactions();
      
      // Set up real-time listener for all transactions
      channel = supabase
        .channel('admin-tx-all')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'transactions' 
        }, () => fetchTransactions())
        .subscribe();
    } else if (activeTab === 'users') {
      fetchUsers();
      
      // Set up real-time listener for all profiles
      channel = supabase
        .channel('admin-profiles-all')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'profiles' 
        }, () => fetchUsers())
        .subscribe();
    }

    return () => {
      if (channel) {
        channel.unsubscribe();
        supabase.removeChannel(channel);
      }
    };
  }, [activeTab]);

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId);
    
    if (!error) await fetchOrders();
  };

  const updateSubscriptionStatus = async (subId: string, status: string) => {
    const { error } = await supabase
      .from('subscriptions')
      .update({ status })
      .eq('id', subId);
    
    if (!error) await fetchSubscriptions();
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const { error } = await supabase
        .from('products')
        .insert({
          name,
          price: parseFloat(price),
          category,
          image_url: imageUrl,
          description,
          is_subscription_eligible: isSubEligible
        });

      if (error) throw error;

      // Reset Form
      setName('');
      setPrice('');
      setImageUrl('');
      setDescription('');
      setIsSubEligible(false);
      
      await fetchProducts();
      alert('Product added successfully!');
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const deleteProduct = async (id: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (!error) await fetchProducts();
  };

  return (
    <div className="space-y-10 pb-20">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-display font-bold tracking-tighter mb-2">Admin Dashboard</h1>
          <p className="text-slate-500 font-medium">Manage your inventory and track live orders.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab('inventory')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'inventory' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Inventory
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'orders' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Live Orders
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'subscriptions' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Subscriptions
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'transactions' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={cn(
              "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
              activeTab === 'users' ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            Users
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'inventory' ? (
          <motion.div 
            key="inventory"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-3 gap-10"
          >
            {/* Add Product Form */}
            <div className="lg:col-span-1">
              <div className="bento-card sticky top-6">
                <h3 className="text-xl font-display font-bold mb-6 flex items-center gap-2">
                  <Plus size={20} className="text-primary" />
                  Add New Product
                </h3>
                <form onSubmit={handleAddProduct} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Product Name</label>
                    <input 
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="e.g. Fresh Organic Milk"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Price (₹)</label>
                      <input 
                        type="number" 
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                        placeholder="65"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Category</label>
                      <select 
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                      >
                        <option>Dairy</option>
                        <option>Bakery</option>
                        <option>Fruits</option>
                        <option>Vegetables</option>
                        <option>Beverages</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Image URL (Unsplash)</label>
                    <input 
                      type="url" 
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl py-3 px-4 font-medium focus:ring-2 focus:ring-primary/20 transition-all"
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <input 
                      type="checkbox" 
                      id="sub-eligible"
                      checked={isSubEligible}
                      onChange={(e) => setIsSubEligible(e.target.checked)}
                      className="w-5 h-5 rounded-lg border-slate-200 text-primary focus:ring-primary"
                    />
                    <label htmlFor="sub-eligible" className="text-sm font-bold text-slate-700 cursor-pointer">
                      Subscription Eligible
                    </label>
                  </div>

                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full bg-primary hover:bg-orange-600 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-orange-100 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? 'Adding...' : 'Add to Catalog'}
                    <Plus size={20} />
                  </button>
                </form>
              </div>
            </div>

            {/* Product List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-display font-bold flex items-center gap-2">
                  <Package size={20} className="text-primary" />
                  Live Catalog ({products.length})
                </h3>
                <button onClick={fetchProducts} className="text-slate-400 hover:text-primary transition-colors">
                  <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-24 bg-slate-100 rounded-3xl animate-pulse" />
                  ))
                ) : products.map(product => (
                  <motion.div
                    key={product.id}
                    layout
                    className="bento-card flex items-center gap-6 p-4"
                  >
                    <div className="w-16 h-16 bg-slate-50 rounded-2xl overflow-hidden border border-slate-100 flex-shrink-0">
                      <img src={product.image_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-900 truncate">{product.name}</h4>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-bold text-primary">{formatCurrency(product.price)}</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{product.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {product.is_subscription_eligible && (
                        <div className="w-8 h-8 bg-orange-50 text-primary rounded-xl flex items-center justify-center" title="Subscription Eligible">
                          <CheckCircle2 size={16} />
                        </div>
                      )}
                      <button 
                        onClick={() => deleteProduct(product.id)}
                        className="w-10 h-10 bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl flex items-center justify-center transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : activeTab === 'orders' ? (
          <motion.div 
            key="orders"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-display font-bold flex items-center gap-2">
                <ShoppingCart size={20} className="text-primary" />
                Recent Orders ({orders.length})
              </h3>
              <button onClick={fetchOrders} className="text-slate-400 hover:text-primary transition-colors">
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 bg-slate-100 rounded-[32px] animate-pulse" />
                ))
              ) : orders.length > 0 ? (
                orders.map(order => (
                  <div key={order.id} className="bento-card">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                          <User size={24} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{order.profiles?.full_name || 'Anonymous User'}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{order.profiles?.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                          <Clock size={14} className="text-slate-400" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                            {new Date(order.created_at).toLocaleString()}
                          </span>
                        </div>
                        <div className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2",
                          order.status === 'delivered' ? "bg-green-100 text-green-600" : 
                          order.status === 'processing' ? "bg-orange-100 text-orange-600" : "bg-blue-100 text-blue-600"
                        )}>
                          {order.status === 'delivered' ? <CheckCircle size={14} /> : <Truck size={14} />}
                          {order.status}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-slate-100">
                      <div className="md:col-span-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Order Items</p>
                        <div className="flex flex-wrap gap-3">
                          {order.items?.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 bg-slate-50 p-2 pr-4 rounded-xl border border-slate-100">
                              <img src={item.image_url} alt="" className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
                              <div>
                                <p className="text-[10px] font-bold text-slate-900 leading-tight">{item.name}</p>
                                <p className="text-[9px] font-bold text-slate-400">Qty: {item.quantity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex flex-col justify-between gap-6">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Revenue</p>
                          <p className="text-3xl font-display font-bold text-primary">{formatCurrency(order.total_amount)}</p>
                        </div>
                        
                        <div className="flex gap-2">
                          {order.status !== 'delivered' && (
                            <button 
                              onClick={() => updateOrderStatus(order.id, 'delivered')}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-green-100"
                            >
                              Mark Delivered
                            </button>
                          )}
                          <button 
                            onClick={() => updateOrderStatus(order.id, 'cancelled')}
                            className="px-4 bg-slate-100 hover:bg-red-50 hover:text-red-500 text-slate-400 py-3 rounded-xl text-xs font-bold transition-all"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-20 text-center bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                  <ShoppingCart className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="text-lg font-display font-bold text-slate-900">No orders found</p>
                  <p className="text-sm text-slate-500 mt-2">Orders placed by users will appear here in real-time.</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : activeTab === 'subscriptions' ? (
          <motion.div 
            key="subscriptions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-display font-bold flex items-center gap-2">
                <Layers size={20} className="text-primary" />
                All Subscriptions ({subscriptions.length})
              </h3>
              <button onClick={fetchSubscriptions} className="text-slate-400 hover:text-primary transition-colors">
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-40 bg-slate-100 rounded-[32px] animate-pulse" />
                ))
              ) : subscriptions.length > 0 ? (
                subscriptions.map(sub => (
                  <div key={sub.id} className="bento-card">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center">
                          <User size={24} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{sub.profiles?.full_name || 'Anonymous User'}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{sub.profiles?.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">
                            {sub.plan_type === 'full_month' ? 'Monthly Plan' : `${sub.selected_dates?.length} Custom Days`}
                          </span>
                        </div>
                        <div className={cn(
                          "px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2",
                          sub.status === 'active' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                        )}>
                          {sub.status === 'active' ? <CheckCircle size={14} /> : <X size={14} />}
                          {sub.status}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-6 border-t border-slate-100">
                      <div className="md:col-span-2">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Subscribed Items</p>
                        <div className="flex flex-wrap gap-3">
                          {sub.items?.map((item: any, i: number) => (
                            <div key={i} className="flex items-center gap-3 bg-slate-50 p-2 pr-4 rounded-xl border border-slate-100">
                              <img src={item.image_url} alt="" className="w-8 h-8 rounded-lg object-cover" referrerPolicy="no-referrer" />
                              <div>
                                <p className="text-[10px] font-bold text-slate-900 leading-tight">{item.name}</p>
                                <p className="text-[9px] font-bold text-slate-400">Qty: {item.quantity}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex flex-col justify-between gap-6">
                        <div>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Value</p>
                          <p className="text-3xl font-display font-bold text-primary">{formatCurrency(sub.total_cost)}</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-400 uppercase tracking-widest">Start Date</span>
                            <span className="text-slate-900 uppercase tracking-widest">{sub.start_date ? new Date(sub.start_date).toLocaleDateString() : 'TBD'}</span>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-bold">
                            <span className="text-slate-400 uppercase tracking-widest">Slot</span>
                            <span className="text-primary uppercase tracking-widest">{sub.delivery_slot || 'Morning'}</span>
                          </div>
                          {sub.skipped_dates?.length > 0 && (
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className="text-slate-400 uppercase tracking-widest">Skipped</span>
                              <span className="text-orange-500 uppercase tracking-widest">{sub.skipped_dates.length} Days</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2">
                          {sub.status === 'active' ? (
                            <button 
                              onClick={() => updateSubscriptionStatus(sub.id, 'cancelled')}
                              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-red-100"
                            >
                              Cancel Subscription
                            </button>
                          ) : (
                            <button 
                              onClick={() => updateSubscriptionStatus(sub.id, 'active')}
                              className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl text-xs font-bold transition-all shadow-lg shadow-green-100"
                            >
                              Reactivate
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-20 text-center bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                  <Layers className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="text-lg font-display font-bold text-slate-900">No subscriptions found</p>
                  <p className="text-sm text-slate-500 mt-2">Active user subscriptions will appear here in real-time.</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : activeTab === 'transactions' ? (
          <motion.div 
            key="transactions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-display font-bold flex items-center gap-2">
                <IndianRupee size={20} className="text-primary" />
                All Transactions ({transactions.length})
              </h3>
              <button onClick={fetchTransactions} className="text-slate-400 hover:text-primary transition-colors">
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-20 bg-slate-100 rounded-3xl animate-pulse" />
                ))
              ) : transactions.length > 0 ? (
                transactions.map(tx => (
                  <div key={tx.id} className="bento-card flex items-center justify-between p-4">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        tx.type === 'credit' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                      )}>
                        {tx.type === 'credit' ? <Plus size={18} /> : <Minus size={18} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">{tx.description}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tx.profiles?.full_name}</p>
                          <span className="text-[10px] text-slate-300">•</span>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {new Date(tx.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-lg font-display font-bold",
                        tx.type === 'credit' ? "text-green-600" : "text-red-600"
                      )}>
                        {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-20 text-center bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                  <IndianRupee className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="text-lg font-display font-bold text-slate-900">No transactions found</p>
                  <p className="text-sm text-slate-500 mt-2">Financial activity will appear here in real-time.</p>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="users"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-display font-bold flex items-center gap-2">
                <User size={20} className="text-primary" />
                User Profiles ({users.length})
              </h3>
              <button onClick={fetchUsers} className="text-slate-400 hover:text-primary transition-colors">
                <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-32 bg-slate-100 rounded-3xl animate-pulse" />
                ))
              ) : users.length > 0 ? (
                users.map(u => (
                  <div key={u.id} className="bento-card p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                        <User size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 truncate">{u.full_name || 'Anonymous'}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{u.email}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Wallet</p>
                        <p className="text-sm font-bold text-primary">{formatCurrency(u.wallet_balance)}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Loyalty</p>
                        <p className="text-sm font-bold text-slate-900">{u.loyalty_points} pts</p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-full p-20 text-center bg-slate-50 rounded-[40px] border border-dashed border-slate-200">
                  <User className="mx-auto text-slate-300 mb-4" size={48} />
                  <p className="text-lg font-display font-bold text-slate-900">No users found</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
