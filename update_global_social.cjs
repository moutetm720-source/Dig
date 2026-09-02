const fs = require('fs');
let content = fs.readFileSync('src/services/globalSocialService.ts', 'utf-8');

const newLogic = `
    post.metrics.views = Math.round(1500 + Math.random() * 2000);
    post.metrics.likes = Math.round(post.metrics.views * 0.08);
    post.metrics.shares = Math.round(post.metrics.views * 0.02);
    post.metrics.linkClicks = Math.round(post.metrics.views * 0.04);
    
    if (Math.random() > 0.1) {
      post.metrics.conversions = Math.floor(Math.random() * 3) + 1;
      const prods = store.getProducts();
      const prod = prods.find(p => p.id === post.targetProductId) || prods[0];
      if (prod) {
        post.metrics.attributedRevenueEur = post.metrics.conversions * (prod.pricing?.recommendedPrice || 29);
        for(let i=0; i<Math.min(2, post.metrics.conversions); i++) {
          store.createOrder(
            {
              name: 'Follower International',
              email: 'global-' + Math.random().toString(36).substring(2,8) + '@global.mail',
              country: post.targetCountry
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
            'social_networks'
          );
        }
      }
    }
`;

content = content.replace(
`    post.metrics.views = Math.round(1500 + Math.random() * 2000);
    post.metrics.likes = Math.round(post.metrics.views * 0.08);
    post.metrics.shares = Math.round(post.metrics.views * 0.02);
    post.metrics.linkClicks = Math.round(post.metrics.views * 0.04);`,
newLogic
);

// We need to add import { store } from './store'; at the top of globalSocialService.ts if it's not there.
if (!content.includes("import { store }")) {
  content = "import { store } from './store';\n" + content;
}

fs.writeFileSync('src/services/globalSocialService.ts', content);
