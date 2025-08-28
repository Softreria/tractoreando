const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Esquemas para verificación directa en BD
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  firstName: String,
  lastName: String,
  role: String,
  isActive: Boolean,
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
});

const companySchema = new mongoose.Schema({
  name: String,
  isActive: Boolean
});

const User = mongoose.model('User', userSchema);
const Company = mongoose.model('Company', companySchema);

async function testLogin() {
  try {
    console.log('🔍 DIAGNÓSTICO COMPLETO DE LOGIN');
    console.log('=' .repeat(60));
    
    // 1. Verificar conexión a MongoDB
    console.log('\n1️⃣ Verificando conexión a MongoDB...');
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando';
    console.log('📍 URI:', mongoUri);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Conectado a MongoDB');
    
    // 2. Verificar usuarios en BD
    console.log('\n2️⃣ Verificando usuarios en base de datos...');
    const users = await User.find({}).populate('company');
    console.log(`📊 Total usuarios: ${users.length}`);
    
    if (users.length === 0) {
      console.log('❌ No hay usuarios en la base de datos');
      console.log('💡 Ejecuta: node data-loader.js production --use-batches');
      return;
    }
    
    // 3. Mostrar usuarios disponibles
    console.log('\n👥 Usuarios disponibles:');
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.email} (${user.role}) - Activo: ${user.isActive}`);
    });
    
    // 4. Probar autenticación directa en BD
    console.log('\n3️⃣ Probando autenticación directa en BD...');
    const testCredentials = [
      { email: 'admin@tractoreando.com', password: 'admin123' },
      { email: 'admin@empresa1.com', password: 'admin123' },
      { email: 'operador@empresa1.com', password: 'operador123' }
    ];
    
    for (const cred of testCredentials) {
      console.log(`\n🧪 Probando: ${cred.email}`);
      const user = await User.findOne({ email: cred.email }).populate('company');
      
      if (!user) {
        console.log('❌ Usuario no encontrado');
        continue;
      }
      
      const isValidPassword = await bcrypt.compare(cred.password, user.password);
      const isUserActive = user.isActive;
      const isCompanyActive = user.company ? user.company.isActive : true;
      
      console.log(`  👤 Usuario: ${user.firstName} ${user.lastName}`);
      console.log(`  🔒 Contraseña: ${isValidPassword ? '✅ Válida' : '❌ Inválida'}`);
      console.log(`  👤 Usuario activo: ${isUserActive ? '✅ Sí' : '❌ No'}`);
      console.log(`  🏢 Empresa activa: ${isCompanyActive ? '✅ Sí' : '❌ No'}`);
      
      if (isValidPassword && isUserActive && isCompanyActive) {
        console.log('  🎯 Resultado: ✅ Debería funcionar');
      } else {
        console.log('  🎯 Resultado: ❌ No debería funcionar');
        if (!isValidPassword) console.log('    🔍 Problema: Contraseña incorrecta');
        if (!isUserActive) console.log('    🔍 Problema: Usuario inactivo');
        if (!isCompanyActive) console.log('    🔍 Problema: Empresa inactiva');
      }
    }
    
    await mongoose.disconnect();
    
    // 5. Probar API directamente
    console.log('\n4️⃣ Probando API de login directamente...');
    
    // Determinar la URL de la API
    const apiUrls = [
      'https://tractoreando.softreria.com/api',
      'http://localhost:3001/api',
      'http://localhost:5000/api'
    ];
    
    let workingApiUrl = null;
    
    // Probar conectividad a cada URL
    for (const apiUrl of apiUrls) {
      try {
        console.log(`\n🌐 Probando conectividad a: ${apiUrl}`);
        const response = await axios.get(`${apiUrl}/health`, { timeout: 5000 });
        console.log(`✅ Conectividad OK: ${response.status}`);
        workingApiUrl = apiUrl;
        break;
      } catch (error) {
        console.log(`❌ No disponible: ${error.message}`);
      }
    }
    
    if (!workingApiUrl) {
      console.log('❌ No se pudo conectar a ninguna API');
      return;
    }
    
    console.log(`\n🎯 Usando API: ${workingApiUrl}`);
    
    // Probar login con cada credencial
    for (const cred of testCredentials) {
      console.log(`\n🧪 Probando login API: ${cred.email}`);
      
      try {
        const response = await axios.post(`${workingApiUrl}/auth/login`, {
          email: cred.email,
          password: cred.password
        }, {
          timeout: 10000,
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`✅ Login exitoso!`);
        console.log(`  👤 Usuario: ${response.data.user.firstName} ${response.data.user.lastName}`);
        console.log(`  🔑 Rol: ${response.data.user.role}`);
        console.log(`  🎫 Token recibido: ${response.data.token ? 'Sí' : 'No'}`);
        
      } catch (error) {
        console.log(`❌ Login falló`);
        if (error.response) {
          console.log(`  📊 Status: ${error.response.status}`);
          console.log(`  💬 Mensaje: ${error.response.data?.message || 'Sin mensaje'}`);
          console.log(`  📋 Data completa:`, JSON.stringify(error.response.data, null, 2));
        } else {
          console.log(`  🔍 Error: ${error.message}`);
        }
      }
    }
    
    console.log('\n🏁 Diagnóstico completado');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error.message);
  }
}

// Ejecutar diagnóstico
testLogin().catch(console.error);