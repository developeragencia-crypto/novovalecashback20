# Guia Completo de Deploy - Vale Cashback na Vercel

## 🚀 Pré-requisitos

1. **Conta na Vercel** - [vercel.com](https://vercel.com)
2. **Banco PostgreSQL** - Neon.tech (recomendado) ou outro provedor
3. **Repositório Git** - GitHub, GitLab ou Bitbucket

## 📦 Preparação do Projeto

### 1. Estrutura do Projeto
```
vale-cashback-pro/
├── client/          # Frontend React
├── server/          # Backend Express
├── shared/          # Tipos e schemas compartilhados
├── scripts/         # Scripts de backup e utilitários
├── vercel.json      # Configuração da Vercel
└── package.json     # Dependências principais
```

### 2. Configuração do Banco de Dados

**Opção 1: Neon.tech (Recomendado)**
1. Acesse [neon.tech](https://neon.tech)
2. Crie uma nova conta e projeto
3. Copie a CONNECTION STRING do formato:
   ```
   postgresql://username:password@hostname:port/database?sslmode=require
   ```

**Opção 2: Vercel Postgres**
1. Na dashboard da Vercel, vá em Storage
2. Crie uma nova instância PostgreSQL
3. Anote as credenciais fornecidas

### 3. Restaurar Backup do Banco

Execute o script SQL de restauração no seu banco PostgreSQL:
```bash
# Conecte ao seu banco e execute:
psql "sua-connection-string" -f database/restore-database.sql
```

## 🔧 Deploy na Vercel

### 1. Variáveis de Ambiente

Configure estas variáveis na Vercel Dashboard:

```env
# Banco de Dados
DATABASE_URL=postgresql://username:password@hostname:port/database?sslmode=require

# Segurança
SESSION_SECRET=sua-chave-secreta-super-segura-aqui-com-pelo-menos-32-caracteres

# Ambiente
NODE_ENV=production

# Opcional: Stripe (se usar pagamentos)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2. Deploy via CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer login
vercel login

# Deploy do projeto
vercel --prod
```

### 3. Deploy via GitHub

1. **Conectar Repositório**
   - Vá para [vercel.com/dashboard](https://vercel.com/dashboard)
   - Clique em "New Project"
   - Conecte seu repositório GitHub

2. **Configurar Build**
   - Framework Preset: `Other`
   - Build Command: `npm run build`
   - Output Directory: `client/dist`
   - Install Command: `npm install`

3. **Configurar Variáveis**
   - Vá em Settings > Environment Variables
   - Adicione todas as variáveis listadas acima

## 📋 Configurações Essenciais

### vercel.json
```json
{
  "version": 2,
  "name": "vale-cashback-pro",
  "builds": [
    {
      "src": "server/index.ts",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/server/index.ts"
    },
    {
      "src": "/(.*)",
      "dest": "/client/dist/$1"
    }
  ],
  "functions": {
    "server/index.ts": {
      "maxDuration": 30
    }
  }
}
```

## 🔐 Usuários Padrão do Sistema

Após o deploy, use estas credenciais para acessar:

| Tipo | E-mail | Senha | Acesso |
|------|--------|-------|---------|
| **Admin** | admin@valecashback.com | senha123 | Painel administrativo completo |
| **Lojista** | lojista@valecashback.com | senha123 | Vendas, QR Code, transações |
| **Cliente** | cliente@valecashback.com | senha123 | Cashback, indicações, perfil |

## 🚨 Pós-Deploy

### 1. Verificações Obrigatórias

- [ ] Site carregando corretamente
- [ ] Login funcionando para todos os tipos de usuário
- [ ] Banco de dados conectado
- [ ] APIs retornando dados corretos
- [ ] Sistema de cashback operacional

### 2. Configurações de Produção

1. **SSL/HTTPS**: Automático na Vercel
2. **Domínio Customizado**: Configurar em Settings > Domains
3. **Monitoramento**: Configurar Analytics na Vercel

### 3. Backup Contínuo

Configure backups regulares executando:
```bash
node scripts/create-backup.js
```

## 🔄 Atualizações

Para atualizar o sistema:

1. **Via Git**:
   ```bash
   git push origin main
   # Deploy automático na Vercel
   ```

2. **Via CLI**:
   ```bash
   vercel --prod
   ```

## 🐛 Solução de Problemas

### Build Falha
```bash
# Limpar cache e reinstalar
rm -rf node_modules client/node_modules
npm install
cd client && npm install
```

### Erro de Conexão com Banco
- Verificar se DATABASE_URL está correto
- Testar conexão local primeiro
- Verificar firewall/whitelist do banco

### 502 Bad Gateway
- Verificar logs na Vercel Dashboard
- Confirmar se todas as variáveis estão configuradas
- Verificar se o servidor está iniciando corretamente

## 📞 Suporte

- **Logs**: Vercel Dashboard > Functions > View Function Logs
- **Monitoramento**: Vercel Analytics
- **Performance**: Web Vitals na Vercel

---

## ✅ Checklist Final

- [ ] Banco PostgreSQL configurado
- [ ] Backup restaurado com sucesso
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy realizado na Vercel
- [ ] Domínio configurado (opcional)
- [ ] Testes de login realizados
- [ ] Sistema de cashback testado
- [ ] Backup de segurança criado

**🎉 Parabéns! Seu sistema Vale Cashback está no ar!**