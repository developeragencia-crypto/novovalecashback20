# GUIA DEPLOY - VALE CASHBACK HOSTINGER

## IMPORTANTE: LIMITAÇÕES DA HOSPEDAGEM COMPARTILHADA

❌ **HOSPEDAGEM COMPARTILHADA NÃO SUPORTA:**
- Node.js/Express (backend)
- PostgreSQL
- WebSockets
- PM2
- Aplicações full-stack

✅ **HOSPEDAGEM COMPARTILHADA SUPORTA APENAS:**
- PHP + MySQL
- HTML/CSS/JavaScript estático
- WordPress

## OPÇÕES PARA HOSTINGER

### OPÇÃO 1: VPS HOSTINGER (RECOMENDADO)
Use o guia `GUIA_DEPLOY_VPS.md` com estas adaptações:

1. **Conectar VPS Hostinger:**
```bash
ssh root@SEU_IP_VPS_HOSTINGER
```

2. **Usar painel hPanel da Hostinger** para:
   - Configurar DNS
   - Gerenciar certificados SSL
   - Monitorar recursos

### OPÇÃO 2: CLOUD HOSTING HOSTINGER
1. Crie instância Cloud Hosting
2. Instale Node.js via painel
3. Configure PostgreSQL
4. Siga guia VPS adaptado

### OPÇÃO 3: CONVERTER PARA PHP (COMPLEXO)
**NÃO RECOMENDADO** - Requer reescrever toda aplicação

## RECOMENDAÇÃO FINAL

Para o **Vale Cashback** funcionar completamente, você precisa de:

### HOSTINGER VPS (Melhor opção)
- **Preço**: ~R$ 30-60/mês
- **Recursos**: 1-2GB RAM, SSD
- **Suporte**: Node.js, PostgreSQL, SSL
- **Controle total**: root access

### ALTERNATIVAS BARATAS
1. **Contabo VPS**: €4.99/mês
2. **Vultr**: $5/mês  
3. **DigitalOcean**: $5/mês
4. **Hetzner**: €3.29/mês

## PASSO A PASSO HOSTINGER VPS

### 1. Contratar VPS Hostinger
- Acesse hpanel.hostinger.com
- Vá em "VPS" → "Criar VPS"
- Escolha plano mínimo (1GB RAM)
- Sistema: Ubuntu 22.04

### 2. Configurar VPS
- Anote IP, usuário e senha
- Configure DNS no domínio
- Ative firewall no painel

### 3. Seguir guia VPS
Use o arquivo `GUIA_DEPLOY_VPS.md` substituindo:
```bash
# IP da Hostinger
ssh root@SEU_IP_HOSTINGER

# Domínio configurado no hPanel
DOMAIN=seudominio.com.br
```

### 4. Configurações específicas Hostinger

**DNS no hPanel:**
```
Tipo: A
Nome: @
Valor: SEU_IP_VPS

Tipo: A  
Nome: www
Valor: SEU_IP_VPS
```

**SSL via hPanel:**
- Vá em "SSL" → "Gerenciar"
- Ative "SSL gratuito" 
- Ou use certbot no VPS

## ARQUIVO DE CONFIGURAÇÃO HOSTINGER

Crie `.env` específico para Hostinger:

```env
NODE_ENV=production
PORT=3000

# Database Hostinger VPS
DATABASE_URL=postgresql://valecashback:SENHA@localhost:5432/valecashback
PGHOST=localhost
PGPORT=5432
PGUSER=valecashback
PGPASSWORD=SUA_SENHA
PGDATABASE=valecashback

# Domínio Hostinger
DOMAIN=seudominio.com.br
HOSTINGER_ENV=true

# Session
SESSION_SECRET=chave_secreta_64_caracteres

# Logs
LOG_LEVEL=info
```

## MONITORAMENTO NO hPANEL

1. **Recursos VPS:**
   - CPU/RAM em tempo real
   - Espaço em disco
   - Tráfego de rede

2. **Logs de acesso:**
   - Acessível via hPanel
   - Downloadable

3. **Backups automáticos:**
   - Configurar no hPanel
   - Snapshots semanais

## COMANDOS ESPECÍFICOS HOSTINGER

```bash
# Conectar VPS Hostinger
ssh root@SEU_IP_HOSTINGER

# Status dos serviços
systemctl status nginx
systemctl status postgresql
pm2 status

# Logs específicos
tail -f /var/log/nginx/access.log
pm2 logs valecashback

# Reiniciar serviços
systemctl restart nginx
pm2 restart valecashback
```

## CUSTOS ESTIMADOS

### VPS Hostinger
- **VPS 1**: R$ 31/mês (1GB RAM)
- **VPS 2**: R$ 51/mês (2GB RAM) 
- **VPS 4**: R$ 91/mês (4GB RAM)

### Domínio
- **.com.br**: R$ 40/ano
- **.com**: R$ 60/ano

### Total mensal: R$ 35-95 dependendo do plano

## SUPORTE HOSTINGER

- **Chat 24/7**: Disponível no hPanel
- **Tutoriais**: Base de conhecimento
- **Migração gratuita**: Para novos clientes

## CHECKLIST FINAL

✅ VPS Hostinger contratado  
✅ Domínio configurado  
✅ DNS apontando para VPS  
✅ Node.js instalado  
✅ PostgreSQL configurado  
✅ Aplicação deployada  
✅ SSL configurado  
✅ PM2 rodando  
✅ Nginx configurado  
✅ Firewall ativo  

**Resultado**: https://seudominio.com.br funcionando!