import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Home, 
  CreditCard, 
  Receipt, 
  Users, 
  Settings, 
  Store, 
  QrCode,
  BarChart3,
  Wallet,
  Gift,
  UserPlus,
  ShoppingBag,
  TrendingUp,
  FileText,
  Shield,
  LogOut,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Smartphone,
  ArrowLeftRight
} from "lucide-react";

interface NavigationItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  description?: string;
  children?: NavigationItem[];
}

export function SidebarNavigation() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const toggleSection = (title: string) => {
    setExpandedSections(prev => 
      prev.includes(title) 
        ? prev.filter(item => item !== title)
        : [...prev, title]
    );
  };

  // Navegação para Clientes
  const clientNavigation: NavigationItem[] = [
    {
      title: "Dashboard",
      href: "/client/dashboard",
      icon: <Home className="h-5 w-5" />,
      description: "Visão geral da conta"
    },
    {
      title: "Transações",
      href: "/client/transactions",
      icon: <Receipt className="h-5 w-5" />,
      description: "Histórico de compras"
    },
    {
      title: "Cashback",
      href: "/client/cashbacks",
      icon: <DollarSign className="h-5 w-5" />,
      description: "Seus ganhos"
    },
    {
      title: "QR Code",
      href: "/client/qr-code",
      icon: <QrCode className="h-5 w-5" />,
      description: "Pagar com QR"
    },
    {
      title: "Scanner",
      href: "/client/scanner",
      icon: <Smartphone className="h-5 w-5" />,
      description: "Escanear códigos"
    },
    {
      title: "Transferências",
      href: "/client/transfers",
      icon: <ArrowLeftRight className="h-5 w-5" />,
      description: "Enviar e receber"
    },
    {
      title: "Indicações",
      href: "/client/referrals",
      icon: <UserPlus className="h-5 w-5" />,
      description: "Convide amigos"
    },
    {
      title: "Lojas",
      href: "/client/stores",
      icon: <Store className="h-5 w-5" />,
      description: "Parceiros disponíveis"
    },
    {
      title: "Perfil",
      href: "/client/profile",
      icon: <Settings className="h-5 w-5" />,
      description: "Configurações"
    }
  ];

  // Navegação para Merchants
  const merchantNavigation: NavigationItem[] = [
    {
      title: "Dashboard",
      href: "/merchant/dashboard",
      icon: <Home className="h-5 w-5" />,
      description: "Visão geral das vendas"
    },
    {
      title: "Vendas",
      href: "/merchant/sales",
      icon: <ShoppingBag className="h-5 w-5" />,
      description: "Gerenciar vendas"
    },
    {
      title: "QR Codes",
      href: "/merchant/qr-codes",
      icon: <QrCode className="h-5 w-5" />,
      description: "Gerar códigos de pagamento"
    },
    {
      title: "Transações",
      href: "/merchant/transactions",
      icon: <Receipt className="h-5 w-5" />,
      description: "Histórico de transações"
    },
    {
      title: "Clientes",
      href: "/merchant/customers",
      icon: <Users className="h-5 w-5" />,
      description: "Base de clientes"
    },
    {
      title: "Produtos",
      href: "/merchant/products",
      icon: <Gift className="h-5 w-5" />,
      description: "Catálogo de produtos"
    },
    {
      title: "Relatórios",
      href: "/merchant/reports",
      icon: <BarChart3 className="h-5 w-5" />,
      description: "Analytics e métricas"
    },
    {
      title: "Saques",
      href: "/merchant/withdrawals",
      icon: <Wallet className="h-5 w-5" />,
      description: "Solicitar saques"
    },
    {
      title: "Configurações",
      href: "/merchant/settings",
      icon: <Settings className="h-5 w-5" />,
      description: "Configurar loja"
    }
  ];

  // Navegação para Admins
  const adminNavigation: NavigationItem[] = [
    {
      title: "Dashboard",
      href: "/admin/dashboard",
      icon: <Home className="h-5 w-5" />,
      description: "Visão geral do sistema"
    },
    {
      title: "Usuários",
      href: "/admin/users",
      icon: <Users className="h-5 w-5" />,
      description: "Gerenciar usuários",
      children: [
        {
          title: "Todos os Usuários",
          href: "/admin/users",
          icon: <Users className="h-4 w-4" />
        },
        {
          title: "Clientes",
          href: "/admin/customers",
          icon: <Users className="h-4 w-4" />
        }
      ]
    },
    {
      title: "Lojistas",
      href: "/admin/merchants",
      icon: <Store className="h-5 w-5" />,
      description: "Gerenciar lojistas",
      badge: "3",
      children: [
        {
          title: "Todos os Lojistas",
          href: "/admin/merchants",
          icon: <Store className="h-4 w-4" />
        },
        {
          title: "Aprovações Pendentes",
          href: "/admin/merchants?status=pending",
          icon: <Shield className="h-4 w-4" />
        }
      ]
    },
    {
      title: "Transações",
      href: "/admin/transactions",
      icon: <Receipt className="h-5 w-5" />,
      description: "Monitorar transações"
    },
    {
      title: "Transferências",
      href: "/admin/transfers",
      icon: <ArrowLeftRight className="h-5 w-5" />,
      description: "Transferências entre usuários"
    },
    {
      title: "Saques",
      href: "/admin/withdrawals",
      icon: <Wallet className="h-5 w-5" />,
      description: "Processar solicitações",
      badge: "2"
    },
    {
      title: "Relatórios",
      href: "/admin/reports",
      icon: <BarChart3 className="h-5 w-5" />,
      description: "Analytics avançados",
      children: [
        {
          title: "Relatório Financeiro",
          href: "/admin/reports/financial",
          icon: <TrendingUp className="h-4 w-4" />
        },
        {
          title: "Relatório de Comissões",
          href: "/admin/reports/commissions",
          icon: <DollarSign className="h-4 w-4" />
        }
      ]
    },
    {
      title: "Configurações",
      href: "/admin/settings",
      icon: <Settings className="h-5 w-5" />,
      description: "Configurações do sistema",
      children: [
        {
          title: "Configurações Gerais",
          href: "/admin/settings",
          icon: <Settings className="h-4 w-4" />
        },
        {
          title: "Marca e Visual",
          href: "/admin/brand-settings",
          icon: <FileText className="h-4 w-4" />
        }
      ]
    },
    {
      title: "Logs",
      href: "/admin/logs",
      icon: <FileText className="h-5 w-5" />,
      description: "Auditoria e logs"
    }
  ];

  const getNavigation = () => {
    switch (user?.type) {
      case "client":
        return clientNavigation;
      case "merchant":
        return merchantNavigation;
      case "admin":
        return adminNavigation;
      default:
        return [];
    }
  };

  const navigation = getNavigation();

  const isActiveLink = (href: string) => {
    return location === href || location.startsWith(href + "/");
  };

  const renderNavigationItem = (item: NavigationItem, level = 0) => {
    const isActive = isActiveLink(item.href);
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedSections.includes(item.title);

    return (
      <div key={item.href} className="space-y-1">
        {hasChildren ? (
          <button
            onClick={() => toggleSection(item.title)}
            className={cn(
              "flex items-center justify-between w-full px-3 py-2 text-sm font-medium rounded-lg transition-colors",
              level > 0 ? "pl-8" : "",
              isActive
                ? "bg-[#3db54e] text-white"
                : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            )}
          >
            <div className="flex items-center gap-3">
              {item.icon}
              <span>{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="ml-auto h-5 text-xs">
                  {item.badge}
                </Badge>
              )}
            </div>
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        ) : (
          <Link href={item.href}>
            <div
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                level > 0 ? "pl-8" : "",
                isActive
                  ? "bg-[#3db54e] text-white"
                  : "text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              )}
            >
              {item.icon}
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="h-5 text-xs">
                  {item.badge}
                </Badge>
              )}
            </div>
          </Link>
        )}
        
        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {item.children?.map(child => renderNavigationItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center gap-3 p-6 border-b border-gray-200 dark:border-gray-800">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gradient-to-r from-[#3db54e] to-[#36a146] rounded-lg flex items-center justify-center text-white font-bold text-lg">
            V
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Vale Cashback
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
            {user?.type === "client" ? "Cliente" : user?.type === "merchant" ? "Lojista" : "Administrador"}
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-2">
          {navigation.map(item => renderNavigationItem(item))}
        </div>
      </nav>

      {/* User Info & Logout */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
              {user?.email}
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          className="w-full justify-start gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </div>
    </div>
  );
}