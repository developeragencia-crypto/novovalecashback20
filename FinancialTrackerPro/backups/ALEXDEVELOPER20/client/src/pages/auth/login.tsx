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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Loader2, User, Store, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { useTranslation } from "@/hooks/use-translation";

type UserTypeOption = "client" | "merchant" | "admin";

interface UserTypeConfig {
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  hoverBgColor: string;
  activeBgColor: string;
  textColor: string;
  activeTextColor: string;
  borderColor: string;
  buttonColor: string;
}

export default function Login() {
  const [userType, setUserType] = useState<UserTypeOption>("client");
  const { login, loading } = useAuth();
  const { t } = useTranslation();
  
  // Esquema do formulário com validações
  const formSchema = z.object({
    email: z.string().email({ message: t('errors.invalidEmail') }),
    password: z.string().min(6, { message: t('errors.passwordLength') }),
  });
  
  // Configurações do formulário
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Função de envio do formulário
  const onSubmit = async (values: any) => {
    try {
      await login(values.email, values.password, userType);
    } catch (error) {
      console.error("Login error:", error);
      form.setError("root", { 
        type: "manual",
        message: t('errors.loginFailed')
      });
    }
  };

  // Configurações dos tipos de usuário com tradução
  const userTypeConfigs: Record<UserTypeOption, UserTypeConfig> = {
    client: {
      icon: <User className="h-5 w-5" />,
      label: t('auth.clientLogin'),
      bgColor: "bg-blue-50",
      hoverBgColor: "hover:bg-blue-100",
      activeBgColor: "bg-blue-600",
      textColor: "text-blue-600",
      activeTextColor: "text-white",
      borderColor: "border-blue-200",
      buttonColor: "bg-blue-600 hover:bg-blue-700"
    },
    merchant: {
      icon: <Store className="h-5 w-5" />,
      label: t('auth.merchantLogin'),
      bgColor: "bg-orange-50",
      hoverBgColor: "hover:bg-orange-100",
      activeBgColor: "bg-orange-500",
      textColor: "text-orange-500",
      activeTextColor: "text-white",
      borderColor: "border-orange-200",
      buttonColor: "bg-orange-500 hover:bg-orange-600"
    },
    admin: {
      icon: <ShieldCheck className="h-5 w-5" />,
      label: t('auth.adminLogin'),
      bgColor: "bg-purple-50",
      hoverBgColor: "hover:bg-purple-100",
      activeBgColor: "bg-purple-600",
      textColor: "text-purple-600",
      activeTextColor: "text-white",
      borderColor: "border-purple-200",
      buttonColor: "bg-purple-600 hover:bg-purple-700"
    }
  };

  const config = userTypeConfigs[userType];

  return (
    <AuthLayout title={t('auth.loginTitle')} description={t('auth.loginDescription')}>
      <div className="mb-8">
        <div className="grid grid-cols-3 gap-3 mb-6">
          {Object.entries(userTypeConfigs).map(([type, typeConfig]) => {
            const isActive = type === userType;
            return (
              <button
                key={type}
                type="button"
                onClick={() => setUserType(type as UserTypeOption)}
                className={`relative flex flex-col items-center justify-center p-4 rounded-lg border transition-all duration-300 ${
                  isActive 
                    ? `${typeConfig.activeBgColor} ${typeConfig.activeTextColor} border-transparent shadow-md` 
                    : `${typeConfig.bgColor} ${typeConfig.textColor} ${typeConfig.borderColor} ${typeConfig.hoverBgColor}`
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeBackground"
                    className="absolute inset-0 rounded-lg"
                    initial={false}
                    transition={{ type: "spring", duration: 0.5 }}
                  />
                )}
                <div className="relative z-10 flex flex-col items-center">
                  <div className={`rounded-full p-2 mb-2 ${isActive ? 'bg-white/20' : 'bg-white'}`}>
                    {typeConfig.icon}
                  </div>
                  <span className="text-sm font-medium">{typeConfig.label}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-gray-600">{t('auth.email')}</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder={t('auth.enterEmail')}
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
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-gray-600">{t('auth.password')}</FormLabel>
                  <Link href="/auth/forgot-password" className={`text-sm ${config.textColor} hover:underline`}>
                    {t('auth.forgotPassword')}
                  </Link>
                </div>
                <FormControl>
                  <Input
                    type="password"
                    placeholder={t('auth.enterPassword')}
                    className="h-11 px-4"
                    {...field}
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {form.formState.errors.root && (
            <div className="text-sm text-red-500 font-medium mt-2 text-center">
              {form.formState.errors.root.message}
            </div>
          )}

          <Button
            type="submit"
            className={`w-full h-11 mt-5 transition-all duration-300 ${config.buttonColor}`}
            disabled={loading}
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                <span>{t('auth.processing')}</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <span>{t('auth.loginAs')} {config.label}</span>
              </div>
            )}
          </Button>
        </form>
      </Form>

      <div className="mt-6 text-center">
        <p className="text-xs text-gray-400 mt-1">
          {t('auth.noAccount')} <Link href="/auth/register" className="text-blue-600 hover:underline">{t('auth.signUp')}</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
