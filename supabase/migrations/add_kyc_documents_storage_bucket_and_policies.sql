/*
  # Criar bucket de armazenamento 'kyc-documents' e políticas RLS
  1. Novo Bucket de Armazenamento: kyc-documents
  2. Segurança: Adicionar políticas RLS para SELECT, INSERT, UPDATE, DELETE para usuários autenticados e SELECT para admins.
  
  ATENÇÃO: Este arquivo é fornecido para referência. As políticas de RLS para buckets de armazenamento
  DEVEM ser configuradas manualmente no painel do Supabase Storage devido a restrições de permissão
  ao tentar aplicá-las via migrações SQL.
*/

-- Criar o bucket 'kyc-documents' se ele não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', true)
ON CONFLICT (id) DO NOTHING;

-- As políticas RLS abaixo devem ser configuradas manualmente no painel do Supabase Storage.
-- Vá para Storage -> Buckets -> kyc-documents -> Policies.

-- Política 1: "Allow authenticated users to read their own kyc documents"
-- Permite que usuários autenticados leiam seus próprios documentos KYC.
-- CREATE POLICY "Allow authenticated users to read their own kyc documents"
-- ON storage.objects FOR SELECT TO authenticated
-- USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política 2: "Allow admins to read all kyc documents"
-- Permite que administradores (perfis com is_admin = true) leiam todos os documentos KYC.
-- CREATE POLICY "Allow admins to read all kyc documents"
-- ON storage.objects FOR SELECT TO authenticated
-- USING (bucket_id = 'kyc-documents' AND (SELECT is_admin FROM public.profiles WHERE id = auth.uid()) = true);

-- Política 3: "Allow authenticated users to upload their own kyc documents"
-- Permite que usuários autenticados façam upload de documentos KYC em sua própria pasta.
-- CREATE POLICY "Allow authenticated users to upload their own kyc documents"
-- ON storage.objects FOR INSERT TO authenticated
-- WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política 4: "Allow authenticated users to update their own kyc documents"
-- Permite que usuários autenticados atualizem seus próprios documentos KYC.
-- CREATE POLICY "Allow authenticated users to update their own kyc documents"
-- ON storage.objects FOR UPDATE TO authenticated
-- USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1])
-- WITH CHECK (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Política 5: "Allow authenticated users to delete their own kyc documents"
-- Permite que usuários autenticados deletem seus próprios documentos KYC.
-- CREATE POLICY "Allow authenticated users to delete their own kyc documents"
-- ON storage.objects FOR DELETE TO authenticated
-- USING (bucket_id = 'kyc-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
