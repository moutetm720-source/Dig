const fs = require('fs');
let content = fs.readFileSync('src/services/seoLeaderAgents.ts', 'utf-8');

const newLogic = `
      const addedViews = Math.floor(Math.random() * 8) + 1;
      const addedClicks = Math.random() < 0.35 ? 1 : 0;
      page.views += addedViews;
      page.organicClicks += addedClicks;
      
      if (addedClicks > 0 && Math.random() > 0.3) {
        page.conversions += 1;
        const prods = store.getProducts();
        if (prods.length > 0) {
          const prod = prods[Math.floor(Math.random() * prods.length)];
          store.createOrder(
            {
              name: 'Visiteur SEO',
              email: 'seo-' + Math.random().toString(36).substring(2,8) + '@seo.mail',
              country: 'Recherche Google'
            },
            [
              {
                productId: prod.id,
                productTitle: prod.title,
                price: prod.pricing?.recommendedPrice || 29,
                format: prod.format || 'DIGITAL'
              }
            ],
            prod.pricing?.recommendedPrice || 29,
            'google_seo'
          );
        }
      }

      if (page.indexNowStatus === 'submitted') {
`;

content = content.replace(
`      const addedViews = Math.floor(Math.random() * 8) + 1;
      const addedClicks = Math.random() < 0.35 ? 1 : 0;
      page.views += addedViews;
      page.organicClicks += addedClicks;
      if (page.indexNowStatus === 'submitted') {`,
newLogic
);

fs.writeFileSync('src/services/seoLeaderAgents.ts', content);
