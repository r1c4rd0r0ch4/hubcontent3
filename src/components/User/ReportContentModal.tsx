import React, { useState } from 'react';
import { X } from 'lucide-react';

interface ReportContentModalProps {
  contentId: string;
  onClose: () => void;
  onSubmit: (contentId: string, reason: string, details: string) => void;
}

export const ReportContentModal: React.FC<ReportContentModalProps> = ({ contentId, onClose, onSubmit }) => {
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);

  const reasons = [
    'Nudez ou Conteúdo Sexual Explícito',
    'Violência ou Conteúdo Gráfico',
    'Assédio ou Bullying',
    'Discurso de Ódio',
    'Spam ou Engano',
    'Informação Falsa',
    'Violação de Direitos Autorais',
    'Outro',
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      alert('Por favor, selecione um motivo para a denúncia.');
      return;
    }
    setLoading(true);
    await onSubmit(contentId, reason, details);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        <h3 className="text-2xl font-bold text-gray-900 mb-4">Denunciar Conteúdo</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
              Motivo da Denúncia
            </label>
            <select
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              required
            >
              <option value="">Selecione um motivo</option>
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="details" className="block text-sm font-medium text-gray-700 mb-1">
              Detalhes Adicionais (Opcional)
            </label>
            <textarea
              id="details"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-pink-500 focus:ring-pink-500 sm:text-sm"
              placeholder="Forneça mais detalhes sobre a denúncia..."
            ></textarea>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md font-semibold hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-red-600 text-white rounded-md font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Denunciar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
