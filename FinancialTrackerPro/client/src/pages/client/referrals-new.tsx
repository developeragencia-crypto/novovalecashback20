import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { useTranslation } from "@/hooks/use-translation";
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
  const { t } = useTranslation();
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
          title: t('common.success'),
          description: t('referrals.linkCopied'),
          variant: "default",
        });
      }
    } catch (error) {
      console.error("Erro ao copiar link:", error);
      toast({
        title: t('common.error'),
        description: t('referrals.copyError'),
        variant: "destructive",
      });
    }
  };
  
  // Função para compartilhar no WhatsApp
  const shareOnWhatsApp = () => {
    const text = `${t('referrals.shareMessage', { code: referralsData?.referralCode || 'ABC123' })} ${referralsData?.referralUrl}`;
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
        title: t('common.success'),
        description: t('referrals.inviteSent'),
        variant: "default",
      });
      setEmail("");
      setName("");
      queryClient.invalidateQueries({ queryKey: ['/api/client/referrals'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error.message || t('referrals.inviteError'),
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
        title: t('common.error'),
        description: t('referrals.requiredFields'),
        variant: "destructive",
      });
      return;
    }
    
    inviteMutation.mutate({ email, name });
  };
  
  // Colunas para a tabela de indicados
  const referralsColumns = [
    { header: t('common.name'), accessorKey: "name" },
    { 
      header: t('common.type'), 
      accessorKey: "user_type",
      cell: (row: any) => (
        <div className="flex items-center">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.user_type === "merchant" 
              ? "bg-blue-100 text-blue-800" 
              : "bg-purple-100 text-purple-800"
          }`}>
            {row.user_type === "merchant" ? t('users.merchant') : t('users.client')}
          </span>
        </div>
      )
    },
    { 
      header: t('common.contact'), 
      accessorKey: "email",
      cell: (row: any) => (
        <div className="flex flex-col text-xs">
          <span>{row.email || t('common.emailNotProvided')}</span>
          <span className="text-muted-foreground">{row.phone || t('common.phoneNotProvided')}</span>
        </div>
      )
    },
    { 
      header: t('merchant.storeName'), 
      accessorKey: "store_name",
      cell: (row: any) => (
        <div className="flex items-center">
          {row.user_type === "merchant" ? (
            <span>{row.store_name || t('merchant.noStoreName')}</span>
          ) : (
            <span className="text-muted-foreground text-xs">N/A</span>
          )}
        </div>
      )
    },
    { header: t('common.date'), accessorKey: "date" },
    { 
      header: t('common.status'), 
      accessorKey: "status",
      cell: (row: any) => (
        <div className="flex items-center">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
            row.status === "active" 
              ? "bg-green-100 text-green-800" 
              : "bg-yellow-100 text-yellow-800"
          }`}>
            {row.status === "active" ? t('common.active') : t('common.pending')}
          </span>
        </div>
      )
    },
    { 
      header: t('referrals.commission'), 
      accessorKey: "commission",
      cell: (row: any) => (
        <div className="flex items-center">
          <span className="font-medium">$ {row.commission}</span>
        </div>
      )
    },
  ];

  // Conteúdo condicional baseado no tipo de usuário e erros
  if (user?.type !== "client") {
    return (
      <DashboardLayout title={t('navigation.referrals')} type="client">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">{t('common.restrictedAccess')}</CardTitle>
            <CardDescription>
              {t('referrals.clientOnly')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>{t('referrals.permissionDenied')}</p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  if (referralsError) {
    return (
      <DashboardLayout title={t('common.Referrals')} type="client">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">{t('common.loadingError')}</CardTitle>
            <CardDescription>
              {t('referrals.loadingError')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>{t('common.reloadMessage')}</p>
            <Button 
              onClick={() => window.location.reload()} 
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('common.reloadPage')}
            </Button>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  // Conteúdo principal para usuários clientes
  return (
    <DashboardLayout title={t('common.Referrals')} type="client">
      <div className="flex flex-col space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">
              <Users className="h-4 w-4 mr-2" />
              {t('referrals.overview')}
            </TabsTrigger>
            <TabsTrigger value="invite">
              <UserPlus className="h-4 w-4 mr-2" />
              {t('referrals.inviteFriends')}
            </TabsTrigger>
            <TabsTrigger value="list">
              <Percent className="h-4 w-4 mr-2" />
              {t('referrals.myReferrals')}
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
                      {t('referrals.yourReferralCode')}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {t('referrals.shareCodeDescription')}
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
                            {t('referrals.copyLink')}
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
                            {t('common.share')}
                          </Button>
                        </motion.div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col items-start space-y-2 bg-gradient-to-r from-primary/5 to-primary/10 mt-4 rounded-b-lg border-t border-primary/10">
                    <p className="text-sm">
                      {t('referrals.commissionRate')}: <span className="font-medium text-primary">1%</span> {t('referrals.perReferral')}
                    </p>
                    <p className="text-sm">
                      {t('referrals.shareCodeExplanation')}
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
                      {t('referrals.earningsStats')}
                    </CardTitle>
                    <CardDescription className="text-sm">
                      {t('referrals.trackEarnings')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <motion.div 
                        className="flex flex-col items-center justify-center p-5 bg-gradient-to-b from-blue-50 to-blue-100 rounded-lg shadow-sm"
                        whileHover={{ scale: 1.02, boxShadow: "0 5px 15px rgba(0,0,0,0.1)" }}
                      >
                        <span className="text-4xl font-bold text-blue-600">{referralsData?.referralsCount || 0}</span>
                        <span className="text-sm mt-1">{t('referrals.totalReferrals')}</span>
                      </motion.div>
                      <motion.div 
                        className="flex flex-col items-center justify-center p-5 bg-gradient-to-b from-purple-50 to-purple-100 rounded-lg shadow-sm"
                        whileHover={{ scale: 1.02, boxShadow: "0 5px 15px rgba(0,0,0,0.1)" }}
                      >
                        <span className="text-4xl font-bold text-purple-600">{referralsData?.pendingReferrals || 0}</span>
                        <span className="text-sm mt-1">{t('referrals.pendingReferrals')}</span>
                      </motion.div>
                      <motion.div 
                        className="flex flex-col items-center justify-center p-5 bg-gradient-to-b from-green-50 to-green-100 rounded-lg shadow-sm col-span-2"
                        whileHover={{ scale: 1.02, boxShadow: "0 5px 15px rgba(0,0,0,0.1)" }}
                      >
                        <span className="text-4xl font-bold text-green-600">$ {referralsData?.totalEarned || "0.00"}</span>
                        <span className="text-sm mt-1">{t('referrals.totalEarned')}</span>
                      </motion.div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col items-start space-y-2 bg-gradient-to-r from-blue-50 to-blue-100 mt-4 rounded-b-lg border-t border-blue-100">
                    <p className="text-sm text-blue-600">
                      {t('referrals.howItWorks')}
                    </p>
                  </CardFooter>
                </Card>
              </motion.div>
            </div>
          </TabsContent>
          
          {/* Aba de Convidar Amigos */}
          <TabsContent value="invite">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="overflow-hidden border-primary/20 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                  <CardTitle className="flex items-center">
                    <UserPlus className="h-5 w-5 mr-2" />
                    {t('referrals.inviteFriends')}
                  </CardTitle>
                  <CardDescription>
                    {t('referrals.inviteDescription')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <form onSubmit={handleInvite} className="space-y-4">
                    <div className="space-y-1">
                      <Label htmlFor="friend-name">{t('common.name')}</Label>
                      <Input 
                        id="friend-name" 
                        placeholder={t('common.enterName')} 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="friend-email">{t('common.email')}</Label>
                      <Input 
                        id="friend-email" 
                        type="email" 
                        placeholder={t('common.enterEmail')} 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={inviteMutation.isPending}
                    >
                      {inviteMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          {t('common.sending')}
                        </>
                      ) : (
                        <>
                          <Share2 className="h-4 w-4 mr-2" />
                          {t('referrals.sendInvitation')}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
                <CardFooter className="flex flex-col items-start space-y-2 bg-gradient-to-r from-primary/5 to-primary/10 pt-4 rounded-b-lg border-t border-primary/10">
                  <div className="flex items-center w-full">
                    <div className="flex-1 border-t border-border" />
                    <span className="px-2 text-xs text-muted-foreground">{t('common.or')}</span>
                    <div className="flex-1 border-t border-border" />
                  </div>
                  <div className="w-full space-y-3">
                    <p className="text-sm">{t('referrals.alternateShareMethods')}</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={copyReferralLink}
                          className="flex items-center"
                        >
                          <Copy className="h-4 w-4 mr-2" />
                          {t('referrals.copyLink')}
                        </Button>
                      </motion.div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={shareOnWhatsApp}
                          className="flex items-center text-green-600 border-green-600 hover:bg-green-50"
                        >
                          <WhatsAppIcon className="h-4 w-4 mr-2" />
                          {t('common.shareViaWhatsApp')}
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </CardFooter>
              </Card>
            </motion.div>
          </TabsContent>
          
          {/* Aba de Meus Indicados */}
          <TabsContent value="list">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Card className="overflow-hidden border-primary/20 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10">
                  <CardTitle className="flex items-center">
                    <Percent className="h-5 w-5 mr-2" />
                    {t('referrals.myReferrals')}
                  </CardTitle>
                  <CardDescription>
                    {t('referrals.trackReferrals')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  {isReferralsLoading ? (
                    <div className="flex items-center justify-center p-8">
                      <RefreshCw className="h-8 w-8 animate-spin text-primary/70" />
                    </div>
                  ) : referralsData?.referrals && referralsData.referrals.length > 0 ? (
                    <DataTable 
                      columns={referralsColumns} 
                      data={referralsData.referrals} 
                    />
                  ) : (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium mb-2">{t('referrals.noReferralsYet')}</h3>
                      <p className="text-muted-foreground mb-6">{t('referrals.startInviting')}</p>
                      <Button
                        variant="outline"
                        onClick={() => setActiveTab("invite")}
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {t('referrals.inviteNow')}
                      </Button>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col items-start space-y-2 bg-gradient-to-r from-primary/5 to-primary/10 pt-4 rounded-b-lg border-t border-primary/10">
                  {referralsData?.referrals && referralsData.referrals.length > 0 && (
                    <Alert className="bg-transparent border-primary/20">
                      <Award className="h-4 w-4" />
                      <AlertTitle>{t('referrals.rewardsTitle')}</AlertTitle>
                      <AlertDescription>
                        {t('referrals.rewardsDescription')}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardFooter>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
        
        <SystemInfo className="mt-6" />
      </div>
    </DashboardLayout>
  );
}