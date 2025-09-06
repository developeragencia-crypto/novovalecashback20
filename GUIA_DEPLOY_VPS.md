# GUIA COMPLETO DE DEPLOY - VALE CASHBACK VPS

## PASSO 1: PREPARAR A VPS

### 1.1 Conectar na VPS
```bash
ssh root@SEU_IP_VPS
```

### 1.2 Atualizar sistema
```bash
apt update && apt upgrade -y
```

### 1.3 Instalar dependências básicas
```bash
apt install -y curl wget git nginx certbot python3-certbot-nginx
```

### 1.4 Instalar Node.js 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
```

### 1.5 Instalar PostgreSQL
```bash
apt install -y postgresql postgresql-contrib
```

### 1.6 Instalar PM2 (gerenciador de processos)
```bash
npm install -g pm2
```

## PASSO 2: CONFIGURAR POSTGRESQL

### 2.1 Entrar no PostgreSQL
```bash
sudo -u postgres psql
```

### 2.2 Criar banco e usuário
```sql
CREATE DATABASE valecashback;
CREATE USER valecashback_user WITH ENCRYPTED PASSWORD 'SUA_SENHA_FORTE_AQUI';
GRANT ALL PRIVILEGES ON DATABASE valecashback TO valecashback_user;
ALTER USER valecashback_user CREATEDB;
\q
```

### 2.3 Configurar acesso remoto (se necessário)
```bash
nano /etc/postgresql/*/main/pg_hba.conf
```
Adicionar linha:
```
host    valecashback    valecashback_user    0.0.0.0/0    md5
```

```bash
nano /etc/postgresql/*/main/postgresql.conf
```
Descomentar e alterar:
```
listen_addresses = '*'
```

### 2.4 Reiniciar PostgreSQL
```bash
systemctl restart postgresql
systemctl enable postgresql
```

## PASSO 3: FAZER UPLOAD DO CÓDIGO

### 3.1 Criar diretório da aplicação
```bash
mkdir -p /var/www/valecashback
cd /var/www/valecashback
```

### 3.2 Clonar ou fazer upload do código
**Opção A - Se você tem Git:**
```bash
git clone SEU_REPOSITORIO .
```

**Opção B - Upload manual:**
- Use SCP, SFTP ou WinSCP para enviar todos os arquivos para `/var/www/valecashback`

### 3.3 Configurar permissões
```bash
chown -R www-data:www-data /var/www/valecashback
chmod -R 755 /var/www/valecashback
```

## PASSO 4: CONFIGURAR VARIÁVEIS DE AMBIENTE

### 4.1 Criar arquivo .env
```bash
cd /var/www/valecashback
nano .env
```

### 4.2 Adicionar configurações (SUBSTITUA OS VALORES):
```env
NODE_ENV=production
PORT=3000

# Banco de dados PostgreSQL
DATABASE_URL=postgresql://valecashback_user:SUA_SENHA_FORTE_AQUI@localhost:5432/valecashback
PGHOST=localhost
PGPORT=5432
PGUSER=valecashback_user
PGPASSWORD=SUA_SENHA_FORTE_AQUI
PGDATABASE=valecashback

# Sessão (gere uma chave secreta forte)
SESSION_SECRET=SUA_CHAVE_SECRETA_SUPER_FORTE_AQUI_64_CARACTERES

# Domínio da aplicação
DOMAIN=seudominio.com.br
```

## PASSO 5: INSTALAR DEPENDÊNCIAS E BUILD

### 5.1 Instalar dependências
```bash
cd /var/www/valecashback
npm install --production
```

### 5.2 Fazer build da aplicação
```bash
npm run build
```

## PASSO 6: CRIAR TABELAS NO BANCO

### 6.1 Executar script de criação de tabelas
```bash
cd /var/www/valecashback
node -e "
const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createTables() {
  const client = await pool.connect();
  try {
    // Criar todas as tabelas
    await client.query(\`
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
    \`);
    
    console.log('✅ Tabelas criadas com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao criar tabelas:', error);
  } finally {
    client.release();
  }
}

createTables();
"
```

## PASSO 7: CRIAR USUÁRIOS PADRÃO

### 7.1 Executar script de usuários
```bash
node -e "
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function createDefaultUsers() {
  const client = await pool.connect();
  try {
    // Hash das senhas
    const adminHash = await bcrypt.hash('admin123', 10);
    const clientHash = await bcrypt.hash('cliente123', 10);
    const merchantHash = await bcrypt.hash('lojista123', 10);
    
    // Criar usuários
    await client.query(\`
      INSERT INTO users (name, email, password, type, referral_code) VALUES
      ('Administrador', 'admin@valecashback.com', '\${adminHash}', 'admin', 'ADMIN001'),
      ('Cliente Demo', 'cliente@valecashback.com', '\${clientHash}', 'client', 'CLIENT001'),
      ('Lojista Demo', 'lojista@valecashback.com', '\${merchantHash}', 'merchant', 'MERCHANT001')
      ON CONFLICT (email) DO NOTHING;
    \`);
    
    // Criar merchant
    await client.query(\`
      INSERT INTO merchants (user_id, store_name, category, approved)
      SELECT id, 'Loja Demo', 'Variedades', true
      FROM users WHERE email = 'lojista@valecashback.com'
      ON CONFLICT DO NOTHING;
    \`);
    
    // Criar cashbacks
    await client.query(\`
      INSERT INTO cashbacks (user_id, balance, total_earned)
      SELECT id, 1000.00, 1000.00 FROM users
      ON CONFLICT DO NOTHING;
    \`);
    
    // Criar configurações
    await client.query(\`
      INSERT INTO commission_settings (platform_fee, merchant_commission, client_cashback, referral_bonus)
      VALUES (5.0, 2.0, 2.0, 1.0)
      ON CONFLICT DO NOTHING;
    \`);
    
    console.log('✅ Usuários padrão criados!');
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    client.release();
  }
}

createDefaultUsers();
"
```

## PASSO 8: CONFIGURAR PM2

### 8.1 Criar arquivo ecosystem
```bash
nano ecosystem.config.js
```

### 8.2 Adicionar configuração:
```javascript
module.exports = {
  apps: [{
    name: 'valecashback',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

### 8.3 Criar pasta de logs
```bash
mkdir logs
```

### 8.4 Iniciar aplicação
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## PASSO 9: CONFIGURAR NGINX

### 9.1 Criar configuração do site
```bash
nano /etc/nginx/sites-available/valecashback
```

### 9.2 Adicionar configuração (SUBSTITUA seudominio.com.br):
```nginx
server {
    listen 80;
    server_name seudominio.com.br www.seudominio.com.br;

    # Redirecionar para HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name seudominio.com.br www.seudominio.com.br;

    # Certificados SSL (serão criados pelo certbot)
    ssl_certificate /etc/letsencrypt/live/seudominio.com.br/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/seudominio.com.br/privkey.pem;

    # Configurações SSL
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Logs
    access_log /var/log/nginx/valecashback.access.log;
    error_log /var/log/nginx/valecashback.error.log;

    # Configuração principal
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

    # Servir arquivos estáticos
    location /static/ {
        alias /var/www/valecashback/client/dist/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Aumentar tamanho máximo de upload
    client_max_body_size 10M;
}
```

### 9.3 Ativar site
```bash
ln -s /etc/nginx/sites-available/valecashback /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

## PASSO 10: CONFIGURAR SSL (HTTPS)

### 10.1 Obter certificado SSL
```bash
certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

### 10.2 Configurar renovação automática
```bash
crontab -e
```
Adicionar linha:
```
0 12 * * * /usr/bin/certbot renew --quiet
```

## PASSO 11: CONFIGURAR FIREWALL

### 11.1 Configurar UFW
```bash
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
```

## PASSO 12: MONITORAMENTO E LOGS

### 12.1 Ver logs da aplicação
```bash
pm2 logs valecashback
```

### 12.2 Ver status
```bash
pm2 status
```

### 12.3 Reiniciar aplicação
```bash
pm2 restart valecashback
```

### 12.4 Ver logs do Nginx
```bash
tail -f /var/log/nginx/valecashback.access.log
tail -f /var/log/nginx/valecashback.error.log
```

## CREDENCIAIS DE ACESSO

Após o deploy, acesse:
- **URL**: https://seudominio.com.br
- **Admin**: admin@valecashback.com / admin123
- **Cliente**: cliente@valecashback.com / cliente123
- **Lojista**: lojista@valecashback.com / lojista123

## COMANDOS ÚTEIS DE MANUTENÇÃO

```bash
# Atualizar aplicação
cd /var/www/valecashback
git pull
npm install --production
npm run build
pm2 restart valecashback

# Backup do banco
pg_dump -U valecashback_user -h localhost valecashback > backup_$(date +%Y%m%d).sql

# Restaurar backup
psql -U valecashback_user -h localhost valecashback < backup_20240101.sql

# Ver uso de recursos
htop
df -h
free -h
```

## ESTRUTURA FINAL

```
/var/www/valecashback/
├── server/           # Backend Node.js
├── client/           # Frontend React
├── shared/           # Código compartilhado
├── .env             # Variáveis de ambiente
├── package.json     # Dependências
├── ecosystem.config.js  # Configuração PM2
└── logs/            # Logs da aplicação
```

**IMPORTANTE**: Substitua todos os valores marcados com "SEU_" pelos seus dados reais antes de executar os comandos.