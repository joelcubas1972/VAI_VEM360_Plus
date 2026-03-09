import { onCall } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as nodemailer from "nodemailer";

// Configurar nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmailVerification = onCall(async (request) => {
  const { email, codigo } = request.data;
  
  if (!email || !codigo) {
    throw new Error("Email y código son requeridos");
  }

  logger.info(`Enviando código ${codigo} a ${email}`);

  try {
    const mailOptions = {
      from: '"Vai Vem 360 Plus" <noreply@vaivem360.com>',
      to: email,
      subject: "🔐 Tu código de verificación - Vai Vem 360 Plus",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 24px; font-weight: bold; color: #333; }
            .code { text-align: center; margin: 30px 0; }
            .code-box { 
              font-size: 48px; 
              font-weight: bold; 
              color: #4CAF50; 
              background-color: #f8f8f8;
              padding: 20px;
              border-radius: 10px;
              letter-spacing: 10px;
              display: inline-block;
              border: 2px dashed #4CAF50;
            }
            .info { color: #666; line-height: 1.6; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #999; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🚗 Vai Vem 360 Plus</div>
            </div>
            
            <h2 style="text-align: center; color: #333;">¡Bienvenido!</h2>
            
            <p class="info">Gracias por registrarte. Para completar tu verificación, usa el siguiente código:</p>
            
            <div class="code">
              <div class="code-box">${codigo}</div>
            </div>
            
            <p class="info">
              ⏰ Este código expirará en <strong>10 minutos</strong>.<br>
              🔒 Por seguridad, no compartas este código con nadie.
            </p>
            
            <div class="footer">
              <p>Si no solicitaste este código, puedes ignorar este mensaje.</p>
              <p>&copy; 2024 Vai Vem 360 Plus. Todos los derechos reservados.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Tu código de verificación es: ${codigo}. Expira en 10 minutos. No compartas este código.`
    };

    const info = await transporter.sendMail(mailOptions);
    
    logger.info(`✅ Email enviado correctamente a ${email}`, info.messageId);
    
    return { 
      success: true, 
      messageId: info.messageId 
    };
    
  } catch (error: unknown) {
    logger.error("❌ Error enviando email:", error);
    
    // Manejar error de autenticación
    if (error && typeof error === 'object' && 'code' in error && error.code === 'EAUTH') {
      throw new Error("Error de autenticación con Gmail. Verifica que estás usando una contraseña de aplicación válida.");
    }
    
    // Obtener mensaje de error de forma segura
    let errorMessage = "Error desconocido";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (error && typeof error === 'object' && 'message' in error) {
      errorMessage = String(error.message);
    } else if (typeof error === 'string') {
      errorMessage = error;
    }
    
    throw new Error(`No se pudo enviar el email: ${errorMessage}`);
  }
});

export const sendEmailVerificationDev = onCall(async (request) => {
  const { email, codigo } = request.data;
  
  logger.info(`🔵 [DEV] Código para ${email}: ${codigo}`);
  logger.info(`🔵 [DEV] URL de verificación: http://localhost/verify?code=${codigo}`);
  
  return { 
    success: true, 
    message: `[DEV] Código generado: ${codigo}`,
    dev: true
  };
});