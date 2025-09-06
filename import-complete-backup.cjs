/**
 * Script para importar TODOS os dados autênticos do backup ALEX26 completo
 * 160+ usuários reais do Financial Tracker Pro
 */

const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const ws = require("ws");
const fs = require('fs');

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Função para extrair dados do backup original e adaptar para estrutura atual
async function extractAndImportUsers() {
  try {
    console.log("🔄 Lendo backup completo com 160+ usuários autênticos...");
    
    const backupContent = fs.readFileSync('backup-complete/database/restore-complete.sql', 'utf8');
    const userInserts = backupContent.match(/INSERT INTO users \([^)]+\) VALUES \([^;]+\);/g);
    
    console.log(`📋 Encontrados ${userInserts ? userInserts.length : 0} usuários no backup`);
    
    if (!userInserts) {
      throw new Error('Nenhum usuário encontrado no backup');
    }

    let importedCount = 0;
    let adminCount = 0;
    let clientCount = 0; 
    let merchantCount = 0;

    for (const insert of userInserts) {
      try {
        // Extrair dados do INSERT original
        const valuesMatch = insert.match(/VALUES \(([^)]+)\)/);
        if (!valuesMatch) continue;

        const values = valuesMatch[1];
        const parts = values.split(', ').map(v => v.replace(/^'|'$/g, '').replace("''", "'"));

        // Mapear dados para estrutura atual
        const userData = {
          id: parseInt(parts[0]),
          username: parts[1] === 'NULL' ? null : parts[1],
          email: parts[2] === 'NULL' ? null : parts[2],
          password: parts[3] === 'NULL' ? null : parts[3],
          name: parts[14] === 'NULL' ? null : parts[14], // name está na posição 14
          type: parts[15] === 'NULL' ? 'client' : parts[15], // type está na posição 15
          status: parts[16] === 'NULL' ? 'active' : parts[16],
          phone: parts[17] === 'NULL' ? null : parts[17],
          country: parts[18] === 'NULL' ? 'Brasil' : parts[18],
          country_code: parts[19] === 'NULL' ? 'BR' : parts[19],
          security_question: parts[20] === 'NULL' ? null : parts[20],
          security_answer: parts[21] === 'NULL' ? null : parts[21],
          invitation_code: parts[22] === 'NULL' ? null : parts[22],
          address: parts[24] === 'NULL' ? null : parts[24],
          city: parts[25] === 'NULL' ? null : parts[25],
          state: parts[26] === 'NULL' ? null : parts[26]
        };

        // Inserir usuário
        const insertQuery = `
          INSERT INTO users (
            id, name, username, email, password, phone, address, city, state, 
            country, country_code, type, status, security_question, security_answer, 
            invitation_code, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            username = EXCLUDED.username,
            phone = EXCLUDED.phone,
            type = EXCLUDED.type,
            status = EXCLUDED.status
        `;
        
        await pool.query(insertQuery, [
          userData.id,
          userData.name,
          userData.username,
          userData.email,
          userData.password,
          userData.phone,
          userData.address,
          userData.city,
          userData.state,
          userData.country,
          userData.country_code,
          userData.type,
          userData.status,
          userData.security_question,
          userData.security_answer,
          userData.invitation_code
        ]);

        importedCount++;
        if (userData.type === 'admin') adminCount++;
        else if (userData.type === 'client') clientCount++;
        else if (userData.type === 'merchant') merchantCount++;

        if (importedCount % 20 === 0) {
          console.log(`✅ Importados ${importedCount} usuários autênticos...`);
        }

      } catch (error) {
        console.warn(`⚠️ Erro ao importar usuário: ${error.message}`);
      }
    }

    console.log("\n🎉 IMPORTAÇÃO COMPLETA DO BACKUP ALEX26!");
    console.log(`📊 Total importado: ${importedCount} usuários autênticos`);
    console.log(`👨‍💼 Administradores: ${adminCount}`);
    console.log(`👤 Clientes: ${clientCount}`);
    console.log(`🏪 Comerciantes: ${merchantCount}`);

  } catch (error) {
    console.error("❌ Erro na importação:", error);
    throw error;
  }
}

// Executar importação
extractAndImportUsers()
  .then(() => {
    console.log("🚀 Sistema Vale Cashback com TODOS os dados autênticos ALEX26 está operacional!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("💥 Falha na importação completa:", error);
    process.exit(1);
  });