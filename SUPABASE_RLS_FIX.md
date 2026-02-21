# Corrigir Problema do Botão Delete - RLS Policies

## Problema Identificado

O botão de delete do cliente na Marina não está funcionando porque o **Supabase está bloqueando as operações de DELETE** devido às **RLS (Row Level Security) Policies**.

### Por que isso acontece?

O app usa:
- **Autenticação local** (localStorage) - NÃO é autenticação real do Supabase
- **Chave ANON** do Supabase - para acessar anonimamente
- Isto significa: O Supabase não sabe quem está autenticado

As RLS policies no Supabase exigem que você especifique explicitamente quem pode fazer o quê. Como o app:
1. Não usa Supabase Auth (autenticação real)
2. Usa apenas localStorage para controlar login
3. O Supabase vê todas as requisições como **ANÔNIMAS**

...então as políticas RLS provavelmente estão:
- Bloqueando DELETE (sem permissão)
- Bloqueando UPDATE (sem permissão)
- Ou permitindo apenas SELECT

## Solução Rápida (Desenvolvimento)

### Opção 1: Desativar RLS Policies (Desenvolvimento)

Se este é um app de desenvolvimento/teste, desative as RLS policies:

1. Vá para: **Supabase Dashboard** → Seu Projeto
2. Navigate: **Authentication** → **Policies**
3. Para cada tabela (`users`, `reservations`, etc):
   - Clique na tabela
   - Em cada policy de DELETE/UPDATE, clique os três pontinhos
   - Selecione **Disable** ou **Delete** a policy
   - OU clique em **RLS is enforced** para desativar RLS completamente

### Opção 2: Permitir Operações Anônimas (Recomendado para Desenvolvimento)

Se quer manter segurança mas permitir anônimo:

```sql
-- Para a tabela users
DROP POLICY IF EXISTS "delete users" ON users;
CREATE POLICY "delete users" ON users
  FOR DELETE
  USING (true);  -- Permite delete para qualquer um

DROP POLICY IF EXISTS "update users" ON users;
CREATE POLICY "update users" ON users
  FOR UPDATE
  USING (true)  -- Permite update para qualquer um
  WITH CHECK (true);

-- Para a tabela reservations
DROP POLICY IF EXISTS "delete reservations" ON reservations;
CREATE POLICY "delete reservations" ON reservations
  FOR DELETE
  USING (true);
```

Execute isso no **Supabase SQL Editor**.

## Solução Permanente (Produção)

Implemente **Supabase Auth Real**:

1. Integre `supabase.auth.signInWithPassword()` 
2. Use a sessão real do usuário
3. Configure RLS policies que checam `auth.uid()` ou `auth.user_metadata ->> 'role'`

Isso está fora do escopo desta correção rápida, mas seria necessário para produção.

## Como Verificar Depois da Correção

1. Faça login na Marina
2. Vá para CLIENTS
3. Clique no botão DELETE (ícone da lixeira)
4. Confirme na janela de confirmação
5. O cliente deve ser removido da lista
6. Abra o DevTools (F12) → Console para ver os logs de sucesso

## Resumo

A raiz do problema é:
- ❌ App usa localhost para auth
- ❌ Supabase não conhece o usuário
- ❌ RLS policies bloqueiam operações
- ✅ Solução: Desabilitar RLS ou permitir anônimo para dev

Escolha a **Opção 1** ou **Opção 2** acima no Supabase Dashboard.
