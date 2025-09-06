# GUIA VPS NODE.JS - VALE CASHBACK

## PROVEDORES VPS RECOMENDADOS

### NACIONAIS
- **Hostinger VPS**: R$ 31-91/mês
- **UOL Host VPS**: R$ 45-120/mês  
- **Locaweb VPS**: R$ 50-150/mês
- **KingHost VPS**: R$ 60-180/mês

### INTERNACIONAIS (MAIS BARATOS)
- **Contabo**: €4.99/mês (~R$ 28)
- **Vultr**: $5/mês (~R$ 28)
- **DigitalOcean**: $5/mês (~R$ 28)
- **Linode**: $5/mês (~R$ 28)

## PASSO 1: CONTRATAR E CONFIGURAR VPS

### 1.1 Dados necessários após contratação:
```
IP do servidor: XXX.XXX.XXX.XXX
Usuário: root
Senha: sua_senha_vps
```

### 1.2 Conectar via SSH:
```bash
# Windows (usar PuTTY ou CMD)
ssh root@SEU_IP_VPS

# Linux/Mac
ssh root@SEU_IP_VPS
```

### 1.3 Atualizar sistema:
```bash
apt update && apt upgrade -y
```

## PASSO 2: INSTALAR DEPENDÊNCIAS

### 2.1 Instalar Node.js 20:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
```

### 2.2 Verificar instalação:
```bash
node --version  # Deve mostrar v20.x.x
npm --version   # Deve mostrar 10.x.x
```

### 2.3 Instalar PostgreSQL:
```bash
apt install -y postgresql postgresql-contrib
```

### 2.4 Instalar Nginx:
```bash
apt install -y nginx
```

### 2.5 Instalar PM2:
```bash
npm install -g pm2
```

### 2.6 Instalar Git:
```bash
apt install -y git
```

## PASSO 3: CONFIGURAR POSTGRESQL

### 3.1 Configurar PostgreSQL:
```bash
sudo -u postgres psql
```

### 3.2 Executar comandos SQL:
```sql
-- Criar banco de dados
CREATE DATABASE valecashback;

-- Criar usuário
CREATE USER valecashback_user WITH ENCRYPTED PASSWORD 'SENHA_FORTE_123!@#';

-- Dar permissões
GRANT ALL PRIVILEGES ON DATABASE valecashback TO valecashback_user;
ALTER USER valecashback_user CREATEDB;

-- Sair
\q
```

### 3.3 Testar conexão:
```bash
psql -h localhost -U valecashback_user -d valecashback
```

## PASSO 4: FAZER UPLOAD DO CÓDIGO

### 4.1 Criar diretório:
```bash
mkdir -p /var/www/valecashback
cd /var/www/valecashback
```

### 4.2 Opção A - Upload via Git:
```bash
git clone https://github.com/SEU_USUARIO/valecashback.git .
```

### 4.3 Opção B - Upload via SCP:
```bash
# No seu computador local
scp -r ./projeto/* root@SEU_IP:/var/www/valecashback/
```

### 4.4 Opção C - Upload via SFTP:
- Use FileZilla ou WinSCP
- Host: SEU_IP_VPS
- Usuário: root  
- Senha: sua_senha
- Enviar arquivos para `/var/www/valecashback`

## PASSO 5: CONFIGURAR APLICAÇÃO

### 5.1 Instalar dependências:
```bash
cd /var/www/valecashback
npm install --production
```

### 5.2 Criar arquivo .env:
```bash
nano .env
```

### 5.3 Configurar .env:
```env
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://valecashback_user:SENHA_FORTE_123!@#@localhost:5432/valecashback
PGHOST=localhost
PGPORT=5432
PGUSER=valecashback_user
PGPASSWORD=SENHA_FORTE_123!@#
PGDATABASE=valecashback

# Session
SESSION_SECRET=gere_uma_chave_secreta_de_64_caracteres_aqui_muito_forte

# Domain
DOMAIN=seudominio.com.br
```

### 5.4 Gerar chave secreta:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## PASSO 6: EXECUTAR MIGRATIONS

### 6.1 Criar script de migrations:
```bash
nano setup-database.js
```

### 6.2 Adicionar conteúdo:
```javascript
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Criando tabelas...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        username TEXT UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        country_code TEXT,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        photo TEXT,
        security_question TEXT,
        security_answer TEXT,
        invitation_code TEXT,
        referral_code TEXT,
        referred_by INTEGER,
        referral_level TEXT,
        password_updated BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW(),
        last_login TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS merchants (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        store_name TEXT NOT NULL,
        logo TEXT,
        category TEXT NOT NULL,
        address TEXT,
        city TEXT,
        state TEXT,
        country TEXT,
        company_logo TEXT,
        commission_rate NUMERIC DEFAULT 2.0,
        approved BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cashbacks (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        balance NUMERIC DEFAULT 0.0,
        total_earned NUMERIC DEFAULT 0.0,
        total_spent NUMERIC DEFAULT 0.0,
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        merchant_id INTEGER NOT NULL REFERENCES merchants(id),
        amount NUMERIC NOT NULL,
        cashback_amount NUMERIC NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'completed',
        payment_method TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        source TEXT DEFAULT 'manual',
        qr_code_id TEXT,
        manual_amount NUMERIC,
        notes TEXT
      );

      CREATE TABLE IF NOT EXISTS qr_codes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        code TEXT NOT NULL UNIQUE,
        amount NUMERIC,
        description TEXT,
        type TEXT DEFAULT 'payment',
        data TEXT,
        status TEXT DEFAULT 'active',
        expires_at TIMESTAMP,
        used_at TIMESTAMP,
        used_by INTEGER REFERENCES users(id),
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS transfers (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER NOT NULL REFERENCES users(id),
        to_user_id INTEGER NOT NULL REFERENCES users(id),
        amount NUMERIC NOT NULL,
        description TEXT,
        status TEXT DEFAULT 'completed',
        created_at TIMESTAMP DEFAULT NOW(),
        type TEXT
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS commission_settings (
        id SERIAL PRIMARY KEY,
        platform_fee NUMERIC DEFAULT 5.0,
        merchant_commission NUMERIC DEFAULT 2.0,
        client_cashback NUMERIC DEFAULT 2.0,
        referral_bonus NUMERIC DEFAULT 1.0,
        min_withdrawal NUMERIC DEFAULT 20.0,
        max_cashback_bonus NUMERIC DEFAULT 10.0,
        withdrawal_fee NUMERIC DEFAULT 5.0,
        updated_at TIMESTAMP DEFAULT NOW(),
        updated_by INTEGER REFERENCES users(id)
      );
    `);

    console.log('Criando usuários padrão...');
    
    const adminHash = await bcrypt.hash('admin123', 10);
    const clientHash = await bcrypt.hash('cliente123', 10);
    const merchantHash = await bcrypt.hash('lojista123', 10);

    await client.query(`
      INSERT INTO users (name, email, password, type, referral_code) VALUES
      ('Administrador Sistema', 'admin@valecashback.com', $1, 'admin', 'ADMIN001'),
      ('Cliente Demonstração', 'cliente@valecashback.com', $2, 'client', 'CLIENT001'),
      ('Lojista Demonstração', 'lojista@valecashback.com', $3, 'merchant', 'MERCHANT001')
      ON CONFLICT (email) DO NOTHING;
    `, [adminHash, clientHash, merchantHash]);

    await client.query(`
      INSERT INTO merchants (user_id, store_name, category, approved)
      SELECT id, 'Loja Demonstração', 'Variedades', true
      FROM users WHERE email = 'lojista@valecashback.com'
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO cashbacks (user_id, balance, total_earned)
      SELECT id, 1000.00, 1000.00 FROM users
      ON CONFLICT DO NOTHING;
    `);

    await client.query(`
      INSERT INTO commission_settings (platform_fee, merchant_commission, client_cashback, referral_bonus)
      VALUES (5.0, 2.0, 2.0, 1.0)
      ON CONFLICT DO NOTHING;
    `);

    console.log('✅ Banco configurado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

setupDatabase();
```

### 6.3 Executar setup:
```bash
node setup-database.js
```

## PASSO 7: CONFIGURAR PM2

### 7.1 Criar ecosystem.config.js:
```bash
nano ecosystem.config.js
```

### 7.2 Configurar PM2:
```javascript
module.exports = {
  apps: [{
    name: 'valecashback',
    script: 'server/index.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    watch: false,
    max_restarts: 10,
    restart_delay: 4000
  }]
};
```

### 7.3 Criar pasta de logs:
```bash
mkdir logs
```

### 7.4 Iniciar aplicação:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## PASSO 8: CONFIGURAR NGINX

### 8.1 Criar configuração:
```bash
nano /etc/nginx/sites-available/valecashback
```

### 8.2 Adicionar configuração:
```nginx
server {
    listen 80;
    server_name seudominio.com.br www.seudominio.com.br;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seudominio.com.br www.seudominio.com.br;

    # SSL será configurado pelo Certbot
    
    # Logs
    access_log /var/log/nginx/valecashback.access.log;
    error_log /var/log/nginx/valecashback.error.log;

    # Proxy para Node.js
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
        proxy_read_timeout 86400;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate max-age=0;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript;

    client_max_body_size 10M;
}
```

### 8.3 Ativar site:
```bash
ln -s /etc/nginx/sites-available/valecashback /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx
```

## PASSO 9: CONFIGURAR SSL

### 9.1 Instalar Certbot:
```bash
apt install -y certbot python3-certbot-nginx
```

### 9.2 Obter certificado:
```bash
certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

### 9.3 Configurar renovação automática:
```bash
crontab -e
```

Adicionar:
```
0 12 * * * /usr/bin/certbot renew --quiet
```

## PASSO 10: CONFIGURAR FIREWALL

### 10.1 Configurar UFW:
```bash
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
ufw status
```

## PASSO 11: CONFIGURAR DOMÍNIO

### 11.1 No seu provedor de domínio (Registro.br, GoDaddy, etc):
```
Tipo: A
Nome: @
Valor: SEU_IP_VPS

Tipo: A
Nome: www
Valor: SEU_IP_VPS
```

### 11.2 Aguardar propagação DNS (até 48h)

## PASSO 12: TESTAR APLICAÇÃO

### 12.1 Verificar se está rodando:
```bash
pm2 status
curl http://localhost:3000
```

### 12.2 Testar no navegador:
- http://seudominio.com.br (deve redirecionar para HTTPS)
- https://seudominio.com.br

### 12.3 Credenciais de teste:
- **Admin**: admin@valecashback.com / admin123
- **Cliente**: cliente@valecashback.com / cliente123  
- **Lojista**: lojista@valecashback.com / lojista123

## PASSO 13: MONITORAMENTO

### 13.1 Ver logs da aplicação:
```bash
pm2 logs valecashback --lines 50
```

### 13.2 Ver logs do Nginx:
```bash
tail -f /var/log/nginx/valecashback.access.log
tail -f /var/log/nginx/valecashback.error.log
```

### 13.3 Ver status do sistema:
```bash
htop
df -h
free -h
```

## COMANDOS DE MANUTENÇÃO

### Reiniciar aplicação:
```bash
pm2 restart valecashback
```

### Atualizar código:
```bash
cd /var/www/valecashback
git pull
npm install --production
pm2 restart valecashback
```

### Backup do banco:
```bash
pg_dump -U valecashback_user -h localhost valecashback > backup_$(date +%Y%m%d).sql
```

### Restaurar backup:
```bash
psql -U valecashback_user -h localhost valecashback < backup_20240101.sql
```

## CUSTOS ESTIMADOS

### VPS Básico (1GB RAM):
- **Hostinger**: R$ 31/mês
- **Contabo**: €4.99/mês (~R$ 28)
- **Vultr**: $5/mês (~R$ 28)

### Domínio:
- **.com.br**: R$ 40/ano
- **.com**: R$ 60/ano

### Total: R$ 30-60/mês + domínio

## SOLUÇÃO DE PROBLEMAS

### Aplicação não inicia:
```bash
pm2 logs valecashback
npm test
```

### Erro de banco:
```bash
sudo -u postgres psql
\l
\c valecashback
\dt
```

### Nginx não funciona:
```bash
nginx -t
systemctl status nginx
```

### SSL não funciona:
```bash
certbot certificates
systemctl status nginx
```

**RESULTADO FINAL**: https://seudominio.com.br funcionando 100% em VPS Node.js!