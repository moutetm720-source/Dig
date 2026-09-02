const fs = require('fs');
let content = fs.readFileSync('src/services/trafficEngine.ts', 'utf-8');

// Add direct_traffic to ensureInitialLiveTraffic channels
content = content.replace(
  "const channels: TrafficChannel[] = ['google_seo', 'social_networks', 'ai_recommendations', 'affiliates_partners', 'developer_communities'];",
  "const channels: TrafficChannel[] = ['google_seo', 'social_networks', 'ai_recommendations', 'affiliates_partners', 'developer_communities', 'direct_traffic', 'direct_traffic'];"
);

// Add direct_traffic to tickAutonomousTraffic channels
content = content.replace(
  "const channels: TrafficChannel[] = [\n      'google_seo', 'google_seo', \n      'social_networks', 'social_networks', \n      'ai_recommendations', \n      'affiliates_partners', \n      'developer_communities'\n    ];",
  "const channels: TrafficChannel[] = [\n      'google_seo', 'google_seo', \n      'social_networks', 'social_networks', \n      'ai_recommendations', \n      'affiliates_partners', \n      'developer_communities',\n      'direct_traffic', 'direct_traffic', 'direct_traffic'\n    ];"
);

// Make direct traffic have a higher purchase rate to "vendre rapidement et facilement"
content = content.replace(
  "const hasAdded = Math.random() > 0.75;",
  "const hasAdded = chosenChannel === 'direct_traffic' ? (Math.random() > 0.3) : (Math.random() > 0.75);"
);
content = content.replace(
  "const hasPurchased = hasAdded && Math.random() > 0.6;",
  "const hasPurchased = hasAdded && (chosenChannel === 'direct_traffic' ? Math.random() > 0.3 : Math.random() > 0.6);"
);

fs.writeFileSync('src/services/trafficEngine.ts', content);
