const fs = require('fs');

let content = fs.readFileSync('src/services/store.ts', 'utf-8');

content = content.replace(
`  public createOrder(order: Order) {
    this.orders = [order, ...this.orders];
    saveToStorage('orders', this.orders);
    this.notify();
  }`,
`  public createOrder(customerOrOrder: any, items?: any[], totalAmount?: number, source?: string): any {
    if (items) {
      const newOrder = {
        id: 'ord-' + Date.now(),
        customerId: 'cust-' + Date.now(),
        customer: customerOrOrder,
        items,
        totalAmount,
        status: 'completed',
        createdAt: new Date().toISOString(),
        source
      };
      this.orders = [newOrder, ...this.orders];
      saveToStorage('orders', this.orders);
      this.notify();
      return newOrder;
    } else {
      const newOrder = { id: 'ord-' + Date.now(), createdAt: new Date().toISOString(), ...customerOrOrder };
      this.orders = [newOrder, ...this.orders];
      saveToStorage('orders', this.orders);
      this.notify();
      return newOrder;
    }
  }`
);

content = content.replace(
`  public getBusinessHealth(): BusinessHealth {`,
`  public getBusinessHealth(): any {`
);

content = content.replace(
`  public async createProductFromOpportunity(oppId: string, format: ProductFormat = 'template'): Promise<DigitalProduct> {
    const opp = this.opportunities.find(o => o.id === oppId);
    if (!opp) throw new Error('Opportunity not found');
    const newProduct = await generateFullProduct(opp, format);
    this.addProduct(newProduct);
    return newProduct;
  }`,
`  public async createProductFromOpportunity(oppId: string, format: ProductFormat = 'template'): Promise<DigitalProduct> {
    const opp = this.opportunities.find(o => o.id === oppId);
    if (!opp) throw new Error('Opportunity not found');
    const newProduct = await generateFullProduct(opp, format) as unknown as DigitalProduct;
    this.addProduct(newProduct);
    return newProduct;
  }`
);

fs.writeFileSync('src/services/store.ts', content);
