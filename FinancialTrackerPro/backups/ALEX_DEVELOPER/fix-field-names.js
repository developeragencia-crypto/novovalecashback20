/**
 * Script para corrigir os nomes dos campos em camelCase para snake_case no código do servidor
 * Este script substitui propriedades em camelCase pela versão correspondente em snake_case
 * Isso garante que o frontend e o backend usem a mesma nomenclatura
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mapeamento de camelCase para snake_case
const fieldMappings = {
  userId: 'user_id',
  merchantId: 'merchant_id',
  storeId: 'store_id',
  storeName: 'store_name',
  businessHours: 'business_hours',
  companyLogo: 'company_logo',
  commissionRate: 'commission_rate',
  cashbackAmount: 'cashback_amount',
  manualAmount: 'manual_amount',
  referrerId: 'referrer_id',
  referredId: 'referred_id',
  platformFee: 'platform_fee',
  merchantCommission: 'merchant_commission',
  clientCashback: 'client_cashback',
  referralBonus: 'referral_bonus',
  minWithdrawal: 'min_withdrawal',
  maxCashbackBonus: 'max_cashback_bonus',
  updatedAt: 'updated_at',
  createdAt: 'created_at',
  updatedBy: 'updated_by',
  expiresAt: 'expires_at',
  countryCode: 'country_code',
  securityQuestion: 'security_question',
  securityAnswer: 'security_answer',
  invitationCode: 'invitation_code',
  lastLogin: 'last_login',
  totalEarned: 'total_earned',
  inventoryCount: 'inventory_count',
  transactionId: 'transaction_id',
  productId: 'product_id',
  productName: 'product_name'
};

// Arquivo a ser processado
const filePath = path.join(__dirname, 'server', 'routes.ts');

// Ler o arquivo
fs.readFile(filePath, 'utf8', (err, data) => {
  if (err) {
    console.error(`Erro ao ler o arquivo ${filePath}:`, err);
    return;
  }

  let newContent = data;

  // Substituir todos os campos camelCase pelos correspondentes snake_case
  for (const [camelCase, snakeCase] of Object.entries(fieldMappings)) {
    // Regex para encontrar o camelCase como propriedade (após um ponto ou dentro de object declarations)
    const propRegex = new RegExp(`\\.${camelCase}\\b|\\b${camelCase}\\s*:`, 'g');
    newContent = newContent.replace(propRegex, (match) => {
      if (match.startsWith('.')) {
        return `.${snakeCase}`;
      } else {
        return `${snakeCase}:`;
      }
    });
  }

  // Escrever de volta ao arquivo
  fs.writeFile(filePath, newContent, 'utf8', (err) => {
    if (err) {
      console.error(`Erro ao escrever o arquivo ${filePath}:`, err);
      return;
    }
    console.log(`Correções aplicadas em ${filePath}`);
  });
});