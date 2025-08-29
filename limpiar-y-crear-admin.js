const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Company = require('./models/Company');
const User = require('./models/User');
const Branch = require('./models/Branch');

// Configuración de MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando';

async function limpiarYCrearAdmin() {
  try {
    console.log('🔍 Conectando a MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB');

    // 1. Limpiar registros problemáticos
    console.log('\n🧹 Limpiando registros problemáticos...');
    
    // Eliminar empresas con datos inconsistentes
    const empresasProblematicas = await Company.find({
      $or: [
        { cif: null },
        { cif: '' },
        { name: null },
        { name: '' }
      ]
    });
    
    if (empresasProblematicas.length > 0) {
      console.log(`❌ Encontradas ${empresasProblematicas.length} empresas problemáticas, eliminando...`);
      for (const empresa of empresasProblematicas) {
        // Eliminar usuarios asociados
        await User.deleteMany({ company: empresa._id });
        // Eliminar sucursales asociadas
        await Branch.deleteMany({ company: empresa._id });
        // Eliminar la empresa
        await Company.deleteOne({ _id: empresa._id });
      }
      console.log('✅ Empresas problemáticas eliminadas');
    } else {
      console.log('✅ No se encontraron empresas problemáticas');
    }

    // 2. Verificar y eliminar usuario admin existente
    console.log('\n🔍 Verificando usuario admin existente...');
    const adminExistente = await User.findOne({ email: 'admin@tractoreando.com' });
    if (adminExistente) {
      console.log('❌ Usuario admin existente encontrado, eliminando...');
      await User.deleteOne({ _id: adminExistente._id });
      console.log('✅ Usuario admin eliminado');
    }

    // 3. Verificar y crear empresa admin
    console.log('\n🔍 Verificando empresa admin...');
    let empresaAdmin = await Company.findOne({ name: 'Tractoreando Admin' });
    
    if (!empresaAdmin) {
      console.log('❌ Empresa admin NO encontrada, creando...');
      empresaAdmin = new Company({
        name: 'Tractoreando Admin',
        cif: 'ADMIN001',
        address: {
          street: 'Calle Principal 1',
          city: 'Madrid',
          state: 'Madrid',
          zipCode: '28001',
          country: 'España'
        },
        contact: {
          phone: '+34 900 000 000',
          email: 'admin@tractoreando.com',
          website: 'https://tractoreando.com'
        },
        administrator: {
          firstName: 'Admin',
          lastName: 'Tractoreando',
          email: 'admin@tractoreando.com',
          canManageUsers: true
        },
        isActive: true
      });
      
      await empresaAdmin.save();
      console.log('✅ Empresa admin creada exitosamente');
    } else {
      console.log('✅ Empresa admin ya existe');
    }

    // 4. Crear usuario administrador temporal (sin sucursal)
    console.log('\n🔍 Creando usuario administrador...');
    
    const usuarioAdmin = new User({
      firstName: 'Admin',
      lastName: 'Tractoreando',
      email: 'admin@tractoreando.com',
      password: 'admin123!', // Se hasheará automáticamente por el pre-save hook
      role: 'super_admin',
      company: empresaAdmin._id,
      permissions: {
        companies: ['read', 'create', 'update', 'delete', 'manage_subscription'],
        users: ['read', 'create', 'update', 'delete', 'manage_roles'],
        vehicles: ['read', 'create', 'update', 'delete'],
        maintenance: ['read', 'create', 'update', 'delete'],
        reports: ['read', 'create', 'export'],
        settings: ['read', 'update'],
        branches: ['read', 'create', 'update', 'delete']
      },
      isActive: true,
      emailVerified: true
    });
    
    await usuarioAdmin.save();
    console.log('✅ Usuario administrador creado exitosamente');

    // 5. Verificar y crear sucursal principal
    console.log('\n🔍 Verificando sucursal principal...');
    let sucursalPrincipal = await Branch.findOne({ 
      company: empresaAdmin._id,
      code: 'MAIN'
    });
    
    if (!sucursalPrincipal) {
      console.log('❌ Sucursal principal NO encontrada, creando...');
      sucursalPrincipal = new Branch({
        name: 'Oficina Principal',
        type: 'oficina',
        code: 'MAIN',
        company: empresaAdmin._id,
        address: {
          street: 'Calle Principal 1',
          city: 'Madrid',
          state: 'Madrid',
          zipCode: '28001',
          country: 'España'
        },
        contact: {
          phone: '+34 900 000 000',
          email: 'admin@tractoreando.com'
        },
        isActive: true,
        createdBy: usuarioAdmin._id
      });
      
      await sucursalPrincipal.save();
      console.log('✅ Sucursal principal creada exitosamente');
    } else {
      console.log('✅ Sucursal principal ya existe');
    }

    // 6. Actualizar usuario con la sucursal
    usuarioAdmin.branch = sucursalPrincipal._id;
    await usuarioAdmin.save();
    console.log('✅ Usuario actualizado con sucursal');

    // 7. Actualizar referencia del administrador en la empresa
    empresaAdmin.administrator.userId = usuarioAdmin._id;
    await empresaAdmin.save();
    console.log('✅ Referencia de administrador actualizada en la empresa');

    // 8. Verificación final
    console.log('\n🔍 Verificación final...');
    const adminFinal = await User.findOne({ email: 'admin@tractoreando.com' });
    if (adminFinal) {
      console.log('✅ Usuario admin verificado:');
      console.log(`   - Email: ${adminFinal.email}`);
      console.log(`   - Rol: ${adminFinal.role}`);
      console.log(`   - Empresa: ${empresaAdmin.name}`);
      console.log(`   - Activo: ${adminFinal.isActive}`);
      
      // Verificar que la contraseña funciona
      const passwordValida = await adminFinal.comparePassword('admin123!');
      console.log(`   - Contraseña válida: ${passwordValida ? '✅' : '❌'}`);
      
      if (passwordValida) {
        console.log('\n🎉 ¡ÉXITO! Usuario administrador configurado correctamente');
        console.log('\n📋 Credenciales de acceso:');
        console.log('   Email: admin@tractoreando.com');
        console.log('   Contraseña: admin123!');
        console.log('\n🔄 Ahora ejecuta: pm2 restart tractoreando-backend');
      } else {
        console.log('\n❌ Error: La contraseña no es válida');
      }
    } else {
      console.log('❌ Error: No se pudo verificar el usuario admin');
    }

  } catch (error) {
    console.error('❌ Error durante la limpieza y creación:', error);
  } finally {
    console.log('\n🔌 Desconectando de MongoDB...');
    await mongoose.disconnect();
    console.log('🔌 Desconectado de MongoDB');
  }
}

// Ejecutar el script
limpiarYCrearAdmin();