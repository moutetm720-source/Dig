const fs = require('fs');
let content = fs.readFileSync('src/services/socialSellingAgents.ts', 'utf-8');

// Ensure high conversion
content = content.replace(
  "const didConvert = Math.random() > 0.75;",
  "const didConvert = Math.random() > 0.3;"
);

// Add the store.createOrder when didConvert is true
const newLogic = `
        const didConvert = Math.random() > 0.3;
        const addedConversions = didConvert ? 1 : 0;
        const prod = store.getProducts().find(p => p.id === rule.targetProductId);
        const price = prod ? prod.pricing.recommendedPrice * (1 - rule.discountPercent / 100) : 35;
        const addedRev = addedConversions * price;

        if (didConvert && prod) {
          store.createOrder(
            {
              name: 'Follower Social',
              email: 'social-' + Math.random().toString(36).substring(2,8) + '@social.mail',
              country: 'Réseaux Sociaux'
            },
            [
              {
                productId: prod.id,
                productTitle: prod.title,
                price: price,
                format: prod.format || 'DIGITAL'
              }
            ],
            price,
            'social_networks'
          );
        }
`;

content = content.replace(
`        const didConvert = Math.random() > 0.75;
        const addedConversions = didConvert ? 1 : 0;
        const prod = store.getProducts().find(p => p.id === rule.targetProductId);
        const price = prod ? prod.pricing.recommendedPrice * (1 - rule.discountPercent / 100) : 35;
        const addedRev = addedConversions * price;`,
newLogic
);

fs.writeFileSync('src/services/socialSellingAgents.ts', content);
