import { Op } from 'sequelize';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { User, Department } from '../models/index.js';
import { ApiResponse } from '../utils/apiResponse.js';
import logger from '../utils/logger.js';

export const listUsers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      department_id,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = req.query;

    const where = {};
    if (search) {
      where[Op.or] = [
        { first_name: { [Op.like]: `%${search}%` } },
        { last_name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } },
      ];
    }
    if (role) where.role = role;
    if (status) where.status = status;
    if (department_id) where.department_id = department_id;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const { rows, count } = await User.findAndCountAll({
      where,
      include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
      attributes: { exclude: ['password_hash', 'password_reset_token', 'password_reset_expires'] },
      order: [[sort_by, sort_order.toUpperCase()]],
      limit: parseInt(limit),
      offset,
    });

    return ApiResponse.paginated(res, { rows, count, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id, {
      include: [{ model: Department, as: 'department', attributes: ['id', 'name'] }],
      attributes: { exclude: ['password_hash', 'password_reset_token', 'password_reset_expires'] },
    });
    if (!user) return ApiResponse.notFound(res, 'User not found');
    return ApiResponse.success(res, user);
  } catch (err) {
    next(err);
  }
};

export const createUser = async (req, res, next) => {
  try {
    const { first_name, last_name, email, password, role, department_id } = req.body;

    const existing = await User.findOne({ where: { email } });
    if (existing) return ApiResponse.badRequest(res, 'Email already exists');

    const user = await User.create({
      first_name,
      last_name,
      email,
      password_hash: password,
      role: role || 'user',
      department_id,
    });

    logger.info(`Admin created user: ${email}`);
    return ApiResponse.created(res, user.toSafeJSON());
  } catch (err) {
    next(err);
  }
};

export const updateUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return ApiResponse.notFound(res, 'User not found');

    const allowed = ['first_name', 'last_name', 'role', 'status', 'department_id'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });

    await user.save({ hooks: false });
    return ApiResponse.success(res, user.toSafeJSON(), 'User updated');
  } catch (err) {
    next(err);
  }
};

export const deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return ApiResponse.notFound(res, 'User not found');
    if (user.id === req.user.id) return ApiResponse.badRequest(res, 'Cannot delete yourself');

    await user.destroy(); // soft delete (paranoid)
    return ApiResponse.success(res, null, 'User deleted');
  } catch (err) {
    next(err);
  }
};

export const suspendUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return ApiResponse.notFound(res, 'User not found');
    user.status = 'suspended';
    await user.save({ hooks: false });
    return ApiResponse.success(res, user.toSafeJSON(), 'User suspended');
  } catch (err) {
    next(err);
  }
};

export const disableUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) return ApiResponse.notFound(res, 'User not found');
    user.status = 'disabled';
    await user.save({ hooks: false });
    return ApiResponse.success(res, user.toSafeJSON(), 'User disabled');
  } catch (err) {
    next(err);
  }
};

export const bulkUploadUsers = async (req, res, next) => {
  try {
    if (!req.file) return ApiResponse.badRequest(res, 'CSV file required');

    const content = fs.readFileSync(req.file.path, 'utf-8');
    const records = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const results = { created: 0, skipped: 0, errors: [] };

    for (const [i, row] of records.entries()) {
      try {
        if (!row.email || !row.first_name || !row.last_name) {
          results.errors.push({ row: i + 2, message: 'Missing required fields' });
          results.skipped++;
          continue;
        }

        const exists = await User.findOne({ where: { email: row.email } });
        if (exists) {
          results.errors.push({ row: i + 2, message: `Email ${row.email} already exists` });
          results.skipped++;
          continue;
        }

        await User.create({
          first_name: row.first_name,
          last_name: row.last_name,
          email: row.email,
          password_hash: row.password || 'Temp@1234',
          role: row.role === 'admin' ? 'admin' : 'user',
          department_id: row.department_id || null,
        });
        results.created++;
      } catch (err) {
        results.errors.push({ row: i + 2, message: err.message });
        results.skipped++;
      }
    }

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    logger.info(`Bulk upload: ${results.created} created, ${results.skipped} skipped`);
    return ApiResponse.success(res, results, 'Bulk upload complete');
  } catch (err) {
    next(err);
  }
};
