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
        modulusLength: 2048,
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
    });

    fs.writeFileSync("public.pem", publicKey);
    fs.writeFileSync("private.pem", privateKey);
}

// Cargar claves guardadas
const publicKey = fs.readFileSync("public.pem", "utf8");
const privateKey = fs.readFileSync("private.pem", "utf8");

// Función para generar una clave AES
const generateAESKey = () => {
    return crypto.randomBytes(32); // 32 bytes = 256 bits
};

// Función para cifrar datos con AES
const encryptDataAES = (data, key) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(data, "utf8", "base64");
    encrypted += cipher.final("base64");
    return { iv: iv.toString("base64"), data: encrypted };
};

// Función para descifrar datos con AES
const decryptDataAES = (encryptedData, key) => {
    const iv = Buffer.from(encryptedData.iv, "base64");
    const encryptedText = Buffer.from(encryptedData.data, "base64");
    const decipher = crypto.createDecipheriv("aes-256-cbc", key, iv);
    let decrypted = decipher.update(encryptedText, "base64", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
};

// Función para cifrar datos
const encryptData = (data) => {
    const aesKey = generateAESKey();
    const encryptedData = encryptDataAES(data, aesKey);

    // Cifrar la clave AES con RSA
    const encryptedAESKey = crypto.publicEncrypt(publicKey, aesKey).toString("base64");

    return JSON.stringify({
        key: encryptedAESKey,
        data: encryptedData
    });
};

// Función para descifrar datos
const decryptData = (encryptedData) => {
    const encryptedObject = JSON.parse(encryptedData);

    // Descifrar la clave AES con RSA
    const aesKey = crypto.privateDecrypt(privateKey, Buffer.from(encryptedObject.key, "base64"));

    return decryptDataAES(encryptedObject.data, aesKey);
};


// Función para obtener la IP local
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

export const sessionStatus = async (req, res) => {
    const { sessionID } = req.query;

    if (!sessionID) {
        return res.status(400).json({ message: 'Se requiere sessionID' });
    }

    try {
        // 📌 Obtener todas las sesiones de la base de datos
        const sessions = await getAllSessions();
        console.log("Todas las sesiones obtenidas:", sessions); 

        // 📌 Desencriptar `sessionID` y `macAddress` para todas las sesiones
        const decryptedSessions = sessions.map(session => {
            const decryptedSessionID = decryptData(session.sessionID);
            const decryptedMacAddress = decryptData(session.macAddress);
            console.log("Desencriptado sessionID:", decryptedSessionID);
            console.log("Desencriptado macAddress:", decryptedMacAddress);
            return {
                ...session._doc,
                sessionID: decryptedSessionID,
                macAddress: decryptedMacAddress
            };
        });
        
        // 📌 Buscar la sesión que coincida con `sessionID` de la URL
        const foundSession = decryptedSessions.find(session => session.sessionID === sessionID.trim());
        console.log("Sesión encontrada:", foundSession);  // Verifica si la sesión fue encontrada correctamente
        

        if (!foundSession) {
            console.log("No se encontró la sesión con sessionID:", sessionID);  // Para debug
            return res.status(404).json({ message: 'Sesión no encontrada' });
        }

        // ⏳ Calcular tiempos
        const now = new Date();
        const idleTime = (now - new Date(foundSession.lastAccessed)) / 1000;
        const duration = (now - new Date(foundSession.createdAt)) / 1000;

        // 📌 Enviar la sesión encontrada
        return res.status(200).json({
            message: 'Sesión activa',
            session: foundSession,
            idleTime: `${idleTime} segundos`,
            duration: `${duration} segundos`
        });

    } catch (error) {
        res.status(500).json({ message: 'Error al obtener la sesión', error: error.message });
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


export const getAllSessions = async (req, res) => {
    try {
        const sessions = await daoGetAllSessions();
        // Decrypt sessionID and macAddress for all sessions
        sessions.forEach(session => {
            try {
                session.sessionID = decryptData(session.sessionID);
                session.macAddress = decryptData(session.macAddress);
            } catch (error) {
                console.error("Error al desencriptar sesión:", error.message);
            }
        });
        console.log(sessions);
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
