const fs = require('fs');
let content = fs.readFileSync('src/services/salesExplosionAgents.ts', 'utf-8');

content = content.replace(
  "const convProb = cart.recoveryStep === 1 ? 0.35 : cart.recoveryStep === 2 ? 0.50 : 0.65;",
  "const convProb = 0.85;"
);

fs.writeFileSync('src/services/salesExplosionAgents.ts', content);
