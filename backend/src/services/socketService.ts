import { Server as SocketServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config';

let io: SocketServer | null = null;

export const initSocket = (server: HttpServer): SocketServer => {
  io = new SocketServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token;
    if (!token) {
      // Allow anonymous connection for demo if token absent, or attach public room
      return next();
    }
    try {
      const decoded = jwt.verify(token as string, config.jwtSecret) as { userId: string; role: string };
      socket.data.user = decoded;
      next();
    } catch (err) {
      next();
    }
  });

  io.on('connection', (socket) => {
    const user = socket.data.user;
    console.log(`[Socket.IO] Client connected: ${socket.id} (User: ${user ? user.userId : 'Guest'})`);

    if (user) {
      socket.join(`user_${user.userId}`);
      if (user.role === 'ADMIN') socket.join('admin_room');
      if (user.role === 'FACULTY') socket.join(`faculty_${user.userId}`);
      if (user.role === 'STUDENT') socket.join(`student_${user.userId}`);
    }

    socket.on('join_session', (sessionId: string) => {
      socket.join(`session_${sessionId}`);
      console.log(`[Socket.IO] Socket ${socket.id} joined session_${sessionId}`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

export const getSocketIO = (): SocketServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

export const emitAttendanceEvent = (event: string, payload: any, sessionId?: string, facultyUserId?: string, studentUserId?: string) => {
  if (!io) return;
  io.to('admin_room').emit(event, payload);
  if (sessionId) io.to(`session_${sessionId}`).emit(event, payload);
  if (facultyUserId) io.to(`faculty_${facultyUserId}`).emit(event, payload);
  if (studentUserId) io.to(`student_${studentUserId}`).emit(event, payload);
};

export const emitDeviceStatus = (deviceId: string, status: string, classroomId?: string) => {
  if (!io) return;
  io.to('admin_room').emit('device.status', { deviceId, status, classroomId, timestamp: new Date() });
};

export const emitTimetableUpdate = (payload: any) => {
  if (!io) return;
  io.emit('TIMETABLE_UPDATED', { ...payload, timestamp: new Date() });
};
