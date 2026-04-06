import React from 'react';
import { AlertCircle, ExternalLink, ShieldAlert } from 'lucide-react';

export function ConfigGuard({ children }: { children: React.ReactNode }) {
  const isConfigured = 
    import.meta.env.VITE_SUPABASE_URL && 
    import.meta.env.VITE_SUPABASE_ANON_KEY &&
    !import.meta.env.VITE_SUPABASE_URL.includes('your-project');

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl border border-slate-100 text-center">
          <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
            <ShieldAlert className="text-primary w-10 h-10" />
          </div>
          <h1 className="text-3xl font-display font-bold tracking-tighter mb-4">Setup Required</h1>
          <p className="text-slate-500 font-medium mb-8">
            To start using DayCart, you need to connect your Supabase project.
          </p>
          
          <div className="space-y-4 text-left mb-10">
            <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
              <p className="text-sm font-medium text-slate-700">Go to your Supabase Project Settings &gt; API</p>
            </div>
            <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
              <p className="text-sm font-medium text-slate-700">Copy the Project URL and Anon Key</p>
            </div>
            <div className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
              <p className="text-sm font-medium text-slate-700">Add them to the Secrets panel in AI Studio</p>
            </div>
          </div>

          <a 
            href="https://supabase.com/dashboard" 
            target="_blank" 
            rel="noopener noreferrer"
            className="w-full bg-secondary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
          >
            Open Supabase Dashboard
            <ExternalLink size={18} />
          </a>
          
          <div className="mt-8 flex items-center justify-center gap-2 text-primary bg-orange-50 py-3 rounded-xl border border-orange-100">
            <AlertCircle size={16} />
            <span className="text-xs font-bold uppercase tracking-widest">Configuration Missing</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
