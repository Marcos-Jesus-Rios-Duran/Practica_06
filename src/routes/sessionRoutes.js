import { Router } from 'express';
import { welcome, login, logout, updateSessionController, sessionStatus, activeSessions } from '../controllers/sessionController.js';

const router = Router();

router.get('/', welcome);
router.post('/login', login);
router.post('/logout', logout);
router.post('/update', updateSessionController);
router.get('/status', sessionStatus);
router.get('/sessionactiva', activeSessions);

export default router;
