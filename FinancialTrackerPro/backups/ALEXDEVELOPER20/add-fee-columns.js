import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;

// Carregar variáveis de ambiente
dotenv.config();

async function addFeeColumns() {
  // Inicializar conexão com o banco de dados
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Adicionando colunas relacionadas a taxas na tabela withdrawal_requests...');
    
    // Verificar se as colunas já existem
    const checkColumns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'withdrawal_requests' 
        AND column_name IN ('fee_amount', 'net_amount', 'fee_percentage')
    `);
    
    // Se alguma das colunas já existir, não executar o script
    if (checkColumns.rows.length > 0) {
      const existingColumns = checkColumns.rows.map(row => row.column_name).join(', ');
      console.log(`As seguintes colunas já existem: ${existingColumns}`);
      console.log('Verificando valores nulos para atualizar...');
      
      // Atualizar linhas existentes
      await pool.query(`
        UPDATE withdrawal_requests
        SET fee_percentage = 5.0,
            fee_amount = CASE 
                          WHEN fee_amount IS NULL THEN amount * 0.05
                          ELSE fee_amount
                         END,
            net_amount = CASE 
                          WHEN net_amount IS NULL THEN amount * 0.95
                          ELSE net_amount
                         END
        WHERE fee_amount IS NULL OR net_amount IS NULL
      `);
      
      console.log('Valores atualizados com sucesso!');
    } else {
      // Adicionar as novas colunas
      await pool.query(`
        ALTER TABLE withdrawal_requests
        ADD COLUMN fee_amount NUMERIC,
        ADD COLUMN net_amount NUMERIC,
        ADD COLUMN fee_percentage NUMERIC
      `);
      
      console.log('Colunas adicionadas com sucesso!');
      
      // Atualizar dados existentes
      await pool.query(`
        UPDATE withdrawal_requests
        SET fee_percentage = 5.0,
            fee_amount = amount * 0.05,
            net_amount = amount * 0.95
      `);
      
      console.log('Dados existentes atualizados com sucesso!');
    }
    
    console.log('Operação concluída!');
  } catch (error) {
    console.error('Erro ao adicionar colunas:', error);
  } finally {
    await pool.end();
  }
}

// Executar a função principal
addFeeColumns();