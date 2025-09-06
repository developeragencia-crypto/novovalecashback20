import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Lock, Bell, Shield, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";

export default function ClientProfile() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { user: authUser } = useAuth();

  // Query to get user profile data - com tratamento de erro melhorado
  const { 
    data: user, 
    isLoading, 
    isError, 
    refetch 
  } = useQuery({
    queryKey: ['/api/client/profile'],
    retry: 2, // Limitar tentativas de retry para evitar requisições infinitas
    refetchOnWindowFocus: false, // Desabilitar refresh automático no foco
    onError: (error: any) => {
      console.error("Erro ao carregar perfil:", error);
      setError(error?.message || "Não foi possível carregar seus dados de perfil.");
    }
  });

  // Dados de usuário com fallback seguro
  const userData = user ? {
    ...user,
    notifications: user.notifications || {
      email: true,
      push: true,
      marketing: false
    },
    privacy: user.privacy || {
      showBalance: true,
      showActivity: true
    }
  } : {
    id: authUser?.id || 0,
    name: authUser?.name || "Usuário",
    email: authUser?.email || "",
    photo: authUser?.photo || "",
    phone: "",
    address: "",
    city: "",
    state: "",
    notifications: {
      email: true,
      push: true,
      marketing: false
    },
    privacy: {
      showBalance: true,
      showActivity: true
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);

    // This would be an API call in a real implementation
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso."
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao atualizar o perfil. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);

    // This would be an API call in a real implementation
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso."
      });
      
      // Reset form
      const form = e.target as HTMLFormElement;
      form.reset();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao alterar a senha. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  const getInitials = (name: string = "") => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <DashboardLayout title="Perfil" type="client">
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col justify-center items-center h-64 gap-4">
          <div className="bg-destructive/10 p-3 rounded-full">
            <AlertTriangle className="h-8 w-8 text-destructive" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Erro ao carregar perfil</h3>
            <p className="text-muted-foreground mt-1">{error}</p>
            <Button 
              className="mt-4" 
              onClick={() => {
                setError(null);
                refetch();
              }}
            >
              Tentar novamente
            </Button>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="personal" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
            <TabsTrigger value="personal" className="flex items-center">
              <User className="mr-2 h-4 w-4" />
              <span>Pessoal</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center">
              <Lock className="mr-2 h-4 w-4" />
              <span>Segurança</span>
            </TabsTrigger>
            <TabsTrigger value="preferences" className="flex items-center">
              <Bell className="mr-2 h-4 w-4" />
              <span>Preferências</span>
            </TabsTrigger>
          </TabsList>

          {/* Personal Information */}
          <TabsContent value="personal">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Atualize suas informações pessoais
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleProfileUpdate}>
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0 flex flex-col items-center space-y-3">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={userData.photo} alt={userData.name} />
                        <AvatarFallback className="text-lg bg-secondary text-white">
                          {getInitials(userData.name)}
                        </AvatarFallback>
                      </Avatar>
                      <Button variant="outline" size="sm">
                        Alterar foto
                      </Button>
                    </div>
                    
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome completo</Label>
                        <Input id="name" defaultValue={userData.name} />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <Input id="email" type="email" defaultValue={userData.email} />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="phone">Telefone</Label>
                        <Input id="phone" defaultValue={userData.phone} />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="address">Endereço</Label>
                        <Input id="address" defaultValue={userData.address} />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="city">Cidade</Label>
                        <Input id="city" defaultValue={userData.city} />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="state">Estado</Label>
                        <Input id="state" defaultValue={userData.state} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button type="submit" disabled={isUpdating}>
                      {isUpdating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Salvando...
                        </>
                      ) : "Salvar alterações"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>
                  Atualize sua senha para manter sua conta segura
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handlePasswordChange} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="current-password">Senha atual</Label>
                    <Input id="current-password" type="password" required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="new-password">Nova senha</Label>
                    <Input id="new-password" type="password" required />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar nova senha</Label>
                    <Input id="confirm-password" type="password" required />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isChangingPassword}>
                      {isChangingPassword ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Alterando...
                        </>
                      ) : "Alterar senha"}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Segurança da Conta</CardTitle>
                <CardDescription>
                  Configurações adicionais de segurança
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Autenticação de dois fatores</Label>
                    <p className="text-sm text-muted-foreground">
                      Adicione uma camada extra de segurança à sua conta
                    </p>
                  </div>
                  <Button>Configurar</Button>
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="space-y-0.5">
                    <Label>Sessões ativas</Label>
                    <p className="text-sm text-muted-foreground">
                      Gerencie dispositivos conectados à sua conta
                    </p>
                  </div>
                  <Button variant="outline">Visualizar</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Preferences Settings */}
          <TabsContent value="preferences">
            <Card>
              <CardHeader>
                <CardTitle>Notificações</CardTitle>
                <CardDescription>
                  Configure como você deseja receber as notificações
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>E-mail</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações por e-mail
                    </p>
                  </div>
                  <Switch checked={userData.notifications.email} />
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="space-y-0.5">
                    <Label>Push</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba notificações push no seu dispositivo
                    </p>
                  </div>
                  <Switch checked={userData.notifications.push} />
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="space-y-0.5">
                    <Label>Marketing</Label>
                    <p className="text-sm text-muted-foreground">
                      Receba ofertas e novidades sobre o Vale Cashback
                    </p>
                  </div>
                  <Switch checked={userData.notifications.marketing} />
                </div>
              </CardContent>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Privacidade</CardTitle>
                <CardDescription>
                  Gerencie quais informações são compartilhadas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Mostrar saldo</Label>
                    <p className="text-sm text-muted-foreground">
                      Exibir seu saldo de cashback para outros usuários
                    </p>
                  </div>
                  <Switch checked={userData.privacy.showBalance} />
                </div>
                
                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="space-y-0.5">
                    <Label>Mostrar atividade</Label>
                    <p className="text-sm text-muted-foreground">
                      Permitir que outros usuários vejam suas atividades recentes
                    </p>
                  </div>
                  <Switch checked={userData.privacy.showActivity} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </DashboardLayout>
  );
}
