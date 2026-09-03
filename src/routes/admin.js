import { Router } from 'express';
import { body } from 'express-validator';
import multer from 'multer';
import { authenticate, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import * as userCtrl from '../controllers/adminUserController.js';
import * as deptCtrl from '../controllers/departmentController.js';
import * as settingsCtrl from '../controllers/settingsController.js';
import * as dashCtrl from '../controllers/dashboardController.js';

const router = Router();
router.use(authenticate, authorize('admin'));

const upload = multer({ dest: 'uploads/', limits: { fileSize: 10 * 1024 * 1024 } });

// Dashboard
router.get('/dashboard', dashCtrl.getAdminDashboard);

// User management
router.get('/users', userCtrl.listUsers);
router.get('/users/:id', userCtrl.getUser);
router.post('/users', validate([
  body('first_name').trim().notEmpty(),
  body('last_name').trim().notEmpty(),
  body('email').isEmail().normalizeEmail(),
  body('password').isStrongPassword({ minLength: 8, minUppercase: 1, minNumbers: 1, minSymbols: 1 }),
]), userCtrl.createUser);
router.put('/users/:id', userCtrl.updateUser);
router.delete('/users/:id', userCtrl.deleteUser);
router.patch('/users/:id/suspend', userCtrl.suspendUser);
router.patch('/users/:id/disable', userCtrl.disableUser);
router.post('/users/bulk-upload', upload.single('file'), userCtrl.bulkUploadUsers);

// Department management
router.get('/departments', deptCtrl.list);
router.post('/departments', validate([body('name').trim().notEmpty()]), deptCtrl.create);
router.put('/departments/:id', deptCtrl.update);
router.delete('/departments/:id', deptCtrl.remove);

// Settings
router.get('/settings', settingsCtrl.getAll);
router.put('/settings', settingsCtrl.upsert);

export default router;
