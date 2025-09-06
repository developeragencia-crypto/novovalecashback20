#!/bin/bash

# Script de Deploy Automatizado - Vale Cashback
# Uso: ./deploy.sh

set -e

echo "🚀 Iniciando deploy do Vale Cashback..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para print colorido
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está rodando como usuário correto
if [ "$EUID" -eq 0 ]; then
    print_error "Não execute este script como root!"
    exit 1
fi

# Diretório da aplicação
APP_DIR="/var/www/valecashback"

# Verificar se diretório existe
if [ ! -d "$APP_DIR" ]; then
    print_error "Diretório $APP_DIR não existe!"
    exit 1
fi

cd $APP_DIR

# Backup do banco de dados
print_status "Fazendo backup do banco de dados..."
BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"
if command -v pg_dump &> /dev/null; then
    pg_dump -h localhost -U valecashback_user valecashback > $BACKUP_FILE 2>/dev/null || {
        print_warning "Não foi possível fazer backup do banco"
    }
else
    print_warning "pg_dump não encontrado, pulando backup"
fi

# Atualizar código (se usando Git)
if [ -d ".git" ]; then
    print_status "Atualizando código do repositório..."
    git fetch origin
    git pull origin main || git pull origin master
else
    print_warning "Repositório Git não encontrado, usando código local"
fi

# Verificar se .env existe
if [ ! -f ".env" ]; then
    print_error "Arquivo .env não encontrado!"
    print_error "Crie o arquivo .env com as configurações necessárias"
    exit 1
fi

# Instalar dependências
print_status "Instalando dependências..."
npm ci --production=false

# Build da aplicação
print_status "Compilando aplicação..."
npm run build

# Executar migrações do banco
print_status "Executando migrações do banco..."
npm run db:push || {
    print_warning "Erro nas migrações, continuando..."
}

# Verificar se PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    print_error "PM2 não está instalado!"
    print_error "Instale com: sudo npm install -g pm2"
    exit 1
fi

# Criar diretório de logs se não existir
sudo mkdir -p /var/log/valecashback
sudo chown $USER:$USER /var/log/valecashback

# Parar aplicação se estiver rodando
print_status "Parando aplicação atual..."
pm2 stop valecashback 2>/dev/null || print_warning "Aplicação não estava rodando"

# Iniciar aplicação
print_status "Iniciando aplicação..."
pm2 start ecosystem.config.js

# Salvar configuração do PM2
pm2 save

# Verificar status
sleep 5
if pm2 list | grep -q "valecashback.*online"; then
    print_status "✅ Deploy concluído com sucesso!"
    print_status "🌐 Aplicação rodando em: http://localhost:3000"
    
    # Mostrar logs recentes
    print_status "Logs recentes:"
    pm2 logs valecashback --lines 10 --nostream
else
    print_error "❌ Falha no deploy!"
    print_error "Verificar logs com: pm2 logs valecashback"
    exit 1
fi

# Limpeza
print_status "Limpando arquivos antigos..."
find . -name "backup_*.sql" -mtime +7 -delete 2>/dev/null || true

print_status "🎉 Deploy finalizado!"