/*
  # Adicionar política de UPDATE à tabela profiles
  1. Segurança: Adicionar política RLS para que usuários autenticados possam atualizar seu próprio perfil.
*/
CREATE POLICY "Allow authenticated users to update their own profile"
ON profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);