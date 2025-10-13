import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import type { Database } from '../../lib/database.types';
import { Sparkles, Upload, DollarSign, Users, Eye, Heart, Loader2, XCircle } from 'lucide-react';

type Content = Database['public']['Tables']['content']['Row'];
type Subscription = Database['public']['Tables']['subscriptions']['Row'];

export function InfluencerDashboard() {
  const { profile, isInfluencerPendingApproval } = useAuth();
  const [content, setContent] = useState<Content[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loadingContent, setLoadingContent] = useState(true);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profile && profile.user_type === 'influencer' && !isInfluencerPendingApproval) {
      fetchInfluencerData();
    }
  }, [profile, isInfluencerPendingApproval]);

  const fetchInfluencerData = async () => {
    if (!profile) return;

    // Fetch influencer profile to get its ID
    const { data: influencerData, error: influencerError } = await supabase
      .from('influencer_profiles')
      .select('id')
      .eq('user_id', profile.id)
      .single();

    if (influencerError || !influencerData) {
      console.error('Error fetching influencer profile:', influencerError?.message);
      setError('Não foi possível carregar o perfil do influenciador.');
      setLoadingContent(false);
      setLoadingSubscriptions(false);
      return;
    }

    const influencerId = influencerData.id;

    // Fetch Content
    setLoadingContent(true);
    try {
      const { data, error } = await supabase
        .from('content')
        .select('*')
        .eq('influencer_id', influencerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setContent(data || []);
    } catch (err: any) {
      console.error('Error fetching content:', err.message);
      setError('Falha ao carregar conteúdo: ' + err.message);
    } finally {
      setLoadingContent(false);
    }

    // Fetch Subscriptions
    setLoadingSubscriptions(true);
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('influencer_id', influencerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscriptions(data || []);
    } catch (err: any) {
      console.error('Error fetching subscriptions:', err.message);
      setError('Falha ao carregar assinaturas: ' + err.message);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  if (isInfluencerPendingApproval) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-background p-8">
        <div className="bg-surface rounded-xl p-8 text-center shadow-lg border border-border max-w-md">
          <XCircle className="w-16 h-16 text-warning mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-text mb-2">Conta de Influenciador Pendente</h3>
          <p className="text-textSecondary mb-4">
            Sua conta de influenciador está aguardando aprovação. Por favor, aguarde enquanto nossa equipe revisa seus dados.
          </p>
          <p className="text-sm text-textSecondary">Você será notificado assim que sua conta for aprovada.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-8 bg-background text-text min-h-[calc(100vh-64px)]">
      <h2 className="text-4xl font-extrabold text-center mb-10 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
        Painel do Influenciador
      </h2>

      {error && <p className="text-error text-center mb-4">{error}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        <div className="bg-surface rounded-xl p-6 shadow-lg border border-border flex items-center gap-4">
          <Users className="text-primary" size={32} />
          <div>
            <p className="text-textSecondary text-sm">Total de Assinantes</p>
            <p className="text-text text-2xl font-bold">{subscriptions.length}</p>
          </div>
        </div>
        <div className="bg-surface rounded-xl p-6 shadow-lg border border-border flex items-center gap-4">
          <Sparkles className="text-accent" size={32} />
          <div>
            <p className="text-textSecondary text-sm">Total de Conteúdo</p>
            <p className="text-text text-2xl font-bold">{content.length}</p>
          </div>
        </div>
        <div className="bg-surface rounded-xl p-6 shadow-lg border border-border flex items-center gap-4">
          <DollarSign className="text-success" size={32} />
          <div>
            <p className="text-textSecondary text-sm">Ganhos Estimados</p>
            <p className="text-text text-2xl font-bold">R$ {(subscriptions.reduce((sum, sub) => sum + (sub.price_paid || 0), 0)).toFixed(2)}</p>
          </div>
        </div>
      </div>

      <div className="mb-10">
        <h3 className="text-2xl font-bold text-text mb-6 border-b border-border pb-4">Seu Conteúdo</h3>
        {loadingContent && (
          <div className="flex items-center justify-center text-primary text-lg">
            <Loader2 className="animate-spin mr-2" size={24} /> Carregando conteúdo...
          </div>
        )}
        {!loadingContent && content.length === 0 && (
          <p className="text-textSecondary text-center">Nenhum conteúdo enviado ainda. <button className="text-primary hover:underline">Envie seu primeiro conteúdo!</button></p>
        )}
        {!loadingContent && content.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.map((item) => (
              <div key={item.id} className="bg-surface rounded-xl shadow-lg border border-border overflow-hidden">
                <img src={item.thumbnail_url || item.media_url} alt={item.title} className="w-full h-48 object-cover" />
                <div className="p-4">
                  <h4 className="text-lg font-semibold text-text mb-2">{item.title}</h4>
                  <p className="text-sm text-textSecondary mb-3 line-clamp-2">{item.description}</p>
                  <div className="flex items-center justify-between text-textSecondary text-sm">
                    <span className="flex items-center gap-1"><Eye size={16} /> {item.total_views}</span>
                    <span className="flex items-center gap-1"><Heart size={16} /> {item.likes_count}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === 'approved' ? 'bg-success/20 text-success' : item.status === 'pending' ? 'bg-warning/20 text-warning' : 'bg-error/20 text-error'}`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-2xl font-bold text-text mb-6 border-b border-border pb-4">Assinaturas Recentes</h3>
        {loadingSubscriptions && (
          <div className="flex items-center justify-center text-primary text-lg">
            <Loader2 className="animate-spin mr-2" size={24} /> Carregando assinaturas...
          </div>
        )}
        {!loadingSubscriptions && subscriptions.length === 0 && (
          <p className="text-textSecondary text-center">Nenhuma assinatura ainda.</p>
        )}
        {!loadingSubscriptions && subscriptions.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-surface rounded-xl shadow-lg border border-border">
              <thead>
                <tr className="bg-border text-textSecondary text-left">
                  <th className="py-3 px-4 font-semibold">Assinante</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Preço Pago</th>
                  <th className="py-3 px-4 font-semibold">Início</th>
                  <th className="py-3 px-4 font-semibold">Fim</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((sub) => (
                  <tr key={sub.id} className="border-b border-border last:border-b-0 hover:bg-background transition-colors">
                    <td className="py-3 px-4 text-text">{sub.subscriber_id}</td> {/* Ideally fetch username */}
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${sub.status === 'active' ? 'bg-success/20 text-success' : sub.status === 'pending' ? 'bg-warning/20 text-warning' : 'bg-error/20 text-error'}`}>
                        {sub.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-text">R$ {sub.price_paid?.toFixed(2) || '0.00'}</td>
                    <td className="py-3 px-4 text-text">{new Date(sub.start_date).toLocaleDateString()}</td>
                    <td className="py-3 px-4 text-text">{sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
