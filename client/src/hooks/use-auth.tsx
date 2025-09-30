import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { saveUserData, clearUserData, getUserData } from '@/storage/local-storage';

type UserType = 'client' | 'merchant' | 'admin';

interface User {
  id: number;
  name: string;
  email: string;
  type: UserType;
  photo?: string;
  status?: string;
  invitation_code?: string;
  phone?: string;
  username?: string;
  created_at?: Date;
  last_login?: Date;
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
        // Tentar carregar do localStorage primeiro
        const storedUser = getUserData();
        if (storedUser) {
          console.log('Dados encontrados no localStorage:', storedUser);
          setUser({
            id: storedUser.id,
            name: storedUser.name,
            email: storedUser.email,
            type: storedUser.type as UserType,
            photo: storedUser.photo,
            status: 'active'
          });
        }
        
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
          
          // Salvar no localStorage para uso futuro
          saveUserData({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            type: userData.type,
            photo: userData.photo,
            expiresAt: Date.now() + 1000 * 60 * 60 * 24 // 24 horas
          });
        } else if (response.status === 401 && user) {
          // Se recebermos 401 mas tínhamos um usuário antes, a sessão expirou
          console.log('Sessão expirada');
          clearUserData(); // Limpar localStorage
          setUser(null);
          navigate('/auth/login');
          toast({
            title: 'Sessão expirada',
            description: 'Sua sessão expirou. Por favor, faça login novamente.',
            variant: 'destructive',
          });
        } else if (response.status === 401 && !storedUser) {
          // Se recebermos 401 e não tínhamos usuário local, o usuário nunca esteve logado
          console.log('Não autenticado');
          
          // Verificar se estamos em uma página de convite que não requer autenticação
          const currentPath = window.location.pathname;
          const isPublicPage = 
            currentPath.startsWith('/invite') || 
            currentPath.startsWith('/convite') || 
            currentPath.startsWith('/parceiro') || 
            currentPath.startsWith('/como/te') ||
            currentPath === '/convite/cliente' ||
            currentPath === '/convite/lojista' ||
            currentPath === '/welcome' ||
            currentPath === '/welcome-static' ||
            currentPath === '/welcome-force' ||
            currentPath === '/welcome-simple' ||
            currentPath === '/'; // Todas as rotas welcome e a raiz são públicas
            
          // Não redirecionamos se estivermos em uma página pública
          if (!isPublicPage) {
            console.log('Não está em página pública, redirecionando para login');
            navigate('/auth/login');
          } else {
            console.log('Em página pública, ignorando redirecionamento');
          }
          
          setUser(null);
        }
      } catch (error) {
        console.error('Failed to load user', error);
        // Não limpar usuário em caso de erro de rede para permitir uso offline
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
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Falha na autenticação. Tente novamente.');
      }
      
      const userData = await response.json();
      setUser(userData);
      
      // Salvar dados no localStorage para persistência
      saveUserData({
        id: userData.id,
        name: userData.name,
        email: userData.email,
        type: userData.type,
        photo: userData.photo,
        expiresAt: Date.now() + 1000 * 60 * 60 * 24 // 24 horas
      });
      
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
  const response = await fetch('/api/register-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erro ao cadastrar usuário');
      }
      
      const data = await response.json();
      
      toast({
        title: 'Cadastro realizado com sucesso',
        description: 'Você ganhou $10 de bônus! Já pode fazer login no sistema.',
      });
      
      navigate('/auth/login');
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
      
      // Limpar o localStorage ao fazer logout
      clearUserData();
      
      setUser(null);
      navigate('/auth/login');
      
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

// Objeto de cache para usuários simulados por tipo
const mockUserCache: Record<UserType, User> = {
  client: {
    id: 999,
    name: 'Cliente de Teste',
    email: 'cliente@valecashback.com',
    type: 'client',
    photo: undefined,
    status: 'active'
  },
  merchant: {
    id: 999,
    name: 'Lojista de Teste',
    email: 'lojista@valecashback.com',
    type: 'merchant',
    photo: undefined,
    status: 'active'
  },
  admin: {
    id: 999,
    name: 'Admin de Teste',
    email: 'admin@valecashback.com',
    type: 'admin',
    photo: undefined,
    status: 'active'
  }
};

// Contexto simulado memoizado para evitar re-renderizações desnecessárias
const simulatedContextCache: Partial<Record<UserType, AuthContextType>> = {};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  // Se estivermos em desenvolvimento e o usuário for nulo, usar um usuário simulado
  if (process.env.NODE_ENV === 'development' && !context.user) {
    const path = window.location.pathname;
    let userType: UserType | null = null;
    
    if (path.startsWith('/client')) {
      userType = 'client';
    } else if (path.startsWith('/merchant')) {
      userType = 'merchant';
    } else if (path.startsWith('/admin')) {
      userType = 'admin';
    }
    
    if (userType) {
      // Usar contexto em cache se existir, caso contrário criar um novo
      if (!simulatedContextCache[userType]) {
        console.log(`[DEV MODE] Simulando usuário tipo: ${userType}`);
        
        simulatedContextCache[userType] = {
          ...context,
          user: mockUserCache[userType],
          isAuthenticated: true,
          userType
        };
      }
      
      return simulatedContextCache[userType] as AuthContextType;
    }
  }
  
  return context;
};
