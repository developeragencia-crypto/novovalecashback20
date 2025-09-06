import React from 'react';
import { AlertCircle, Download, Package } from 'lucide-react';
import { Link } from 'wouter';

export function DownloadBanner() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex items-center">
        <div className="bg-blue-100 p-2 rounded-full mr-4">
          <Package className="h-6 w-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-lg text-blue-800">
            Aplicativo Completo Disponível
          </h3>
          <p className="text-blue-600">
            O Vale Cashback com banco de dados integrado está disponível para download e implantação.
          </p>
        </div>
        <Link href="/download" className="inline-flex items-center bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Download className="mr-2 h-4 w-4" />
          Baixar Agora
        </Link>
      </div>
    </div>
  );
}