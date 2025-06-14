require("dotenv").config()
const nodemailer = require("nodemailer")

console.log("=== DIAGNÓSTICO DE EMAIL ===")
console.log("EMAIL_ENABLED:", process.env.EMAIL_ENABLED)
console.log("EMAIL_SERVICE:", process.env.EMAIL_SERVICE)
console.log("EMAIL_USER:", process.env.EMAIL_USER)
console.log("EMAIL_PASS:", process.env.EMAIL_PASS ? "CONFIGURADO" : "NO CONFIGURADO")
console.log("EMAIL_TO:", process.env.EMAIL_TO)

async function testEmail() {
  try {
    console.log("\n=== CREANDO TRANSPORTADOR ===")

    // CORREGIDO: createTransport (sin la "r")
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    })

    console.log("✅ Transportador creado")

    console.log("\n=== VERIFICANDO CONFIGURACIÓN ===")
    await transporter.verify()
    console.log("✅ Configuración verificada")

    console.log("\n=== ENVIANDO EMAIL DE PRUEBA ===")
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO,
      subject: "🤖 Test de Email - Bot de Arbitraje",
      html: `
        <h2>Test de Email</h2>
        <p>Este es un email de prueba del Bot de Arbitraje CEX.</p>
        <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
        <p>Si recibes este email, la configuración está funcionando correctamente.</p>
      `,
    })

    console.log("✅ EMAIL ENVIADO EXITOSAMENTE")
    console.log("Message ID:", info.messageId)
    console.log("Response:", info.response)
  } catch (error) {
    console.error("❌ ERROR:", error.message)

    if (error.code === "EAUTH") {
      console.error("\n🔑 PROBLEMA DE AUTENTICACIÓN:")
      console.error("- Verifica que EMAIL_USER sea correcto")
      console.error("- Verifica que EMAIL_PASS sea una contraseña de aplicación (no tu contraseña normal)")
      console.error("- Asegúrate de que la verificación en 2 pasos esté activada en Google")
    }

    if (error.code === "ENOTFOUND") {
      console.error("\n🌐 PROBLEMA DE CONEXIÓN:")
      console.error("- Verifica tu conexión a internet")
      console.error("- Verifica que el host SMTP sea correcto")
    }

    if (error.code === "ETIMEDOUT") {
      console.error("\n⏰ PROBLEMA DE TIMEOUT:")
      console.error("- El servidor SMTP no responde")
      console.error("- Verifica tu firewall o antivirus")
    }

    console.error("\nCódigo de error:", error.code)
    console.error("Detalles completos:", error)
  }
}

testEmail()
