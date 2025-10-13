import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LogIn, X } from 'lucide-react';

export function SignInForm({ onToggle, onClose }: { onToggle: () => void; onClose?: () => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError('Email ou senha incorretos');
    }

    setLoading(false);
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-2xl shadow-xl p-8 relative">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="flex items-center justify-center mb-6">
          <div className="bg-pink-100 p-3 rounded-full">
            <LogIn className="w-8 h-8 text-pink-600" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Bem-vindo de volta</h2>
        <p className="text-gray-600 mb-8 text-center">Entre para acessar conteúdos exclusivos</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
              placeholder="Sua senha"
            />
          </div>

          {error && (
            <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pink-600 text-white py-3 rounded-lg font-semibold hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={onToggle}
            className="text-pink-600 hover:text-pink-700 font-medium"
          >
            Não tem conta? Criar agora
          </button>
        </div>
      </div>
    </div>
  );
}
