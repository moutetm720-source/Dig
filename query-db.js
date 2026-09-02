import { db } from './src/db/db.js';
import { keyValueStore } from './src/db/schema.js';

async function run() {
  const all = await db.select().from(keyValueStore);
  console.log(all.filter(k => k.key.includes('stripe')));
  process.exit(0);
}
run();
