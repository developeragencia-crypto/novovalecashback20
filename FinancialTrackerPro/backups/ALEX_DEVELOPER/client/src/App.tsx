import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth.tsx";
import { ThemeProvider } from "next-themes";
import { ProtectedRoute } from "./lib/protected-route";

// Auth Pages
import Login from "@/pages/auth/login";
import Register from "@/pages/auth/register";
import ForgotPassword from "@/pages/auth/forgot-password";

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

// Admin Pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminUsers from "@/pages/admin/users";
import AdminStores from "@/pages/admin/stores";
import AdminTransactions from "@/pages/admin/transactions";
import AdminTransfers from "@/pages/admin/transfers";
import AdminSettings from "@/pages/admin/settings";
import AdminLogs from "@/pages/admin/logs";
import AdminSupport from "@/pages/admin/support";

// Invitation Pages
import InvitePage from "@/pages/invite";

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
      <ProtectedRoute path="/client" component={ClientDashboard} userType="client" />
      <ProtectedRoute path="/client/dashboard" component={ClientDashboard} userType="client" />
      <ProtectedRoute path="/client/transactions" component={ClientTransactions} userType="client" />
      <ProtectedRoute path="/client/transfers" component={ClientTransfers} userType="client" />
      <ProtectedRoute path="/client/qr-code" component={ClientQRCode} userType="client" />
      <ProtectedRoute path="/client/referrals" component={ClientReferrals} userType="client" />
      <ProtectedRoute path="/client/profile" component={ClientProfile} userType="client" />
      <ProtectedRoute path="/client/stores" component={ClientStores} userType="client" />
      
      {/* Merchant Routes */}
      <ProtectedRoute path="/merchant" component={MerchantDashboard} userType="merchant" />
      <ProtectedRoute path="/merchant/dashboard" component={MerchantDashboard} userType="merchant" />
      <ProtectedRoute path="/merchant/sales" component={MerchantSales} userType="merchant" />
      <ProtectedRoute path="/merchant/products" component={MerchantProducts} userType="merchant" />
      <ProtectedRoute path="/merchant/scanner" component={MerchantScanner} userType="merchant" />
      <ProtectedRoute path="/merchant/customers" component={MerchantCustomers} userType="merchant" />
      <ProtectedRoute path="/merchant/profile" component={MerchantProfile} userType="merchant" />
      <ProtectedRoute path="/merchant/transactions" component={MerchantTransactions} userType="merchant" />
      <ProtectedRoute path="/merchant/transaction-management" component={MerchantTransactionManagement} userType="merchant" />
      <ProtectedRoute path="/merchant/reports" component={MerchantReports} userType="merchant" />
      <ProtectedRoute path="/merchant/settings" component={MerchantSettings} userType="merchant" />
      <ProtectedRoute path="/merchant/support" component={MerchantSupport} userType="merchant" />
      <ProtectedRoute path="/merchant/referrals" component={MerchantReferrals} userType="merchant" />
      <ProtectedRoute path="/merchant/stores" component={MerchantStores} userType="merchant" />
      
      {/* Admin Routes */}
      <ProtectedRoute path="/admin" component={AdminDashboard} userType="admin" />
      <ProtectedRoute path="/admin/dashboard" component={AdminDashboard} userType="admin" />
      <ProtectedRoute path="/admin/users" component={AdminUsers} userType="admin" />
      <ProtectedRoute path="/admin/stores" component={AdminStores} userType="admin" />
      <ProtectedRoute path="/admin/transactions" component={AdminTransactions} userType="admin" />
      <ProtectedRoute path="/admin/transfers" component={AdminTransfers} userType="admin" />
      <ProtectedRoute path="/admin/settings" component={AdminSettings} userType="admin" />
      <ProtectedRoute path="/admin/logs" component={AdminLogs} userType="admin" />
      <ProtectedRoute path="/admin/support" component={AdminSupport} userType="admin" />
      
      {/* 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light">
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
