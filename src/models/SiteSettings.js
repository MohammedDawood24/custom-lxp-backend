import { DataTypes } from 'sequelize';
import sequelize from '../config/db.js';

const SiteSettings = sequelize.define('SiteSettings', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  key: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true,
  },
  value: {
    type: DataTypes.TEXT('long'),
    allowNull: true,
  },
  type: {
    type: DataTypes.ENUM('string', 'boolean', 'number', 'json', 'html'),
    defaultValue: 'string',
  },
  group: {
    type: DataTypes.STRING(50),
    defaultValue: 'general',
  },
}, {
  tableName: 'site_settings',
});

export default SiteSettings;
