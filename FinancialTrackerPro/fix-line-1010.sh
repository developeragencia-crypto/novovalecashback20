#!/bin/bash

# Corrige a linha específica 1010 do arquivo server/routes.ts
# Esta linha geralmente contém um problema com userId vs user_id
sed -i '1010s/userId/user_id/g' server/routes.ts
sed -i '1010s/merchantId/merchant_id/g' server/routes.ts

echo "Correção aplicada na linha 1010"