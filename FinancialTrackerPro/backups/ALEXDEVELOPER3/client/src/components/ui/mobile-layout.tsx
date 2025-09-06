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

  // Memoizamos a função de geração de menu
  useEffect(() => {
    // Se não houver usuário, use menu de login padrão
    if (!user) {
      const defaultMenu = Array(5).fill({
        path: '/login',
        icon: <User className="h-5 w-5" />,
        label: 'Login'
      });
      setMenuOptions(defaultMenu);
      return;
    }
    
    // Pega o tipo de usuário 
    const userType = user.type;
    
    // Verifica se o tipo é válido para o menuItems
    if (!userType || !menuItems[userType as keyof typeof menuItems]) {
      console.error(`Tipo de usuário inválido: ${userType}`);
      const defaultMenu = Array(5).fill({
        path: '/login',
        icon: <User className="h-5 w-5" />,
        label: 'Login'
      });
      setMenuOptions(defaultMenu);
      return;
    }
    
    // Clona as opções de menu para evitar mutações acidentais
    const userMenu = [...menuItems[userType as keyof typeof menuItems]];
    
    // Garante que sempre temos exatamente 5 itens de menu
    if (userMenu.length !== 5) {
      // Se tiver menos de 5, adiciona itens perfil até completar
      while (userMenu.length < 5) {
        userMenu.push({
          path: `/${userType}/profile`,
          icon: <User className="h-5 w-5" />,
          label: 'Perfil'
        });
      }
      // Se tiver mais de 5, remove os excedentes
      if (userMenu.length > 5) {
        userMenu.splice(5);
      }
    }
    
    // Log apenas em DEV para debugging
    if (process.env.NODE_ENV === 'development') {
      console.log(`Menu para tipo ${userType} carregado:`, userMenu);
    }
    
    setMenuOptions(userMenu);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, user?.type]); // Dependências mínimas necessárias

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      {!hideHeader && (
        <header className="sticky top-0 z-50 w-full border-b bg-primary text-white shadow-md">
          <div className="container py-2 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <img 
                src="/favicon.svg" 
                alt="Vale Cashback" 
                className="h-8 w-8"
              />
              <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            </div>
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

      {/* Bottom Navigation com grid fixo de 5 colunas e feedback visual melhorado */}
      <nav className="sticky bottom-0 border-t bg-background shadow-[0_-2px_10px_rgba(0,0,0,0.1)] w-full z-50">
        <div className="grid grid-cols-5 w-full py-2">
          {menuOptions.slice(0, 5).map((item, index) => {
            const isActive = location === item.path;
            return (
              <Link
                key={index}
                href={item.path}
                className={cn(
                  "flex flex-col items-center justify-center py-1 px-1 rounded-md text-xs font-medium transition-colors",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-primary"
                )}
              >
                <div className={cn(
                  "relative flex items-center justify-center",
                  isActive && "after:absolute after:content-[''] after:w-2 after:h-2 after:rounded-full after:-top-1 after:bg-primary"
                )}>
                  {item.icon}
                  {isActive && <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse-slow scale-150" />}
                </div>
                <span className={cn(
                  "mt-1 truncate text-[0.65rem]",
                  isActive && "font-bold"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* PWA Status Bar Color */}
      <meta name="theme-color" content="#0466c8" />
    </div>
  );
}