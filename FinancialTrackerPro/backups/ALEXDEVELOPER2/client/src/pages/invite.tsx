import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { LogoIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RefreshCw, UserPlus, Store, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAuth } from "@/hooks/use-auth";

// Validação dos formulários com Zod
const clientSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
  phone: z.string().min(10, "Telefone inválido"),
  referralCode: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

const merchantSchema = z.object({
  name: z.string().min(3, "O nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string(),
  phone: z.string().min(10, "Telefone inválido"),
  storeName: z.string().min(3, "O nome da loja deve ter pelo menos 3 caracteres"),
  storeType: z.string().min(3, "Selecione o tipo de estabelecimento"),
  cnpj: z.string().min(14, "CNPJ inválido"),
  referralCode: z.string().optional(),
}).refine(data => data.password === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export default function InvitePage() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, userType } = useAuth();
  const { toast } = useToast();
  const [referralType, setReferralType] = useState<"client" | "merchant">("client");
  const [referralCode, setReferralCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [referrerName, setReferrerName] = useState<string | null>(null);
  
  // Se já estiver autenticado, redireciona para a página inicial apropriada
  useEffect(() => {
    if (isAuthenticated) {
      if (userType === "client") {
        setLocation("/client/dashboard");
      } else if (userType === "merchant") {
        setLocation("/merchant/dashboard");
      } else if (userType === "admin") {
        setLocation("/admin/dashboard");
      }
    }
  }, [isAuthenticated, userType, setLocation]);
  
  // Extrai o código de referência da URL
  useEffect(() => {
    if (loading === false) return; // Previne múltiplas execuções se o estado de loading já foi definido
    
    // Procurando por código de referência em qualquer parte da URL
    // Exemplos: /convite/CL0005, /como/te/CL0005, ou qualquer outra variação
    const pathParts = location.split('/').filter(part => part.trim() !== '');
    
    console.log("Checking URL parts for referral code:", pathParts);
    
    // Verifica se a URL é explicitamente de formato "/como/te/CL0005"
    // Tratamos isto como prioridade máxima
    if (pathParts.length >= 3 && pathParts[0] === "como" && pathParts[1] === "te") {
      const code = pathParts[2];
      console.log("Checking code in /como/te/ format:", code);
      
      if (code.match(/^CL[0-9]+$/i)) {
        console.log("Found client referral code in '/como/te/' format:", code);
        setReferralType("client");
        setReferralCode(code);
        setLoading(false);
        return;
      } else if (code.match(/^LJ[0-9]+$/i)) {
        console.log("Found merchant referral code in '/como/te/' format:", code);
        setReferralType("merchant");
        setReferralCode(code);
        setLoading(false);
        return;
      }
    }
    
    // Verifica se é uma URL de rota específica: /client/referrals ou /merchant/referrals
    if (pathParts.length >= 2) {
      // Rota de lojistas
      if (pathParts[0] === "merchant" && pathParts[1] === "referrals") {
        console.log("User came from merchant referrals page");
        setReferralType("merchant");
        
        // Se tiver um código específico na URL como /merchant/referrals/LJ0001
        if (pathParts.length >= 3 && pathParts[2].match(/^LJ[0-9]+$/i)) {
          setReferralCode(pathParts[2]);
          setLoading(false);
          return;
        } else {
          // Caso contrário, buscar o primeiro lojista do sistema como referência padrão
          fetch("/api/merchants/first")
            .then(res => {
              if (res.ok) return res.json();
              throw new Error("Erro ao buscar lojista padrão");
            })
            .then(data => {
              if (data && data.referralCode) {
                console.log("Setting default merchant referral code:", data.referralCode);
                setReferralCode(data.referralCode);
                
                // Atualizamos também o estado global do convite
                queryClient.setQueryData(['/api/invite', data.referralCode], {
                  referrerId: data.referrerId,
                  referrerName: data.inviterName,
                  referrerType: data.inviterType,
                  referralCode: data.referralCode
                });
              }
              setLoading(false);
            })
            .catch(err => {
              console.error("Error fetching default merchant:", err);
              setLoading(false);
            });
          return;
        }
      }
      
      // Rota de clientes
      else if (pathParts[0] === "client" && pathParts[1] === "referrals") {
        console.log("User came from client referrals page");
        setReferralType("client");
        
        // Se tiver um código específico na URL
        if (pathParts.length >= 3 && pathParts[2].match(/^CL[0-9]+$/i)) {
          setReferralCode(pathParts[2]);
          setLoading(false);
          return;
        } else {
          // Buscar o primeiro cliente como referência padrão
          fetch("/api/clients/first")
            .then(res => {
              if (res.ok) return res.json();
              throw new Error("Erro ao buscar cliente padrão");
            })
            .then(data => {
              if (data && data.referralCode) {
                console.log("Setting default client referral code:", data.referralCode);
                setReferralCode(data.referralCode);
                
                // Atualizamos também o estado global do convite
                queryClient.setQueryData(['/api/invite', data.referralCode], {
                  referrerId: data.referrerId,
                  referrerName: data.inviterName,
                  referrerType: data.inviterType,
                  referralCode: data.referralCode
                });
              }
              setLoading(false);
            })
            .catch(err => {
              console.error("Error fetching default client:", err);
              setLoading(false);
            });
          return;
        }
      }
    }
    
    // Procura por códigos de referência em qualquer segmento da URL
    for (const part of pathParts) {
      // Verifica se é um código de referência de cliente
      if (part.match(/^CL[0-9]+$/i)) {
        console.log("Found client referral code:", part);
        setReferralType("client");
        setReferralCode(part);
        setLoading(false);
        return;
      } 
      // Verifica se é um código de referência de lojista
      else if (part.match(/^LJ[0-9]+$/i)) {
        console.log("Found merchant referral code:", part);
        setReferralType("merchant");
        setReferralCode(part);
        setLoading(false);
        return;
      }
    }
    
    // Se chegarmos aqui, finalmente verificamos se há um ID numérico na URL
    if (pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1];
      if (lastPart.match(/^[0-9]+$/)) {
        console.log("Found numeric ID in URL:", lastPart);
        // Vamos buscar o tipo de usuário e código de convite com base no ID
        fetch(`/api/user/${lastPart}/invitecode`)
          .then(res => {
            if (res.ok) return res.json();
            throw new Error("Failed to fetch user invitation code");
          })
          .then(data => {
            if (data && data.invitationCode) {
              console.log("Retrieved invitation code:", data.invitationCode);
              if (data.invitationCode.startsWith("CL")) {
                setReferralType("client");
              } else if (data.invitationCode.startsWith("LJ")) {
                setReferralType("merchant");
              }
              setReferralCode(data.invitationCode);
            }
            setLoading(false);
          })
          .catch(err => {
            console.error("Error fetching invitation code:", err);
            setLoading(false);
          });
        return;
      }
    }
    
    // Se não detectou nenhum código, define um padrão
    setReferralType("client"); // Define cliente como tipo padrão
    setLoading(false);
  }, [location, loading]);
  
  // Formulário para cliente
  const clientForm = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      referralCode: referralCode
    }
  });
  
  // Formulário para lojista
  const merchantForm = useForm<z.infer<typeof merchantSchema>>({
    resolver: zodResolver(merchantSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      storeName: "",
      storeType: "",
      cnpj: "",
      referralCode: referralCode
    }
  });
  
  // Atualiza o valor do código de referência nos formulários quando ele muda
  useEffect(() => {
    clientForm.setValue("referralCode", referralCode);
    merchantForm.setValue("referralCode", referralCode);
  }, [referralCode]);
  
  // Mutation para cadastro de cliente
  const clientRegisterMutation = useMutation({
    mutationFn: async (data: z.infer<typeof clientSchema>) => {
      try {
        const res = await fetch("/api/register/client", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...data,
            referralInfo: inviteData ? {
              referrerId: inviteData.referrerId,
              referralCode: inviteData.referralCode
            } : undefined
          }),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Erro ao realizar o cadastro");
        }
        
        return await res.json();
      } catch (error) {
        console.error("Erro no cadastro de cliente:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Registra o sucesso no console para facilitar o debug
      console.log("Cadastro cliente concluído com sucesso, preparando redirecionamento para /auth");
      
      // Mostra a mensagem de sucesso com um botão para ir para a página de login
      toast({
        title: "Cadastro realizado com sucesso!",
        description: (
          <div className="flex flex-col gap-2">
            <p>Você será redirecionado para a página de login em alguns instantes.</p>
            <Button 
              variant="outline" 
              className="mt-2" 
              onClick={() => window.location.href = "/auth"}
            >
              Ir para página de login agora
            </Button>
          </div>
        ),
        variant: "default",
        duration: 5000 // Aumenta a duração para dar tempo de clicar no botão
      });
      
      // Redirecionamento automático para a página de login
      setTimeout(() => {
        console.log("Executando redirecionamento automatico para /auth");
        window.location.href = "/auth"; // Usamos window.location em vez de setLocation
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Ocorreu um erro ao realizar o cadastro. Tente novamente.",
        variant: "destructive",
      });
    }
  });
  
  // Mutation para cadastro de lojista
  const merchantRegisterMutation = useMutation({
    mutationFn: async (data: z.infer<typeof merchantSchema>) => {
      try {
        const res = await fetch("/api/register/merchant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...data,
            referralInfo: inviteData ? {
              referrerId: inviteData.referrerId,
              referralCode: inviteData.referralCode
            } : undefined
          }),
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.message || "Erro ao realizar o cadastro");
        }
        
        return await res.json();
      } catch (error) {
        console.error("Erro no cadastro de lojista:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      // Registra o sucesso no console para facilitar o debug
      console.log("Cadastro lojista concluído com sucesso, preparando redirecionamento para /auth");
      
      // Mostra a mensagem de sucesso com um botão para ir para a página de login
      toast({
        title: "Cadastro realizado com sucesso!",
        description: (
          <div className="flex flex-col gap-2">
            <p>Seu cadastro será analisado e você receberá um email com as próximas instruções.</p>
            <p>Você será redirecionado para a página de login em alguns instantes.</p>
            <Button 
              variant="outline" 
              className="mt-2" 
              onClick={() => window.location.href = "/auth"}
            >
              Ir para página de login agora
            </Button>
          </div>
        ),
        variant: "default",
        duration: 5000 // Aumenta a duração para dar tempo de clicar no botão
      });
      
      // Redirecionamento automático para a página de login
      setTimeout(() => {
        console.log("Executando redirecionamento automatico para /auth");
        window.location.href = "/auth"; // Usamos window.location em vez de setLocation
      }, 3000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Ocorreu um erro ao realizar o cadastro. Tente novamente.",
        variant: "destructive",
      });
    }
  });
  
  // Tipos de estabelecimento para o select
  const storeTypes = [
    { value: "restaurant", label: "Restaurante" },
    { value: "supermarket", label: "Supermercado" },
    { value: "clothing", label: "Loja de Roupas" },
    { value: "pharmacy", label: "Farmácia" },
    { value: "electronics", label: "Eletrônicos" },
    { value: "furniture", label: "Móveis" },
    { value: "beauty", label: "Salão de Beleza" },
    { value: "other", label: "Outro" }
  ];
  
  // Consulta para obter informações do convite
  const { data: inviteData, isLoading: isLoadingInvite } = useQuery({
    queryKey: ['/api/invite', referralCode],
    queryFn: async () => {
      if (!referralCode) return null;
      
      try {
        console.log("Verificando informações do convite com código:", referralCode);
        const res = await fetch(`/api/invite/${referralCode}`);
        if (!res.ok) {
          const errorData = await res.json();
          console.warn("Erro ao verificar convite:", errorData);
          throw new Error(errorData.message || 'Código de convite inválido');
        }
        const data = await res.json();
        
        console.log("Dados de referência obtidos:", data);
        
        // Armazena o nome do referenciador quando os dados são carregados
        if (data && data.referrerName) {
          console.log("Referenciador encontrado:", data.referrerName);
          setReferrerName(data.referrerName);
        }
        
        return data;
      } catch (error) {
        console.error('Erro ao verificar convite:', error);
        // Mesmo com erro, ainda tenta usar o código de referência
        return {
          referralCode: referralCode,
          // Campos vazios que serão preenchidos pelo servidor
          referrerId: null,
          referrerName: null
        };
      }
    },
    enabled: !!referralCode,
    retry: 2, // Aumenta o número de tentativas para garantir
    staleTime: 60000 // Mantém os dados por 1 minuto
  });

  // Funções para submissão dos formulários
  const onClientSubmit = (data: z.infer<typeof clientSchema>) => {
    console.log("Cliente se cadastrando com dados:", data);
    console.log("Código de referência:", data.referralCode);
    console.log("Dados de convite:", inviteData);
    
    // Garantimos que o formulário incluirá os dados corretos de referência
    const formData = {
      ...data,
      // Adicionamos os dados do referenciador como propriedades extras
      // que serão processadas no backend
      referralInfo: inviteData ? {
        referrerId: inviteData.referrerId,
        referralCode: inviteData.referralCode
      } : data.referralCode ? {
        referralCode: data.referralCode
      } : undefined
    };

    console.log("Enviando dados de cadastro:", formData);
    clientRegisterMutation.mutate(formData as any);
  };
  
  const onMerchantSubmit = (data: z.infer<typeof merchantSchema>) => {
    console.log("Lojista se cadastrando com dados:", data);
    console.log("Código de referência:", data.referralCode);
    console.log("Dados de convite:", inviteData);
    
    const formData = {
      ...data,
      // Adicionamos os dados do referenciador como propriedades extras
      referralInfo: inviteData ? {
        referrerId: inviteData.referrerId,
        referralCode: inviteData.referralCode
      } : data.referralCode ? {
        referralCode: data.referralCode
      } : undefined
    };

    console.log("Enviando dados de cadastro:", formData);
    merchantRegisterMutation.mutate(formData as any);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center">
          <a href="/" className="flex items-center">
            <LogoIcon className="h-10 w-10" />
            <span className="ml-2 text-xl font-bold">Vale Cashback</span>
          </a>
          <nav className="ml-auto flex gap-4">
            <Button variant="outline" onClick={() => setLocation("/auth")}>Entrar</Button>
          </nav>
        </div>
      </header>
      
      <main className="flex-1 container py-10">
        <div className="mx-auto max-w-[800px]">
          <Card className="border-2 border-primary/10 shadow-lg">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                {referralType === "client" 
                  ? "Cadastre-se usando código de indicação" 
                  : "Torne-se um parceiro Vale Cashback"}
              </CardTitle>
              <CardDescription className="text-lg">
                {referrerName ? (
                  <span className="flex flex-col items-center space-y-2">
                    <strong className="text-primary font-medium">
                      Você foi convidado(a) por {referrerName}
                    </strong>
                    <span className="text-sm">
                      {referralType === "client"
                        ? `Código de indicação: ${referralCode}`
                        : `Código de parceiro: ${referralCode}`}
                    </span>
                    <div className="w-full max-w-md h-1 bg-primary/10 rounded-full mt-2">
                      <div className="h-1 bg-primary rounded-full" style={{ width: '100%' }}></div>
                    </div>
                  </span>
                ) : (
                  <span>
                    {referralType === "client"
                      ? `Você foi convidado(a) com o código ${referralCode}. Complete seu cadastro abaixo.`
                      : `Você foi convidado(a) a ser parceiro com o código ${referralCode}. Complete seu cadastro abaixo.`}
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {referralType === "client" ? (
                // Formulário para cliente
                <Form {...clientForm}>
                  <form onSubmit={clientForm.handleSubmit(onClientSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField
                        control={clientForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome Completo</FormLabel>
                            <FormControl>
                              <Input placeholder="Seu nome completo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={clientForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="seu.email@exemplo.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={clientForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input placeholder="(11) 98765-4321" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={clientForm.control}
                        name="referralCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código de Indicação</FormLabel>
                            <FormControl>
                              <Input readOnly {...field} />
                            </FormControl>
                            <FormDescription>
                              Código de quem te convidou
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={clientForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="******" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={clientForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar Senha</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="******" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Alert className="bg-primary/5 border-primary/20">
                      <UserPlus className="h-5 w-5 text-primary" />
                      <AlertTitle className="text-primary font-semibold">Programa de Indicação</AlertTitle>
                      <AlertDescription className="text-slate-700">
                        Ao se cadastrar usando um código de indicação, você recebe <span className="font-medium text-primary">$10.00</span> em cashback para usar em sua primeira compra. Além disso, poderá receber até <span className="font-medium text-primary">2%</span> de cashback adicional em todas as compras.
                      </AlertDescription>
                    </Alert>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={clientRegisterMutation.isPending}
                    >
                      {clientRegisterMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : "Criar Conta"}
                    </Button>
                  </form>
                </Form>
              ) : (
                // Formulário para lojista
                <Form {...merchantForm}>
                  <form onSubmit={merchantForm.handleSubmit(onMerchantSubmit)} className="space-y-6">
                    <div className="grid md:grid-cols-2 gap-6">
                      <FormField
                        control={merchantForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Responsável</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome completo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={merchantForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="contato@loja.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={merchantForm.control}
                        name="storeName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da Loja</FormLabel>
                            <FormControl>
                              <Input placeholder="Nome do estabelecimento" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={merchantForm.control}
                        name="storeType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de Estabelecimento</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {storeTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={merchantForm.control}
                        name="cnpj"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CNPJ</FormLabel>
                            <FormControl>
                              <Input placeholder="XX.XXX.XXX/0001-XX" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={merchantForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone</FormLabel>
                            <FormControl>
                              <Input placeholder="(11) 98765-4321" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={merchantForm.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="******" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={merchantForm.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Confirmar Senha</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="******" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={merchantForm.control}
                        name="referralCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Código de Indicação</FormLabel>
                            <FormControl>
                              <Input readOnly {...field} />
                            </FormControl>
                            <FormDescription>
                              Código de quem te convidou
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <Alert className="bg-blue-50 border-blue-200">
                      <Store className="h-5 w-5 text-blue-600" />
                      <AlertTitle className="text-blue-600 font-semibold">Programa de Parceria</AlertTitle>
                      <AlertDescription className="text-slate-700">
                        Ao se cadastrar como parceiro, você poderá oferecer cashback aos seus clientes e aumentar suas vendas. Receba <span className="font-medium text-blue-600">$25.00</span> de bônus para utilizar na plataforma e atraia mais clientes para seu negócio.
                      </AlertDescription>
                    </Alert>
                    
                    <Alert variant="destructive" className="bg-red-50 border-red-200">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <AlertTitle className="text-red-600 font-semibold">Aprovação imediata</AlertTitle>
                      <AlertDescription className="text-slate-700">
                        Seu cadastro será aprovado automaticamente. Você receberá um email com instruções de acesso e poderá começar a usar a plataforma imediatamente após o cadastro.
                      </AlertDescription>
                    </Alert>
                    
                    <Button 
                      type="submit" 
                      className="w-full" 
                      disabled={merchantRegisterMutation.isPending}
                    >
                      {merchantRegisterMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Processando...
                        </>
                      ) : "Criar Conta de Parceiro"}
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
            <CardFooter className="flex justify-center border-t pt-6">
              <p className="text-sm text-muted-foreground">
                Já tem uma conta? <a href="/auth" className="text-primary hover:underline">Faça login</a>
              </p>
            </CardFooter>
          </Card>
        </div>
      </main>
      
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-sm text-muted-foreground md:text-base">
            &copy; {new Date().getFullYear()} Vale Cashback. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}