# 🔧 SOLUÇÃO PARA ERRO DE DELEÇÃO DE USUÁRIOS

## ❌ Erro Atual
```
❌ ERRO RLS: Usuário não foi removido!
📋 Execute o arquivo FIX_RLS_POLICIES.sql no Supabase SQL Editor.
```

## 🔍 Causa do Problema
O Supabase está **bloqueando a operação DELETE** devido às **políticas de Row Level Security (RLS)** que não permitem deleção de registros com a chave pública (ANON_KEY).

---

## ✅ SOLUÇÃO RÁPIDA (5 MINUTOS)

### 🎯 Passo 1: Abra o Supabase
```
🌐 https://app.supabase.com
```
1. Faça login na sua conta
2. Selecione o **projeto do Garage Jet's**

---

### 🎯 Passo 2: Abra o SQL Editor
No menu lateral esquerdo:
```
📊 SQL Editor (ícone de código) → New Query
```

---

### 🎯 Passo 3: Copie o Script
**COPIE TODO O CONTEÚDO** do arquivo:
```
📄 FIX_RLS_POLICIES.sql
```

Você pode abrir o arquivo no VS Code ou Bloco de Notas e copiar tudo (Ctrl+A, Ctrl+C).

---

### 🎯 Passo 4: Cole e Execute
1. **Cole** o código no SQL Editor (Ctrl+V)
2. Clique em **RUN** (botão verde) ou pressione **Ctrl+Enter**
3. ⏳ Aguarde alguns segundos...

---

### 🎯 Passo 5: Verifique o Sucesso ✅
Ao final, você verá uma **tabela com as políticas criadas**:

| Tabela        | Política                           | Comando |
|--------------|-----------------------------------|---------|
| users        | Allow public to delete users      | DELETE  |
| users        | Allow public to select users      | SELECT  |
| users        | Allow public to insert users      | INSERT  |
| users        | Allow public to update users      | UPDATE  |
| reservations | Allow public to delete reservations | DELETE |
| reservations | Allow public to select reservations | SELECT |
| reservations | Allow public to insert reservations | INSERT |
| reservations | Allow public to update reservations | UPDATE |

Se você vê essas 8 políticas → **SUCESSO!** ✅

---

### 🎯 Passo 6: Teste a Aplicação
1. ✅ Volte para a aplicação **Garage Jet's**
2. ✅ Faça login como **MARINA**
3. ✅ Vá para a aba **CLIENTES**
4. ✅ Tente deletar um cliente
5. ✅ **PRONTO! Agora funciona sem erros!**

---

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
