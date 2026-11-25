import { placeService } from '../services/place.service.js';

export class PlaceController {
  /**
   * Lấy danh sách toàn bộ các Zone
   */
  async getZones(_req, res, next) {
    try {
      const zones = await placeService.getAllZones();
      return res.json({ success: true, data: zones });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Chi tiết một phân vùng kèm danh sách địa điểm
   */
  async getZoneById(req, res, next) {
    try {
      const zone = await placeService.getZoneById(req.params.zoneId);
      if (!zone) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy phân vùng!' });
      }
      return res.status(200).json({ success: true, data: zone });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tạo phân vùng mới (Admin)
   */
  async createZone(req, res, next) {
    try {
      const { code, name } = req.body;
      if (!code || !name) {
        return res.status(400).json({
          success: false,
          message: 'Mã phân vùng (code) và tên phân vùng (name) là bắt buộc!'
        });
      }
      const zone = await placeService.createZone(req.body);
      return res.status(201).json({
        success: true,
        message: 'Tạo phân vùng thành công!',
        data: zone
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  /**
   * Cập nhật phân vùng (Admin)
   */
  async updateZone(req, res, next) {
    try {
      const updated = await placeService.updateZone(req.params.zoneId, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Phân vùng không tồn tại!' });
      }
      return res.status(200).json({
        success: true,
        message: 'Cập nhật phân vùng thành công!',
        data: updated
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  /**
   * Xóa phân vùng (Admin)
   */
  async deleteZone(req, res, next) {
    try {
      const deleted = await placeService.deleteZone(req.params.zoneId);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Phân vùng không tồn tại để xóa!' });
      }
      return res.status(200).json({
        success: true,
        message: 'Xóa phân vùng thành công!'
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  /**
   * Tìm kiếm & Lọc địa điểm theo Query Params (?city=Da+Nang&zoneId=1&tags=food,beach)
   */
  async searchPlaces(req, res, next) {
    try {
      const city = req.query.city !== undefined ? req.query.city : 'Da Nang';
      const zoneId = req.query.zoneId || undefined;
      const tags = req.query.tags
        ? (Array.isArray(req.query.tags) ? req.query.tags : req.query.tags.split(',')).map(t => t.trim())
        : [];
      const places = await placeService.findCandidates(city, tags, zoneId);
      return res.json({ success: true, data: places });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Xem chi tiết 1 địa điểm
   */
  async getPlaceById(req, res, next) {
    try {
      const place = await placeService.getPlaceById(req.params.placeId);
      if (!place) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy địa điểm!' });
      }
      return res.json({ success: true, data: place });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Tạo địa điểm mới (Admin)
   */
  async createPlace(req, res, next) {
    try {
      const { name, zoneId } = req.body;
      if (!name || !zoneId) {
        return res.status(400).json({
          success: false,
          message: 'Tên địa điểm (name) và phân vùng (zoneId) là bắt buộc!'
        });
      }
      const place = await placeService.createPlace(req.body);
      return res.status(201).json({
        success: true,
        message: 'Tạo địa điểm thành công!',
        data: place
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  /**
   * Cập nhật thông tin địa điểm (Admin)
   */
  async updatePlace(req, res, next) {
    try {
      const updated = await placeService.updatePlace(req.params.placeId, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, message: 'Địa điểm không tồn tại!' });
      }
      return res.status(200).json({
        success: true,
        message: 'Cập nhật địa điểm thành công!',
        data: updated
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
      }
      next(error);
    }
  }

  /**
   * Xóa địa điểm (Admin)
   */
  async deletePlace(req, res, next) {
    try {
      const deleted = await placeService.deletePlace(req.params.placeId);
      if (!deleted) {
        return res.status(404).json({ success: false, message: 'Địa điểm không tồn tại để xóa!' });
      }
      return res.status(200).json({
        success: true,
        message: 'Xóa địa điểm thành công!'
      });
    } catch (error) {
      if (error.statusCode) {
        return res.status(error.statusCode).json({ success: false, message: error.message });
      }
      next(error);
    }
  }
}

export const placeController = new PlaceController();
