import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SimpleLayout } from "@/components/layout/simple-layout";
import { 
  Wallet, 
  ShoppingBag, 
  Gift, 
  TrendingUp,
  QrCode,
  CreditCard,
  Users,
  Star
} from "lucide-react";
import { Link } from "wouter";

export default function SimpleClientPanel() {
  const { data: dashboardData } = useQuery({
    queryKey: ['/api/client/dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/client/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard data');
      return response.json();
    }
  });

  const actions = (
    <div className="flex gap-2">
      <Link href="/client/scanner">
        <Button variant="outline" className="gap-2">
          <QrCode className="h-4 w-4" />
          Pagar com QR
        </Button>
      </Link>
      <Link href="/client/stores">
        <Button className="gap-2 bg-[#3db54e] hover:bg-[#36a146]">
          <ShoppingBag className="h-4 w-4" />
          Ver Lojas
        </Button>
      </Link>
    </div>
  );

  return (
    <SimpleLayout 
      title="Meu Dashboard" 
      subtitle="Bem-vindo ao Vale Cashback"
      actions={actions}
      userType="client"
    >
      <div className="space-y-6">
        {/* Saldo e métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-[#3db54e]/20 bg-gradient-to-r from-[#3db54e]/5 to-[#36a146]/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Saldo Cashback
              </CardTitle>
              <Wallet className="h-5 w-5 text-[#3db54e]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                R$ {dashboardData?.cashback?.balance || '12,45'}
              </div>
              <p className="text-xs text-[#3db54e] mt-1 font-medium">
                Disponível para saque
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#f58220]/20 bg-gradient-to-r from-[#f58220]/5 to-[#e37718]/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Ganho
              </CardTitle>
              <Gift className="h-5 w-5 text-[#f58220]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                R$ {dashboardData?.totalEarned || '89,73'}
              </div>
              <p className="text-xs text-[#f58220] mt-1 font-medium">
                Desde o cadastro
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-gradient-to-r from-blue-50 to-blue-100/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Compras
              </CardTitle>
              <ShoppingBag className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {dashboardData?.totalPurchases || 23}
              </div>
              <p className="text-xs text-blue-600 mt-1 font-medium">
                Transações realizadas
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 bg-gradient-to-r from-purple-50 to-purple-100/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Indicações
              </CardTitle>
              <Users className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {dashboardData?.referrals || 3}
              </div>
              <p className="text-xs text-purple-600 mt-1 font-medium">
                Amigos indicados
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Transações recentes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#3db54e]" />
                Últimas Transações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="font-medium">Magazine Luiza</p>
                      <p className="text-sm text-gray-600">R$ 299,90</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-green-100 text-green-700">+R$ 7,50</Badge>
                    <p className="text-xs text-gray-500 mt-1">2.5% cashback</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="h-4 w-4 text-blue-600" />
                    <div>
                      <p className="font-medium">Amazon</p>
                      <p className="text-sm text-gray-600">R$ 89,99</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-blue-100 text-blue-700">+R$ 3,15</Badge>
                    <p className="text-xs text-gray-500 mt-1">3.5% cashback</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <ShoppingBag className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="font-medium">iFood</p>
                      <p className="text-sm text-gray-600">R$ 45,50</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-orange-100 text-orange-700">+R$ 2,28</Badge>
                    <p className="text-xs text-gray-500 mt-1">5% cashback</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-[#f58220]" />
                Lojas em Destaque
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Amazon</p>
                    <p className="text-sm text-gray-600">Eletrônicos e livros</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">3.5%</Badge>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">iFood</p>
                    <p className="text-sm text-gray-600">Delivery de comida</p>
                  </div>
                  <Badge className="bg-orange-100 text-orange-700">5%</Badge>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Netshoes</p>
                    <p className="text-sm text-gray-600">Esportes e fitness</p>
                  </div>
                  <Badge className="bg-blue-100 text-blue-700">3%</Badge>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium">Booking.com</p>
                    <p className="text-sm text-gray-600">Hotéis e viagens</p>
                  </div>
                  <Badge className="bg-purple-100 text-purple-700">4%</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Ações rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/client/scanner">
                <Button variant="outline" className="w-full gap-2">
                  <QrCode className="h-4 w-4" />
                  Pagar QR
                </Button>
              </Link>
              <Link href="/client/stores">
                <Button variant="outline" className="w-full gap-2">
                  <ShoppingBag className="h-4 w-4" />
                  Ver Lojas
                </Button>
              </Link>
              <Link href="/client/transfers">
                <Button variant="outline" className="w-full gap-2">
                  <Wallet className="h-4 w-4" />
                  Transferir
                </Button>
              </Link>
              <Link href="/client/referrals">
                <Button variant="outline" className="w-full gap-2">
                  <Users className="h-4 w-4" />
                  Indicar
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </SimpleLayout>
  );
}