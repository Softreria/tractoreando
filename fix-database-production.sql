-- Script para arreglar la base de datos en producción
-- Ejecutar como usuario postgres

-- Crear el usuario si no existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'tractoreando_user') THEN
        CREATE USER tractoreando_user WITH PASSWORD 'tractoreando123';
    END IF;
END
$$;

-- Crear la base de datos si no existe
SELECT 'CREATE DATABASE tractoreando OWNER tractoreando_user'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'tractoreando')\gexec

-- Otorgar permisos
GRANT ALL PRIVILEGES ON DATABASE tractoreando TO tractoreando_user;

-- Conectar a la base de datos tractoreando
\c tractoreando

-- Otorgar permisos en el esquema public
GRANT ALL ON SCHEMA public TO tractoreando_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO tractoreando_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO tractoreando_user;

-- Establecer permisos por defecto para objetos futuros
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO tractoreando_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO tractoreando_user;