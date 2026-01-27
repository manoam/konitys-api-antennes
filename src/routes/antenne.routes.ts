import { Router } from 'express';
import { AntenneController } from '../controllers/antenne.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Appliquer l'authentification sur toutes les routes
router.use(authMiddleware);

// Routes CRUD principales
router.get('/', AntenneController.getAll);
router.get('/stats', AntenneController.getStats);
router.get('/ville/:ville', AntenneController.getByVille);
router.get('/:id', AntenneController.getById);
router.post('/', AntenneController.create);
router.put('/:id', AntenneController.update);
router.delete('/:id', AntenneController.delete);

export default router;
