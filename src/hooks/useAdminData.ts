import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];

interface AdminData {
  profiles: Profile[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useAdminData = (): AdminData => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[useAdminData] Fetching all profiles...');
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('[useAdminData] Error fetching profiles:', profilesError);
        throw profilesError;
      }

      console.log(`[useAdminData] Fetched ${profilesData.length} profiles.`);
      setProfiles(profilesData || []);
    } catch (err: any) {
      console.error('[useAdminData] General error in fetchAdminData:', err);
      setError(err.message || 'Falha ao carregar dados do administrador.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  return { profiles, loading, error, refetch: fetchAdminData };
};
