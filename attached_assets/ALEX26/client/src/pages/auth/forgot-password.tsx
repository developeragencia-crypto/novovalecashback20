import { useState } from "react";
import { Link } from "wouter";
import { AuthLayout } from "@/components/layout/auth-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, Mail, HelpCircle, KeyRound } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

// Esquema de validação para o formulário de email
const emailFormSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
});

// Esquema de validação para o formulário de perguntas de segurança
const securityQuestionFormSchema = z.object({
  email: z.string().email({ message: "Email inválido" }),
  securityQuestion: z.string().min(1, { message: "Selecione uma pergunta" }),
  securityAnswer: z.string().min(1, { message: "Resposta é obrigatória" }),
});

// Lista de perguntas de segurança disponíveis
const securityQuestions = [
  "Qual o nome do seu primeiro animal de estimação?",
  "Qual o nome da cidade onde você nasceu?",
  "Qual o nome do seu melhor amigo de infância?",
  "Qual era o nome da sua primeira escola?",
  "Qual o modelo do seu primeiro carro?",
  "Qual o nome de solteira da sua mãe?",
];

type RecoveryMethod = "email" | "security-question";

export default function ForgotPassword() {
  const [method, setMethod] = useState<RecoveryMethod>("email");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const { toast } = useToast();
  
  // Formulário para recuperação por email
  const emailForm = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: {
      email: "",
    },
  });
  
  // Formulário para recuperação por pergunta de segurança
  const securityQuestionForm = useForm<z.infer<typeof securityQuestionFormSchema>>({
    resolver: zodResolver(securityQuestionFormSchema),
    defaultValues: {
      email: "",
      securityQuestion: "",
      securityAnswer: "",
    },
  });
  
  // Função para lidar com o envio do formulário de email
  const onEmailSubmit = async (values: z.infer<typeof emailFormSchema>) => {
    setLoading(true);
    try {
      // Aqui seria feita a solicitação para a API
      await apiRequest("POST", "/api/auth/forgot-password", {
        email: values.email,
        method: "email"
      });
      
      // Simulando o envio de email
      setEmailSent(true);
      toast({
        title: "Email enviado",
        description: "Instruções para redefinir sua senha foram enviadas para seu email.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar o email. Verifique se o endereço está correto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Função para lidar com o envio do formulário de pergunta de segurança
  const onSecurityQuestionSubmit = async (values: z.infer<typeof securityQuestionFormSchema>) => {
    setLoading(true);
    try {
      // Aqui seria feita a solicitação para a API
      await apiRequest("POST", "/api/auth/forgot-password", {
        email: values.email,
        method: "security-question",
        securityQuestion: values.securityQuestion,
        securityAnswer: values.securityAnswer
      });
      
      // Simulando o reset bem-sucedido
      setResetComplete(true);
      toast({
        title: "Senha redefinida",
        description: "Sua senha foi redefinida com sucesso. Verifique seu email para a nova senha temporária.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível verificar sua resposta. Verifique se as informações estão corretas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout 
      title="Recuperação de Senha" 
      description="Escolha como você deseja recuperar sua senha"
      showHero={true}
    >
      {!emailSent && !resetComplete ? (
        <>
          <RadioGroup
            className="mb-6 flex flex-col space-y-4 sm:flex-row sm:space-x-4 sm:space-y-0"
            defaultValue={method}
            onValueChange={(value) => setMethod(value as RecoveryMethod)}
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="email" id="email-method" />
              <Label htmlFor="email-method" className="flex items-center">
                <Mail className="mr-2 h-4 w-4" />
                Recuperar por Email
              </Label>
            </div>
            
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="security-question" id="security-question-method" />
              <Label htmlFor="security-question-method" className="flex items-center">
                <HelpCircle className="mr-2 h-4 w-4" />
                Responder Pergunta de Segurança
              </Label>
            </div>
          </RadioGroup>
          
          {method === "email" ? (
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="seu@email.com" 
                          className="h-11 px-4"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      <span>Enviando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <span>Enviar Link de Recuperação</span>
                    </div>
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...securityQuestionForm}>
              <form onSubmit={securityQuestionForm.handleSubmit(onSecurityQuestionSubmit)} className="space-y-4">
                <FormField
                  control={securityQuestionForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="seu@email.com" 
                          className="h-11 px-4"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={securityQuestionForm.control}
                  name="securityQuestion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pergunta de Segurança</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        disabled={loading}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione sua pergunta de segurança" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {securityQuestions.map((question, index) => (
                            <SelectItem key={index} value={question}>
                              {question}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={securityQuestionForm.control}
                  name="securityAnswer"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Resposta</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Sua resposta" 
                          className="h-11 px-4"
                          {...field}
                          disabled={loading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button
                  type="submit"
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      <span>Verificando...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <span>Recuperar Senha</span>
                    </div>
                  )}
                </Button>
              </form>
            </Form>
          )}
        </>
      ) : emailSent ? (
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <Mail className="h-16 w-16 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold">Verifique seu Email</h3>
          <p className="text-gray-600">
            Enviamos instruções para redefinir sua senha para o email fornecido.
            Por favor, verifique sua caixa de entrada.
          </p>
          <Button asChild className="mt-6">
            <Link href="/auth">Voltar para Login</Link>
          </Button>
        </div>
      ) : (
        <div className="text-center space-y-4">
          <div className="flex justify-center mb-4">
            <KeyRound className="h-16 w-16 text-green-500" />
          </div>
          <h3 className="text-xl font-semibold">Senha Redefinida</h3>
          <p className="text-gray-600">
            Sua senha foi redefinida com sucesso. Enviamos uma senha temporária
            para seu email. Use-a para fazer login e definir uma nova senha.
          </p>
          <Button asChild className="mt-6">
            <Link href="/auth">Ir para Login</Link>
          </Button>
        </div>
      )}
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-500">
          <Link href="/auth" className="text-blue-600 hover:underline">
            Voltar para Login
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}