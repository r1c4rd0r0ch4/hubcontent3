import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User | null; error: Error | null }>;
  signUp: (email: string, password: string, fullName: string, username: string) => Promise<{ user: User | null; error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  isInfluencerPendingApproval: boolean;
  isAdmin: boolean; // Adicionado: Propriedade para indicar se o usuário é administrador
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInfluencerPendingApproval, setIsInfluencerPendingApproval] = useState(false);

  const fetchUserProfile = useCallback(async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
      setIsInfluencerPendingApproval(false);
      return null;
    }
    setProfile(data);
    setIsInfluencerPendingApproval(data.is_influencer && data.account_status === 'pending');
    return data;
  }, []);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      } else {
        setProfile(null);
        setIsInfluencerPendingApproval(false);
      }
      setLoading(false);
    });

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user || null);
      if (session?.user) {
        await fetchUserProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserProfile]);

  const logUserLogin = async (userId: string, userEmail: string) => {
    try {
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      const ipAddress = ipData.ip || 'Unknown';
      const userAgent = navigator.userAgent;

      const { error: logError } = await supabase.from('user_login_logs').insert({
        user_id: userId,
        email: userEmail,
        ip_address: ipAddress,
        user_agent: userAgent,
      });

      if (logError) {
        console.error('Error logging user login:', logError);
      }
    } catch (logErr) {
      console.error('Failed to get IP or log login:', logErr);
    }
  };

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      console.error('Sign in error:', error);
      return { user: null, error };
    }

    if (data.user) {
      await logUserLogin(data.user.id, data.user.email!);
      await fetchUserProfile(data.user.id); // Refresh profile after login
    }

    return { user: data.user, error: null };
  };

  const signUp = async (email: string, password: string, fullName: string, username: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          username: username,
        },
      },
    });
    setLoading(false);

    if (error) {
      console.error('Sign up error:', error);
      return { user: null, error };
    }

    // After successful signup, create a profile entry
    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id,
        email: data.user.email!,
        full_name: fullName,
        username: username,
        is_admin: false, // Default to not admin
        is_influencer: false, // Default to not influencer
        account_status: 'active', // Default status
      });

      if (profileError) {
        console.error('Error creating profile:', profileError);
        // Consider rolling back auth.signUp or handling this more gracefully
        return { user: null, error: profileError };
      }

      await logUserLogin(data.user.id, data.user.email!); // Log the successful signup (first login)
      await fetchUserProfile(data.user.id); // Refresh profile after signup
    }

    return { user: data.user, error: null };
  };

  const signOut = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    setLoading(false);
    if (!error) {
      setSession(null);
      setUser(null);
      setProfile(null);
      setIsInfluencerPendingApproval(false);
    }
    return { error };
  };

  const value = {
    session,
    user,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    isInfluencerPendingApproval,
    isAdmin: profile?.is_admin || false, // Expondo a propriedade is_admin do perfil
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
