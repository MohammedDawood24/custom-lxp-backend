import { User, Department } from '../models/index.js';
import { ApiResponse } from '../utils/apiResponse.js';
import { Op } from 'sequelize';

export const getAdminDashboard = async (req, res, next) => {
  try {
    const [totalUsers, activeUsers, suspendedUsers, totalDepartments] = await Promise.all([
      User.count(),
      User.count({ where: { status: 'active' } }),
      User.count({ where: { status: 'suspended' } }),
      Department.count(),
    ]);

    // Users registered in last 30 days
    const recentUsers = await User.count({
      where: { created_at: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
    });

    return ApiResponse.success(res, {
      users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers, recent_30d: recentUsers },
      departments: { total: totalDepartments },
      // Placeholders for Phase 2
      courses: { total: 0, published: 0, draft: 0 },
      enrollments: { total: 0, completed: 0, in_progress: 0 },
    });
  } catch (err) {
    next(err);
  }
};
