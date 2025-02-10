import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import macaddress from 'macaddress';
import cron from 'node-cron';
import { createSession, findSessionById, updateSession, deleteSession, getAllSessions as daoGetAllSessions, getActiveSessions, deleteAllSessions as daoDeleteAllSessions } from '../dao/sessionDao.js';

// Obtener la IP del servidor
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

// Obtener la dirección MAC
const getClientIP = async () => {
    try {
        return await macaddress.one();  // Ahora es asíncrono
    } catch (error) {
        console.error("Error obteniendo la dirección MAC:", error);
        return "MAC_NO_DISPONIBLE";
    }
};

// Ruta raíz
export const welcome = (req, res) => {
    res.status(200).json({
        message: 'Bienvenid@ a la API de Control de Sesiones',
        author: 'Marcos Jesús Ríos Duran'
    });
};

// Login (crear sesión)
export const login = async (req, res) => {
    const { email, nickname, macAddress } = req.body;
    if (!email || !nickname || !macAddress) {
        return res.status(400).json({ message: 'Se esperan campos requeridos' });
    }

    const sessionID = uuidv4();
    const now = new Date();

    // Obtener la dirección MAC 
    const clientMac = await getClientIP();

    const sessionData = {
        sessionID,
        email,
        nickname,
        macAddress,
        ip: clientMac,
        createdAt: now,
        lastAccessed: now,
        serverIp: getLocalIp(),
    };

    createSession(sessionData)
        .then(() => res.status(200).json({ message: 'Sesión iniciada', sessionID }))
        .catch(err => res.status(500).json({ message: 'Error al iniciar sesión', error: err.message }));
};

// Logout (eliminar sesión)
export const logout = (req, res) => {
    const { sessionID } = req.body;

    if (!sessionID) {
        return res.status(400).json({ message: 'Se requiere sessionID' });
    }

    deleteSession(sessionID)
        .then(session => {
            if (!session) {
                return res.status(404).json({ message: 'No existe una sesión activa' });
            }
            res.status(200).json({ message: 'Logout exitoso' });
        })
        .catch(err => res.status(500).json({ message: 'Error al cerrar sesión', error: err.message }));
};

// Actualizar última actividad de la sesión
export const updateSessionController = (req, res) => {
    const { sessionID, status } = req.body;

    if (!sessionID || !status) {
        return res.status(400).json({ message: 'Se requiere sessionID y status' });
    }

    updateSession(sessionID, status)
        .then(session => {
            if (!session) {
                return res.status(404).json({ message: 'No existe una sesión activa' });
            }
            res.status(200).json({ message: 'Datos actualizados', session });
        })
        .catch(err => res.status(500).json({ message: 'Error al actualizar sesión', error: err.message }));
};

// Estado de una sesión
export const sessionStatus = (req, res) => {
    const sessionID = req.query.sessionID;

    if (!sessionID) {
        return res.status(400).json({ message: 'Se requiere sessionID' });
    }

    findSessionById(sessionID)
        .then(session => {
            if (!session) {
                return res.status(404).json({ message: 'No existe una sesión activa' });
            }

            const now = new Date();
            const idleTime = (now - session.lastAccessed) / 1000;
            const duration = (now - session.createdAt) / 1000;

            res.status(200).json({
                message: 'Sesión activa',
                session,
                idleTime: `${idleTime} segundos`,
                duration: `${duration} segundos`
            });
        })
        .catch(err => res.status(500).json({ message: 'Error al obtener estado', error: err.message }));
};

// Obtener todas las sesiones (sin importar el estado)
export const getAllSessions = (req, res) => {
    daoGetAllSessions()
        .then(sessions => res.status(200).json({ message: 'Todas las sesiones', sessions }))
        .catch(err => res.status(500).json({ message: 'Error al obtener todas las sesiones', error: err.message }));
};

// Obtener solo las sesiones activas
export const getAllCurrentSessions = (req, res) => {
    getActiveSessions()
        .then(sessions => {
            console.log("Sesiones activas encontradas:", sessions);
            res.status(200).json({ message: 'Sesiones activas', sessions });
        })
        .catch(err => {
            console.error("Error al obtener sesiones activas:", err);
            res.status(500).json({ message: 'Error al obtener sesiones activas', error: err.message });
        });
};

// Eliminar todas las sesiones (⚠ PELIGROSO)
export const deleteAllSessions = (req, res) => {
    daoDeleteAllSessions()
        .then(() => res.status(200).json({ message: 'Todas las sesiones han sido eliminadas' }))
        .catch(err => res.status(500).json({ message: 'Error al eliminar todas las sesiones', error: err.message }));
};

// Tarea programada para revisar sesiones activas cada minuto
cron.schedule('* * * * *', async () => {
    try {
        const sessions = await getActiveSessions();
        const now = new Date();

        sessions.forEach(async (session) => {
            const idleTimeInSeconds = (now - session.lastAccessed) / 1000;

            // Si la sesión ha estado inactiva por más de 30 segundos, cambiar su estado
            if (idleTimeInSeconds > 30 && session.status === "Activa") {
                await updateSession(session.sessionID, "Inactiva");
                console.log(`Sesión ${session.sessionID} marcada como inactiva por inactividad.`);
            }
        });
    } catch (error) {
        console.error('Error al verificar sesiones inactivas:', error);
    }
});
