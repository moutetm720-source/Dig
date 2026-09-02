const fs = require('fs');
let content = fs.readFileSync('src/services/salesExplosionAgents.ts', 'utf-8');

// The commented out block:
//    // Disabled in Real-Only mode since it generates fictitious creators.
//    /*
//    if (this.isAutonomousRecruitingActive && this.affiliates.length < 50) {
//      const scoutResult = this.scoutAndRecruitAffiliates(4);
// ...
//    }
//    */

content = content.replace(
/\/\/ Disabled in Real-Only mode since it generates fictitious creators\.[\s\S]*?\*\//,
`    // Enable Autonomous Recruiting for all products
    if (this.isAutonomousRecruitingActive && this.affiliates.length < 150) {
      if (Math.random() < 0.6) {
        const scoutResult = this.scoutAndRecruitAffiliates(Math.floor(Math.random() * 5) + 3); // 3 to 7 creators
        if (scoutResult.viableRecruitedCount > 0) {
          scoutResult.newlyRecruited.forEach(creator => {
            store.addLog(
              'success',
              'marketing',
              \`🚀 Recrutement Autonome (>85% Fiabilité) : \${creator.name} (\${creator.handle}, \${creator.channel}) recruté.\`
            );
          });
        }
      }
    }`
);

fs.writeFileSync('src/services/salesExplosionAgents.ts', content);
