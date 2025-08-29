const bcrypt = require('bcryptjs');
const { sequelize } = require('./config/database');
const Company = require('./models/Company');
const User = require('./models/User');
const Branch = require('./models/Branch');
require('dotenv').config();

async function limpiarYCrearAdmin() {
  try {
    console.log('🔍 Conectando a PostgreSQL...');
    await sequelize.authenticate();
    console.log('✅ Conectado a PostgreSQL');
    
    // Sincronizar modelos
    await sequelize.sync({ force: false });
    console.log('✅ Modelos sincronizados');

    // 1. Limpiar registros problemáticos
    console.log('\n🧹 Limpiando registros problemáticos...');
    
    // Eliminar empresas con datos inconsistentes
    const empresasProblematicas = await Company.findAll({
      where: {
        [sequelize.Op.or]: [
          { cif: null },
          { cif: '' },
          { name: null },
          { name: '' }
        ]
      }
    });
    
    if (empresasProblematicas.length > 0) {
      console.log(`❌ Encontradas ${empresasProblematicas.length} empresas problemáticas, eliminando...`);
      for (const empresa of empresasProblematicas) {
        // Eliminar usuarios asociados
        await User.destroy({ where: { companyId: empresa.id } });
        // Eliminar sucursales asociadas
        await Branch.destroy({ where: { companyId: empresa.id } });
        // Eliminar la empresa
        await empresa.destroy();
      }
      console.log('✅ Empresas problemáticas eliminadas');
    } else {
      console.log('✅ No se encontraron empresas problemáticas');
    }

    // 2. Verificar y eliminar usuario admin existente
    console.log('\n🔍 Verificando usuario admin existente...');
    const adminExistente = await User.findOne({ where: { email: 'admin@tractoreando.com' } });
    if (adminExistente) {
      console.log('❌ Usuario admin existente encontrado, eliminando...');
      await adminExistente.destroy();
      console.log('✅ Usuario admin eliminado');
    }

    // 3. Verificar y crear empresa admin
    console.log('\n🔍 Verificando empresa admin...');
    let empresaAdmin = await Company.findOne({ where: { name: 'Tractoreando Admin' } });
    
    if (!empresaAdmin) {
      console.log('❌ Empresa admin NO encontrada, creando...');
      empresaAdmin = await Company.create({
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
      
      console.log('✅ Empresa admin creada exitosamente');
    } else {
      console.log('✅ Empresa admin ya existe');
    }

    // 4. Crear usuario administrador
    console.log('\n👤 Creando usuario administrador...');
    
    // Hash de la contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash('Admin123!', saltRounds);
    
    const usuarioAdmin = await User.create({
      firstName: 'Admin',
      lastName: 'Tractoreando',
      email: 'admin@tractoreando.com',
      password: hashedPassword,
      role: 'super_admin',
      companyId: empresaAdmin.id,
      permissions: {
        users: {
          create: true,
          read: true,
          update: true,
          delete: true
        },
        companies: {
          create: true,
          read: true,
          update: true,
          delete: true
        },
        branches: {
          create: true,
          read: true,
          update: true,
          delete: true
        },
        vehicles: {
          create: true,
          read: true,
          update: true,
          delete: true
        },
        maintenance: {
          create: true,
          read: true,
          update: true,
          delete: true
        },
        reports: {
          create: true,
          read: true,
          update: true,
          delete: true
        },
        settings: {
          create: true,
          read: true,
          update: true,
          delete: true
        }
      },
      isActive: true,
      emailVerified: true
    });
    
    console.log('✅ Usuario administrador creado exitosamente');

    // 5. Crear delegación principal si no existe
    console.log('\n🏪 Verificando delegación principal...');
    let sucursalPrincipal = await Branch.findOne({ 
      where: {
        companyId: empresaAdmin.id,
        code: 'MAIN001'
      }
    });
    
    if (!sucursalPrincipal) {
      console.log('❌ Delegación principal NO encontrada, creando...');
      sucursalPrincipal = await Branch.create({
        name: 'Sede Principal',
        type: 'main',
        code: 'MAIN001',
        companyId: empresaAdmin.id,
        address: {
          street: 'Calle Principal 1',
          city: 'Madrid',
          state: 'Madrid',
          zipCode: '28001',
          country: 'España',
          coordinates: {
            latitude: 40.4168,
            longitude: -3.7038
          }
        },
        contact: {
          phone: '+34 900 000 000',
          email: 'sede@tractoreando.com'
        },
        operatingHours: {
          monday: { open: '08:00', close: '18:00', isOpen: true },
          tuesday: { open: '08:00', close: '18:00', isOpen: true },
          wednesday: { open: '08:00', close: '18:00', isOpen: true },
          thursday: { open: '08:00', close: '18:00', isOpen: true },
          friday: { open: '08:00', close: '18:00', isOpen: true },
          saturday: { open: '09:00', close: '14:00', isOpen: true },
          sunday: { open: '00:00', close: '00:00', isOpen: false }
        },
        isActive: true,
        createdById: usuarioAdmin.id
      });
      
      console.log('✅ Delegación principal creada exitosamente');
    } else {
      console.log('✅ Delegación principal ya existe');
    }

    // 6. Actualizar usuario admin con la delegación
    await usuarioAdmin.update({ branchId: sucursalPrincipal.id });
    console.log('✅ Usuario admin actualizado con delegación');
    
    // 7. Actualizar empresa con el administrador
    await empresaAdmin.update({ adminId: usuarioAdmin.id });
    console.log('✅ Empresa actualizada con administrador');

    // 8. Verificación final
    console.log('\n🔍 Verificación final...');
    const adminFinal = await User.findOne({ 
      where: { email: 'admin@tractoreando.com' },
      include: [
        { model: Company, as: 'company' },
        { model: Branch, as: 'branch' }
      ]
    });
    
    if (adminFinal) {
      console.log('✅ Usuario admin verificado:');
      console.log(`   - ID: ${adminFinal.id}`);
      console.log(`   - Email: ${adminFinal.email}`);
      console.log(`   - Empresa: ${adminFinal.company.name}`);
      console.log(`   - Delegación: ${adminFinal.branch.name}`);
      console.log(`   - Rol: ${adminFinal.role}`);
      
      // Verificar contraseña
      const passwordMatch = await bcrypt.compare('Admin123!', adminFinal.password);
      console.log(`   - Contraseña válida: ${passwordMatch ? '✅' : '❌'}`);
      
      if (passwordMatch) {
        console.log('\n🎉 ¡ÉXITO! Usuario administrador configurado correctamente');
        console.log('\n📋 Credenciales de acceso:');
        console.log('   Email: admin@tractoreando.com');
        console.log('   Contraseña: Admin123!');
        console.log('\n🔄 Ahora ejecuta: pm2 restart tractoreando-backend');
      } else {
        console.log('\n❌ Error: La contraseña no es válida');
      }
    } else {
      console.log('❌ Error: No se pudo verificar el usuario admin');
    }

  } catch (error) {
    console.error('❌ Error durante la limpieza y creación:', error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log('\n🔌 Conexión a PostgreSQL cerrada');
    process.exit(0);
  }
}

// Ejecutar el script
limpiarYCrearAdmin();