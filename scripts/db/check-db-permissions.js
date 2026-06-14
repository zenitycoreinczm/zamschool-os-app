const { Client } = require("pg");

const dbConfig = {
  host: process.env.SUPABASE_DB_HOST || "aws-1-eu-west-1.pooler.supabase.com",
  port: Number(process.env.SUPABASE_DB_PORT) || 6543,
  user: process.env.SUPABASE_DB_USER || "postgres.jnnroitaftfmclegbeac",
  password: process.env.SUPABASE_DB_PASSWORD,
  database: process.env.SUPABASE_DB_NAME || "postgres",
  ssl: { rejectUnauthorized: false }
};

async function main() {
  if (!dbConfig.password) {
    console.error("ERROR: SUPABASE_DB_PASSWORD env var is required.");
    process.exit(1);
  }
  const client = new Client(dbConfig);
  await client.connect();
  try {
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    console.log("Existing Tables:", res.rows.map(r => r.table_name));
  } catch (error) {
    console.error(error);
  } finally {
    await client.end();
  }
}
main();
