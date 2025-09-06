/**
 * Script para adicionar a coluna auto_apply à tabela brand_settings
 */
import 'dotenv/config';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';
import ws from 'ws';

// Configurar o WebSocket para o Neon Database
neonConfig.webSocketConstructor = ws;

async function addAutoApplyColumn() {
  try {
    // Estabelecer conexão com o banco
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    console.log("Conectado ao banco de dados");
    
    // Verificar se a coluna já existe
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'brand_settings' AND column_name = 'auto_apply'
    `);

    if (checkResult.rows.length > 0) {
      console.log("Coluna auto_apply já existe na tabela brand_settings");
      await pool.end();
      return;
    }

    // Adicionar coluna auto_apply
    await pool.query(`
      ALTER TABLE brand_settings 
      ADD COLUMN auto_apply BOOLEAN DEFAULT false
    `);
    
    console.log("Coluna auto_apply adicionada com sucesso à tabela brand_settings");
    
    // Fechar a conexão
    await pool.end();
    
  } catch (error) {
    console.error("Erro ao adicionar a coluna auto_apply:", error);
  }
}

// Executar a função
addAutoApplyColumn().then(() => {
  console.log("Processo concluído");
});

// Como este é um módulo ESM, exportamos a função
export { addAutoApplyColumn };