import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Database } from '../../lib/database.types';
import toast from 'react-hot-toast';

type SmtpSettings = Database['public']['Tables']['smtp_settings']['Row'];

export const PlatformSettingsTab: React.FC = () => {
  const [settings, setSettings] = useState<SmtpSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSmtpSettings();
  }, []);

  const fetchSmtpSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('smtp_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSettings(data);
    } catch (err) {
      console.error('Error fetching SMTP settings:', err);
      setError('Falha ao carregar configurações SMTP.');
      toast.error('Falha ao carregar configurações SMTP.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    setSettings(prev => ({
      ...prev!,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setError(null);
    try {
      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from('smtp_settings')
          .update({
            host: settings.host,
            port: Number(settings.port),
            username: settings.username,
            password: settings.password,
            from_email: settings.from_email,
            secure: settings.secure,
            updated_at: new Date().toISOString(),
          })
          .eq('id', settings.id);

        if (error) {
          console.error('Supabase error updating SMTP settings:', error); // Log detailed error
          throw error;
        }
        toast.success('Configurações SMTP atualizadas com sucesso!');
      } else {
        // Insert new settings
        const { data, error } = await supabase
          .from('smtp_settings')
          .insert({
            host: settings.host,
            port: Number(settings.port),
            username: settings.username,
            password: settings.password,
            from_email: settings.from_email,
            secure: settings.secure,
          })
          .select()
          .single();

        if (error) {
          console.error('Supabase error inserting SMTP settings:', error); // Log detailed error
          throw error;
        }
        setSettings(data); // Update state with the new ID
        toast.success('Configurações SMTP salvas com sucesso!');
      }
    } catch (err) {
      console.error('Error saving SMTP settings:', err); // Log generic error
      setError('Falha ao salvar configurações SMTP.');
      toast.error('Falha ao salvar configurações SMTP.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Carregando configurações...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Configurações da Plataforma</h2>

      <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-8">
        <h3 className="text-xl font-semibold text-gray-800 mb-4">Configurações de E-mail (SMTP)</h3>
        <p className="text-gray-600 mb-6">Configure os detalhes do seu servidor SMTP para enviar e-mails de notificação.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="host" className="block text-sm font-medium text-gray-700 mb-1">
              Host SMTP
            </label>
            <input
              type="text"
              id="host"
              name="host"
              value={settings?.host || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm py-2 px-3 text-gray-900"
              required
            />
          </div>

          <div>
            <label htmlFor="port" className="block text-sm font-medium text-gray-700 mb-1">
              Porta SMTP
            </label>
            <input
              type="number"
              id="port"
              name="port"
              value={settings?.port || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm py-2 px-3 text-gray-900"
              required
            />
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
              Usuário SMTP
            </label>
            <input
              type="text"
              id="username"
              name="username"
              value={settings?.username || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm py-2 px-3 text-gray-900"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Senha SMTP
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={settings?.password || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm py-2 px-3 text-gray-900"
              required
            />
          </div>

          <div>
            <label htmlFor="from_email" className="block text-sm font-medium text-gray-700 mb-1">
              E-mail de Remetente
            </label>
            <input
              type="email"
              id="from_email"
              name="from_email"
              value={settings?.from_email || ''}
              onChange={handleChange}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm py-2 px-3 text-gray-900"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              id="secure"
              name="secure"
              type="checkbox"
              checked={settings?.secure || false}
              onChange={handleChange}
              className="h-4 w-4 text-pink-600 focus:ring-pink-500 border-gray-300 rounded"
            />
            <label htmlFor="secure" className="ml-2 block text-sm text-gray-900">
              Usar conexão segura (SSL/TLS)
            </label>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
