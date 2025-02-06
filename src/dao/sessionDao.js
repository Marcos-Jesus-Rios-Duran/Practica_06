import Session from '../models/Session.js';

const createSession = (sessionData) => {
    return new Session(sessionData).save();
};

const findSessionById = (sessionID) => {
    return Session.findOne({ sessionID }).exec();
};

const updateSession = (sessionID) => {
    return Session.findOneAndUpdate(
        { sessionID },
        { lastAccessed: new Date() },
        { new: true }
    ).exec();
};

const deleteSession = (sessionID) => {
    return Session.findOneAndDelete({ sessionID }).exec();
};

const getAllSessions = () => {
    return Session.find().exec();
};

export { createSession, findSessionById, updateSession, deleteSession, getAllSessions };
