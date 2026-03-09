import * as logger from "firebase-functions/logger";
import { onCall } from "firebase-functions/v2/https";
import * as nodemailer from "nodemailer";

// Configurar nodemailer
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Versión de desarrollo (SOLO ESTA POR AHORA)
export const sendEmailVerificationDev = onCall(async (request) => {
  // Los datos vienen en request.data
  const { email, codigo } = request.data;
  
  logger.info(`🔵 [DEV] Código para ${email}: ${codigo}`);
  
  return { 
    success: true, 
    message: `[DEV] Código generado: ${codigo}`,
    dev: true
  };
});

// Versión real (comentada hasta que tengas credenciales)
/*
export const sendEmailVerification = onCall(async (request) => {
  const { email, codigo } = request.data;
  
  if (!email || !codigo) {
    throw new Error("Email y código son requeridos");
  }

  try {
    const mailOptions = {
      from: '"Vai Vem 360 Plus" <noreply@vaivem360.com>',
      to: email,
      subject: "Tu código de verificación",
      html: `<h2>Tu código es: ${codigo}</h2>`
    };

    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    logger.error("Error:", error);
    throw new Error("No se pudo enviar el email");
  }
});
*/