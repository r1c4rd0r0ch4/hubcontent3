import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, DollarSign, Image as ImageIcon, Loader2 } from 'lucide-react';
import { InfluencerProfile } from './InfluencerProfile';
import type { Database } from '../../lib/database.types';

type Profile = Database['public']['Tables']['profiles']['Row'];
type InfluencerProfileRow = Database['public']['Tables']['influencer_profiles']['Row'];

interface InfluencerWithDetails extends Profile {
  influencer_profiles: InfluencerProfileRow | null; // Ensure this can be null
  content_count: number;
  is_subscribed: boolean;
  total_subscribers: number;
}

export function InfluencerBrowser() {
  const { profile: currentUserProfile } = useAuth(); // Renamed to avoid conflict with influencer.profile
  const [influencers, setInfluencers] = useState<InfluencerWithDetails[]>([]);
  const [selectedInfluencer, setSelectedInfluencer] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadInfluencers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          username,
          full_name,
          avatar_url,
          bio,
          influencer_profiles (
            subscription_price,
            instagram,
            twitter,
            tiktok
          )
        `)
        .eq('user_type', 'influencer')
        .eq('account_status', 'approved')
        .eq('is_active', true);

      if (profilesError) {
        throw profilesError;
      }

      if (profilesData) {
        const influencersWithDetails = await Promise.all(
          profilesData.map(async (inf: any) => { // inf is a Profile & { influencer_profiles: InfluencerProfileRow | null }
            // Fetch content count
            const { count: contentCount, error: contentCountError } = await supabase
              .from('content_posts')
              .select('id', { count: 'exact' })
              .eq('user_id', inf.id)
              .eq('status', 'approved');

            if (contentCountError) {
              console.error(`Error fetching content count for ${inf.username}:`, contentCountError.message);
            }

            // Check subscription status
            let isSubscribed = false;
            if (currentUserProfile) {
              const { data: subData, error: subError } = await supabase
                .from('subscriptions')
                .select('id')
                .eq('subscriber_id', currentUserProfile.id)
                .eq('influencer_id', inf.id)
                .eq('status', 'active')
                .maybeSingle();

              if (subError) {
                console.error(`Error fetching subscription status for ${inf.username}:`, subError.message);
              }
              isSubscribed = !!subData;
            }

            // Fetch dynamic subscriber count using RPC
            const { data: subscriberCountData, error: countError } = await supabase.rpc('get_influencer_subscriber_count', {
              p_influencer_id: inf.id,
            });

            if (countError) {
              console.error(`Error fetching subscriber count for ${inf.username}:`, countError.message);
            }

            return {
              ...inf,
              influencer_profiles: inf.influencer_profiles || null, // Ensure it's explicitly null if not found
              content_count: contentCount || 0,
              is_subscribed: isSubscribed,
              total_subscribers: subscriberCountData || 0,
            };
          })
        );
        setInfluencers(influencersWithDetails);
      }
    } catch (err: any) {
      console.error('Error loading influencers:', err.message);
      setError('Falha ao carregar influencers: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [currentUserProfile]); // Depend on currentUserProfile to re-fetch when auth state changes

  useEffect(() => {
    loadInfluencers();
  }, [loadInfluencers]); // Depend on the memoized loadInfluencers

  const filteredInfluencers = influencers.filter(inf =>
    inf.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inf.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inf.bio?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedInfluencer) {
    return (
      <InfluencerProfile
        influencerId={selectedInfluencer}
        onBack={() => {
          setSelectedInfluencer(null);
          loadInfluencers(); // Reload influencers to update subscription status
        }}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center text-primary text-lg py-12">
        <Loader2 className="animate-spin mr-2" size={24} /> Carregando influencers...
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl p-8 shadow-xl border border-border">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text mb-4">Descubra Influencers</h1>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar influencers..."
          className="w-full max-w-xl px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-text"
        />
      </div>

      {error && <p className="text-error text-center mb-4">{error}</p>}

      {filteredInfluencers.length === 0 ? (
        <div className="text-center py-12 bg-background rounded-xl">
          <Users className="w-16 h-16 text-textSecondary/70 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text mb-2">Nenhum influencer encontrado</h3>
          <p className="text-textSecondary">Tente buscar por outro termo ou verifique se há influencers aprovados.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInfluencers.map((influencer) => (
            <div
              key={influencer.id}
              className="bg-background rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow cursor-pointer border border-border"
              onClick={() => setSelectedInfluencer(influencer.id)}
            >
              <div className="relative h-48 bg-gradient-to-br from-secondary to-primary">
                {influencer.avatar_url ? (
                  <img
                    src={influencer.avatar_url}
                    alt={influencer.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold">
                    {influencer.username[0].toUpperCase()}
                  </div>
                )}
                {influencer.is_subscribed && (
                  <div className="absolute top-4 right-4 bg-success text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Inscrito
                  </div>
                )}
              </div>

              <div className="p-6">
                <h3 className="text-xl font-bold text-text mb-1">
                  {influencer.full_name || `@${influencer.username}`}
                </h3>
                <p className="text-sm text-textSecondary mb-4">@{influencer.username}</p>

                {influencer.bio && (
                  <p className="text-sm text-textSecondary mb-4 line-clamp-2">{influencer.bio}</p>
                )}

                <div className="flex items-center justify-between text-sm text-textSecondary mb-4">
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{influencer.total_subscribers} assinantes</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <ImageIcon className="w-4 h-4" />
                    <span>{influencer.content_count} posts</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-success font-semibold">
                    <DollarSign className="w-5 h-5" />
                    <span>R$ {influencer.influencer_profiles?.subscription_price?.toFixed(2) || '0.00'}/mês</span>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedInfluencer(influencer.id);
                    }}
                    className="bg-accent text-white px-4 py-2 rounded-lg font-semibold hover:bg-accent/90 transition-colors"
                  >
                    {influencer.is_subscribed ? 'Ver Perfil' : 'Assinar'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
