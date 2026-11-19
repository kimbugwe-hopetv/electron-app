import {app, BrowserWindow, ipcMain} from 'electron';
//import path from 'path';
import { isDev } from './util.js';


import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { connectDatabase, closeDatabase } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

//type test = string;

app.on('ready', () => {
  const mainWindow = new BrowserWindow({
  width: 1600,
  height: 950,
  minWidth: 1000,
  minHeight: 650,
  show: false,
  autoHideMenuBar: true,


    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev()) {
    mainWindow.loadURL('http://localhost:5123');
  } else {
    mainWindow.loadFile(
      path.join(app.getAppPath(), 'dist-react/index.html')
    );
  }
});


// Only these four collections can be accessed through this API.
const ALLOWED_COLLECTIONS = [
  'efris_transactions',
  'tax_assessments',
  'tax_incentives_exemptions',
  'taxpayers'
] as const;

type CollectionName = typeof ALLOWED_COLLECTIONS[number];

// Convert MongoDB BSON values into JSON-safe values.
function serializeDocument(value: any): any {
  if (value === null || value === undefined) return value;

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeDocument);
  }

  if (typeof value === 'object') {
    if (value._bsontype) {
      return value.toString();
    }

    const result: Record<string, any> = {};

    for (const [key, item] of Object.entries(value)) {
      result[key] = serializeDocument(item);
    }

    return result;
  }

  return value;
}

// Fetch records from a collection.
ipcMain.handle(
  'mongodb:get-collection',
  async (_event, collectionName: string) => {
    try {
      if (!ALLOWED_COLLECTIONS.includes(
        collectionName as CollectionName
      )) {
        throw new Error('Invalid collection name');
      }

      const db = await connectDatabase();

      const records = await db
        .collection(collectionName)
        .find({})
        .limit(100)
        .toArray();

      return {
        success: true,
        data: records.map(serializeDocument)
      };

    } catch (error: any) {
      console.error('Fetch error:', error);

      return {
        success: false,
        message: error.message,
        data: []
      };
    }
  }
);

// Count records in all four collections.
ipcMain.handle(
  'mongodb:get-statistics',
  async () => {
    try {
      const db = await connectDatabase();

      const [
        transactions,
        assessments,
        incentives,
        taxpayers
      ] = await Promise.all([
        db.collection('efris_transactions').countDocuments(),
        db.collection('tax_assessments').countDocuments(),
        db.collection('tax_incentives_exemptions').countDocuments(),
        db.collection('taxpayers').countDocuments()
      ]);

      return {
        success: true,
        data: {
          transactions,
          assessments,
          incentives,
          taxpayers,
          total:
            transactions +
            assessments +
            incentives +
            taxpayers
        }
      };

    } catch (error: any) {
      return {
        success: false,
        message: error.message
      };
    }
  }
);

// Test the database connection.
ipcMain.handle(
  'mongodb:test-connection',
  async () => {
    try {
      const db = await connectDatabase();
      await db.command({ ping: 1 });

      return {
        success: true,
        message: 'Connected to URA_TaxAdmin_DB successfully!'
      };

    } catch (error: any) {
      return {
        success: false,
        message: error.message
      };
    }
  }
);

// Close database when Electron exits.
app.on('before-quit', () => {
  void closeDatabase();
});
