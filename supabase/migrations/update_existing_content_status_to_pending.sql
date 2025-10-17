/*
  # Atualizar status de conteúdo existente para 'pending'
  1. Define o status de todos os posts de conteúdo existentes que não têm um status válido
     (NULL ou fora de 'pending', 'approved', 'rejected') para 'pending'.
  2. Isso garante que o conteúdo antigo seja visível no painel do influenciador para gerenciamento.
*/
UPDATE public.content_posts
SET status = 'pending'
WHERE status IS NULL OR status NOT IN ('pending', 'approved', 'rejected');

-- Garantir que RLS esteja habilitado (já deve estar, mas é bom reforçar)
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;