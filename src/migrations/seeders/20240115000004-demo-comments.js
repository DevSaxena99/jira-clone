'use strict'
const { v4: uuidv4 } = require('uuid')
const { ADMIN_ID, DEV1_ID, DEV2_ID } = require('./20240115000002-demo-project')
const { QueryTypes } = require('sequelize')

module.exports = {
  async up (queryInterface) {
    const now = new Date()

    const issues = await queryInterface.sequelize.query(
      "SELECT id, issue_key FROM issues WHERE issue_key IN ('DEMO-2','DEMO-4','DEMO-8') ORDER BY issue_key",
      { type: QueryTypes.SELECT }
    )

    if (!issues.length) return

    const byKey = Object.fromEntries(issues.map(i => [i.issue_key, i.id]))

    const rootId = uuidv4()
    const rows   = [
      {
        id: rootId, issue_id: byKey['DEMO-2'], author_id: DEV1_ID,
        parent_id: null, content: "I've started the OAuth flow. Using passport.js with the Google strategy first, then we can add GitHub.",
        mentions: JSON.stringify([]), edited_at: null, deleted_at: null,
        created_at: new Date(now.getTime() + 1000), updated_at: new Date(now.getTime() + 1000)
      },
      {
        id: uuidv4(), issue_id: byKey['DEMO-2'], author_id: ADMIN_ID,
        parent_id: rootId, content: 'Sounds good @Alice Dev. Make sure to handle the callback URL in both dev and prod environments.',
        mentions: JSON.stringify([DEV1_ID]), edited_at: null, deleted_at: null,
        created_at: new Date(now.getTime() + 2000), updated_at: new Date(now.getTime() + 2000)
      },
      {
        id: uuidv4(), issue_id: byKey['DEMO-2'], author_id: DEV2_ID,
        parent_id: rootId, content: 'Also consider adding rate limiting on the /auth/callback endpoint to prevent abuse.',
        mentions: JSON.stringify([]), edited_at: null, deleted_at: null,
        created_at: new Date(now.getTime() + 3000), updated_at: new Date(now.getTime() + 3000)
      },

      {
        id: uuidv4(), issue_id: byKey['DEMO-4'], author_id: DEV2_ID,
        parent_id: null, content: "Reproduced: after 15 minutes of inactivity the session cookie expires but the client doesn't redirect to login.",
        mentions: JSON.stringify([]), edited_at: null, deleted_at: null,
        created_at: new Date(now.getTime() + 4000), updated_at: new Date(now.getTime() + 4000)
      },
      {
        id: uuidv4(), issue_id: byKey['DEMO-4'], author_id: DEV1_ID,
        parent_id: null, content: "Root cause found — the axios interceptor isn't catching 401s from background polling requests. Fix is straightforward.",
        mentions: JSON.stringify([DEV2_ID]), edited_at: null, deleted_at: null,
        created_at: new Date(now.getTime() + 5000), updated_at: new Date(now.getTime() + 5000)
      },

      {
        id: uuidv4(), issue_id: byKey['DEMO-8'], author_id: DEV2_ID,
        parent_id: null, content: 'EXPLAIN shows a full table scan on issues. The FULLTEXT index exists but MySQL is ignoring it for small datasets. Need to check the min_word_len setting.',
        mentions: JSON.stringify([DEV1_ID]), edited_at: null, deleted_at: null,
        created_at: new Date(now.getTime() + 6000), updated_at: new Date(now.getTime() + 6000)
      }
    ]

    await queryInterface.bulkInsert('comments', rows, { ignoreDuplicates: true })
  },

  async down (queryInterface) {
    await queryInterface.bulkDelete('comments', {}, {})
  }
}
