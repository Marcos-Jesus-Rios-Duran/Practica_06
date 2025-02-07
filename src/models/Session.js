import mongoose from 'mongoose';
import crypto from 'crypto';
import moment from 'moment-timezone';
import fs from 'fs';

// 🔑 Cargar claves RSA desde archivos
const publicKey = fs.readFileSync('./src/keys/public.pem', 'utf8');
const privateKey = fs.readFileSync('../keys/private.pem', 'utf8');

const sessionSchema = new mongoose.Schema({
    sessionID: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    nickname: { type: String, required: true },
    macAddress: { type: String, required: true },
    ip: { type: String },
    serverIp: { type: String },
    createdAt: { 
        type: Date, 
        default: () => moment().tz("America/Mexico_City").toDate() 
    },
    lastAccessed: { 
        type: Date, 
        default: () => moment().tz("America/Mexico_City").toDate() 
    },
    status: { 
        type: String, 
        enum: ["Activa", "Inactiva", "Finalizada por el Usuario", "Finalizada por Falla de Sistema"], 
        default: "Activa" 
    }
});

// 🔐 Middleware para cifrar datos sensibles antes de guardar
sessionSchema.pre('save', function (next) {
    if (this.isModified('email')) {
        this.email = crypto.publicEncrypt(publicKey, Buffer.from(this.email)).toString('base64');
    }
    if (this.isModified('macAddress')) {
        this.macAddress = crypto.publicEncrypt(publicKey, Buffer.from(this.macAddress)).toString('base64');
    }
    next();
});

export default mongoose.model('Session', sessionSchema);
