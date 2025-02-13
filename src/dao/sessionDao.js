import Session from '../models/Session.js';

// 📌 Crear una nueva sesión en la base de datos
const createSession = async (sessionData) => {
    return new Session(sessionData).save();
};

// 📌 Buscar sesión por ID
const findSessionById = async (sessionID) => {
    return Session.findOne({ sessionID }).exec();
};

// 📌 Buscar sesión por email
const findSessionByEmail = async (inputEmail) => {
    return Session.findOne({ email: inputEmail }).exec();
};

const updateSession = async (sessionID, status) => {
    console.log("Actualizando sesión con ID:", sessionID, "y estado:", status);  // Para depurar
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
    return Session.findOneAndUpdate({ sessionID }).exec();
};

// 📌 Obtener todas las sesiones
const getAllSessions = async () => {
    return Session.find().exec();
};

// 📌 Obtener solo las sesiones activas
const getActiveSessions = async () => {
    return Session.find({ status: "Activa" }).exec();
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
