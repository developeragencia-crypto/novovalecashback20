import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth.tsx";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "./lib/protected-route";
import { ProtectedRouteMobile } from "./lib/protected-route-mobile";
import { AppDownload } from "@/components/ui/app-download";
import { MobileProvider } from "@/hooks/use-mobile";
import { SplashScreen } from "@/components/ui/splash-screen";
import ClientCashbacks from "@/pages/client/cashbacks";
import { MobileAppInstallPrompt } from "@/components/mobile-app-install-prompt";

// Auth Pages
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import ForgotPassword from "@/pages/auth/forgot-password";
import DownloadsPage from "@/pages/downloads";

// Client Pages
import ClientDashboard from "@/pages/client/dashboard";
import ClientTransactions from "@/pages/client/transactions";
import ClientTransfers from "@/pages/client/transfers";
import ClientQRCode from "@/pages/client/qr-code";
import ClientReferrals from "@/pages/client/referrals";
import ClientProfile from "@/pages/client/profile";
import ClientStores from "@/pages/client/stores";

// Merchant Pages
import MerchantDashboard from "@/pages/merchant/dashboard";
import MerchantSales from "@/pages/merchant/sales";
import MerchantProducts from "@/pages/merchant/products";
import MerchantScanner from "@/pages/merchant/scanner";
import MerchantCustomers from "@/pages/merchant/customers";
import MerchantProfile from "@/pages/merchant/profile";
import MerchantTransactions from "@/pages/merchant/transactions";
import MerchantTransactionManagement from "@/pages/merchant/transaction-management";
import MerchantReports from "@/pages/merchant/reports";
import MerchantSettings from "@/pages/merchant/settings";
import MerchantSupport from "@/pages/merchant/support";
import MerchantReferrals from "@/pages/merchant/referrals";
import MerchantStores from "@/pages/merchant/stores";
import MerchantWithdrawals from "@/pages/merchant/withdrawals";

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminStores from "@/pages/admin/stores";
import AdminTransactions from "@/pages/admin/transactions";
import AdminTransfers from "@/pages/admin/transfers";
import AdminWithdrawals from "@/pages/admin/withdrawals";
import AdminSettings from "@/pages/admin/settings";
import AdminLogs from "@/pages/admin/logs";
import AdminSupport from "@/pages/admin/support";
import AdminProfile from "@/pages/admin/profile";
import AdminCustomers from "@/pages/admin/customers";
import AdminMerchants from "@/pages/admin/merchants";

// Invitation Pages
import InvitePage from "@/pages/invite";

// Demo Pages
import DemoMerchantTransactionsPage from "@/pages/demo/merchant-transactions";
import DemoMerchantDashboardPage from "@/pages/demo/merchant-dashboard";
import DemoMerchantSalesPage from "@/pages/demo/merchant-sales";
import FeeExplanationPage from "@/pages/demo/fee-explanation";

// Other
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Auth Routes */}
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/auth" component={Login} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/downloads" component={DownloadsPage} />
      <Route path="/download" component={() => {
        window.location.href = "/download/";
        return null;
      }} />
      
      {/* Rotas demo não protegidas */}
      <Route path="/demo/merchant-transactions" component={DemoMerchantTransactionsPage} />
      <Route path="/demo/merchant-dashboard" component={DemoMerchantDashboardPage} />
      <Route path="/demo/merchant-sales" component={DemoMerchantSalesPage} />
      <Route path="/demo/fee-explanation" component={FeeExplanationPage} />
      
      {/* Smart Home Route - Redirects to appropriate dashboard based on user type */}
      <ProtectedRoute path="/" component={() => {
        // This is just a placeholder as the actual redirect happens in protected-route.tsx
        return <div>Redirecionando...</div>;
      }} />
      
      {/* Invitation Routes */}
      <Route path="/convite/:code" component={InvitePage} />
      <Route path="/parceiro/:code" component={InvitePage} />
      <Route path="/como/te/:code" component={InvitePage} />
      <Route path="/:anypath/:anysubpath/:code" component={InvitePage} />
      
      {/* Client Routes */}
      <ProtectedRouteMobile path="/client" component={ClientDashboard} userType="client" title="Dashboard" />
      <ProtectedRouteMobile path="/client/dashboard" component={ClientDashboard} userType="client" title="Dashboard" />
      <ProtectedRouteMobile path="/client/transactions" component={ClientTransactions} userType="client" title="Transações" />
      <ProtectedRouteMobile path="/client/transfers" component={ClientTransfers} userType="client" title="Transferências" />
      <ProtectedRouteMobile path="/client/qr-code" component={ClientQRCode} userType="client" title="QR Code" />
      <ProtectedRouteMobile path="/client/referrals" component={ClientReferrals} userType="client" title="Indicações" />
      <ProtectedRouteMobile path="/client/profile" component={ClientProfile} userType="client" title="Meu Perfil" />
      <ProtectedRouteMobile path="/client/stores" component={ClientStores} userType="client" title="Lojas" />
      <ProtectedRouteMobile path="/client/cashbacks" component={ClientCashbacks} userType="client" title="Cashback" />
      
      {/* Merchant Routes */}
      <ProtectedRouteMobile path="/merchant" component={MerchantDashboard} userType="merchant" title="Dashboard" />
      <ProtectedRouteMobile path="/merchant/dashboard" component={MerchantDashboard} userType="merchant" title="Dashboard" />
      <ProtectedRouteMobile path="/merchant/sales" component={MerchantSales} userType="merchant" title="Vendas" />
      <ProtectedRouteMobile path="/merchant/products" component={MerchantProducts} userType="merchant" title="Produtos" />
      <ProtectedRouteMobile path="/merchant/scanner" component={MerchantScanner} userType="merchant" title="Scanner" />
      <ProtectedRouteMobile path="/merchant/customers" component={MerchantCustomers} userType="merchant" title="Clientes" />
      <ProtectedRouteMobile path="/merchant/profile" component={MerchantProfile} userType="merchant" title="Meu Perfil" />
      <ProtectedRouteMobile path="/merchant/transactions" component={MerchantTransactions} userType="merchant" title="Transações" />
      <ProtectedRouteMobile path="/merchant/transaction-management" component={MerchantTransactionManagement} userType="merchant" title="Gestão de Transações" />
      <ProtectedRouteMobile path="/merchant/reports" component={MerchantReports} userType="merchant" title="Relatórios" />
      <ProtectedRouteMobile path="/merchant/settings" component={MerchantSettings} userType="merchant" title="Configurações" />
      <ProtectedRouteMobile path="/merchant/support" component={MerchantSupport} userType="merchant" title="Suporte" />
      <ProtectedRouteMobile path="/merchant/referrals" component={MerchantReferrals} userType="merchant" title="Indicações" />
      <ProtectedRouteMobile path="/merchant/stores" component={MerchantStores} userType="merchant" title="Minhas Lojas" />
      <ProtectedRouteMobile path="/merchant/withdrawals" component={MerchantWithdrawals} userType="merchant" title="Solicitar Saque" />
      
      {/* Admin Routes */}
      <ProtectedRouteMobile path="/admin" component={AdminDashboard} userType="admin" title="Dashboard" />
      <ProtectedRouteMobile path="/admin/dashboard" component={AdminDashboard} userType="admin" title="Dashboard" />
      <ProtectedRouteMobile path="/admin/users" component={AdminUsers} userType="admin" title="Usuários" />
      <ProtectedRouteMobile path="/admin/customers" component={AdminCustomers} userType="admin" title="Clientes" />
      <ProtectedRouteMobile path="/admin/merchants" component={AdminMerchants} userType="admin" title="Lojistas" />
      <ProtectedRouteMobile path="/admin/stores" component={AdminStores} userType="admin" title="Lojas" />
      <ProtectedRouteMobile path="/admin/transactions" component={AdminTransactions} userType="admin" title="Transações" />
      <ProtectedRouteMobile path="/admin/transfers" component={AdminTransfers} userType="admin" title="Transferências" />
      <ProtectedRouteMobile path="/admin/withdrawals" component={AdminWithdrawals} userType="admin" title="Solicitações de Saque" />
      <ProtectedRouteMobile path="/admin/settings" component={AdminSettings} userType="admin" title="Configurações" />
      <ProtectedRouteMobile path="/admin/logs" component={AdminLogs} userType="admin" title="Logs e Auditoria" />
      <ProtectedRouteMobile path="/admin/support" component={AdminSupport} userType="admin" title="Suporte" />
      <ProtectedRouteMobile path="/admin/profile" component={AdminProfile} userType="admin" title="Meu Perfil" />
      
      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);
  
  // Sempre mostra o splash screen para teste
  useEffect(() => {
    // Forçar a exibição do splash sempre (temporariamente)
    console.log("Exibindo splash screen");
    // Para usar apenas na primeira visita, descomentar o código abaixo:
    /*
    const hasSeenSplash = localStorage.getItem('has_seen_splash');
    if (hasSeenSplash) {
      setShowSplash(false);
    } else {
      // Marca como visto para sessões futuras
      localStorage.setItem('has_seen_splash', 'true');
    }
    */
  }, []);

  const handleSplashFinish = () => {
    setShowSplash(false);
  };
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider>
          <MobileProvider>
            <TooltipProvider>
              <Toaster />
              {showSplash ? (
                <SplashScreen onFinish={handleSplashFinish} duration={3000} />
              ) : (
                <>
                  <Router />
                  <AppDownload />
                  <MobileAppInstallPrompt />
                </>
              )}
            </TooltipProvider>
          </MobileProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
