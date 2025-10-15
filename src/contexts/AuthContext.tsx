import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Database } from '../lib/database.types';

type Json = any;

type Profile = Database['public']['Tables']['profiles']['Row'];
type AccountStatus = Database['public']['Enums']['account_status_enum'];

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    username: string,
    userType: 'user' | 'influencer',
    kycData?: {
      fullName: string;
      dateOfBirth: string; // YYYY-MM-DD
      address: Json; // { street: string, city: string, state: string, zip: string, country: string }
      documentType: string; // RG, CPF, CNH
      documentNumber: string;
    }
  ) => Promise<{ error: AuthError | null; data?: { user: User } }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
  isAdmin: boolean;
  isInfluencerPendingApproval: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isInfluencerPendingApproval, setIsInfluencerPendingApproval] = useState(false);

  const loadProfileData = async (userId: string) => {
    console.log(`[AuthContext] Attempting to load profile for user ID: ${userId}`);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;
      setProfile(data);
      const userIsAdmin = data?.is_admin || false;
      setIsAdmin(userIsAdmin);
      setIsInfluencerPendingApproval(data?.user_type === 'influencer' && data?.account_status === 'pending');
      console.log(`[AuthContext] User ${data?.username} (ID: ${userId}) is admin: ${userIsAdmin}`);
      console.log('[AuthContext] Profile data loaded:', data); // Debugging: Check fetched profile data
    } catch (error) {
      console.error('[AuthContext] Error loading profile:', error);
      setProfile(null);
      setIsAdmin(false);
      setIsInfluencerPendingApproval(false);
    }
  };

  useEffect(() => {
    console.log('[AuthContext] useEffect triggered for AuthProvider.');
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('[AuthContext] getSession result:', session ? 'Session found' : 'No session');
      try {
        setUser(session?.user ?? null);
        if (session?.user) {
          await loadProfileData(session.user.id);
        }
      } catch (error) {
        console.error("[AuthContext] Error during initial session load:", error);
      } finally {
        setLoading(false);
        console.log('[AuthContext] Initial loading set to false.');
      }
    }).catch(error => {
      console.error('[AuthContext] Error calling getSession:', error);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log(`[AuthContext] onAuthStateChange event: ${_event}, session: ${session ? 'found' : 'null'}`);
      (async () => {
        try {
          setUser(session?.user ?? null);
          if (session?.user) {
            await loadProfileData(session.user.id);
          } else {
            setProfile(null);
            setIsAdmin(false);
            setIsInfluencerPendingApproval(false);
          }
        } catch (error) {
          console.error("[AuthContext] Error in onAuthStateChange handler:", error);
          setProfile(null);
          setIsAdmin(false);
          setIsInfluencerPendingApproval(false);
        } finally {
          setLoading(false);
        }
      })();
    });

    return () => {
      console.log('[AuthContext] Unsubscribing from auth state changes.');
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (
    email: string,
    password: string,
    username: string,
    userType: 'user' | 'influencer',
    kycData?: {
      fullName: string;
      dateOfBirth: string;
      address: Json;
      documentType: string;
      documentNumber: string;
    }
  ) => {
    try {
      console.log('[AuthContext] Attempting signup for:', email, username, userType);

      if (!email || email.trim().length === 0) {
        return { error: new AuthError('Email não pode ser vazio.') };
      }
      if (!password || password.length < 6) {
        return { error: new AuthError('A senha deve ter no mínimo 6 caracteres.') };
      }
      if (!username || username.trim().length === 0) {
        return { error: new AuthError('Nome de usuário não pode ser vazio.') };
      }

      if (userType === 'influencer' && !kycData) {
        return { error: new AuthError('Dados KYC são obrigatórios para influenciadores.') };
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        console.error('[AuthContext] Supabase Auth signUp error:', error.message); // Log the specific error message
        return { error };
      }
      if (!data.user) {
        console.error('[AuthContext] Supabase Auth signUp returned no user data.');
        return { error: new AuthError('Falha ao criar usuário.') };
      }

      console.log('[AuthContext] User created in auth.users:', data.user.id);

      const profileInsert: Database['public']['Tables']['profiles']['Insert'] = {
        id: data.user.id,
        email: email.trim(),
        username: username.trim(),
        user_type: userType,
        is_active: true,
        account_status: userType === 'influencer' ? 'pending' : 'approved',
      };

      if (userType === 'influencer' && kycData) {
        profileInsert.full_name = kycData.fullName;
        profileInsert.date_of_birth = kycData.dateOfBirth;
        profileInsert.address = kycData.address;
        profileInsert.document_type = kycData.documentType;
        profileInsert.document_number = kycData.documentNumber;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert(profileInsert);

      if (profileError) {
        console.error('[AuthContext] Error inserting profile:', profileError);
        // Se a criação do perfil falhar, o usuário ainda existirá em auth.users.
        // Para uma solução completa, você precisaria de uma função Supabase para
        // deletar o usuário de auth.users neste ponto, mas isso não é possível
        // diretamente do cliente sem privilégios de administrador.
        return { error: new AuthError(profileError.message) };
      }

      console.log('[AuthContext] Profile created for user:', data.user.id);

      if (userType === 'influencer') {
        const { error: influencerError } = await supabase
          .from('influencer_profiles')
          .insert({
            user_id: data.user.id,
            subscription_price: 0,
          });

        if (influencerError) {
          console.error('[AuthContext] Error inserting influencer profile:', influencerError);
          return { error: new AuthError(influencerError.message) };
        }
        console.log('[AuthContext] Influencer profile created for user:', data.user.id);
      }

      await loadProfileData(data.user.id);
      console.log('[AuthContext] Signup successful for user:', data.user.id);
      return { error: null, data: { user: data.user } };
    } catch (error) {
      console.error('[AuthContext] Unexpected error during signup:', error);
      return { error: error as AuthError };
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error };
  };

  const signOut = async () => {
    console.log('[AuthContext] Signing out...');
    await supabase.auth.signOut();
    setProfile(null);
    setIsAdmin(false);
    setIsInfluencerPendingApproval(false);
    console.log('[AuthContext] Signed out successfully.');
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error('No user logged in') };

    try {
      console.log('[AuthContext] Updating profile for user:', user.id, updates);
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      await loadProfileData(user.id); // This should refetch and update the context
      console.log('[AuthContext] Profile updated successfully.');
      return { error: null };
    } catch (error) {
      console.error('[AuthContext] Error updating profile:', error);
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, updateProfile, isAdmin, isInfluencerPendingApproval }}>
      {children}
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
