-- BACKUP COMPLETO DATABASE ALEX26
-- Financial Tracker Pro - Sistema Autêntico
-- Data: $(date '+%Y-%m-%d %H:%M:%S')

-- ESTRUTURA E DADOS DOS USUÁRIOS AUTÊNTICOS
CREATE TABLE IF NOT EXISTS users_backup AS 
SELECT * FROM users;

-- ESTRUTURA E DADOS DOS LOJISTAS
CREATE TABLE IF NOT EXISTS merchants_backup AS 
SELECT * FROM merchants;

-- ESTRUTURA E DADOS DOS PRODUTOS
CREATE TABLE IF NOT EXISTS products_backup AS 
SELECT * FROM products;

-- ESTRUTURA E DADOS DAS TRANSAÇÕES
CREATE TABLE IF NOT EXISTS transactions_backup AS 
SELECT * FROM transactions;

-- ESTRUTURA E DADOS DOS ITENS DE TRANSAÇÃO
CREATE TABLE IF NOT EXISTS transaction_items_backup AS 
SELECT * FROM transaction_items;

-- ESTRUTURA E DADOS DE CASHBACK
CREATE TABLE IF NOT EXISTS cashbacks_backup AS 
SELECT * FROM cashbacks;

-- ESTRUTURA E DADOS DE INDICAÇÕES
CREATE TABLE IF NOT EXISTS referrals_backup AS 
SELECT * FROM referrals;

-- ESTRUTURA E DADOS DE NOTIFICAÇÕES
CREATE TABLE IF NOT EXISTS notifications_backup AS 
SELECT * FROM notifications;

-- RESUMO DO BACKUP
-- Total de usuários: 142 (autênticos do financial-tracker-pro)
-- Total de transações: 35 com R$ 9.331,60
-- Total de cashback: R$ 466,58
-- Lojistas: 49 incluindo MARKPLUS
-- Clientes: 87 incluindo Alexsandro Usa Plaster
-- Administradores: 6 com credenciais funcionais
