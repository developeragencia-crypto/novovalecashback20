# 🚀 Deploy Vale Cashback no VPS Node.js

## 📋 Resumo Executivo

Este guia permite hospedar o sistema Vale Cashback completo no seu VPS com todos os 151 usuários reais do backup ALEX26. O processo leva aproximadamente 30 minutos.

## 🎯 O que você terá ao final:

- Sistema Vale Cashback rodando em produção
- 151 usuários reais (89 clientes + 55 lojistas + 7 admins)
- Banco PostgreSQL configurado
- SSL/HTTPS configurado
- Monitoramento com PM2
- Backup automático

## 🚀 Deploy Rápido (3 Passos)

### 1️⃣ Configuração Inicial do VPS

```bash
# Execute no seu VPS
wget https://raw.githubusercontent.com/seuusuario/valecashback/main/setup-vps.sh
chmod +x setup-vps.sh
./setup-vps.sh
```

### 2️⃣ Upload e Deploy da Aplicação

```bash
# Fazer upload dos arquivos para /var/www/valecashback
# Depois executar:
cd /var/www/valecashback
cp .env.production .env
# Editar o arquivo .env com seu domínio
nano .env
./deploy.sh
```

### 3️⃣ Configuração Final

```bash
# Importar dados reais ALEX26
node import-production-data.js

# Configurar SSL (substitua seudominio.com)
sudo certbot --nginx -d seudominio.com -d www.seudominio.com

# Validar deployment
./validate-deployment.sh
```

## 📁 Estrutura dos Arquivos

```
valecashback/
├── setup-vps.sh              # Configura o VPS
├── deploy.sh                 # Deploy automático
├── ecosystem.config.js       # Configuração PM2
├── .env.production           # Template de produção
├── import-production-data.js # Dados reais ALEX26
├── nginx-valecashback.conf   # Configuração Nginx
├── validate-deployment.sh    # Validação do deploy
└── DEPLOY_GUIDE.md          # Guia detalhado
```

## ⚙️ Configurações Importantes

### Banco de Dados
- **Host**: localhost
- **Porta**: 5432
- **Banco**: valecashback
- **Usuário**: valecashback_user
- **Senha**: valecashback2024!

### Aplicação
- **Porta**: 3000
- **Processo**: PM2
- **Logs**: /var/log/valecashback/

### Usuários Pré-configurados

**Administradores:**
- alex@valecashback.com (Alex2024!)
- ana@valecashback.com (Ana2024!)

**Lojistas de Teste:**
- joao.silva@email.com (Joao2024!)
- maria.santos@email.com (Maria2024!)

## 🔧 Comandos Úteis

```bash
# Status da aplicação
pm2 status

# Ver logs
pm2 logs valecashback

# Restart
pm2 restart valecashback

# Monitor em tempo real
pm2 monit

# Backup do banco
pg_dump -h localhost -U valecashback_user valecashback > backup.sql

# Restore do banco
psql -h localhost -U valecashback_user valecashback < backup.sql
```

## 🌐 Acesso ao Sistema

Após o deploy, acesse:
- **Aplicação**: https://seudominio.com
- **Admin**: Faça login com alex@valecashback.com
- **Lojista**: Faça login com joao.silva@email.com
- **Cliente**: Registre-se normalmente

## 🔒 Segurança Configurada

- Firewall UFW ativo
- SSL/TLS com Let's Encrypt
- Fail2ban para proteção SSH
- Headers de segurança no Nginx
- Senhas hash com bcrypt

## 📊 Monitoramento

- **PM2**: Status da aplicação
- **Nginx**: Logs de acesso/erro
- **PostgreSQL**: Logs de banco
- **Sistema**: CPU/Memória/Disco

## 🆘 Solução de Problemas

### Aplicação não inicia
```bash
pm2 logs valecashback
# Verificar se porta 3000 está livre
sudo netstat -tlnp | grep :3000
```

### Erro de banco
```bash
# Testar conexão
psql -h localhost -U valecashback_user -d valecashback
# Verificar se PostgreSQL está rodando
sudo systemctl status postgresql
```

### SSL não funciona
```bash
# Verificar certificado
sudo certbot certificates
# Testar configuração Nginx
sudo nginx -t
```

## 📞 Suporte

Em caso de problemas:

1. Execute: `./validate-deployment.sh`
2. Verifique os logs: `pm2 logs valecashback`
3. Teste conexão: `curl http://localhost:3000`

## 🎉 Resultado Final

Após seguir este guia você terá:

✅ Sistema Vale Cashback rodando em produção
✅ 151 usuários reais importados
✅ HTTPS configurado automaticamente
✅ Monitoramento ativo
✅ Backups configurados
✅ Sistema pronto para uso

**URL do seu sistema**: https://seudominio.com

O sistema estará pronto para receber usuários reais e processar transações de cashback!