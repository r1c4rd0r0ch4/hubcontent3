/*
  # Criar bucket de armazenamento 'avatars' e políticas RLS
  1. Novo Bucket de Armazenamento: avatars
  2. Segurança: Adicionar políticas RLS para SELECT, INSERT, UPDATE para usuários autenticados.
*/

-- Criar o bucket 'avatars' se ele não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Política para SELECT (acesso de leitura)
-- Permite que qualquer pessoa (pública) leia os avatares.
CREATE POLICY "Allow public read access to avatars"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'avatars');

-- Política para INSERT (upload de novos avatares)
-- Permite que usuários autenticados façam upload de avatares em sua própria pasta (baseada no ID do usuário).
CREATE POLICY "Allow authenticated users to upload their own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política para UPDATE (substituir avatares existentes)
-- Permite que usuários autenticados atualizem avatares em sua própria pasta.
CREATE POLICY "Allow authenticated users to update their own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);
