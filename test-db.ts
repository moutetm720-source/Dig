import 'dotenv/config';
import postgres from 'postgres';

const sql = postgres({
  host: process.env.SQL_HOST,
  user: process.env.SQL_USER,
  password: process.env.SQL_PASSWORD,
  database: process.env.SQL_DB_NAME,
});

async function run() {
  try {
    const result = await sql`SELECT 1 as x`;
    console.log("SUCCESS:", result);
  } catch (e) {
    console.error("ERROR:", e);
  } finally {
    await sql.end();
  }
}
run();
