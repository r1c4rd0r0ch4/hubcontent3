import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { X, Video, Clock, DollarSign, Calendar, AlertCircle } from 'lucide-react';

interface StreamingBookModalProps {
  influencerId: string;
  influencerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface StreamingSettings {
  is_enabled: boolean;
  price_5min: number;
  price_10min: number;
  price_15min: number;
  price_30min: number;
  min_notice_hours: number;
}

export function StreamingBookModal({ influencerId, influencerName, onClose, onSuccess }: StreamingBookModalProps) {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<StreamingSettings | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<5 | 10 | 15 | 30>(10);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
    setMinimumDateTime();
  }, []);

  const setMinimumDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5); // Minimum 5 minutes advance
    const date = now.toISOString().split('T')[0];
    const time = now.toTimeString().slice(0, 5);
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const loadSettings = async () => {
    const { data, error } = await supabase
      .from('streaming_settings')
      .select('*')
      .eq('influencer_id', influencerId)
      .eq('is_enabled', true)
      .maybeSingle();

    if (!error && data) {
      setSettings({
        is_enabled: data.is_enabled,
        price_5min: parseFloat(data.price_5min),
        price_10min: parseFloat(data.price_10min),
        price_15min: parseFloat(data.price_15min),
        price_30min: parseFloat(data.price_30min),
        min_notice_hours: data.min_notice_hours,
      });
    }
    setLoading(false);
  };

  const getPrice = () => {
    if (!settings) return 0;
    switch (selectedDuration) {
      case 5: return settings.price_5min;
      case 10: return settings.price_10min;
      case 15: return settings.price_15min;
      case 30: return settings.price_30min;
      default: return 0;
    }
  };

  const calculateEarnings = (price: number) => {
    const platformFee = price * 0.1;
    const influencerEarnings = price - platformFee;
    return { platformFee, influencerEarnings };
  };

  const handleBook = async () => {
    if (!profile || !settings) return;

    setError('');
    setBooking(true);

    try {
      // Validate date/time - minimum 5 minutes in advance
      const bookingDateTime = new Date(`${selectedDate}T${selectedTime}`);
      const now = new Date();
      const minDateTime = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes

      if (bookingDateTime < minDateTime) {
        setError('A reserva deve ser feita com pelo menos 5 minutos de antecedência.');
        setBooking(false);
        return;
      }

      const price = getPrice();
      const { platformFee, influencerEarnings } = calculateEarnings(price);

      // Create booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('streaming_bookings')
        .insert({
          subscriber_id: profile.id,
          influencer_id: influencerId,
          duration_minutes: selectedDuration,
          price_paid: price,
          platform_fee: platformFee,
          influencer_earnings: influencerEarnings,
          scheduled_date: selectedDate,
          scheduled_time: selectedTime,
          status: 'pending',
          payment_status: 'completed', // In production, integrate real payment
        })
        .select()
        .single();

      if (bookingError) {
        if (bookingError.message.includes('already booked')) {
          setError('Este horário já está reservado. Por favor, escolha outro.');
        } else if (bookingError.message.includes('at least')) {
          setError(bookingError.message);
        } else {
          setError('Erro ao criar reserva. Tente novamente.');
        }
        setBooking(false);
        return;
      }

      // Create payment record
      await supabase.from('payments').insert({
        subscriber_id: profile.id,
        influencer_id: influencerId,
        amount: price,
        platform_fee: platformFee,
        influencer_earnings: influencerEarnings,
        payment_status: 'completed',
      });

      onSuccess();
    } catch (err: any) {
      console.error('Error booking streaming:', err);
      setError('Erro ao processar reserva. Tente novamente.');
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6">
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-gray-900">Streaming Indisponível</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-600">
            Este influencer não está oferecendo sessões de streaming no momento.
          </p>
          <button
            onClick={onClose}
            className="mt-4 w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    );
  }

  const price = getPrice();
  const { platformFee, influencerEarnings } = calculateEarnings(price);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">Reservar Streaming</h3>
              <p className="text-sm text-gray-600">com {influencerName}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Duração da Sessão
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[5, 10, 15, 30].map((duration) => (
                <button
                  key={duration}
                  onClick={() => setSelectedDuration(duration as any)}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    selectedDuration === duration
                      ? 'border-pink-600 bg-pink-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="font-semibold">{duration} min</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    R$ {settings[`price_${duration}min` as keyof StreamingSettings]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data e Hora
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Data</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Horário</label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Mínimo de 5 minutos de antecedência
            </p>
          </div>

          <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-gray-900 mb-3">Resumo da Reserva</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Duração:</span>
                <span className="font-semibold">{selectedDuration} minutos</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Valor:</span>
                <span className="font-semibold">R$ {price.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Taxa da plataforma (10%):</span>
                <span>R$ {platformFee.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-gray-300 flex justify-between">
                <span className="font-semibold text-gray-900">Total:</span>
                <span className="font-bold text-pink-600 text-lg">R$ {price.toFixed(2)}</span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-semibold mb-1">Como funciona:</p>
                <ul className="space-y-1 text-xs">
                  <li>• Sua solicitação será enviada para aprovação</li>
                  <li>• Você receberá uma notificação quando for aprovada</li>
                  <li>• No horário marcado, acesse sua área para assistir</li>
                  <li>• Apenas o influencer aparecerá em vídeo e áudio</li>
                  <li>• Você pode conversar por texto durante a sessão</li>
                </ul>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleBook}
              disabled={booking || !selectedDate || !selectedTime}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-lg font-semibold hover:from-pink-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {booking ? 'Processando...' : `Reservar por R$ ${price.toFixed(2)}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
