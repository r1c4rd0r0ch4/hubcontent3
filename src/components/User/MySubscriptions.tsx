import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Calendar, DollarSign } from 'lucide-react';

interface SubscriptionWithInfluencer {
  id: string;
  influencer_id: string;
  status: string;
  price_paid: number;
  started_at: string;
  expires_at: string;
  profiles: {
    username: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface MySubscriptionsProps {
  onViewProfile?: (influencerId: string) => void;
}

export function MySubscriptions({ onViewProfile }: MySubscriptionsProps = {}) {
  const { profile } = useAuth();
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithInfluencer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSubscriptions();
  }, [profile]);

  const loadSubscriptions = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        *,
        profiles:influencer_id (
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('subscriber_id', profile.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSubscriptions(data as any);
    }
    setLoading(false);
  };

  const cancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Tem certeza que deseja cancelar esta assinatura?')) return;

    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'cancelled' })
      .eq('id', subscriptionId);

    if (!error) {
      loadSubscriptions();
    }
  };

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  const activeSubscriptions = subscriptions.filter(s => s.status === 'active');
  const inactiveSubscriptions = subscriptions.filter(s => s.status !== 'active');

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Minhas Assinaturas</h2>

      {activeSubscriptions.length === 0 && inactiveSubscriptions.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma assinatura ainda</h3>
          <p className="text-gray-600">Explore influencers e assine para acessar conteúdo exclusivo</p>
        </div>
      ) : (
        <>
          {activeSubscriptions.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Ativas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeSubscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => onViewProfile?.(sub.influencer_id)}
                  >
                    <div className="flex items-start gap-4">
                      {sub.profiles.avatar_url ? (
                        <img
                          src={sub.profiles.avatar_url}
                          alt={sub.profiles.username}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-pink-100 flex items-center justify-center">
                          <span className="text-pink-600 font-semibold text-xl">
                            {sub.profiles.username[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {sub.profiles.full_name || `@${sub.profiles.username}`}
                        </h4>
                        <p className="text-sm text-gray-600 mb-3">@{sub.profiles.username}</p>

                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-green-600" />
                            <span>R$ {sub.price_paid.toFixed(2)}/mês</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-pink-600" />
                            <span>Expira em {new Date(sub.expires_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => cancelSubscription(sub.id)}
                          className="mt-4 text-sm text-red-600 hover:text-red-700 font-medium"
                        >
                          Cancelar assinatura
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {inactiveSubscriptions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Inativas</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {inactiveSubscriptions.map((sub) => (
                  <div
                    key={sub.id}
                    className="bg-gray-50 rounded-lg shadow-md p-6 opacity-75 cursor-pointer hover:opacity-100 transition-opacity"
                    onClick={() => onViewProfile?.(sub.influencer_id)}
                  >
                    <div className="flex items-start gap-4">
                      {sub.profiles.avatar_url ? (
                        <img
                          src={sub.profiles.avatar_url}
                          alt={sub.profiles.username}
                          className="w-16 h-16 rounded-full object-cover grayscale"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-gray-500 font-semibold text-xl">
                            {sub.profiles.username[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900 mb-1">
                          {sub.profiles.full_name || `@${sub.profiles.username}`}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">@{sub.profiles.username}</p>
                        <span className="inline-block px-3 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded-full">
                          {sub.status === 'cancelled' ? 'Cancelada' : 'Expirada'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
