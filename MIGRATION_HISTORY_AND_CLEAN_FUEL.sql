-- SQL ÚNICO: ADICIONAR HISTÓRICO + LIMPAR COLUNAS ANTIGAS DE ABASTECIMENTO/PIX
-- Execute este script no SQL Editor do Supabase (https://app.supabase.com)
-- Projeto > SQL Editor > New Query > Cole este código > Run

-- 1) Adicionar colunas de histórico
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS in_water_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS navigating_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS returned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE;

-- 2) Adicionar coluna de fotos do cliente
ALTER TABLE reservations
ADD COLUMN IF NOT EXISTS client_photos TEXT[] DEFAULT '{}';

-- 3) Remover colunas antigas de abastecimento/PIX
ALTER TABLE reservations
DROP COLUMN IF EXISTS fuel_receipt_photo,
DROP COLUMN IF EXISTS fuel_pix_name,
DROP COLUMN IF EXISTS fuel_pix_number;

-- 4) Comentários das colunas ativas
COMMENT ON COLUMN reservations.in_water_at IS 'Timestamp de quando o jet foi para a água';
COMMENT ON COLUMN reservations.navigating_at IS 'Timestamp de quando começou a navegar';
COMMENT ON COLUMN reservations.returned_at IS 'Timestamp de quando retornou';
COMMENT ON COLUMN reservations.checked_in_at IS 'Timestamp de quando fez o check-in com fotos';
COMMENT ON COLUMN reservations.client_photos IS 'Fotos tiradas pelo cliente durante o passeio';

-- 5) Verificação final (deve listar apenas colunas ativas)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'reservations'
  AND column_name IN (
    'in_water_at',
    'navigating_at',
    'returned_at',
    'checked_in_at',
    'client_photos',
    'fuel_receipt_photo',
    'fuel_pix_name',
    'fuel_pix_number'
  )
ORDER BY column_name;

-- Esperado no resultado do SELECT:
-- ✅ in_water_at, navigating_at, returned_at, checked_in_at, client_photos
-- ❌ fuel_receipt_photo, fuel_pix_name, fuel_pix_number (não devem aparecer)
