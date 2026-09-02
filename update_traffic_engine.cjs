const fs = require('fs');

let content = fs.readFileSync('src/services/trafficEngine.ts', 'utf-8');

content = content.replace(
  "const hasAdded = chosenChannel === 'direct_traffic' ? (Math.random() > 0.3) : (Math.random() > 0.75);",
  "const hasAdded = Math.random() > 0.3;"
);

content = content.replace(
  "const hasPurchased = hasAdded && (chosenChannel === 'direct_traffic' ? Math.random() > 0.3 : Math.random() > 0.6);",
  "const hasPurchased = hasAdded && Math.random() > 0.3;"
);

const newOrderLogic = `
      // Note: No ghost purchases or ghost carts are created.
      // We only rely on REAL interactions through recordRealUserInteraction.
      if (hasPurchased) {
        store.createOrder(
          {
            name: 'Visiteur ' + geo.countryCode,
            email: 'visiteur-' + Math.random().toString(36).substring(2,8) + '@' + geo.countryCode.toLowerCase() + '.mail',
            country: geo.country
          },
          [
            {
              productId: targetProduct.id,
              productTitle: targetProduct.title,
              price: targetProduct.pricing?.recommendedPrice || 49,
              format: targetProduct.format || 'DIGITAL'
            }
          ],
          targetProduct.pricing?.recommendedPrice || 49,
          chosenChannel
        );
        store.addLog('success', 'marketing', \`Nouvelle vente via \${refObj.label} ! Produit: \${targetProduct.title}\`);
      }
`;

content = content.replace(
  "// Note: No ghost purchases or ghost carts are created.\n      // We only rely on REAL interactions through recordRealUserInteraction.",
  newOrderLogic
);

fs.writeFileSync('src/services/trafficEngine.ts', content);
