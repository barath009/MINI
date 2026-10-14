import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { config } from '../config';
import { seedDataInline } from './seed';

export const connectDB = async (): Promise<typeof mongoose> => {
  try {
    const conn = await mongoose.connect(config.mongoUri, {
      dbName: config.mongoDbName,
      serverSelectionTimeoutMS: 2500,
    });
    console.log(`[Database] MongoDB Connected successfully to ${conn.connection.host}/${config.mongoDbName}`);
    await seedDataInline();
    return conn;
  } catch (error) {
    console.warn('[Database] Local MongoDB server not reachable on 27017. Initializing embedded In-Memory MongoDB server...');
    try {
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      const conn = await mongoose.connect(uri, { dbName: config.mongoDbName });
      console.log(`[Database] Embedded In-Memory MongoDB Connected successfully at ${uri}`);
      await seedDataInline();
      return conn;
    } catch (memErr) {
      console.error('[Database] Fatal database initialization error:', memErr);
      process.exit(1);
    }
  }
};
