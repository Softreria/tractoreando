const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Esquema de usuario simplificado para verificación
const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  firstName: String,
  lastName: String,
  role: String,
  isActive: Boolean,
  company: { type: mongoose.Schema.Types.ObjectId, ref: 'Company' }
});

const User = mongoose.model('User', userSchema);

// Esquema de empresa simplificado
const companySchema = new mongoose.Schema({
  name: String,
  isActive: Boolean
});

const Company = mongoose.model('Company', companySchema);

async function verifyUsers() {
  try {
    // Conectar a MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando';
    console.log('Conectando a MongoDB:', mongoUri);
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Conectado a MongoDB');
    
    // Verificar usuarios
    const users = await User.find({}).populate('company');
    console.log(`\n📊 Total de usuarios encontrados: ${users.length}`);
    
    if (users.length === 0) {
      console.log('❌ No se encontraron usuarios en la base de datos');
      console.log('💡 Ejecuta el script data-loader.js para crear usuarios de prueba');
      return;
    }
    
    console.log('\n👥 Lista de usuarios:');
    console.log('=' .repeat(80));
    
    for (const user of users) {
      console.log(`📧 Email: ${user.email}`);
      console.log(`👤 Nombre: ${user.firstName} ${user.lastName}`);
      console.log(`🔑 Rol: ${user.role}`);
      console.log(`✅ Activo: ${user.isActive ? 'Sí' : 'No'}`);
      console.log(`🏢 Empresa: ${user.company ? user.company.name : 'Sin empresa'} (Activa: ${user.company ? user.company.isActive : 'N/A'})`);
      console.log(`🔒 Password hash: ${user.password ? 'Sí' : 'No'}`);
      
      // Verificar si la contraseña por defecto funciona
      if (user.password) {
        const defaultPasswords = ['admin123', 'operador123'];
        for (const testPassword of defaultPasswords) {
          const isValid = await bcrypt.compare(testPassword, user.password);
          if (isValid) {
            console.log(`🔓 Contraseña válida: ${testPassword}`);
            break;
          }
        }
      }
      
      console.log('-'.repeat(80));
    }
    
    // Verificar empresas
    const companies = await Company.find({});
    console.log(`\n🏢 Total de empresas encontradas: ${companies.length}`);
    
    if (companies.length > 0) {
      console.log('\n🏢 Lista de empresas:');
      console.log('=' .repeat(50));
      
      for (const company of companies) {
        console.log(`📋 Nombre: ${company.name}`);
        console.log(`✅ Activa: ${company.isActive ? 'Sí' : 'No'}`);
        console.log('-'.repeat(50));
      }
    }
    
    // Probar login con credenciales por defecto
    console.log('\n🧪 Probando credenciales por defecto...');
    console.log('=' .repeat(50));
    
    const testCredentials = [
      { email: 'admin@tractoreando.com', password: 'admin123' },
      { email: 'admin@empresa1.com', password: 'admin123' },
      { email: 'operador@empresa1.com', password: 'operador123' }
    ];
    
    for (const cred of testCredentials) {
      const user = await User.findOne({ email: cred.email }).populate('company');
      if (user) {
        const isValidPassword = await bcrypt.compare(cred.password, user.password);
        const isUserActive = user.isActive;
        const isCompanyActive = user.company ? user.company.isActive : true;
        
        console.log(`📧 ${cred.email}:`);
        console.log(`  👤 Usuario encontrado: ✅`);
        console.log(`  🔒 Contraseña válida: ${isValidPassword ? '✅' : '❌'}`);
        console.log(`  👤 Usuario activo: ${isUserActive ? '✅' : '❌'}`);
        console.log(`  🏢 Empresa activa: ${isCompanyActive ? '✅' : '❌'}`);
        console.log(`  🎯 Login exitoso: ${isValidPassword && isUserActive && isCompanyActive ? '✅' : '❌'}`);
      } else {
        console.log(`📧 ${cred.email}: ❌ Usuario no encontrado`);
      }
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

verifyUsers();