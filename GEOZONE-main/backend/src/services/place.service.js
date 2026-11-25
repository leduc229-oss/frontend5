import { prisma } from '../config/database.js';

function formatTime(val) {
  if (!val) return null;
  if (val instanceof Date) {
    return val.toISOString().substring(11, 16);
  }
  return String(val);
}

function parseTimeToDate(timeStr) {
  if (!timeStr) return null;
  if (timeStr instanceof Date) return timeStr;
  const parts = String(timeStr).trim().split(':');
  if (parts.length < 2) return null;
  const hh = parts[0].padStart(2, '0');
  const mm = parts[1].padStart(2, '0');
  const ss = (parts[2] || '00').substring(0, 2).padStart(2, '0');
  return new Date(`1970-01-01T${hh}:${mm}:${ss}.000Z`);
}

function mapPlace(p) {
  return {
    id: p.id,
    name: p.name,
    city: p.city,
    zoneId: p.zoneId,
    zoneCode: p.zone?.code || `Z${p.zoneId}`,
    zoneName: p.zone?.name || `Zone ${p.zoneId}`,
    address: p.address,
    estimatedCost: Number(p.estimatedCost) || 0,
    duration: p.duration,
    openingTime: formatTime(p.openingTime),
    closingTime: formatTime(p.closingTime),
    latitude: p.latitude ? Number(p.latitude) : null,
    longitude: p.longitude ? Number(p.longitude) : null,
    popularity: p.popularity ? Number(p.popularity) : 0.5,
    imageUrl: p.imageUrl,
    rating: p.rating ? Number(p.rating) : 4.5,
    shortDesc: p.shortDesc,
    tags: p.placeTags ? p.placeTags.map(pt => pt.tag.name) : []
  };
}

export class PlaceService {
  /**
   * Lấy danh sách toàn bộ các Zone
   */
  async getAllZones() {
    return await prisma.zone.findMany({
      orderBy: { code: 'asc' },
      include: {
        _count: {
          select: { places: true }
        }
      }
    });
  }

  /**
   * Lấy danh sách địa điểm theo điều kiện lọc
   * @param {string} [city]
   * @param {string[]} [tags]
   * @param {number|string} [zoneId]
   */
  async findCandidates(city, tags = [], zoneId = null) {
    const numZoneId = zoneId ? parseInt(zoneId, 10) : null;
    const places = await prisma.place.findMany({
      where: {
        ...(city && { city: { equals: city, mode: 'insensitive' } }),
        ...(numZoneId && !isNaN(numZoneId) && { zoneId: numZoneId }),
        ...(tags && tags.length > 0 && {
          placeTags: {
            some: {
              tag: {
                name: { in: tags, mode: 'insensitive' }
              }
            }
          }
        })
      },
      include: {
        zone: true,
        placeTags: {
          include: { tag: true }
        }
      },
      orderBy: { id: 'asc' }
    });

    return places.map(mapPlace);
  }

  /**
   * Lấy chi tiết 1 địa điểm theo ID
   */
  async getPlaceById(id) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return null;

    const place = await prisma.place.findUnique({
      where: { id: numId },
      include: {
        zone: true,
        placeTags: {
          include: { tag: true }
        }
      }
    });

    return place ? mapPlace(place) : null;
  }

  /**
   * Tạo địa điểm mới (Admin)
   */
  async createPlace(data) {
    const zoneId = parseInt(data.zoneId, 10);
    if (isNaN(zoneId)) {
      const err = new Error('zoneId phải là số nguyên!');
      err.statusCode = 400;
      throw err;
    }

    const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
    if (!zone) {
      const err = new Error(`Phân vùng với ID ${zoneId} không tồn tại!`);
      err.statusCode = 404;
      throw err;
    }

    const placeTagsCreate = [];
    if (Array.isArray(data.tagIds)) {
      for (const tId of data.tagIds) {
        const numTId = parseInt(tId, 10);
        if (!isNaN(numTId) && !placeTagsCreate.some(pt => pt.tagId === numTId)) {
          placeTagsCreate.push({ tagId: numTId });
        }
      }
    }

    if (Array.isArray(data.tags)) {
      for (const tName of data.tags) {
        const cleanName = String(tName).trim().toLowerCase();
        if (!cleanName) continue;
        const tagRec = await prisma.tag.upsert({
          where: { name: cleanName },
          update: {},
          create: { name: cleanName, category: 'GENERAL' }
        });
        if (!placeTagsCreate.some(pt => pt.tagId === tagRec.id)) {
          placeTagsCreate.push({ tagId: tagRec.id });
        }
      }
    }

    const created = await prisma.place.create({
      data: {
        name: String(data.name).trim(),
        city: data.city ? String(data.city).trim() : 'Da Nang',
        zoneId: zoneId,
        address: data.address ? String(data.address).trim() : null,
        estimatedCost: data.estimatedCost !== undefined ? Number(data.estimatedCost) : 0,
        duration: data.duration !== undefined ? Number(data.duration) : 60,
        openingTime: parseTimeToDate(data.openingTime),
        closingTime: parseTimeToDate(data.closingTime),
        latitude: data.latitude !== undefined && data.latitude !== null ? Number(data.latitude) : null,
        longitude: data.longitude !== undefined && data.longitude !== null ? Number(data.longitude) : null,
        popularity: data.popularity !== undefined && data.popularity !== null ? Number(data.popularity) : 0.5,
        imageUrl: data.imageUrl ? String(data.imageUrl).trim() : null,
        rating: data.rating !== undefined && data.rating !== null ? Number(data.rating) : 4.5,
        shortDesc: data.shortDesc ? String(data.shortDesc).trim() : null,
        ...(placeTagsCreate.length > 0 && {
          placeTags: {
            create: placeTagsCreate
          }
        })
      },
      include: {
        zone: true,
        placeTags: { include: { tag: true } }
      }
    });

    return mapPlace(created);
  }

  /**
   * Cập nhật địa điểm (Admin)
   */
  async updatePlace(id, data) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return null;

    const existing = await prisma.place.findUnique({ where: { id: numId } });
    if (!existing) return null;

    const updateData = {};
    if (data.name !== undefined) updateData.name = String(data.name).trim();
    if (data.city !== undefined) updateData.city = String(data.city).trim();
    if (data.zoneId !== undefined) {
      const zoneId = parseInt(data.zoneId, 10);
      if (isNaN(zoneId)) {
        const err = new Error('zoneId phải là số nguyên!');
        err.statusCode = 400;
        throw err;
      }
      const zone = await prisma.zone.findUnique({ where: { id: zoneId } });
      if (!zone) {
        const err = new Error(`Phân vùng với ID ${zoneId} không tồn tại!`);
        err.statusCode = 404;
        throw err;
      }
      updateData.zoneId = zoneId;
    }
    if (data.address !== undefined) updateData.address = data.address ? String(data.address).trim() : null;
    if (data.estimatedCost !== undefined) updateData.estimatedCost = Number(data.estimatedCost);
    if (data.duration !== undefined) updateData.duration = Number(data.duration);
    if (data.openingTime !== undefined) updateData.openingTime = parseTimeToDate(data.openingTime);
    if (data.closingTime !== undefined) updateData.closingTime = parseTimeToDate(data.closingTime);
    if (data.latitude !== undefined) updateData.latitude = data.latitude !== null ? Number(data.latitude) : null;
    if (data.longitude !== undefined) updateData.longitude = data.longitude !== null ? Number(data.longitude) : null;
    if (data.popularity !== undefined) updateData.popularity = data.popularity !== null ? Number(data.popularity) : 0.5;
    if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl ? String(data.imageUrl).trim() : null;
    if (data.rating !== undefined) updateData.rating = data.rating !== null ? Number(data.rating) : 4.5;
    if (data.shortDesc !== undefined) updateData.shortDesc = data.shortDesc ? String(data.shortDesc).trim() : null;

    if (data.tagIds !== undefined || data.tags !== undefined) {
      const newTagIds = [];
      if (Array.isArray(data.tagIds)) {
        for (const tId of data.tagIds) {
          const numTId = parseInt(tId, 10);
          if (!isNaN(numTId) && !newTagIds.includes(numTId)) newTagIds.push(numTId);
        }
      }
      if (Array.isArray(data.tags)) {
        for (const tName of data.tags) {
          const cleanName = String(tName).trim().toLowerCase();
          if (!cleanName) continue;
          const tagRec = await prisma.tag.upsert({
            where: { name: cleanName },
            update: {},
            create: { name: cleanName, category: 'GENERAL' }
          });
          if (!newTagIds.includes(tagRec.id)) newTagIds.push(tagRec.id);
        }
      }

      await prisma.placeTag.deleteMany({ where: { placeId: numId } });
      if (newTagIds.length > 0) {
        await prisma.placeTag.createMany({
          data: newTagIds.map(tId => ({ placeId: numId, tagId: tId })),
          skipDuplicates: true
        });
      }
    }

    const updated = await prisma.place.update({
      where: { id: numId },
      data: updateData,
      include: {
        zone: true,
        placeTags: { include: { tag: true } }
      }
    });

    return mapPlace(updated);
  }

  /**
   * Xóa một địa điểm (Admin)
   */
  async deletePlace(id) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return null;

    const existing = await prisma.place.findUnique({ where: { id: numId } });
    if (!existing) return null;

    await prisma.place.delete({ where: { id: numId } });
    return true;
  }

  /**
   * Chi tiết một phân vùng kèm địa điểm thuộc vùng đó
   */
  async getZoneById(id) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return null;

    const zone = await prisma.zone.findUnique({
      where: { id: numId },
      include: {
        places: {
          include: {
            placeTags: { include: { tag: true } }
          }
        },
        _count: {
          select: { places: true }
        }
      }
    });

    if (!zone) return null;

    return {
      id: zone.id,
      code: zone.code,
      name: zone.name,
      description: zone.description,
      centerLat: zone.centerLat ? Number(zone.centerLat) : null,
      centerLng: zone.centerLng ? Number(zone.centerLng) : null,
      placeCount: zone._count.places,
      places: zone.places.map(mapPlace)
    };
  }

  /**
   * Tạo phân vùng mới (Admin)
   */
  async createZone(data) {
    if (!data.code || !data.name) {
      const err = new Error('Mã phân vùng (code) và tên phân vùng (name) không được để trống!');
      err.statusCode = 400;
      throw err;
    }

    const cleanCode = String(data.code).trim().toUpperCase();
    const existing = await prisma.zone.findUnique({ where: { code: cleanCode } });
    if (existing) {
      const err = new Error(`Mã phân vùng "${cleanCode}" đã tồn tại!`);
      err.statusCode = 409;
      throw err;
    }

    const created = await prisma.zone.create({
      data: {
        code: cleanCode,
        name: String(data.name).trim(),
        description: data.description ? String(data.description).trim() : null,
        centerLat: data.centerLat !== undefined && data.centerLat !== null ? Number(data.centerLat) : null,
        centerLng: data.centerLng !== undefined && data.centerLng !== null ? Number(data.centerLng) : null
      }
    });

    return {
      ...created,
      centerLat: created.centerLat ? Number(created.centerLat) : null,
      centerLng: created.centerLng ? Number(created.centerLng) : null
    };
  }

  /**
   * Cập nhật phân vùng (Admin)
   */
  async updateZone(id, data) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return null;

    const existing = await prisma.zone.findUnique({ where: { id: numId } });
    if (!existing) return null;

    const updateData = {};
    if (data.code !== undefined) {
      const cleanCode = String(data.code).trim().toUpperCase();
      if (cleanCode !== existing.code) {
        const duplicate = await prisma.zone.findUnique({ where: { code: cleanCode } });
        if (duplicate) {
          const err = new Error(`Mã phân vùng "${cleanCode}" đã tồn tại!`);
          err.statusCode = 409;
          throw err;
        }
      }
      updateData.code = cleanCode;
    }
    if (data.name !== undefined) updateData.name = String(data.name).trim();
    if (data.description !== undefined) updateData.description = data.description ? String(data.description).trim() : null;
    if (data.centerLat !== undefined) updateData.centerLat = data.centerLat !== null ? Number(data.centerLat) : null;
    if (data.centerLng !== undefined) updateData.centerLng = data.centerLng !== null ? Number(data.centerLng) : null;

    const updated = await prisma.zone.update({
      where: { id: numId },
      data: updateData
    });

    return {
      ...updated,
      centerLat: updated.centerLat ? Number(updated.centerLat) : null,
      centerLng: updated.centerLng ? Number(updated.centerLng) : null
    };
  }

  /**
   * Xóa phân vùng (Admin)
   */
  async deleteZone(id) {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return null;

    const existing = await prisma.zone.findUnique({
      where: { id: numId },
      include: {
        _count: { select: { places: true } }
      }
    });

    if (!existing) return null;

    if (existing._count.places > 0) {
      const err = new Error(`Không thể xóa phân vùng đang chứa ${existing._count.places} địa điểm. Vui lòng chuyển hoặc xóa các địa điểm này trước!`);
      err.statusCode = 400;
      throw err;
    }

    // Xóa liên kết khoảng cách nếu có
    await prisma.zoneDistance.deleteMany({
      where: {
        OR: [
          { fromZoneId: numId },
          { toZoneId: numId }
        ]
      }
    });

    await prisma.zone.delete({ where: { id: numId } });
    return true;
  }

  /**
   * Lấy các địa điểm thay thế trong cùng zone để phục vụ Dynamic Swap
   * @param {number} zoneId
   * @param {number[]} excludedPlaceIds
   * @param {number} maxCost
   * @param {string[]} preferences
   */
  async findSwapCandidates(zoneId, excludedPlaceIds, maxCost, preferences) {
    const candidates = await prisma.place.findMany({
      where: {
        zoneId,
        id: { notIn: excludedPlaceIds },
        estimatedCost: { lte: maxCost }
      },
      include: {
        zone: true,
        placeTags: {
          include: { tag: true }
        }
      }
    });

    return candidates.map(mapPlace);
  }
}

export const placeService = new PlaceService();
