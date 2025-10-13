import { useState } from 'react';
import { X, Flag, Send } from 'lucide-react';

interface ReportContentModalProps {
  contentId: string;
  onClose: () => void;
  onSubmit: (contentId: string, reason: string, details: string) => void;
}

export function ReportContentModal({ contentId, onClose, onSubmit }: ReportContentModalProps) {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!reason) {
      setError('Por favor, selecione um motivo para a denúncia.');
      setLoading(false);
      return;
    }

    try {
      await onSubmit(contentId, reason, details);
    } catch (err: any) {
      setError('Falha ao enviar denúncia: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-surface rounded-lg max-w-md w-full p-6 shadow-xl border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold text-text">Denunciar Conteúdo</h3>
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
            <label htmlFor="reason" className="block text-sm font-medium text-textSecondary mb-2">
              Motivo da Denúncia
            </label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-text"
              required
            >
              <option value="">Selecione um motivo</option>
              <option value="conteudo_inapropriado">Conteúdo Inapropriado</option>
              <option value="violencia">Violência ou Ódio</option>
              <option value="spam">Spam ou Engano</option>
              <option value="direitos_autorais">Violação de Direitos Autorais</option>
              <option value="outros">Outros</option>
            </select>
          </div>

          <div>
            <label htmlFor="details" className="block text-sm font-medium text-textSecondary mb-2">
              Detalhes Adicionais (opcional)
            </label>
            <textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none bg-background text-text"
              placeholder="Forneça mais detalhes sobre a denúncia..."
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
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-error text-white rounded-lg font-semibold hover:bg-error/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-5 h-5" />
              {loading ? 'Enviando...' : 'Denunciar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
