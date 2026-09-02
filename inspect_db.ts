import { db } from './src/db/db';
import { keyValueStore } from './src/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const res = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'dpf_app_v2_products'));
  if (res.length > 0) {
    const products = typeof res[0].value === 'string' ? JSON.parse(res[0].value) : res[0].value;
    console.log('Total products in dpf_app_v2_products:', products.length);
    const catCounts: Record<string, number> = {};
    products.forEach((p: any, idx: number) => {
      catCounts[p.category] = (catCounts[p.category] || 0) + 1;
      console.log(`[${idx+1}] ID: ${p.id} | Category: "${p.category}" | Status: ${p.status} | Title: "${p.title?.slice(0, 40)}"`);
    });
    console.log('Category breakdown:', JSON.stringify(catCounts, null, 2));
  } else {
    console.log('No products key found in DB');
  }

  const res2 = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_storefront_agent_state_v2'));
  if (res2.length > 0) {
    const st = typeof res2[0].value === 'string' ? JSON.parse(res2[0].value) : res2[0].value;
    console.log('--- Storefront Agent State ---');
    console.log('Clustering mode:', st?.visualConfig?.clusteringMode);
    console.log('Clusters:', st?.clusters?.map((c: any) => ({ name: c.name, count: c.productIds?.length, ids: c.productIds })));
  }

  const res3 = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_similarity_grouping_agent_state_v1'));
  if (res3.length > 0) {
    const sim = typeof res3[0].value === 'string' ? JSON.parse(res3[0].value) : res3[0].value;
    console.log('--- Similarity Grouping State ---');
    console.log('Groups count:', sim?.groups?.length);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
