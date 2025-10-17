/*
  # Adicionar campos de monetização à tabela content_posts
  1. Novas Colunas: is_free (boolean), is_purchasable (boolean), price (numeric)
  2. Valores Padrão: is_free DEFAULT false, is_purchasable DEFAULT false, price DEFAULT 0
*/
ALTER TABLE content_posts
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_purchasable BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

-- Garantir que RLS esteja habilitado (já deve estar, mas é bom reforçar)
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;

-- Nenhuma nova política RLS é estritamente necessária para estas adições de coluna,
-- pois elas fazem parte da tabela existente e as políticas existentes devem cobrir.