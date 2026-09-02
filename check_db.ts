import { db } from './src/db/index.ts';
import { keyValueStore } from './src/db/schema.ts';
async function run() {
  const all = await db.select().from(keyValueStore);
  console.log(all.map(a => a.key));
}
run();
