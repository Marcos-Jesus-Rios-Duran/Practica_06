import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import os from 'os';
import macaddress from 'macaddress';
import cron from 'node-cron';
import { 
    createSession, 
    deleteSession, 
    updateSession, 
    findSessionById, 
    getActiveSessions, 
    getAllSessions as daoGetAllSessions, 
    deleteAllSessions as daoDeleteAllSessions 
} from '../dao/sessionDao.js';

// Solo generar claves si no existen
if (!fs.existsSync("private.pem") || !fs.existsSync("public.pem")) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync("rsa", {
        modulusLength: 512,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    fs.writeFileSync("public.pem", publicKey);
    fs.writeFileSync("private.pem", privateKey);
}

// Cargar claves guardadas
const publicKey = fs.readFileSync("public.pem", "utf8");
const privateKey = fs.readFileSync("private.pem", "utf8");

// Función para cifrar datos
const encryptData = (data) => {
    return crypto.publicEncrypt(publicKey, Buffer.from(data)).toString("base64");
};

// Función para descifrar datos
const decryptData = (encryptedData) => {
    return crypto.privateDecrypt(privateKey, Buffer.from(encryptedData, "base64")).toString();
};

const getLocalIp = () => {
    const networkInterfaces = os.networkInterfaces();
    for (const interfaceName in networkInterfaces) {
        const interfaces = networkInterfaces[interfaceName];
        for (const iface of interfaces) {
            if (iface.family === "IPv4" && !iface.internal) {
                return iface.address;
            }
        }
    }
    return null;
};

// Función para obtener la IP del cliente
const getClientIP = (req) => {
    let ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.connection?.remoteAddress || req.socket?.remoteAddress || req.ip;

    if (ip === "::1" || ip === "0.0.0.0") {
        ip = getLocalIp();
    }
    if (ip.includes("::ffff:")) {
        ip = ip.split("::ffff:")[1];
    }

    return ip;
};

export const welcome = (req, res) => {
    res.status(200).json({
        message: 'Bienvenid@ a la API de Control de Sesiones',
        author: 'Marcos Jesús Ríos Duran'
    });
};

export const login = async (req, res) => {
    const { email, nickname } = req.body;
    if (!email || !nickname) {
        return res.status(400).json({ message: 'Se esperan campos requeridos' });
    }

    try {
        const sessionID = uuidv4();
        const now = new Date();
        const clientMac = await macaddress.one();
        
        // Encrypt sessionID and macAddress
        const encryptedSessionID = encryptData(sessionID);
        const encryptedMacAddress = encryptData(clientMac);

        const sessionData = {
            sessionID: encryptedSessionID,
            email,
            nickname,
            macAddress: encryptedMacAddress,
            ip: getClientIP(req),
            createdAt: now,
            lastAccessed: now,
            serverIp: getLocalIp(),
        };

        await createSession(sessionData);
        res.status(200).json({ message: 'Sesión iniciada', sessionID });
    } catch (error) {
        res.status(500).json({ message: 'Error al procesar la solicitud', error: error.message });
    }
};

export const logout = async (req, res) => {
    const { sessionID } = req.body;

    if (!sessionID) {
        return res.status(400).json({ message: 'Se requiere sessionID' });
    }

    try {
        // Encrypt sessionID for lookup
        const encryptedSessionID = encryptData(sessionID);
        const session = await deleteSession(encryptedSessionID);
        if (!session) {
            return res.status(404).json({ message: 'No existe una sesión activa' });
        }
        res.status(200).json({ message: 'Sesión cerrada exitosamente' });
    } catch (error) {
        res.status(500).json({ message: 'Error al cerrar sesión', error: error.message });
    }
};

export const updateSessionController = async (req, res) => {
    const { sessionID, status } = req.body;

    if (!sessionID || !status) {
        return res.status(400).json({ message: 'Se requiere sessionID y status' });
    }

    try {
        // Encrypt sessionID for lookup
        const encryptedSessionID = encryptData(sessionID);
        const session = await updateSession(encryptedSessionID, status);
        if (!session) {
            return res.status(404).json({ message: 'No existe una sesión activa' });
        }
        res.status(200).json({ message: 'Datos actualizados', session });
    } catch (error) {
        res.status(500).json({ message: 'Error al actualizar sesión', error: error.message });
    }
};

export const sessionStatus = async (req, res) => {
    const { sessionID } = req.query;

    if (!sessionID) {
        return res.status(400).json({ message: 'Se requiere sessionID' });
    }

    try {
        // Encrypt sessionID for lookup
        const encryptedSessionID = encryptData(sessionID);
        const session = await findSessionById(encryptedSessionID);
        if (!session) {
            return res.status(404).json({ message: 'No existe una sesión activa' });
        }

        // Decrypt sessionID and macAddress
        session.sessionID = decryptData(session.sessionID);
        session.macAddress = decryptData(session.macAddress);

        const now = new Date();
        const idleTime = (now - session.lastAccessed) / 1000;
        const duration = (now - session.createdAt) / 1000;

        res.status(200).json({
            message: 'Sesión activa',
            session,
            idleTime: `${idleTime} segundos`,
            duration: `${duration} segundos`
        });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener estado', error: error.message });
    }
};

export const getAllSessions = async (req, res) => {
    try {
        const sessions = await daoGetAllSessions();
        // Decrypt sessionID and macAddress for all sessions
        sessions.forEach(session => {
            session.sessionID = decryptData(session.sessionID);
            session.macAddress = decryptData(session.macAddress);
        });
        res.status(200).json({ message: 'Todas las sesiones', sessions });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener todas las sesiones', error: error.message });
    }
};

export const getAllCurrentSessions = async (req, res) => {
    try {
        const sessions = await getActiveSessions();
        // Decrypt sessionID and macAddress for all sessions
        sessions.forEach(session => {
            session.sessionID = decryptData(session.sessionID);
            session.macAddress = decryptData(session.macAddress);
        });
        res.status(200).json({ message: 'Sesiones activas', sessions });
    } catch (error) {
        res.status(500).json({ message: 'Error al obtener sesiones activas', error: error.message });
    }
};

export const deleteAllSessions = async (req, res) => {
    try {
        await daoDeleteAllSessions();
        res.status(200).json({ message: 'Todas las sesiones han sido eliminadas' });
    } catch (error) {
        res.status(500).json({ message: 'Error al eliminar todas las sesiones', error: error.message });
    }
};

cron.schedule('* * * * *', async () => {
    try {
        const sessions = await getActiveSessions();
        const now = new Date();

        sessions.forEach(async (session) => {
            const idleTimeInSeconds = (now - session.lastAccessed) / 1000;

            // Si la sesión ha estado inactiva por más de 5 minutos, cambiar su estado
            if (idleTimeInSeconds > 300 && session.status === "Activa") {
                await updateSession(session.sessionID, "Inactiva");
                console.log(`Sesión ${session.sessionID} marcada como inactiva por inactividad.`);
            }
        });
    } catch (error) {
        console.error('Error al verificar sesiones inactivas:', error);
    }
});
