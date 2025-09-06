import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

/**
 * Botão de instalação do aplicativo que pode ser incluído em qualquer lugar da UI
 * Usa a função exposta no window pelo PWAInstallPrompt para mostrar o banner de instalação
 */
export function InstallButton() {
  const handleShowInstallPrompt = () => {
    console.log('Botão de instalação clicado');
    
    // Verifica se a função existe no window (adicionada pelo componente PWAInstallPrompt)
    if (typeof (window as any).showInstallBanner === 'function') {
      console.log('Função de instalação encontrada, chamando showInstallBanner');
      // Chama a função para mostrar o banner de instalação
      (window as any).showInstallBanner();
    } else {
      console.warn('Função de instalação não disponível. O componente PWAInstallPrompt não está carregado.');
      
      // Tenta verificar se existe o evento de instalação para mostrar diretamente
      if ((window as any).deferredPrompt) {
        console.log('Evento de instalação encontrado, tentando mostrar diretamente');
        try {
          (window as any).deferredPrompt.prompt();
        } catch (error) {
          console.error('Erro ao mostrar prompt de instalação:', error);
        }
      } else {
        console.warn('Não foi possível encontrar um mecanismo para instalação do app');
        alert('O aplicativo pode já estar instalado ou seu navegador não suporta instalação de PWAs');
      }
    }
  };

  return (
    <Button 
      onClick={handleShowInstallPrompt}
      variant="outline"
      className="flex items-center gap-2"
    >
      <Download size={16} />
      Instalar App
    </Button>
  );
}