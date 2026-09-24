import { MongoClient } from 'mongodb';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read .env.local
const envPath = join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx > -1) {
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim();
      process.env[key] = val;
    }
  }
}

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || 'TripExpense';

if (!uri) {
  console.error('❌ MONGODB_URI is not set in .env.local');
  process.exit(1);
}

async function initDatabase() {
  console.log(`🔌 Connecting to MongoDB Atlas cluster...`);
  console.log(`URI: ${uri.replace(/:([^@]+)@/, ':****@')}`);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log(`✅ Connected successfully!`);

    const db = client.db(dbName);
    console.log(`📁 Target database: "${dbName}"`);

    // List existing collections
    const collections = await db.listCollections().toArray();
    const collectionNames = collections.map((c) => c.name);
    console.log(`📋 Existing collections:`, collectionNames.length > 0 ? collectionNames : '[None yet]');

    // 1. Create 'members' collection
    if (!collectionNames.includes('members')) {
      await db.createCollection('members');
      console.log(`✨ Created collection: "members"`);
    } else {
      console.log(`ℹ️ Collection "members" already exists.`);
    }
    await db.collection('members').createIndex({ name: 1 });
    console.log(`🔑 Index created on members (name)`);

    // 2. Create 'expenses' collection
    if (!collectionNames.includes('expenses')) {
      await db.createCollection('expenses');
      console.log(`✨ Created collection: "expenses"`);
    } else {
      console.log(`ℹ️ Collection "expenses" already exists.`);
    }
    await db.collection('expenses').createIndex({ date: -1 });
    await db.collection('expenses').createIndex({ paidBy: 1 });
    console.log(`🔑 Indexes created on expenses (date, paidBy)`);

    console.log(`\n🎉 Database "${dbName}" and collections [members, expenses] are initialized in MongoDB Atlas!`);
  } catch (error) {
    console.error(`❌ Connection/Initialization error:`, error.message);
  } finally {
    await client.close();
  }
}

initDatabase();
