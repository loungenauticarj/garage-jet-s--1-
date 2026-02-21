-- SQL PARA ADICIONAR COLUNAS DE HISTÓRICO NAS RESERVAS
-- Execute este script no SQL Editor do Supabase (https://app.supabase.com)
-- Projeto > SQL Editor > New Query > Cole este código > Run

-- Adicionar colunas de timestamp para rastrear histórico de reservas
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS in_water_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS navigating_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;

-- Comentários explicativos
COMMENT ON COLUMN reservations.in_water_at IS 'Timestamp de quando o jet foi para a água';
COMMENT ON COLUMN reservations.navigating_at IS 'Timestamp de quando começou a navegar';
COMMENT ON COLUMN reservations.returned_at IS 'Timestamp de quando retornou';
COMMENT ON COLUMN reservations.checked_in_at IS 'Timestamp de quando fez o check-in com fotos';

-- Verificar se as colunas foram criadas
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reservations' 
  AND column_name IN ('in_water_at', 'navigating_at', 'returned_at', 'checked_in_at')
ORDER BY column_name;

-- Tudo certo! As colunas de histórico foram adicionadas.
