import { useState } from 'react';
import { X, Calendar, Clock, Send } from 'lucide-react';

interface StreamingBookModalProps {
  influencerId: string;
  influencerName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function StreamingBookModal({ influencerId, influencerName, onClose, onSuccess }: StreamingBookModalProps) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Basic validation
    if (!date || !time) {
      setError('Por favor, selecione uma data e hora.');
      setLoading(false);
      return;
    }

    // In a real application, you would send this data to your backend
    // For now, we'll simulate a successful submission
    console.log('Booking streaming for influencer:', influencerId);
    console.log('Date:', date, 'Time:', time);
    console.log('Message:', message);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      onSuccess();
    } catch (err: any) {
      setError('Falha ao enviar solicitação: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg max-w-md w-full p-6 shadow-xl border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-text">Reservar Streaming com {influencerName}</h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-surface/50 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-textSecondary" />
          </button>
        </div>

        {error && <p className="text-error text-center mb-4">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-textSecondary mb-2">
              Data Preferida
            </label>
            <div className="relative">
              <input
                type="date"
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-text pr-10"
                required
              />
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary" size={20} />
            </div>
          </div>

          <div>
            <label htmlFor="time" className="block text-sm font-medium text-textSecondary mb-2">
              Hora Preferida
            </label>
            <div className="relative">
              <input
                type="time"
                id="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-text pr-10"
                required
              />
              <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary" size={20} />
            </div>
          </div>

          <div>
            <label htmlFor="message" className="block text-sm font-medium text-textSecondary mb-2">
              Mensagem (opcional)
            </label>
            <textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-background text-text"
              placeholder="Ex: Gostaria de discutir sobre..."
            ></textarea>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-border text-textSecondary rounded-lg font-semibold hover:bg-background transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-accent text-white rounded-lg font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              {loading ? 'Enviando...' : 'Enviar Solicitação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
