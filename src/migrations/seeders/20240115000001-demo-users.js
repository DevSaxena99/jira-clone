'use strict'
const bcrypt = require('bcryptjs')

const USERS = [
  { id: 'seed-user-admin-0000-000000000001', email: 'admin@demo.com',  display_name: 'Admin User' },
  { id: 'seed-user-dev1-00000-000000000002', email: 'dev1@demo.com',   display_name: 'Alice Dev'  },
  { id: 'seed-user-dev2-00000-000000000003', email: 'dev2@demo.com',   display_name: 'Bob Dev'    }
]

module.exports = {
  async up (queryInterface) {
    const hash = await bcrypt.hash('Password1!', 10)
    const now  = new Date()

    await queryInterface.bulkInsert('users', USERS.map(u => ({
      ...u, password_hash: hash, is_active: true, created_at: now, updated_at: now
    })), { ignoreDuplicates: true })
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('users', { id: USERS.map(u => u.id) })
  }
}
