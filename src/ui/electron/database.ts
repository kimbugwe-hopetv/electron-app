
import { MongoClient, Db } from 'mongodb';

const MONGO_URI = 'mongodb://127.0.0.1:27017';
const DATABASE_NAME = 'URA_TaxAdmin_DB';

let client: MongoClient | null = null;
let database: Db | null = null;

export async function connectDatabase(): Promise<Db> {
  if (database) {
    return database;
  }

  try {
    client = new MongoClient(MONGO_URI);

    await client.connect();

    database = client.db(DATABASE_NAME);

    console.log('Successfully connected to MongoDB!');
    console.log('Database:', DATABASE_NAME);

    return database;

  } catch (error) {
    console.error('MongoDB connection failed:', error);
    client = null;
    database = null;
    throw error;
  }
}

export async function closeDatabase(): Promise<void> {
  if (client) {
    await client.close();
    client = null;
    database = null;
    console.log('MongoDB connection closed.');
  }
}
