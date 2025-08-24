const mongoose = require('mongoose');
const Company = require('./models/Company');
const Branch = require('./models/Branch');
const Vehicle = require('./models/Vehicle');
const Maintenance = require('./models/Maintenance');
const User = require('./models/User');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/tractoreando')
  .then(() => console.log('Conectado a MongoDB'))
  .catch(err => console.error('Error conectando a MongoDB:', err));

async function createSampleData() {
  try {
    console.log('Creando datos de ejemplo...');

    // Buscar un usuario admin existente para asignar como creador
  const adminUser = await User.findOne({ role: 'super_admin' });
  if (!adminUser) {
    console.error('No se encontró un usuario admin. Crea un usuario admin primero.');
    process.exit(1);
  }

    // 1. Crear empresas de ejemplo
    const companies = [
      {
        name: 'Transportes García S.L.',
        rfc: 'TGS123456789',
        address: {
          street: 'Calle Mayor 123',
          city: 'Madrid',
          state: 'Madrid',
          zipCode: '28001',
          country: 'España'
        },
        contact: {
          phone: '+34 91 123 4567',
          email: 'info@transportesgarcia.es',
          website: 'www.transportesgarcia.es'
        },
        settings: {
          currency: 'EUR',
          timezone: 'Europe/Madrid',
          maintenanceReminders: true,
          emailNotifications: true
        },
        subscription: {
          plan: 'premium',
          maxVehicles: 50,
          maxUsers: 20,
          maxBranches: 5
        },
        createdBy: adminUser._id
      },
      {
        name: 'Logística del Norte S.A.',
        rfc: 'LDN987654321',
        address: {
          street: 'Avenida Industrial 456',
          city: 'Bilbao',
          state: 'País Vasco',
          zipCode: '48001',
          country: 'España'
        },
        contact: {
          phone: '+34 94 987 6543',
          email: 'contacto@logisticanorte.es',
          website: 'www.logisticanorte.es'
        },
        settings: {
          currency: 'EUR',
          timezone: 'Europe/Madrid',
          maintenanceReminders: true,
          emailNotifications: true
        },
        subscription: {
          plan: 'enterprise',
          maxVehicles: 100,
          maxUsers: 50,
          maxBranches: 10
        },
        createdBy: adminUser._id
      },
      {
        name: 'Construcciones Mediterráneo',
        rfc: 'CME456789123',
        address: {
          street: 'Polígono Industrial Las Flores 789',
          city: 'Valencia',
          state: 'Valencia',
          zipCode: '46001',
          country: 'España'
        },
        contact: {
          phone: '+34 96 456 7890',
          email: 'admin@construccionesmed.es',
          website: 'www.construccionesmediterraneo.es'
        },
        settings: {
          currency: 'EUR',
          timezone: 'Europe/Madrid',
          maintenanceReminders: true,
          emailNotifications: false
        },
        subscription: {
          plan: 'basic',
          maxVehicles: 25,
          maxUsers: 10,
          maxBranches: 3
        },
        createdBy: adminUser._id
      }
    ];

    console.log('Creando empresas...');
    const createdCompanies = [];
    for (const companyData of companies) {
      const existingCompany = await Company.findOne({ rfc: companyData.rfc });
      if (!existingCompany) {
        const company = new Company(companyData);
        await company.save();
        createdCompanies.push(company);
        console.log(`✓ Empresa creada: ${company.name}`);
      } else {
        createdCompanies.push(existingCompany);
        console.log(`- Empresa ya existe: ${existingCompany.name}`);
      }
    }

    // 2. Crear delegaciones para cada empresa
    console.log('\nCreando delegaciones...');
    const branchesData = [
      // Delegaciones para Transportes García
      {
        companyIndex: 0,
        branches: [
          {
            name: 'Sede Central Madrid',
            type: 'delegacion',
            code: 'MAD001',
            address: {
              street: 'Calle Mayor 123',
              city: 'Madrid',
              state: 'Madrid',
              zipCode: '28001',
              country: 'España'
            },
            contact: {
              phone: '+34 91 123 4567',
              email: 'madrid@transportesgarcia.es',
              manager: 'Carlos García'
            }
          },
          {
            name: 'Delegación Barcelona',
            type: 'delegacion',
            code: 'BCN001',
            address: {
              street: 'Avenida Diagonal 567',
              city: 'Barcelona',
              state: 'Cataluña',
              zipCode: '08001',
              country: 'España'
            },
            contact: {
              phone: '+34 93 567 8901',
              email: 'barcelona@transportesgarcia.es',
              manager: 'Ana Martínez'
            }
          },
          {
            name: 'Taller Central',
            type: 'taller',
            code: 'TAL001',
            address: {
              street: 'Polígono Industrial Sur 12',
              city: 'Madrid',
              state: 'Madrid',
              zipCode: '28045',
              country: 'España'
            },
            contact: {
              phone: '+34 91 456 7890',
              email: 'taller@transportesgarcia.es',
              manager: 'Miguel Rodríguez'
            }
          }
        ]
      },
      // Delegaciones para Logística del Norte
      {
        companyIndex: 1,
        branches: [
          {
            name: 'Sede Bilbao',
            type: 'delegacion',
            code: 'BIL001',
            address: {
              street: 'Avenida Industrial 456',
              city: 'Bilbao',
              state: 'País Vasco',
              zipCode: '48001',
              country: 'España'
            },
            contact: {
              phone: '+34 94 987 6543',
              email: 'bilbao@logisticanorte.es',
              manager: 'Iñaki Etxebarria'
            }
          },
          {
            name: 'Delegación Santander',
            type: 'delegacion',
            code: 'STD001',
            address: {
              street: 'Puerto Comercial 789',
              city: 'Santander',
              state: 'Cantabria',
              zipCode: '39001',
              country: 'España'
            },
            contact: {
              phone: '+34 942 123 456',
              email: 'santander@logisticanorte.es',
              manager: 'Carmen López'
            }
          },
          {
            name: 'Almacén Central',
            type: 'almacen',
            code: 'ALM001',
            address: {
              street: 'Zona Franca 234',
              city: 'Bilbao',
              state: 'País Vasco',
              zipCode: '48015',
              country: 'España'
            },
            contact: {
              phone: '+34 94 555 6666',
              email: 'almacen@logisticanorte.es',
              manager: 'Jon Aguirre'
            }
          }
        ]
      },
      // Delegaciones para Construcciones Mediterráneo
      {
        companyIndex: 2,
        branches: [
          {
            name: 'Oficina Valencia',
            type: 'oficina',
            code: 'VAL001',
            address: {
              street: 'Polígono Industrial Las Flores 789',
              city: 'Valencia',
              state: 'Valencia',
              zipCode: '46001',
              country: 'España'
            },
            contact: {
              phone: '+34 96 456 7890',
              email: 'valencia@construccionesmed.es',
              manager: 'Francisco Pérez'
            }
          },
          {
            name: 'Obra Alicante',
            type: 'finca',
            code: 'ALC001',
            address: {
              street: 'Urbanización Costa Blanca s/n',
              city: 'Alicante',
              state: 'Alicante',
              zipCode: '03001',
              country: 'España'
            },
            contact: {
              phone: '+34 96 789 0123',
              email: 'alicante@construccionesmed.es',
              manager: 'María José Ruiz'
            }
          }
        ]
      }
    ];

    const createdBranches = [];
    for (const companyBranches of branchesData) {
      const company = createdCompanies[companyBranches.companyIndex];
      for (const branchData of companyBranches.branches) {
        const existingBranch = await Branch.findOne({ 
          company: company._id, 
          code: branchData.code 
        });
        
        if (!existingBranch) {
          const branch = new Branch({
            ...branchData,
            company: company._id,
            createdBy: adminUser._id
          });
          await branch.save();
          createdBranches.push(branch);
          console.log(`✓ Delegación creada: ${branch.name} (${company.name})`);
        } else {
          createdBranches.push(existingBranch);
          console.log(`- Delegación ya existe: ${existingBranch.name}`);
        }
      }
    }

    // 3. Obtener vehículos existentes para crear mantenimientos
    console.log('\nBuscando vehículos existentes...');
    const vehicles = await Vehicle.find({ isActive: true }).limit(10);
    
    if (vehicles.length === 0) {
      console.log('No se encontraron vehículos. Crea algunos vehículos primero.');
      return;
    }

    console.log(`Encontrados ${vehicles.length} vehículos para crear mantenimientos.`);

    // 4. Crear mantenimientos de ejemplo
    console.log('\nCreando mantenimientos...');
    const maintenanceTypes = ['preventivo', 'correctivo', 'inspeccion', 'emergencia'];
    const priorities = ['baja', 'media', 'alta', 'critica'];
    const statuses = ['programado', 'en_proceso', 'completado', 'pausado'];
    
    const maintenanceTemplates = [
      {
        title: 'Cambio de aceite y filtros',
        description: 'Mantenimiento preventivo: cambio de aceite del motor, filtro de aceite, filtro de aire y revisión general.',
        type: 'preventivo',
        priority: 'media',
        estimatedDuration: 2,
        services: [
          {
            category: 'motor',
            description: 'Cambio de aceite del motor',
            laborHours: 0.5,
            laborRate: 45,
            laborCost: 22.5,
            isCompleted: true
          },
          {
            category: 'motor',
            description: 'Cambio de filtro de aceite',
            laborHours: 0.3,
            laborRate: 45,
            laborCost: 13.5,
            isCompleted: true
          },
          {
            category: 'motor',
            description: 'Cambio de filtro de aire',
            laborHours: 0.2,
            laborRate: 45,
            laborCost: 9,
            isCompleted: true
          }
        ],
        parts: [
          {
            name: 'Aceite motor 5W-30',
            quantity: 5,
            unitPrice: 8.50,
            totalPrice: 42.50,
            isInstalled: true
          },
          {
            name: 'Filtro de aceite',
            quantity: 1,
            unitPrice: 12.30,
            totalPrice: 12.30,
            isInstalled: true
          },
          {
            name: 'Filtro de aire',
            quantity: 1,
            unitPrice: 15.80,
            totalPrice: 15.80,
            isInstalled: true
          }
        ]
      },
      {
        title: 'Revisión sistema de frenos',
        description: 'Inspección completa del sistema de frenos: pastillas, discos, líquido de frenos y funcionamiento general.',
        type: 'preventivo',
        priority: 'alta',
        estimatedDuration: 3,
        services: [
          {
            category: 'frenos',
            description: 'Inspección pastillas de freno',
            laborHours: 1,
            laborRate: 50,
            laborCost: 50,
            isCompleted: true
          },
          {
            category: 'frenos',
            description: 'Revisión discos de freno',
            laborHours: 0.5,
            laborRate: 50,
            laborCost: 25,
            isCompleted: true
          },
          {
            category: 'frenos',
            description: 'Cambio líquido de frenos',
            laborHours: 1,
            laborRate: 50,
            laborCost: 50,
            isCompleted: false
          }
        ],
        parts: [
          {
            name: 'Líquido de frenos DOT 4',
            quantity: 1,
            unitPrice: 8.90,
            totalPrice: 8.90,
            isInstalled: false
          }
        ]
      },
      {
        title: 'Reparación sistema eléctrico',
        description: 'Diagnóstico y reparación de fallo en el sistema eléctrico. Problema con luces intermitentes.',
        type: 'correctivo',
        priority: 'alta',
        estimatedDuration: 4,
        services: [
          {
            category: 'electrico',
            description: 'Diagnóstico sistema eléctrico',
            laborHours: 1.5,
            laborRate: 55,
            laborCost: 82.5,
            isCompleted: true
          },
          {
            category: 'electrico',
            description: 'Reparación cableado intermitentes',
            laborHours: 2,
            laborRate: 55,
            laborCost: 110,
            isCompleted: false
          }
        ],
        parts: [
          {
            name: 'Relé intermitentes',
            quantity: 1,
            unitPrice: 25.60,
            totalPrice: 25.60,
            isInstalled: false
          },
          {
            name: 'Cable eléctrico 2.5mm',
            quantity: 3,
            unitPrice: 4.20,
            totalPrice: 12.60,
            isInstalled: false
          }
        ]
      },
      {
        title: 'Inspección técnica anual',
        description: 'Inspección técnica completa del vehículo según normativa. Revisión de todos los sistemas.',
        type: 'inspeccion',
        priority: 'media',
        estimatedDuration: 2,
        services: [
          {
            category: 'diagnostico',
            description: 'Inspección técnica completa',
            laborHours: 2,
            laborRate: 40,
            laborCost: 80,
            isCompleted: true
          }
        ],
        parts: []
      },
      {
        title: 'Reparación urgente transmisión',
        description: 'Fallo crítico en la transmisión. Ruidos extraños y dificultad para cambiar marchas.',
        type: 'emergencia',
        priority: 'critica',
        estimatedDuration: 8,
        services: [
          {
            category: 'transmision',
            description: 'Diagnóstico transmisión',
            laborHours: 2,
            laborRate: 60,
            laborCost: 120,
            isCompleted: true
          },
          {
            category: 'transmision',
            description: 'Desmontaje y reparación caja cambios',
            laborHours: 6,
            laborRate: 60,
            laborCost: 360,
            isCompleted: false
          }
        ],
        parts: [
          {
            name: 'Kit embrague completo',
            quantity: 1,
            unitPrice: 280.00,
            totalPrice: 280.00,
            isInstalled: false
          },
          {
            name: 'Aceite transmisión',
            quantity: 3,
            unitPrice: 12.50,
            totalPrice: 37.50,
            isInstalled: false
          }
        ]
      }
    ];

    let workOrderCounter = 1000;
    const createdMaintenances = [];

    for (let i = 0; i < Math.min(vehicles.length, 15); i++) {
      const vehicle = vehicles[i % vehicles.length];
      const template = maintenanceTemplates[i % maintenanceTemplates.length];
      
      // Generar fechas aleatorias
      const now = new Date();
      const scheduledDate = new Date(now.getTime() - Math.random() * 30 * 24 * 60 * 60 * 1000); // Últimos 30 días
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      
      let startDate, completedDate;
      if (status === 'en_proceso' || status === 'completado' || status === 'pausado') {
        startDate = new Date(scheduledDate.getTime() + Math.random() * 2 * 24 * 60 * 60 * 1000);
      }
      if (status === 'completado') {
        completedDate = new Date(startDate.getTime() + Math.random() * 5 * 24 * 60 * 60 * 1000);
      }

      // Calcular costos
      const laborCost = template.services.reduce((sum, service) => sum + service.laborCost, 0);
      const partsCost = template.parts.reduce((sum, part) => sum + part.totalPrice, 0);
      const tax = (laborCost + partsCost) * 0.21; // IVA 21%
      const total = laborCost + partsCost + tax;

      const maintenanceData = {
        vehicle: vehicle._id,
        company: vehicle.company,
        branch: vehicle.branch,
        workOrderNumber: `WO-${workOrderCounter++}`,
        title: template.title,
        description: template.description,
        type: template.type,
        priority: template.priority,
        status: status,
        scheduledDate: scheduledDate,
        startDate: startDate,
        completedDate: completedDate,
        estimatedDuration: template.estimatedDuration,
        actualDuration: status === 'completado' ? template.estimatedDuration + Math.random() * 2 : undefined,
        odometerReading: (vehicle.currentMileage || 50000) + Math.floor(Math.random() * 1000),
        services: template.services,
        parts: template.parts,
        costs: {
          labor: laborCost,
          parts: partsCost,
          materials: 0,
          external: 0,
          tax: tax,
          discount: 0,
          total: total
        },
        createdBy: adminUser._id
      };

      const existingMaintenance = await Maintenance.findOne({ 
        workOrderNumber: maintenanceData.workOrderNumber 
      });
      
      if (!existingMaintenance) {
        const maintenance = new Maintenance(maintenanceData);
        await maintenance.save();
        createdMaintenances.push(maintenance);
        console.log(`✓ Mantenimiento creado: ${maintenance.workOrderNumber} - ${maintenance.title} (${vehicle.plateNumber})`);
      } else {
        console.log(`- Mantenimiento ya existe: ${existingMaintenance.workOrderNumber}`);
      }
    }

    console.log('\n=== RESUMEN ===');
    console.log(`✓ Empresas creadas: ${createdCompanies.length}`);
    console.log(`✓ Delegaciones creadas: ${createdBranches.length}`);
    console.log(`✓ Mantenimientos creados: ${createdMaintenances.length}`);
    console.log('\n¡Datos de ejemplo creados exitosamente!');

  } catch (error) {
    console.error('Error creando datos de ejemplo:', error);
  } finally {
    mongoose.connection.close();
  }
}

// Ejecutar el script
createSampleData();