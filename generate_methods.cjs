const fs = require('fs');

const methods = `
  public subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public notify() {
    this.listeners.forEach(l => l());
  }

  public getOpportunities() { return this.opportunities; }
  public getProducts() { return this.products; }
  public getBundles() { return this.bundles; }
  public getContentItems() { return this.contentItems; }
  public getAdCampaigns() { return this.adCampaigns; }
  public getEmailSequences() { return this.emailSequences; }
  public getOrders() { return this.orders; }
  public getCustomers() { return this.customers; }
  public getApprovals() { return this.approvals; }
  public getRecommendations() { return this.recommendations; }
  public getJobs() { return this.systemJobs; }
  public getLogs() { return this.systemLogs; }
  public getAgentConfig() { return this.agentConfig; }
  public getPromptLibrary() { return this.promptTemplates; }
  public getIntegrations() { return this.integrations; }
  public getOnboardingState() { return this.onboardingState; }
  public getOpportunityWeights() { return this.opportunityWeights; }
  
  public getBusinessHealth(): BusinessHealth {
    const revenue = this.orders.reduce((sum, o) => sum + o.totalAmount, 0);
    return { 
      overallScore: 90,
      revenue, 
      customers: this.customers.length, 
      activeProducts: this.products.length,
      conversionRate: 2.5,
      mrr: 0,
      churnRate: 0,
      customerAcquisitionCost: 0,
      lifetimeValue: 0
    };
  }

  public addOpportunity(opp: Opportunity) {
    this.opportunities = [opp, ...this.opportunities];
    saveToStorage('opportunities', this.opportunities);
    this.notify();
  }
  public addProduct(prod: DigitalProduct) {
    this.products = [prod, ...this.products];
    saveToStorage('products', this.products);
    this.notify();
  }
  public updateProduct(id: string, updates: Partial<DigitalProduct>) {
    this.products = this.products.map(p => p.id === id ? { ...p, ...updates } : p);
    saveToStorage('products', this.products);
    this.notify();
  }
  public deleteProduct(id: string) {
    this.products = this.products.filter(p => p.id !== id);
    saveToStorage('products', this.products);
    this.notify();
  }
  public addBundle(bundle: ProductBundle) {
    this.bundles = [bundle, ...this.bundles];
    saveToStorage('bundles', this.bundles);
    this.notify();
  }
  public addContentItem(item: ContentItem) {
    this.contentItems = [item, ...this.contentItems];
    saveToStorage('contentItems', this.contentItems);
    this.notify();
  }

  public async createProductFromOpportunity(oppId: string, format: ProductFormat = 'template'): Promise<DigitalProduct> {
    const opp = this.opportunities.find(o => o.id === oppId);
    if (!opp) throw new Error('Opportunity not found');
    const newProduct = await generateFullProduct(opp, format);
    this.addProduct(newProduct);
    return newProduct;
  }

  public addLog(level: SystemLog['level'], category: SystemLog['category'], message: string, details?: any) {
    const log: SystemLog = {
      id: 'log-' + Date.now(),
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      details
    };
    this.systemLogs = [log, ...this.systemLogs];
    saveToStorage('systemLogs', this.systemLogs);
    this.notify();
  }

  public clearLogs() {
    this.systemLogs = [];
    saveToStorage('systemLogs', this.systemLogs);
    this.notify();
  }

  public approveAllSafeActions() {
    this.approvals = this.approvals.filter(a => a.riskLevel === 'high');
    saveToStorage('approvals', this.approvals);
    this.notify();
  }

  public updateAgentConfig(config: Partial<AutonomousAgentConfig>) {
    this.agentConfig = { ...this.agentConfig, ...config };
    saveToStorage('agentConfig', this.agentConfig);
    this.notify();
  }

  public updateOnboardingState(state: Partial<OnboardingState>) {
    this.onboardingState = { ...this.onboardingState, ...state };
    saveToStorage('onboardingState', this.onboardingState);
    this.notify();
  }

  public setOpportunityWeights(weights: OpportunityWeights) {
    this.opportunityWeights = weights;
    saveToStorage('opportunityWeights', this.opportunityWeights);
    this.notify();
  }

  public purgeFictitiousSales() {
    this.orders = this.orders.filter(o => !o.customer.email.startsWith('visitor-'));
    this.customers = this.customers.filter(c => !c.email.startsWith('visitor-'));
    this.products = this.products.map(p => ({ ...p, revenue: 0, salesCount: 0 }));
    saveToStorage('orders', this.orders);
    saveToStorage('customers', this.customers);
    saveToStorage('products', this.products);
    this.notify();
  }

  public recordDownload(orderId: string) {}

  public refundOrder(orderId: string) {
    this.orders = this.orders.map(o => o.id === orderId ? { ...o, status: 'refunded' } : o);
    saveToStorage('orders', this.orders);
    this.notify();
  }

  public regenerateOrderToken(orderId: string) {}

  public applyBulkPricingStrategy(strategy: any, productIds?: string[]) {}

  public updateProductPricing(productId: string, config: Partial<PricingConfig>) {
    this.products = this.products.map(p => p.id === productId ? { ...p, pricing: { ...p.pricing, ...config } } : p);
    saveToStorage('products', this.products);
    this.notify();
  }

  public updatePrompt(id: string, content: string) {
    this.promptTemplates = this.promptTemplates.map(p => p.id === id ? { ...p, content } : p);
    saveToStorage('promptTemplates', this.promptTemplates);
    this.notify();
  }

  public processCheckout(cart: any, customer: any) {
    return Promise.resolve();
  }

  public createOrder(order: Order) {
    this.orders = [order, ...this.orders];
    saveToStorage('orders', this.orders);
    this.notify();
  }

  public incrementProductViews(productId: string) {
    this.products = this.products.map(p => p.id === productId ? { ...p, views: (p.views || 0) + 1 } : p);
    saveToStorage('products', this.products);
    this.notify();
  }

  public exportState() { return JSON.stringify(this); }
  public importState(json: string) {}

  public dismissRecommendation(id: string) {
    this.recommendations = this.recommendations.filter(r => r.id !== id);
    saveToStorage('recommendations', this.recommendations);
    this.notify();
  }

  public executeRecommendation(id: string) {}

  public setRecommendations(recs: Recommendation[]) {
    this.recommendations = recs;
    saveToStorage('recommendations', this.recommendations);
    this.notify();
  }

  public isAdBudgetUnlocked() { return true; }
`;

let content = fs.readFileSync('src/services/store.ts', 'utf-8');

// Insert before the last closing brace of the class
const parts = content.split('}');
// Find where the class Store ends
// It ends right before "export const store = new Store();"
content = content.replace("  }\n}\n\nexport const store = new Store();", "  }\n" + methods + "\n}\n\nexport const store = new Store();");

fs.writeFileSync('src/services/store.ts', content);
