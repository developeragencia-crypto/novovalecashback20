# Guia de Deploy - Vale Cashback no VPS Node.js

## 📋 Pré-requisitos no VPS

### 1. Versões Necessárias
- Node.js 18+ ou 20+
- npm ou yarn
- PostgreSQL 12+
- PM2 (para gerenciamento de processos)
- Nginx (opcional, para proxy reverso)

### 2. Preparação do VPS

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar PostgreSQL
sudo apt-get install -y postgresql postgresql-contrib

# Instalar PM2 globalmente
sudo npm install -g pm2

# Instalar Nginx (opcional)
sudo apt-get install -y nginx
```

## 🗄️ Configuração do Banco de Dados

### 1. Configurar PostgreSQL

```bash
# Entrar no PostgreSQL
sudo -u postgres psql

# Criar banco e usuário
CREATE DATABASE valecashback;
CREATE USER valecashback_user WITH PASSWORD 'sua_senha_forte_aqui';
GRANT ALL PRIVILEGES ON DATABASE valecashback TO valecashback_user;
\q
```

### 2. Configurar Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto:

```env
# Configurações do Banco de Dados
DATABASE_URL=postgresql://valecashback_user:sua_senha_forte_aqui@localhost:5432/valecashback
PGHOST=localhost
PGPORT=5432
PGUSER=valecashback_user
PGPASSWORD=sua_senha_forte_aqui
PGDATABASE=valecashback

# Configurações da Aplicação
NODE_ENV=production
PORT=3000
SESSION_SECRET=sua_chave_secreta_super_forte_aqui_com_32_caracteres_ou_mais

# URLs da Aplicação
FRONTEND_URL=https://seudominio.com
BACKEND_URL=https://seudominio.com

# Configurações de Segurança
CORS_ORIGIN=https://seudominio.com
ALLOWED_ORIGINS=https://seudominio.com,https://www.seudominio.com
```

## 📦 Deploy da Aplicação

### 1. Transferir Arquivos para o VPS

**Opção A: Via Git (Recomendado)**
```bash
# No VPS
cd /var/www
sudo mkdir valecashback
sudo chown $USER:$USER valecashback
cd valecashback

# Clonar ou transferir o projeto
git clone seu_repositorio.git .
# OU fazer upload via FTP/SFTP
```

**Opção B: Via SCP/SFTP**
```bash
# Do seu computador local
scp -r . usuario@seu_vps_ip:/var/www/valecashback/
```

### 2. Instalar Dependências e Build

```bash
cd /var/www/valecashback

# Instalar dependências
npm install

# Build da aplicação
npm run build

# Executar migrações do banco
npm run db:push
```

### 3. Importar Dados Reais (ALEX26)

```bash
# Executar script de importação dos usuários reais
node import-alex26-users.js
```

## 🚀 Configuração do PM2

### 1. Criar arquivo de configuração PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'valecashback',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/valecashback',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/valecashback/err.log',
    out_file: '/var/log/valecashback/out.log',
    log_file: '/var/log/valecashback/combined.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024'
  }]
};
```

### 2. Iniciar aplicação com PM2

```bash
# Criar diretório de logs
sudo mkdir -p /var/log/valecashback
sudo chown $USER:$USER /var/log/valecashback

# Iniciar aplicação
pm2 start ecosystem.config.js

# Salvar configuração do PM2
pm2 save

# Configurar PM2 para iniciar no boot
pm2 startup
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u $USER --hp $HOME
```

## 🔧 Configuração do Nginx (Opcional)

### 1. Configurar Nginx como Proxy Reverso

```nginx
# /etc/nginx/sites-available/valecashback
server {
    listen 80;
    server_name seudominio.com www.seudominio.com;

    # Redirecionar HTTP para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seudominio.com www.seudominio.com;

    # Certificados SSL (use Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/seudominio.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com/privkey.pem;

    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Proxy para a aplicação Node.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Arquivos estáticos (se houver)
    location /static {
        alias /var/www/valecashback/client/dist;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;
}
```

### 2. Ativar configuração do Nginx

```bash
# Ativar site
sudo ln -s /etc/nginx/sites-available/valecashback /etc/nginx/sites-enabled/

# Testar configuração
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

## 🔒 Certificado SSL com Let's Encrypt

```bash
# Instalar Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Obter certificado SSL
sudo certbot --nginx -d seudominio.com -d www.seudominio.com

# Configurar renovação automática
sudo crontab -e
# Adicionar linha:
0 12 * * * /usr/bin/certbot renew --quiet
```

## 🔥 Firewall e Segurança

```bash
# Configurar firewall UFW
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# Configurar fail2ban (opcional)
sudo apt-get install -y fail2ban
```

## 📊 Monitoramento

### 1. Comandos úteis do PM2

```bash
# Ver status das aplicações
pm2 status

# Ver logs em tempo real
pm2 logs valecashback

# Restart da aplicação
pm2 restart valecashback

# Reload sem downtime
pm2 reload valecashback

# Monitoramento
pm2 monit
```

### 2. Logs importantes

```bash
# Logs da aplicação
tail -f /var/log/valecashback/combined.log

# Logs do Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs do PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

## 🚀 Script de Deploy Automatizado

Crie um script `deploy.sh`:

```bash
#!/bin/bash

echo "🚀 Iniciando deploy do Vale Cashback..."

# Navegar para diretório
cd /var/www/valecashback

# Backup do banco (opcional)
echo "📦 Fazendo backup do banco..."
pg_dump -h localhost -U valecashback_user valecashback > backup_$(date +%Y%m%d_%H%M%S).sql

# Atualizar código
echo "📥 Atualizando código..."
git pull origin main

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

# Build da aplicação
echo "🔨 Fazendo build..."
npm run build

# Restart da aplicação
echo "🔄 Reiniciando aplicação..."
pm2 reload valecashback

echo "✅ Deploy concluído com sucesso!"
echo "🌐 Aplicação disponível em: https://seudominio.com"
```

## 📋 Checklist Final

- [ ] VPS configurado com Node.js, PostgreSQL e PM2
- [ ] Banco de dados criado e configurado
- [ ] Variáveis de ambiente configuradas
- [ ] Código transferido e build realizado
- [ ] Dados reais ALEX26 importados
- [ ] PM2 configurado e aplicação rodando
- [ ] Nginx configurado (se usando)
- [ ] Certificado SSL instalado
- [ ] Firewall configurado
- [ ] Monitoramento funcionando

## 🆘 Resolução de Problemas

### Aplicação não inicia
```bash
# Verificar logs
pm2 logs valecashback
# Verificar se porta 3000 está livre
sudo netstat -tlnp | grep :3000
```

### Erro de conexão com banco
```bash
# Testar conexão
psql -h localhost -U valecashback_user -d valecashback
```

### Nginx não funciona
```bash
# Verificar configuração
sudo nginx -t
# Verificar status
sudo systemctl status nginx
```

---

**🎉 Seu aplicativo Vale Cashback estará rodando no VPS com todos os 151 usuários reais do backup ALEX26!**