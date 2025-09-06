/**
 * Helpers para funcionalidades PWA
 */

// Função para verificar se o dispositivo é mobile
export function isMobileDevice() {
  return (
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) ||
    (window.innerWidth <= 768)
  );
}

// Detectar o sistema operacional do dispositivo
export function getDeviceOS() {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  
  // iOS detection
  if (/iPad|iPhone|iPod/.test(userAgent) && !(window as any).MSStream) {
    return 'ios';
  }
  
  // Android detection
  if (/android/i.test(userAgent)) {
    return 'android';
  }
  
  // Windows detection
  if (/Win/i.test(userAgent)) {
    return 'windows';
  }
  
  // Mac detection
  if (/Mac/i.test(userAgent)) {
    return 'mac';
  }
  
  return 'other';
}

// Função para registrar o service worker
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        // Registrar o Service Worker com um timestamp para forçar atualização
        const timestamp = new Date().getTime();
        const registration = await navigator.serviceWorker.register(`/serviceWorker.js?v=${timestamp}`, { scope: '/' });
        console.log('Service Worker registrado com sucesso:', registration);
        
        // Verificar atualizações imediatamente
        registration.update();
        
        // Configurar listener para atualizações
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nova versão do SW instalada e pronta para ativar
                console.log('Nova versão do Service Worker instalada');
                
                // Opcionalmente, notificar o usuário sobre a atualização
                // Por enquanto, ativamos automaticamente
                newWorker.postMessage({ type: 'SKIP_WAITING' });
              }
            });
          }
        });
        
        // Lidar com atualização de SW
        let refreshing = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!refreshing) {
            refreshing = true;
            console.log('Service Worker atualizado, recarregando a página...');
            window.location.reload();
          }
        });
        
        // Eventos de online/offline
        window.addEventListener('online', () => {
          console.log('Aplicativo online - sincronizando dados...');
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'ONLINE',
              timestamp: new Date().getTime()
            });
          }
        });
        
        window.addEventListener('offline', () => {
          console.log('Aplicativo offline - modo offline ativado');
        });
        
        // Registrar para sincronização em segundo plano se disponível
        if ('sync' in registration) {
          try {
            // Cast para garantir que o TypeScript entenda a propriedade sync
            const syncManager = (registration as any).sync;
            if (syncManager) {
              await syncManager.register('sync-transaction');
              console.log('Sincronização em segundo plano registrada');
            }
          } catch (err) {
            console.error('Falha ao registrar sincronização em segundo plano:', err);
          }
        }
      } catch (error) {
        console.error('Erro ao gerenciar o Service Worker:', error);
      }
    });
  }
}

// Função para verificar se o aplicativo já está instalado
export function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (window.navigator as any).standalone === true;
}

// Função para lidar com instalação direta do app
export function handleDirectInstall() {
  // Verificar se há um evento de instalação armazenado globalmente
  if ((window as any).deferredPrompt) {
    try {
      (window as any).deferredPrompt.prompt();
      return true;
    } catch (error) {
      console.error('Erro ao tentar instalar diretamente:', error);
      return false;
    }
  }
  return false;
}

// Interface para eventos de instalação do PWA
export function usePWAInstall() {
  let deferredPrompt: any = null;

  const setInstallPrompt = (e: any) => {
    deferredPrompt = e;
  };

  const clearInstallPrompt = () => {
    deferredPrompt = null;
  };

  const promptInstall = async () => {
    if (!deferredPrompt) {
      console.log('Não há prompt de instalação disponível');
      // Tentar acessar diretamente a variável global
      if ((window as any).deferredPrompt) {
        try {
          (window as any).deferredPrompt.prompt();
          return true;
        } catch (error) {
          console.error('Erro ao tentar instalação direta:', error);
        }
      }
      
      // Não há opções de instalação disponíveis
      alert('O aplicativo já está instalado ou seu navegador não suporta instalação de PWAs');
      return false;
    }

    // Temos um prompt local, vamos utilizá-lo
    deferredPrompt.prompt();
    try {
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`Usuário ${outcome === 'accepted' ? 'aceitou' : 'recusou'} a instalação`);
      clearInstallPrompt();
      return outcome === 'accepted';
    } catch (error) {
      console.error('Erro ao processar escolha de instalação:', error);
      return false;
    }
  };

  return {
    setInstallPrompt,
    clearInstallPrompt,
    promptInstall,
    deferredPrompt,
  };
}