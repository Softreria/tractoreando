# Tractoreando - Guía de Instalación y Actualización

Esta guía te ayudará a instalar y actualizar Tractoreando en un servidor de producción.

## 📋 Requisitos del Sistema

- **Sistema Operativo**: Ubuntu 20.04 LTS o superior
- **RAM**: Mínimo 2GB, recomendado 4GB
- **Disco**: Mínimo 10GB de espacio libre
- **Red**: Acceso a internet para descargar dependencias
- **Permisos**: Acceso sudo en el servidor

## 🚀 Instalación Inicial

### 1. Preparar el servidor

```bash
# Conectar al servidor
ssh usuario@tu-servidor.com

# Actualizar el sistema
sudo apt update && sudo apt upgrade -y
```

### 2. Subir los archivos de la aplicación

```bash
# Opción 1: Usando scp
scp -r tractoreando/ usuario@tu-servidor.com:/tmp/

# Opción 2: Usando git (si tienes repositorio)
git clone https://github.com/tu-usuario/tractoreando.git /tmp/tractoreando
```

### 3. Ejecutar la instalación

```bash
# Ir al directorio de la aplicación
cd /tmp/tractoreando

# Hacer el script ejecutable (si no lo está)
chmod +x install.sh

# Ejecutar la instalación
./install.sh
```

### 4. Verificar la instalación

Después de la instalación, la aplicación estará disponible en:
- `http://tu-servidor.com`
- `http://IP-del-servidor`

**Credenciales de administrador:**
- Email: `admin@tractoreando.com`
- Contraseña: `admin123!`

## 🔄 Actualización

### Actualización estándar

```bash
# Ir al directorio de la aplicación
cd /opt/tractoreando

# Subir los nuevos archivos (reemplazar los existentes)
# Opción 1: Usando scp
scp -r nuevos-archivos/* .

# Opción 2: Usando git
git pull origin main

# Ejecutar la actualización
./update.sh
```

### Actualización con backup

```bash
# Actualización creando backup automático
./update.sh --backup
```

### Actualización forzada (sin confirmación)

```bash
# Útil para scripts automatizados
./update.sh --force
```

### Actualización completa con backup

```bash
# Combinando ambas opciones
./update.sh --backup --force
```

## 🛠️ Comandos Útiles

### Estado de la aplicación

```bash
# Ver estado de PM2
pm2 status

# Ver logs en tiempo real
pm2 logs

# Ver logs de un proceso específico
pm2 logs tractoreando
```

### Gestión de la aplicación

```bash
# Reiniciar la aplicación
pm2 restart all

# Detener la aplicación
pm2 stop all

# Iniciar la aplicación
pm2 start ecosystem.config.js

# Recargar la aplicación (sin downtime)
pm2 reload all
```

### Gestión de Nginx

```bash
# Verificar configuración
sudo nginx -t

# Recargar configuración
sudo systemctl reload nginx

# Reiniciar Nginx
sudo systemctl restart nginx

# Ver estado de Nginx
sudo systemctl status nginx
```

### Base de datos

```bash
# Conectar a MongoDB
mongo

# Ver estado de MongoDB
sudo systemctl status mongod

# Reiniciar MongoDB
sudo systemctl restart mongod
```

## 🔧 Solución de Problemas

### Errores de MongoDB

#### Error de dependencias (libssl1.1)

Si encuentras el error:
```
The following packages have unmet dependencies:
 mongodb-org-mongos : Depends: libssl1.1 (>= 1.1.1) but it is not installable
 mongodb-org-server : Depends: libssl1.1 (>= 1.1.1) but it is not installable
```

**Solución automática**: El script `install.sh` ya maneja este problema automáticamente para Ubuntu 22.04+.

#### Error de repositorio no encontrado (Ubuntu 24.10+)

Si encuentras el error:
```
E: The repository 'https://repo.mongodb.org/apt/ubuntu oracular/mongodb-org/6.0 Release' does not have a Release file.
```

**Solución automática**: El script `install.sh` detecta automáticamente versiones nuevas de Ubuntu (24.10 'oracular', etc.) y usa el repositorio 'noble' como fallback.

**Solución rápida** (si la instalación ya falló):
```bash
# Ejecutar script de reparación
./fix-mongodb-repo.sh
```

**Solución manual** (si es necesario):
```bash
# Para Ubuntu 24.10+ usar repositorio noble manualmente
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Descargar e instalar libssl1.1 si es necesario
wget http://archive.ubuntu.com/ubuntu/pool/main/o/openssl/libssl1.1_1.1.1f-1ubuntu2_amd64.deb
sudo dpkg -i libssl1.1_1.1.1f-1ubuntu2_amd64.deb
rm libssl1.1_1.1.1f-1ubuntu2_amd64.deb

# Luego continuar con la instalación
sudo apt-get update
sudo apt-get install -y mongodb-org
```

### La aplicación no inicia

```bash
# Verificar logs de PM2
pm2 logs

# Verificar que MongoDB esté ejecutándose
sudo systemctl status mongod

# Reiniciar MongoDB si es necesario
sudo systemctl restart mongod

# Reiniciar la aplicación
pm2 restart all
```

### Error 502 Bad Gateway

```bash
# Verificar que la aplicación esté ejecutándose
pm2 status

# Verificar configuración de Nginx
sudo nginx -t

# Ver logs de Nginx
sudo tail -f /var/log/nginx/error.log
```

### Problemas de permisos

```bash
# Corregir permisos de la aplicación
sudo chown -R tractoreando:tractoreando /opt/tractoreando
sudo chmod -R 755 /opt/tractoreando
```

### Restaurar desde backup

```bash
# Listar backups disponibles
ls -la /opt/tractoreando/backups/

# Restaurar un backup específico
sudo tar -xzf /opt/tractoreando/backups/tractoreando_backup_YYYYMMDD_HHMMSS.tar.gz -C /opt/

# Reiniciar la aplicación
pm2 restart all
```

## 📁 Estructura de Directorios

```
/opt/tractoreando/
├── backend/                 # Código del backend
├── frontend/               # Código del frontend
│   └── build/             # Frontend compilado
├── logs/                  # Logs de la aplicación
├── backups/              # Backups automáticos
├── ecosystem.config.js   # Configuración de PM2
├── nginx.conf           # Configuración de Nginx
├── install.sh          # Script de instalación
├── update.sh          # Script de actualización
└── init-admin.js     # Script para crear admin
```

## 🔐 Seguridad

### Cambiar contraseña del administrador

1. Acceder a la aplicación como administrador
2. Ir a "Perfil" → "Cambiar contraseña"
3. Introducir nueva contraseña segura

### Configurar HTTPS

```bash
# Instalar Certbot
sudo apt install certbot python3-certbot-nginx

# Obtener certificado SSL
sudo certbot --nginx -d tu-dominio.com

# Renovación automática
sudo crontab -e
# Añadir: 0 12 * * * /usr/bin/certbot renew --quiet
```

## 📞 Soporte

Si encuentras problemas durante la instalación o actualización:

1. Revisa los logs: `pm2 logs`
2. Verifica el estado de los servicios: `pm2 status`
3. Consulta esta documentación
4. Contacta al equipo de desarrollo

## 📝 Notas Importantes

- **Siempre** crea un backup antes de actualizar en producción
- **Nunca** ejecutes actualizaciones en horarios de alta demanda
- **Verifica** que la aplicación funcione correctamente después de cada actualización
- **Mantén** las credenciales de administrador seguras
- **Actualiza** regularmente el sistema operativo y las dependencias

---

**Versión de la documentación**: 1.0  
**Última actualización**: $(date +"%d/%m/%Y")