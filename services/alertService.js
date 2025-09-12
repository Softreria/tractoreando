const nodemailer = require('nodemailer');
const { Vehicle, Maintenance, Company, User } = require('../models');
const { Op } = require('sequelize');
const cron = require('node-cron');

class AlertService {
  constructor() {
    this.transporter = this.createTransporter();
    this.initializeCronJobs();
  }

  createTransporter() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  // Verificar vencimientos de ITV
  async checkITVExpirations() {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const vehicles = await Vehicle.findAll({
        where: {
          isActive: true
        },
        include: [
          { model: Company, as: 'company' }
        ]
      });

      const vehiclesWithITVExpiring = vehicles.filter(vehicle => {
        const itvExpiryDate = vehicle.specifications?.itv?.expiryDate;
        return itvExpiryDate && new Date(itvExpiryDate) <= thirtyDaysFromNow && vehicle.specifications.itv.isValid;
      });

      for (const vehicle of vehiclesWithITVExpiring) {
        await this.sendITVExpirationAlert(vehicle);
      }

      console.log(`Verificadas ${vehiclesWithITVExpiring.length} alertas de ITV`);
    } catch (error) {
      console.error('Error verificando vencimientos de ITV:', error);
    }
  }

  // Verificar vencimientos de seguro
  async checkInsuranceExpirations() {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const vehicles = await Vehicle.findAll({
        where: {
          isActive: true
        },
        include: [
          { model: Company, as: 'company' }
        ]
      });

      const vehiclesWithInsuranceExpiring = vehicles.filter(vehicle => {
        const insuranceExpiryDate = vehicle.specifications?.insurance?.expiryDate;
        return insuranceExpiryDate && new Date(insuranceExpiryDate) <= thirtyDaysFromNow && vehicle.specifications.insurance.isValid;
      });

      for (const vehicle of vehiclesWithInsuranceExpiring) {
        await this.sendInsuranceExpirationAlert(vehicle);
      }

      console.log(`Verificadas ${vehiclesWithInsuranceExpiring.length} alertas de seguro`);
    } catch (error) {
      console.error('Error verificando vencimientos de seguro:', error);
    }
  }

  // Verificar mantenimientos vencidos o próximos a vencer
  async checkMaintenanceAlerts() {
    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      // Verificar mantenimientos programados por fecha
      const maintenances = await Maintenance.findAll({
        where: {
          scheduledDate: { [Op.lte]: sevenDaysFromNow },
          status: { [Op.in]: ['programado', 'pendiente_aprobacion'] },
          isActive: true
        },
        include: [
          { model: Vehicle, as: 'vehicle' },
          { model: Company, as: 'company' },
          { model: User, as: 'assignedTo' }
        ]
      });

      for (const maintenance of maintenances) {
        await this.sendMaintenanceAlert(maintenance);
      }

      // Verificar mantenimientos basados en kilometraje
      await this.checkKilometerBasedMaintenance();

      console.log(`Verificadas ${maintenances.length} alertas de mantenimiento programado`);
    } catch (error) {
      console.error('Error verificando alertas de mantenimiento:', error);
    }
  }

  // Verificar mantenimientos basados en kilometraje
  async checkKilometerBasedMaintenance() {
    try {
      const vehicles = await Vehicle.findAll({
        where: {
          isActive: true
        },
        include: [
          { model: Company, as: 'company' }
        ]
      });

      let alertsGenerated = 0;

      for (const vehicle of vehicles) {
        // Verificar si necesita cambio de aceite
        if (vehicle.needsOilChange()) {
          await this.sendKilometerMaintenanceAlert(vehicle, 'oil_change');
          alertsGenerated++;
        }

        // Verificar si necesita inspección general
        if (vehicle.needsInspection()) {
          await this.sendKilometerMaintenanceAlert(vehicle, 'general_inspection');
          alertsGenerated++;
        }
      }

      console.log(`Generadas ${alertsGenerated} alertas de mantenimiento por kilometraje`);
    } catch (error) {
      console.error('Error verificando mantenimientos por kilometraje:', error);
    }
  }

  // Enviar alerta de mantenimiento por kilometraje
  async sendKilometerMaintenanceAlert(vehicle, maintenanceType) {
    try {
      const maintenanceTypes = {
        oil_change: {
          title: 'Cambio de Aceite',
          description: 'El vehículo necesita cambio de aceite',
          schedule: vehicle.maintenanceSchedule?.oilChange
        },
        general_inspection: {
          title: 'Inspección General',
          description: 'El vehículo necesita inspección general',
          schedule: vehicle.maintenanceSchedule?.generalInspection
        }
      };

      const maintenance = maintenanceTypes[maintenanceType];
      if (!maintenance) return;

      const currentKm = vehicle.odometer?.current || 0;
      const lastKm = maintenance.schedule?.lastKm || 0;
      const intervalKm = maintenance.schedule?.intervalKm || 5000;
      const kmOverdue = currentKm - (lastKm + intervalKm);

      const subject = `🔧 Mantenimiento Vencido por Kilometraje - ${vehicle.plateNumber}`;
      const html = `
        <h2>Alerta de Mantenimiento por Kilometraje</h2>
        <p><strong>Vehículo:</strong> ${vehicle.plateNumber} - ${vehicle.make} ${vehicle.model}</p>
        <p><strong>Empresa:</strong> ${vehicle.company.name}</p>
        <p><strong>Tipo de mantenimiento:</strong> ${maintenance.title}</p>
        <p><strong>Kilometraje actual:</strong> ${currentKm.toLocaleString()} km</p>
        <p><strong>Último mantenimiento:</strong> ${lastKm.toLocaleString()} km</p>
        <p><strong>Intervalo programado:</strong> ${intervalKm.toLocaleString()} km</p>
        <p><strong>Kilometraje de retraso:</strong> <span style="color: red; font-weight: bold;">${kmOverdue.toLocaleString()} km</span></p>
        <p style="color: red; font-weight: bold;">⚠️ MANTENIMIENTO VENCIDO - Requiere atención inmediata</p>
        <p>${maintenance.description}</p>
      `;

      await this.sendEmailToCompanyAdmins(vehicle.companyId, subject, html);
    } catch (error) {
      console.error('Error enviando alerta de mantenimiento por kilometraje:', error);
    }
  }

  // Enviar alerta de vencimiento de ITV
  async sendITVExpirationAlert(vehicle) {
    try {
      const daysUntilExpiry = Math.ceil(
        (vehicle.specifications.itv.expiryDate - new Date()) / (1000 * 60 * 60 * 24)
      );

      const subject = `⚠️ Vencimiento de ITV - ${vehicle.plateNumber}`;
      const html = `
        <h2>Alerta de Vencimiento de ITV</h2>
        <p><strong>Vehículo:</strong> ${vehicle.plateNumber} - ${vehicle.make} ${vehicle.model}</p>
        <p><strong>Empresa:</strong> ${vehicle.company.name}</p>
        <p><strong>Fecha de vencimiento:</strong> ${vehicle.specifications.itv.expiryDate.toLocaleDateString('es-ES')}</p>
        <p><strong>Días restantes:</strong> ${daysUntilExpiry}</p>
        <p>Es necesario renovar la ITV antes de la fecha de vencimiento.</p>
      `;

      await this.sendEmailToCompanyAdmins(vehicle.company._id, subject, html);
    } catch (error) {
      console.error('Error enviando alerta de ITV:', error);
    }
  }

  // Enviar alerta de vencimiento de seguro
  async sendInsuranceExpirationAlert(vehicle) {
    try {
      const daysUntilExpiry = Math.ceil(
        (vehicle.specifications.insurance.expiryDate - new Date()) / (1000 * 60 * 60 * 24)
      );

      const subject = `⚠️ Vencimiento de Seguro - ${vehicle.plateNumber}`;
      const html = `
        <h2>Alerta de Vencimiento de Seguro</h2>
        <p><strong>Vehículo:</strong> ${vehicle.plateNumber} - ${vehicle.make} ${vehicle.model}</p>
        <p><strong>Empresa:</strong> ${vehicle.company.name}</p>
        <p><strong>Compañía de seguro:</strong> ${vehicle.specifications.insurance.company}</p>
        <p><strong>Póliza:</strong> ${vehicle.specifications.insurance.policyNumber}</p>
        <p><strong>Fecha de vencimiento:</strong> ${vehicle.specifications.insurance.expiryDate.toLocaleDateString('es-ES')}</p>
        <p><strong>Días restantes:</strong> ${daysUntilExpiry}</p>
        <p>Es necesario renovar el seguro antes de la fecha de vencimiento.</p>
      `;

      await this.sendEmailToCompanyAdmins(vehicle.company._id, subject, html);
    } catch (error) {
      console.error('Error enviando alerta de seguro:', error);
    }
  }

  // Enviar alerta de mantenimiento
  async sendMaintenanceAlert(maintenance) {
    try {
      const daysUntilMaintenance = Math.ceil(
        (maintenance.scheduledDate - new Date()) / (1000 * 60 * 60 * 24)
      );

      const subject = `🔧 Mantenimiento ${daysUntilMaintenance <= 0 ? 'Vencido' : 'Próximo'} - ${maintenance.vehicle.plateNumber}`;
      const html = `
        <h2>Alerta de Mantenimiento</h2>
        <p><strong>Vehículo:</strong> ${maintenance.vehicle.plateNumber} - ${maintenance.vehicle.make} ${maintenance.vehicle.model}</p>
        <p><strong>Empresa:</strong> ${maintenance.company.name}</p>
        <p><strong>Tipo:</strong> ${maintenance.type}</p>
        <p><strong>Prioridad:</strong> ${maintenance.priority}</p>
        <p><strong>Fecha programada:</strong> ${maintenance.scheduledDate.toLocaleDateString('es-ES')}</p>
        <p><strong>Estado:</strong> ${daysUntilMaintenance <= 0 ? 'VENCIDO' : `${daysUntilMaintenance} días restantes`}</p>
        <p><strong>Descripción:</strong> ${maintenance.title}</p>
        ${maintenance.assignedTo ? `<p><strong>Asignado a:</strong> ${maintenance.assignedTo.firstName} ${maintenance.assignedTo.lastName}</p>` : ''}
      `;

      await this.sendEmailToCompanyAdmins(maintenance.company._id, subject, html);
    } catch (error) {
      console.error('Error enviando alerta de mantenimiento:', error);
    }
  }

  // Generar y enviar reporte semanal
  async sendWeeklyReport() {
    try {
      const companies = await Company.find({ isActive: true });

      for (const company of companies) {
        await this.generateAndSendWeeklyReport(company);
      }

      console.log(`Enviados reportes semanales a ${companies.length} empresas`);
    } catch (error) {
      console.error('Error enviando reportes semanales:', error);
    }
  }

  // Generar reporte semanal para una empresa
  async generateAndSendWeeklyReport(company) {
    try {
      const oneWeekFromNow = new Date();
      oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);

      // Obtener datos para el reporte
      const [vehicles, upcomingMaintenances, expiringDocuments] = await Promise.all([
        Vehicle.find({ company: company._id, isActive: true }),
        Maintenance.find({
          company: company._id,
          scheduledDate: { $lte: oneWeekFromNow },
          status: { $in: ['programado', 'pendiente_aprobacion'] },
          isActive: true
        }).populate('vehicle'),
        Vehicle.find({
          company: company._id,
          isActive: true,
          $or: [
            { 'specifications.itv.expiryDate': { $lte: oneWeekFromNow } },
            { 'specifications.insurance.expiryDate': { $lte: oneWeekFromNow } }
          ]
        })
      ]);

      const subject = `📊 Reporte Semanal - ${company.name}`;
      const html = this.generateWeeklyReportHTML(company, vehicles, upcomingMaintenances, expiringDocuments);

      await this.sendEmailToCompanyAdmins(company._id, subject, html);
    } catch (error) {
      console.error(`Error generando reporte semanal para ${company.name}:`, error);
    }
  }

  // Generar HTML del reporte semanal
  generateWeeklyReportHTML(company, vehicles, upcomingMaintenances, expiringDocuments) {
    const rentalVehicles = vehicles.filter(v => v.ownership.type === 'alquiler');
    const totalRentalCost = rentalVehicles.reduce((sum, v) => sum + (v.ownership.monthlyRentalPrice || 0), 0);

    return `
      <h1>Reporte Semanal - ${company.name}</h1>
      <h2>Resumen de Flota</h2>
      <ul>
        <li><strong>Total de vehículos:</strong> ${vehicles.length}</li>
        <li><strong>Vehículos en propiedad:</strong> ${vehicles.filter(v => v.ownership.type === 'propiedad').length}</li>
        <li><strong>Vehículos en alquiler:</strong> ${rentalVehicles.length}</li>
        <li><strong>Costo mensual de alquileres:</strong> €${totalRentalCost.toFixed(2)}</li>
      </ul>

      <h2>Mantenimientos Próximos (7 días)</h2>
      ${upcomingMaintenances.length > 0 ? `
        <ul>
          ${upcomingMaintenances.map(m => `
            <li><strong>${m.vehicle.plateNumber}</strong> - ${m.title} (${m.scheduledDate.toLocaleDateString('es-ES')})</li>
          `).join('')}
        </ul>
      ` : '<p>No hay mantenimientos programados para los próximos 7 días.</p>'}

      <h2>Documentos por Vencer (7 días)</h2>
      ${expiringDocuments.length > 0 ? `
        <ul>
          ${expiringDocuments.map(v => {
            const docs = [];
            if (v.specifications.itv.expiryDate && v.specifications.itv.expiryDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
              docs.push(`ITV (${v.specifications.itv.expiryDate.toLocaleDateString('es-ES')})`);
            }
            if (v.specifications.insurance.expiryDate && v.specifications.insurance.expiryDate <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
              docs.push(`Seguro (${v.specifications.insurance.expiryDate.toLocaleDateString('es-ES')})`);
            }
            return `<li><strong>${v.plateNumber}</strong> - ${docs.join(', ')}</li>`;
          }).join('')}
        </ul>
      ` : '<p>No hay documentos por vencer en los próximos 7 días.</p>'}

      <hr>
      <p><small>Este es un reporte automático generado por el sistema de gestión de flota.</small></p>
    `;
  }

  // Enviar email a administradores de la empresa
  async sendEmailToCompanyAdmins(companyId, subject, html) {
    try {
      const [company, admins] = await Promise.all([
        Company.findByPk(companyId),
        User.findAll({
          where: {
            companyId: companyId,
            role: { [Op.in]: ['company_admin', 'admin', 'gerente'] },
            isActive: true,
            email: { [Op.ne]: null }
          }
        })
      ]);

      if (!company) {
        console.log(`Empresa con ID ${companyId} no encontrada`);
        return;
      }

      const recipients = [];
      
      // Añadir email del administrador de la empresa
      if (company.administrator && company.administrator.email) {
        recipients.push(company.administrator.email);
      }

      // Añadir emails de usuarios admin/gerente
      admins.forEach(admin => {
        if (admin.email && !recipients.includes(admin.email)) {
          recipients.push(admin.email);
        }
      });

      if (recipients.length === 0) {
        console.log(`No se encontraron destinatarios para la empresa ${company.name}`);
        return;
      }

      const mailOptions = {
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: recipients.join(', '),
        subject: subject,
        html: html
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Email enviado a ${recipients.length} destinatarios de ${company.name}`);
    } catch (error) {
      console.error('Error enviando email:', error);
    }
  }

  // Inicializar trabajos cron
  initializeCronJobs() {
    // Verificar vencimientos diariamente a las 8:00 AM
    cron.schedule('0 8 * * *', () => {
      console.log('Ejecutando verificación diaria de vencimientos...');
      this.checkITVExpirations();
      this.checkInsuranceExpirations();
      this.checkMaintenanceAlerts();
    });

    // Enviar reporte semanal los lunes a las 9:00 AM
    cron.schedule('0 9 * * 1', () => {
      console.log('Enviando reportes semanales...');
      this.sendWeeklyReport();
    });

    console.log('Trabajos cron de alertas inicializados');
  }

  // Método para ejecutar verificaciones manualmente
  async runManualCheck() {
    console.log('Ejecutando verificación manual de alertas...');
    await this.checkITVExpirations();
    await this.checkInsuranceExpirations();
    await this.checkMaintenanceAlerts();
  }

  // Método para enviar reporte manual
  async sendManualWeeklyReport(companyId) {
    const company = await Company.findById(companyId);
    if (company) {
      await this.generateAndSendWeeklyReport(company);
    }
  }
}

module.exports = new AlertService();