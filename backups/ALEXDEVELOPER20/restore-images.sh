#!/bin/bash
# Script para restaurar todas as imagens do Vale Cashback

echo "Restaurando imagens do Vale Cashback..."

# Criar diretórios necessários
mkdir -p client/public/uploads/brand

# Copiar a imagem principal para todos os locais necessários
cp attached_assets/1000204264.png client/public/valecashback-logo.png
cp attached_assets/1000204264.png client/public/favicon.png
cp attached_assets/1000204264.png client/public/icon-192.png
cp attached_assets/1000204264.png client/public/icon-512.png
cp attached_assets/1000204264.png client/public/uploads/brand/valecashback-logo.png
cp attached_assets/1000204264.png client/public/uploads/brand/favicon.png

echo "Todas as imagens foram restauradas com sucesso!"
