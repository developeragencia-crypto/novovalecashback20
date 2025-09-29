// Script para importar usuários via API para Netlify
// Renomeie este arquivo para import-users-to-api.cjs para rodar corretamente em projetos type: module
const fs = require('fs');
const axios = require('axios');

const API_URL = 'https://valecashback.netlify.app/.netlify/functions/register-user';
const SQL_FILE = './import_users_batch1.sql';

function parseSqlInsert(line) {
  const match = line.match(/INSERT INTO users \(([^)]+)\) VALUES \(([^)]+)\)/);
  if (!match) return null;
  const fields = match[1].split(',').map(f => f.trim());
  const values = match[2].split(',').map(v => v.trim().replace(/^'|'$/g, ''));
  const user = {};
  fields.forEach((field, i) => {
    user[field] = values[i] || null;
  });
  return user;
}

async function importUsers() {
  const lines = fs.readFileSync(SQL_FILE, 'utf8').split('\n');
  for (const line of lines) {
    if (!line.startsWith('INSERT INTO users')) continue;
    const user = parseSqlInsert(line);
    if (!user) continue;
    // Adapta para API
    const payload = {
      email: user.email,
      password: user.password,
      nome: user.name || user.username || user.first_name || '',
    };
    try {
      const res = await axios.post(API_URL, payload);
      console.log(`Usuário ${payload.email}:`, res.status, res.data);
    } catch (err) {
      console.error(`Erro ao importar ${payload.email}:`, err.response?.data || err.message);
    }
  }
}

importUsers();
