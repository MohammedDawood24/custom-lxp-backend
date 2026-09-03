import { SiteSettings } from '../models/index.js';
import { ApiResponse } from '../utils/apiResponse.js';

export const getAll = async (req, res, next) => {
  try {
    const { group } = req.query;
    const where = group ? { group } : {};
    const settings = await SiteSettings.findAll({ where, order: [['group', 'ASC'], ['key', 'ASC']] });

    // Return as key-value map grouped
    const grouped = {};
    settings.forEach((s) => {
      if (!grouped[s.group]) grouped[s.group] = {};
      let val = s.value;
      if (s.type === 'boolean') val = val === 'true';
      else if (s.type === 'number') val = Number(val);
      else if (s.type === 'json') try { val = JSON.parse(val); } catch {}
      grouped[s.group][s.key] = val;
    });

    return ApiResponse.success(res, grouped);
  } catch (err) {
    next(err);
  }
};

export const getPublic = async (_req, res, next) => {
  try {
    const publicKeys = [
      'site_name', 'registration_enabled', 'payment_enabled',
      'privacy_policy', 'terms_of_use', 'cancellation_policy',
    ];
    const settings = await SiteSettings.findAll({ where: { key: publicKeys } });
    const map = {};
    settings.forEach((s) => {
      let val = s.value;
      if (s.type === 'boolean') val = val === 'true';
      map[s.key] = val;
    });
    return ApiResponse.success(res, map);
  } catch (err) {
    next(err);
  }
};

export const upsert = async (req, res, next) => {
  try {
    const { settings } = req.body; // Array of { key, value, type?, group? }

    for (const item of settings) {
      const value = typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value);
      await SiteSettings.upsert({
        key: item.key,
        value,
        type: item.type || 'string',
        group: item.group || 'general',
      });
    }

    return ApiResponse.success(res, null, 'Settings updated');
  } catch (err) {
    next(err);
  }
};
