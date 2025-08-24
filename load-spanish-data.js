const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Importar modelos
const Company = require('./models/Company');
const Branch = require('./models/Branch');
const User = require('./models/User');
const Vehicle = require('./models/Vehicle');
const Maintenance = require('./models/Maintenance');

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function loadSpanishData() {
  try {
    console.log('🇪🇸 Cargando datos de ejemplo para España...');

    // Limpiar datos existentes
    await Maintenance.deleteMany({});
    await Vehicle.deleteMany({});
    await User.deleteMany({});
    await Branch.deleteMany({});
    await Company.deleteMany({});
    console.log('✅ Datos anteriores eliminados');

    // 1. Crear empresas españolas
    const companies = [
      {
        name: 'Transportes Andalucía S.L.',
        rfc: 'A41234567',
        address: {
          street: 'Calle Sierpes, 45',
          city: 'Sevilla',
          state: 'Andalucía',
          zipCode: '41004',
          country: 'España'
        },
        contact: {
          phone: '+34 954 123 456',
          email: 'info@transportesandalucia.es',
          website: 'www.transportesandalucia.es'
        },
        settings: {
          currency: 'EUR',
          timezone: 'Europe/Madrid'
        },
        isActive: true
      },
      {
        name: 'Logística Catalana S.A.',
        rfc: 'A08567890',
        address: {
          street: 'Passeig de Gràcia, 123',
          city: 'Barcelona',
          state: 'Cataluña',
          zipCode: '08008',
          country: 'España'
        },
        contact: {
          phone: '+34 932 456 789',
          email: 'contacto@logisticacatalana.es',
          website: 'www.logisticacatalana.es'
        },
        settings: {
          currency: 'EUR',
          timezone: 'Europe/Madrid'
        },
        isActive: true
      },
      {
        name: 'Flota Madrid Express',
        rfc: 'A28901234',
        address: {
          street: 'Gran Vía, 78',
          city: 'Madrid',
          state: 'Comunidad de Madrid',
          zipCode: '28013',
          country: 'España'
        },
        contact: {
          phone: '+34 915 678 901',
          email: 'admin@flotamadrid.es',
          website: 'www.flotamadrid.es'
        },
        settings: {
          currency: 'EUR',
          timezone: 'Europe/Madrid'
        },
        isActive: true
      }
    ];

    const createdCompanies = await Company.insertMany(companies);
    console.log(`✅ ${createdCompanies.length} empresas creadas`);

    // 2. Crear delegaciones
    const branches = [
      // Transportes Andalucía
      {
        name: 'Delegación Central Madrid',
        type: 'delegacion',
        code: 'MAD001',
        company: createdCompanies[0]._id,
        address: {
          street: 'Calle de Alcalá, 123',
          city: 'Madrid',
          state: 'Madrid',
          zipCode: '28009',
          country: 'España'
        },
        contact: {
          phone: '+34 915 123 456',
          email: 'madrid@transportesandalucia.es',
          manager: 'Carlos Rodríguez Martín'
        },

        isActive: true,
        createdBy: null // Se asignará después de crear usuarios
      },
      {
        name: 'Delegación Barcelona',
        type: 'delegacion',
        code: 'BCN001',
        company: createdCompanies[0]._id,
        address: {
          street: 'Passeig de Gràcia, 78',
          city: 'Barcelona',
          state: 'Cataluña',
          zipCode: '08008',
          country: 'España'
        },
        contact: {
          phone: '+34 934 234 567',
          email: 'barcelona@transportesandalucia.es',
          manager: 'Josep Martínez Vila'
        },

        isActive: true,
        createdBy: null
      },
      // Logística Catalana
      {
        name: 'Delegación Sevilla',
        type: 'delegacion',
        code: 'SEV001',
        company: createdCompanies[1]._id,
        address: {
          street: 'Calle Sierpes, 45',
          city: 'Sevilla',
          state: 'Andalucía',
          zipCode: '41004',
          country: 'España'
        },
        contact: {
          phone: '+34 954 345 678',
          email: 'sevilla@logisticacatalana.es',
          manager: 'Ana García López'
        },

        isActive: true,
        createdBy: null
      },
      {
        name: 'Taller Valencia',
        type: 'taller',
        code: 'VAL001',
        company: createdCompanies[1]._id,
        address: {
          street: 'Avenida del Puerto, 89',
          city: 'Valencia',
          state: 'Valencia',
          zipCode: '46023',
          country: 'España'
        },
        contact: {
          phone: '+34 963 456 789',
          email: 'valencia@logisticacatalana.es',
          manager: 'Francisco Pérez Ruiz'
        },

        isActive: true,
        createdBy: null
      },
      // Flota Madrid
      {
        name: 'Almacén Bilbao',
        type: 'almacen',
        code: 'BIL001',
        company: createdCompanies[2]._id,
        address: {
          street: 'Gran Vía, 34',
          city: 'Bilbao',
          state: 'País Vasco',
          zipCode: '48011',
          country: 'España'
        },
        contact: {
          phone: '+34 944 567 890',
          email: 'bilbao@flotamadrid.es',
          manager: 'María Fernández Etxebarria'
        },

        isActive: true,
        createdBy: null
      },
      {
        name: 'Oficina Zaragoza',
        type: 'oficina',
        code: 'ZAR001',
        company: createdCompanies[2]._id,
        address: {
          street: 'Paseo de la Independencia, 67',
          city: 'Zaragoza',
          state: 'Aragón',
          zipCode: '50004',
          country: 'España'
        },
        contact: {
          phone: '+34 976 678 901',
          email: 'zaragoza@flotamadrid.es',
          manager: 'Javier Sánchez Moreno'
        },

        isActive: true,
        createdBy: null
      }
    ];

    // Crear delegaciones temporalmente sin createdBy
    const branchesWithoutCreatedBy = branches.map(branch => ({ ...branch, createdBy: createdCompanies[0]._id }));
    const createdBranches = await Branch.insertMany(branchesWithoutCreatedBy);
    console.log(`✅ ${createdBranches.length} delegaciones creadas`);

    // 3. Crear usuarios
    const hashedPassword = await bcrypt.hash('123456', 10);
    const adminPassword = await bcrypt.hash('Admin2024!', 10);
    
    const users = [
      {
        firstName: 'Carlos',
        lastName: 'Rodríguez Martín',
        email: 'admin@tractoreando.es',
        password: adminPassword,
        company: null,
        branches: [],
        role: 'super_admin',
        permissions: {
          companies: { create: true, read: true, update: true, delete: true },
          branches: { create: true, read: true, update: true, delete: true },
          vehicles: { create: true, read: true, update: true, delete: true },
          maintenance: { create: true, read: true, update: true, delete: true },
          users: { create: true, read: true, update: true, delete: true },
          reports: { read: true, export: true },
          settings: { read: true, update: true }
        },
        profile: {
          phone: '+34 915 123 456',
          position: 'Administrador del Sistema',
          department: 'Administración General',
          address: {
            street: 'Calle de Alcalá 123',
            city: 'Madrid',
            state: 'Madrid',
            zipCode: '28009',
            country: 'España'
          }
        },
        settings: {
          language: 'es-ES',
          timezone: 'Europe/Madrid',
          currency: 'EUR',
          notifications: {
            email: true,
            sms: false,
            push: true
          }
        },
        isActive: true
      },
      {
        firstName: 'Ana',
        lastName: 'García López',
        email: 'ana.garcia@transportesandalucia.es',
        password: hashedPassword,
        company: createdCompanies[0]._id,
        branches: [createdBranches[0]._id],
        role: 'company_admin',
        permissions: {
          companies: { create: false, read: true, update: true, delete: false },
          branches: { create: true, read: true, update: true, delete: false },
          vehicles: { create: true, read: true, update: true, delete: true },
          maintenance: { create: true, read: true, update: true, delete: true },
          users: { create: true, read: true, update: true, delete: false },
          reports: { read: true, export: true }
        },
        profile: {
          phone: '+34 954 234 567',
          position: 'Gerente General',
          department: 'Administración',
          address: {
            street: 'Calle Sierpes 45',
            city: 'Sevilla',
            state: 'Andalucía',
            zipCode: '41004',
            country: 'España'
          }
        },
        settings: {
          language: 'es-ES',
          timezone: 'Europe/Madrid',
          currency: 'EUR'
        },
        isActive: true
      },
      {
        firstName: 'María',
        lastName: 'López Fernández',
        email: 'maria.lopez@logisticacatalana.es',
        password: hashedPassword,
        company: createdCompanies[1]._id,
        branches: [createdBranches[2]._id],
        role: 'branch_manager',
        permissions: {
          companies: { create: false, read: true, update: false, delete: false },
          branches: { create: false, read: true, update: true, delete: false },
          vehicles: { create: true, read: true, update: true, delete: false },
          maintenance: { create: true, read: true, update: true, delete: false },
          users: { create: false, read: true, update: false, delete: false },
          reports: { read: true, export: true }
        },
        profile: {
          phone: '+34 932 456 789',
          position: 'Operadora de Flota',
          department: 'Operaciones',
          address: {
            street: 'Passeig de Gràcia 78',
            city: 'Barcelona',
            state: 'Cataluña',
            zipCode: '08008',
            country: 'España'
          }
        },
        settings: {
          language: 'es-ES',
          timezone: 'Europe/Madrid',
          currency: 'EUR'
        },
        isActive: true
      },
      {
        firstName: 'José',
        lastName: 'Martínez Vila',
        email: 'jose.martinez@transportesandalucia.es',
        password: hashedPassword,
        company: createdCompanies[0]._id,
        branches: [createdBranches[1]._id],
        role: 'mechanic',
        permissions: {
          companies: { create: false, read: true, update: false, delete: false },
          branches: { create: false, read: true, update: false, delete: false },
          vehicles: { create: false, read: true, update: true, delete: false },
          maintenance: { create: true, read: true, update: true, delete: false },
          users: { create: false, read: false, update: false, delete: false },
          reports: { read: true, export: false }
        },
        profile: {
          phone: '+34 954 345 678',
          position: 'Jefe de Taller',
          department: 'Mantenimiento',
          specializations: ['motores_diesel', 'sistemas_hidraulicos', 'transmisiones'],
          certifications: ['Certificado John Deere', 'Técnico Case IH', 'Especialista New Holland']
        },
        settings: {
          language: 'es-ES',
          timezone: 'Europe/Madrid',
          currency: 'EUR'
        },
        isActive: true
      },
      {
        firstName: 'Francisco',
        lastName: 'Pérez Ruiz',
        email: 'francisco.perez@flotamadrid.es',
        password: hashedPassword,
        company: createdCompanies[2]._id,
        branches: [createdBranches[4]._id],
        role: 'mechanic',
        permissions: {
          companies: { create: false, read: true, update: false, delete: false },
          branches: { create: false, read: true, update: false, delete: false },
          vehicles: { create: false, read: true, update: true, delete: false },
          maintenance: { create: true, read: true, update: true, delete: false },
          users: { create: false, read: false, update: false, delete: false },
          reports: { read: true, export: false }
        },
        profile: {
          phone: '+34 915 567 890',
          position: 'Técnico Especialista',
          department: 'Mantenimiento',
          specializations: ['diagnostico_electronico', 'sistemas_CVT', 'calibracion_GPS'],
          certifications: ['Técnico Fendt', 'Especialista Claas', 'Diagnóstico Avanzado']
        },
        settings: {
          language: 'es-ES',
          timezone: 'Europe/Madrid',
          currency: 'EUR'
        },
        isActive: true
      }
    ];

    const createdUsers = await User.insertMany(users);
    console.log(`✅ ${createdUsers.length} usuarios creados`);

    // 4. Crear vehículos con matrículas españolas y tractores agrícolas
    const vehicles = [
      // Transportes Andalucía - Tractores agrícolas
      {
        plateNumber: '1234 BCD',
        make: 'John Deere',
        model: '6120M',
        year: 2020,
        vehicleType: 'maquinaria_pesada',
        category: 'agricola',
        color: 'Verde',
        engine: {
          type: 'diesel',
          displacement: 4.5,
          cylinders: 4,
          horsepower: 120
        },
        transmission: 'manual',
        company: createdCompanies[0]._id,
        branch: createdBranches[0]._id,
        status: 'activo',
        condition: 'bueno',
        odometer: {
          current: 1250,
          lastUpdate: new Date('2024-01-15')
        },
        createdBy: createdCompanies[0]._id
      },
      {
        plateNumber: '5678 FGH',
        make: 'Case IH',
        model: 'Puma 185',
        year: 2019,
        vehicleType: 'maquinaria_pesada',
         category: 'agricola',
        color: 'Rojo',
        engine: {
          type: 'diesel',
          displacement: 6.7,
          cylinders: 6,
          horsepower: 185
        },
        transmission: 'manual',
        company: createdCompanies[0]._id,
        branch: createdBranches[0]._id,
        status: 'activo',
        condition: 'bueno',
        odometer: {
          current: 2100,
          lastUpdate: new Date('2024-01-20')
        },
        createdBy: createdCompanies[0]._id
      },
      {
        plateNumber: '9012 JKL',
        make: 'New Holland',
        model: 'T7.270',
        year: 2021,
        vehicleType: 'maquinaria_pesada',
         category: 'agricola',
        color: 'Azul',
        engine: {
          type: 'diesel',
          displacement: 6.7,
          cylinders: 6,
          horsepower: 270
        },
        transmission: 'cvt',
        company: createdCompanies[0]._id,
        branch: createdBranches[1]._id,
        status: 'en_mantenimiento',
        condition: 'regular',
        odometer: {
          current: 850,
          lastUpdate: new Date('2024-01-25')
        },
        createdBy: createdCompanies[0]._id
      },
      // Logística Catalana - Tractores agrícolas
      {
        plateNumber: '3456 MNO',
        make: 'Fendt',
        model: '724 Vario',
        year: 2022,
        vehicleType: 'maquinaria_pesada',
         category: 'agricola',
        color: 'Verde',
        engine: {
          type: 'diesel',
          displacement: 6.1,
          cylinders: 6,
          horsepower: 240
        },
        transmission: 'cvt',
        company: createdCompanies[1]._id,
        branch: createdBranches[2]._id,
        status: 'activo',
        condition: 'excelente',
        odometer: {
          current: 650,
          lastUpdate: new Date('2024-01-10')
        },
        createdBy: createdCompanies[1]._id
      },
      {
        plateNumber: '7890 PQR',
        make: 'Massey Ferguson',
        model: '7726',
        year: 2018,
        vehicleType: 'maquinaria_pesada',
         category: 'agricola',
        color: 'Rojo',
        engine: {
          type: 'diesel',
          displacement: 6.6,
          cylinders: 6,
          horsepower: 260
        },
        transmission: 'automatica',
        company: createdCompanies[1]._id,
        branch: createdBranches[2]._id,
        status: 'activo',
        condition: 'bueno',
        odometer: {
          current: 3200,
          lastUpdate: new Date('2024-01-30')
        },
        createdBy: createdCompanies[1]._id
      },
      // Flota Madrid - Tractores agrícolas
      {
        plateNumber: '1357 STU',
        make: 'Claas',
        model: 'Axion 870',
        year: 2023,
        vehicleType: 'maquinaria_pesada',
         category: 'agricola',
        color: 'Verde',
        engine: {
          type: 'diesel',
          displacement: 7.5,
          cylinders: 6,
          horsepower: 300
        },
        transmission: 'cvt',
        company: createdCompanies[2]._id,
        branch: createdBranches[4]._id,
        status: 'activo',
        condition: 'excelente',
        odometer: {
          current: 420,
          lastUpdate: new Date('2024-01-12')
        },
        createdBy: createdCompanies[2]._id
      },
      {
        plateNumber: '2468 VWX',
        make: 'Deutz-Fahr',
        model: '6175 TTV',
        year: 2020,
        vehicleType: 'maquinaria_pesada',
         category: 'agricola',
        color: 'Verde',
        engine: {
          type: 'diesel',
          displacement: 6.1,
          cylinders: 6,
          horsepower: 175
        },
        transmission: 'cvt',
        company: createdCompanies[2]._id,
        branch: createdBranches[4]._id,
        status: 'activo',
        condition: 'bueno',
        odometer: {
          current: 1850,
          lastUpdate: new Date('2024-01-18')
        },
        createdBy: createdCompanies[2]._id
      }
    ];

    const createdVehicles = await Vehicle.insertMany(vehicles);
    console.log(`✅ ${createdVehicles.length} vehículos creados`);

    // 5. Crear registros de mantenimiento más realistas y completos
    const maintenanceRecords = [
      {
        vehicle: createdVehicles[0]._id,
        company: createdCompanies[0]._id,
        branch: createdBranches[0]._id,
        workOrderNumber: 'WO-2024-001',
        type: 'preventivo',
        title: 'Mantenimiento preventivo trimestral - John Deere 6120M',
        description: 'Mantenimiento preventivo programado - cambio de aceite motor, filtros y engrase completo',
        scheduledDate: new Date('2024-01-15'),
        startDate: new Date('2024-01-15'),
        completedDate: new Date('2024-01-15'),
        odometerReading: 1250,
        status: 'completado',
        priority: 'media',
        costs: {
          labor: 125.00,
          parts: 185.50,
          total: 310.50
        },
        services: [{
          category: 'motor',
          description: 'Cambio de aceite motor diesel 15W-40',
          laborHours: 2.5,
          laborRate: 50,
          laborCost: 125,
          isCompleted: true
        }, {
          category: 'otros',
          description: 'Inspección sistema hidráulico y engrase',
          laborHours: 2.0,
          laborRate: 50,
          laborCost: 100,
          isCompleted: true
        }, {
          category: 'neumaticos',
          description: 'Revisión presión y desgaste neumáticos',
          laborHours: 0.5,
          laborRate: 50,
          laborCost: 25,
          isCompleted: true
        }],
        parts: [{
          name: 'Aceite motor 15W-40 (20L)',
          quantity: 1,
          unitPrice: 85.00,
          totalPrice: 85.00
        }, {
          name: 'Filtro de aceite motor',
          quantity: 1,
          unitPrice: 35.00,
          totalPrice: 35.00
        }, {
          name: 'Filtro de aire',
          quantity: 1,
          unitPrice: 28.50,
          totalPrice: 28.50
        }, {
          name: 'Grasa multiuso (5kg)',
          quantity: 1,
          unitPrice: 22.00,
          totalPrice: 22.00
        }, {
          name: 'Aceite hidráulico (5L)',
          quantity: 1,
          unitPrice: 15.00,
          totalPrice: 15.00
        }],
        createdBy: createdUsers[0]._id,
        notes: 'Mantenimiento realizado sin incidencias. Tractor en perfecto estado. Próximo mantenimiento en 250 horas.'
      },
      {
        vehicle: createdVehicles[1]._id,
        company: createdCompanies[0]._id,
        branch: createdBranches[0]._id,
        workOrderNumber: 'WO-2024-002',
        type: 'correctivo',
        title: 'Reparación sistema de frenos - Case IH Puma 185',
        description: 'Reparación correctiva del sistema de frenos completo por desgaste excesivo',
        scheduledDate: new Date('2024-01-20'),
        startDate: new Date('2024-01-20'),
        completedDate: new Date('2024-01-22'),
        odometerReading: 2100,
        status: 'completado',
        priority: 'alta',
        costs: {
          labor: 375.00,
          parts: 520.00,
          total: 895.00
        },
        services: [{
          category: 'frenos',
          description: 'Sustitución pastillas freno delanteras y traseras',
          laborHours: 4.0,
          laborRate: 50,
          laborCost: 200,
          isCompleted: true
        }, {
          category: 'frenos',
          description: 'Rectificado discos de freno',
          laborHours: 3.5,
          laborRate: 50,
          laborCost: 175,
          isCompleted: true
        }],
        parts: [{
          name: 'Pastillas freno delanteras',
          quantity: 1,
          unitPrice: 180.00,
          totalPrice: 180.00
        }, {
          name: 'Pastillas freno traseras',
          quantity: 1,
          unitPrice: 160.00,
          totalPrice: 160.00
        }, {
          name: 'Discos freno (2 unidades)',
          quantity: 1,
          unitPrice: 140.00,
          totalPrice: 140.00
        }, {
          name: 'Líquido frenos DOT 4',
          quantity: 2,
          unitPrice: 20.00,
          totalPrice: 40.00
        }],
        createdBy: createdUsers[3]._id,
        notes: 'Desgaste excesivo por trabajo intensivo en terreno montañoso. Sistema completamente renovado.'
      },
      {
        vehicle: createdVehicles[2]._id,
        company: createdCompanies[0]._id,
        branch: createdBranches[1]._id,
        workOrderNumber: 'WO-2024-003',
        type: 'correctivo',
        title: 'Reparación transmisión CVT - New Holland T7.270',
        description: 'Diagnóstico y reparación sistema transmisión continua CVT',
        scheduledDate: new Date('2024-01-25'),
        startDate: new Date('2024-01-25'),
        odometerReading: 850,
        status: 'en_proceso',
        priority: 'alta',
        costs: {
          labor: 475.00,
          parts: 580.00,
          total: 1055.00
        },
        services: [{
          category: 'transmision',
          description: 'Diagnóstico completo sistema CVT',
          laborHours: 2.5,
          laborRate: 50,
          laborCost: 125,
          isCompleted: true
        }, {
          category: 'transmision',
          description: 'Cambio aceite y filtros transmisión CVT',
          laborHours: 4.0,
          laborRate: 50,
          laborCost: 200,
          isCompleted: false
        }, {
          category: 'electrico',
          description: 'Calibración sistema CVT',
          laborHours: 3.0,
          laborRate: 50,
          laborCost: 150,
          isCompleted: false
        }],
        parts: [{
          name: 'Aceite CVT (25L)',
          quantity: 1,
          unitPrice: 320.00,
          totalPrice: 320.00,
          isInstalled: false
        }, {
          name: 'Filtro transmisión CVT',
          quantity: 1,
          unitPrice: 180.00,
          totalPrice: 180.00,
          isInstalled: false
        }, {
          name: 'Junta cárter transmisión',
          quantity: 1,
          unitPrice: 45.00,
          totalPrice: 45.00,
          isInstalled: false
        }, {
          name: 'Sensor velocidad transmisión',
          quantity: 1,
          unitPrice: 35.00,
          totalPrice: 35.00,
          isInstalled: false
        }],
        createdBy: createdUsers[3]._id,
        notes: 'Problema en sensor de velocidad transmisión. Requiere calibración especializada. Pendiente recepción repuestos.'
      },
      {
        vehicle: createdVehicles[3]._id,
        company: createdCompanies[1]._id,
        branch: createdBranches[2]._id,
        workOrderNumber: 'WO-2024-004',
        type: 'preventivo',
        title: 'Mantenimiento preventivo - Fendt 724 Vario',
        description: 'Primer mantenimiento preventivo según manual del fabricante',
        scheduledDate: new Date('2024-01-10'),
        startDate: new Date('2024-01-10'),
        completedDate: new Date('2024-01-10'),
        odometerReading: 650,
        status: 'completado',
        priority: 'media',
        costs: {
          labor: 250.00,
          parts: 385.00,
          total: 635.00
        },
        services: [{
          category: 'motor',
          description: 'Servicio completo motor - aceite y filtros',
          laborHours: 3.0,
          laborRate: 50,
          laborCost: 150,
          isCompleted: true
        }, {
          category: 'motor',
          description: 'Limpieza radiador y cambio refrigerante',
          laborHours: 2.0,
          laborRate: 50,
          laborCost: 100,
          isCompleted: true
        }],
        parts: [{
          name: 'Aceite motor sintético (18L)',
          quantity: 1,
          unitPrice: 165.00,
          totalPrice: 165.00
        }, {
          name: 'Filtro aire',
          quantity: 1,
          unitPrice: 45.00,
          totalPrice: 45.00
        }, {
          name: 'Filtro combustible',
          quantity: 1,
          unitPrice: 38.00,
          totalPrice: 38.00
        }, {
          name: 'Filtro aceite',
          quantity: 1,
          unitPrice: 42.00,
          totalPrice: 42.00
        }, {
          name: 'Refrigerante (10L)',
          quantity: 1,
          unitPrice: 75.00,
          totalPrice: 75.00
        }, {
          name: 'Aditivo anticorrosión',
          quantity: 1,
          unitPrice: 20.00,
          totalPrice: 20.00
        }],
        createdBy: createdUsers[1]._id,
        notes: 'Tractor nuevo, primer mantenimiento preventivo realizado correctamente. Excelente estado general.'
      },
      {
        vehicle: createdVehicles[4]._id,
        company: createdCompanies[1]._id,
        branch: createdBranches[2]._id,
        workOrderNumber: 'WO-2024-005',
        type: 'preventivo',
        title: 'Mantenimiento semestral - Massey Ferguson 7726',
        description: 'Mantenimiento preventivo semestral programado según horas de trabajo',
        scheduledDate: new Date('2024-01-30'),
        startDate: new Date('2024-01-30'),
        odometerReading: 3200,
        status: 'programado',
        priority: 'media',
        costs: {
          labor: 300.00,
          parts: 485.00,
          external: 85.00,
          total: 870.00
        },
        services: [{
          category: 'motor',
          description: 'Cambio aceite motor y transmisión powershift',
          laborHours: 4.0,
          laborRate: 50,
          laborCost: 200,
          isCompleted: false
        }, {
          category: 'electrico',
          description: 'Diagnóstico sistema eléctrico y electrónico',
          laborHours: 2.5,
          laborRate: 50,
          laborCost: 125,
          isCompleted: false
        }, {
          category: 'diagnostico',
          description: 'Preparación y acompañamiento ITV',
          laborHours: 1.5,
          laborRate: 50,
          laborCost: 75,
          isCompleted: false
        }],
        parts: [{
          name: 'Aceite motor (20L)',
          quantity: 1,
          unitPrice: 95.00,
          totalPrice: 95.00,
          isInstalled: false
        }, {
          name: 'Aceite transmisión powershift (15L)',
          quantity: 1,
          unitPrice: 185.00,
          totalPrice: 185.00,
          isInstalled: false
        }, {
          name: 'Kit filtros completo',
          quantity: 1,
          unitPrice: 125.00,
          totalPrice: 125.00,
          isInstalled: false
        }, {
          name: 'Grasa especial (10kg)',
          quantity: 1,
          unitPrice: 80.00,
          totalPrice: 80.00,
          isInstalled: false
        }],
        createdBy: createdUsers[1]._id,
        notes: 'Mantenimiento programado según horas de trabajo. Incluye preparación para inspección técnica ITV.'
      },
      {
        vehicle: createdVehicles[5]._id,
        company: createdCompanies[2]._id,
        branch: createdBranches[4]._id,
        workOrderNumber: 'WO-2024-006',
        type: 'preventivo',
        title: 'Primer servicio - Claas Axion 870',
        description: 'Primer servicio bajo garantía según especificaciones del fabricante',
        scheduledDate: new Date('2024-02-05'),
        startDate: new Date('2024-02-05'),
        completedDate: new Date('2024-02-05'),
        odometerReading: 420,
        status: 'completado',
        priority: 'alta',
        costs: {
          labor: 375.00,
          parts: 485.00,
          total: 860.00
        },
        services: [{
          category: 'motor',
          description: 'Servicio inicial 50 horas según manual',
          laborHours: 4.5,
          laborRate: 50,
          laborCost: 225,
          isCompleted: true
        }, {
          category: 'electrico',
          description: 'Configuración sistema GPS y navegación',
          laborHours: 3.0,
          laborRate: 50,
          laborCost: 150,
          isCompleted: true
        }],
        parts: [{
          name: 'Aceite motor sintético (22L)',
          quantity: 1,
          unitPrice: 195.00,
          totalPrice: 195.00
        }, {
          name: 'Kit filtros completo premium',
          quantity: 1,
          unitPrice: 165.00,
          totalPrice: 165.00
        }, {
          name: 'Grasa especial Claas (8kg)',
          quantity: 1,
          unitPrice: 125.00,
          totalPrice: 125.00
        }],
        createdBy: createdUsers[2]._id,
        notes: 'Tractor nuevo, primer servicio bajo garantía. Sistema GPS configurado correctamente. Estado excelente.'
      }
    ];

    const createdMaintenance = await Maintenance.insertMany(maintenanceRecords);
    console.log(`✅ ${createdMaintenance.length} registros de mantenimiento creados`);

    console.log('\n🎉 ¡Datos de ejemplo cargados exitosamente!');
    console.log('\n📊 Resumen de datos creados para España:');
     console.log(`   • ${createdCompanies.length} empresas agrícolas españolas`);
     console.log(`   • ${createdBranches.length} delegaciones en ciudades españolas (Madrid, Barcelona, Sevilla, Valencia, Bilbao, Zaragoza)`);
     console.log(`   • ${createdUsers.length} usuarios con roles específicos (incluye administrador principal)`);
     console.log(`   • ${createdVehicles.length} tractores agrícolas con matrículas españolas`);
     console.log(`   • ${createdMaintenance.length} registros de mantenimiento detallados`);
     console.log('\n👤 Usuario Administrador creado:');
     console.log(`   📧 Email: admin@tractoreando.es`);
     console.log(`   🔑 Contraseña: Admin2024!`);
     console.log(`   🏢 Rol: Super Administrador`);
     console.log(`   💰 Moneda: EUR (€)`);
     console.log(`   🌍 Zona horaria: Europe/Madrid`);
     console.log(`   🗣️ Idioma: Español de España (es-ES)`);
    
    console.log('\n👥 Usuarios de prueba creados:');
    createdUsers.forEach(user => {
      console.log(`   • ${user.email} (${user.role}) - Contraseña: 123456`);
    });

  } catch (error) {
    console.error('❌ Error cargando datos:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Ejecutar el script
loadSpanishData();