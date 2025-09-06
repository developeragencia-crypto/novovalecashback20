# PASSO A PASSO COMPLETO - VALE CASHBACK EM VPS

## FASE 1: PREPARAÇÃO (30 minutos)

### PASSO 1: CONTRATAR VPS
1. Acesse um provedor VPS:
   - **Hostinger VPS**: https://hostinger.com.br/vps-hosting
   - **Contabo**: https://contabo.com (mais barato)
   - **Vultr**: https://vultr.com
   - **DigitalOcean**: https://digitalocean.com

2. Escolha o plano:
   - **Mínimo**: 1GB RAM, 25GB SSD
   - **Recomendado**: 2GB RAM, 50GB SSD

3. Sistema operacional: **Ubuntu 22.04 LTS**

4. Anote os dados recebidos:
   ```
   IP do servidor: XXX.XXX.XXX.XXX
   Usuário: root
   Senha: sua_senha_vps
   ```

### PASSO 2: REGISTRAR DOMÍNIO
1. Compre um domínio:
   - **Registro.br**: para .com.br
   - **GoDaddy**: para .com
   - **Hostinger**: se comprou VPS lá

2. Configure DNS apontando para seu VPS:
   ```
   Tipo: A
   Nome: @
   Valor: SEU_IP_VPS
   
   Tipo: A
   Nome: www
   Valor: SEU_IP_VPS
   ```

### PASSO 3: BAIXAR FERRAMENTAS
**Windows:**
- PuTTY: https://putty.org
- FileZilla: https://filezilla-project.org
- WinSCP: https://winscp.net

**Mac/Linux:**
- Terminal nativo
- FileZilla (opcional)

## FASE 2: CONFIGURAÇÃO DO SERVIDOR (60 minutos)

### PASSO 4: CONECTAR NO SERVIDOR
```bash
# Windows (PuTTY ou CMD)
ssh root@SEU_IP_VPS

# Mac/Linux (Terminal)
ssh root@SEU_IP_VPS
```

Digite sua senha quando solicitado.

### PASSO 5: ATUALIZAR SISTEMA
```bash
apt update && apt upgrade -y
```

### PASSO 6: INSTALAR NODE.JS 20
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
```

Verificar:
```bash
node --version  # Deve mostrar v20.x.x
npm --version   # Deve mostrar 10.x.x
```

### PASSO 7: INSTALAR POSTGRESQL
```bash
apt install -y postgresql postgresql-contrib
```

### PASSO 8: INSTALAR NGINX E PM2
```bash
apt install -y nginx git
npm install -g pm2
```

### PASSO 9: CONFIGURAR POSTGRESQL
```bash
sudo -u postgres psql
```

Execute no PostgreSQL:
```sql
CREATE DATABASE valecashback;
CREATE USER valecashback_user WITH ENCRYPTED PASSWORD 'MinhaSenh@123!';
GRANT ALL PRIVILEGES ON DATABASE valecashback TO valecashback_user;
ALTER USER valecashback_user CREATEDB;
\q
```

## FASE 3: UPLOAD E CONFIGURAÇÃO DA APLICAÇÃO (45 minutos)

### PASSO 10: CRIAR DIRETÓRIO DA APLICAÇÃO
```bash
mkdir -p /var/www/valecashback
cd /var/www/valecashback
```

### PASSO 11: FAZER UPLOAD DOS ARQUIVOS

**Opção A - Via Git (se você tem repositório):**
```bash
git clone https://github.com/SEU_USUARIO/valecashback.git .
```

**Opção B - Upload manual via FileZilla/WinSCP:**
1. Conecte no servidor:
   - Host: SEU_IP_VPS
   - Usuário: root
   - Senha: sua_senha_vps
   - Porta: 22

2. Navegue até `/var/www/valecashback`
3. Faça upload de todos os arquivos do projeto

**Opção C - Via SCP (linha de comando):**
```bash
# No seu computador local
scp -r ./projeto/* root@SEU_IP:/var/www/valecashback/
```

### PASSO 12: INSTALAR DEPENDÊNCIAS
```bash
cd /var/www/valecashback
npm install --production
```

### PASSO 13: CRIAR ARQUIVO DE CONFIGURAÇÃO
```bash
nano .env
```

Adicione este conteúdo (SUBSTITUA OS VALORES):
```env
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://valecashback_user:MinhaSenh@123!@localhost:5432/valecashback
PGHOST=localhost
PGPORT=5432
PGUSER=valecashback_user
PGPASSWORD=MinhaSenh@123!
PGDATABASE=valecashback

# Session (gere uma chave única)
SESSION_SECRET=minha_chave_secreta_super_forte_64_caracteres_aqui_123456

# Domain
DOMAIN=seudominio.com.br
```

### PASSO 14: CONFIGURAR BANCO DE DADOS
```bash
nano setup-database.js
```

Adicione este código:
```javascript
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function setupDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Criando tabelas...');
    
    // Criar tabelas
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

    console.log('👥 Criando usuários padrão...');
    
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

Execute o setup:
```bash
node setup-database.js
```

## FASE 4: CONFIGURAÇÃO DE PRODUÇÃO (30 minutos)

### PASSO 15: CONFIGURAR PM2
```bash
nano ecosystem.config.js
```

Adicione:
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

Criar logs e iniciar:
```bash
mkdir logs
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### PASSO 16: CONFIGURAR NGINX
```bash
nano /etc/nginx/sites-available/valecashback
```

Adicione (SUBSTITUA seudominio.com.br):
```nginx
server {
    listen 80;
    server_name seudominio.com.br www.seudominio.com.br;

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

    client_max_body_size 10M;
}
```

Ativar o site:
```bash
ln -s /etc/nginx/sites-available/valecashback /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
systemctl enable nginx
```

### PASSO 17: CONFIGURAR SSL (HTTPS)
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d seudominio.com.br -d www.seudominio.com.br
```

Renovação automática:
```bash
crontab -e
```

Adicione:
```
0 12 * * * /usr/bin/certbot renew --quiet
```

### PASSO 18: CONFIGURAR FIREWALL
```bash
ufw allow ssh
ufw allow 'Nginx Full'
ufw --force enable
```

## FASE 5: TESTE E VERIFICAÇÃO (15 minutos)

### PASSO 19: TESTAR APLICAÇÃO
```bash
# Verificar se está rodando
pm2 status
curl http://localhost:3000

# Ver logs
pm2 logs valecashback --lines 20
```

### PASSO 20: TESTAR NO NAVEGADOR
1. Acesse: http://seudominio.com.br
2. Deve redirecionar para: https://seudominio.com.br
3. Teste login com:
   - **Admin**: admin@valecashback.com / admin123
   - **Cliente**: cliente@valecashback.com / cliente123
   - **Lojista**: lojista@valecashback.com / lojista123

## RESUMO FINAL

### ✅ O QUE VOCÊ TEM AGORA:
- ✅ VPS configurado com Ubuntu 22.04
- ✅ Node.js 20 instalado
- ✅ PostgreSQL configurado
- ✅ Aplicação rodando via PM2
- ✅ Nginx como proxy reverso
- ✅ SSL/HTTPS configurado
- ✅ Firewall ativo
- ✅ Domínio funcionando
- ✅ Sistema completo online

### 🔐 CREDENCIAIS:
- **URL**: https://seudominio.com.br
- **Admin**: admin@valecashback.com / admin123
- **Cliente**: cliente@valecashback.com / cliente123
- **Lojista**: lojista@valecashback.com / lojista123

### 📊 COMANDOS ÚTEIS:

**Ver status:**
```bash
pm2 status
systemctl status nginx
systemctl status postgresql
```

**Ver logs:**
```bash
pm2 logs valecashback
tail -f /var/log/nginx/access.log
```

**Reiniciar serviços:**
```bash
pm2 restart valecashback
systemctl restart nginx
```

**Backup do banco:**
```bash
pg_dump -U valecashback_user -h localhost valecashback > backup_$(date +%Y%m%d).sql
```

**Atualizar aplicação:**
```bash
cd /var/www/valecashback
git pull  # se usando git
npm install --production
pm2 restart valecashback
```

### 💰 CUSTOS MENSAIS:
- **VPS**: R$ 28-60/mês
- **Domínio**: R$ 3-5/mês
- **Total**: R$ 31-65/mês

## 🚨 IMPORTANTE:

1. **ALTERE AS SENHAS** padrão imediatamente
2. **FAÇA BACKUP** do banco regularmente
3. **MONITORE LOGS** semanalmente
4. **ATUALIZE O SISTEMA** mensalmente

**SEU APLICATIVO ESTÁ ONLINE E FUNCIONANDO!** 🎉