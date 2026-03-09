import { auth, firestore, functions } from './firebaseConfig';
// Generar código de 6 dígitos
const generarCodigo = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// SOLICITAR VALIDACIÓN
export const solicitarValidacion = async (
  email: string, 
  metodo: 'email' | 'sms' = 'email'
): Promise<boolean> => {
  try {
    const codigo = generarCodigo();
    
    // Guardar código en Firestore
    await firestore().collection('validaciones').add({
      destino: email,
      metodo,
      codigo,
      intentos: 0,
      expiracion: Date.now() + 600000, // 10 minutos
      verificado: false,
      fechaCreacion: Date.now()
    });
    
    // Llamar a la Cloud Function (usando la de desarrollo por ahora)
    const sendValidation = functions().httpsCallable('sendEmailVerificationDev');
    await sendValidation({ email, codigo });
    
    return true;
  } catch (error) {
    console.error('Error solicitando validación:', error);
    return false;
  }
};

// VERIFICAR CÓDIGO
export const verificarCodigo = async (
  destino: string,
  codigoIngresado: string
): Promise<{ valido: boolean; mensaje: string; datos?: any }> => {
  try {
    // Buscar validación pendiente
    const snapshot = await firestore()
      .collection('validaciones')
      .where('destino', '==', destino)
      .where('verificado', '==', false)
      .where('expiracion', '>', Date.now())
      .orderBy('fechaCreacion', 'desc')
      .limit(1)
      .get();
    
    if (snapshot.empty) {
      return { valido: false, mensaje: 'Código expirado. Solicita uno nuevo.' };
    }
    
    const doc = snapshot.docs[0];
    const data = doc.data();
    
    // Verificar intentos (máx 3)
    if (data.intentos >= 3) {
      return { valido: false, mensaje: 'Demasiados intentos. Solicita nuevo código.' };
    }
    
    // Verificar código
    if (data.codigo === codigoIngresado) {
      await doc.ref.update({ verificado: true });
      
      // Si hay datos de usuario pendientes, recuperarlos
      let datosUsuario = null;
      if (data.datosUsuario) {
        datosUsuario = data.datosUsuario;
      }
      
      return { 
        valido: true, 
        mensaje: 'Código verificado',
        datos: datosUsuario
      };
    } else {
      await doc.ref.update({ intentos: data.intentos + 1 });
      const restantes = 2 - data.intentos;
      return { 
        valido: false, 
        mensaje: `Código incorrecto. Te quedan ${restantes} intentos.` 
      };
    }
  } catch (error) {
    console.error('Error verificando:', error);
    return { valido: false, mensaje: 'Error al verificar. Intenta de nuevo.' };
  }
};

// REGISTRO COMPLETO (después de validar)
export const completarRegistro = async (
  email: string,
  password: string,
  datosUsuario: any
): Promise<{ exito: boolean; mensaje: string; uid?: string }> => {
  try {
    // Crear usuario en Firebase Auth
    const userCredential = await auth().createUserWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;
    
    // Guardar datos adicionales en Firestore
    await firestore().collection('usuarios').doc(uid).set({
      ...datosUsuario,
      email,
      uid,
      fechaRegistro: Date.now(),
      rol: 'usuario', // o 'conductor' según el caso
      activo: true
    });
    
    return { exito: true, mensaje: 'Registro exitoso', uid };
  } catch (error: any) {
    console.error('Error en registro:', error);
    
    let mensaje = 'Error en el registro';
    if (error.code === 'auth/email-already-in-use') {
      mensaje = 'Este email ya está registrado';
    } else if (error.code === 'auth/weak-password') {
      mensaje = 'La contraseña debe tener al menos 6 caracteres';
    }
    
    return { exito: false, mensaje };
  }
};

// REENVIAR CÓDIGO
export const reenviarCodigo = async (destino: string): Promise<boolean> => {
  try {
    // Invalidar códigos anteriores
    const anteriores = await firestore()
      .collection('validaciones')
      .where('destino', '==', destino)
      .where('verificado', '==', false)
      .get();
    
    const batch = firestore().batch();
    anteriores.docs.forEach(doc => {
      batch.update(doc.ref, { expiracion: Date.now() - 1 });
    });
    await batch.commit();
    
    // Solicitar nuevo código
    return await solicitarValidacion(destino);
  } catch (error) {
    console.error('Error reenviando:', error);
    return false;
  }
};