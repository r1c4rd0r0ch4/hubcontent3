import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, Heart, MessageSquare, Instagram, Twitter, Play, Eye, Video, Flag, Loader2 } from 'lucide-react';
import { Lightbox } from '../Shared/Lightbox';
import { VideoPlayer } from '../Shared/VideoPlayer'; // This component is not used, but kept for consistency
import { StreamingBookModal } from './StreamingBookModal';
import { ReportContentModal } from './ReportContentModal'; // Import the new modal
import type { Database } from '../../lib/database.types';

type Content = Database['public']['Tables']['content']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

interface ContentWithLike extends Content {
  isLiked: boolean;
  likes_count: number; // Add this
  total_views: number; // Add this
}

interface InfluencerData {
  profile: Profile;
  subscription_price: number;
  instagram: string | null;
  twitter: string | null;
  tiktok: string | null;
  total_subscribers: number;
  is_subscribed: boolean;
  subscription_expires?: string;
}

export function InfluencerProfile({ influencerId, onBack }: { influencerId: string; onBack: () => void }) {
  const { profile: currentUser } = useAuth();
  const [influencer, setInfluencer] = useState<InfluencerData | null>(null);
  const [contents, setContents] = useState<ContentWithLike[]>([]);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [showStreamingModal, setShowStreamingModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false); // State for report modal
  const [selectedContentToReport, setSelectedContentToReport] = useState<string | null>(null); // State for content to report
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [selectedContent, setSelectedContent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInfluencerData();
    loadContents();
    checkStreamingEnabled();

    // Subscribe to subscription changes to update counter in real-time
    const channel = supabase
      .channel(`influencer_profile:${influencerId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions',
          filter: `influencer_id=eq.${influencerId}`,
        },
        () => {
          loadInfluencerData();
        }
      )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'content_likes',
        filter: `content_id=in.(${contents.map(c => c.id).join(',')})`, // Only listen for likes on current content
      },
      () => {
        loadContents(); // Reload likes count
      }
    )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [influencerId, contents.length]); // Added contents.length to dependency array to re-subscribe if content changes

  const loadInfluencerData = async () => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*, influencer_profiles(subscription_price, instagram, twitter, tiktok, other_links, total_subscribers)')
      .eq('id', influencerId)
      .maybeSingle();

    let isSubscribed = false;
    let subscriptionExpires;
    if (currentUser) {
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('subscriber_id', currentUser.id)
        .eq('influencer_id', influencerId)
        .eq('status', 'active')
        .maybeSingle();

      isSubscribed = !!subData;
      subscriptionExpires = subData?.expires_at;
    }

    if (profileData && profileData.influencer_profiles) {
      const influencerProfile = Array.isArray(profileData.influencer_profiles) ? profileData.influencer_profiles[0] : profileData.influencer_profiles;
      setInfluencer({
        profile: profileData,
        subscription_price: influencerProfile?.subscription_price || 0,
        instagram: influencerProfile?.instagram || null,
        twitter: influencerProfile?.twitter || null,
        tiktok: influencerProfile?.tiktok || null,
        total_subscribers: influencerProfile?.total_subscribers || 0,
        is_subscribed: isSubscribed,
        subscription_expires: subscriptionExpires,
      });
    }
    setLoading(false);
  };

  const loadContents = async () => {
    const { data } = await supabase
      .from('content')
      .select(`
        *,
        likes_count:content_likes(count),
        total_views:content_views(count)
      `)
      .eq('influencer_id', influencerId)
      .order('created_at', { ascending: false });

    if (data) {
      const contentsWithLikesAndViews = await Promise.all(
        data.map(async (content) => {
          const { data: likeData } = currentUser
            ? await supabase
                .from('content_likes')
                .select('id')
                .eq('content_id', content.id)
                .eq('user_id', currentUser.id)
                .maybeSingle()
            : { data: null };

          return {
            ...content,
            isLiked: !!likeData,
            likes_count: content.likes_count[0]?.count || 0,
            total_views: content.total_views[0]?.count || 0,
          };
        })
      );
      setContents(contentsWithLikesAndViews);
    }
  };

  const handleLike = async (contentId: string) => {
    if (!currentUser) return;

    const content = contents.find(c => c.id === contentId);
    if (!content) return;

    if (content.isLiked) {
      await supabase
        .from('content_likes')
        .delete()
        .eq('content_id', contentId)
        .eq('user_id', currentUser.id);
    } else {
      await supabase
        .from('content_likes')
        .insert({
          content_id: contentId,
          user_id: currentUser.id,
        });
    }

    loadContents();
  };

  const handleStartConversation = async () => {
    if (!currentUser || !influencer) return;

    const { data: existingMessage } = await supabase
      .from('messages')
      .select('id')
      .or(`and(sender_id.eq.${currentUser.id},receiver_id.eq.${influencer.profile.id}),and(sender_id.eq.${influencer.profile.id},receiver_id.eq.${currentUser.id})`)
      .maybeSingle();

    if (!existingMessage) {
      await supabase.from('messages').insert({
        sender_id: currentUser.id,
        receiver_id: influencer.profile.id,
        content: 'Olá! Gostaria de conversar com você.',
      });
    }

    window.location.hash = 'messages';
  };

  const recordView = async (contentId: string) => {
    if (!currentUser) return;

    try {
      const { data } = await supabase.rpc('record_content_view', {
        p_content_id: contentId,
        p_viewer_id: currentUser.id,
      });

      // Update local state with new view count
      if (data !== null) {
        setContents(prev =>
          prev.map(c =>
            c.id === contentId ? { ...c, total_views: data } : c
          )
        );
      }
    } catch (error) {
      console.error('Error recording view:', error);
    }
  };

  const checkStreamingEnabled = async () => {
    const { data } = await supabase
      .from('streaming_settings')
      .select('is_enabled')
      .eq('influencer_id', influencerId)
      .eq('is_enabled', true)
      .maybeSingle();

    setStreamingEnabled(!!data);
  };

  const handleReportContent = (contentId: string) => {
    setSelectedContentToReport(contentId);
    setShowReportModal(true);
  };

  const handleReportSubmit = async (contentId: string, reason: string, details: string) => {
    if (!currentUser) return;

    const { error } = await supabase.from('reported_content').insert({
      content_id: contentId,
      reporter_id: currentUser.id,
      reason: reason,
      admin_notes: details, // Using admin_notes for user-provided details initially
      status: 'pending',
    });

    if (error) {
      console.error('Error reporting content:', error);
      alert('Falha ao denunciar conteúdo.');
    } else {
      alert('Conteúdo denunciado com sucesso! Agradecemos sua contribuição.');
      setShowReportModal(false);
      setSelectedContentToReport(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center text-primary text-lg py-12">
        <Loader2 className="animate-spin mr-2" size={24} /> Carregando perfil do influencer...
      </div>
    );
  }

  if (!influencer) {
    return <div className="text-center py-12 text-text">Influencer não encontrado</div>;
  }

  const visibleContents = contents.filter(c =>
    c.is_free || influencer.is_subscribed || c.influencer_id === currentUser?.id
  );

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-textSecondary hover:text-text mb-6 transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        Voltar
      </button>

      <div className="bg-surface rounded-2xl shadow-xl overflow-hidden mb-8 border border-border">
        <div className="relative h-64 bg-gradient-to-br from-secondary to-primary">
          {influencer.profile.cover_photo_url ? (
            <img
              src={influencer.profile.cover_photo_url}
              alt="Cover"
              className="w-full h-full object-cover"
            />
          ) : influencer.profile.avatar_url ? (
            <img
              src={influencer.profile.avatar_url}
              alt={influencer.profile.username}
              className="w-full h-full object-cover opacity-50"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white text-8xl font-bold">
              {influencer.profile.username[0].toUpperCase()}
            </div>
          )}
        </div>

        <div className="p-8">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-text mb-2">
                {influencer.profile.full_name || `@${influencer.profile.username}`}
              </h1>
              <p className="text-lg text-textSecondary mb-4">@{influencer.profile.username}</p>

              {influencer.profile.bio && (
                <p className="text-textSecondary mb-6">{influencer.profile.bio}</p>
              )}

              <div className="flex items-center gap-4 text-sm text-textSecondary mb-6">
                <span className="font-semibold">{influencer.total_subscribers} assinantes</span>
                <span>•</span>
                <span>{contents.length} posts</span>
              </div>

              <div className="flex items-center gap-4">
                {influencer.instagram && (
                  <a
                    href={`https://instagram.com/${influencer.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:text-accent/90"
                  >
                    <Instagram className="w-6 h-6" />
                  </a>
                )}
                {influencer.twitter && (
                  <a
                    href={`https://twitter.com/${influencer.twitter.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-secondary hover:text-secondary/90"
                  >
                    <Twitter className="w-6 h-6" />
                  </a>
                )}
              </div>
            </div>

            <div className="bg-background rounded-xl p-6 min-w-[280px] border border-border">
              {influencer.is_subscribed ? (
                <div>
                  <div className="bg-success/20 text-success px-4 py-2 rounded-lg text-center font-semibold mb-4">
                    Você está inscrito
                  </div>
                  <p className="text-sm text-textSecondary text-center mb-4">
                    Válido até {new Date(influencer.subscription_expires!).toLocaleDateString('pt-BR')}
                  </p>
                  <div className="space-y-3">
                    <button
                      onClick={handleStartConversation}
                      className="w-full flex items-center justify-center gap-2 bg-accent text-white py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors"
                    >
                      <MessageSquare className="w-5 h-5" />
                      Enviar Mensagem
                    </button>
                    {streamingEnabled && (
                      <button
                        onClick={() => setShowStreamingModal(true)}
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary to-accent text-white py-3 rounded-lg font-semibold hover:from-primary/90 hover:to-accent/90 transition-all"
                      >
                        <Video className="w-5 h-5" />
                        Reservar Streaming
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-center mb-4">
                    <span className="text-textSecondary">Assinatura mensal</span>
                    <div className="text-3xl font-bold text-text mt-2">
                      R$ {influencer.subscription_price.toFixed(2)}
                    </div>
                  </div>
                  <button
                    onClick={() => setShowSubscribeModal(true)}
                    className="w-full bg-accent text-white py-3 rounded-lg font-semibold hover:bg-accent/90 transition-colors"
                  >
                    Assinar Agora
                  </button>
                  <p className="text-xs text-textSecondary text-center mt-3">
                    Acesse conteúdo exclusivo
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold text-text">Conteúdo</h2>
      </div>

      {visibleContents.length === 0 ? (
        <div className="text-center py-12 bg-background rounded-xl border border-border">
          <p className="text-textSecondary">Nenhum conteúdo disponível ainda</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visibleContents.map((content, index) => (
            <div key={content.id} className="bg-background rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow border border-border">
              <div
                className="relative aspect-video bg-surface/50 cursor-pointer group"
                onClick={() => {
                  setSelectedContent(index);
                  recordView(content.id);
                }}
              >
                {content.content_type === 'video' ? (
                  <video
                    src={content.media_url}
                    className="w-full h-full object-cover"
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={content.thumbnail_url || content.media_url}
                    alt={content.title}
                    className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = content.media_url;
                    }}
                  />
                )}
                {content.content_type === 'video' && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black bg-opacity-50 rounded-full p-4">
                      <Play className="w-8 h-8 text-white" />
                    </div>
                  </div>
                )}
                {content.is_free && (
                  <div className="absolute top-2 right-2 bg-success text-white px-3 py-1 rounded-full text-xs font-semibold">
                    Gratuito
                  </div>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all flex items-center justify-center">
                  <span className="text-white opacity-0 group-hover:opacity-100 font-semibold">
                    Ver em tamanho completo
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-text mb-2">{content.title}</h3>
                {content.description && (
                  <p className="text-sm text-textSecondary mb-3 line-clamp-2">{content.description}</p>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLike(content.id);
                      }}
                      className="flex items-center gap-1 text-textSecondary hover:text-error transition-colors"
                    >
                      <Heart
                        className={`w-5 h-5 ${content.isLiked ? 'fill-error text-error' : ''}`}
                      />
                      <span className="text-sm font-semibold">{content.likes_count}</span>
                    </button>
                    <div className="flex items-center gap-1 text-textSecondary">
                      <Eye className="w-5 h-5" />
                      <span className="text-sm font-semibold">{content.total_views || 0}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleReportContent(content.id);
                    }}
                    className="flex items-center gap-1 text-textSecondary hover:text-error transition-colors"
                    title="Denunciar Conteúdo"
                  >
                    <Flag className="w-5 h-5" />
                  </button>
                  <span className="text-xs text-textSecondary">
                    {new Date(content.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedContent !== null && visibleContents[selectedContent] && (
        <Lightbox
          imageUrl={visibleContents[selectedContent].media_url}
          title={visibleContents[selectedContent].title}
          description={visibleContents[selectedContent].description || undefined}
          likes={visibleContents[selectedContent].likes_count}
          views={visibleContents[selectedContent].total_views || 0}
          isLiked={visibleContents[selectedContent].isLiked}
          isVideo={visibleContents[selectedContent].content_type === 'video'}
          onClose={() => setSelectedContent(null)}
          onLike={() => handleLike(visibleContents[selectedContent].id)}
          onPrevious={selectedContent > 0 ? () => setSelectedContent(selectedContent - 1) : undefined}
          onNext={selectedContent < visibleContents.length - 1 ? () => setSelectedContent(selectedContent + 1) : undefined}
          hasPrevious={selectedContent > 0}
          hasNext={selectedContent < visibleContents.length - 1}
        />
      )}

      {showSubscribeModal && (
        <SubscribeModal
          influencer={influencer}
          onClose={() => setShowSubscribeModal(false)}
          onSuccess={() => {
            setShowSubscribeModal(false);
            loadInfluencerData();
          }}
        />
      )}

      {showStreamingModal && (
        <StreamingBookModal
          influencerId={influencerId}
          influencerName={influencer.profile.full_name || `@${influencer.profile.username}`}
          onClose={() => setShowStreamingModal(false)}
          onSuccess={() => {
            setShowStreamingModal(false);
            alert('Solicitação enviada! Aguarde a aprovação do influencer.');
          }}
        />
      )}

      {showReportModal && selectedContentToReport && (
        <ReportContentModal
          contentId={selectedContentToReport}
          onClose={() => {
            setShowReportModal(false);
            setSelectedContentToReport(null);
          }}
          onSubmit={handleReportSubmit}
        />
      )}
    </div>
  );
}

function SubscribeModal({
  influencer,
  onClose,
  onSuccess,
}: {
  influencer: InfluencerData;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { profile } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix' | 'paypal'>('credit_card');
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    if (!profile) return;

    setLoading(true);

    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        subscriber_id: profile.id,
        influencer_id: influencer.profile.id,
        status: 'active',
        price_paid: influencer.subscription_price,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (!subError && subscription) {
      const platformFee = influencer.subscription_price * 0.1;
      const influencerEarnings = influencer.subscription_price * 0.9;

      await supabase.from('payments').insert({
        subscription_id: subscription.id,
        subscriber_id: profile.id,
        influencer_id: influencer.profile.id,
        amount: influencer.subscription_price,
        platform_fee: platformFee,
        influencer_earnings: influencerEarnings,
        payment_status: 'completed',
        payment_method: paymentMethod,
      });

      onSuccess();
    } else {
      alert('Erro ao processar assinatura');
    }

    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg max-w-md w-full p-6">
        <h3 className="text-2xl font-bold text-text mb-4">Assinar @{influencer.profile.username}</h3>

        <div className="bg-background rounded-lg p-4 mb-6 border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-textSecondary">Valor mensal</span>
            <div className="text-3xl font-bold text-text mt-2">
              R$ {influencer.subscription_price.toFixed(2)}
            </div>
          </div>
          <p className="text-sm text-textSecondary">Renovação automática mensal</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-textSecondary mb-3">Método de Pagamento</label>
          <div className="space-y-2">
            <button
              onClick={() => setPaymentMethod('credit_card')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                paymentMethod === 'credit_card'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-textSecondary/50'
              } text-text`}
            >
              <span className="font-medium">Cartão de Crédito</span>
            </button>
            <button
              onClick={() => setPaymentMethod('pix')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                paymentMethod === 'pix'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-textSecondary/50'
              } text-text`}
            >
              <span className="font-medium">PIX</span>
            </button>
            <button
              onClick={() => setPaymentMethod('paypal')}
              className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                paymentMethod === 'paypal'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:border-textSecondary/50'
              } text-text`}
            >
              <span className="font-medium">PayPal</span>
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border border-border text-textSecondary rounded-lg font-semibold hover:bg-background transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="flex-1 px-6 py-3 bg-accent text-white rounded-lg font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
          >
            {loading ? 'Processando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
