# 🔧 SOLUÇÃO PARA ERRO DE DELEÇÃO DE USUÁRIOS

## ❌ Erro Atual
```
Erro ao deletar usuário: Usuário não foi removido do banco de dados. Verifique as permissões RLS
```

## 🔍 Causa do Problema
O Supabase está bloqueando a operação DELETE devido às **políticas de Row Level Security (RLS)** que não permitem deleção de registros com a chave pública (ANON_KEY).

## ✅ Solução (Passo a Passo)

### 1️⃣ Acesse o Supabase
1. Vá para: https://app.supabase.com
2. Faça login na sua conta
3. Selecione o projeto do Garage Jet's

### 2️⃣ Abra o SQL Editor
1. No menu lateral esquerdo, clique em **SQL Editor**
2. Clique em **New Query**

### 3️⃣ Execute o Script
1. Abra o arquivo `FIX_RLS_POLICIES.sql` que está nesta pasta
2. Copie TODO o conteúdo do arquivo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou pressione Ctrl+Enter)

### 4️⃣ Verifique o Resultado
Ao final da execução, você verá uma tabela mostrando as políticas criadas:
- `Allow public to delete users`
- `Allow public to delete reservations`
- `Allow public to select users`
- `Allow public to select reservations`
- `Allow public to insert users`
- `Allow public to insert reservations`
- `Allow public to update users`
- `Allow public to update reservations`

### 5️⃣ Teste a Aplicação
1. Volte para a aplicação Garage Jet's
2. Faça login como MARINA
3. Vá para a aba **CLIENTES**
4. Tente deletar um cliente
5. ✅ Agora deve funcionar sem erros!

## 🔒 Segurança

As políticas criadas pelo script permitem que **qualquer um** delete usuários. Isso é aceitável para:
- ✅ Ambiente de desenvolvimento
- ✅ Ambiente de testes
- ✅ MVP/protótipo
- ✅ Sistema interno com usuários confiáveis

Para produção com acesso público, recomenda-se implementar autenticação do Supabase e políticas mais restritivas (comentadas no arquivo SQL).

## 📞 Suporte

Se o erro persistir após executar o script:
1. Verifique se o script executou sem erros no SQL Editor
2. Verifique se as tabelas `users` e `reservations` existem
3. Verifique os logs do console do navegador (F12)
4. Confirme que está usando as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY corretas
