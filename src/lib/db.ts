import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from "../drizzle/schema";

declare global {
  // eslint-disable-next-line no-var
  var postgresClient: postgres.Sql | undefined;
}

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
}

const connectionString = process.env.DATABASE_URL;
const client = global.postgresClient || postgres(connectionString, { 
    ssl: 'require',
    max: 10, // Limit connections to prevent saturation
    idle_timeout: 20,
    connect_timeout: 30
});

if (process.env.NODE_ENV !== 'production') {
    global.postgresClient = client;
}

export const db = drizzle(client, { schema });
