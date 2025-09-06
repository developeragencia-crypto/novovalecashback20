/**
 * Script para criar a tabela brand_settings no banco de dados
 */
import pg from 'pg';
const { Pool } = pg;

async function createTable() {
  console.log("Iniciando script para criar a tabela brand_settings");
  
  // Verifica se a URL do banco de dados está disponível
  if (!process.env.DATABASE_URL) {
    console.error("A variável DATABASE_URL não está definida. Defina-a antes de executar este script.");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Verifica se a tabela já existe
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'brand_settings'
      );
    `;
    
    const { rows } = await pool.query(checkTableQuery);
    
    if (rows[0].exists) {
      console.log("A tabela brand_settings já existe. Pulando criação.");
    } else {
      // Cria a tabela brand_settings
      const createTableQuery = `
        CREATE TABLE brand_settings (
          id SERIAL PRIMARY KEY,
          logo_url TEXT,
          favicon_url TEXT,
          app_name TEXT NOT NULL DEFAULT 'Vale Cashback',
          primary_color TEXT NOT NULL DEFAULT '#0066B3',
          secondary_color TEXT NOT NULL DEFAULT '#FF7700',
          app_description TEXT,
          login_background_url TEXT,
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_by INTEGER REFERENCES users(id)
        );
      `;
      
      await pool.query(createTableQuery);
      console.log("Tabela brand_settings criada com sucesso!");
      
      // Insere um registro inicial
      const insertInitialRecord = `
        INSERT INTO brand_settings (
          app_name, 
          app_description
        ) VALUES (
          'Vale Cashback',
          'Aplicativo de cashback e gerenciamento de fidelidade'
        );
      `;
      
      await pool.query(insertInitialRecord);
      console.log("Registro inicial inserido na tabela brand_settings!");
    }
  } catch (error) {
    console.error("Erro ao criar tabela brand_settings:", error);
  } finally {
    await pool.end();
    console.log("Conexão com o banco de dados encerrada.");
  }
}

createTable().catch(console.error);