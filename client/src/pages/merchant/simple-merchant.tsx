import React from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SimpleLayout } from "@/components/layout/simple-layout";
import { 
  Store, 
  DollarSign, 
  ShoppingCart, 
  TrendingUp,
  QrCode,
  Users,
  BarChart3,
  Package
} from "lucide-react";
import { Link } from "wouter";

export default function SimpleMerchantPanel() {
  const { data: merchantData } = useQuery({
    queryKey: ['/api/merchant/dashboard'],
    queryFn: async () => {
      const response = await fetch('/api/merchant/dashboard');
      if (!response.ok) throw new Error('Failed to fetch merchant data');
      return response.json();
    }
  });

  const actions = (
    <div className="flex gap-2">
      <Link href="/merchant/payment-qr">
        <Button variant="outline" className="gap-2">
          <QrCode className="h-4 w-4" />
          Gerar QR Code
        </Button>
      </Link>
      <Link href="/merchant/sales">
        <Button className="gap-2 bg-[#3db54e] hover:bg-[#36a146]">
          <BarChart3 className="h-4 w-4" />
          Ver Vendas
        </Button>
      </Link>
    </div>
  );

  return (
    <SimpleLayout 
      title="Painel do Lojista" 
      subtitle="Gerencie suas vendas e produtos"
      actions={actions}
      userType="merchant"
    >
      <div className="space-y-6">
        {/* Métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="border-[#3db54e]/20 bg-gradient-to-r from-[#3db54e]/5 to-[#36a146]/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Vendas Hoje
              </CardTitle>
              <DollarSign className="h-5 w-5 text-[#3db54e]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                R$ {merchantData?.todaySales || '1.234,56'}
              </div>
              <p className="text-xs text-[#3db54e] mt-1 font-medium">
                +15% em relação a ontem
              </p>
            </CardContent>
          </Card>

          <Card className="border-[#f58220]/20 bg-gradient-to-r from-[#f58220]/5 to-[#e37718]/5">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Pedidos
              </CardTitle>
              <ShoppingCart className="h-5 w-5 text-[#f58220]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {merchantData?.todayOrders || 23}
              </div>
              <p className="text-xs text-[#f58220] mt-1 font-medium">
                Pedidos processados hoje
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-500/20 bg-gradient-to-r from-blue-50 to-blue-100/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Produtos
              </CardTitle>
              <Package className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {merchantData?.totalProducts || 147}
              </div>
              <p className="text-xs text-blue-600 mt-1 font-medium">
                Produtos cadastrados
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 bg-gradient-to-r from-purple-50 to-purple-100/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Clientes
              </CardTitle>
              <Users className="h-5 w-5 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {merchantData?.totalCustomers || 89}
              </div>
              <p className="text-xs text-purple-600 mt-1 font-medium">
                Clientes únicos
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Vendas recentes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-[#3db54e]" />
                Vendas Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Pedido #1001</p>
                      <p className="text-sm text-gray-600">Cliente: Maria Silva</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">R$ 89,90</p>
                    <Badge className="bg-green-100 text-green-700">Concluído</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Pedido #1002</p>
                      <p className="text-sm text-gray-600">Cliente: João Santos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-yellow-600">R$ 156,70</p>
                    <Badge className="bg-yellow-100 text-yellow-700">Processando</Badge>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <div>
                      <p className="font-medium">Pedido #1003</p>
                      <p className="text-sm text-gray-600">Cliente: Ana Costa</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-600">R$ 234,50</p>
                    <Badge className="bg-green-100 text-green-700">Concluído</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-[#f58220]" />
                Estatísticas do Mês
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Vendas Totais</span>
                  <span className="font-bold text-[#3db54e]">R$ 15.678,90</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Comissão Gerada</span>
                  <span className="font-bold text-[#f58220]">R$ 391,97</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Taxa Média</span>
                  <span className="font-bold text-blue-600">2.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Pedidos Processados</span>
                  <span className="font-bold text-purple-600">156</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ticket Médio</span>
                  <span className="font-bold text-green-600">R$ 100,51</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Produtos em destaque */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              Produtos Mais Vendidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Smartphone Galaxy S23</p>
                  <p className="text-sm text-gray-600">12 vendas este mês</p>
                </div>
                <Badge className="bg-green-100 text-green-700">Top 1</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Notebook Dell Inspiron</p>
                  <p className="text-sm text-gray-600">8 vendas este mês</p>
                </div>
                <Badge className="bg-blue-100 text-blue-700">Top 2</Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium">Fone Bluetooth JBL</p>
                  <p className="text-sm text-gray-600">6 vendas este mês</p>
                </div>
                <Badge className="bg-purple-100 text-purple-700">Top 3</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Ações rápidas */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Link href="/merchant/payment-qr">
                <Button variant="outline" className="w-full gap-2">
                  <QrCode className="h-4 w-4" />
                  Gerar QR
                </Button>
              </Link>
              <Link href="/merchant/products">
                <Button variant="outline" className="w-full gap-2">
                  <Package className="h-4 w-4" />
                  Produtos
                </Button>
              </Link>
              <Link href="/merchant/sales">
                <Button variant="outline" className="w-full gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Vendas
                </Button>
              </Link>
              <Link href="/merchant/customers">
                <Button variant="outline" className="w-full gap-2">
                  <Users className="h-4 w-4" />
                  Clientes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </SimpleLayout>
  );
}