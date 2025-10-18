/*
  # Garantir políticas RLS e função RPC para a funcionalidade do InfluencerBrowser

  Esta migração configura ou atualiza as políticas de segurança em nível de linha (RLS)
  e a função RPC necessárias para que o componente InfluencerBrowser funcione corretamente,
  permitindo que usuários autenticados visualizem e interajam com perfis de influencers.

  1. Tabela 'profiles': Permite que usuários autenticados selecionem perfis de influencers
     que estão aprovados e ativos.
  2. Tabela 'content_posts': Permite que usuários autenticados selecionem posts de conteúdo
     aprovados (necessário para a contagem de posts).
  3. Tabela 'subscriptions': Permite que usuários autenticados selecionem suas próprias
     assinaturas ativas (necessário para verificar o status de inscrição).
  4. Função RPC 'get_influencer_subscriber_count': Garante que a função esteja definida
     com SECURITY DEFINER e que a permissão de EXECUTE seja concedida a usuários autenticados.
*/

-- 1. Configurar RLS para a tabela 'profiles'
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Remover política existente que possa conflitar ou ser muito restritiva
DROP POLICY IF EXISTS "Allow authenticated to view influencer profiles" ON profiles;

-- Criar política para permitir que usuários autenticados visualizem perfis de influencers aprovados e ativos
CREATE POLICY "Allow authenticated to view influencer profiles"
ON profiles FOR SELECT TO authenticated
USING (user_type = 'influencer' AND account_status = 'approved' AND is_active = true);


-- 2. Configurar RLS para a tabela 'content_posts'
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;

-- Remover política existente que possa conflitar ou ser muito restritiva
DROP POLICY IF EXISTS "Allow authenticated to view approved content posts" ON content_posts;

-- Criar política para permitir que usuários autenticados visualizem posts de conteúdo aprovados
CREATE POLICY "Allow authenticated to view approved content posts"
ON content_posts FOR SELECT TO authenticated
USING (status = 'approved');


-- 3. Configurar RLS para a tabela 'subscriptions'
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Remover política existente que possa conflitar ou ser muito restritiva
DROP POLICY IF EXISTS "Allow authenticated to view own active subscriptions" ON subscriptions;

-- Criar política para permitir que usuários autenticados visualizem suas próprias assinaturas ativas
CREATE POLICY "Allow authenticated to view own active subscriptions"
ON subscriptions FOR SELECT TO authenticated
USING (subscriber_id = auth.uid() AND status = 'active');


-- 4. Garantir a função RPC 'get_influencer_subscriber_count'
CREATE OR REPLACE FUNCTION get_influencer_subscriber_count(p_influencer_id uuid)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER -- Crucial para ignorar RLS na tabela de assinaturas para a contagem
AS $$
DECLARE
    subscriber_count bigint;
BEGIN
    SELECT COUNT(id)
    INTO subscriber_count
    FROM public.subscriptions
    WHERE influencer_id = p_influencer_id AND status = 'active';

    RETURN subscriber_count;
END;
$$;

-- Conceder permissão de execução a usuários autenticados
GRANT EXECUTE ON FUNCTION get_influencer_subscriber_count(uuid) TO authenticated;