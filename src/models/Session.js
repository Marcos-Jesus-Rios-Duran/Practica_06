import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
    sessionID: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    nickname: { type: String, required: true },
    macAddress: { type: String, required: true },
    ip: { type: String },
    createdAt: { type: Date, default: Date.now },
    lastAccessed: { type: Date, default: Date.now },
    serverIp: { type: String }
});

export default mongoose.model('Session', sessionSchema);
