import { useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { QRCodeDisplay } from "@/components/ui/qr-code";
import { Loader2, RotateCw, Calendar } from "lucide-react";
import { useQRCode } from "@/hooks/use-qr-code";

// Mock QR code data - would be replaced with real data from API
const recentQRCodes = [
  { id: 1, amount: 50.00, description: "Pagamento de serviço", date: "15/07/2023" },
  { id: 2, amount: 25.00, description: "Divisão de almoço", date: "10/07/2023" },
];

export default function ClientQRCode() {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const { loading, qrCode, generateQRCode } = useQRCode();

  const handleGenerateQRCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount) return;
    
    await generateQRCode(parseFloat(amount), description);
  };

  const handleRegenerateQRCode = (existingAmount: number, existingDescription?: string) => {
    setAmount(existingAmount.toString());
    setDescription(existingDescription || "");
    generateQRCode(existingAmount, existingDescription);
  };

  return (
    <DashboardLayout title="QR Code" type="client">
      <div className="grid md:grid-cols-2 gap-6">
        {/* QR Code Generator */}
        <Card>
          <CardHeader>
            <CardTitle>Gerar QR Code</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleGenerateQRCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Valor (R$)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição (opcional)</Label>
                <Input
                  id="description"
                  placeholder="Finalidade do pagamento"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={loading}
                />
              </div>

              <Button type="submit" className="w-full bg-secondary" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <span>Gerar QR Code</span>
                )}
              </Button>
            </form>

            {/* QR Code Display */}
            {qrCode && (
              <div className="mt-6">
                <QRCodeDisplay
                  value={qrCode.code || `ValeCashback-Payment-${qrCode.id}`}
                  title={`QR Code para receber R$ ${qrCode.amount.toFixed(2)}`}
                  amount={qrCode.amount}
                  description={description}
                  expiresAt={new Date(qrCode.expiresAt)}
                  loading={loading}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent QR Codes */}
        <Card>
          <CardHeader>
            <CardTitle>QR Codes Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentQRCodes.map((qrCode) => (
                <div key={qrCode.id} className="p-3 border rounded-lg flex items-center">
                  <div className="mr-3 bg-muted p-2 rounded">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">R$ {qrCode.amount.toFixed(2)}</div>
                    <div className="text-sm text-muted-foreground flex items-center">
                      <Calendar className="mr-1 h-3 w-3" />
                      <span>{qrCode.description} - {qrCode.date}</span>
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-secondary"
                    onClick={() => handleRegenerateQRCode(qrCode.amount, qrCode.description)}
                  >
                    <RotateCw className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              
              {recentQRCodes.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  Nenhum QR Code recente encontrado.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
