#!/bin/bash

# Script para limpiar archivos grandes del historial de Git
echo "🧹 Limpiando historial de Git..."
echo "================================="

# Hacer backup del repositorio actual
echo "[INFO] Creando backup..."
cp -r .git .git.backup

# Limpiar archivos específicos del historial
echo "[INFO] Eliminando archivos grandes del historial..."

# Eliminar archivos de cache de node_modules
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch -r frontend/node_modules/.cache || true' \
  --prune-empty --tag-name-filter cat -- --all 2>/dev/null

# Eliminar archivos .pack grandes
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch frontend/node_modules/.cache/*.pack || true' \
  --prune-empty --tag-name-filter cat -- --all 2>/dev/null

# Limpiar referencias
echo "[INFO] Limpiando referencias..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Verificar tamaño del repositorio
echo "[INFO] Tamaño del repositorio después de la limpieza:"
du -sh .git

echo "[SUCCESS] ¡Historial de Git limpiado!"
echo ""
echo "[INFO] Pasos siguientes:"
echo "  1. Verificar que todo funcione: git log --oneline"
echo "  2. Hacer push forzado: git push --force-with-lease origin main"
echo "  3. Si hay problemas, restaurar: rm -rf .git && mv .git.backup .git"