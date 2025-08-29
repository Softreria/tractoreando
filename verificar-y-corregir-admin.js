const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const Company = require('./models/Company');
const Branch = require('./models/Branch');

// Configuración de conexión a MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando';

async function verificarYCorregirAdmin() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // 1. Verificar si existe el usuario admin
    console.log('\n🔍 Verificando usuario admin...');
    const adminUser = await User.findOne({ email: 'admin@tractoreando.com' });
    
    if (adminUser) {
      console.log('✅ Usuario admin encontrado:');
      console.log(`   - ID: ${adminUser._id}`);
      console.log(`   - Email: ${adminUser.email}`);
      console.log(`   - Nombre: ${adminUser.firstName} ${adminUser.lastName}`);
      console.log(`   - Rol: ${adminUser.role}`);
      console.log(`   - Activo: ${adminUser.isActive}`);
      console.log(`   - Empresa: ${adminUser.company}`);
      console.log(`   - Sucursal: ${adminUser.branch}`);
      
      // Verificar la contraseña actual
      const passwordMatch = await bcrypt.compare('admin123!', adminUser.password);
      console.log(`   - Contraseña 'admin123!' válida: ${passwordMatch}`);
      
      if (!passwordMatch) {
        console.log('\n🔧 Actualizando contraseña del admin...');
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123!', salt);
        
        await User.updateOne(
          { _id: adminUser._id },
          { 
            $set: { 
              password: hashedPassword,
              loginAttempts: 0,
              $unset: { lockUntil: 1 }
            }
          }
        );
        console.log('✅ Contraseña actualizada correctamente');
      }
    } else {
      console.log('❌ Usuario admin NO encontrado');
      
      // 2. Verificar si existe la empresa admin
      console.log('\n🔍 Verificando empresa admin...');
      let adminCompany = await Company.findOne({ cif: 'A12345678' });
      
      if (!adminCompany) {
        console.log('❌ Empresa admin NO encontrada, creando...');
        adminCompany = new Company({
          name: 'Administración Central',
          cif: 'A12345678',
          email: 'admin@tractoreando.com',
          phone: '+34 900 000 000',
          address: {
            street: 'Calle Principal 1',
            city: 'Madrid',
            state: 'Madrid',
            zipCode: '28001',
            country: 'España'
          },
          isActive: true
        });
        await adminCompany.save();
        console.log('✅ Empresa admin creada');
      } else {
        console.log('✅ Empresa admin encontrada');
      }
      
      // 3. Verificar si existe la sucursal principal
      console.log('\n🔍 Verificando sucursal principal...');
      let mainBranch = await Branch.findOne({ 
        company: adminCompany._id,
        name: 'Oficina Principal'
      });
      
      if (!mainBranch) {
        console.log('❌ Sucursal principal NO encontrada, creando...');
        mainBranch = new Branch({
          name: 'Oficina Principal',
          company: adminCompany._id,
          address: {
            street: 'Calle Principal 1',
            city: 'Madrid',
            state: 'Madrid',
            zipCode: '28001',
            country: 'España'
          },
          phone: '+34 900 000 000',
          email: 'admin@tractoreando.com',
          isActive: true
        });
        await mainBranch.save();
        console.log('✅ Sucursal principal creada');
      } else {
        console.log('✅ Sucursal principal encontrada');
      }
      
      // 4. Crear usuario admin
      console.log('\n🔧 Creando usuario admin...');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123!', salt);
      
      const newAdminUser = new User({
        firstName: 'Super',
        lastName: 'Admin',
        email: 'admin@tractoreando.com',
        password: hashedPassword,
        phone: '+34 900 000 000',
        role: 'super_admin',
        company: adminCompany._id,
        branch: mainBranch._id,
        isActive: true,
        permissions: {
          users: { create: true, read: true, update: true, delete: true },
          companies: { create: true, read: true, update: true, delete: true },
          branches: { create: true, read: true, update: true, delete: true },
          vehicles: { create: true, read: true, update: true, delete: true },
          maintenance: { create: true, read: true, update: true, delete: true },
          reports: { create: true, read: true, update: true, delete: true },
          settings: { create: true, read: true, update: true, delete: true }
        }
      });
      
      await newAdminUser.save();
      console.log('✅ Usuario admin creado exitosamente');
    }
    
    // 5. Verificación final
    console.log('\n🔍 Verificación final...');
    const finalUser = await User.findOne({ email: 'admin@tractoreando.com' })
      .populate('company')
      .populate('branch');
    
    if (finalUser) {
      console.log('✅ Usuario admin verificado:');
      console.log(`   - Email: ${finalUser.email}`);
      console.log(`   - Nombre: ${finalUser.firstName} ${finalUser.lastName}`);
      console.log(`   - Rol: ${finalUser.role}`);
      console.log(`   - Empresa: ${finalUser.company?.name}`);
      console.log(`   - CIF: ${finalUser.company?.cif}`);
      console.log(`   - Sucursal: ${finalUser.branch?.name}`);
      console.log(`   - Activo: ${finalUser.isActive}`);
      
      // Verificar contraseña final
      const finalPasswordCheck = await bcrypt.compare('admin123!', finalUser.password);
      console.log(`   - Contraseña 'admin123!' válida: ${finalPasswordCheck}`);
      
      if (finalPasswordCheck) {
        console.log('\n🎉 ¡ÉXITO! El usuario admin está configurado correctamente.');
        console.log('\n📋 Credenciales de acceso:');
        console.log('   Email: admin@tractoreando.com');
        console.log('   Contraseña: admin123!');
        console.log('\n🔄 Reinicia PM2 con: pm2 restart all');
      } else {
        console.log('\n❌ ERROR: La contraseña no es válida después de la configuración');
      }
    } else {
      console.log('\n❌ ERROR: No se pudo crear o encontrar el usuario admin');
    }
    
  } catch (error) {
    console.error('❌ Error durante la verificación:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
verificarYCorregirAdmin();