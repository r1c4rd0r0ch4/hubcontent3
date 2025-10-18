/*
  # Atualizar política RLS para a tabela 'content_posts'

  Esta migração ajusta a política de segurança em nível de linha (RLS) para a tabela 'content_posts'
  a fim de permitir que usuários autenticados visualizem conteúdo de acordo com as seguintes regras:
  - Conteúdo gratuito (is_free = TRUE)
  - Conteúdo comprável avulso (is_purchasable = TRUE)
  - Conteúdo do próprio influencer (user_id = auth.uid())
  - Conteúdo de influencers aos quais o usuário está inscrito
  - Conteúdo que o usuário já comprou avulso

  O conteúdo restrito por assinatura (não gratuito e não comprável) só será visível se o usuário
  estiver inscrito no influencer ou já tiver comprado o conteúdo.
*/

-- Habilitar RLS para a tabela 'content_posts' (se já não estiver)
ALTER TABLE content_posts ENABLE ROW LEVEL SECURITY;

-- Remover a política existente que pode ser muito restritiva
DROP POLICY IF EXISTS "Allow authenticated to view approved content posts" ON content_posts;

-- Criar uma nova política para permitir acesso condicional ao conteúdo
CREATE POLICY "Allow authenticated to view accessible content"
ON content_posts FOR SELECT TO authenticated
USING (
    status = 'approved' AND (
        is_free = TRUE OR -- Conteúdo gratuito é sempre visível
        is_purchasable = TRUE OR -- Conteúdo comprável é visível para que o usuário possa comprar
        user_id = auth.uid() OR -- O próprio influencer pode ver seu conteúdo
        EXISTS ( -- O usuário está inscrito neste influencer
            SELECT 1 FROM subscriptions
            WHERE subscriber_id = auth.uid()
            AND influencer_id = content_posts.user_id
            AND status = 'active'
        ) OR
        EXISTS ( -- O usuário já comprou este conteúdo específico
            SELECT 1 FROM user_purchased_content
            WHERE user_id = auth.uid()
            AND content_id = content_posts.id
        )
    )
);