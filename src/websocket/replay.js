const { Op }          = require('sequelize')
const { ActivityLog } = require('../models')

const replayMissedEvents = async (socket, projectId, lastEventTimestamp) => {
  if (!projectId || !lastEventTimestamp) return

  const since = new Date(lastEventTimestamp)
  if (isNaN(since.getTime())) return

  // Use Op.gte: MySQL DATETIME has 1-second precision; strict-gt can miss events
  // in the same second as the client's last-seen timestamp.
  const events = await ActivityLog.findAll({
    where: {
      project_id: projectId,
      created_at: { [Op.gte]: since }
    },
    include: [{ association: 'actor', attributes: ['id', 'display_name'] }],
    order: [['created_at', 'ASC']],
    limit: 100
  })

  // Always emit so the client knows replay completed (even with 0 events)
  socket.emit('replay', {
    events: events.map(e => e.toJSON()),
    count:  events.length,
    from:   lastEventTimestamp
  })
}


module.exports = { replayMissedEvents }
