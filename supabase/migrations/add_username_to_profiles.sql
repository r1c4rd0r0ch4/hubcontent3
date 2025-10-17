/*
  # Adicionar username à tabela profiles
  1. Alterar Tabela: profiles (adicionar username text)
*/
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS username text UNIQUE;

-- Política para permitir que usuários autenticados atualizem seu próprio username,
-- ou garantir que seja definido no cadastro.
-- Por enquanto, assumimos que é definido no cadastro e não editável diretamente pelo usuário via RLS.
-- Se precisar ser editável, uma política como esta seria necessária:
-- CREATE POLICY "Users can update own username" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);