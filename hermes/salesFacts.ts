/** Chiffres Hermes issus du registre de paiement protégé, jamais des compteurs UI. */
export function confirmedSales(orders: any[]): any[] {
  const seen = new Set<string>();
  return orders.filter(o => {
    if (!o || !o.id || seen.has(o.id) || o.status !== 'paid' || !Number.isFinite(Date.parse(o.confirmedAt)) ||
      !Number.isSafeInteger(o.totalCents) || o.totalCents <= 0 || !/^[A-Za-z]{3}$/.test(o.currency || '')) return false;
    const real = (o.source === 'stripe' && /^cs_live_/.test(o.stripeSessionId || '')) ||
      (o.source === 'crypto' && /^(0x)?[a-f0-9]{64}$/i.test(o.cryptoTxHash || ''));
    if (!real) return false;
    seen.add(o.id); return true;
  });
}

export function salesFacts(serverOrders: any[], products: any[] = [], now = new Date()) {
  const orders = confirmedSales(serverOrders);
  const euros = orders.filter(o => o.currency.toUpperCase() === 'EUR');
  const cents = euros.reduce((sum, o) => sum + o.totalCents, 0);
  const byCurrency: Record<string, number> = {};
  const byProduct = new Map<string, { id: string; title: string; sales: number }>();
  for (const order of orders) {
    const currency = order.currency.toUpperCase();
    byCurrency[currency] = (byCurrency[currency] || 0) + order.totalCents;
    for (const item of Array.isArray(order.items) ? order.items : []) {
      if (!item.productId || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) continue;
      const current = byProduct.get(item.productId) || { id: item.productId, title: products.find(p => p.id === item.productId)?.title || item.title || item.productId, sales: 0 };
      current.sales += item.quantity; byProduct.set(item.productId, current);
    }
  }
  return {
    source: 'dpf_server_orders_v1 — paiements confirmés côté serveur (Stripe live / crypto)',
    orders: orders.length,
    totalRevenueEur: cents / 100,
    todayRevenueEur: euros.filter(o => new Date(o.confirmedAt).toISOString().slice(0, 10) === now.toISOString().slice(0, 10)).reduce((sum, o) => sum + o.totalCents, 0) / 100,
    dayTimezone: 'UTC',
    avgOrderValue: euros.length ? Math.round(cents / euros.length) / 100 : 0,
    totalsByCurrency: Object.fromEntries(Object.entries(byCurrency).map(([currency, total]) => [currency, total / 100])),
    excludedOrders: serverOrders.length - orders.length,
    products: products.length,
    publishedProducts: products.filter(p => p.status === 'published').length,
    topProducts: [...byProduct.values()].sort((a, b) => b.sales - a.sales).slice(0, 5),
    note: 'Montants bruts du registre conservé (500 dernières commandes max), pas un bénéfice ni un solde bancaire. Tests, démos et commandes non confirmées exclus. Devises non converties ; frais et remboursements à rapprocher de la passerelle.'
  };
}
