-- SQL PARA REMOVER COLUNAS DE ABASTECIMENTO/PIX DAS RESERVAS
-- OBS: Prefira executar MIGRATION_HISTORY_AND_CLEAN_FUEL.sql (script único).
-- Este arquivo permanece como alternativa para execução separada.
-- Execute este script no SQL Editor do Supabase (https://app.supabase.com)
-- Projeto > SQL Editor > New Query > Cole este código > Run

ALTER TABLE reservations
DROP COLUMN IF EXISTS fuel_receipt_photo,
DROP COLUMN IF EXISTS fuel_pix_name,
DROP COLUMN IF EXISTS fuel_pix_number;

-- Verificar se as colunas foram removidas
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'reservations'
  AND column_name IN (
    'fuel_receipt_photo',
    'fuel_pix_name',
    'fuel_pix_number'
  )
ORDER BY column_name;

-- Se o SELECT acima retornar 0 linhas, a remoção foi concluída.
