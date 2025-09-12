const { Sequelize } = require('sequelize');
const Vehicle = require('./models/Vehicle');
const FuelRecord = require('./models/FuelRecord');
const Maintenance = require('./models/Maintenance');
const User = require('./models/User');
const Branch = require('./models/Branch');
const Company = require('./models/Company');

// Configuración de la base de datos
const sequelize = new Sequelize({
  dialect: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'tractoreando_dev',
  username: 'postgres',
  password: 'postgres',
  logging: console.log
});

async function addSampleData() {
  try {
    console.log('Conectando a la base de datos...');
    await sequelize.authenticate();
    console.log('Conexión exitosa');

    // Obtener datos existentes
    const vehicles = await Vehicle.findAll();
    const users = await User.findAll();
    const branches = await Branch.findAll();
    
    console.log(`Encontrados ${vehicles.length} vehículos, ${users.length} usuarios, ${branches.length} sucursales`);

    if (vehicles.length === 0) {
      console.log('No hay vehículos para añadir datos');
      return;
    }

    // Crear registros de combustible adicionales
    const fuelRecords = [];
    const maintenanceRecords = [];
    
    // Fechas para los últimos 6 meses
    const dates = [];
    for (let i = 0; i < 180; i += 7) { // Cada semana
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(date);
    }

    console.log('Creando registros de combustible...');
    
    for (const vehicle of vehicles) {
      let currentOdometer = vehicle.currentMileage || 50000;
      
      for (let i = 0; i < dates.length; i++) {
        const date = dates[i];
        const weeklyKm = Math.floor(Math.random() * 500) + 200; // 200-700 km por semana
        currentOdometer += weeklyKm;
        
        const liters = Math.floor(Math.random() * 40) + 30; // 30-70 litros
        const pricePerLiter = (Math.random() * 0.3 + 1.2).toFixed(3); // 1.20-1.50 €/L
        const totalCost = (liters * pricePerLiter).toFixed(2);
        
        fuelRecords.push({
          vehicleId: vehicle.id,
          fuelDate: date,
          liters: liters,
          odometer: currentOdometer,
          pricePerLiter: parseFloat(pricePerLiter),
          totalCost: parseFloat(totalCost),
          fuelType: vehicle.fuelType || 'diesel',
          station: `Estación ${Math.floor(Math.random() * 5) + 1}`,
          location: `Ubicación ${Math.floor(Math.random() * 10) + 1}`,
          isFull: Math.random() > 0.3,
          notes: i % 5 === 0 ? 'Repostaje completo' : null,
          createdById: users[Math.floor(Math.random() * users.length)].id,
          companyId: vehicle.companyId,
          branchId: vehicle.branchId
        });
        
        // Actualizar kilometraje del vehículo
        await vehicle.update({ currentMileage: currentOdometer });
      }
    }

    console.log('Creando registros de mantenimiento...');
    
    // Crear registros de mantenimiento
    const maintenanceTypes = [
      { type: 'preventivo', title: 'Cambio de aceite' },
      { type: 'correctivo', title: 'Revisión de frenos' },
      { type: 'preventivo', title: 'Cambio de filtros' },
      { type: 'inspeccion', title: 'Revisión general' },
      { type: 'correctivo', title: 'Cambio de neumáticos' },
      { type: 'correctivo', title: 'Reparación motor' },
      { type: 'preventivo', title: 'Mantenimiento preventivo' }
    ];
    
    for (const vehicle of vehicles) {
      for (let i = 0; i < 8; i++) { // 8 mantenimientos por vehículo
        const date = new Date();
        date.setDate(date.getDate() - (i * 30)); // Cada mes
        
        const maintenanceType = maintenanceTypes[Math.floor(Math.random() * maintenanceTypes.length)];
        const workOrderNumber = `WO-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const odometerReading = (vehicle.currentMileage || 50000) + (i * 1000);
        
        maintenanceRecords.push({
          vehicleId: vehicle.id,
          workOrderNumber: workOrderNumber,
          type: maintenanceType.type,
          title: maintenanceType.title,
          description: `${maintenanceType.title} realizado en taller`,
          scheduledDate: date,
          completedDate: new Date(date.getTime() + (Math.random() * 7 * 24 * 60 * 60 * 1000)), // Completado en 0-7 días
          odometerReading: odometerReading,
          status: 'completado',
          priority: ['baja', 'media', 'alta'][Math.floor(Math.random() * 3)],
          createdById: users[Math.floor(Math.random() * users.length)].id,
          assignedToId: users[Math.floor(Math.random() * users.length)].id,
          companyId: vehicle.companyId,
          branchId: vehicle.branchId,
          notes: `Mantenimiento ${maintenanceType.title.toLowerCase()} completado satisfactoriamente`
        });
      }
    }

    // Insertar registros en lotes
    console.log(`Insertando ${fuelRecords.length} registros de combustible...`);
    await FuelRecord.bulkCreate(fuelRecords, { validate: true });
    
    console.log(`Insertando ${maintenanceRecords.length} registros de mantenimiento...`);
    await Maintenance.bulkCreate(maintenanceRecords, { validate: true });

    // Verificar datos insertados
    const totalFuelRecords = await FuelRecord.count();
    const totalMaintenanceRecords = await Maintenance.count();
    
    console.log('\n=== RESUMEN DE DATOS AÑADIDOS ===');
    console.log(`Total registros de combustible: ${totalFuelRecords}`);
    console.log(`Total registros de mantenimiento: ${totalMaintenanceRecords}`);
    
    // Mostrar estadísticas por vehículo
    for (const vehicle of vehicles) {
      const fuelCount = await FuelRecord.count({ where: { vehicleId: vehicle.id } });
      const maintenanceCount = await Maintenance.count({ where: { vehicleId: vehicle.id } });
      console.log(`Vehículo ${vehicle.plateNumber}: ${fuelCount} combustibles, ${maintenanceCount} mantenimientos`);
    }
    
    console.log('\nDatos de muestra añadidos exitosamente!');
    
  } catch (error) {
    console.error('Error añadiendo datos de muestra:', error);
  } finally {
    await sequelize.close();
  }
}

addSampleData();