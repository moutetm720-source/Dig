const fs = require('fs');
let content = fs.readFileSync('src/services/store.ts', 'utf-8');

const target = "  public isAdBudgetUnlocked() { return true; }";
const idx = content.indexOf(target);
if (idx > -1) {
  content = content.substring(0, idx + target.length);
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
