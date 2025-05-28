import { drizzle as drizzleNodePostgres } from 'drizzle-orm/node-postgres'; // For node-postgres client
import { drizzle as drizzlePostgresJs } from 'drizzle-orm/postgres-js'; // For postgres-js client
import { Pool } from 'pg'; // node-postgres pool
import postgres from 'postgres'; // postgres-js client
import * as schema from '../../shared/schema'; // Adjust path as necessary
import 'dotenv/config'; // To load .env file for local development

// Define the order of tables for deletion and insertion
const tableDeletionOrder = [
  schema.suggestions,
  schema.messages,
  schema.contacts,
  schema.settings,
  schema.users,
];

const tableInsertionOrder = [
  schema.users,
  schema.settings,
  schema.contacts,
  schema.messages,
  schema.suggestions,
];

async function main() {
  const sourceDbUrl = process.env.DATABASE_URL;
  const targetDbUrl = process.env.SUPABASE_DATABASE_URL;

  if (!sourceDbUrl) {
    throw new Error("DATABASE_URL environment variable is not set.");
  }
  if (!targetDbUrl) {
    throw new Error("SUPABASE_DATABASE_URL environment variable is not set.");
  }

  console.log("Starting database synchronization to Supabase...");

  // Source DB (using postgres-js, as used in PostgresStorage)
  const sourceClient = postgres(sourceDbUrl);
  const sourceDb = drizzlePostgresJs(sourceClient, { schema });
  console.log("Connected to source database.");

  // Target DB (Supabase - can use either postgres-js or node-postgres)
  // Using node-postgres Pool for variety, or if specific Supabase SSL requirements are easier with it.
  // Supabase often provides a connection string that works with node-postgres.
  // Ensure your SUPABASE_DATABASE_URL includes necessary SSL params if required, e.g., ?sslmode=require
  const targetPool = new Pool({ connectionString: targetDbUrl });
  const targetDb = drizzleNodePostgres(targetPool, { schema });
  console.log("Connected to target Supabase database.");

  try {
    console.log("Beginning data transfer...");

    // Delete data from target tables in reverse order of dependencies
    console.log("\nClearing data from target tables...");
    for (const table of tableDeletionOrder) {
      console.log(`Deleting from ${table._.name}...`);
      await targetDb.delete(table);
      console.log(`Finished deleting from ${table._.name}.`);
    }

    // Fetch data from source and insert into target in order of dependencies
    console.log("\nFetching data from source and inserting into target...");
    for (const table of tableInsertionOrder) {
      console.log(`Fetching from ${table._.name} (source)...`);
      // Select all columns except 'id' as it's usually auto-generated (serial)
      // This requires knowing the column names or dynamically building the selection.
      // For simplicity, if schema includes 'id', we fetch it, then omit it for insertion.
      const fetchedData = await sourceDb.select().from(table).execute();
      
      if (fetchedData.length > 0) {
        // Remove 'id' field from each object if it exists, as it's typically auto-generated
        // and we are clearing tables. This is crucial for serial primary keys.
        const dataToInsert = fetchedData.map(row => {
          const { id, ...rest } = row as any; // Assuming 'id' is the primary key column
          return rest;
        });

        console.log(`Inserting ${dataToInsert.length} rows into ${table._.name} (target)...`);
        // Drizzle's .values() can take an array of objects
        await targetDb.insert(table).values(dataToInsert).execute();
        console.log(`Finished inserting into ${table._.name}.`);
      } else {
        console.log(`No data to insert for ${table._.name}.`);
      }
    }

    console.log("\nDatabase synchronization completed successfully!");

  } catch (error) {
    console.error("\nError during database synchronization:", error);
    // Consider more sophisticated error handling or rollback if part of a transaction
  } finally {
    console.log("\nClosing database connections...");
    await sourceClient.end();
    await targetPool.end();
    console.log("Connections closed.");
  }
}

main().catch(e => {
  console.error("Unhandled error in main function:", e);
  process.exit(1);
});
