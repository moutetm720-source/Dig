const { createClient } = require('@libsql/client');
const db = createClient({ url: 'file:sqlite.db' });
async function check() {
  const res = await db.execute("SELECT key FROM key_value_store");
  console.log(res.rows);
}
check();
