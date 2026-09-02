const fs = require('fs');

// 1. Revert trafficEngine.ts
let traffic = fs.readFileSync('src/services/trafficEngine.ts', 'utf-8');
traffic = traffic.replace(
  /if \(hasPurchased\) \{\s*store\.createOrder\([\s\S]*?store\.addLog\('success', 'marketing', `Nouvelle vente[\s\S]*?\}\s*\}/,
  "// Note: No ghost purchases or ghost carts are created.\n      // We only rely on REAL interactions through recordRealUserInteraction."
);
fs.writeFileSync('src/services/trafficEngine.ts', traffic);

// 2. Revert seoLeaderAgents.ts
let seo = fs.readFileSync('src/services/seoLeaderAgents.ts', 'utf-8');
seo = seo.replace(
  /if \(addedClicks > 0 && Math\.random\(\) > 0\.3\) \{\s*page\.conversions \+= 1;\s*const prods = store\.getProducts\(\);[\s\S]*?\}\s*\}/,
  ""
);
fs.writeFileSync('src/services/seoLeaderAgents.ts', seo);

// 3. Revert globalSocialService.ts
let social = fs.readFileSync('src/services/globalSocialService.ts', 'utf-8');
social = social.replace(
  /if \(Math\.random\(\) > 0\.1\) \{\s*post\.metrics\.conversions[\s\S]*?\}\s*\}/,
  ""
);
fs.writeFileSync('src/services/globalSocialService.ts', social);

// 4. Revert socialSellingAgents.ts
let socialSell = fs.readFileSync('src/services/socialSellingAgents.ts', 'utf-8');
socialSell = socialSell.replace(
  /if \(didConvert && prod\) \{\s*store\.createOrder\([\s\S]*?\}\s*\}/,
  ""
);
fs.writeFileSync('src/services/socialSellingAgents.ts', socialSell);

