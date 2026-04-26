require('dotenv').config()
const http      = require('http')
const createApp = require('./config/app')
const { initSocket }       = require('./websocket')
const { registerListeners } = require('./events')

const app    = createApp()
const server = http.createServer(app)

const io = initSocket(server)
registerListeners(io)

const PORT = process.env.PORT || 3000
server.listen(PORT, () => console.log(`Server running on port ${PORT}`))

module.exports = { app, server }
