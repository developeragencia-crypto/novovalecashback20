/**
 * Script para criar backup completo do sistema Vale Cashback
 * Inclui: dados do banco, arquivos de configuração, código fonte
 */

import fs from 'fs-extra';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

const { Pool } = pg;
dotenv.config();

async function createCompleteBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = `backup-vale-cashback-${timestamp}`;
  
  try {
    console.log('🚀 Iniciando backup completo do Vale Cashback...');
    
    // Criar diretório de backup
    await fs.ensureDir(backupDir);
    
    // 1. Backup do banco de dados
    console.log('📦 Criando backup do banco de dados...');
    await backupDatabase(backupDir);
    
    // 2. Backup dos arquivos do sistema
    console.log('📁 Copiando arquivos do sistema...');
    await backupSystemFiles(backupDir);
    
    // 3. Criar arquivo de informações do backup
    console.log('📝 Criando arquivo de informações...');
    await createBackupInfo(backupDir);
    
    console.log(`✅ Backup completo criado: ${backupDir}`);
    console.log(`📊 Backup inclui:`);
    console.log(`   - Banco de dados completo com todos os usuários`);
    console.log(`   - Código fonte completo (client + server + shared)`);
    console.log(`   - Configurações de deploy (Vercel, Docker, etc.)`);
    console.log(`   - Arquivos de migração e scripts`);
    console.log(`   - Documentação e guias`);
    
    return backupDir;
    
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error);
    throw error;
  }
}

async function backupDatabase(backupDir) {
  const dbBackupDir = path.join(backupDir, 'database');
  await fs.ensureDir(dbBackupDir);
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });
  
  try {
    // Listar todas as tabelas
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    const tables = tablesResult.rows.map(row => row.table_name);
    const backupData = {};
    
    // Backup de cada tabela
    for (const table of tables) {
      console.log(`   - Fazendo backup da tabela: ${table}`);
      const result = await pool.query(`SELECT * FROM ${table}`);
      backupData[table] = result.rows;
    }
    
    // Salvar dados em JSON
    await fs.writeJson(path.join(dbBackupDir, 'database-backup.json'), backupData, { spaces: 2 });
    
    // Criar script SQL para restauração
    let sqlScript = '-- Backup do banco de dados Vale Cashback\n';
    sqlScript += `-- Criado em: ${new Date().toISOString()}\n\n`;
    
    for (const [table, data] of Object.entries(backupData)) {
      if (data.length > 0) {
        sqlScript += `-- Dados da tabela ${table}\n`;
        sqlScript += `DELETE FROM ${table};\n`;
        
        const columns = Object.keys(data[0]);
        for (const row of data) {
          const values = columns.map(col => {
            const val = row[col];
            if (val === null) return 'NULL';
            if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
            if (val instanceof Date) return `'${val.toISOString()}'`;
            return val;
          });
          sqlScript += `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
        }
        sqlScript += '\n';
      }
    }
    
    await fs.writeFile(path.join(dbBackupDir, 'restore-database.sql'), sqlScript);
    
    console.log(`   ✅ Backup do banco concluído (${tables.length} tabelas)`);
    
  } finally {
    await pool.end();
  }
}

async function backupSystemFiles(backupDir) {
  const filesToBackup = [
    'client',
    'server', 
    'shared',
    'vercel.json',
    'drizzle.config.ts',
    'components.json',
    'tailwind.config.ts',
    'postcss.config.js',
    '.eslintrc.json',
    '.prettierrc',
    'README.md',
    'DEPLOY_GUIDE_FINAL.md',
    'SYSTEM_ANALYSIS_REPORT.md',
    'scripts'
  ];
  
  for (const file of filesToBackup) {
    const srcPath = path.join(process.cwd(), file);
    const destPath = path.join(backupDir, file);
    
    if (await fs.pathExists(srcPath)) {
      console.log(`   - Copiando: ${file}`);
      await fs.copy(srcPath, destPath, {
        filter: (src) => {
          // Excluir node_modules e arquivos temporários
          return !src.includes('node_modules') && 
                 !src.includes('.git') &&
                 !src.includes('dist') &&
                 !src.includes('.replit') &&
                 !src.endsWith('.log');
        }
      });
    }
  }
}

async function createBackupInfo(backupDir) {
  const backupInfo = {
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    system: 'Vale Cashback Pro',
    description: 'Backup completo do sistema de cashback e indicações',
    includes: [
      'Banco de dados PostgreSQL completo',
      'Código fonte React + Express + TypeScript',
      'Configurações de deploy (Vercel)',
      'Scripts de migração e utilitários',
      'Documentação técnica'
    ],
    users: {
      admin: 'admin@valecashback.com / senha123',
      merchant: 'lojista@valecashback.com / senha123', 
      client: 'cliente@valecashback.com / senha123'
    },
    deployment: {
      platform: 'Vercel',
      database: 'Neon PostgreSQL',
      environment: 'Production ready'
    },
    restore_instructions: [
      '1. Configure o banco PostgreSQL na Vercel',
      '2. Execute o script restore-database.sql',
      '3. Configure as variáveis de ambiente',
      '4. Deploy na Vercel usando vercel.json'
    ]
  };
  
  await fs.writeJson(path.join(backupDir, 'backup-info.json'), backupInfo, { spaces: 2 });
}

// Executar backup se chamado diretamente
if (require.main === module) {
  createCompleteBackup()
    .then(backupDir => {
      console.log(`\n🎉 Backup completo finalizado: ${backupDir}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Falha no backup:', error);
      process.exit(1);
    });
}

module.exports = { createCompleteBackup };