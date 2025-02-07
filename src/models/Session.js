import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import moment from 'moment-timezone';

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

// 🔐 Middleware para encriptar datos sensibles antes de guardar
sessionSchema.pre('save', async function(next) {
    if (this.isModified('email')) {
        this.email = await bcrypt.hash(this.email, 10);
    }
    if (this.isModified('macAddress')) {
        this.macAddress = await bcrypt.hash(this.macAddress, 10);
    }
    next();
});

export default mongoose.model('Sesiones', sessionSchema);
