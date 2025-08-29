const nodemailer = require('nodemailer');
const Vehicle = require('../models/Vehicle');
const Maintenance = require('../models/Maintenance');
const Company = require('../models/Company');
const User = require('../models/User');
const cron = require('node-cron');

class AlertService {
  constructor() {
    this.transporter = this.createTransporter();
    this.initializeCronJobs();
  }

  createTransporter() {
    return nodemailer.createTransporter({
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

      const vehicles = await Vehicle.find({
        'specifications.itv.expiryDate': { $lte: thirtyDaysFromNow },
        'specifications.itv.isValid': true,
        isActive: true
      }).populate('company').populate('branch');

      for (const vehicle of vehicles) {
        await this.sendITVExpirationAlert(vehicle);
      }

      console.log(`Verificadas ${vehicles.length} alertas de ITV`);
    } catch (error) {
      console.error('Error verificando vencimientos de ITV:', error);
    }
  }

  // Verificar vencimientos de seguro
  async checkInsuranceExpirations() {
    try {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const vehicles = await Vehicle.find({
        'specifications.insurance.expiryDate': { $lte: thirtyDaysFromNow },
        'specifications.insurance.isValid': true,
        isActive: true
      }).populate('company').populate('branch');

      for (const vehicle of vehicles) {
        await this.sendInsuranceExpirationAlert(vehicle);
      }

      console.log(`Verificadas ${vehicles.length} alertas de seguro`);
    } catch (error) {
      console.error('Error verificando vencimientos de seguro:', error);
    }
  }

  // Verificar mantenimientos vencidos o próximos a vencer
  async checkMaintenanceAlerts() {
    try {
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

      const maintenances = await Maintenance.find({
        scheduledDate: { $lte: sevenDaysFromNow },
        status: { $in: ['programado', 'pendiente_aprobacion'] },
        isActive: true
      }).populate('vehicle').populate('company').populate('assignedTo');

      for (const maintenance of maintenances) {
        await this.sendMaintenanceAlert(maintenance);
      }

      console.log(`Verificadas ${maintenances.length} alertas de mantenimiento`);
    } catch (error) {
      console.error('Error verificando alertas de mantenimiento:', error);
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
        Company.findById(companyId),
        User.find({
          company: companyId,
          role: { $in: ['admin', 'gerente'] },
          isActive: true,
          email: { $exists: true, $ne: '' }
        })
      ]);

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