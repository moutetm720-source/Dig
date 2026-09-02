const fs = require('fs');

let content = fs.readFileSync('src/services/store.ts', 'utf-8');

content = content.replace(
`  public addOpportunity(opp: any): any {
    this.opportunities = [opp, ...this.opportunities];`,
`  public addOpportunity(opp: any): any {
    if (!opp.id) opp.id = 'opp-' + Date.now();
    if (!opp.createdAt) opp.createdAt = new Date().toISOString();
    if (opp.overallScore === undefined) opp.overallScore = 80;
    this.opportunities = [opp, ...this.opportunities];`
);

content = content.replace(
`  public addProduct(prod: any): any {
    this.products = [prod, ...this.products];`,
`  public addProduct(prod: any): any {
    if (!prod.id) prod.id = 'prod-' + Date.now();
    if (!prod.createdAt) prod.createdAt = new Date().toISOString();
    this.products = [prod, ...this.products];`
);

content = content.replace(
`  public addBundle(bundle: any): any {
    this.bundles = [bundle, ...this.bundles];`,
`  public addBundle(bundle: any): any {
    if (!bundle.id) bundle.id = 'bndl-' + Date.now();
    if (!bundle.createdAt) bundle.createdAt = new Date().toISOString();
    this.bundles = [bundle, ...this.bundles];`
);

content = content.replace(
`  public addContentItem(item: any): any {
    this.contentItems = [item, ...this.contentItems];`,
`  public addContentItem(item: any): any {
    if (!item.id) item.id = 'cnt-' + Date.now();
    if (!item.createdAt) item.createdAt = new Date().toISOString();
    this.contentItems = [item, ...this.contentItems];`
);

fs.writeFileSync('src/services/store.ts', content);
