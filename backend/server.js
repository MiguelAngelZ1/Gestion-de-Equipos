const { app, allowedOrigins } = require('./app');
const db = require('./db/database');
const http = require('http');
const { Server } = require("socket.io");
const notificationService = require('./servicios/notificationService');

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true
  }
});

notificationService.setIO(io);

const PORT = process.env.PORT || 3000;

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

async function shutdown() {
  console.log('\nApagando servidor gracefulmente...');
  server.close(async () => {
    try {
      if (db.client) {
        await new Promise((resolve, reject) => {
          db.client.close((err) => err ? reject(err) : resolve());
        });
      }
    } catch (e) {
      console.error('Error cerrando DB:', e.message);
    }
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Fuerza de cierre por timeout');
    process.exit(1);
  }, 10000);
}

server.listen(PORT, async () => {
  console.log("Servidor iniciado en puerto " + PORT);

  try {
    await db.connect();
  } catch (error) {
    console.error("Error critico conectando a la base de datos:", error);
  }

  const notificationInterval = (parseInt(process.env.NOTIFICATION_CHECK_HOURS) || 12) * 60 * 60 * 1000;
  setInterval(() => {
    notificationService.checkDelayedRepairs();
    notificationService.checkLowStock();
  }, notificationInterval);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error("Error: El puerto " + PORT + " ya esta en uso");
    process.exit(1);
  } else {
    console.error("Error del servidor:", error);
    process.exit(1);
  }
});

io.on('connection', (socket) => {
  socket.on('join', (userId) => {
    if (userId) {
      socket.join(`user_${userId}`);
    }
  });

  socket.on('disconnect', () => {
  });
});
