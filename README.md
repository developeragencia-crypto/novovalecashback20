# Vale Cashback Pro

Sistema completo de cashback e indicações com painel administrativo, vendas via QR Code e gestão de usuários multi-nível.

## 🚀 Deploy Rápido na Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/seu-usuario/vale-cashback-pro)

## 📋 Funcionalidades

### Sistema Completo
- ✅ **Autenticação Multi-usuário**: Admin, Lojista, Cliente
- ✅ **Cashback Automático**: 2% para clientes, 1% para indicações
- ✅ **QR Code Pagamentos**: Geração automática para lojistas
- ✅ **Sistema de Indicações**: Compartilhamento via WhatsApp, email
- ✅ **Painel Administrativo**: Relatórios, configurações, usuários
- ✅ **Gestão Financeira**: Saques, transferências, comissões
- ✅ **Notificações**: Sistema em tempo real
- ✅ **Design Responsivo**: Mobile-first, PWA ready

### Taxas e Comissões
- **Taxa da Plataforma**: 5% dos lojistas (automático)
- **Cashback Cliente**: 2% por compra
- **Comissão Indicação**: 1% por transação referenciada
- **Bônus Cadastro**: R$10 automático para novos usuários

## 🔐 Usuários de Teste

| Tipo | E-mail | Senha | Acesso |
|------|--------|-------|--------|
| **Admin** | admin@valecashback.com | senha123 | Painel completo |
| **Lojista** | lojista@valecashback.com | senha123 | Vendas e QR Code |
| **Cliente** | cliente@valecashback.com | senha123 | Cashback e indicações |

## 🛠️ Tecnologias

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Backend**: Express.js + Node.js + TypeScript
- **Banco de Dados**: PostgreSQL + Drizzle ORM
- **UI Components**: Radix UI + shadcn/ui
- **Animações**: Framer Motion
- **Deploy**: Vercel (Serverless)

## 📦 Instalação Local

### Pré-requisitos
- Node.js 18+
- PostgreSQL
- npm ou yarn

### 1. Clone o Repositório
```bash
git clone https://github.com/seu-usuario/vale-cashback-pro.git
cd vale-cashback-pro
```

### 2. Instale as Dependências
```bash
npm install
cd client && npm install && cd ..
```

### 3. Configure o Banco de Dados
```bash
# Crie um banco PostgreSQL
createdb vale_cashback

# Configure a variável de ambiente
cp .env.example .env
```

### 4. Configurar .env
```env
DATABASE_URL=postgresql://username:password@localhost:5432/vale_cashback
SESSION_SECRET=sua-chave-secreta-super-segura-com-pelo-menos-32-caracteres
NODE_ENV=development
```

### 5. Executar Migrações
```bash
npm run db:push
```

### 6. Iniciar o Desenvolvimento
```bash
npm run dev
```

Acesse: `http://localhost:3000`

## 🚀 Deploy na Vercel

### 1. Preparar Banco de Dados

**Opção A: Neon.tech (Recomendado)**
```bash
# 1. Crie conta em neon.tech
# 2. Crie novo projeto PostgreSQL
# 3. Copie a CONNECTION STRING
```

**Opção B: Vercel Postgres**
```bash
# 1. Na dashboard Vercel, vá em Storage
# 2. Crie instância PostgreSQL
# 3. Anote as credenciais
```

### 2. Restaurar Dados
```bash
# Execute o script SQL no seu banco
psql "sua-connection-string" -f backup-complete/database/restore-complete.sql
```

### 3. Deploy via GitHub

1. **Fork este repositório**
2. **Conecte na Vercel**:
   - Acesse [vercel.com](https://vercel.com)
   - Conecte seu repositório GitHub
   - Configure as variáveis de ambiente

### 4. Variáveis de Ambiente (Vercel)
```env
DATABASE_URL=postgresql://username:password@hostname:port/database?sslmode=require
SESSION_SECRET=sua-chave-secreta-super-segura-com-pelo-menos-32-caracteres
NODE_ENV=production
```

### 5. Deploy Automático
O deploy acontece automaticamente a cada push para `main`.

## 📊 Estrutura do Projeto

```
vale-cashback-pro/
├── client/                 # Frontend React
│   ├── src/
│   │   ├── components/     # Componentes UI
│   │   ├── pages/         # Páginas da aplicação
│   │   ├── hooks/         # React hooks customizados
│   │   └── lib/           # Utilitários
├── server/                # Backend Express
│   ├── routes/            # Rotas da API
│   ├── auth/              # Sistema de autenticação
│   └── utils/             # Utilitários do servidor
├── shared/                # Código compartilhado
│   └── schema.ts          # Schemas do banco de dados
├── backup-complete/       # Backup completo do sistema
│   ├── database/          # Backup do banco PostgreSQL
│   └── source/            # Código fonte
├── vercel.json           # Configuração Vercel
└── VERCEL_DEPLOY_GUIDE.md # Guia detalhado de deploy
```

## 🔄 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev              # Inicia dev server (frontend + backend)
npm run client:dev       # Apenas frontend
npm run server:dev       # Apenas backend

# Build
npm run build           # Build completo para produção
npm run client:build    # Build do frontend
npm run server:build    # Build do backend

# Banco de Dados
npm run db:generate     # Gerar migrações
npm run db:push         # Aplicar mudanças no banco
npm run db:studio       # Interface visual do banco

# Backup
npm run backup:create   # Criar backup completo
npm run backup:restore  # Restaurar backup
```

## 🐛 Solução de Problemas

### Build Falha na Vercel
```bash
# Limpar cache local
rm -rf node_modules client/node_modules
npm install
cd client && npm install
```

### Erro de Conexão com Banco
- Verificar se `DATABASE_URL` está correto
- Confirmar se o banco PostgreSQL está acessível
- Testar conexão local primeiro

### 502 Bad Gateway
- Verificar logs na Vercel Dashboard
- Confirmar variáveis de ambiente
- Verificar se todas as dependências estão instaladas

## 📈 Monitoramento

- **Logs**: Vercel Dashboard → Functions → View Logs
- **Analytics**: Vercel Analytics (automático)
- **Performance**: Web Vitals integrado

## 🔒 Segurança

- Senhas hasheadas com bcrypt
- Sessions seguras com express-session
- Validação de dados com Zod
- Sanitização de inputs
- Headers de segurança configurados

## 📞 Suporte

- **Issues**: Use o GitHub Issues para reportar bugs
- **Documentação**: Consulte `VERCEL_DEPLOY_GUIDE.md`
- **Logs**: Acesse via Vercel Dashboard

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

---

**Desenvolvido com ❤️ para o ecossistema de cashback brasileiro**