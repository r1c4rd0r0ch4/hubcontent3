/*
  # Criar tabela user_login_logs
  1. Novas Tabelas: user_login_logs (id uuid, user_id uuid, email text, logged_in_at timestamptz, ip_address text, user_agent text)
  2. Segurança: Habilitar RLS, adicionar política de leitura para administradores autenticados e de inserção para usuários autenticados.
*/
CREATE TABLE IF NOT EXISTS user_login_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text NOT NULL,
  logged_in_at timestamptz DEFAULT now(),
  ip_address text,
  user_agent text,
  CONSTRAINT fk_user
    FOREIGN KEY(user_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE
);

ALTER TABLE user_login_logs ENABLE ROW LEVEL SECURITY;

-- Política para administradores autenticados visualizarem todos os logs de acesso de usuários
CREATE POLICY "Admins can view all user login logs"
ON user_login_logs FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = TRUE)
);

-- Política para usuários autenticados inserirem seus próprios logs de login
CREATE POLICY "Authenticated users can insert their own login logs"
ON user_login_logs FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Adicionar índices para colunas frequentemente consultadas
CREATE INDEX IF NOT EXISTS idx_user_login_logs_user_id ON user_login_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_user_login_logs_logged_in_at ON user_login_logs (logged_in_at DESC);