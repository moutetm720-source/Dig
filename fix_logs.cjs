const fs = require('fs');

// 1. Add log to generateProgrammaticLanding
let seo = fs.readFileSync('src/services/seoLeaderAgents.ts', 'utf-8');
seo = seo.replace(
  /this\.state\.programmaticPages = \[page, \.\.\.this\.state\.programmaticPages\];\s*this\.saveState\(\);\s*this\.notify\(\);\s*return page;/,
  `this.state.programmaticPages = [page, ...this.state.programmaticPages];
    store.addLog('success', 'marketing', \`Agent SEO : Nouvelle page programmatique générée automatiquement ("\${title}")\`);
    this.saveState();
    this.notify();
    return page;`
);
fs.writeFileSync('src/services/seoLeaderAgents.ts', seo);

// 2. Add log to globalSocialService.ts generateTargetedPost (if it doesn't have one)
let social = fs.readFileSync('src/services/globalSocialService.ts', 'utf-8');
if (!social.includes('Nouvelle publication générée')) {
  social = social.replace(
    /this\.state\.posts = \[post, \.\.\.this\.state\.posts\];\s*this\.save\(\);\s*this\.notify\(\);\s*return post;/,
    `this.state.posts = [post, ...this.state.posts];
    store.addLog('success', 'marketing', \`Agent Social : Nouvelle publication générée automatiquement pour le pays \${targetCountry}\`);
    this.save();
    this.notify();
    return post;`
  );
  fs.writeFileSync('src/services/globalSocialService.ts', social);
}

// 3. Add log to socialSellingAgents.ts generateFastHooksForProduct
let hooks = fs.readFileSync('src/services/socialSellingAgents.ts', 'utf-8');
if (!hooks.includes('4 hooks viraux et scripts')) {
  hooks = hooks.replace(
    /this\.hooks = \[\.\.\.newHooks, \.\.\.this\.hooks\];\s*this\.saveState\(\);\s*this\.notify\(\);/,
    `this.hooks = [...newHooks, ...this.hooks];
    store.addLog('success', 'marketing', \`Agents Sociaux : 4 hooks viraux et scripts générés pour "\${product.title.slice(0, 30)}..."\`);
    this.saveState();
    this.notify();`
  );
  fs.writeFileSync('src/services/socialSellingAgents.ts', hooks);
}

