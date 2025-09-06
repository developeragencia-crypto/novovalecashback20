const fs = require('fs-extra');

async function createSQLRestore() {
  console.log('📝 Criando script SQL de restauração...');
  
  const backupData = await fs.readJson('backup-database/database-complete.json');
  
  let sqlScript = '-- Vale Cashback - Backup completo do banco de dados\n';
  sqlScript += `-- Criado em: ${new Date().toISOString()}\n`;
  sqlScript += '-- Total de usuários: 157 (backup ALEX26 autêntico)\n\n';
  
  // Ordem das tabelas para evitar conflitos de FK
  const tableOrder = [
    'users', 'merchants', 'stores', 'settings', 'commission_settings', 
    'brand_settings', 'referrals', 'transactions', 'transaction_items',
    'cashbacks', 'transfers', 'withdrawal_requests', 'qr_codes',
    'notifications', 'system_notifications', 'products', 'offers',
    'user_bonuses', 'audit_logs', 'password_reset_tokens', 'platform_fees'
  ];
  
  for (const table of tableOrder) {
    const data = backupData[table];
    if (data && data.length > 0) {
      sqlScript += `-- Tabela: ${table} (${data.length} registros)\n`;
      sqlScript += `TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE;\n`;
      
      const columns = Object.keys(data[0]);
      for (const row of data) {
        const values = columns.map(col => {
          const val = row[col];
          if (val === null) return 'NULL';
          if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
          if (val instanceof Date) return `'${val.toISOString()}'`;
          if (typeof val === 'boolean') return val;
          return val;
        });
        sqlScript += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
      }
      sqlScript += '\n';
    }
  }
  
  await fs.writeFile('backup-database/restore-complete.sql', sqlScript);
  console.log('✅ Script SQL criado: backup-database/restore-complete.sql');
}

createSQLRestore().catch(console.error);