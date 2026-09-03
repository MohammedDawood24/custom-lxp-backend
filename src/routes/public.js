import { Router } from 'express';
import * as settingsCtrl from '../controllers/settingsController.js';

const router = Router();

router.get('/settings', settingsCtrl.getPublic);

export default router;
