import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, RouteComponentProps } from "wouter";

interface ProtectedRouteProps {
  path: string;
  component: React.ComponentType<RouteComponentProps>;
  userType?: "client" | "merchant" | "admin" | null;
}

export function ProtectedRoute({
  path,
  component: Component,
  userType,
}: ProtectedRouteProps) {
  const { user, loading, userType: currentUserType } = useAuth();

  return (
    <Route
      path={path}
      component={(props) => {
        if (loading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        if (!user) {
          return <Redirect to="/auth/login" />;
        }
        
        // Se for a rota raiz, redirecionar para o dashboard apropriado baseado no tipo de usuário
        if (path === '/') {
          if (currentUserType === "client") {
            return <Redirect to="/client/dashboard" />;
          } else if (currentUserType === "merchant") {
            return <Redirect to="/merchant/dashboard" />;
          } else if (currentUserType === "admin") {
            return <Redirect to="/admin/dashboard" />;
          }
          
          // Fallback para caso o tipo não seja reconhecido
          return <Redirect to="/auth/login" />;
        }

        // Se um tipo específico de usuário for requerido para esta rota
        if (userType && currentUserType !== userType) {
          // Redirecionar para o dashboard apropriado
          if (currentUserType === "client") {
            return <Redirect to="/client/dashboard" />;
          } else if (currentUserType === "merchant") {
            return <Redirect to="/merchant/dashboard" />;
          } else if (currentUserType === "admin") {
            return <Redirect to="/admin/dashboard" />;
          }
          
          // Fallback
          return <Redirect to="/auth/login" />;
        }

        return <Component {...props} />;
      }}
    />
  );
}