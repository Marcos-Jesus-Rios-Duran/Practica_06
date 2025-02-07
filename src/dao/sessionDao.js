import bcrypt from 'bcrypt';
import Session from '../models/Session.js';

// 🔐 Función para encriptar datos sensibles
const encryptData = async (data) => {
    const saltRounds = 10;
    return await bcrypt.hash(data, saltRounds);
};

// 🔍 Función para comparar datos encriptados
const compareData = async (inputData, hashedData) => {
    return await bcrypt.compare(inputData, hashedData);
};

// Crear una sesión con datos encriptados
const createSession = async (sessionData) => {
    sessionData.email = await encryptData(sessionData.email);
    sessionData.macAddress = await encryptData(sessionData.macAddress);
    return new Session(sessionData).save();
};

// Buscar sesión por ID (sin cambios porque `sessionID` no se encripta)
const findSessionById = (sessionID) => {
    return Session.findOne({ sessionID }).exec();
};

// Buscar sesión por email (comparando encriptado)
const findSessionByEmail = async (inputEmail) => {
    const sessions = await Session.find().exec(); // Obtiene todas las sesiones
    for (const session of sessions) {
        const match = await compareData(inputEmail, session.email);
        if (match) return session; // Si encuentra coincidencia, retorna la sesión
    }
    return null; // Si no encuentra coincidencia, retorna null
};

// Actualizar sesión (status y lastAccessed) - No toca datos encriptados
const updateSession = (sessionID, status) => {
    return Session.findOneAndUpdate(
        { sessionID },
        { 
            lastAccessed: new Date(),
            status 
        },
        { new: true }
    ).exec();
};

// Cerrar sesión (Logout) => Cambia el estado a "Finalizada por el Usuario"
const logoutSession = (sessionID) => {
    return Session.findOneAndUpdate(
        { sessionID },
        { 
            lastAccessed: new Date(),
            status: "Finalizada por el Usuario" 
        },
        { new: true }
    ).exec();
};

// Eliminar sesión por ID
const deleteSession = (sessionID) => {
    return Session.findOneAndDelete({ sessionID }).exec();
};

// Obtener todas las sesiones
const getAllSessions = () => {
    return Session.find().exec();
};

// Obtener solo las sesiones activas
const getActiveSessions = () => {
    return Session.find({ status: "Activa" }).exec();
};

// Eliminar todas las sesiones (PELIGROSO ⚠)
const deleteAllSessions = () => {
    return Session.deleteMany({}).exec();
};

export { 
    createSession, 
    findSessionById, 
    findSessionByEmail, // 🔍 Buscar por email
    updateSession, 
    logoutSession,
    deleteSession, 
    getAllSessions, 
    getActiveSessions, 
    deleteAllSessions 
};
