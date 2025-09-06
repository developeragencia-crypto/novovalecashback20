#!/bin/bash

# Executa o script Node.js que corrige os nomes dos campos
node fix-field-names.js

# Retorna ao diretório raiz
cd $(dirname "$0")

echo "Correção de nomes de campos concluída."