import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    const res = await fetch(url, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });
    
    // Para compatibilidade com o código atual, não lançamos erro aqui
    // mas o cliente pode verificar res.ok e lidar com o erro
    return res;
  } catch (error) {
    console.error("API Request failed:", error);
    throw new Error("Falha na conexão com o servidor. Verifique sua conexão com a internet.");
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey[0] as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false, // Evita refetches quando o componente é montado
      staleTime: 5 * 60 * 1000, // 5 minutos - dados são considerados "frescos" por 5 minutos
      gcTime: 10 * 60 * 1000, // 10 minutos - dados ficam em cache por 10 minutos (antes era cacheTime)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
