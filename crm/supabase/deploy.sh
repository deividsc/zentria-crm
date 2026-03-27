#!/bin/bash
# ===========================================
# Deploy Script para Supabase
# Ejecuta las migraciones en orden
# ===========================================

set -e

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

# Configuración
PROJECT_REF="${SUPABASE_PROJECT_REF:-jfoqucsjrzsoxhbepowk}"
DB_PASSWORD="${SUPABASE_DB_PASSWORD:-qiczew-nacqeH-pasgo9}"

echo "==========================================="
echo "Zentria CRM - Supabase Deploy"
echo "==========================================="
echo "Project: $PROJECT_REF"
echo ""

# Verificar si supabase CLI está instalado
if command -v supabase &> /dev/null; then
    echo "Usando Supabase CLI..."
    
    # Link al proyecto local
    supabase link --project-ref "$PROJECT_REF"
    
    # Push migraciones
    echo "Ejecutando migraciones..."
    supabase db push
    
    echo -e "${GREEN}✓ Migraciones aplicadas correctamente${NC}"
else
    echo "Supabase CLI no instalado."
    echo "Ejecutando migraciones manualmente via psql..."
    echo ""
    
    # Verificar psql
    if ! command -v psql &> /dev/null; then
        echo -e "${RED}Error: psql no está instalado${NC}"
        echo "Instalá psql: brew install postgresql"
        exit 1
    fi
    
    # Connection string
    CONNECTION_STRING="postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.co:5432/postgres"
    
    echo "Connection: $PROJECT_REF.supabase.co"
    echo ""
    
    # Ejecutar migraciones en orden
    for migration in migrations/*.sql; do
        if [ -f "$migration" ]; then
            echo "Ejecutando: $(basename $migration)"
            PGPASSWORD="$DB_PASSWORD" psql "$CONNECTION_STRING" -f "$migration"
            echo ""
        fi
    done
    
    echo -e "${GREEN}✓ Migraciones aplicadas correctamente${NC}"
fi

echo ""
echo "==========================================="
echo "Verificando tablas..."
echo "==========================================="

# Verificar que las tablas existen
PGPASSWORD="$DB_PASSWORD" psql "$CONNECTION_STRING" -c "\dt"

echo ""
echo -e "${GREEN}✓ Deploy completo${NC}"
