/*
  # Add updated_at column and trigger to kyc_documents table
  1. Alter Table: kyc_documents (add updated_at timestamptz NOT NULL DEFAULT now())
  2. Functions: create function set_updated_at()
  3. Triggers: create trigger set_updated_at_kyc_documents on kyc_documents
*/

-- Adiciona a coluna updated_at se ela não existir
ALTER TABLE kyc_documents
ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Cria uma função para atualizar automaticamente a coluna updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Cria um trigger para chamar a função set_updated_at antes de cada atualização na tabela kyc_documents
CREATE OR REPLACE TRIGGER set_updated_at_kyc_documents
BEFORE UPDATE ON kyc_documents
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Opcional: Atualiza os valores existentes para updated_at se a coluna foi adicionada agora e tinha valores nulos
-- Esta parte é segura pois só será executada se a coluna foi recém-adicionada e não tinha um valor padrão
UPDATE kyc_documents SET updated_at = now() WHERE updated_at IS NULL;