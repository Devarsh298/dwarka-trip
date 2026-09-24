import { MongoClient, Db } from 'mongodb';

const DEFAULT_URI = 'mongodb+srv://devarsh5598:Dps6763@cluster0.tgnoo2w.mongodb.net/TripExpense?retryWrites=true&w=majority&appName=Cluster0';
const DEFAULT_DB = 'TripExpense';

function getUri(): string {
  return process.env.MONGODB_URI || DEFAULT_URI;
}

function getDbName(): string {
  return process.env.MONGODB_DB || DEFAULT_DB;
}

let globalWithMongo = global as typeof globalThis & {
  _mongoClientPromise?: Promise<MongoClient>;
};

export async function getMongoClient(): Promise<MongoClient> {
  const uri = getUri();

  if (process.env.NODE_ENV === 'development') {
    if (!globalWithMongo._mongoClientPromise) {
      const client = new MongoClient(uri);
      globalWithMongo._mongoClientPromise = client.connect().catch((err) => {
        // Clear cached promise on error so subsequent requests retry
        delete globalWithMongo._mongoClientPromise;
        throw err;
      });
    }
    return globalWithMongo._mongoClientPromise;
  }

  const client = new MongoClient(uri);
  return client.connect();
}

export async function getDb(): Promise<Db> {
  const client = await getMongoClient();
  return client.db(getDbName());
}

export default getMongoClient();
