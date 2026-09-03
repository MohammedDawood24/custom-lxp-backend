import { Department, User } from '../models/index.js';
import { ApiResponse } from '../utils/apiResponse.js';
import sequelize from '../config/db.js';
import { fn, col } from 'sequelize';

export const list = async (req, res, next) => {
  try {
    const departments = await Department.findAll({
      attributes: {
        include: [[fn('COUNT', col('users.id')), 'user_count']],
      },
      include: [{ model: User, as: 'users', attributes: [] }],
      group: ['Department.id'],
      order: [['name', 'ASC']],
    });
    return ApiResponse.success(res, departments);
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const dept = await Department.create(req.body);
    return ApiResponse.created(res, dept);
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) return ApiResponse.notFound(res, 'Department not found');
    await dept.update(req.body);
    return ApiResponse.success(res, dept, 'Department updated');
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const dept = await Department.findByPk(req.params.id);
    if (!dept) return ApiResponse.notFound(res, 'Department not found');

    const userCount = await User.count({ where: { department_id: dept.id } });
    if (userCount > 0) {
      return ApiResponse.badRequest(res, `Cannot delete: ${userCount} users assigned to this department`);
    }

    await dept.destroy();
    return ApiResponse.success(res, null, 'Department deleted');
  } catch (err) {
    next(err);
  }
};
