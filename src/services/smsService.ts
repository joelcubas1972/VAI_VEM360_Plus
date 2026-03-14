import twilio from 'twilio';

// IMPORTANTE: Esto DEBE ir en un backend, NUNCA en el cliente
// Por ahora para pruebas, pero en producción usa Cloud Functions

const accountSid = 'TU_ACCOUNT_SID';
const authToken = 'TU_AUTH_TOKEN';
const client = twilio(accountSid, authToken);

export const sendSMS = async (to: string, code: string) => {
  try {
    const message = await client.messages.create({
      body: `Tu código de verificación VAI-VEM360+ es: ${code}`,
      to: to, // Número destino
      from: '+1234567890', // Tu número Twilio
    });
    console.log('SMS enviado:', message.sid);
    return { success: true, sid: message.sid };
  } catch (error) {
    console.error('Error SMS:', error);
    return { success: false, error };
  }
};