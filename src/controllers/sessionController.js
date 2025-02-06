import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import macaddress from 'macaddress';
import { createSession, findSessionById, updateSession, deleteSession, getAllSessions } from '../dao/sessionDao.js';

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
const getClientIP = () => {
    return macaddress.oneSync();
};

// Ruta raíz
export const welcome = (req, res) => {
    res.status(200).json({
        message: 'Bienvendi@ a la API de Control de Sesiones',
        author: 'Marcos Jesús Ríos Duran'
    });
};

// Login (crear sesión)
export const login = (req, res) => {
    const { email, nickname, macAddress } = req.body;
    if (!email || !nickname || !macAddress) {
        return res.status(400).json({ message: 'Se esperan campos requeridos' });
    }

    const sessionID = uuidv4();
    const now = new Date();

    const sessionData = {
        sessionID,
        email,
        nickname,
        macAddress,
        ip: getClientIP(),
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
    const { sessionID } = req.body;

    if (!sessionID) {
        return res.status(400).json({ message: 'Se requiere sessionID' });
    }

    updateSession(sessionID)
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

// Obtener todas las sesiones activas
export const activeSessions = (req, res) => {
    getAllSessions()
        .then(sessions => res.status(200).json({ message: 'Sesiones activas', sessions }))
        .catch(err => res.status(500).json({ message: 'Error al obtener sesiones', error: err.message }));
};
