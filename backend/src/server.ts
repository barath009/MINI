import http from 'http';
import app from './app';
import { config } from './config';
import { connectDB } from './database';
import { initSocket } from './services/socketService';
import { startCronJobs } from './services/cronService';
import { clockService } from './services/clockService';

const server = http.createServer(app);

// Initialize Socket.IO Server
initSocket(server);

// Start Database & Listen
const startServer = async () => {
  await connectDB();
  await clockService.init();
  startCronJobs();

  server.listen(config.port, () => {
    console.log(`=======================================================`);
    console.log(`[BIT Smart Attendance System] Node Backend API Active`);
    console.log(`Server URL   : http://localhost:${config.port}`);
    console.log(`Environment  : ${process.env.NODE_ENV || 'development'}`);
    console.log(`Timezone     : ${config.appTimezone}`);
    console.log(`=======================================================`);
  });
};

startServer().catch((err) => {
  console.error('Fatal Server Initialization Error:', err);
  process.exit(1);
});
