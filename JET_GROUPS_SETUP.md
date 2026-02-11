# Implementação de Jet Groups - Guia de Setup

## O que foi adicionado

Foi criado um sistema de **Jet Groups** para gerenciar cotistas que compartilham o mesmo jet-ski. Cada grupo tem um limite máximo de cotistas.

## Arquivos modificados/criados

1. **supabase_migrations.sql** - Script SQL para criar as tabelas
2. **types.ts** - Adicionado interface `JetGroup` e campo `jetGroupId` ao User
3. **services/jetGroups.ts** - Novo serviço para gerenciar grupos de jets

## Como configurar no Supabase

### 1. Execute o SQL nas Migrations do Supabase:

1. Abra seu painel do Supabase (https://app.supabase.com)
2. Vá para `SQL Editor` > `New Query`
3. Cole o conteúdo de `supabase_migrations.sql`
4. Clique em `Run`

Isso criará:
- Tabela `jet_groups` com os jets disponíveis
- Coluna `jet_group_id` na tabela `users`
- Índices para performance

### 2. Estrutura da Tabela `jet_groups`

```
id              | UUID (PK)
jet_name        | VARCHAR (UNIQUE) - Nome único do jet
manufacturer    | VARCHAR
model           | VARCHAR
year            | VARCHAR
max_cotistas    | INT (limite de compartilhadores)
created_at      | TIMESTAMP
updated_at      | TIMESTAMP
```

### 3. Dados Pré-inseridos

Os seguintes jets foram cadastrados automaticamente:

- Gti170 2022 - Max 10 cotistas
- Gti170 2023 - Max 6 cotistas
- Gti130 2014 - Max 10 cotistas
- Gti130 2024 Brc - Max 6 cotistas
- Gti130 2024 Ramos - Max 6 cotistas
- Gtx170 2023 - Max 6 cotistas
- Rxt300 2020 - Max 6 cotistas
- Wake170 2024 - Max 10 cotistas

## Próximos Passos

Após executar a migração SQL, o sistema pode ser atualizado para:

1. **Marina Dashboard** - Interface para gerenciar jet groups
2. **Validação de limite** - Impedir registrar mais cotistas que o máximo
3. **Relatórios** - Ver quantos cotistas cada jet tem

## RLS (Row Level Security)

Se precisar adicionar segurança, adicione políticas RLS:

```sql
CREATE POLICY "Users can view jet_groups" ON jet_groups
  FOR SELECT USING (true);

CREATE POLICY "Users cannot modify jet_groups" ON jet_groups
  FOR UPDATE, DELETE USING (false);
```
