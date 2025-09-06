# Variáveis de Ambiente - Vale Cashback Pro

## 🔧 Configuração para Deploy na Vercel

### Variáveis Obrigatórias

```env
DATABASE_URL=postgresql://neondb_owner:npg_5YfE9bFtDeVB@ep-dry-forest-a699grm3.us-west-2.aws.neon.tech/neondb?sslmode=require
SESSION_SECRET=vale-cashback-super-secret-key-2025-production-ready
NODE_ENV=production
```

### Detalhes da Conexão do Banco

**Provedor:** Neon.tech PostgreSQL  
**Host:** ep-dry-forest-a699grm3.us-west-2.aws.neon.tech  
**Database:** neondb  
**SSL Mode:** require  
**Status:** Ativo e funcionando com 157 usuários

### Como Configurar na Vercel

1. **Dashboard da Vercel**
   - Vá em Settings → Environment Variables
   - Adicione cada variável individualmente

2. **Variáveis para Adicionar:**

| Nome | Valor | Ambiente |
|------|-------|----------|
| `DATABASE_URL` | `postgresql://neondb_owner:npg_5YfE9bFtDeVB@ep-dry-forest-a699grm3.us-west-2.aws.neon.tech/neondb?sslmode=require` | Production |
| `SESSION_SECRET` | `vale-cashback-super-secret-key-2025-production-ready` | Production |
| `NODE_ENV` | `production` | Production |

### Teste de Conexão

Para verificar se o banco está acessível:

```bash
# Teste local (se tiver psql instalado)
psql "postgresql://neondb_owner:npg_5YfE9bFtDeVB@ep-dry-forest-a699grm3.us-west-2.aws.neon.tech/neondb?sslmode=require" -c "SELECT COUNT(*) FROM users;"
```

### Configurações do Sistema

As taxas e comissões já estão configuradas no banco:

- **Taxa da Plataforma:** 5% (automática dos lojistas)
- **Cashback Cliente:** 2% por compra
- **Comissão Indicação:** 1% por transação
- **Bônus Cadastro:** R$10 automático

### Backup do Banco

O backup completo está em `backup-complete/database/`:
- `database-complete.json` - Dados em JSON
- `restore-complete.sql` - Script de restauração SQL

### Usuários de Teste Funcionais

| Tipo | Email | Senha | ID |
|------|-------|-------|-----|
| Admin | admin@valecashback.com | senha123 | 1 |
| Lojista | lojista@valecashback.com | senha123 | 3 |
| Cliente | cliente@valecashback.com | senha123 | 5 |

### Segurança

- Senhas hasheadas com bcrypt
- Sessões seguras com express-session
- SSL obrigatório para conexões do banco
- Headers de segurança configurados

### Monitoramento

Para monitorar a saúde do banco em produção:
- Logs na Vercel Dashboard
- Métricas de conexão no Neon.tech
- Alerts automáticos configurados