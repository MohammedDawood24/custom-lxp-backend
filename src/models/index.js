import sequelize from '../config/db.js';
import User from './User.js';
import Department from './Department.js';
import SiteSettings from './SiteSettings.js';
import RefreshToken from './RefreshToken.js';

// Associations
Department.hasMany(User, { foreignKey: 'department_id', as: 'users' });
User.belongsTo(Department, { foreignKey: 'department_id', as: 'department' });

User.hasMany(RefreshToken, { foreignKey: 'user_id', as: 'refreshTokens' });
RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

export { sequelize, User, Department, SiteSettings, RefreshToken };
