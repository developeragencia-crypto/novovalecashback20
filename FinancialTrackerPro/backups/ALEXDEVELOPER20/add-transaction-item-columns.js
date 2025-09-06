/**
 * Script para adicionar os novos campos à tabela transaction_items
 */
import pkg from 'pg';
const { Client } = pkg;
import 'dotenv/config';

async function addTransactionItemFields() {
  // Criar uma conexão com o banco de dados
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Conectar ao banco de dados
    await client.connect();
    console.log('Conectado ao banco de dados PostgreSQL');

    // Verificar se as colunas já existem
    const columnsQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'transaction_items'
    `;
    const columnsResult = await client.query(columnsQuery);
    const existingColumns = columnsResult.rows.map(row => row.column_name);
    
    console.log('Colunas existentes em transaction_items:', existingColumns);

    // Adicionar a coluna user_id se não existir
    if (!existingColumns.includes('user_id')) {
      console.log('Adicionando coluna user_id...');
      await client.query(`
        ALTER TABLE transaction_items
        ADD COLUMN user_id INTEGER REFERENCES users(id)
      `);
    }

    // Adicionar a coluna item_type se não existir
    if (!existingColumns.includes('item_type')) {
      console.log('Adicionando coluna item_type...');
      await client.query(`
        ALTER TABLE transaction_items
        ADD COLUMN item_type TEXT
      `);
    }

    // Adicionar a coluna amount se não existir
    if (!existingColumns.includes('amount')) {
      console.log('Adicionando coluna amount...');
      await client.query(`
        ALTER TABLE transaction_items
        ADD COLUMN amount TEXT
      `);
    }

    // Adicionar a coluna description se não existir
    if (!existingColumns.includes('description')) {
      console.log('Adicionando coluna description...');
      await client.query(`
        ALTER TABLE transaction_items
        ADD COLUMN description TEXT
      `);
    }

    // Adicionar a coluna status se não existir
    if (!existingColumns.includes('status')) {
      console.log('Adicionando coluna status...');
      await client.query(`
        ALTER TABLE transaction_items
        ADD COLUMN status TEXT DEFAULT 'completed'
      `);
    }

    console.log('Todas as colunas foram adicionadas com sucesso à tabela transaction_items!');

  } catch (error) {
    console.error('Erro ao adicionar colunas:', error);
  } finally {
    // Fechar a conexão
    await client.end();
    console.log('Conexão com o banco de dados fechada');
  }
}

// Executar a função
addTransactionItemFields()
  .then(() => console.log('Script finalizado'))
  .catch(error => console.error('Erro no script:', error));