import React, { ReactNode, useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Home, ShoppingBag, QrCode, Users, User, Settings, LogOut, Wallet, CreditCard, Info } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';

interface MobileLayoutProps {
  children: ReactNode;
  title: string;
  hideHeader?: boolean;
}

// Definição fixa dos menus para cada tipo de usuário
const menuItems = {
  client: [
    {
      path: '/client/dashboard',
      icon: <Home className="h-6 w-6" />,
      label: 'Home'
    },
    {
      path: '/client/qr-code',
      icon: <QrCode className="h-6 w-6" />,
      label: 'QR Code'
    },
    {
      path: '/client/stores',
      icon: <ShoppingBag className="h-6 w-6" />,
      label: 'Lojas'
    },
    {
      path: '/client/transfers',
      icon: <Wallet className="h-6 w-6" />,
      label: 'Transferir'
    },
    {
      path: '/client/cashbacks',
      icon: <CreditCard className="h-6 w-6" />,
      label: 'Cashback'
    }
  ],
  merchant: [
    {
      path: '/merchant/dashboard',
      icon: <Home className="h-5 w-5" />,
      label: 'Home'
    },
    {
      path: '/merchant/sales',
      icon: <ShoppingBag className="h-5 w-5" />,
      label: 'Vendas'
    },
    {
      path: '/merchant/scanner',
      icon: <QrCode className="h-5 w-5" />,
      label: 'Scanner'
    },
    {
      path: '/merchant/transactions',
      icon: <CreditCard className="h-5 w-5" />,
      label: 'Transações'
    },
    {
      path: '/merchant/referrals',
      icon: <Users className="h-5 w-5" />,
      label: 'Indicações'
    }
  ],
  admin: [
    {
      path: '/admin/dashboard',
      icon: <Home className="h-5 w-5" />,
      label: 'Home'
    },
    {
      path: '/admin/merchants',
      icon: <ShoppingBag className="h-5 w-5" />,
      label: 'Lojistas'
    },
    {
      path: '/admin/customers',
      icon: <Users className="h-5 w-5" />,
      label: 'Clientes'
    },
    {
      path: '/admin/settings',
      icon: <Settings className="h-5 w-5" />,
      label: 'Config'
    },
    {
      path: '/admin/profile',
      icon: <User className="h-5 w-5" />,
      label: 'Perfil'
    }
  ]
};

export function MobileLayout({ children, title, hideHeader = false }: MobileLayoutProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [menuOptions, setMenuOptions] = useState<any[]>([]);

  const handleLogout = () => {
    logout();
  };

  useEffect(() => {
    // Determina qual menu usar com base no tipo de usuário
    const userType = user?.type || 'client';
    const defaultMenu = Array(5).fill({
      path: '/login',
      icon: <User className="h-5 w-5" />,
      label: 'Login'
    });
    
    // Usa o menu específico para o tipo de usuário ou o menu padrão
    const userMenu = menuItems[userType as keyof typeof menuItems] || defaultMenu;
    
    // Garante que sempre temos 5 itens de menu
    if (userMenu.length !== 5) {
      console.warn(`Menu para ${userType} não tem 5 itens. Ajustando...`);
      while (userMenu.length < 5) {
        userMenu.push({
          path: `/${userType}/profile`,
          icon: <User className="h-5 w-5" />,
          label: 'Perfil'
        });
      }
    }
    
    setMenuOptions(userMenu);
    console.log('Número de itens no menu:', userMenu.length);
  }, [user?.type]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      {!hideHeader && (
        <header className="sticky top-0 z-50 w-full border-b bg-primary text-white shadow-md">
          <div className="container py-3 flex items-center justify-between">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            <button 
              onClick={handleLogout}
              className="p-2 rounded-full hover:bg-primary-foreground/10"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className={cn(
        "flex-1 container overflow-auto px-2 max-w-full",
        hideHeader ? "pt-2 pb-4" : "py-4"
      )}>
        {children}
      </main>

      {/* Bottom Navigation com grid fixo de 5 colunas */}
      <nav className="sticky bottom-0 border-t bg-background shadow-[0_-2px_10px_rgba(0,0,0,0.1)] w-full">
        <div className="grid grid-cols-5 w-full py-2">
          {menuOptions.slice(0, 5).map((item, index) => (
            <Link
              key={index}
              href={item.path}
              className={cn(
                "flex flex-col items-center justify-center py-1 px-1 rounded-md text-xs font-medium transition-colors",
                location === item.path 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-primary"
              )}
            >
              {item.icon}
              <span className="mt-1 truncate text-[0.65rem]">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* PWA Status Bar Color */}
      <meta name="theme-color" content="#0466c8" />
    </div>
  );
}