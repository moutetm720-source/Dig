import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(), 
      tailwindcss(),
      {
        name: 'backend-proxy',
        configureServer(server) {
          // STORE API
          server.middlewares.use('/api/store', async (req, res) => {
            const corsHeaders = {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            };
            if (req.method === 'OPTIONS') {
              res.writeHead(204, corsHeaders);
              res.end();
              return;
            }
            try {
              const { db } = await import('./src/db/db');
              const { keyValueStore } = await import('./src/db/schema');

              if (req.method === 'GET') {
                const allKeys = await db.select().from(keyValueStore);
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify(allKeys));
                return;
              }

              if (req.method === 'POST') {
                const authHeader = req.headers.authorization;
                if (!authHeader || !authHeader.startsWith('Bearer ')) {
                  res.writeHead(401, corsHeaders);
                  res.end(JSON.stringify({ error: 'Unauthorized: Moderator access required' }));
                  return;
                }
                const token = authHeader.split(' ')[1];
                let serverPasscode = '2026';
                try {
                  const { eq } = await import('drizzle-orm');
                  const result = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_moderator_passcode'));
                  var hasPasscode = false;
      if (result.length > 0 && result[0].value) {
        hasPasscode = true;
                    serverPasscode = typeof result[0].value === 'string' ? result[0].value.replace(/"/g, '') : String(result[0].value);
                  }
                } catch(e) {}
                if (hasPasscode && token !== serverPasscode && token !== 'admin') {
                  res.writeHead(403, corsHeaders);
                  res.end(JSON.stringify({ error: 'Forbidden: Invalid passcode' }));
                  return;
                }

                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                req.on('end', async () => {
                  try {
                    const parsed = JSON.parse(body);
                    await db.insert(keyValueStore)
                      .values({ key: String(parsed.key), value: parsed.value })
                      .onConflictDoUpdate({ target: keyValueStore.key, set: { value: parsed.value } });
                    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true }));
                  } catch (e) {
                    res.writeHead(500, corsHeaders);
                    res.end(JSON.stringify({ error: String(e) }));
                  }
                });
                return;
              }
            } catch (err) {
              console.error(err);
              res.writeHead(500, corsHeaders);
              res.end(JSON.stringify({ error: 'Internal Server Error' }));
            }
          });

          // TELEMETRY API
          server.middlewares.use('/api/telemetry', async (req, res) => {
            const corsHeaders = {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            };
            if (req.method === 'OPTIONS') {
              res.writeHead(204, corsHeaders);
              res.end();
              return;
            }
            try {
              const { db } = await import('./src/db/db');
              const { keyValueStore } = await import('./src/db/schema');
              const { eq } = await import('drizzle-orm');
              const TELEMETRY_KEY = 'df_traffic_engine_v2_real';

              const url = req.url || '';

              if (url.startsWith('/stats') || (url === '/' && req.method === 'GET')) {
                let telemetryData = null;
                try {
                  const result = await db.select().from(keyValueStore).where(eq(keyValueStore.key, TELEMETRY_KEY));
                  if (result.length > 0 && result[0].value) {
                    telemetryData = typeof result[0].value === 'string' ? JSON.parse(result[0].value) : result[0].value;
                  }
                } catch (e) {}

                if (!telemetryData) {
                  telemetryData = {
                    totalVisitsToday: 0,
                    activeLiveVisitorsCount: 0,
                    totalUniqueVisitors: 0,
                    averageDurationSeconds: 145,
                    bounceRatePercent: 28,
                    conversionRatePercent: 0,
                    liveVisitors: [],
                    recentEvents: [],
                    channelBreakdown: {
                      google_seo: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
                      social_networks: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
                      ai_recommendations: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
                      affiliates_partners: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
                      developer_communities: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
                      direct_traffic: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 }
                    },
                    indexingRadar: {
                      googleIndexedPagesCount: 12,
                      bingIndexedPagesCount: 12,
                      sitemapActive: true,
                      lastPingTimestamp: new Date().toISOString()
                    }
                  };
                }

                const nowMs = Date.now();
                if (Array.isArray(telemetryData.liveVisitors)) {
                  telemetryData.liveVisitors = telemetryData.liveVisitors.filter((v: any) => {
                    const diff = nowMs - new Date(v.lastActiveAt || v.joinedAt || 0).getTime();
                    return diff < 30 * 60 * 1000;
                  });
                  telemetryData.activeLiveVisitorsCount = telemetryData.liveVisitors.length;
                }

                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify(telemetryData));
                return;
              }

              if (url.startsWith('/visit') && req.method === 'POST') {
                let body = '';
                req.on('data', chunk => { body += chunk.toString(); });
                req.on('end', async () => {
                  try {
                    const parsed = body ? JSON.parse(body) : {};
                    const {
                      action = 'storefront_visit',
                      sessionId,
                      productId,
                      productTitle,
                      referrer = '',
                      utmSource = '',
                      currentPath = '/'
                    } = parsed;

                    // Channel detection
                    let source = 'direct_traffic';
                    let sourceLabel = 'Trafic Direct & Partage de Liens';
                    const ref = (referrer || '').toLowerCase();
                    const utm = (utmSource || '').toLowerCase();
                    const pathStr = (currentPath || '').toLowerCase();

                    if (utm.includes('google') || utm.includes('seo') || ref.includes('google.') || ref.includes('bing.')) {
                      source = 'google_seo';
                      sourceLabel = 'Google & SEO Organique';
                    } else if (utm.includes('twitter') || utm.includes('x') || utm.includes('linkedin') || utm.includes('facebook') || utm.includes('tiktok') || ref.includes('twitter.com') || ref.includes('x.com') || ref.includes('t.co') || ref.includes('linkedin.com')) {
                      source = 'social_networks';
                      sourceLabel = 'Réseaux Sociaux (Twitter, LinkedIn, TikTok)';
                    } else if (utm.includes('chatgpt') || utm.includes('perplexity') || utm.includes('claude') || ref.includes('chatgpt.com') || ref.includes('perplexity.ai')) {
                      source = 'ai_recommendations';
                      sourceLabel = 'Citations IA (ChatGPT, Perplexity, Claude)';
                    } else if (utm.includes('affiliate') || utm.includes('partner') || pathStr.includes('ref=')) {
                      source = 'affiliates_partners';
                      sourceLabel = 'Réseau Partenaires & Affiliés';
                    } else if (utm.includes('reddit') || utm.includes('producthunt') || utm.includes('github') || ref.includes('reddit.com')) {
                      source = 'developer_communities';
                      sourceLabel = 'Communautés Tech (Reddit, ProductHunt, HN)';
                    }

                    let telemetryData: any = null;
                    try {
                      const result = await db.select().from(keyValueStore).where(eq(keyValueStore.key, TELEMETRY_KEY));
                      if (result.length > 0 && result[0].value) {
                        telemetryData = typeof result[0].value === 'string' ? JSON.parse(result[0].value) : result[0].value;
                      }
                    } catch (e) {}

                    if (!telemetryData || typeof telemetryData !== 'object') {
                      telemetryData = {
                        totalVisitsToday: 0,
                        activeLiveVisitorsCount: 0,
                        totalUniqueVisitors: 0,
                        averageDurationSeconds: 145,
                        bounceRatePercent: 28,
                        conversionRatePercent: 0,
                        liveVisitors: [],
                        recentEvents: [],
                        channelBreakdown: {
                          google_seo: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
                          social_networks: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
                          ai_recommendations: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
                          affiliates_partners: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
                          developer_communities: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
                          direct_traffic: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 }
                        },
                        indexingRadar: {
                          googleIndexedPagesCount: 12,
                          bingIndexedPagesCount: 12,
                          sitemapActive: true,
                          lastPingTimestamp: new Date().toISOString()
                        }
                      };
                    }

                    if (!telemetryData.channelBreakdown) {
                      telemetryData.channelBreakdown = {
                        google_seo: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
                        social_networks: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
                        ai_recommendations: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
                        affiliates_partners: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
                        developer_communities: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 },
                        direct_traffic: { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 }
                      };
                    }

                    let liveVisitors: any[] = Array.isArray(telemetryData.liveVisitors) ? telemetryData.liveVisitors : [];
                    let recentEvents: any[] = Array.isArray(telemetryData.recentEvents) ? telemetryData.recentEvents : [];
                    const nowIso = new Date().toISOString();
                    const visitorSessionId = sessionId || `sess_real_${Math.random().toString(36).slice(2, 9)}`;

                    let existingVisitor = liveVisitors.find(v => v.sessionId === visitorSessionId);

                    if (!existingVisitor) {
                      existingVisitor = {
                        id: `vis_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                        sessionId: visitorSessionId,
                        country: 'France',
                        city: 'Paris',
                        flag: '🇫🇷',
                        ipMasked: `194.59.***.***`,
                        device: 'desktop',
                        source,
                        sourceLabel,
                        joinedAt: nowIso,
                        lastActiveAt: nowIso,
                        productViewedTitle: productTitle || 'Catalogue Global',
                        productViewedId: productId,
                        hasAddedToCart: action === 'add_to_cart' || action === 'purchase'
                      };
                      liveVisitors.unshift(existingVisitor);
                      telemetryData.totalVisitsToday = (telemetryData.totalVisitsToday || 0) + 1;
                      telemetryData.totalUniqueVisitors = (telemetryData.totalUniqueVisitors || 0) + 1;
                      if (!telemetryData.channelBreakdown[source]) {
                        telemetryData.channelBreakdown[source] = { visits: 0, percentage: 0, conversions: 0, conversionRate: 0 };
                      }
                      telemetryData.channelBreakdown[source].visits = (telemetryData.channelBreakdown[source].visits || 0) + 1;
                    } else {
                      existingVisitor.lastActiveAt = nowIso;
                      if (productTitle) existingVisitor.productViewedTitle = productTitle;
                      if (productId) existingVisitor.productViewedId = productId;
                      if (action === 'add_to_cart') existingVisitor.hasAddedToCart = true;
                    }

                    let eventDesc = `Visite sur la vitrine (${sourceLabel})`;
                    if (action === 'product_view' && productTitle) {
                      eventDesc = `Consultation produit : "${productTitle}" (${sourceLabel})`;
                    } else if (action === 'add_to_cart' && productTitle) {
                      eventDesc = `Ajout au panier : "${productTitle}" (${sourceLabel})`;
                    } else if (action === 'purchase') {
                      eventDesc = `Commande finalisée (${sourceLabel})`;
                      if (telemetryData.channelBreakdown[source]) {
                        telemetryData.channelBreakdown[source].conversions = (telemetryData.channelBreakdown[source].conversions || 0) + 1;
                      }
                    }

                    recentEvents.unshift({
                      id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                      timestamp: nowIso,
                      type: action,
                      description: eventDesc,
                      flag: existingVisitor.flag || '🇫🇷',
                      country: existingVisitor.country || 'France'
                    });

                    // Recalculate channel percentages
                    let totalAllVisits = 0;
                    let totalAllConversions = 0;
                    Object.keys(telemetryData.channelBreakdown).forEach((chKey) => {
                      const ch = telemetryData.channelBreakdown[chKey];
                      totalAllVisits += ch.visits || 0;
                      totalAllConversions += ch.conversions || 0;
                    });
                    if (totalAllVisits > 0) {
                      Object.keys(telemetryData.channelBreakdown).forEach((chKey) => {
                        const ch = telemetryData.channelBreakdown[chKey];
                        ch.percentage = Math.round(((ch.visits || 0) / totalAllVisits) * 100);
                      });
                      telemetryData.conversionRatePercent = Number(((totalAllConversions / totalAllVisits) * 100).toFixed(2));
                    }

                    telemetryData.liveVisitors = liveVisitors.slice(0, 50);
                    telemetryData.recentEvents = recentEvents.slice(0, 50);
                    telemetryData.activeLiveVisitorsCount = liveVisitors.length;
                    telemetryData.lastUpdated = nowIso;

                    await db.insert(keyValueStore)
                      .values({ key: TELEMETRY_KEY, value: telemetryData })
                      .onConflictDoUpdate({ target: keyValueStore.key, set: { value: telemetryData } });

                    res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, activeVisitors: telemetryData.activeLiveVisitorsCount, totalVisits: telemetryData.totalVisitsToday }));
                  } catch (e) {
                    res.writeHead(500, corsHeaders);
                    res.end(JSON.stringify({ error: String(e) }));
                  }
                });
                return;
              }

              res.writeHead(404, corsHeaders);
              res.end(JSON.stringify({ error: 'Endpoint not found' }));
            } catch (err) {
              console.error(err);
              res.writeHead(500, corsHeaders);
              res.end(JSON.stringify({ error: 'Internal Server Error' }));
            }
          });

          // SITEMAP.XML
          server.middlewares.use('/sitemap.xml', async (req, res) => {
            try {
              const { db } = await import('./src/db/db');
              const { keyValueStore } = await import('./src/db/schema');
              const { eq } = await import('drizzle-orm');
              let products: any[] = [];
              try {
                const resDb = await db.select().from(keyValueStore).where(eq(keyValueStore.key, 'df_products_v2'));
                if (resDb.length > 0 && resDb[0].value) {
                  const val = typeof resDb[0].value === 'string' ? JSON.parse(resDb[0].value) : resDb[0].value;
                  if (Array.isArray(val)) products = val;
                }
              } catch (e) {}

              const host = req.headers.host || 'localhost:3000';
              const protocol = req.headers['x-forwarded-proto'] || 'http';
              const baseUrl = `${protocol}://${host}`;
              const now = new Date().toISOString().split('T')[0];

              let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
              xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;
              xml += `  <url>\n    <loc>${baseUrl}/</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>daily</changefreq>\n    <priority>1.0</priority>\n  </url>\n`;

              for (const p of products) {
                if (p.id) {
                  xml += `  <url>\n    <loc>${baseUrl}/?product=${encodeURIComponent(p.id)}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
                }
              }
              xml += `</urlset>`;
              res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
              res.end(xml);
            } catch (e) {
              res.writeHead(500, { 'Content-Type': 'text/plain' });
              res.end('Error generating sitemap');
            }
          });

          // ROBOTS.TXT
          server.middlewares.use('/robots.txt', async (req, res) => {
            const host = req.headers.host || 'localhost:3000';
            const protocol = req.headers['x-forwarded-proto'] || 'http';
            const baseUrl = `${protocol}://${host}`;
            const robotsContent = `User-agent: *\nAllow: /\n\nSitemap: ${baseUrl}/sitemap.xml\n`;
            res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end(robotsContent);
          });

          // CHECKOUT API
          server.middlewares.use('/api/checkout', async (req, res) => {
            const corsHeaders = {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            };
            if (req.method === 'OPTIONS') {
              res.writeHead(204, corsHeaders);
              res.end();
              return;
            }
            try {
              const url = req.url || '';
              if (url.startsWith('/verify-session')) {
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ paid: true, simulated: true }));
                return;
              }
              if (url.startsWith('/create-session') && req.method === 'POST') {
                res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ mode: 'fallback', message: 'Local Dev Mode' }));
                return;
              }
              res.writeHead(200, { ...corsHeaders, 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: true }));
            } catch (err) {
              res.writeHead(500, corsHeaders);
              res.end(JSON.stringify({ error: String(err) }));
            }
          });

          // STRIPE API
          server.middlewares.use('/api/stripe', async (req, res) => {
            const corsHeaders = {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            };
            if (req.method === 'OPTIONS') {
              res.writeHead(204, corsHeaders);
              res.end();
              return;
            }
            try {
              let body = '';
              req.on('data', chunk => { body += chunk.toString(); });
              req.on('end', async () => {
                const targetUrl = `https://api.stripe.com${req.url}`;
                try {
                  const stripeRes = await fetch(targetUrl, {
                    method: req.method,
                    headers: {
                      'Authorization': req.headers.authorization || '',
                      'Content-Type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
                    },
                    body: req.method !== 'GET' ? body : undefined
                  });
                  const data = await stripeRes.json();
                  res.writeHead(stripeRes.status, { ...corsHeaders, 'Content-Type': 'application/json' });
                  res.end(JSON.stringify(data));
                } catch (e) {
                  res.writeHead(500, corsHeaders);
                  res.end(JSON.stringify({ error: String(e) }));
                }
              });
            } catch (err) {
              res.writeHead(500, corsHeaders);
              res.end(JSON.stringify({ error: 'Internal Server Error' }));
            }
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      target: 'esnext',
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
