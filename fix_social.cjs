const fs = require('fs');
let content = fs.readFileSync('src/services/globalSocialService.ts', 'utf-8');

const newLogic = `
      const lastPost = account.lastPostTime ? new Date(account.lastPostTime).getTime() : 0;
      const hoursSinceLast = (Date.now() - lastPost) / 3600000;

      // Make generation very frequent for demo/autonomous needs
      if (hoursSinceLast >= 0.5 || account.totalPostsCount < 20 || Math.random() > 0.5) {
        const country = account.targetCountries[Math.floor(Math.random() * account.targetCountries.length)];
        const language = account.targetLanguages[0] || 'en';
        const product = products[Math.floor(Math.random() * products.length)];

        const post = this.generateTargetedPost(account.id, product.id, country, language);
        this.publishPostNow(post.id);
      }
`;

content = content.replace(
/      const lastPost = account\.lastPostTime \? new Date\(account\.lastPostTime\)\.getTime\(\) : 0;[\s\S]*?this\.publishPostNow\(post\.id\);\s*\}/,
newLogic
);

fs.writeFileSync('src/services/globalSocialService.ts', content);
