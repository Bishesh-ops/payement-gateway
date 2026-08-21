import { pgTable, uuid, varchar, numeric, pgEnum, timestamp, jsonb } from "drizzle-orm/pg-core";

export const paymentGatewayEnum = pgEnum("payment_gateway", ["esewa", "khalti", "paypal"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PENDING", "COMPLETED", "FAILED", "REFUNDED"]);

export const transactions = pgTable("transactions", {
    id: uuid("id").defaultRandom().primaryKey(),

    productId: varchar("product_id", { length: 255 }).notNull(),
    productName: varchar("product_name", { length: 255 }).notNull(),

    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),

    paymentGateway: paymentGatewayEnum("payment_gateway").notNull(),
    status: paymentStatusEnum("status").default("PENDING").notNull(),

    customerName: varchar("customer_name", { length: 255 }).notNull(),
    customerEmail: varchar("customer_email", { length: 255 }).notNull(),
    customerPhone: varchar("customer_phone", { length: 50 }).notNull(),

    pidx: varchar("pidx", { length: 255 }),
    paypalOrderId: varchar("paypal_order_id", { length: 255 }),

    metadata: jsonb("metadata").default({}),

    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull()
        .$onUpdate(() => new Date()),
});

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
