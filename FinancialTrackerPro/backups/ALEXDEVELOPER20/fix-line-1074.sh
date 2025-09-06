#!/bin/bash

# Corrige erros na linha 1074 do arquivo server/routes.ts
# Corrige casos de platformFee para platform_fee

sed -i '1074s/platformFee/platform_fee/g' server/routes.ts
sed -i '1074s/merchantCommission/merchant_commission/g' server/routes.ts 
sed -i '1074s/clientCashback/client_cashback/g' server/routes.ts
sed -i '1074s/referralBonus/referral_bonus/g' server/routes.ts
sed -i '1074s/updatedAt/updated_at/g' server/routes.ts

echo "Correção aplicada na linha 1074"