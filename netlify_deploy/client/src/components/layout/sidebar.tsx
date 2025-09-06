import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Home, 
  List, 
  CreditCard, 
  QrCode, 
  Users, 
  User, 
  Settings, 
  LogOut,
  ShoppingCart,
  Package,
  Scan,
  Store,
  BarChart,
  FileText,
  Landmark,
  History,
  Headphones,
  Menu,
  X,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth.tsx";

interface SidebarProps {
  type: "client" | "merchant" | "admin";
  userInfo: {
    name: string;
    status?: string;
    photo?: string;
    extraInfo?: string;
  };
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

export function Sidebar({ 
  type, 
  userInfo, 
  open = true, 
  onOpenChange,
  className 
}: SidebarProps) {
  const [location] = useLocation();
  const { logout } = useAuth();
  
  const clientLinks = [
    { href: "/client/dashboard", icon: <Home className="mr-2 h-5 w-5" />, label: "Dashboard" },
    { href: "/client/transactions", icon: <List className="mr-2 h-5 w-5" />, label: "Transações" },
    { href: "/client/transfers", icon: <CreditCard className="mr-2 h-5 w-5" />, label: "Transferências" },
    { href: "/client/qr-code", icon: <QrCode className="mr-2 h-5 w-5" />, label: "QR Code" },
    { href: "/client/stores", icon: <Store className="mr-2 h-5 w-5" />, label: "Lojas" },
    { href: "/client/referrals", icon: <Users className="mr-2 h-5 w-5" />, label: "Indicar Amigos" },
    { href: "/client/profile", icon: <User className="mr-2 h-5 w-5" />, label: "Perfil" },
  ];
  
  const merchantLinks = [
    { href: "/merchant/dashboard", icon: <Home className="mr-2 h-5 w-5" />, label: "Dashboard" },
    { href: "/merchant/sales", icon: <ShoppingCart className="mr-2 h-5 w-5" />, label: "Registrar Venda" },
    { href: "/merchant/transactions", icon: <List className="mr-2 h-5 w-5" />, label: "Histórico" },
    { href: "/merchant/transaction-management", icon: <FileText className="mr-2 h-5 w-5" />, label: "Gerenciar Vendas" },
    { href: "/merchant/withdrawals", icon: <Landmark className="mr-2 h-5 w-5" />, label: "Solicitar Saque" },
    { href: "/merchant/products", icon: <Package className="mr-2 h-5 w-5" />, label: "Produtos" },
    { href: "/merchant/scanner", icon: <Scan className="mr-2 h-5 w-5" />, label: "Leitor QR" },
    { href: "/merchant/stores", icon: <Store className="mr-2 h-5 w-5" />, label: "Lojas Parceiras" },
    { href: "/merchant/referrals", icon: <Users className="mr-2 h-5 w-5" />, label: "Indicações" },
    { href: "/merchant/reports", icon: <BarChart className="mr-2 h-5 w-5" />, label: "Relatórios" },
    { href: "/merchant/settings", icon: <Settings className="mr-2 h-5 w-5" />, label: "Configurações" },
    { href: "/merchant/profile", icon: <User className="mr-2 h-5 w-5" />, label: "Minha Loja" },
    { href: "/merchant/support", icon: <Headphones className="mr-2 h-5 w-5" />, label: "Suporte" },
  ];
  
  const adminLinks = [
    { href: "/admin/dashboard", icon: <Home className="mr-2 h-5 w-5" />, label: "Dashboard" },
    { href: "/admin/users", icon: <Users className="mr-2 h-5 w-5" />, label: "Usuários" },
    { href: "/admin/customers", icon: <User className="mr-2 h-5 w-5" />, label: "Clientes" },
    { href: "/admin/merchants", icon: <Store className="mr-2 h-5 w-5" />, label: "Lojistas" },
    { href: "/admin/stores", icon: <Building2 className="mr-2 h-5 w-5" />, label: "Lojas" },
    { href: "/admin/transactions", icon: <CreditCard className="mr-2 h-5 w-5" />, label: "Transações" },
    { href: "/admin/transfers", icon: <Landmark className="mr-2 h-5 w-5" />, label: "Transferências" },
    { href: "/admin/withdrawals", icon: <CreditCard className="mr-2 h-5 w-5" />, label: "Solicitações de Saque" },
    { href: "/admin/settings", icon: <Settings className="mr-2 h-5 w-5" />, label: "Configurações" },
    { href: "/admin/logs", icon: <History className="mr-2 h-5 w-5" />, label: "Logs e Auditoria" },
    { href: "/admin/support", icon: <Headphones className="mr-2 h-5 w-5" />, label: "Suporte" },
  ];
  
  const links = type === "client" 
    ? clientLinks 
    : type === "merchant" 
      ? merchantLinks 
      : adminLinks;
  
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };
  
  const sidebarClass = cn(
    "flex flex-col h-full w-64 border-r",
    {
      "bg-secondary text-white": type === "client",
      "bg-accent text-white": type === "merchant",
      "bg-primary text-white": type === "admin"
    },
    className
  );
  
  const linkClass = (active: boolean) => cn(
    "flex items-center px-4 py-2 rounded-lg transition-colors",
    {
      "hover:bg-secondary-foreground/10": type === "client",
      "hover:bg-accent-foreground/10": type === "merchant",
      "hover:bg-primary-foreground/10": type === "admin",
      "bg-white/20 font-medium": active
    }
  );
  
  return (
    <>
      {/* Mobile overlay */}
      {open && onOpenChange && (
        <div 
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => onOpenChange(false)}
        />
      )}
      
      <aside 
        className={cn(
          sidebarClass,
          "fixed inset-y-0 left-0 z-50 md:relative",
          { "translate-x-0": open, "-translate-x-full": !open },
          "transition-transform duration-200 ease-in-out md:translate-x-0"
        )}
      >
        {/* Close button for mobile */}
        {onOpenChange && (
          <div className="md:hidden p-4 flex justify-end">
            <Button 
              variant="ghost" 
              size="icon"
              className="text-white hover:bg-white/10"
              onClick={() => onOpenChange(false)}
            >
              <X size={24} />
            </Button>
          </div>
        )}
        
        {/* User info */}
        <div className="p-4 border-b border-white/10 flex items-center">
          <Avatar className="h-12 w-12 mr-3">
            <AvatarImage src={userInfo.photo} alt={userInfo.name} />
            <AvatarFallback className="bg-white/10 text-white">
              {getInitials(userInfo.name)}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{userInfo.name}</div>
            <div className="text-xs opacity-70">
              {type === "client" ? "Cliente" : type === "merchant" ? "Lojista" : "Administrador"}
              {userInfo.status && ` • ${userInfo.status}`}
            </div>
            {userInfo.extraInfo && (
              <div className="text-xs mt-1 opacity-70">{userInfo.extraInfo}</div>
            )}
          </div>
        </div>
        
        {/* Navigation */}
        <ScrollArea className="flex-1">
          <nav className="p-4">
            <ul className="space-y-2">
              {links.map((link, index) => (
                <li key={index}>
                  <Link href={link.href}>
                    <div className={linkClass(location === link.href)}>
                      {link.icon}
                      <span>{link.label}</span>
                    </div>
                  </Link>
                </li>
              ))}
              <li className="pt-4 border-t border-white/10 mt-4">
                <button
                  onClick={logout}
                  className="w-full flex items-center px-4 py-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <LogOut className="mr-2 h-5 w-5" />
                  <span>Sair</span>
                </button>
              </li>
            </ul>
          </nav>
        </ScrollArea>
      </aside>
    </>
  );
}

export function SidebarToggle({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="icon" onClick={onClick}>
      <Menu className="h-5 w-5" />
    </Button>
  );
}
