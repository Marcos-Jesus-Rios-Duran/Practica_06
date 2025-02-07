import fs from 'fs';
import crypto from 'crypto';
import Session from '../models/Session.js';

// 🔑 Cargar clave privada para desencriptar datos
const privateKey = fs.readFileSync('./keys/private.pem', 'utf8');

// 🔓 Función para descifrar datos con la clave privada
const decryptData = (encryptedData) => {
    try {
        return crypto.privateDecrypt(
            {
                key: privateKey,
                padding: crypto.constants.RSA_PKCS1_PADDING
            },
            Buffer.from(encryptedData, 'base64')
        ).toString();
    } catch (error) {
        console.error("Error al descifrar:", error);
        return null;
    }
};

// 📌 Crear una nueva sesión en la base de datos
const createSession = async (sessionData) => {
    return new Session(sessionData).save();
};

// 📌 Buscar sesión por ID
const findSessionById = async (sessionID) => {
    const session = await Session.findOne({ sessionID }).exec();
    if (!session) return null;
    
    // Desencriptar email y macAddress antes de devolver
    return {
        ...session._doc,
        email: decryptData(session.email),
        macAddress: decryptData(session.macAddress)
    };
};

// 📌 Buscar sesión por email
const findSessionByEmail = async (inputEmail) => {
    const sessions = await Session.find().exec();
    for (const session of sessions) {
        const decryptedEmail = decryptData(session.email);
        if (decryptedEmail === inputEmail) return session;
    }
    return null;
};

// 📌 Actualizar estado y último acceso de una sesión
const updateSession = async (sessionID, status) => {
    return Session.findOneAndUpdate(
        { sessionID },
        { 
            lastAccessed: new Date(),
            status 
        },
        { new: true }
    ).exec();
};

// 📌 Cerrar sesión (Logout)
const logoutSession = async (sessionID) => {
    return Session.findOneAndUpdate(
        { sessionID },
        { 
            lastAccessed: new Date(),
            status: "Finalizada por el Usuario" 
        },
        { new: true }
    ).exec();
};

// 📌 Eliminar sesión por ID
const deleteSession = async (sessionID) => {
    return Session.findOneAndDelete({ sessionID }).exec();
};

// 📌 Obtener todas las sesiones con datos desencriptados
const getAllSessions = async () => {
    const sessions = await Session.find().exec();
    return sessions.map(session => ({
        ...session._doc,
        email: decryptData(session.email),
        macAddress: decryptData(session.macAddress)
    }));
};

// 📌 Obtener solo las sesiones activas
const getActiveSessions = async () => {
    const sessions = await Session.find({ status: "Activa" }).exec();
    return sessions.map(session => ({
        ...session._doc,
        email: decryptData(session.email),
        macAddress: decryptData(session.macAddress)
    }));
};

// 📌 Eliminar todas las sesiones (⚠ PELIGROSO)
const deleteAllSessions = async () => {
    return Session.deleteMany({}).exec();
};

export { 
    createSession, 
    findSessionById, 
    findSessionByEmail, 
    updateSession, 
    logoutSession,
    deleteSession, 
    getAllSessions, 
    getActiveSessions, 
    deleteAllSessions 
};
