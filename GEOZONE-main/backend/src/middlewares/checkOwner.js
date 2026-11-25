import prisma from '../utils/prisma.js';

export const checkOwner = async (req, res, next) => {
  try {
    const { userId, planId } = req.params;

    // Kiểm tra quyền sở hữu đối với tài nguyên Người dùng (User profile)
    if (userId) {
      if (req.user?.role !== 'ADMIN' && req.user?.sub !== userId) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập tài nguyên này!' });
      }
    }

    // Kiểm tra quyền sở hữu đối với Lịch trình đã lưu (Saved Plan)
    if (planId) {
      const plan = await prisma.savedPlan.findUnique({
        where: { id: planId },
      });

      if (!plan) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy lịch trình này' });
      }

      if (req.user?.role !== 'ADMIN' && plan.user_id !== req.user?.sub) {
        return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập lịch trình này' });
      }

      req.plan = plan;
    }

    next();
  } catch (error) {
    next(error);
  }
};

