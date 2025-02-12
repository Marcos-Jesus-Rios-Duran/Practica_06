import { Router } from 'express';
import { 
    welcome, 
    login, 
    logout, 
    updateSessionController, 
    sessionStatus, 
    getAllCurrentSessions, 
    getAllSessions, 
    deleteAllSessions 
} from '../controllers/sessionController.js';

const router = Router();

router.get('/welcome', welcome);
router.post('/login', login);
router.post('/logout', logout);
router.post('/update', updateSessionController);
router.get('/status', sessionStatus);
router.get('/allSessions', getAllSessions);
router.get('/allCurrentSessions', getAllCurrentSessions);
router.delete('/deleteAllSessions', deleteAllSessions); 

export default router;
