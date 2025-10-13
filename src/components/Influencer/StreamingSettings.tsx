import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Video, DollarSign, Clock, Calendar, Save } from 'lucide-react';

interface StreamingSettings {
  is_enabled: boolean;
  price_5min: number;
  price_10min: number;
  price_15min: number;
  price_30min: number;
  min_notice_hours: number;
  max_bookings_per_day: number;
}

export function StreamingSettings() {
  const { profile } = useAuth();
  const [settings, setSettings] = useState<StreamingSettings>({
    is_enabled: false,
    price_5min: 50,
    price_10min: 90,
    price_15min: 120,
    price_30min: 200,
    min_notice_hours: 0.083, // 5 minutes (kept for DB compatibility)
    max_bookings_per_day: 5,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, [profile]);

  const loadSettings = async () => {
    if (!profile) return;

    const { data, error } = await supabase
      .from('streaming_settings')
      .select('*')
      .eq('influencer_id', profile.id)
      .maybeSingle();

    if (!error && data) {
      setSettings({
        is_enabled: data.is_enabled,
        price_5min: parseFloat(data.price_5min),
        price_10min: parseFloat(data.price_10min),
        price_15min: parseFloat(data.price_15min),
        price_30min: parseFloat(data.price_30min),
        min_notice_hours: data.min_notice_hours,
        max_bookings_per_day: data.max_bookings_per_day,
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('streaming_settings')
      .upsert({
        influencer_id: profile.id,
        ...settings,
      });

    if (error) {
      setMessage('Erro ao salvar configurações');
      console.error(error);
    } else {
      setMessage('Configurações salvas com sucesso!');
      setTimeout(() => setMessage(''), 3000);
    }

    setSaving(false);
  };

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Configurações de Streaming</h2>
        <p className="text-gray-600">
          Configure preços e disponibilidade para sessões de streaming ao vivo com seus assinantes
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between mb-6 pb-6 border-b">
          <div className="flex items-center gap-3">
            <Video className="w-6 h-6 text-pink-600" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Habilitar Streaming</h3>
              <p className="text-sm text-gray-600">Permitir que assinantes comprem sessões ao vivo</p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.is_enabled}
              onChange={(e) => setSettings({ ...settings, is_enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-pink-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-pink-600"></div>
          </label>
        </div>

        {settings.is_enabled && (
          <>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-gray-700" />
                <h4 className="font-semibold text-gray-900">Preços por Duração</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">5 Minutos</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">R$</span>
                    <input
                      type="number"
                      value={settings.price_5min}
                      onChange={(e) => setSettings({ ...settings, price_5min: parseFloat(e.target.value) })}
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">10 Minutos</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">R$</span>
                    <input
                      type="number"
                      value={settings.price_10min}
                      onChange={(e) => setSettings({ ...settings, price_10min: parseFloat(e.target.value) })}
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">15 Minutos</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">R$</span>
                    <input
                      type="number"
                      value={settings.price_15min}
                      onChange={(e) => setSettings({ ...settings, price_15min: parseFloat(e.target.value) })}
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">30 Minutos</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500">R$</span>
                    <input
                      type="number"
                      value={settings.price_30min}
                      onChange={(e) => setSettings({ ...settings, price_30min: parseFloat(e.target.value) })}
                      min="0"
                      step="0.01"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-5 h-5 text-gray-700" />
                <h4 className="font-semibold text-gray-900">Restrições</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Antecedência Mínima
                  </label>
                  <div className="px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg">
                    <span className="text-gray-900 font-semibold">5 minutos</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Tempo mínimo fixo para reservas de streaming
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Máximo de Reservas por Dia
                  </label>
                  <input
                    type="number"
                    value={settings.max_bookings_per_day}
                    onChange={(e) => setSettings({ ...settings, max_bookings_per_day: parseInt(e.target.value) })}
                    min="1"
                    max="20"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Limite de sessões que você aceita por dia
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">Como Funciona</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Assinantes podem comprar sessões de streaming privado com você</li>
                <li>• Você receberá notificações de novas solicitações</li>
                <li>• Aprove ou rejeite cada solicitação manualmente</li>
                <li>• No horário marcado, inicie o streaming pela plataforma</li>
                <li>• A plataforma cobra 10% de taxa sobre cada sessão</li>
              </ul>
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-3 bg-pink-600 text-white rounded-lg font-semibold hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Salvando...' : 'Salvar Configurações'}
        </button>
        {message && (
          <span className={`text-sm font-medium ${message.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>
            {message}
          </span>
        )}
      </div>
    </div>
  );
}
