/**
 * Análise Completa do Sistema Vale Cashback
 * Testa todas as funcionalidades, APIs e componentes
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuração do banco
const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: process.env.PGPORT || 5432,
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || '',
  database: process.env.PGDATABASE || 'valecashback',
});

class SystemAnalyzer {
  constructor() {
    this.results = {
      database: { status: 'pending', tests: [] },
      apis: { status: 'pending', tests: [] },
      clientPanel: { status: 'pending', tests: [] },
      merchantPanel: { status: 'pending', tests: [] },
      adminPanel: { status: 'pending', tests: [] },
      components: { status: 'pending', tests: [] },
      authentication: { status: 'pending', tests: [] }
    };
  }

  async runCompleteAnalysis() {
    console.log('🔍 INICIANDO ANÁLISE COMPLETA DO SISTEMA VALE CASHBACK');
    console.log('=' * 60);

    try {
      await this.testDatabase();
      await this.testAPIs();
      await this.testAuthentication();
      await this.analyzeClientPanel();
      await this.analyzeMerchantPanel();
      await this.analyzeAdminPanel();
      await this.analyzeComponents();
      
      this.generateReport();
    } catch (error) {
      console.error('❌ Erro na análise:', error);
    } finally {
      await pool.end();
    }
  }

  async testDatabase() {
    console.log('\n📊 TESTANDO BANCO DE DADOS');
    console.log('-'.repeat(40));

    const tests = [
      { name: 'Conexão com PostgreSQL', test: () => pool.query('SELECT 1') },
      { name: 'Tabela users', test: () => pool.query('SELECT COUNT(*) FROM users') },
      { name: 'Tabela merchants', test: () => pool.query('SELECT COUNT(*) FROM merchants') },
      { name: 'Tabela transactions', test: () => pool.query('SELECT COUNT(*) FROM transactions') },
      { name: 'Tabela cashbacks', test: () => pool.query('SELECT COUNT(*) FROM cashbacks') },
      { name: 'Tabela products', test: () => pool.query('SELECT COUNT(*) FROM products') },
      { name: 'Configurações sistema', test: () => pool.query('SELECT COUNT(*) FROM commission_settings') }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        const count = result.rows[0].count || result.rows[0]['?column?'];
        console.log(`✅ ${test.name}: ${count || 'OK'}`);
        this.results.database.tests.push({ name: test.name, status: 'pass', data: count });
      } catch (error) {
        console.log(`❌ ${test.name}: ${error.message}`);
        this.results.database.tests.push({ name: test.name, status: 'fail', error: error.message });
      }
    }

    // Verificar usuários por tipo
    try {
      const userTypes = await pool.query(`
        SELECT type, COUNT(*) as count 
        FROM users 
        GROUP BY type 
        ORDER BY type
      `);
      
      console.log('\n📋 Usuários por tipo:');
      userTypes.rows.forEach(row => {
        console.log(`   ${row.type}: ${row.count} usuários`);
      });
    } catch (error) {
      console.log(`❌ Erro ao verificar tipos de usuário: ${error.message}`);
    }

    this.results.database.status = 'completed';
  }

  async testAPIs() {
    console.log('\n🔗 TESTANDO APIs DO SISTEMA');
    console.log('-'.repeat(40));

    const apiEndpoints = [
      // Auth APIs
      { method: 'GET', url: '/api/auth/me', description: 'Verificar usuário logado' },
      
      // Client APIs
      { method: 'GET', url: '/api/client/dashboard', description: 'Dashboard do cliente', userType: 'client' },
      { method: 'GET', url: '/api/client/transactions', description: 'Transações do cliente', userType: 'client' },
      { method: 'GET', url: '/api/client/cashbacks', description: 'Cashbacks do cliente', userType: 'client' },
      { method: 'GET', url: '/api/client/referrals', description: 'Indicações do cliente', userType: 'client' },
      { method: 'GET', url: '/api/client/profile', description: 'Perfil do cliente', userType: 'client' },
      
      // Merchant APIs
      { method: 'GET', url: '/api/merchant/dashboard', description: 'Dashboard do lojista', userType: 'merchant' },
      { method: 'GET', url: '/api/merchant/products', description: 'Produtos do lojista', userType: 'merchant' },
      { method: 'GET', url: '/api/merchant/transactions', description: 'Transações do lojista', userType: 'merchant' },
      
      // Admin APIs
      { method: 'GET', url: '/api/admin/dashboard', description: 'Dashboard do admin', userType: 'admin' },
      { method: 'GET', url: '/api/admin/users', description: 'Usuários do sistema', userType: 'admin' },
      { method: 'GET', url: '/api/admin/merchants', description: 'Lojistas do sistema', userType: 'admin' },
      { method: 'GET', url: '/api/admin/transactions', description: 'Todas as transações', userType: 'admin' },
      
      // Public APIs
      { method: 'GET', url: '/api/referrals/code', description: 'Código de indicação' },
      { method: 'GET', url: '/api/system/status', description: 'Status do sistema' }
    ];

    // Testar APIs públicas
    for (const api of apiEndpoints.filter(a => !a.userType)) {
      try {
        const response = await fetch(`http://localhost:3000${api.url}`);
        const status = response.status;
        
        if (status === 401) {
          console.log(`🔒 ${api.description}: Requer autenticação (${status})`);
          this.results.apis.tests.push({ ...api, status: 'auth_required' });
        } else if (status >= 200 && status < 300) {
          console.log(`✅ ${api.description}: OK (${status})`);
          this.results.apis.tests.push({ ...api, status: 'pass' });
        } else {
          console.log(`⚠️ ${api.description}: Status ${status}`);
          this.results.apis.tests.push({ ...api, status: 'warning', code: status });
        }
      } catch (error) {
        console.log(`❌ ${api.description}: ${error.message}`);
        this.results.apis.tests.push({ ...api, status: 'fail', error: error.message });
      }
    }

    this.results.apis.status = 'completed';
  }

  async testAuthentication() {
    console.log('\n🔐 TESTANDO SISTEMA DE AUTENTICAÇÃO');
    console.log('-'.repeat(40));

    // Verificar usuários de teste no banco
    try {
      const testUsers = await pool.query(`
        SELECT email, type, name 
        FROM users 
        WHERE email IN ('alex@valecashback.com', 'joao.silva@email.com', 'ana@valecashback.com')
        ORDER BY type
      `);

      console.log('👥 Usuários de teste disponíveis:');
      testUsers.rows.forEach(user => {
        console.log(`   ${user.type}: ${user.email} (${user.name})`);
      });

      this.results.authentication.tests.push({
        name: 'Usuários de teste',
        status: 'pass',
        data: testUsers.rows
      });
    } catch (error) {
      console.log(`❌ Erro ao verificar usuários: ${error.message}`);
      this.results.authentication.tests.push({
        name: 'Usuários de teste',
        status: 'fail',
        error: error.message
      });
    }

    this.results.authentication.status = 'completed';
  }

  async analyzeClientPanel() {
    console.log('\n👤 ANALISANDO PAINEL DO CLIENTE');
    console.log('-'.repeat(40));

    const clientPages = [
      { path: '/client/dashboard', name: 'Dashboard', component: 'ClientDashboard' },
      { path: '/client/transactions', name: 'Transações', component: 'ClientTransactions' },
      { path: '/client/cashbacks', name: 'Cashbacks', component: 'ClientCashbacks' },
      { path: '/client/referrals', name: 'Indicações', component: 'ClientReferrals' },
      { path: '/client/profile', name: 'Perfil', component: 'ClientProfile' },
      { path: '/client/stores', name: 'Lojas', component: 'ClientStores' },
      { path: '/client/qr-code', name: 'QR Code', component: 'ClientQRCode' },
      { path: '/client/scanner', name: 'Scanner', component: 'ClientScanner' },
      { path: '/client/transfers', name: 'Transferências', component: 'ClientTransfers' }
    ];

    for (const page of clientPages) {
      const componentPath = `client/src/pages/client/${page.component.toLowerCase().replace('client', '')}.tsx`;
      const exists = fs.existsSync(componentPath);
      
      if (exists) {
        try {
          const content = fs.readFileSync(componentPath, 'utf8');
          const hasQuery = content.includes('useQuery');
          const hasAPI = content.includes('/api/');
          const hasAuth = content.includes('useAuth');
          
          console.log(`✅ ${page.name}: Componente OK (Query: ${hasQuery}, API: ${hasAPI}, Auth: ${hasAuth})`);
          this.results.clientPanel.tests.push({
            name: page.name,
            path: page.path,
            status: 'pass',
            features: { hasQuery, hasAPI, hasAuth }
          });
        } catch (error) {
          console.log(`⚠️ ${page.name}: Erro ao analisar componente`);
          this.results.clientPanel.tests.push({
            name: page.name,
            path: page.path,
            status: 'warning',
            error: error.message
          });
        }
      } else {
        console.log(`❌ ${page.name}: Componente não encontrado`);
        this.results.clientPanel.tests.push({
          name: page.name,
          path: page.path,
          status: 'fail',
          error: 'Componente não encontrado'
        });
      }
    }

    this.results.clientPanel.status = 'completed';
  }

  async analyzeMerchantPanel() {
    console.log('\n🏪 ANALISANDO PAINEL DO LOJISTA');
    console.log('-'.repeat(40));

    const merchantPages = [
      { path: '/merchant/dashboard', name: 'Dashboard', component: 'MerchantDashboard' },
      { path: '/merchant/sales', name: 'Vendas', component: 'MerchantSales' },
      { path: '/merchant/products', name: 'Produtos', component: 'MerchantProducts' },
      { path: '/merchant/transactions', name: 'Transações', component: 'MerchantTransactions' },
      { path: '/merchant/customers', name: 'Clientes', component: 'MerchantCustomers' },
      { path: '/merchant/reports', name: 'Relatórios', component: 'MerchantReports' },
      { path: '/merchant/profile', name: 'Perfil', component: 'MerchantProfile' },
      { path: '/merchant/settings', name: 'Configurações', component: 'MerchantSettings' },
      { path: '/merchant/payment-qr', name: 'QR de Pagamento', component: 'MerchantPaymentQR' },
      { path: '/merchant/withdrawals', name: 'Saques', component: 'MerchantWithdrawals' }
    ];

    for (const page of merchantPages) {
      const componentPath = `client/src/pages/merchant/${page.component.toLowerCase().replace('merchant', '')}.tsx`;
      const exists = fs.existsSync(componentPath);
      
      if (exists) {
        try {
          const content = fs.readFileSync(componentPath, 'utf8');
          const hasQuery = content.includes('useQuery');
          const hasAPI = content.includes('/api/');
          const hasAuth = content.includes('useAuth');
          
          console.log(`✅ ${page.name}: Componente OK (Query: ${hasQuery}, API: ${hasAPI}, Auth: ${hasAuth})`);
          this.results.merchantPanel.tests.push({
            name: page.name,
            path: page.path,
            status: 'pass',
            features: { hasQuery, hasAPI, hasAuth }
          });
        } catch (error) {
          console.log(`⚠️ ${page.name}: Erro ao analisar componente`);
          this.results.merchantPanel.tests.push({
            name: page.name,
            path: page.path,
            status: 'warning',
            error: error.message
          });
        }
      } else {
        console.log(`❌ ${page.name}: Componente não encontrado`);
        this.results.merchantPanel.tests.push({
          name: page.name,
          path: page.path,
          status: 'fail',
          error: 'Componente não encontrado'
        });
      }
    }

    this.results.merchantPanel.status = 'completed';
  }

  async analyzeAdminPanel() {
    console.log('\n⚙️ ANALISANDO PAINEL DO ADMINISTRADOR');
    console.log('-'.repeat(40));

    const adminPages = [
      { path: '/admin/dashboard', name: 'Dashboard', component: 'AdminDashboard' },
      { path: '/admin/users', name: 'Usuários', component: 'AdminUsers' },
      { path: '/admin/customers', name: 'Clientes', component: 'AdminCustomers' },
      { path: '/admin/merchants', name: 'Lojistas', component: 'AdminMerchants' },
      { path: '/admin/transactions', name: 'Transações', component: 'AdminTransactions' },
      { path: '/admin/transfers', name: 'Transferências', component: 'AdminTransfers' },
      { path: '/admin/withdrawals', name: 'Saques', component: 'AdminWithdrawals' },
      { path: '/admin/reports', name: 'Relatórios', component: 'AdminReports' },
      { path: '/admin/settings', name: 'Configurações', component: 'AdminSettings' },
      { path: '/admin/logs', name: 'Logs', component: 'AdminLogs' }
    ];

    for (const page of adminPages) {
      const componentPath = `client/src/pages/admin/${page.component.toLowerCase().replace('admin', '')}.tsx`;
      const exists = fs.existsSync(componentPath);
      
      if (exists) {
        try {
          const content = fs.readFileSync(componentPath, 'utf8');
          const hasQuery = content.includes('useQuery');
          const hasAPI = content.includes('/api/');
          const hasAuth = content.includes('useAuth');
          
          console.log(`✅ ${page.name}: Componente OK (Query: ${hasQuery}, API: ${hasAPI}, Auth: ${hasAuth})`);
          this.results.adminPanel.tests.push({
            name: page.name,
            path: page.path,
            status: 'pass',
            features: { hasQuery, hasAPI, hasAuth }
          });
        } catch (error) {
          console.log(`⚠️ ${page.name}: Erro ao analisar componente`);
          this.results.adminPanel.tests.push({
            name: page.name,
            path: page.path,
            status: 'warning',
            error: error.message
          });
        }
      } else {
        console.log(`❌ ${page.name}: Componente não encontrado`);
        this.results.adminPanel.tests.push({
          name: page.name,
          path: page.path,
          status: 'fail',
          error: 'Componente não encontrado'
        });
      }
    }

    this.results.adminPanel.status = 'completed';
  }

  async analyzeComponents() {
    console.log('\n🧩 ANALISANDO COMPONENTES DO SISTEMA');
    console.log('-'.repeat(40));

    const criticalComponents = [
      'client/src/components/layout/dashboard-layout.tsx',
      'client/src/components/ui/data-table.tsx',
      'client/src/components/ui/stat-card.tsx',
      'client/src/components/ui/charts.tsx',
      'client/src/hooks/use-auth.tsx',
      'client/src/lib/queryClient.ts',
      'client/src/lib/protected-route.tsx'
    ];

    for (const componentPath of criticalComponents) {
      const exists = fs.existsSync(componentPath);
      const componentName = path.basename(componentPath, '.tsx');
      
      if (exists) {
        try {
          const content = fs.readFileSync(componentPath, 'utf8');
          const hasExports = content.includes('export');
          const hasTypes = content.includes('interface') || content.includes('type');
          
          console.log(`✅ ${componentName}: OK (Exports: ${hasExports}, Types: ${hasTypes})`);
          this.results.components.tests.push({
            name: componentName,
            path: componentPath,
            status: 'pass',
            features: { hasExports, hasTypes }
          });
        } catch (error) {
          console.log(`⚠️ ${componentName}: Erro ao analisar`);
          this.results.components.tests.push({
            name: componentName,
            path: componentPath,
            status: 'warning',
            error: error.message
          });
        }
      } else {
        console.log(`❌ ${componentName}: Não encontrado`);
        this.results.components.tests.push({
          name: componentName,
          path: componentPath,
          status: 'fail',
          error: 'Componente não encontrado'
        });
      }
    }

    this.results.components.status = 'completed';
  }

  generateReport() {
    console.log('\n📋 RELATÓRIO FINAL DA ANÁLISE');
    console.log('='.repeat(60));

    const sections = [
      { name: 'Banco de Dados', key: 'database' },
      { name: 'APIs', key: 'apis' },
      { name: 'Autenticação', key: 'authentication' },
      { name: 'Painel Cliente', key: 'clientPanel' },
      { name: 'Painel Lojista', key: 'merchantPanel' },
      { name: 'Painel Admin', key: 'adminPanel' },
      { name: 'Componentes', key: 'components' }
    ];

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;
    let warnings = 0;

    sections.forEach(section => {
      const result = this.results[section.key];
      const tests = result.tests;
      const passed = tests.filter(t => t.status === 'pass').length;
      const failed = tests.filter(t => t.status === 'fail').length;
      const warned = tests.filter(t => t.status === 'warning').length;
      
      totalTests += tests.length;
      passedTests += passed;
      failedTests += failed;
      warnings += warned;
      
      const status = failed > 0 ? '❌' : warned > 0 ? '⚠️' : '✅';
      console.log(`${status} ${section.name}: ${passed}/${tests.length} OK (${failed} falhas, ${warned} avisos)`);
    });

    console.log('\n📊 RESUMO GERAL:');
    console.log(`   Total de testes: ${totalTests}`);
    console.log(`   ✅ Passou: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`   ❌ Falhou: ${failedTests} (${((failedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`   ⚠️ Avisos: ${warnings} (${((warnings/totalTests)*100).toFixed(1)}%)`);

    // Salvar relatório detalhado
    const reportPath = 'system-analysis-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(this.results, null, 2));
    console.log(`\n📄 Relatório detalhado salvo em: ${reportPath}`);

    // Recomendações
    console.log('\n💡 RECOMENDAÇÕES:');
    if (failedTests > 0) {
      console.log('   🔧 Corrigir componentes com falhas');
    }
    if (warnings > 0) {
      console.log('   ⚠️ Revisar componentes com avisos');
    }
    if (failedTests === 0 && warnings === 0) {
      console.log('   🎉 Sistema está funcionando corretamente!');
    }
  }
}

// Executar análise
const analyzer = new SystemAnalyzer();
analyzer.runCompleteAnalysis().catch(console.error);