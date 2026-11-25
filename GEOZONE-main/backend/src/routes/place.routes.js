import { Router } from 'express';
import { placeController } from '../controllers/place.controller.js';
import { verifyToken, verifyActiveUser, verifyAdmin } from '../middlewares/auth.middleware.js';

const router = Router();

// GET /api/v1/places - Tìm kiếm và lọc danh sách địa điểm theo query params
router.get('/', placeController.searchPlaces);

// Backward compatible aliases
router.get('/search', placeController.searchPlaces);
router.get('/zones', placeController.getZones);

// GET /api/v1/places/:placeId - Chi tiết một địa điểm
router.get('/:placeId', placeController.getPlaceById);

// Admin Place Catalog Management (CRUD)
router.post('/', verifyToken, verifyActiveUser, verifyAdmin, placeController.createPlace);
router.patch('/:placeId', verifyToken, verifyActiveUser, verifyAdmin, placeController.updatePlace);
router.delete('/:placeId', verifyToken, verifyActiveUser, verifyAdmin, placeController.deletePlace);

export default router;
