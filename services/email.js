const nodemailer = require('nodemailer');

/**
 * Servicio para enviar correos electrónicos
 * 
 * Requiere las siguientes variables de entorno:
 * - SMTP_HOST: Servidor SMTP (ej: smtp.gmail.com, smtp.office365.com)
 * - SMTP_PORT: Puerto SMTP (ej: 587 para TLS, 465 para SSL)
 * - SMTP_USER: Usuario/email del remitente
 * - SMTP_PASS: Contraseña o app password del remitente
 * - CONTACT_EMAIL: Email donde se recibirán los mensajes de contacto (opcional, por defecto usa SMTP_USER)
 */
class EmailService {
  constructor() {
    this.smtpHost = process.env.SMTP_HOST;
    this.smtpPort = process.env.SMTP_PORT || 587;
    this.smtpUser = process.env.SMTP_USER;
    this.smtpPass = process.env.SMTP_PASS;
    this.contactEmail = process.env.CONTACT_EMAIL || this.smtpUser;
    
    // Crear transporter si hay configuración disponible
    this.transporter = null;
    if (this.smtpHost && this.smtpUser && this.smtpPass) {
      this.transporter = nodemailer.createTransport({
        host: this.smtpHost,
        port: parseInt(this.smtpPort),
        secure: this.smtpPort == 465, // true para 465, false para otros puertos
        auth: {
          user: this.smtpUser,
          pass: this.smtpPass
        }
      });
    }
  }

  /**
   * Verifica si el servicio de email está configurado
   * @returns {boolean}
   */
  isConfigured() {
    return this.transporter !== null;
  }

  /**
   * Envía un correo de contacto desde el formulario
   * @param {string} name - Nombre del remitente
   * @param {string} email - Email del remitente
   * @param {string} message - Mensaje del remitente
   * @returns {Promise<{success: boolean, message?: string}>}
   */
  async sendContactEmail(name, email, message) {
    if (!this.isConfigured()) {
      console.warn('⚠️  Email no configurado. El mensaje no se enviará.');
      return {
        success: false,
        message: 'El servicio de correo no está configurado'
      };
    }

    try {
      const mailOptions = {
        from: `"${name}" <${this.smtpUser}>`,
        replyTo: email,
        to: this.contactEmail,
        subject: `Nuevo mensaje de contacto - ${name}`,
        html: `
          <h2>Nuevo mensaje de contacto</h2>
          <p><strong>Nombre:</strong> ${this.escapeHtml(name)}</p>
          <p><strong>Email:</strong> ${this.escapeHtml(email)}</p>
          <p><strong>Mensaje:</strong></p>
          <p>${this.escapeHtml(message).replace(/\n/g, '<br>')}</p>
          <hr>
          <p><small>Enviado desde el formulario de contacto de Galpe Exchange</small></p>
        `,
        text: `
Nuevo mensaje de contacto

Nombre: ${name}
Email: ${email}

Mensaje:
${message}

---
Enviado desde el formulario de contacto de Galpe Exchange
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Correo enviado:', info.messageId);
      
      return {
        success: true,
        message: 'Correo enviado correctamente'
      };
    } catch (error) {
      console.error('❌ Error al enviar correo:', error);
      return {
        success: false,
        message: error.message || 'Error al enviar el correo'
      };
    }
  }

  /**
   * Escapa caracteres HTML para prevenir XSS
   * @param {string} text - Texto a escapar
   * @returns {string}
   */
  escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
}

module.exports = EmailService;
