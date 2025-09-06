import { useState } from "react";
import { Link } from "wouter";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth.tsx";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

// Definir schema com mensagens traduzidas
function getClientFormSchema(t: any) {
  return z.object({
    name: z.string().min(3, { message: t('validation.nameTooShort') }),
    email: z.string().email({ message: t('errors.invalidEmail') }),
    phone: z.string().min(10, { message: t('validation.invalidPhone') }).optional(),
    invitationCode: z.string().optional(),
    securityQuestion: z.string().min(1, { message: t('validation.selectSecurityQuestion') }),
    securityAnswer: z.string().min(2, { message: t('validation.provideSecurityAnswer') }),
    password: z.string().min(6, { message: t('errors.passwordLength') }),
    confirmPassword: z.string().min(6, { message: t('errors.passwordLength') }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('validation.passwordMismatch'),
    path: ["confirmPassword"],
  });
}

// Definir schema do lojista com mensagens traduzidas
function getMerchantFormSchema(t: any) {
  return z.object({
    name: z.string().min(3, { message: t('validation.nameTooShort') }),
    email: z.string().email({ message: t('errors.invalidEmail') }),
    phone: z.string().min(10, { message: t('validation.invalidPhone') }).optional(),
    storeName: z.string().min(3, { message: t('validation.storeNameTooShort') }),
    category: z.string().min(1, { message: t('validation.selectCategory') }),
    companyLogo: z.any().optional(),
    invitationCode: z.string().optional(),
    securityQuestion: z.string().min(1, { message: t('validation.selectSecurityQuestion') }),
    securityAnswer: z.string().min(2, { message: t('validation.provideSecurityAnswer') }),
    password: z.string().min(6, { message: t('errors.passwordLength') }),
    confirmPassword: z.string().min(6, { message: t('errors.passwordLength') }),
  }).refine((data) => data.password === data.confirmPassword, {
    message: t('validation.passwordMismatch'),
    path: ["confirmPassword"],
  });
}

// Uso posterior para os tipos
type ClientFormValues = z.infer<ReturnType<typeof getClientFormSchema>>;
type MerchantFormValues = z.infer<ReturnType<typeof getMerchantFormSchema>>;

export default function Register() {
  const [type, setType] = useState<"client" | "merchant">("client");
  const { register, loading } = useAuth();
  const { t } = useTranslation();

  // Criar os esquemas de validação usando a função de tradução
  const clientFormSchema = getClientFormSchema(t);
  const merchantFormSchema = getMerchantFormSchema(t);
  
  const clientForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      invitationCode: "",
      securityQuestion: "",
      securityAnswer: "",
      password: "",
      confirmPassword: "",
    },
  });

  const merchantForm = useForm<MerchantFormValues>({
    resolver: zodResolver(merchantFormSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      storeName: "",
      category: "",
      companyLogo: "",
      invitationCode: "",
      securityQuestion: "",
      securityAnswer: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onClientSubmit = async (values: ClientFormValues) => {
    try {
      await register({
        ...values,
        type: "client",
      });
    } catch (error) {
      console.error("Register error:", error);
    }
  };

  const onMerchantSubmit = async (values: MerchantFormValues) => {
    try {
      await register({
        ...values,
        type: "merchant",
      });
    } catch (error) {
      console.error("Register error:", error);
    }
  };

  return (
    <AuthLayout title={t('auth.registerTitle')} description={t('auth.registerDescription')}>
      <Tabs defaultValue="client" onValueChange={(value) => setType(value as "client" | "merchant")}>
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="client">{t('auth.client')}</TabsTrigger>
          <TabsTrigger value="merchant">{t('auth.merchant')}</TabsTrigger>
        </TabsList>

        <TabsContent value="client">
          <Form {...clientForm}>
            <form onSubmit={clientForm.handleSubmit(onClientSubmit)} className="space-y-4">
              <FormField
                control={clientForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.fullName')}</FormLabel>
                    <FormControl>
                      <Input placeholder="João Silva" {...field} disabled={loading} />
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
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />



              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={clientForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Telefone</FormLabel>
                      <FormControl>
                        <Input placeholder="(11) 99999-9999" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={clientForm.control}
                  name="invitationCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de Convite</FormLabel>
                      <FormControl>
                        <Input placeholder="CL123456" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={clientForm.control}
                name="securityQuestion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pergunta de Segurança</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                        disabled={loading}
                      >
                        <option value="">Selecione uma pergunta</option>
                        <option value="Qual o nome do seu primeiro animal de estimação?">Qual o nome do seu primeiro animal de estimação?</option>
                        <option value="Qual o nome da cidade onde você nasceu?">Qual o nome da cidade onde você nasceu?</option>
                        <option value="Qual o nome do seu melhor amigo de infância?">Qual o nome do seu melhor amigo de infância?</option>
                        <option value="Qual era o nome da sua primeira escola?">Qual era o nome da sua primeira escola?</option>
                        <option value="Qual o modelo do seu primeiro carro?">Qual o modelo do seu primeiro carro?</option>
                        <option value="Qual o nome de solteira da sua mãe?">Qual o nome de solteira da sua mãe?</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={clientForm.control}
                name="securityAnswer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resposta de Segurança</FormLabel>
                    <FormControl>
                      <Input placeholder="Sua resposta" {...field} disabled={loading} />
                    </FormControl>
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
                      <Input type="password" placeholder="********" {...field} disabled={loading} />
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
                    <FormLabel>Confirmar senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Cadastrar"
                )}
              </Button>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="merchant">
          <Form {...merchantForm}>
            <form onSubmit={merchantForm.handleSubmit(onMerchantSubmit)} className="space-y-4">
              <FormField
                control={merchantForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do responsável</FormLabel>
                    <FormControl>
                      <Input placeholder="João Silva" {...field} disabled={loading} />
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
                    <FormLabel>Nome da loja</FormLabel>
                    <FormControl>
                      <Input placeholder="Minha Loja" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={merchantForm.control}
                name="companyLogo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-lg font-bold text-accent">Logo da Empresa</FormLabel>
                    <div className="border-2 border-dashed border-accent rounded-md p-4 bg-accent/5">
                      <FormControl>
                        <Input 
                          type="file" 
                          accept="image/*"
                          className="bg-white cursor-pointer" 
                          onChange={(e) => {
                            // Em uma implementação real, aqui faríamos upload da imagem
                            // e atualizaríamos o campo com a URL da imagem
                            const file = e.target.files?.[0];
                            if (file) {
                              // Simular valor para o campo (normalmente seria URL da imagem)
                              field.onChange(file.name);
                            }
                          }} 
                          disabled={loading} 
                        />
                      </FormControl>
                      <FormDescription className="mt-2 text-center">
                        Selecione o arquivo de imagem do logotipo da sua empresa
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={merchantForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>E-mail</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="loja@email.com" {...field} disabled={loading} />
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
                        <Input placeholder="(11) 99999-9999" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>





              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={merchantForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                          {...field}
                          disabled={loading}
                        >
                          <option value="">Selecione uma categoria</option>
                          <option value="restaurant">Restaurante</option>
                          <option value="market">Supermercado</option>
                          <option value="pharmacy">Farmácia</option>
                          <option value="clothing">Vestuário</option>
                          <option value="gas_station">Posto de Combustível</option>
                          <option value="other">Outros</option>
                        </select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

              </div>

              <div className="grid grid-cols-2 gap-4">

                <FormField
                  control={merchantForm.control}
                  name="invitationCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Código de Convite</FormLabel>
                      <FormControl>
                        <Input placeholder="LJ123456" {...field} disabled={loading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={merchantForm.control}
                name="securityQuestion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pergunta de Segurança</FormLabel>
                    <FormControl>
                      <select
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        {...field}
                        disabled={loading}
                      >
                        <option value="">Selecione uma pergunta</option>
                        <option value="Qual o nome do seu primeiro animal de estimação?">Qual o nome do seu primeiro animal de estimação?</option>
                        <option value="Qual o nome da cidade onde você nasceu?">Qual o nome da cidade onde você nasceu?</option>
                        <option value="Qual o nome do seu melhor amigo de infância?">Qual o nome do seu melhor amigo de infância?</option>
                        <option value="Qual era o nome da sua primeira escola?">Qual era o nome da sua primeira escola?</option>
                        <option value="Qual o modelo do seu primeiro carro?">Qual o modelo do seu primeiro carro?</option>
                        <option value="Qual o nome de solteira da sua mãe?">Qual o nome de solteira da sua mãe?</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={merchantForm.control}
                name="securityAnswer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Resposta de Segurança</FormLabel>
                    <FormControl>
                      <Input placeholder="Sua resposta" {...field} disabled={loading} />
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
                      <Input type="password" placeholder="********" {...field} disabled={loading} />
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
                    <FormLabel>Confirmar senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="********" {...field} disabled={loading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" variant="default" className="w-full bg-accent" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : (
                  "Cadastrar"
                )}
              </Button>
            </form>
          </Form>
        </TabsContent>
      </Tabs>

      <div className="mt-4 text-center">
        <p className="text-sm">
          Já tem uma conta?{" "}
          <Link href="/auth/login" className="text-secondary font-medium hover:underline">
            Faça login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
