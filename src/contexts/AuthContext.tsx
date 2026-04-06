import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface Profile {
  id: string;
  wallet_balance: number;
  loyalty_points: number;
  full_name: string;
  avatar_url: string;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string, email?: string) => {
    // Try to get the profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // Profile doesn't exist, create it
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          wallet_balance: 1000, // Starting balance for demo
          loyalty_points: 0,
          full_name: email?.split('@')[0] || 'User'
        })
        .select()
        .single();
      
      if (!createError && newProfile) {
        setProfile(newProfile);
      }
    } else if (!error && data) {
      setProfile(data);
    }
  };

  useEffect(() => {
    let profileSubscription: any = null;

    const setupProfileSubscription = (userId: string) => {
      // Clean up existing if any
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription);
      }

      profileSubscription = supabase
        .channel(`profile-${userId}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'profiles', 
          filter: `id=eq.${userId}` 
        }, (payload) => {
          setProfile(payload.new as Profile);
        })
        .subscribe();
    };

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      
      if (currentUser) {
        fetchProfile(currentUser.id, currentUser.email);
        setupProfileSubscription(currentUser.id);
      } else {
        setProfile(null);
        if (profileSubscription) {
          supabase.removeChannel(profileSubscription);
          profileSubscription = null;
        }
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      if (profileSubscription) {
        supabase.removeChannel(profileSubscription);
      }
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
