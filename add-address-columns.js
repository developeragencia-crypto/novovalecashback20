/**
 * Script para adicionar as colunas de endereço à tabela users
 */
async function addAddressColumns() {
  try {
    const { Pool } = require('@neondatabase/serverless');
    
    // Verificar se temos a string de conexão
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL não definida');
    }
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    
    // Verificar se as colunas já existem
    const checkResult = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND (column_name = 'address' OR column_name = 'city' OR column_name = 'state')
    `);
    
    // Se todas as colunas já existem, não fazer nada
    if (checkResult.rows.length === 3) {
      console.log('Colunas de endereço já existem na tabela users');
      await pool.end();
      return;
    }
    
    // Adicionar as colunas que não existem
    const existingColumns = checkResult.rows.map(row => row.column_name);
    const columnsToAdd = [];
    
    if (!existingColumns.includes('address')) {
      columnsToAdd.push('ADD COLUMN IF NOT EXISTS address TEXT');
    }
    
    if (!existingColumns.includes('city')) {
      columnsToAdd.push('ADD COLUMN IF NOT EXISTS city TEXT');
    }
    
    if (!existingColumns.includes('state')) {
      columnsToAdd.push('ADD COLUMN IF NOT EXISTS state TEXT');
    }
    
    if (columnsToAdd.length > 0) {
      const alterQuery = `ALTER TABLE users ${columnsToAdd.join(', ')}`;
      await pool.query(alterQuery);
      console.log('Colunas de endereço adicionadas à tabela users');
    } else {
      console.log('Todas as colunas já existem');
    }
    
    await pool.end();
  } catch (error) {
    console.error('Erro ao adicionar colunas de endereço:', error);
    process.exit(1);
  }
}

addAddressColumns();