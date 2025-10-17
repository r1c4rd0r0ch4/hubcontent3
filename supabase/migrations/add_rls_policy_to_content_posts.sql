/*
  # Adicionar política de RLS para content_posts
  1. Garante que o Row Level Security (RLS) esteja habilitado na tabela content_posts.
  2. Cria uma política que permite a usuários autenticados (influenciadores)
     visualizar (SELECT) apenas o conteúdo que eles mesmos postaram (onde user_id = auth.uid()).
*/
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

-- Remover política existente se houver alguma com o mesmo nome para evitar conflitos
DROP POLICY IF EXISTS "Influencers can view their own content" ON public.content_posts;

CREATE POLICY "Influencers can view their own content"
ON public.content_posts FOR SELECT TO authenticated
USING (auth.uid() = user_id);