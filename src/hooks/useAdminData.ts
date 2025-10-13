import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Database } from '../lib/database.types';
import toast from 'react-hot-toast'; // Import toast for better error feedback

type Profile = Database['public']['Tables']['profiles']['Row'];
type KycDocument = Database['public']['Tables']['kyc_documents']['Row'];
type Content = Database['public']['Tables']['content']['Row'];

// Extend ReportedContent to include nested content details
type ReportedContent = Database['public']['Tables']['reported_content']['Row'] & {
  content: Content | null;
};

interface AdminData {
  profiles: Profile[];
  kycDocuments: KycDocument[];
  reportedContent: ReportedContent[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useAdminData = (): AdminData => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [kycDocuments, setKycDocuments] = useState<KycDocument[]>([]);
  const [reportedContent, setReportedContent] = useState<ReportedContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Profiles
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profilesError) {
        console.error('Supabase error fetching profiles:', profilesError); // Log detailed error
        throw profilesError;
      }
      setProfiles(profilesData || []);

      // Fetch Pending KYC Documents
      const { data: kycData, error: kycError } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('status', 'pending')
        .order('uploaded_at', { ascending: false });

      if (kycError) {
        console.error('Supabase error fetching KYC documents:', kycError); // Log detailed error
        throw kycError;
      }
      setKycDocuments(kycData || []);

      // Fetch Reported Content
      const { data: reportedData, error: reportedError } = await supabase
        .from('reported_content')
        .select(`
          *,
          content (
            id, title, description, media_url, is_free, price, influencer_id, content_type, thumbnail_url
          )
        `)
        .eq('status', 'pending')
        .order('reported_at', { ascending: false });

      if (reportedError) {
        console.error('Supabase error fetching reported content:', reportedError); // Log detailed error
        throw reportedError;
      }
      setReportedContent(reportedData || []);

    } catch (err: any) { // Use 'any' to safely access error properties
      console.error('Error fetching admin data:', err);
      const errorMessage = err.message || 'Falha ao carregar dados administrativos.';
      setError(errorMessage);
      toast.error(errorMessage); // Show toast with specific error message
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { profiles, kycDocuments, reportedContent, loading, error, refetch: fetchData };
};
