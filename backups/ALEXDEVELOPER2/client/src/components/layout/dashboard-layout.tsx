import { useState } from "react";
import { Helmet } from "react-helmet";
import { useAuth } from "@/hooks/use-auth.tsx";
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
  
  const getInitials = (name: string = "") => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };
  
  const userInfo = {
    name: user?.name || "Usuário",
    photo: user?.photo,
    extraInfo: type === "merchant" ? "Taxa de comissão: 1%" : undefined
  };
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Helmet>
        <title>{title} | Vale Cashback</title>
      </Helmet>
      
      {/* Header */}
      <header className="bg-primary text-white p-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center">
          <SidebarToggle onClick={() => setSidebarOpen(!sidebarOpen)} />
          <h1 className="text-xl font-bold ml-2">Vale Cashback</h1>
        </div>
        <div className="flex items-center space-x-4">
          <NotificationBell />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photo} alt={user?.name} />
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
                  window.location.href = "/admin/settings";
                }
              }}>
                <User className="mr-2 h-4 w-4" />
                <span>Perfil</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => logout()}>
                <Logout className="mr-2 h-4 w-4" />
                <span>Sair</span>
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
            <h2 className="text-xl font-bold mb-6">{title}</h2>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
