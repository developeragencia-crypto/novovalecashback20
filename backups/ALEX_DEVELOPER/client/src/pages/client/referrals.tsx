import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { QRCodeDisplay } from "@/components/ui/qr-code";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import { Copy, UserPlus, Users, Percent, Share2, RefreshCw, Award, Gift, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WhatsAppIcon } from "@/components/ui/icons";
import { useAuth } from "@/hooks/use-auth";
import { SystemInfo } from "@/components/ui/system-info";
import { motion } from "framer-motion";

export default function ClientReferrals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  
  // Query para buscar informações sobre indicações do usuário
  const { data: referralsData, isLoading: isReferralsLoading, error: referralsError } = useQuery({
    queryKey: ['/api/client/referrals'],
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: false, // Evita polling infinito
    staleTime: 60000, // Dados são considerados atualizados por 1 minuto
    placeholderData: {
      referralCode: user?.invitation_code || "ABC123",
      referralUrl: `https://valecashback.com/convite/${user?.invitation_code || "ABC123"}`,
      referralsCount: 0,
      pendingReferrals: 0,
      totalEarned: "0.00",
      commission: "1.0", // Taxa de comissão - será substituída pelos dados do banco
      referrals: []
    },
    enabled: !!user // Só executa se o usuário estiver autenticado
  });
  
  // Exibir erro no console para diagnóstico
  if (referralsError) {
    console.error("Erro ao buscar dados de referência:", referralsError);
  }
  
  // Query para buscar informações sobre as taxas do sistema
  const { data: ratesSettings } = useQuery({
    queryKey: ['/api/admin/settings/rates'],
  });
  
  // Função para copiar o link de indicação
  const copyReferralLink = async () => {
    try {
      // Use a API de clipboard mais recente que funciona melhor em navegadores modernos
      if (referralsData?.referralUrl) {
        // Adiciona texto temporário à página para contornar problemas de permissão
        const textArea = document.createElement('textarea');
        textArea.value = referralsData.referralUrl;
        textArea.style.position = 'fixed';  // Fora da tela
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        // Tenta o método moderno e depois o método de fallback
        try {
          await navigator.clipboard.writeText(referralsData.referralUrl);
        } catch (err) {
          // Fallback para o método de execCommand que funciona em mais navegadores
          document.execCommand('copy');
        }
        
        // Remove o elemento temporário
        document.body.removeChild(textArea);
        
        toast({
          title: "Link copiado!",
          description: "O link de indicação foi copiado para a área de transferência.",
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Erro ao copiar link:", error);
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o link. Tente novamente ou copie manualmente.",
        variant: "destructive",
      });
    }
  };
  
  // Função para compartilhar no WhatsApp
  const shareOnWhatsApp = () => {
    const text = `Olá! Use meu código de indicação ${referralsData?.referralCode} e ganhe cashback no Vale Cashback: ${referralsData?.referralUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };
  
  // Mutation para enviar convite por email
  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; name: string }) => {
      const res = await apiRequest("POST", "/api/client/referrals/invite", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Convite enviado!",
        description: "O convite foi enviado com sucesso para o email informado.",
        variant: "default",
      });
      setEmail("");
      setName("");
      queryClient.invalidateQueries({ queryKey: ['/api/client/referrals'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar convite",
        description: error.message || "Ocorreu um erro ao enviar o convite. Tente novamente.",
        variant: "destructive",
      });
    }
  });
  
  // Estado para o formulário de convite
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  
  // Função para enviar convite
  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !name) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive",
      });
      return;
    }
    
    inviteMutation.mutate({ email, name });
  };
  
  // Colunas para a tabela de indicados
  const referralsColumns = [
    { header: "Nome", accessorKey: "name" },
    { 
      header: "Tipo", 
      accessorKey: "user_type",
      cell: (row: any) => (
        <div className="flex items-center">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.user_type === "merchant" 
              ? "bg-blue-100 text-blue-800" 
              : "bg-purple-100 text-purple-800"
          }`}>
            {row.user_type === "merchant" ? "Lojista" : "Cliente"}
          </span>
        </div>
      )
    },
    { 
      header: "Contato", 
      accessorKey: "email",
      cell: (row: any) => (
        <div className="flex flex-col text-xs">
          <span>{row.email || "Email não informado"}</span>
          <span className="text-muted-foreground">{row.phone || "Telefone não informado"}</span>
        </div>
      )
    },
    { 
      header: "Estabelecimento", 
      accessorKey: "store_name",
      cell: (row: any) => (
        <div className="flex items-center">
          {row.user_type === "merchant" ? (
            <span>{row.store_name || "Loja sem nome"}</span>
          ) : (
            <span className="text-muted-foreground text-xs">N/A</span>
          )}
        </div>
      )
    },
    { header: "Data", accessorKey: "date" },
    { 
      header: "Status", 
      accessorKey: "status",
      cell: (row: any) => (
        <div className="flex items-center">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.status === "active" 
              ? "bg-green-100 text-green-800" 
              : "bg-yellow-100 text-yellow-800"
          }`}>
            {row.status === "active" ? "Ativo" : "Pendente"}
          </span>
        </div>
      )
    },
    { 
      header: "Comissão", 
      accessorKey: "commission",
      cell: (row: any) => (
        <div className="flex items-center">
          <span className="font-medium">R$ {row.commission}</span>
        </div>
      )
    },
  ];
  
  // Se o usuário não for do tipo cliente, exiba uma mensagem de erro
  if (user?.type !== "client") {
    return (
      <DashboardLayout title="Programa de Indicações" type="client">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Acesso Restrito</CardTitle>
            <CardDescription>
              Esta página é exclusiva para clientes do Vale Cashback.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Você não tem permissão para acessar esta página. Faça login como cliente para acessar o programa de indicações.</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }
  
  // Se houver um erro na busca, exiba uma mensagem para o usuário
  if (referralsError) {
    return (
      <DashboardLayout title="Programa de Indicações" type="client">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Erro ao carregar dados</CardTitle>
            <CardDescription>
              Não foi possível carregar suas informações de indicações.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Tente recarregar a página. Se o problema persistir, entre em contato com o suporte.</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Recarregar página
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout title="Programa de Indicações" type="client">
      <div className="flex flex-col space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">
              <Users className="h-4 w-4 mr-2" />
              Visão Geral
            </TabsTrigger>
            <TabsTrigger value="invite">
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Amigos
            </TabsTrigger>
            <TabsTrigger value="list">
              <Percent className="h-4 w-4 mr-2" />
              Meus Indicados
            </TabsTrigger>
          </TabsList>
          
          {/* Aba de Visão Geral */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="overflow-hidden border-primary/20 shadow-lg hover:shadow-primary/10 transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                    <CardTitle className="flex items-center text-xl font-bold text-primary">
                      <Award className="h-5 w-5 mr-2 text-primary" />
                      Seu Código de Indicação
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Compartilhe seu código e ganhe comissões por cada novo usuário
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex justify-center pt-6">
                    <div className="flex flex-col items-center space-y-6">
                      <motion.div 
                        className="text-4xl font-bold px-8 py-4 rounded-lg bg-gradient-to-r from-primary/10 to-primary/20 text-primary shadow-inner"
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        transition={{ 
                          duration: 0.5,
                          type: "spring",
                          stiffness: 260,
                          damping: 20 
                        }}
                        whileHover={{ scale: 1.05 }}
                      >
                        {referralsData?.referralCode || "..."}
                      </motion.div>
                      <div className="flex flex-wrap gap-3">
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={copyReferralLink}
                            className="flex items-center shadow-sm transition-all border-primary/30 hover:border-primary hover:bg-primary/5"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copiar Link
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={shareOnWhatsApp}
                            className="flex items-center shadow-sm text-green-600 border-green-600 hover:bg-green-50 transition-all"
                          >
                            <WhatsAppIcon className="h-4 w-4 mr-2" />
                            Compartilhar
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col items-start space-y-2 bg-gradient-to-r from-primary/5 to-primary/10 mt-4 rounded-b-lg border-t border-primary/10">
                    <p className="text-sm">
                      Taxa de comissão: <span className="font-medium text-primary">1%</span> por indicação
                    </p>
                    <p className="text-sm">
                      Compartilhe seu código ou link de indicação com amigos e conhecidos. Quando eles se cadastrarem e realizarem compras, você receberá uma comissão de 1% sobre todas as transações deles.
                    </p>
                  </CardFooter>
                </Card>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="overflow-hidden border-primary/20 shadow-lg hover:shadow-primary/10 transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                    <CardTitle className="flex items-center text-xl font-bold text-blue-600">
                      <Gift className="h-5 w-5 mr-2 text-blue-600" />
                      Estatísticas de Ganhos
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Acompanhe seus ganhos e indicações em tempo real
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <motion.div 
                        className="flex flex-col items-center justify-center p-5 bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg shadow-sm"
                        whileHover={{ scale: 1.02, boxShadow: "0 5px 15px rgba(0,0,0,0.1)" }}
                      >
                        <span className="text-4xl font-bold text-blue-600">{referralsData?.referralsCount || 0}</span>
                        <span className="text-sm mt-1">Total de Indicados</span>
                      </motion.div>
                      <motion.div 
                        className="flex flex-col items-center justify-center p-5 bg-gradient-to-b from-purple-50 to-purple-100 rounded-lg shadow-sm"
                        whileHover={{ scale: 1.02, boxShadow: "0 5px 15px rgba(0,0,0,0.1)" }}
                      >
                        <span className="text-4xl font-bold text-purple-600">{referralsData?.pendingReferrals || 0}</span>
                        <span className="text-sm mt-1">Indicações Pendentes</span>
                      </motion.div>
                      <motion.div 
                        className="flex flex-col items-center justify-center p-6 bg-gradient-to-r from-primary/10 to-primary/20 rounded-lg shadow-sm col-span-2"
                        whileHover={{ scale: 1.02, boxShadow: "0 5px 15px rgba(0,0,0,0.1)" }}
                      >
                        <span className="text-5xl font-bold text-primary">$ {referralsData?.totalEarned || "0.00"}</span>
                        <span className="text-sm mt-2">Total Ganho</span>
                      </motion.div>
                    </div>
                  </CardContent>
                  <CardFooter className="mt-2">
                    <Alert variant="default" className="w-full border border-primary/20 bg-primary/5">
                      <UserPlus className="h-5 w-5 text-primary" />
                      <AlertTitle className="font-semibold text-primary">Ganhe mais indicando</AlertTitle>
                      <AlertDescription className="text-sm">
                        Quanto mais amigos você indicar, maiores serão seus ganhos! Cada nova indicação gera <span className="font-medium text-primary">$10.00</span> para você.
                      </AlertDescription>
                    </Alert>
                  </CardFooter>
                </Card>
              </motion.div>
            </div>
          </TabsContent>
          
          {/* Aba de Convidar Amigos */}
          <TabsContent value="invite">
            <div className="grid md:grid-cols-2 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <Card className="overflow-hidden border-primary/20 shadow-lg hover:shadow-primary/10 transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100">
                    <CardTitle className="flex items-center text-xl font-bold text-purple-600">
                      <UserPlus className="h-5 w-5 mr-2 text-purple-600" />
                      Convidar por E-mail
                    </CardTitle>
                    <CardDescription>
                      Envie um convite diretamente para seus amigos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <form onSubmit={handleInvite} className="space-y-5">
                      <motion.div 
                        className="space-y-2"
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      >
                        <Label htmlFor="name" className="text-sm font-medium">Nome do Amigo</Label>
                        <Input 
                          id="name" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Digite o nome do seu amigo" 
                          className="transition-all border-purple-200 focus:border-purple-400 focus:ring-purple-300"
                        />
                      </motion.div>
                      <motion.div 
                        className="space-y-2"
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
                      >
                        <Label htmlFor="email" className="text-sm font-medium">E-mail</Label>
                        <Input 
                          id="email" 
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)} 
                          placeholder="Digite o e-mail do seu amigo" 
                          className="transition-all border-purple-200 focus:border-purple-400 focus:ring-purple-300"
                        />
                      </motion.div>
                      <motion.div
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.2 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button 
                          type="submit" 
                          className="w-full bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md"
                          disabled={inviteMutation.isPending}
                        >
                          {inviteMutation.isPending ? (
                            <>
                              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Enviar Convite
                            </>
                          )}
                        </Button>
                      </motion.div>
                    </form>
                  </CardContent>
                  <CardFooter className="bg-gradient-to-r from-purple-50 to-purple-100 mt-4 rounded-b-lg border-t border-purple-100">
                    <Alert variant="default" className="w-full border border-purple-200 bg-white/50">
                      <Gift className="h-5 w-5 text-purple-600" />
                      <AlertTitle className="font-semibold text-purple-600">Ganhe $10.00 por indicação</AlertTitle>
                      <AlertDescription className="text-sm">
                        Seus amigos também recebem $10.00 de bônus para usar em compras!
                      </AlertDescription>
                    </Alert>
                  </CardFooter>
                </Card>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Card className="overflow-hidden border-primary/20 shadow-lg hover:shadow-primary/10 transition-all duration-300">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100">
                    <CardTitle className="flex items-center text-xl font-bold text-blue-600">
                      <Share2 className="h-5 w-5 mr-2 text-blue-600" />
                      Compartilhar Convite
                    </CardTitle>
                    <CardDescription>
                      Compartilhe seu link de indicação com amigos
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center space-y-6 pt-6">
                    <motion.div 
                      className="py-4"
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ 
                        duration: 0.5,
                        type: "spring",
                        stiffness: 260,
                        damping: 20 
                      }}
                    >
                      <QRCodeDisplay 
                        value={referralsData?.referralUrl || ""}
                        title="Escaneie para se cadastrar"
                        description="Aponte a câmera do celular para o QR Code"
                        downloadable
                        shareable
                      />
                    </motion.div>
                    <div className="flex flex-wrap gap-3 justify-center">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          onClick={copyReferralLink}
                          className="flex items-center bg-primary hover:bg-primary/90 shadow-md"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          Copiar Link
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          variant="outline" 
                          onClick={shareOnWhatsApp}
                          className="flex items-center text-green-600 border-green-600 hover:bg-green-50 shadow-sm"
                        >
                          <WhatsAppIcon className="h-4 w-4 mr-2" />
                          WhatsApp
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          variant="outline" 
                          className="flex items-center text-blue-600 border-blue-600 hover:bg-blue-50 shadow-sm"
                        >
                          <Share2 className="h-4 w-4 mr-2" />
                          Outras Redes
                        </Button>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </TabsContent>
          
          {/* Aba de Indicados */}
          <TabsContent value="list">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="overflow-hidden border-primary/20 shadow-lg hover:shadow-primary/10 transition-all duration-300">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 border-b border-primary/10">
                  <CardTitle className="flex items-center text-xl font-bold text-primary">
                    <Users className="h-5 w-5 mr-2 text-primary" />
                    Meus Indicados
                  </CardTitle>
                  <CardDescription>
                    Lista de todas as suas indicações e comissões
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {isReferralsLoading ? (
                    <div className="flex justify-center items-center h-[300px]">
                      <div className="flex flex-col items-center">
                        <RefreshCw className="h-10 w-10 animate-spin text-primary mb-4" />
                        <p className="text-sm text-muted-foreground">Carregando suas indicações...</p>
                      </div>
                    </div>
                  ) : referralsData?.referrals?.length === 0 ? (
                    <motion.div 
                      className="flex flex-col items-center justify-center h-[300px] text-center p-8"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ type: "spring", stiffness: 260, damping: 20 }}
                    >
                      <div className="relative mb-6">
                        <motion.div
                          animate={{ 
                            scale: [1, 1.1, 1],
                            opacity: [0.8, 1, 0.8]
                          }}
                          transition={{ 
                            duration: 3,
                            repeat: Infinity,
                            repeatType: "reverse"
                          }}
                          className="absolute inset-0 rounded-full bg-primary/10"
                          style={{ transform: "scale(1.2)" }}
                        />
                        <Users className="h-20 w-20 text-primary relative z-10" />
                      </div>
                      <h3 className="text-xl font-medium text-primary mb-2">Nenhuma indicação ainda</h3>
                      <p className="text-sm text-muted-foreground mt-2 max-w-md">
                        Convide seus amigos para usar o Vale Cashback e comece a ganhar comissões em todas as compras deles!
                      </p>
                      
                      <motion.div
                        className="mt-6"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button 
                          className="bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-md"
                          onClick={() => setActiveTab("invite")}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Iniciar Agora
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </Button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <div className="p-6">
                      <DataTable 
                        data={referralsData?.referrals || []}
                        columns={referralsColumns}
                        searchable
                        onSearch={() => {}}
                      />
                    </div>
                  )}
                </CardContent>
                
                {referralsData?.referrals?.length > 0 && (
                  <CardFooter className="bg-gradient-to-r from-primary/5 to-primary/10 border-t border-primary/10 py-4">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 }}
                      className="w-full"
                    >
                      <Alert variant="default" className="border border-primary/20 bg-white/50">
                        <Award className="h-5 w-5 text-primary" />
                        <AlertTitle className="font-semibold text-primary">Seus indicados estão gerando retorno!</AlertTitle>
                        <AlertDescription className="text-sm">
                          A cada compra que seus indicados fazem, você recebe <span className="font-medium text-primary">2%</span> do valor da transação diretamente em sua conta. Acompanhe seus ganhos na aba <strong>Visão Geral</strong>.
                        </AlertDescription>
                      </Alert>
                    </motion.div>
                  </CardFooter>
                )}
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
        
        <SystemInfo className="mt-6" />
      </div>
    </DashboardLayout>
  );
}