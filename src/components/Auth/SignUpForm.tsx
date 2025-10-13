import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { User, UserPlus, X, Calendar, MapPin, FileText, Camera } from 'lucide-react';
import { uploadKycDocument, UploadResult, UploadError } from '../../lib/upload';
import type { Database } from '../../lib/database.types';
import { supabase } from '../../lib/supabase'; // Ensure supabase is imported

type KycDocumentType = Database['public']['Enums']['kyc_document_type_enum'];

export function SignUpForm({ onToggle, onClose }: { onToggle: () => void; onClose?: () => void }) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [userType, setUserType] = useState<'user' | 'influencer'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // KYC Fields
  const [fullName, setFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [addressStreet, setAddressStreet] = useState('');
  const [addressCity, setAddressCity] = useState('');
  const [addressState, setAddressState] = useState('');
  const [addressZip, setAddressZip] = useState('');
  const [addressCountry, setAddressCountry] = useState('');
  const [documentType, setDocumentType] = useState(''); // RG, CPF, CNH
  const [documentNumber, setDocumentNumber] = useState('');

  // KYC Document Uploads
  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [proofOfAddressFile, setProofOfAddressFile] = useState<File | null>(null);
  const [selfieWithIdFile, setSelfieWithIdFile] = useState<File | null>(null);

  const [idFrontUploadStatus, setIdFrontUploadStatus] = useState<{ url: string; path: string } | null>(null);
  const [idBackUploadStatus, setIdBackUploadStatus] = useState<{ url: string; path: string } | null>(null);
  const [proofOfAddressUploadStatus, setProofOfAddressUploadStatus] = useState<{ url: string; path: string } | null>(null);
  const [selfieWithIdUploadStatus, setSelfieWithIdStatus] = useState<{ url: string; path: string } | null>(null);

  const handleFileChange = (setter: React.Dispatch<React.SetStateAction<File | null>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setter(e.target.files[0]);
    }
  };

  const uploadKycDocuments = async (userId: string) => {
    const uploads = [];
    const uploadErrors: string[] = [];

    const uploadAndSetStatus = async (file: File | null, type: KycDocumentType, setter: React.Dispatch<React.SetStateAction<{ url: string; path: string } | null>>) => {
      if (file) {
        const { data, error: uploadError } = await uploadKycDocument(file, userId, type);
        if (uploadError) {
          uploadErrors.push(`Erro ao enviar ${type}: ${uploadError.message}`);
        } else if (data) {
          setter(data);
          // Also insert into kyc_documents table
          const { error: dbError } = await supabase.from('kyc_documents').insert({
            user_id: userId,
            document_type: type,
            file_url: data.url,
            file_path: data.path,
            status: 'pending',
          });
          if (dbError) {
            uploadErrors.push(`Erro ao registrar ${type} no DB: ${dbError.message}`);
          }
        }
      }
    };

    await Promise.all([
      uploadAndSetStatus(idFrontFile, 'id_front', setIdFrontUploadStatus),
      uploadAndSetStatus(idBackFile, 'id_back', setIdBackUploadStatus),
      uploadAndSetStatus(proofOfAddressFile, 'proof_of_address', setProofOfAddressUploadStatus),
      uploadAndSetStatus(selfieWithIdFile, 'selfie_with_id', setSelfieWithIdStatus),
    ]);

    if (uploadErrors.length > 0) {
      throw new Error(uploadErrors.join('\n'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let kycData = undefined;
    if (userType === 'influencer') {
      if (!fullName || !dateOfBirth || !addressStreet || !addressCity || !addressState || !addressZip || !addressCountry || !documentType || !documentNumber || !idFrontFile || !idBackFile || !proofOfAddressFile || !selfieWithIdFile) {
        setError('Todos os campos e documentos KYC são obrigatórios para influenciadores.');
        setLoading(false);
        return;
      }
      kycData = {
        fullName,
        dateOfBirth,
        address: {
          street: addressStreet,
          city: addressCity,
          state: addressState,
          zip: addressZip,
          country: addressCountry,
        },
        documentType,
        documentNumber,
      };
    }

    const { error: signUpError, data: userData } = await signUp(email, password, username, userType, kycData);

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (userType === 'influencer' && userData?.user?.id) {
      try {
        await uploadKycDocuments(userData.user.id);
      } catch (uploadError: any) {
        setError(`Erro no upload de documentos: ${uploadError.message}`);
        // Potentially revert user creation or mark profile for manual review
        setLoading(false);
        return;
      }
    }

    setLoading(false);
    // Optionally, show a success message or redirect
    if (onClose) onClose();
  };

  return (
    <div className={`w-full mx-auto transition-all duration-300 ${userType === 'influencer' ? 'max-w-4xl' : 'max-w-xl'}`}> {/* Ajustado max-w dinamicamente */}
      <div className="bg-surface rounded-2xl shadow-xl p-8 relative max-h-[80vh] flex flex-col border border-border"> {/* Ajustado bg, border, shadow e max-h */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-textSecondary hover:text-text hover:bg-surface/50 rounded-lg transition-colors flex-shrink-0"
            type="button"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        <div className="flex-shrink-0 pb-4"> {/* Header wrapper */}
          <h2 className="text-3xl font-bold text-text mb-2">Criar Conta</h2>
          <p className="text-textSecondary mb-4">Junte-se à maior plataforma de conteúdo adulto</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 flex-grow overflow-y-auto pr-2">
          <div>
            <label className="block text-sm font-medium text-textSecondary mb-2">
              Tipo de Conta
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setUserType('user')}
                className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  userType === 'user'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 text-textSecondary hover:text-text'
                }`}
              >
                <User className="w-5 h-5" />
                <span className="font-medium">Usuário</span>
              </button>
              <button
                type="button"
                onClick={() => setUserType('influencer')}
                className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  userType === 'influencer'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50 text-textSecondary hover:text-text'
                }`}
              >
                <UserPlus className="w-5 h-5" />
                <span className="font-medium">Influencer</span>
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="username" className="block text-sm font-medium text-textSecondary mb-2">
              Nome de Usuário
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-text"
              placeholder="seunome"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-textSecondary mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-text"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-textSecondary mb-2">
              Senha
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-text"
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {userType === 'influencer' && (
            <div className="space-y-6 border-t border-border pt-6 mt-6">
              <h3 className="text-xl font-bold text-text">Dados KYC (Verificação de Identidade)</h3>

              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-textSecondary mb-2">
                  Nome Completo
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required={userType === 'influencer'}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-text"
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <label htmlFor="dateOfBirth" className="block text-sm font-medium text-textSecondary mb-2">
                  Data de Nascimento
                </label>
                <div className="relative">
                  <input
                    id="dateOfBirth"
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    required={userType === 'influencer'}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-10 text-text"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-textSecondary w-5 h-5" />
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-textSecondary mb-2">
                  Endereço Completo
                </label>
                <input
                  type="text"
                  value={addressStreet}
                  onChange={(e) => setAddressStreet(e.target.value)}
                  required={userType === 'influencer'}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-text"
                  placeholder="Rua, número, complemento"
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={addressCity}
                    onChange={(e) => setAddressCity(e.target.value)}
                    required={userType === 'influencer'}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-text"
                    placeholder="Cidade"
                  />
                  <input
                    type="text"
                    value={addressState}
                    onChange={(e) => setAddressState(e.target.value)}
                    required={userType === 'influencer'}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-text"
                    placeholder="Estado"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={addressZip}
                    onChange={(e) => setAddressZip(e.target.value)}
                    required={userType === 'influencer'}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-text"
                    placeholder="CEP"
                  />
                  <input
                    type="text"
                    value={addressCountry}
                    onChange={(e) => setAddressCountry(e.target.value)}
                    required={userType === 'influencer'}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-text"
                    placeholder="País"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="documentType" className="block text-sm font-medium text-textSecondary mb-2">
                  Tipo de Documento de Identificação
                </label>
                <select
                  id="documentType"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  required={userType === 'influencer'}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-text"
                >
                  <option value="">Selecione</option>
                  <option value="RG">RG</option>
                  <option value="CPF">CPF</option>
                  <option value="CNH">CNH</option>
                </select>
              </div>

              <div>
                <label htmlFor="documentNumber" className="block text-sm font-medium text-textSecondary mb-2">
                  Número do Documento
                </label>
                <input
                  id="documentNumber"
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  required={userType === 'influencer'}
                  className="w-full px-4 py-3 rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent transition-all text-text"
                  placeholder="Número do documento"
                />
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold text-text">Upload de Documentos</h4>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
                  <label htmlFor="idFrontFile" className="flex items-center gap-3 text-sm font-medium text-textSecondary cursor-pointer">
                    <FileText className="w-5 h-5 text-primary" />
                    <span>Foto do Documento (Frente)</span>
                  </label>
                  <input
                    id="idFrontFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange(setIdFrontFile)}
                    required={userType === 'influencer'}
                    className="hidden"
                  />
                  {idFrontFile && <span className="text-xs text-textSecondary">{idFrontFile.name}</span>}
                  {!idFrontFile && <span className="text-xs text-textSecondary">Nenhum arquivo</span>}
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
                  <label htmlFor="idBackFile" className="flex items-center gap-3 text-sm font-medium text-textSecondary cursor-pointer">
                    <FileText className="w-5 h-5 text-primary" />
                    <span>Foto do Documento (Verso)</span>
                  </label>
                  <input
                    id="idBackFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange(setIdBackFile)}
                    required={userType === 'influencer'}
                    className="hidden"
                  />
                  {idBackFile && <span className="text-xs text-textSecondary">{idBackFile.name}</span>}
                  {!idBackFile && <span className="text-xs text-textSecondary">Nenhum arquivo</span>}
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
                  <label htmlFor="proofOfAddressFile" className="flex items-center gap-3 text-sm font-medium text-textSecondary cursor-pointer">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span>Comprovante de Endereço</span>
                  </label>
                  <input
                    id="proofOfAddressFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleFileChange(setProofOfAddressFile)}
                    required={userType === 'influencer'}
                    className="hidden"
                  />
                  {proofOfAddressFile && <span className="text-xs text-textSecondary">{proofOfAddressFile.name}</span>}
                  {!proofOfAddressFile && <span className="text-xs text-textSecondary">Nenhum arquivo</span>}
                </div>

                <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background">
                  <label htmlFor="selfieWithIdFile" className="flex items-center gap-3 text-sm font-medium text-textSecondary cursor-pointer">
                    <Camera className="w-5 h-5 text-primary" />
                    <span>Selfie com Documento</span>
                  </label>
                  <input
                    id="selfieWithIdFile"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleFileChange(setSelfieWithIdFile)}
                    required={userType === 'influencer'}
                    className="hidden"
                  />
                  {selfieWithIdFile && <span className="text-xs text-textSecondary">{selfieWithIdFile.name}</span>}
                  {!selfieWithIdFile && <span className="text-xs text-textSecondary">Nenhum arquivo</span>}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-error/10 text-error px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-accent text-white py-3 rounded-lg font-semibold hover:from-primary/80 hover:to-accent/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/30"
          >
            {loading ? 'Criando conta...' : 'Criar Conta'}
          </button>
        </form>

        <div className="mt-6 text-center flex-shrink-0"> {/* Footer */}
          <button
            onClick={onToggle}
            className="text-primary hover:text-primary/80 font-medium"
          >
            Já tem uma conta? Entrar
          </button>
        </div>
      </div>
    </div>
  );
}
