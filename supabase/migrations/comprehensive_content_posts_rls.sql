/*
  # RLS Completa para a tabela content_posts
  1. Garante que o Row Level Security (RLS) esteja habilitado na tabela content_posts.
  2. Cria políticas abrangentes para SELECT, INSERT, UPDATE e DELETE,
     permitindo que usuários autenticados gerenciem apenas seu próprio conteúdo.
*/
ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

-- Remover políticas existentes para evitar conflitos e garantir a aplicação das novas
DROP POLICY IF EXISTS "Influencers can view their own content" ON public.content_posts;
DROP POLICY IF EXISTS "Influencers can insert their own content" ON public.content_posts;
DROP POLICY IF EXISTS "Influencers can update their own content" ON public.content_posts;
DROP POLICY IF EXISTS "Influencers can delete their own content" ON public.content_posts;

-- Política para SELECT: Usuários autenticados podem ver seu próprio conteúdo
CREATE POLICY "Influencers can view their own content"
ON public.content_posts FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Política para INSERT: Usuários autenticados podem inserir seu próprio conteúdo
CREATE POLICY "Influencers can insert their own content"
ON public.content_posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Política para UPDATE: Usuários autenticados podem atualizar seu próprio conteúdo
CREATE POLICY "Influencers can update their own content"
ON public.content_posts FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Política para DELETE: Usuários autenticados podem deletar seu próprio conteúdo
CREATE POLICY "Influencers can delete their own content"
ON public.content_posts FOR DELETE TO authenticated
USING (auth.uid() = user_id);