import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

type UserType = 'client' | 'merchant' | 'admin';

interface User {
  id: number;
  name: string;
  email: string;
  type: UserType;
  photo?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, type: UserType) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  userType: UserType | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    async function loadUser() {
      try {
        console.log('Carregando dados do usuário...');
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        console.log('Resposta da API:', response.status);
        
        if (response.ok) {
          const userData = await response.json();
          console.log('Usuário carregado:', userData);
          setUser(userData);
        } else if (response.status === 401 && user) {
          // Se recebermos 401 mas tínhamos um usuário antes, a sessão expirou
          console.log('Sessão expirada');
          setUser(null);
          navigate('/login');
          toast({
            title: 'Sessão expirada',
            description: 'Sua sessão expirou. Por favor, faça login novamente.',
            variant: 'destructive',
          });
        } else if (response.status === 401) {
          console.log('Não autenticado, redirecionando para login');
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to load user', error);
      } finally {
        setLoading(false);
      }
    }
    
    // Carrega o usuário imediatamente
    loadUser();
    
    // E então periodicamente a cada 5 minutos (300000ms) para manter a sessão ativa
    // Aumentamos o intervalo para evitar chamadas excessivas
    const intervalId = setInterval(loadUser, 300000);
    
    // Limpar o intervalo quando o componente for desmontado
    return () => clearInterval(intervalId);
  }, [navigate, toast]); // Removido o 'user' das dependências para evitar atualizações excessivas

  const login = async (email: string, password: string, type: UserType) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          type,
        }),
        credentials: 'include', // Importante para cookies de sessão
      });
      
      const userData = await response.json();
      setUser(userData);
      
      // Redirect based on user type
      if (type === 'client') {
        navigate('/client/dashboard');
      } else if (type === 'merchant') {
        navigate('/merchant/dashboard');
      } else if (type === 'admin') {
        navigate('/admin/dashboard');
      }
      
      toast({
        title: 'Login realizado com sucesso',
        description: `Bem-vindo(a), ${userData.name}!`,
      });
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Erro ao fazer login',
        description: err.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: any) => {
    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auth/register', userData);
      const data = await response.json();
      
      toast({
        title: 'Cadastro realizado com sucesso',
        description: 'Você já pode fazer login no sistema.',
      });
      
      navigate('/login');
    } catch (error) {
      const err = error as Error;
      toast({
        title: 'Erro ao cadastrar',
        description: err.message,
        variant: 'destructive',
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include', // Importante para cookies de sessão
      });
      setUser(null);
      navigate('/login');
      
      toast({
        title: 'Logout realizado',
        description: 'Você saiu do sistema com sucesso.',
      });
    } catch (error) {
      console.error('Logout error', error);
    }
  };

  const contextValue: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    isAuthenticated: !!user,
    userType: user?.type || null,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
