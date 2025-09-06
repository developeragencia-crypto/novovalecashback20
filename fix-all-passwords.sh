#!/bin/bash

# Script para corrigir senhas de todos os usuários que não conseguem fazer login

echo "🔄 Iniciando correção de senhas em massa..."

# Lista de emails dos usuários com problemas (primeiros 50)
emails=(
  "joao.silva@email.com"
  "maria.costa@email.com"
  "pedro.silva@email.com"
  "ana.souza@email.com"
  "carlos.lima@email.com"
  "fernanda.rocha@email.com"
  "ricardo.gomes@email.com"
  "juliana.ferreira@email.com"
  "roberto.mendes@email.com"
  "patricia.nascimento@email.com"
  "bruno.costa@email.com"
  "camila.lima@email.com"
  "lucas.silva@email.com"
  "rafaela.pereira@email.com"
  "gabriel.oliveira@email.com"
  "larissa.santos@email.com"
  "thiago.pereira@email.com"
  "amanda.rodrigues@email.com"
  "daniel.ferreira@email.com"
  "carolina.mendes@email.com"
  "felipe.costa@email.com"
  "isabela.lima@email.com"
  "rodrigo.santos@email.com"
  "natalia.oliveira@email.com"
  "gustavo.silva@email.com"
  "vanessa.pereira@email.com"
  "leonardo.rodrigues@email.com"
  "bianca.ferreira@email.com"
  "rafael.mendes@email.com"
  "priscila.costa@email.com"
  "marcelo.lima@email.com"
  "adriana.santos@email.com"
  "eduardo.oliveira@email.com"
  "monica.silva@email.com"
  "andre.pereira@email.com"
  "tatiana.rodrigues@email.com"
  "vinicius.ferreira@email.com"
  "fernanda.mendes@email.com"
  "sergio.costa@email.com"
  "luciana.lima@email.com"
  "fabio.santos@email.com"
  "renata.oliveira@email.com"
  "paulo.silva@email.com"
  "simone.pereira@email.com"
  "marcos.rodrigues@email.com"
  "claudia.ferreira@email.com"
  "alexsandro@email.com"
  "ana.paula@email.com"
  "marcio.alves@email.com"
  "carla.souza@email.com"
  "diego.martins@email.com"
)

count=0
success=0

for email in "${emails[@]}"; do
  count=$((count + 1))
  echo "[$count] Corrigindo senha para: $email"
  
  response=$(curl -s -X POST http://localhost:5000/api/reset-password \
    -H "Content-Type: application/json" \
    -d "{\"email\":\"$email\",\"newPassword\":\"senha123\"}")
  
  if [[ $response == *"sucesso"* ]]; then
    success=$((success + 1))
    echo "    ✅ Sucesso"
  else
    echo "    ❌ Erro: $response"
  fi
  
  # Pequena pausa para não sobrecarregar
  sleep 0.1
done

echo ""
echo "🎉 Correção concluída!"
echo "📊 $success de $count senhas corrigidas"