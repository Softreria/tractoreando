# Configuración de PostgreSQL para Tractoreando

## Instalación de PostgreSQL

### En Ubuntu/Debian:
```bash
# Actualizar paquetes
sudo apt update

# Instalar PostgreSQL
sudo apt install postgresql postgresql-contrib

# Iniciar el servicio
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### En macOS:
```bash
# Con Homebrew
brew install postgresql
brew services start postgresql

# O con MacPorts
sudo port install postgresql14-server
sudo port load postgresql14-server
```

### En CentOS/RHEL:
```bash
# Instalar PostgreSQL
sudo yum install postgresql-server postgresql-contrib

# Inicializar la base de datos
sudo postgresql-setup initdb

# Iniciar el servicio
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## Configuración de la Base de Datos

### 1. Acceder a PostgreSQL
```bash
sudo -u postgres psql
```

### 2. Crear base de datos y usuario para desarrollo
```sql
-- Crear usuario
CREATE USER postgres WITH PASSWORD 'postgres';

-- Crear base de datos de desarrollo
CREATE DATABASE tractoreando_dev OWNER postgres;

-- Otorgar permisos
GRANT ALL PRIVILEGES ON DATABASE tractoreando_dev TO postgres;

-- Salir
\q
```

### 3. Crear base de datos y usuario para producción
```sql
-- Acceder como postgres
sudo -u postgres psql

-- Crear usuario de producción
CREATE USER tractoreando_user WITH PASSWORD 'tractoreando123';

-- Crear base de datos de producción
CREATE DATABASE tractoreando OWNER tractoreando_user;

-- Otorgar permisos
GRANT ALL PRIVILEGES ON DATABASE tractoreando TO tractoreando_user;

-- Salir
\q
```

## Configuración de Autenticación

### Editar pg_hba.conf (Ubuntu/Debian)
```bash
sudo nano /etc/postgresql/14/main/pg_hba.conf
```

### Agregar estas líneas al final:
```
# Tractoreando connections
local   tractoreando_dev    postgres                     md5
local   tractoreando        tractoreando_user            md5
host    tractoreando_dev    postgres        127.0.0.1/32 md5
host    tractoreando        tractoreando_user 127.0.0.1/32 md5
```

### Reiniciar PostgreSQL
```bash
sudo systemctl restart postgresql
```

## Verificar Conexión

### Desarrollo
```bash
psql -h localhost -U postgres -d tractoreando_dev
```

### Producción
```bash
psql -h localhost -U tractoreando_user -d tractoreando
```

## Migración desde SQLite (si es necesario)

### 1. Exportar datos de SQLite
```bash
# Si tienes datos en SQLite, puedes exportarlos
sqlite3 database.sqlite .dump > sqlite_dump.sql
```

### 2. Convertir formato SQLite a PostgreSQL
```bash
# Instalar herramienta de conversión
npm install -g sqlite-to-postgres

# Convertir
sqlite-to-postgres --source database.sqlite --target postgresql://postgres:postgres@localhost/tractoreando_dev
```

## Comandos Útiles

### Ver bases de datos
```sql
\l
```

### Conectar a una base de datos
```sql
\c tractoreando_dev
```

### Ver tablas
```sql
\dt
```

### Ver estructura de una tabla
```sql
\d "Users"
```

### Backup de base de datos
```bash
pg_dump -h localhost -U tractoreando_user tractoreando > backup.sql
```

### Restaurar backup
```bash
psql -h localhost -U tractoreando_user tractoreando < backup.sql
```

## Notas Importantes

1. **Seguridad**: Cambiar las contraseñas por defecto en producción
2. **Firewall**: Configurar reglas de firewall apropiadas
3. **SSL**: Habilitar SSL en producción
4. **Backup**: Configurar backups automáticos
5. **Monitoreo**: Implementar monitoreo de la base de datos

## Solución de Problemas

### Error de conexión
```bash
# Verificar que PostgreSQL esté ejecutándose
sudo systemctl status postgresql

# Verificar puertos
sudo netstat -tlnp | grep 5432
```

### Error de autenticación
```bash
# Verificar configuración
sudo cat /etc/postgresql/14/main/pg_hba.conf

# Reiniciar servicio
sudo systemctl restart postgresql
```