const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const fs = require('fs');
const User = require('./models/User');
const Company = require('./models/Company');
require('dotenv').config();

class LoginDiagnostic {
  constructor() {
    this.mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/tractoreando';
    this.apiUrl = process.env.API_URL || 'https://tractoreando.softreria.com/api';
    this.testCredentials = {
      email: 'admin@tractoreando.com',
      password: 'admin123'
    };
  }

  async run() {
    console.log('🔧 DIAGNÓSTICO Y CORRECCIÓN COMPLETA DE LOGIN');
    console.log('============================================================');
    
    try {
      await this.checkEnvironment();
      await this.connectDatabase();
      await this.verifyDatabaseData();
      await this.testDirectAuth();
      await this.testApiEndpoint();
      await this.provideSolution();
    } catch (error) {
      console.error('❌ Error crítico:', error.message);
      process.exit(1);
    } finally {
      await mongoose.disconnect();
    }
  }

  async checkEnvironment() {
    console.log('\n1️⃣ VERIFICANDO ENTORNO...');
    
    const criticalVars = {
      'JWT_SECRET': process.env.JWT_SECRET,
      'MONGODB_URI': process.env.MONGODB_URI,
      'NODE_ENV': process.env.NODE_ENV
    };
    
    let hasErrors = false;
    
    for (const [key, value] of Object.entries(criticalVars)) {
      if (!value) {
        console.log(`❌ ${key}: NO DEFINIDO`);
        hasErrors = true;
      } else {
        console.log(`✅ ${key}: Definido`);
      }
    }
    
    if (hasErrors) {
      console.log('\n🔧 CORRIGIENDO VARIABLES DE ENTORNO...');
      await this.fixEnvironmentVars();
    }
  }

  async fixEnvironmentVars() {
    const envContent = `
# Variables críticas para autenticación
JWT_SECRET=tractoreando_jwt_secret_2024_super_secure_key_12345
MONGODB_URI=mongodb://127.0.0.1:27017/tractoreando
NODE_ENV=production
PORT=5000
API_URL=https://tractoreando.softreria.com/api
`;
    
    try {
      fs.appendFileSync('.env.production', envContent);
      console.log('✅ Variables agregadas a .env.production');
      
      // Recargar variables
      require('dotenv').config({ path: '.env.production' });
      console.log('✅ Variables recargadas');
    } catch (error) {
      console.log('❌ Error escribiendo .env:', error.message);
    }
  }

  async connectDatabase() {
    console.log('\n2️⃣ CONECTANDO A BASE DE DATOS...');
    
    try {
      await mongoose.connect(this.mongoUri);
      console.log('✅ Conectado a MongoDB');
    } catch (error) {
      console.log('❌ Error conectando a MongoDB:', error.message);
      throw error;
    }
  }

  async verifyDatabaseData() {
    console.log('\n3️⃣ VERIFICANDO DATOS EN BD...');
    
    const userCount = await User.countDocuments();
    console.log(`📊 Total usuarios: ${userCount}`);
    
    if (userCount === 0) {
      console.log('⚠️  No hay usuarios, ejecutando data loader...');
      await this.runDataLoader();
    }
    
    const testUser = await User.findOne({ email: this.testCredentials.email });
    if (!testUser) {
      console.log('❌ Usuario de prueba no encontrado');
      await this.createTestUser();
    } else {
      console.log('✅ Usuario de prueba encontrado');
      console.log(`   📧 Email: ${testUser.email}`);
      console.log(`   🎭 Rol: ${testUser.role}`);
      console.log(`   ✅ Activo: ${testUser.isActive}`);
    }
  }

  async runDataLoader() {
    console.log('🔄 Ejecutando data loader...');
    try {
      const { exec } = require('child_process');
      await new Promise((resolve, reject) => {
        exec('node data-loader.js', (error, stdout, stderr) => {
          if (error) reject(error);
          else resolve(stdout);
        });
      });
      console.log('✅ Data loader ejecutado');
    } catch (error) {
      console.log('❌ Error en data loader:', error.message);
    }
  }

  async createTestUser() {
    console.log('👤 Creando usuario de prueba...');
    
    try {
      // Crear empresa
      const company = new Company({
        name: 'Tractoreando Admin',
        rfc: 'TAD123456789',
        address: {
          street: 'Calle Principal 123',
          city: 'Madrid',
          state: 'Madrid',
          zipCode: '28001',
          country: 'España'
        },
        contact: {
          phone: '+34 900 000 000',
          email: 'admin@tractoreando.com'
        },
        subscription: {
          plan: 'enterprise',
          maxVehicles: 1000,
          maxUsers: 100,
          maxBranches: 50
        },
        isActive: true
      });
      await company.save();
      
      // Crear usuario
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(this.testCredentials.password, salt);
      
      const user = new User({
        firstName: 'Admin',
        lastName: 'Tractoreando',
        email: this.testCredentials.email,
        password: hashedPassword,
        role: 'super_admin',
        company: company._id,
        isActive: true,
        emailVerified: true
      });
      
      await user.save();
      console.log('✅ Usuario de prueba creado');
    } catch (error) {
      console.log('❌ Error creando usuario:', error.message);
    }
  }

  async testDirectAuth() {
    console.log('\n4️⃣ PROBANDO AUTENTICACIÓN DIRECTA...');
    
    const user = await User.findOne({ email: this.testCredentials.email });
    if (!user) {
      console.log('❌ Usuario no encontrado');
      return false;
    }
    
    const isValid = await user.comparePassword(this.testCredentials.password);
    console.log(`🔐 Autenticación directa: ${isValid ? '✅ VÁLIDA' : '❌ INVÁLIDA'}`);
    
    if (!isValid) {
      console.log('🔧 Corrigiendo password...');
      await this.fixUserPassword(user);
    }
    
    return isValid;
  }

  async fixUserPassword(user) {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(this.testCredentials.password, salt);
      
      user.password = hashedPassword;
      user.loginAttempts = 0;
      user.lockUntil = undefined;
      await user.save();
      
      console.log('✅ Password corregido');
    } catch (error) {
      console.log('❌ Error corrigiendo password:', error.message);
    }
  }

  async testApiEndpoint() {
    console.log('\n5️⃣ PROBANDO ENDPOINT DE API...');
    
    // Primero verificar normalización de email
    const emailOk = await this.debugEmailNormalization();
    
    if (!emailOk) {
      console.log('🔄 Intentando corregir email en BD...');
      const fixed = await this.fixEmailInDatabase();
      if (!fixed) {
        console.log('❌ No se pudo corregir el email');
        return false;
      }
    }
    
    try {
      const response = await axios.post(`${this.apiUrl}/auth/login`, this.testCredentials, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });
      
      console.log('✅ LOGIN API EXITOSO');
      console.log(`🎫 Token recibido: ${response.data.token ? 'Sí' : 'No'}`);
      return true;
      
    } catch (error) {
      console.log('❌ LOGIN API FALLÓ');
      
      if (error.response) {
        console.log(`📊 Status: ${error.response.status}`);
        console.log(`💬 Mensaje: ${error.response.data?.message || 'Sin mensaje'}`);
        
        if (error.response.data?.errors) {
          console.log('📋 Errores de validación:');
          error.response.data.errors.forEach(err => {
            console.log(`   - ${err.msg} (${err.param})`);
          });
        }
      } else {
        console.log(`🔌 Error de conexión: ${error.message}`);
      }
      
      return false;
    }
  }

  async debugEmailNormalization() {
    console.log('\n🔍 DEBUGEANDO NORMALIZACIÓN DE EMAIL...');
    
    const originalEmail = this.testCredentials.email;
    const normalizedEmail = originalEmail.toLowerCase().trim();
    
    console.log(`📧 Email original: "${originalEmail}"`);
    console.log(`📧 Email normalizado: "${normalizedEmail}"`);
    
    // Verificar qué email está en la BD
    const userOriginal = await User.findOne({ email: originalEmail });
    const userNormalized = await User.findOne({ email: normalizedEmail });
    
    console.log(`🔍 Usuario con email original: ${userOriginal ? '✅ Encontrado' : '❌ No encontrado'}`);
    console.log(`🔍 Usuario con email normalizado: ${userNormalized ? '✅ Encontrado' : '❌ No encontrado'}`);
    
    if (userOriginal && !userNormalized) {
      console.log('⚠️  PROBLEMA: Email en BD no está normalizado');
      return false;
    }
    
    return true;
  }

  async fixEmailInDatabase() {
    console.log('🔧 Corrigiendo email en base de datos...');
    
    try {
      // Buscar usuario con email original (puede tener mayúsculas)
      const userOriginal = await User.findOne({ 
        email: { $regex: new RegExp(`^${this.testCredentials.email}$`, 'i') } 
      });
      
      if (userOriginal) {
        const normalizedEmail = this.testCredentials.email.toLowerCase().trim();
        console.log(`📧 Email encontrado: "${userOriginal.email}"`);
        console.log(`📧 Email normalizado: "${normalizedEmail}"`);
        
        if (userOriginal.email !== normalizedEmail) {
          userOriginal.email = normalizedEmail;
          await userOriginal.save();
          console.log(`✅ Email actualizado de "${userOriginal.email}" a "${normalizedEmail}"`);
        } else {
          console.log('✅ Email ya está normalizado');
        }
        
        // Actualizar las credenciales de prueba para usar el email normalizado
        this.testCredentials.email = normalizedEmail;
        
        return true;
      } else {
        console.log('❌ Usuario no encontrado con ninguna variación del email');
        return false;
      }
    } catch (error) {
      console.log('❌ Error corrigiendo email:', error.message);
      return false;
    }
  }

  async provideSolution() {
    console.log('\n6️⃣ APLICANDO SOLUCIONES...');
    
    // Reiniciar PM2
    console.log('🔄 Reiniciando servicios...');
    try {
      const { exec } = require('child_process');
      
      await new Promise((resolve) => {
        exec('pm2 restart all', (error, stdout, stderr) => {
          if (error) {
            console.log('⚠️  PM2 restart falló, intentando kill y start...');
            exec('pm2 kill && pm2 start ecosystem.config.js', () => resolve());
          } else {
            console.log('✅ PM2 reiniciado');
            resolve();
          }
        });
      });
      
      // Esperar un momento para que el servidor se reinicie
      console.log('⏳ Esperando reinicio del servidor...');
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Probar API nuevamente
      console.log('🔄 Probando API después del reinicio...');
      const success = await this.testApiEndpoint();
      
      if (success) {
        console.log('\n🎉 PROBLEMA RESUELTO!');
        console.log('✅ El login ahora funciona correctamente');
      } else {
        console.log('\n⚠️  PROBLEMA PERSISTE');
        console.log('💡 Soluciones adicionales:');
        console.log('   1. Verificar que el servidor esté ejecutándose en el puerto correcto');
        console.log('   2. Revisar logs del servidor: pm2 logs');
        console.log('   3. Verificar variables de entorno JWT_SECRET');
        console.log('   4. Comprobar configuración de CORS');
        console.log('   5. Revisar middleware de validación en auth.js');
        
        // Mostrar información adicional de debug
        console.log('\n🔍 INFORMACIÓN DE DEBUG:');
        console.log(`📧 Email de prueba: ${this.testCredentials.email}`);
        console.log(`🔑 Password de prueba: ${this.testCredentials.password}`);
        console.log(`🌐 URL API: ${this.apiUrl}`);
        
        // Verificar si el usuario existe en la BD
        const user = await User.findOne({ email: this.testCredentials.email });
        if (user) {
          console.log('✅ Usuario existe en BD');
          console.log(`📧 Email en BD: "${user.email}"`);
          console.log(`🔐 Activo: ${user.isActive}`);
          console.log(`🔒 Bloqueado: ${user.isLocked}`);
          console.log(`👤 Rol: ${user.role}`);
        } else {
          console.log('❌ Usuario NO existe en BD');
        }
        console.log('   1. Verificar nginx: sudo nginx -t && sudo systemctl reload nginx');
        console.log('   2. Verificar logs: pm2 logs');
        console.log('   3. Verificar puertos: netstat -tlnp | grep :5000');
      }
      
    } catch (error) {
      console.log('❌ Error reiniciando servicios:', error.message);
    }
  }
}

// Función para limpiar scripts innecesarios
async function cleanupScripts() {
  console.log('\n🧹 LIMPIANDO SCRIPTS INNECESARIOS...');
  
  const scriptsToDelete = [
    'verify-users.js',
    'test-login.js',
    'debug-api-login.js',
    'test-api-endpoint.js',
    'check-server-config.js'
  ];
  
  for (const script of scriptsToDelete) {
    try {
      if (fs.existsSync(script)) {
        fs.unlinkSync(script);
        console.log(`🗑️  Eliminado: ${script}`);
      }
    } catch (error) {
      console.log(`❌ Error eliminando ${script}:`, error.message);
    }
  }
  
  console.log('✅ Limpieza completada');
}

// Ejecutar diagnóstico completo
async function main() {
  const diagnostic = new LoginDiagnostic();
  await diagnostic.run();
  await cleanupScripts();
  
  console.log('\n🏁 DIAGNÓSTICO COMPLETO FINALIZADO');
  console.log('\n📋 CREDENCIALES DE PRUEBA:');
  console.log('   📧 Email: admin@tractoreando.com');
  console.log('   🔑 Password: admin123');
  console.log('\n🌐 URL de login: https://tractoreando.softreria.com');
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = LoginDiagnostic;