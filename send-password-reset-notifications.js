/**
 * Script para enviar notificações sobre redefinição de senha para todos os usuários cadastrados
 */
import { Pool } from '@neondatabase/serverless';
import dotenv from 'dotenv';
import ws from 'ws';

dotenv.config();

// Configurar WebSocket para Neon
const neonConfig = {
  webSocketConstructor: ws
};

async function sendPasswordResetNotifications() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ...neonConfig
  });
  
  try {
    console.log('🔄 Iniciando envio de notificações sobre redefinição de senha...');
    
    // Buscar todos os usuários cadastrados
    const usersResult = await pool.query(`
      SELECT id, name, email, type, status 
      FROM users 
      WHERE status = 'active'
      ORDER BY type, name
    `);
    
    const users = usersResult.rows;
    console.log(`📊 Encontrados ${users.length} usuários ativos no sistema`);
    
    let notificationsSent = 0;
    
    for (const user of users) {
      try {
        // Criar notificação personalizada baseada no tipo de usuário
        let title, message;
        
        switch (user.type) {
          case 'admin':
            title = 'Nova Funcionalidade: Sistema de Redefinição de Senha';
            message = 'Como administrador, você agora pode ajudar usuários com problemas de acesso. O novo sistema de redefinição de senha está disponível em /password-reset. Tokens de redefinição expiram em 1 hora e todas as ações são auditadas.';
            break;
            
          case 'merchant':
            title = 'Redefinição de Senha Disponível';
            message = 'Olá! Agora você pode redefinir sua senha facilmente se esquecer. Acesse /password-reset, insira seu email cadastrado e siga as instruções. O token será enviado como notificação no sistema e expira em 1 hora por segurança.';
            break;
            
          case 'client':
          default:
            title = 'Nova Funcionalidade: Redefinir Senha';
            message = 'Esqueceu sua senha? Não se preocupe! Agora você pode redefinir facilmente. Acesse /password-reset, digite seu email e você receberá instruções. O processo é seguro e o link expira em 1 hora.';
            break;
        }
        
        // Inserir notificação no banco
        await pool.query(`
          INSERT INTO system_notifications (user_id, type, title, message, is_read, metadata)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          user.id,
          'welcome',
          title,
          message,
          false,
          JSON.stringify({
            feature: 'password_reset',
            user_type: user.type,
            sent_at: new Date().toISOString()
          })
        ]);
        
        notificationsSent++;
        console.log(`✅ Notificação enviada para: ${user.name} (${user.email}) - ${user.type}`);
        
      } catch (error) {
        console.error(`❌ Erro ao enviar notificação para ${user.email}:`, error);
      }
    }
    
    console.log(`\n🎉 Processo concluído!`);
    console.log(`📧 ${notificationsSent} notificações enviadas com sucesso`);
    console.log(`👥 ${users.length} usuários no total`);
    
    // Estatísticas por tipo de usuário
    const stats = users.reduce((acc, user) => {
      acc[user.type] = (acc[user.type] || 0) + 1;
      return acc;
    }, {});
    
    console.log(`\n📊 Distribuição por tipo de usuário:`);
    Object.entries(stats).forEach(([type, count]) => {
      console.log(`   ${type}: ${count} usuários`);
    });
    
  } catch (error) {
    console.error('❌ Erro geral no script:', error);
  } finally {
    await pool.end();
  }
}

// Executar o script
sendPasswordResetNotifications();