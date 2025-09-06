#!/bin/bash

# Script de Configuração Inicial do VPS para Vale Cashback
# Execute este script no seu VPS como usuário sudo

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Verificar se está rodando como usuário com sudo
if [ "$EUID" -eq 0 ]; then
    print_error "Execute este script como usuário normal com privilégios sudo, não como root!"
    exit 1
fi

print_header "CONFIGURAÇÃO INICIAL DO VPS - VALE CASHBACK"

# Atualizar sistema
print_status "Atualizando sistema..."
sudo apt update && sudo apt upgrade -y

# Instalar dependências básicas
print_status "Instalando dependências básicas..."
sudo apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates

# Instalar Node.js 20
print_status "Instalando Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalação do Node.js
NODE_VERSION=$(node --version)
NPM_VERSION=$(npm --version)
print_status "Node.js instalado: $NODE_VERSION"
print_status "npm instalado: $NPM_VERSION"

# Instalar PM2
print_status "Instalando PM2..."
sudo npm install -g pm2

# Instalar PostgreSQL
print_status "Instalando PostgreSQL..."
sudo apt-get install -y postgresql postgresql-contrib

# Configurar PostgreSQL
print_status "Configurando PostgreSQL..."
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Criar usuário e banco do PostgreSQL
print_status "Configurando banco de dados..."
sudo -u postgres psql << EOF
CREATE DATABASE valecashback;
CREATE USER valecashback_user WITH ENCRYPTED PASSWORD 'valecashback2024!';
GRANT ALL PRIVILEGES ON DATABASE valecashback TO valecashback_user;
ALTER USER valecashback_user CREATEDB;
\q
EOF

# Configurar Nginx
print_status "Instalando Nginx..."
sudo apt-get install -y nginx

# Configurar firewall
print_status "Configurando firewall..."
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Instalar Certbot para SSL
print_status "Instalando Certbot..."
sudo apt-get install -y certbot python3-certbot-nginx

# Criar diretório da aplicação
print_status "Criando diretório da aplicação..."
sudo mkdir -p /var/www/valecashback
sudo chown $USER:$USER /var/www/valecashback

# Criar diretório de logs
print_status "Criando diretório de logs..."
sudo mkdir -p /var/log/valecashback
sudo chown $USER:$USER /var/log/valecashback

# Instalar fail2ban para segurança
print_status "Instalando fail2ban..."
sudo apt-get install -y fail2ban

# Configurar fail2ban
sudo tee /etc/fail2ban/jail.local > /dev/null << EOF
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
maxretry = 3
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban

print_header "CONFIGURAÇÃO CONCLUÍDA"

print_status "VPS configurado com sucesso!"
print_status "Node.js: $NODE_VERSION"
print_status "PostgreSQL: Instalado e configurado"
print_status "PM2: Instalado"
print_status "Nginx: Instalado"
print_status "Firewall: Configurado"

print_warning "PRÓXIMOS PASSOS:"
echo "1. Faça upload do código da aplicação para /var/www/valecashback"
echo "2. Crie o arquivo .env com as configurações"
echo "3. Execute o script deploy.sh"
echo "4. Configure o domínio no Nginx"
echo "5. Gere certificado SSL com: sudo certbot --nginx -d seudominio.com"

print_header "INFORMAÇÕES IMPORTANTES"
echo "Diretório da aplicação: /var/www/valecashback"
echo "Logs da aplicação: /var/log/valecashback"
echo "Banco de dados: valecashback"
echo "Usuário do banco: valecashback_user"
echo "Senha do banco: valecashback2024!"

print_warning "ANOTE ESTAS INFORMAÇÕES EM LOCAL SEGURO!"