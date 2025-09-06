#!/bin/sh
set -e

# Função para aguardar o banco de dados
wait_for_db() {
  echo "Aguardando banco de dados..."
  while ! nc -z $DB_HOST $DB_PORT; do
    sleep 1
  done
  echo "Banco de dados disponível!"
}

# Função para executar migrações
run_migrations() {
  echo "Executando migrações..."
  npm run migrate:up
}

# Função para verificar saúde da aplicação
check_health() {
  echo "Verificando saúde da aplicação..."
  if ! wget --no-verbose --tries=1 --spider http://localhost:$PORT/health; then
    echo "Aplicação não está respondendo!"
    exit 1
  fi
  echo "Aplicação está saudável!"
}

# Instala netcat para verificação de porta
apk add --no-cache netcat-openbsd

# Aguarda banco de dados se necessário
if [ "$WAIT_FOR_DB" = "true" ]; then
  wait_for_db
fi

# Executa migrações se necessário
if [ "$RUN_MIGRATIONS" = "true" ]; then
  run_migrations
fi

# Inicia a aplicação
echo "Iniciando aplicação..."
node server/dist/index.js &

# Aguarda a aplicação iniciar
sleep 5

# Verifica saúde da aplicação
check_health

# Mantém o container rodando
tail -f /dev/null 