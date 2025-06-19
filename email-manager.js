const nodemailer = require('nodemailer');

/**
 * Gestor de Email para el Bot de Arbitraje
 */
class EmailManager {
  constructor(config) {
    this.config = config;
    this.emailConfig = config.ALERTS.CHANNELS.EMAIL;
    this.transporter = null;
    this.logger = console;
  }

  /**
   * Inicializa el gestor de email
   */
  async initialize() {
    if (!this.emailConfig.enabled) {
      this.logger.info('Email deshabilitado en la configuración');
      return;
    }

    try {
      this.logger.info('Inicializando EmailManager...');
      
      // Crear transporter
      this.transporter = nodemailer.createTransporter({
        host: this.emailConfig.smtp.host,
        port: this.emailConfig.smtp.port,
        secure: this.emailConfig.smtp.secure,
        auth: {
          user: this.emailConfig.smtp.auth.user,
          pass: this.emailConfig.smtp.auth.pass,
        },
      });

      // Verificar conexión
      await this.transporter.verify();
      this.logger.info('✅ Conexión de email verificada correctamente');
      
      // Enviar email de prueba
      await this.sendTestEmail();
      
    } catch (error) {
      this.logger.error('❌ Error inicializando EmailManager:', error.message);
      throw error;
    }
  }

  /**
   * Envía un email de prueba
   */
  async sendTestEmail() {
    try {
      const testMessage = {
        from: this.emailConfig.from,
        to: this.emailConfig.to,
        subject: '🤖 Bot de Arbitraje - Test de Conexión',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">🤖 Bot de Arbitraje CEX</h2>
            <p>Este es un mensaje de prueba para verificar que las notificaciones por email funcionan correctamente.</p>
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p><strong>Fecha:</strong> ${new Date().toLocaleString()}</p>
              <p><strong>Estado:</strong> ✅ Conexión exitosa</p>
            </div>
            <p style="color: #6b7280; font-size: 12px;">
              Este mensaje fue enviado automáticamente por el sistema de alertas.
            </p>
          </div>
        `
      };

      await this.transporter.sendMail(testMessage);
      this.logger.info('✅ Email de prueba enviado correctamente');
      
    } catch (error) {
      this.logger.error('❌ Error enviando email de prueba:', error.message);
      throw error;
    }
  }

  /**
   * Envía un email de alerta
   * @param {string} type - Tipo de alerta
   * @param {string} message - Mensaje de la alerta
   * @param {Object} data - Datos adicionales
   */
  async sendAlert(type, message, data = {}) {
    if (!this.emailConfig.enabled || !this.transporter) {
      return;
    }

    try {
      const emailContent = this.formatEmailContent(type, message, data);
      
      const mailOptions = {
        from: this.emailConfig.from,
        to: this.emailConfig.to,
        subject: emailContent.subject,
        html: emailContent.html
      };

      await this.transporter.sendMail(mailOptions);
      this.logger.info(`📧 Email enviado: ${type} - ${message}`);
      
    } catch (error) {
      this.logger.error('❌ Error enviando email:', error.message);
    }
  }

  /**
   * Formatea el contenido del email según el tipo
   * @param {string} type - Tipo de alerta
   * @param {string} message - Mensaje
   * @param {Object} data - Datos adicionales
   * @returns {Object} - Contenido formateado
   */
  formatEmailContent(type, message, data) {
    const timestamp = new Date().toLocaleString();
    let emoji = '📢';
    let color = '#6b7280';
    let priority = 'Normal';

    switch (type) {
      case 'info':
        emoji = 'ℹ️';
        color = '#2563eb';
        priority = 'Información';
        break;
      case 'warning':
        emoji = '⚠️';
        color = '#f59e0b';
        priority = 'Advertencia';
        break;
      case 'error':
        emoji = '❌';
        color = '#dc2626';
        priority = 'Error';
        break;
      case 'trade':
        emoji = '💰';
        color = '#059669';
        priority = 'Operación';
        break;
      case 'risk':
        emoji = '🚨';
        color = '#dc2626';
        priority = 'Riesgo Alto';
        break;
      case 'profit':
        emoji = '💵';
        color = '#059669';
        priority = 'Ganancia';
        break;
      case 'balance':
        emoji = '💳';
        color = '#7c3aed';
        priority = 'Balance';
        break;
    }

    const subject = `${emoji} Bot Arbitraje - ${priority}: ${message.substring(0, 50)}...`;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <div style="background-color: ${color}; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">${emoji} Bot de Arbitraje CEX</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Alerta de ${priority}</p>
        </div>
        
        <div style="padding: 30px;">
          <div style="background-color: #f9fafb; border-left: 4px solid ${color}; padding: 15px; margin-bottom: 20px;">
            <h3 style="margin: 0 0 10px 0; color: ${color};">Mensaje:</h3>
            <p style="margin: 0; font-size: 16px; line-height: 1.5;">${message}</p>
          </div>

          ${data.details ? `
            <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h4 style="margin: 0 0 10px 0; color: #374151;">Detalles:</h4>
              <pre style="margin: 0; font-family: monospace; font-size: 12px; white-space: pre-wrap;">${JSON.stringify(data.details, null, 2)}</pre>
            </div>
          ` : ''}

          ${data.balances ? `
            <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h4 style="margin: 0 0 10px 0; color: #065f46;">💳 Balances Actuales:</h4>
              ${Object.entries(data.balances).map(([exchange, balance]) => 
                `<p style="margin: 5px 0;"><strong>${exchange}:</strong> $${balance.toFixed(2)}</p>`
              ).join('')}
            </div>
          ` : ''}

          ${data.profit ? `
            <div style="background-color: #ecfdf5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
              <h4 style="margin: 0 0 10px 0; color: #065f46;">💰 Información de Ganancia:</h4>
              <p style="margin: 5px 0;"><strong>Ganancia:</strong> $${data.profit.toFixed(2)}</p>
              <p style="margin: 5px 0;"><strong>Porcentaje:</strong> ${data.profitPercentage?.toFixed(2)}%</p>
            </div>
          ` : ''}

          <div style="border-top: 1px solid #e5e7eb; padding-top: 15px; margin-top: 20px;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
              <strong>Fecha:</strong> ${timestamp}<br>
              <strong>Tipo:</strong> ${priority}<br>
              <strong>Sistema:</strong> Bot de Arbitraje CEX con IA
            </p>
          </div>
        </div>

        <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 11px;">
            Este mensaje fue enviado automáticamente por el sistema de alertas del Bot de Arbitraje.
          </p>
        </div>
      </div>
    `;

    return { subject, html };
  }

  /**
   * Envía resumen diario por email
   * @param {Object} stats - Estadísticas del día
   */
  async sendDailySummary(stats) {
    const data = {
      details: stats,
      balances: stats.balances,
      profit: stats.totalProfit
    };

    const message = `Resumen diario del bot de arbitraje:
    
💰 Ganancia Total: $${stats.totalProfit.toFixed(2)}
📈 Operaciones Exitosas: ${stats.successfulTrades}
📉 Operaciones Fallidas: ${stats.failedTrades}
🎯 Tasa de Éxito: ${((stats.successfulTrades / (stats.totalTrades || 1)) * 100).toFixed(1)}%
⚡ Latencia Promedio: ${stats.averageLatency}`;

    await this.sendAlert('info', message, data);
  }
}

module.exports = EmailManager;
