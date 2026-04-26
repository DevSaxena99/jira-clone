const activityListener     = require('./activityListener')
const notificationListener = require('./notificationListener')
const websocketListener    = require('./websocketListener')

// Guard against double-registration (e.g., hot reload in dev, multiple test suites)
let registered = false

const registerListeners = (io) => {
  if (registered) return
  registered = true

  activityListener.register()
  notificationListener.register()
  if (io) websocketListener.register(io)
}

// Reset for tests
const reset = () => { registered = false }

module.exports = { registerListeners, reset }
