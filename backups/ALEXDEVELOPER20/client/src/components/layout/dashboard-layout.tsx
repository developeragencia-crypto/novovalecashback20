import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useAuth } from "@/hooks/use-auth.tsx";
import { useTranslation } from "@/hooks/use-translation";
import { Sidebar, SidebarToggle } from "@/components/layout/sidebar";
import { User, LogOut as Logout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationBell } from "@/components/ui/notification-bell";
import { LanguageSelector } from "@/components/ui/language-selector";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  type: "client" | "merchant" | "admin";
}

export function DashboardLayout({ 
  children, 
  title, 
  type 
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  
  // Hook para atualizar o título quando o idioma muda
  useEffect(() => {
    if (title) {
      let translatedTitle = title;
      
      // Verificações específicas para títulos que são palavras comuns
      if (title === 'Referrals' || title === 'Indicações') {
        translatedTitle = t('common.Referrals');
      } else {
        // Tenta traduzir o título diretamente, ou como chave common.X, ou manter o original
        translatedTitle = 
          t(`common.${title}`) !== `common.${title}` ? t(`common.${title}`) : 
          t(title) !== title ? t(title) : 
          title;
      }
        
      document.title = `${translatedTitle} | Vale Cashback`;
    }
  }, [title, t]);
  
  const getInitials = (name: string = "") => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };
  
  // Fornecer dados de usuário padrão quando não estiver autenticado (para desenvolvimento)
  const userInfo = {
    name: user?.name || "Usuário de Teste",
    photo: user?.photo || undefined,
    extraInfo: type === "merchant" ? "Taxa de comissão: 1%" : undefined,
    status: user?.status || "active"
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>
          {t(`common.${title}`) !== `common.${title}` ? t(`common.${title}`) : 
           t(title) !== title ? t(title) : title} | Vale Cashback
        </title>
      </Helmet>
      
      {/* Header */}
      <header className="bg-primary text-white p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center">
          <SidebarToggle onClick={() => setSidebarOpen(!sidebarOpen)} />
          <div className="flex items-center">
            <img 
              src="/valecashback-logo-white-text.png" 
              alt="Vale Cashback"
              className="h-8 w-auto ml-2"
              style={{ filter: 'brightness(0) invert(1)' }}
            />
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <NotificationBell />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photo || undefined} alt={user?.name} />
                  <AvatarFallback>{getInitials(user?.name)}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user?.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => {
                if (type === "client") {
                  window.location.href = "/client/profile";
                } else if (type === "merchant") {
                  window.location.href = "/merchant/profile";
                } else {
                  window.location.href = "/admin/profile";
                }
              }}>
                <User className="mr-2 h-4 w-4" />
                <span>{t('common.profile')}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                <Logout className="mr-2 h-4 w-4" />
                <span>{t('common.logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          type={type}
          userInfo={userInfo}
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
        />
        
        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-xl font-bold mb-6">{t(title) || title}</h2>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
