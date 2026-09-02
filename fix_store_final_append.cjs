const fs = require('fs');
let content = fs.readFileSync('src/services/store.ts', 'utf-8');

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
`;

content = content.replace("export const store = new Store();", "");
// remove last brace
content = content.trim();
if (content.endsWith('}')) {
  content = content.substring(0, content.length - 1);
}

content += additional + "\n}\nexport const store = new Store();\n";
fs.writeFileSync('src/services/store.ts', content);
