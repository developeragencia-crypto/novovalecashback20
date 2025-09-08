import { useState, useRef, useEffect } from "react";
import { Html5QrcodeScanner, Html5Qrcode } from "html5-qrcode";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Camera, X, Zap, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface QRScanResult {
  success: boolean;
  qr_info?: {
    merchant_id: number;
    merchant_name: string;
    amount: number;
    description: string;
    qr_code_id: string;
  };
  message: string;
}

interface PaymentConfirmation {
  merchant_name: string;
  amount: number;
  description: string;
  qr_code_id: string;
}

interface QRScannerEnhancedProps {
  onClose?: () => void;
  onPaymentComplete?: (result: any) => void;
}

export function QRScannerEnhanced({ onClose, onPaymentComplete }: QRScannerEnhancedProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [paymentConfirmation, setPaymentConfirmation] = useState<PaymentConfirmation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Escanear QR Code
  const scanQRMutation = useMutation({
    mutationFn: async (qrData: string) => {
      const response = await fetch("/api/client/scan-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ qr_data: qrData }),
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Erro ao processar QR Code");
      return result;
    },
    onSuccess: (data: QRScanResult) => {
      setScanResult(data);
      if (data.success && data.qr_info) {
        setPaymentConfirmation({
          merchant_name: data.qr_info.merchant_name,
          amount: data.qr_info.amount,
          description: data.qr_info.description,
          qr_code_id: data.qr_info.qr_code_id,
        });
      }
      stopScanner();
    },
    onError: (error: Error) => {
      setError(error.message);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Processar pagamento
  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData: PaymentConfirmation) => {
      const response = await fetch("/api/client/process-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: paymentData.qr_code_id, // Será extraído do QR
          amount: paymentData.amount,
          description: paymentData.description,
          payment_method: "qrcode",
          qr_code_id: paymentData.qr_code_id,
        }),
      });
      
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Erro ao processar pagamento");
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Pagamento realizado!",
        description: `Pagamento de R$ ${paymentConfirmation?.amount.toFixed(2)} processado com sucesso`,
      });
      
      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ["client", "transactions"] });
      queryClient.invalidateQueries({ queryKey: ["client", "cashback"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      
      if (onPaymentComplete) {
        onPaymentComplete(data);
      }
      
      // Fechar scanner
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no pagamento",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const startScanner = () => {
    setIsScanning(true);
    setError(null);
    
    if (scannerRef.current) {
      scannerRef.current.clear();
    }

    scannerRef.current = new Html5QrcodeScanner(
      "qr-scanner-container",
      {
        fps: 10,
        qrbox: { width: 280, height: 280 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 2,
      },
      false
    );

    scannerRef.current.render(
      (decodedText) => {
        try {
          // Tentar processar o QR code
          scanQRMutation.mutate(decodedText);
        } catch (error) {
          setError("QR Code inválido");
        }
      },
      (error) => {
        // Ignorar erros de scan contínuo
        if (!error.includes("NotFoundException")) {
          console.warn("QR Code scan error:", error);
        }
      }
    );
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear();
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanner();
    setScanResult(null);
    setPaymentConfirmation(null);
    setError(null);
    if (onClose) {
      onClose();
    }
  };

  const handleConfirmPayment = () => {
    if (paymentConfirmation) {
      processPaymentMutation.mutate(paymentConfirmation);
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="space-y-4">
      {/* Scanner Interface */}
      <Card data-testid="qr-scanner-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Scanner QR Code
              </CardTitle>
              <CardDescription>
                Aponte a câmera para o QR Code do lojista
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClose}
              data-testid="button-close-scanner"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent>
          {!isScanning && !scanResult && (
            <div className="text-center space-y-4">
              <div className="w-64 h-64 mx-auto border-2 border-dashed border-muted-foreground/25 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Clique para iniciar o scanner
                  </p>
                </div>
              </div>
              
              <Button
                onClick={startScanner}
                className="w-full"
                data-testid="button-start-scanner"
              >
                <Zap className="h-4 w-4 mr-2" />
                Iniciar Scanner
              </Button>
            </div>
          )}

          {isScanning && (
            <div className="space-y-4">
              <div id="qr-scanner-container" className="mx-auto" />
              
              <div className="text-center">
                <Badge variant="outline" className="animate-pulse">
                  <Camera className="h-3 w-3 mr-1" />
                  Escaneando...
                </Badge>
                
                <Button
                  variant="outline"
                  onClick={stopScanner}
                  className="mt-4 w-full"
                  data-testid="button-stop-scanner"
                >
                  Parar Scanner
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="text-center space-y-4">
              <div className="p-4 border border-red-200 bg-red-50 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-500 mx-auto mb-2" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
              
              <Button
                onClick={() => {
                  setError(null);
                  startScanner();
                }}
                variant="outline"
                data-testid="button-retry-scanner"
              >
                Tentar Novamente
              </Button>
            </div>
          )}

          {scanResult && scanResult.success && (
            <div className="text-center space-y-4">
              <div className="p-4 border border-green-200 bg-green-50 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-green-700">{scanResult.message}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Confirmation Dialog */}
      <Dialog open={!!paymentConfirmation} onOpenChange={() => setPaymentConfirmation(null)}>
        <DialogContent data-testid="payment-confirmation-dialog">
          <DialogHeader>
            <DialogTitle>Confirmar Pagamento</DialogTitle>
            <DialogDescription>
              Revise os detalhes do pagamento antes de confirmar
            </DialogDescription>
          </DialogHeader>
          
          {paymentConfirmation && (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Lojista:</span>
                  <span data-testid="text-merchant-name">{paymentConfirmation.merchant_name}</span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Valor:</span>
                  <span className="text-xl font-bold text-green-600" data-testid="text-payment-amount">
                    R$ {paymentConfirmation.amount.toFixed(2)}
                  </span>
                </div>
                
                <div className="flex justify-between">
                  <span className="font-medium">Descrição:</span>
                  <span data-testid="text-payment-description">{paymentConfirmation.description}</span>
                </div>
                
                <div className="pt-2 border-t">
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Cashback estimado (2%):</span>
                    <span className="text-green-600 font-medium">
                      R$ {(paymentConfirmation.amount * 0.02).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPaymentConfirmation(null)}
              data-testid="button-cancel-payment"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={processPaymentMutation.isPending}
              data-testid="button-confirm-payment"
            >
              {processPaymentMutation.isPending ? "Processando..." : "Confirmar Pagamento"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default QRScannerEnhanced;