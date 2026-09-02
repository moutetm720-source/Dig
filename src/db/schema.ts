import { pgTable, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  totalSpent: integer('total_spent').default(0).notNull(), // in cents or standard
  tags: text('tags').array(),
  segment: text('segment'),
});

export const products = pgTable('products', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  price: integer('price').notNull(), // standard price
  createdAt: timestamp('created_at').defaultNow().notNull(),
  active: boolean('active').default(true).notNull(),
  metadata: jsonb('metadata'),
});

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  customerId: text('customer_id').references(() => customers.id).notNull(),
  totalAmount: integer('total_amount').notNull(),
  status: text('status').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  items: jsonb('items'),
});

export const abandonedCarts = pgTable('abandoned_carts', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  customerName: text('customer_name'),
  productId: text('product_id'),
  cartValue: integer('cart_value'),
  recoveryStep: text('recovery_step'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const keyValueStore = pgTable('key_value_store', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
});
