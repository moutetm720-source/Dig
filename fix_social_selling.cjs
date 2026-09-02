const fs = require('fs');
let content = fs.readFileSync('src/services/socialSellingAgents.ts', 'utf-8');

const newLogic = `
  public runAutonomousSocialTick() {
    // 0. Auto-generate Hooks for products autonomously
    if (Math.random() > 0.4 && this.hooks.length < 100) {
      const prods = store.getProducts();
      if (prods.length > 0) {
        const prod = prods[Math.floor(Math.random() * prods.length)];
        this.generateFastHooksForProduct(prod);
      }
    }

    // 1. Simulate viral clicks and social engagement
`;

content = content.replace(
/  public runAutonomousSocialTick\(\) \{\s*\/\/ 1\. Simulate viral clicks and social engagement/,
newLogic
);

fs.writeFileSync('src/services/socialSellingAgents.ts', content);
