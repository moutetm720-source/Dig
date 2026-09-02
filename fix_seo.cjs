const fs = require('fs');
let content = fs.readFileSync('src/services/seoLeaderAgents.ts', 'utf-8');

const newLogic = `
    // 2. Add an auto-generated programmatic page if fewer than 50
    if (this.programmaticPages.length < 50 && Math.random() < 0.5) {
      const prods = store.getProducts();
      if (prods.length > 0) {
        const targetProd = prods[Math.floor(Math.random() * prods.length)];
        const niche = targetProd.category || 'Logiciel SaaS';
        this.generateProgrammaticLanding(targetProd.title, niche, targetProd.format || 'Digital');
      } else {
        const ideas = [
          { t: 'Tailwind CSS v4 Dashboard UI Kit', c: 'UI Design', f: 'React / Tailwind' },
          { t: 'Solana Web3 Paywall & Token-Gated Template', c: 'Crypto', f: 'Solana / Next.js' },
          { t: 'Notion Autonomous Second Brain Template', c: 'Productivity', f: 'Notion 2026' }
        ];
        const pick = ideas[Math.floor(Math.random() * ideas.length)];
        this.generateProgrammaticLanding(pick.t, pick.c, pick.f);
      }
    }
`;

content = content.replace(
/    \/\/ 2\. Add an auto-generated programmatic page if fewer than 15[\s\S]*?    \}/,
newLogic
);

fs.writeFileSync('src/services/seoLeaderAgents.ts', content);
