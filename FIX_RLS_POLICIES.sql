-- SQL PARA CORRIGIR O PROBLEMA DE DELEÇÃO DE USUÁRIOS
-- Execute este script no SQL Editor do Supabase (https://app.supabase.com)
-- Projeto > SQL Editor > New Query > Cole este código > Run

-- ===========================================================
-- PROBLEMA: 
-- A aplicação não consegue deletar usuários devido a 
-- políticas de Row Level Security (RLS) que bloqueiam DELETE
-- ===========================================================

-- SOLUÇÃO 1: Habilitar RLS com políticas permissivas
-- (Recomendado para ambiente de desenvolvimento/teste)
-- ===========================================================

-- Primeiro, verifique se RLS está habilitado nas tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Allow public to delete users" ON users;
DROP POLICY IF EXISTS "Allow public to delete reservations" ON reservations;

-- Criar políticas que permitem DELETE para todos
-- IMPORTANTE: Em produção, você deve restringir isso apenas para 
-- usuários com role = 'MARINA' ou 'OPERATIONAL'

CREATE POLICY "Allow public to delete users"
ON users
FOR DELETE
USING (true);  -- Permite que qualquer um delete (OK para MVP/desenvolvimento)

CREATE POLICY "Allow public to delete reservations"
ON reservations
FOR DELETE
USING (true);  -- Permite que qualquer um delete (OK para MVP/desenvolvimento)

-- Criar políticas para SELECT (leitura)
DROP POLICY IF EXISTS "Allow public to select users" ON users;
DROP POLICY IF EXISTS "Allow public to select reservations" ON reservations;

CREATE POLICY "Allow public to select users"
ON users
FOR SELECT
USING (true);

CREATE POLICY "Allow public to select reservations"
ON reservations
FOR SELECT
USING (true);

-- Criar políticas para INSERT (criação)
DROP POLICY IF EXISTS "Allow public to insert users" ON users;
DROP POLICY IF EXISTS "Allow public to insert reservations" ON reservations;

CREATE POLICY "Allow public to insert users"
ON users
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public to insert reservations"
ON reservations
FOR INSERT
WITH CHECK (true);

-- Criar políticas para UPDATE (atualização)
DROP POLICY IF EXISTS "Allow public to update users" ON users;
DROP POLICY IF EXISTS "Allow public to update reservations" ON reservations;

CREATE POLICY "Allow public to update users"
ON users
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow public to update reservations"
ON reservations
FOR UPDATE
USING (true)
WITH CHECK (true);

-- ===========================================================
-- SOLUÇÃO 2 (MAIS SEGURA): Políticas baseadas em role
-- Use esta se quiser restringir DELETE apenas para Marina
-- ===========================================================

/*
-- Remover políticas públicas
DROP POLICY IF EXISTS "Allow public to delete users" ON users;
DROP POLICY IF EXISTS "Allow public to delete reservations" ON reservations;

-- Políticas de DELETE apenas para MARINA ou OPERATIONAL
CREATE POLICY "Allow marina to delete users"
ON users
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM users AS u
    WHERE u.id = auth.uid() 
    AND u.role IN ('MARINA', 'OPERATIONAL')
  )
);

CREATE POLICY "Allow marina to delete reservations"
ON reservations
FOR DELETE
USING (true);  -- Reservations podem ser deletadas por qualquer um autenticado
*/

-- ===========================================================
-- VERIFICAÇÃO
-- ===========================================================

-- Verificar se as políticas foram criadas corretamente
SELECT 
    schemaname,
    tablename, 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename IN ('users', 'reservations')
ORDER BY tablename, policyname;

-- Se você ver as políticas listadas, está tudo certo!
-- A aplicação agora deve conseguir deletar usuários.
