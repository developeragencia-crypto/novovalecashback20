import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { isMobileDevice, getDeviceOS } from '@/pwaHelpers';
import { Download, X, Smartphone } from 'lucide-react';

// Variável global para armazenar o evento de instalação
let deferredPrompt: any = null;
// Variável para forçar instalação em navegadores que não emitem beforeinstallprompt
let forceInstallable = true;

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false); // Inicialmente não mostra o banner
  const [installable, setInstallable] = useState(true); // Sempre consideramos instalável
  const [dismissed, setDismissed] = useState(false);
  const [deviceOS, setDeviceOS] = useState<string | null>(null);

  useEffect(() => {
    // Reseta status no localStorage para garantir que sempre funcione
    localStorage.removeItem('pwa-install-dismissed');
    
    // Define como instalável por padrão
    forceInstallable = true;
    setInstallable(true);
    
    // Detecta o sistema operacional
    const os = getDeviceOS();
    setDeviceOS(os);
    
    // Verificar se o app já está instalado
    const isAppInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                          (window.navigator as any).standalone === true;
    
    if (isAppInstalled) {
      console.log('App já está instalado como PWA');
      return; // Não mostra o prompt se já estiver instalado
    }
    
    // Depois de 2 segundos, mostra o banner de instalação (para dar tempo de carregar a página)
    const timer = setTimeout(() => {
      setShowPrompt(true);
    }, 2000);
    
    // Captura o evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: any) => {
      // Previne que o Chrome mostre o prompt nativo
      e.preventDefault();
      // Armazena o evento para uso posterior
      console.log('BeforeInstallPrompt capturado!', e);
      deferredPrompt = e;
      setInstallable(true);
      
      // Sempre mostra o banner
      setShowPrompt(true);
    };
    
    // Detecta quando o app é instalado
    const handleAppInstalled = () => {
      console.log('App instalado com sucesso!');
      setShowPrompt(false);
      deferredPrompt = null;
    };
    
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, []);
  
  // Função para instalar o aplicativo
  const handleInstall = async () => {
    console.log('Tentando instalar app PWA...');
    
    // Se temos um evento de instalação, usamos ele (funciona no Chrome/Android)
    if (deferredPrompt) {
      try {
        // Mostra o prompt de instalação nativo
        deferredPrompt.prompt();
        
        // Espera pela resposta do usuário
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`Usuário ${outcome === 'accepted' ? 'aceitou' : 'recusou'} a instalação`);
        
        // Se o usuário aceitou, esconde o banner
        if (outcome === 'accepted') {
          setShowPrompt(false);
        }
      } catch (error) {
        console.error('Erro no prompt de instalação:', error);
      }
      
      // Limpa a referência ao prompt - só pode ser usado uma vez
      deferredPrompt = null;
    } 
    // Método alternativo baseado no sistema operacional
    else {
      const os = deviceOS || getDeviceOS();
      
      if (os === 'ios') {
        // Mostra instruções detalhadas para iOS
        alert(`Para instalar no iOS:

1. Toque no ícone de compartilhamento (quadrado com seta para cima) no menu do Safari
2. Role para baixo e toque em "Adicionar à Tela de Início"
3. Confirme o nome do aplicativo e toque em "Adicionar"
4. O ícone do Vale Cashback aparecerá na sua tela de início

Importante: Você DEVE usar o navegador Safari para instalar este aplicativo.`);
        
        // Não fecha o banner no iOS - o usuário precisa seguir as instruções
      } 
      else if (os === 'android') {
        // Para Android, tentamos diferentes abordagens
        if (/chrome/i.test(navigator.userAgent)) {
          alert(`Para instalar no Android:

1. Toque no menu (três pontos) no canto superior direito do Chrome
2. Selecione "Instalar aplicativo" ou "Adicionar à tela inicial"
3. Confirme a instalação

Se a opção não aparecer, vá para as configurações do Chrome > Adicionar à tela inicial.`);
          
          // Força reload para tentar novamente com parâmetros
          window.location.href = `/?install=true&t=${Date.now()}`;
        } else {
          alert('Para melhor experiência de instalação, abra esta página no Chrome para Android');
        }
      } 
      else {
        // Navegadores desktop - Firefox, Safari, Edge, etc.
        alert(`Para instalar em navegadores desktop:

1. Procure pelo ícone de instalação na barra de endereço (geralmente à direita)
2. Clique nele e selecione "Instalar" ou "Adicionar"

Se não encontrar a opção, vá ao menu do navegador e procure por "Instalar aplicativo" ou "Adicionar à tela inicial".`);
      }
    }
  };
  
  // Força a instalação através de um botão em outro lugar da UI
  const forceShowInstallBanner = () => {
    setShowPrompt(true);
    setDismissed(false);
  };
  
  // Expõe a função para o window para poder ser chamada de qualquer lugar
  useEffect(() => {
    (window as any).showInstallBanner = forceShowInstallBanner;
  }, []);
  
  // Função para fechar o banner (sem salvar preferência para sempre mostrar)
  const handleDismiss = () => {
    setShowPrompt(false);
    setDismissed(true);
  };
  
  if (!showPrompt || dismissed) return null;
  
  const isIOS = deviceOS === 'ios';
  const isAndroid = deviceOS === 'android';
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Smartphone className="text-primary h-5 w-5" />
            <h4 className="text-base font-medium">Baixe o Vale Cashback</h4>
          </div>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={handleDismiss}
            className="h-8 w-8 p-0 rounded-full"
          >
            <X size={16} />
          </Button>
        </div>
        
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
          {isIOS
            ? "Use o Safari para adicionar à tela inicial do seu iPhone ou iPad"
            : isAndroid
              ? "Instale para usar mesmo sem internet e receber notificações"
              : "Tenha o Vale Cashback sempre disponível no seu dispositivo"}
        </p>
        
        {/* Botão principal de instalação */}
        <Button 
          onClick={handleInstall}
          className="w-full flex items-center justify-center gap-2"
          variant="default"
          size="lg"
        >
          <Download size={20} />
          {isIOS 
            ? "Adicionar à Tela de Início" 
            : "Instalar Aplicativo"}
        </Button>
      </div>
    </div>
  );
}