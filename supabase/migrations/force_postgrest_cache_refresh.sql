/*
  # Forçar atualização do cache do PostgREST
  1. Adiciona um comentário à tabela 'reported_content' para acionar uma atualização do cache de esquema do PostgREST.
*/
COMMENT ON TABLE public.reported_content IS 'Tabela para armazenar conteúdo reportado. Comentário adicionado para forçar a atualização do cache do PostgREST.';