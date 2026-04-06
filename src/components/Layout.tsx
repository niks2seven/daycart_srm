import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Wallet, Calendar, User, ShoppingCart, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatCurrency } from '../lib/utils';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, profile, signOut } = useAuth();
  const { items, total } = useCart();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: Calendar, label: 'Subs', path: '/subscriptions' },
    { icon: Wallet, label: 'Wallet', path: '/wallet' },
    { icon: User, label: 'Profile', path: '/profile' },
  ];

  return (
    <div className="min-h-screen pb-24 md:pb-0 md:pl-64">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-64 bg-secondary text-secondary-foreground p-6 z-50">
        <div className="flex items-center gap-3 mb-12">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <ShoppingCart className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-display font-bold tracking-tighter">DayCart</span>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200",
                location.pathname === item.path 
                  ? "bg-primary text-white" 
                  : "hover:bg-slate-800 text-slate-400"
              )}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {user && (
          <div className="mt-auto pt-6 border-t border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">
                    <User size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-slate-500 truncate">{formatCurrency(profile?.wallet_balance || 0)}</p>
              </div>
            </div>
            <button
              onClick={() => signOut()}
              className="flex items-center gap-3 w-full px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              <LogOut size={18} />
              <span className="text-sm font-medium">Sign Out</span>
            </button>
          </div>
        )}
      </aside>

      {/* Bottom Nav - Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-4 flex justify-between items-center z-50">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              "flex flex-col items-center gap-1",
              location.pathname === item.path ? "text-primary" : "text-slate-400"
            )}
          >
            <item.icon size={24} />
            <span className="text-[10px] font-bold uppercase tracking-widest">{item.label}</span>
          </Link>
        ))}
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 md:p-10">
        {children}
      </main>

      {/* Floating Cart Bar */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-3rem)] max-w-md bg-secondary text-white rounded-3xl p-4 shadow-2xl flex items-center justify-between z-40"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center relative">
                <ShoppingCart size={24} />
                <span className="absolute -top-2 -right-2 bg-white text-primary text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center border-2 border-primary">
                  {items.reduce((s, i) => s + i.quantity, 0)}
                </span>
              </div>
              <div>
                <p className="text-sm font-bold">{formatCurrency(total)}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Instant Delivery</p>
              </div>
            </div>
            <Link
              to="/cart"
              className="bg-primary hover:bg-orange-600 text-white px-6 py-3 rounded-2xl font-bold transition-colors"
            >
              View Cart
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
