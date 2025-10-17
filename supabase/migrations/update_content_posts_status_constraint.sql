/*
  # Atualizar restrição de status da tabela content_posts
  1. Modificar a restrição 'chk_content_posts_status' para incluir 'pending' como um status válido.
  2. Os status permitidos serão: 'pending', 'approved', 'rejected'.
*/
-- Remover a restrição existente se ela já existir
ALTER TABLE content_posts
DROP CONSTRAINT IF EXISTS chk_content_posts_status;

-- Adicionar a restrição com os valores de status atualizados
ALTER TABLE content_posts
ADD CONSTRAINT chk_content_posts_status CHECK (status IN ('pending', 'approved', 'rejected'));

-- Garantir que RLS esteja habilitado (já deve estar, mas é bom reforçar)
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;