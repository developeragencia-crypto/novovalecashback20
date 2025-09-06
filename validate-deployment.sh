#!/bin/bash

# Script de Validação do Deploy - Vale Cashback
# Verifica se tudo está funcionando corretamente no VPS

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

echo "🔍 Validando deployment do Vale Cashback..."

# Verificar se a aplicação está rodando
if pm2 list | grep -q "valecashback.*online"; then
    print_success "Aplicação está rodando no PM2"
else
    print_error "Aplicação não está rodando no PM2"
    exit 1
fi

# Verificar se a porta 3000 está sendo usada
if netstat -tlnp | grep -q ":3000"; then
    print_success "Porta 3000 está sendo usada"
else
    print_error "Porta 3000 não está sendo usada"
    exit 1
fi

# Verificar conexão com PostgreSQL
if pg_isready -h localhost -p 5432 -U valecashback_user; then
    print_success "PostgreSQL está acessível"
else
    print_error "PostgreSQL não está acessível"
    exit 1
fi

# Verificar se o banco valecashback existe
if psql -h localhost -U valecashback_user -d valecashback -c "SELECT 1;" > /dev/null 2>&1; then
    print_success "Banco de dados valecashback está acessível"
else
    print_error "Banco de dados valecashback não está acessível"
    exit 1
fi

# Verificar se as tabelas principais existem
TABLES=("users" "merchants" "transactions" "cashbacks" "commission_settings")
for table in "${TABLES[@]}"; do
    if psql -h localhost -U valecashback_user -d valecashback -c "SELECT 1 FROM $table LIMIT 1;" > /dev/null 2>&1; then
        print_success "Tabela $table existe e está acessível"
    else
        print_error "Tabela $table não existe ou não está acessível"
        exit 1
    fi
done

# Verificar se há usuários no banco
USER_COUNT=$(psql -h localhost -U valecashback_user -d valecashback -t -c "SELECT COUNT(*) FROM users;" | xargs)
if [ "$USER_COUNT" -gt 0 ]; then
    print_success "Banco contém $USER_COUNT usuários"
else
    print_warning "Banco não contém usuários - execute import-production-data.js"
fi

# Verificar se Nginx está rodando (se instalado)
if systemctl is-active --quiet nginx; then
    print_success "Nginx está rodando"
else
    print_warning "Nginx não está rodando ou não está instalado"
fi

# Verificar se firewall está ativo
if ufw status | grep -q "Status: active"; then
    print_success "Firewall UFW está ativo"
else
    print_warning "Firewall UFW não está ativo"
fi

# Teste de requisição HTTP local
if curl -f -s http://localhost:3000 > /dev/null; then
    print_success "Aplicação responde a requisições HTTP locais"
else
    print_error "Aplicação não responde a requisições HTTP locais"
    exit 1
fi

# Verificar logs recentes por erros
if pm2 logs valecashback --lines 20 --nostream | grep -i error; then
    print_warning "Encontrados erros nos logs recentes"
else
    print_success "Nenhum erro crítico encontrado nos logs recentes"
fi

# Verificar uso de memória
MEMORY_USAGE=$(pm2 show valecashback | grep "memory usage" | awk '{print $4}' | sed 's/[^0-9]//g')
if [ -n "$MEMORY_USAGE" ] && [ "$MEMORY_USAGE" -lt 500 ]; then
    print_success "Uso de memória está normal (${MEMORY_USAGE}MB)"
else
    print_warning "Uso de memória pode estar alto (${MEMORY_USAGE}MB)"
fi

echo ""
echo "🎉 Validação concluída!"
echo ""
echo "📊 Resumo do sistema:"
echo "- Usuários no banco: $USER_COUNT"
echo "- Aplicação: Online"
echo "- Banco de dados: Conectado"
echo "- Porta: 3000"
echo ""
echo "📱 Próximos passos:"
echo "1. Configure seu domínio no Nginx"
echo "2. Gere certificado SSL com Let's Encrypt"
echo "3. Teste o acesso externo"
echo ""
echo "🌐 Aplicação local: http://localhost:3000"