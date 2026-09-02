const fs = require('fs');
let content = fs.readFileSync('src/services/store.ts', 'utf-8');

// I will find where `  public runAdOptimizationRules() {}` is and remove everything after it (including it)
const idx = content.indexOf('  public runAdOptimizationRules() {}');
if (idx > -1) {
  content = content.substring(0, idx);
}
// Also remove `export const store = new Store();` if it's there
content = content.replace(/export const store = new Store\(\);[\s\S]*/, "");

// find the last closing brace and remove it
content = content.trim();
if (content.endsWith('}')) {
  content = content.substring(0, content.lastIndexOf('}'));
}

const additional = `
  public runAdOptimizationRules() {}
  public updateAdCampaign(id: string, updates: any) {
    this.adCampaigns = this.adCampaigns.map(c => c.id === id ? { ...c, ...updates } : c);
    saveToStorage('adCampaigns', this.adCampaigns);
    this.notify();
  }
  public addAdCampaign(campaign: any) {
    if (!campaign.id) campaign.id = 'camp-' + Date.now();
    this.adCampaigns = [campaign, ...this.adCampaigns];
    saveToStorage('adCampaigns', this.adCampaigns);
    this.notify();
  }
  public executeApproval(id: string) {
    this.approvals = this.approvals.filter(a => a.id !== id);
    saveToStorage('approvals', this.approvals);
    this.notify();
  }
  public rejectApproval(id: string) {
    this.approvals = this.approvals.filter(a => a.id !== id);
    saveToStorage('approvals', this.approvals);
    this.notify();
  }
}

export const store = new Store();

fetchInitialState().then(() => {
  store.reloadFromServer();
}).catch(e => console.error('Failed to sync state from DB', e));
`;

content = content + additional;
fs.writeFileSync('src/services/store.ts', content);
