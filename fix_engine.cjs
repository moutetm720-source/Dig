const fs = require('fs');
let code = fs.readFileSync('src/services/autonomousEngine.ts', 'utf-8');

code = code.replace(
  /private autoPilotEnabled = false;/,
  'private autoPilotEnabled = true;'
);

code = code.replace(
  /export const autonomousEngine = new AutonomousEngine\(\);/,
  `export const autonomousEngine = new AutonomousEngine();
// Force start autopilot on init
setTimeout(() => autonomousEngine.start(), 2000);`
);

fs.writeFileSync('src/services/autonomousEngine.ts', code);
