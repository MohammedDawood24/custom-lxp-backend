'use strict';
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  async up(queryInterface) {
    const adminId = uuidv4();

    await queryInterface.bulkInsert('users', [{
      id: adminId,
      first_name: 'System',
      last_name: 'Admin',
      email: 'admin@lms.com',
      password_hash: await bcrypt.hash('Admin@123', 12),
      role: 'admin',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    }]);

    await queryInterface.bulkInsert('site_settings', [
      { key: 'site_name', value: 'LMS Platform', type: 'string', group: 'general', created_at: new Date(), updated_at: new Date() },
      { key: 'registration_enabled', value: 'true', type: 'boolean', group: 'general', created_at: new Date(), updated_at: new Date() },
      { key: 'payment_enabled', value: 'false', type: 'boolean', group: 'payment', created_at: new Date(), updated_at: new Date() },
      { key: 'privacy_policy', value: '<p>Privacy policy content here.</p>', type: 'html', group: 'legal', created_at: new Date(), updated_at: new Date() },
      { key: 'terms_of_use', value: '<p>Terms of use content here.</p>', type: 'html', group: 'legal', created_at: new Date(), updated_at: new Date() },
      { key: 'cancellation_policy', value: '<p>Cancellation policy content here.</p>', type: 'html', group: 'legal', created_at: new Date(), updated_at: new Date() },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('site_settings', null, {});
    await queryInterface.bulkDelete('users', null, {});
  },
};
