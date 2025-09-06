import React, { ReactNode } from 'react';
import { Button } from "@/components/ui/button";
import { Menu, LogOut, User } from "lucide-react";
import { Link } from 'wouter';

interface SimpleLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
  userType?: string;
}

export function SimpleLayout({ children, title, subtitle, actions, userType }: SimpleLayoutProps) {
  const handleLogout = () => {
    // Limpar dados de autenticação e redirecionar
    localStorage.clear();
    sessionStorage.clear();
    window.location.href = '/auth/login';
  };

  const getDashboardLinks = () => {
    if (userType === 'admin') {
      return [
        { href: '/admin/dashboard', label: 'Dashboard' },
        { href: '/admin/users', label: 'Usuários' },
        { href: '/admin/reports', label: 'Relatórios' },
        { href: '/admin/settings', label: 'Configurações' },
      ];
    } else if (userType === 'merchant') {
      return [
        { href: '/merchant/dashboard', label: 'Dashboard' },
        { href: '/merchant/sales', label: 'Vendas' },
        { href: '/merchant/payment-qr', label: 'QR Code' },
        { href: '/merchant/transactions', label: 'Transações' },
      ];
    } else if (userType === 'client') {
      return [
        { href: '/client/dashboard', label: 'Dashboard' },
        { href: '/client/stores', label: 'Lojas' },
        { href: '/client/transfers', label: 'Transferir' },
        { href: '/client/cashbacks', label: 'Cashback' },
      ];
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img 
                src="/api/placeholder/32/32" 
                alt="Vale Cashback Logo" 
                className="h-8 w-8"
              />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  {title || 'Vale Cashback'}
                </h1>
                {subtitle && (
                  <p className="text-sm text-gray-600">{subtitle}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {actions}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      {userType && (
        <nav className="bg-white border-b border-gray-200 px-6 py-2">
          <div className="flex items-center gap-4">
            {getDashboardLinks().map((link) => (
              <Link key={link.href} href={link.href}>
                <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900">
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-6 py-6">
        {children}
      </main>
    </div>
  );
}