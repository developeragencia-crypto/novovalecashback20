import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Save, RefreshCw, DollarSign, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const commissionSettingsSchema = z.object({
  platform_fee: z.number().min(0).max(100),
  merchant_commission: z.number().min(0).max(100),
  client_cashback: z.number().min(0).max(100),
  referral_bonus: z.number().min(0).max(100),
  min_withdrawal: z.number().min(0),
  max_cashback_bonus: z.number().min(0),
  withdrawal_fee: z.number().min(0),
});

const brandSettingsSchema = z.object({
  app_name: z.string().min(1),
  app_description: z.string().optional(),
  logo_url: z.string().url().optional().or(z.literal("")),
  favicon_url: z.string().url().optional().or(z.literal("")),
  primary_color: z.string().min(1),
  secondary_color: z.string().min(1),
  login_background_url: z.string().url().optional().or(z.literal("")),
  auto_apply: z.boolean().optional(),
});

type CommissionSettingsFormData = z.infer<typeof commissionSettingsSchema>;
type BrandSettingsFormData = z.infer<typeof brandSettingsSchema>;

interface SystemSettings {
  commission_settings: {
    platform_fee: string;
    merchant_commission: string;
    client_cashback: string;
    referral_bonus: string;
    min_withdrawal: string;
    max_cashback_bonus: string;
    withdrawal_fee: string;
  } | null;
  brand_settings: {
    app_name: string;
    app_description: string;
    logo_url: string;
    favicon_url: string;
    primary_color: string;
    secondary_color: string;
    login_background_url: string;
    auto_apply: boolean;
  } | null;
}

export function SystemSettings() {
  const [activeTab, setActiveTab] = useState("commission");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Buscar configurações do sistema
  const { data: settings, isLoading } = useQuery<SystemSettings>({
    queryKey: ["admin", "settings"],
    queryFn: async () => {
      const response = await fetch("/api/admin/settings");
      if (!response.ok) throw new Error("Erro ao buscar configurações");
      return response.json();
    },
  });

  // Formulário para configurações de comissão
  const commissionForm = useForm<CommissionSettingsFormData>({
    resolver: zodResolver(commissionSettingsSchema),
    values: settings?.commission_settings ? {
      platform_fee: parseFloat(settings.commission_settings.platform_fee),
      merchant_commission: parseFloat(settings.commission_settings.merchant_commission),
      client_cashback: parseFloat(settings.commission_settings.client_cashback),
      referral_bonus: parseFloat(settings.commission_settings.referral_bonus),
      min_withdrawal: parseFloat(settings.commission_settings.min_withdrawal),
      max_cashback_bonus: parseFloat(settings.commission_settings.max_cashback_bonus),
      withdrawal_fee: parseFloat(settings.commission_settings.withdrawal_fee),
    } : {
      platform_fee: 5.0,
      merchant_commission: 2.0,
      client_cashback: 2.0,
      referral_bonus: 1.0,
      min_withdrawal: 10.0,
      max_cashback_bonus: 100.0,
      withdrawal_fee: 0.0,
    },
  });

  // Formulário para configurações de marca
  const brandForm = useForm<BrandSettingsFormData>({
    resolver: zodResolver(brandSettingsSchema),
    values: settings?.brand_settings ? {
      app_name: settings.brand_settings.app_name,
      app_description: settings.brand_settings.app_description || "",
      logo_url: settings.brand_settings.logo_url || "",
      favicon_url: settings.brand_settings.favicon_url || "",
      primary_color: settings.brand_settings.primary_color,
      secondary_color: settings.brand_settings.secondary_color,
      login_background_url: settings.brand_settings.login_background_url || "",
      auto_apply: settings.brand_settings.auto_apply || false,
    } : {
      app_name: "Vale Cashback",
      app_description: "",
      logo_url: "",
      favicon_url: "",
      primary_color: "#0066B3",
      secondary_color: "#FF7700",
      login_background_url: "",
      auto_apply: false,
    },
  });

  // Atualizar configurações de comissão
  const updateCommissionMutation = useMutation({
    mutationFn: async (data: CommissionSettingsFormData) => {
      const response = await fetch("/api/admin/commission-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar configurações de comissão");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast({
        title: "Sucesso",
        description: "Configurações de comissão atualizadas",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Atualizar configurações de marca
  const updateBrandMutation = useMutation({
    mutationFn: async (data: BrandSettingsFormData) => {
      const response = await fetch("/api/admin/brand-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar configurações de marca");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "settings"] });
      toast({
        title: "Sucesso",
        description: "Configurações de marca atualizadas",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmitCommission = (data: CommissionSettingsFormData) => {
    updateCommissionMutation.mutate(data);
  };

  const onSubmitBrand = (data: BrandSettingsFormData) => {
    updateBrandMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Settings className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configurações do Sistema</h2>
        <p className="text-muted-foreground">
          Gerencie as configurações globais da plataforma
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="commission" data-testid="tab-commission">
            <DollarSign className="h-4 w-4 mr-2" />
            Comissões
          </TabsTrigger>
          <TabsTrigger value="brand" data-testid="tab-brand">
            <Palette className="h-4 w-4 mr-2" />
            Marca
          </TabsTrigger>
        </TabsList>

        <TabsContent value="commission" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Comissão</CardTitle>
              <CardDescription>
                Configure as taxas e valores do sistema de cashback
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={commissionForm.handleSubmit(onSubmitCommission)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="platform_fee">Taxa da Plataforma (%)</Label>
                    <Input
                      id="platform_fee"
                      type="number"
                      step="0.1"
                      {...commissionForm.register("platform_fee", { valueAsNumber: true })}
                      data-testid="input-platform-fee"
                    />
                    <p className="text-sm text-muted-foreground">
                      Taxa cobrada sobre cada transação
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="merchant_commission">Comissão do Lojista (%)</Label>
                    <Input
                      id="merchant_commission"
                      type="number"
                      step="0.1"
                      {...commissionForm.register("merchant_commission", { valueAsNumber: true })}
                      data-testid="input-merchant-commission"
                    />
                    <p className="text-sm text-muted-foreground">
                      Comissão paga aos lojistas
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="client_cashback">Cashback do Cliente (%)</Label>
                    <Input
                      id="client_cashback"
                      type="number"
                      step="0.1"
                      {...commissionForm.register("client_cashback", { valueAsNumber: true })}
                      data-testid="input-client-cashback"
                    />
                    <p className="text-sm text-muted-foreground">
                      Percentual de cashback para clientes
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="referral_bonus">Bônus de Indicação (%)</Label>
                    <Input
                      id="referral_bonus"
                      type="number"
                      step="0.1"
                      {...commissionForm.register("referral_bonus", { valueAsNumber: true })}
                      data-testid="input-referral-bonus"
                    />
                    <p className="text-sm text-muted-foreground">
                      Bônus por indicar novos usuários
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="min_withdrawal">Saque Mínimo (R$)</Label>
                    <Input
                      id="min_withdrawal"
                      type="number"
                      step="0.01"
                      {...commissionForm.register("min_withdrawal", { valueAsNumber: true })}
                      data-testid="input-min-withdrawal"
                    />
                    <p className="text-sm text-muted-foreground">
                      Valor mínimo para solicitar saque
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="max_cashback_bonus">Cashback Máximo (R$)</Label>
                    <Input
                      id="max_cashback_bonus"
                      type="number"
                      step="0.01"
                      {...commissionForm.register("max_cashback_bonus", { valueAsNumber: true })}
                      data-testid="input-max-cashback"
                    />
                    <p className="text-sm text-muted-foreground">
                      Limite máximo de cashback por transação
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="withdrawal_fee">Taxa de Saque (R$)</Label>
                    <Input
                      id="withdrawal_fee"
                      type="number"
                      step="0.01"
                      {...commissionForm.register("withdrawal_fee", { valueAsNumber: true })}
                      data-testid="input-withdrawal-fee"
                    />
                    <p className="text-sm text-muted-foreground">
                      Taxa fixa cobrada nos saques
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => commissionForm.reset()}
                    data-testid="button-reset-commission"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resetar
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateCommissionMutation.isPending}
                    data-testid="button-save-commission"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateCommissionMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brand" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configurações de Marca</CardTitle>
              <CardDescription>
                Personalize a aparência e identidade da plataforma
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={brandForm.handleSubmit(onSubmitBrand)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="app_name">Nome da Aplicação</Label>
                    <Input
                      id="app_name"
                      {...brandForm.register("app_name")}
                      data-testid="input-app-name"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="app_description">Descrição da Aplicação</Label>
                    <Textarea
                      id="app_description"
                      {...brandForm.register("app_description")}
                      data-testid="input-app-description"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo_url">URL do Logo</Label>
                    <Input
                      id="logo_url"
                      type="url"
                      placeholder="https://exemplo.com/logo.png"
                      {...brandForm.register("logo_url")}
                      data-testid="input-logo-url"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="favicon_url">URL do Favicon</Label>
                    <Input
                      id="favicon_url"
                      type="url"
                      placeholder="https://exemplo.com/favicon.ico"
                      {...brandForm.register("favicon_url")}
                      data-testid="input-favicon-url"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="primary_color">Cor Primária</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary_color"
                        type="color"
                        {...brandForm.register("primary_color")}
                        className="w-20"
                        data-testid="input-primary-color"
                      />
                      <Input
                        type="text"
                        {...brandForm.register("primary_color")}
                        placeholder="#0066B3"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary_color">Cor Secundária</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary_color"
                        type="color"
                        {...brandForm.register("secondary_color")}
                        className="w-20"
                        data-testid="input-secondary-color"
                      />
                      <Input
                        type="text"
                        {...brandForm.register("secondary_color")}
                        placeholder="#FF7700"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="login_background_url">URL do Background de Login</Label>
                    <Input
                      id="login_background_url"
                      type="url"
                      placeholder="https://exemplo.com/background.jpg"
                      {...brandForm.register("login_background_url")}
                      data-testid="input-login-background"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <Label>Aplicar Configurações Automaticamente</Label>
                        <div className="text-sm text-muted-foreground">
                          Aplicar mudanças de marca imediatamente
                        </div>
                      </div>
                      <Switch
                        {...brandForm.register("auto_apply")}
                        data-testid="switch-auto-apply"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="flex justify-end gap-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => brandForm.reset()}
                    data-testid="button-reset-brand"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resetar
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateBrandMutation.isPending}
                    data-testid="button-save-brand"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {updateBrandMutation.isPending ? "Salvando..." : "Salvar Configurações"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SystemSettings;