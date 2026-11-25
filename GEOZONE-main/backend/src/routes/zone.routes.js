import { Router } from 'express';
import { placeController } from '../controllers/place.controller.js';
import { verifyToken, verifyActiveUser, verifyAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/v1/zones - Lấy danh sách toàn bộ phân vùng (Zones)
router.get('/', placeController.getZones);

// GET /api/v1/zones/:zoneId - Chi tiết một phân vùng kèm danh sách địa điểm
router.get('/:zoneId', placeController.getZoneById);

// Admin Zone Catalog Management (CRUD)
router.post('/', verifyToken, verifyActiveUser, verifyAdmin, placeController.createZone);
router.patch('/:zoneId', verifyToken, verifyActiveUser, verifyAdmin, placeController.updateZone);
router.delete('/:zoneId', verifyToken, verifyActiveUser, verifyAdmin, placeController.deleteZone);

export default router;
