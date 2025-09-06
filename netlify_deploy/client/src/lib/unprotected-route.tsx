import React from "react";
import { Route, RouteComponentProps } from "wouter";
import { DashboardLayout } from "@/components/layout/dashboard-layout";

interface UnprotectedRouteProps {
  path: string;
  component: React.ComponentType<RouteComponentProps>;
  title?: string;
}

/**
 * Componente para criar rotas não protegidas com layout de dashboard
 * Usado para páginas que devem ser acessíveis sem autenticação
 */
export function UnprotectedRoute({
  path,
  component: Component,
  title = "Vale Cashback",
}: UnprotectedRouteProps) {
  return (
    <Route
      path={path}
      component={(props) => (
        <DashboardLayout title={title} type="merchant">
          <Component {...props} />
        </DashboardLayout>
      )}
    />
  );
}