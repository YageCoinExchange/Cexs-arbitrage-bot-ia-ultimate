const https = require("https")
const EventEmitter = require("events")
const nodemailer = require("nodemailer")
const axios = require("axios")

/**
 * Gestor de Alertas para el Bot de Arbitraje
 */
class AlertManager extends EventEmitter {
  constructor(config) {
    super()
    this.config = config
    this.enabled = config.ALERTS.ENABLED
    this.channels = config.ALERTS.CHANNELS
    this.alertTypes = config.ALERTS.ALERT_TYPES

    this.emailTransporter = null
    this.alertHistory = []
    this.alertQueue = []
    this.isProcessingQueue = false

    this.logger = console

    // ======= AGREGADO DASHBOARD: historial reciente de anomalías =======
    this.anomalies = []
    // ======= FIN AGREGADO =======
  }

  /**
   * Inicializa el gestor de alertas
   */
  async initialize() {
    if (!this.enabled) {
      this.logger.info("Alert Manager deshabilitado")
      return
    }

    this.logger.info("Inicializando Alert Manager...")

    try {
      // Inicializar transportador de email
      if (this.channels.EMAIL.enabled) {
        await this.initializeEmailTransporter()
      }

      // Verificar configuración de Telegram
      if (this.channels.TELEGRAM.enabled) {
        await this.verifyTelegramConfig()
      }

      // Iniciar procesamiento de cola
      this.startQueueProcessor()

      // Programar resumen diario
      this.scheduleDailySummary()

      this.logger.info("Alert Manager inicializado correctamente")

      // ENVIAR MENSAJE DE PRUEBA AL INICIALIZAR - CAMBIADO A BOT_STARTED
      await this.sendAlert("BOT_STARTED", "🤖 Bot de Arbitraje iniciado correctamente")
    } catch (error) {
      this.logger.error("Error inicializando Alert Manager:", error)
      throw error
    }
  }

  /**
   * Inicializa el transportador de email
   */
  async initializeEmailTransporter() {
    try {
      this.emailTransporter = nodemailer.createTransport(this.channels.EMAIL.smtp)

      // Verificar configuración
      await this.emailTransporter.verify()
      this.logger.info("Transportador de email configurado correctamente")
    } catch (error) {
      this.logger.error("Error configurando email:", error)
      this.channels.EMAIL.enabled = false
    }
  }

  /**
   * Verifica la configuración de Telegram
   */
  async verifyTelegramConfig() {
    try {
      const { botToken, chatId } = this.channels.TELEGRAM

      // VERIFICAR QUE LAS VARIABLES ESTÉN CONFIGURADAS
      this.logger.info("=== VERIFICANDO CONFIGURACIÓN DE TELEGRAM ===")
      this.logger.info("Bot Token:", botToken ? "CONFIGURADO" : "NO CONFIGURADO")
      this.logger.info("Chat ID:", chatId ? "CONFIGURADO" : "NO CONFIGURADO")

      if (!botToken || botToken === "") {
        throw new Error("TELEGRAM_BOT_TOKEN no está configurado en las variables de entorno")
      }

      if (!chatId || chatId === "") {
        throw new Error("TELEGRAM_CHAT_ID no está configurado en las variables de entorno")
      }

      // Verificar que el bot esté activo
      const response = await axios.get(`https://api.telegram.org/bot${botToken}/getMe`)

      if (response.data.ok) {
        this.logger.info(`✅ Bot de Telegram verificado: ${response.data.result.username}`)
      } else {
        throw new Error("Token de bot de Telegram inválido")
      }
    } catch (error) {
      this.logger.error("❌ Error verificando Telegram:", error.message)
      // NO DESHABILITAR TELEGRAM, SOLO MOSTRAR EL ERROR
      // this.channels.TELEGRAM.enabled = false;
    }
  }

  /**
   * Inicia el procesador de cola de alertas
   */
  startQueueProcessor() {
    setInterval(async () => {
      if (!this.isProcessingQueue && this.alertQueue.length > 0) {
        await this.processAlertQueue()
      }
    }, 1000)
  }

  /**
   * Procesa la cola de alertas
   */
  async processAlertQueue() {
    this.isProcessingQueue = true

    while (this.alertQueue.length > 0) {
      const alert = this.alertQueue.shift()

      try {
        await this.sendAlertToChannels(alert)
      } catch (error) {
        this.logger.error("Error procesando alerta:", error)
      }

      // Pequeña pausa entre alertas
      await new Promise((resolve) => setTimeout(resolve, 100))
    }

    this.isProcessingQueue = false
  }

  /**
   * Programa el resumen diario
   */
  scheduleDailySummary() {
    if (!this.alertTypes.DAILY_SUMMARY.enabled) {
      return
    }

    const summaryTime = this.alertTypes.DAILY_SUMMARY.time || "23:59"
    const [hours, minutes] = summaryTime.split(":").map(Number)

    // Calcular tiempo hasta el próximo resumen
    const now = new Date()
    const nextSummary = new Date()
    nextSummary.setHours(hours, minutes, 0, 0)

    if (nextSummary <= now) {
      nextSummary.setDate(nextSummary.getDate() + 1)
    }

    const timeUntilSummary = nextSummary.getTime() - now.getTime()

    setTimeout(() => {
      this.sendDailySummary()

      // Programar para el día siguiente
      setInterval(
        () => {
          this.sendDailySummary()
        },
        24 * 60 * 60 * 1000,
      )
    }, timeUntilSummary)
  }

  /**
   * Envía una alerta
   * @param {string} type - Tipo de alerta ('info', 'warning', 'error', 'trade', 'risk')
   * @param {string} message - Mensaje de la alerta
   * @param {Object} data - Datos adicionales
   */
  async sendAlert(type, message, data = {}) {
    if (!this.enabled) {
      this.logger.info("Alertas deshabilitadas, no se enviará:", message)
      return
    }

    // BUSCAR CONFIGURACIÓN DE ALERTA O USAR VALORES POR DEFECTO
    const alertConfig = this.alertTypes[type.toUpperCase()] || {
      enabled: true,
      channels: ["telegram"],
      priority: "medium",
    }

    if (!alertConfig.enabled) {
      this.logger.info(`Tipo de alerta ${type} deshabilitado`)
      return
    }

    // Crear objeto de alerta
    const alert = {
      id: this.generateAlertId(),
      type,
      message,
      data,
      timestamp: new Date(),
      priority: alertConfig.priority || "medium",
      channels: alertConfig.channels || ["telegram"],
    }

    this.logger.info(`📢 Enviando alerta: ${type} - ${message}`)

    // Añadir a la cola
    this.alertQueue.push(alert)

    // Añadir al historial
    this.alertHistory.push(alert)

    // ======= AGREGADO DASHBOARD: guardar anomalías si corresponde =======
    if (type && (type.toUpperCase().includes("ANOMALY") || type.toUpperCase().includes("ANOMALIA") || type.toUpperCase().includes("RISK") || type.toUpperCase().includes("VOLATILIDAD") || type.toUpperCase().includes("OPPORTUNITY"))) {
      this.anomalies.push({
        tipo: type,
        descripcion: message,
        timestamp: new Date().toLocaleString(),
        data: data || {},
      })
      if (this.anomalies.length > 100) {
        this.anomalies.shift()
      }
    }
    // ======= FIN AGREGADO DASHBOARD =======

    // Mantener solo las últimas 1000 alertas
    if (this.alertHistory.length > 1000) {
      this.alertHistory.shift()
    }

    // Emitir evento
    this.emit("alertSent", alert)
  }

  /**
   * Envía una alerta a todos los canales configurados
   */
  async sendAlertToChannels(alert) {
    const promises = []

    for (const channel of alert.channels) {
      switch (channel.toLowerCase()) {
        case "email":
          if (this.channels.EMAIL.enabled) {
            promises.push(this.sendEmailAlert(alert))
          }
          break

        case "telegram":
          if (this.channels.TELEGRAM.enabled) {
            promises.push(this.sendTelegramAlert(alert))
          }
          break

        case "discord":
          if (this.channels.DISCORD.enabled) {
            promises.push(this.sendDiscordAlert(alert))
          }
          break

        case "slack":
          if (this.channels.SLACK.enabled) {
            promises.push(this.sendSlackAlert(alert))
          }
          break
      }
    }

    // Esperar a que se envíen todas las alertas
    const results = await Promise.allSettled(promises)

    // MOSTRAR RESULTADOS DE CADA CANAL
    results.forEach((result, index) => {
      if (result.status === "rejected") {
        this.logger.error(`Error enviando alerta por ${alert.channels[index]}:`, result.reason.message)
      }
    })
  }

  /**
   * Envía alerta por email
   */
  async sendEmailAlert(alert) {
    if (!this.emailTransporter) {
      throw new Error("Transportador de email no inicializado")
    }

    const subject = this.formatEmailSubject(alert)
    const html = this.formatEmailBody(alert)

    const mailOptions = {
      from: this.channels.EMAIL.from,
      to: this.channels.EMAIL.to,
      subject,
      html,
    }

    await this.emailTransporter.sendMail(mailOptions)
    this.logger.info(`✅ Alerta enviada por email: ${alert.type}`)
  }

  /**
   * Envía alerta por Telegram
   */
  async sendTelegramAlert(alert) {
    try {
      const { botToken, chatId, parseMode } = this.channels.TELEGRAM

      // VERIFICAR CONFIGURACIÓN ANTES DE ENVIAR
      if (!botToken || botToken === "") {
        throw new Error("TELEGRAM_BOT_TOKEN no configurado")
      }

      if (!chatId || chatId === "") {
        throw new Error("TELEGRAM_CHAT_ID no configurado")
      }

      const message = this.formatTelegramMessage(alert)
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`

      this.logger.info("📱 Enviando mensaje a Telegram...")

      const response = await axios.post(url, {
        chat_id: chatId,
        text: message,
        parse_mode: parseMode || "HTML",
      })

      if (response.data.ok) {
        this.logger.info(`✅ Alerta enviada por Telegram: ${alert.type}`)
      } else {
        throw new Error(`Error de Telegram: ${response.data.description}`)
      }
    } catch (error) {
      this.logger.error("❌ Error enviando alerta por Telegram:", error.message)

      if (error.response) {
        this.logger.error("Respuesta de Telegram:", error.response.data)
      }

      throw error
    }
  }

  /**
   * Envía alerta por Discord
   */
  async sendDiscordAlert(alert) {
    const { webhookUrl } = this.channels.DISCORD
    const embed = this.formatDiscordEmbed(alert)

    await axios.post(webhookUrl, {
      embeds: [embed],
    })

    this.logger.info(`✅ Alerta enviada por Discord: ${alert.type}`)
  }

  /**
   * Envía alerta por Slack
   */
  async sendSlackAlert(alert) {
    const { webhookUrl } = this.channels.SLACK
    const payload = this.formatSlackMessage(alert)

    await axios.post(webhookUrl, payload)

    this.logger.info(`✅ Alerta enviada por Slack: ${alert.type}`)
  }

  /**
   * Formatea el asunto del email
   */
  formatEmailSubject(alert) {
    const priorityEmoji = {
      low: "🔵",
      medium: "🟡",
      high: "🟠",
      critical: "🔴",
    }

    const emoji = priorityEmoji[alert.priority] || "🔵"
    return `${emoji} Bot de Arbitraje - ${alert.type.toUpperCase()}`
  }

  /**
   * Formatea el cuerpo del email
   */
  formatEmailBody(alert) {
    return `
      <html>
      <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; padding: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h2 style="color: #333; margin-top: 0;">Bot de Arbitraje CEX</h2>
          
          <div style="background-color: ${this.getPriorityColor(alert.priority)}; color: white; padding: 10px; border-radius: 4px; margin: 20px 0;">
            <strong>Tipo:</strong> ${alert.type.toUpperCase()}
          </div>
          
          <div style="margin: 20px 0;">
            <strong>Mensaje:</strong><br>
            ${alert.message}
          </div>
          
          <div style="margin: 20px 0;">
            <strong>Timestamp:</strong> ${alert.timestamp.toLocaleString()}
          </div>
          
          ${
            alert.data && Object.keys(alert.data).length > 0
              ? `
          <div style="margin: 20px 0;">
            <strong>Datos adicionales:</strong><br>
            <pre style="background-color: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(alert.data, null, 2)}</pre>
          </div>
          `
              : ""
          }
          
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
          
          <p style="color: #666; font-size: 12px; margin: 0;">
            Esta es una notificación automática del Bot de Arbitraje CEX.
          </p>
        </div>
      </body>
      </html>
    `
  }

  /**
   * Formatea el mensaje de Telegram
   */
  formatTelegramMessage(alert) {
    const priorityEmoji = {
      low: "🔵",
      medium: "🟡",
      high: "🟠",
      critical: "🔴",
    }

    const emoji = priorityEmoji[alert.priority] || "🔵"

    let message = `${emoji} <b>Bot de Arbitraje CEX</b>\n\n`
    message += `<b>Tipo:</b> ${alert.type.toUpperCase()}\n`
    message += `<b>Mensaje:</b> ${alert.message}\n`
    message += `<b>Timestamp:</b> ${alert.timestamp.toLocaleString()}\n`

    if (alert.data && Object.keys(alert.data).length > 0) {
      message += `\n<b>Datos:</b>\n`
      for (const [key, value] of Object.entries(alert.data)) {
        message += `• ${key}: ${value}\n`
      }
    }

    return message
  }

  /**
   * Formatea el embed de Discord
   */
  formatDiscordEmbed(alert) {
    const color = this.getPriorityColorHex(alert.priority)

    const embed = {
      title: `Bot de Arbitraje CEX - ${alert.type.toUpperCase()}`,
      description: alert.message,
      color: Number.parseInt(color.replace("#", ""), 16),
      timestamp: alert.timestamp.toISOString(),
      fields: [],
    }

    if (alert.data && Object.keys(alert.data).length > 0) {
      for (const [key, value] of Object.entries(alert.data)) {
        embed.fields.push({
          name: key,
          value: String(value),
          inline: true,
        })
      }
    }

    return embed
  }

  /**
   * Formatea el mensaje de Slack
   */
  formatSlackMessage(alert) {
    const color = this.getPriorityColor(alert.priority)

    const attachment = {
      color,
      title: `Bot de Arbitraje CEX - ${alert.type.toUpperCase()}`,
      text: alert.message,
      timestamp: Math.floor(alert.timestamp.getTime() / 1000),
      fields: [],
    }

    if (alert.data && Object.keys(alert.data).length > 0) {
      for (const [key, value] of Object.entries(alert.data)) {
        attachment.fields.push({
          title: key,
          value: String(value),
          short: true,
        })
      }
    }

    return {
      attachments: [attachment],
    }
  }

  /**
   * Obtiene el color según la prioridad
   */
  getPriorityColor(priority) {
    const colors = {
      low: "#007bff",
      medium: "#ffc107",
      high: "#fd7e14",
      critical: "#dc3545",
    }

    return colors[priority] || colors.medium
  }

  /**
   * Obtiene el color hexadecimal según la prioridad
   */
  getPriorityColorHex(priority) {
    const colors = {
      low: "#007bff",
      medium: "#ffc107",
      high: "#fd7e14",
      critical: "#dc3545",
    }

    return colors[priority] || colors.medium
  }

  /**
   * Envía el resumen diario
   */
  async sendDailySummary() {
    try {
      // Obtener alertas del día
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const todayAlerts = this.alertHistory.filter((alert) => new Date(alert.timestamp) >= today)

      // Agrupar por tipo
      const alertsByType = {}
      for (const alert of todayAlerts) {
        if (!alertsByType[alert.type]) {
          alertsByType[alert.type] = 0
        }
        alertsByType[alert.type]++
      }

      // Crear mensaje de resumen
      let summary = `📊 Resumen diario del Bot de Arbitraje CEX\n\n`
      summary += `Total de alertas: ${todayAlerts.length}\n\n`

      if (Object.keys(alertsByType).length > 0) {
        summary += `Alertas por tipo:\n`
        for (const [type, count] of Object.entries(alertsByType)) {
          summary += `• ${type}: ${count}\n`
        }
      } else {
        summary += `No se generaron alertas hoy.`
      }

      // Enviar resumen
      await this.sendAlert("DAILY_SUMMARY", summary)
    } catch (error) {
      this.logger.error("Error enviando resumen diario:", error)
    }
  }

  /**
   * Genera un ID único para la alerta
   */
  generateAlertId() {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Obtiene el historial de alertas
   */
  getAlertHistory(limit = 100) {
    return this.alertHistory.slice(-limit)
  }

  /**
   * Obtiene estadísticas de alertas
   */
  getAlertStatistics() {
    const stats = {
      total: this.alertHistory.length,
      byType: {},
      byPriority: {},
      last24Hours: 0,
    }

    const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000)

    for (const alert of this.alertHistory) {
      // Por tipo
      if (!stats.byType[alert.type]) {
        stats.byType[alert.type] = 0
      }
      stats.byType[alert.type]++

      // Por prioridad
      if (!stats.byPriority[alert.priority]) {
        stats.byPriority[alert.priority] = 0
      }
      stats.byPriority[alert.priority]++

      // Últimas 24 horas
      if (new Date(alert.timestamp) >= last24Hours) {
        stats.last24Hours++
      }
    }

    return stats
  }

  // ======= AGREGADO DASHBOARD: método para anomalias recientes =======
  getRecentAnomalies(limit = 25) {
    return this.anomalies.slice(-limit)
  }
  // ======= FIN AGREGADO DASHBOARD =======
}

module.exports = AlertManager
