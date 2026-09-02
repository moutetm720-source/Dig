const fs = require('fs');
let content = fs.readFileSync('src/services/store.ts', 'utf-8');

content = content.replace(
`  public processCheckout(cart: any, customer: any) {
    return Promise.resolve();
  }`,
`  public processCheckout(cart: any, customer?: any): Promise<any> {
    return Promise.resolve({ id: 'ord-' + Date.now(), orderNumber: 'ORD-' + Date.now(), totalAmount: cart.totalAmount || 0, items: cart.items || [], customer: customer || {}, status: 'completed' });
  }`
);

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

content = content.replace("  }\n}\n\nexport const store = new Store();", "  }\n" + additional + "\n}\n\nexport const store = new Store();");

fs.writeFileSync('src/services/store.ts', content);
