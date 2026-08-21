import mongoose, { Schema, Document, Model } from "mongoose";
import { pgTable, uuid, varchar, numeric, pgEnum, timestamp, jsonb } from "drizzle-orm/pg-core";


export const paymentGatewayEnum = pgEnum("payment_gateway", [
    "esewa", "khalti", "paypal"
]);
export const paymentStatusEnum = pgEnum("payment_status", [
    "PENDING", "COMPLETED", "FAILED", "REFUNDED"
]);

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
// export interface ITransaction extends Document {
//     customerDetails: {
//         name: string;
//         email: string;
//         phone: string;
//     },
//     product_name: string;
//     product_id: string;
//     amount: number;
//     payment_gateway: "esewa" | "khalti" | "paypal";
//     status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
//     pidx: string;
//     paypal_order_id: string;
// }

// const transactionSchema: Schema<ITransaction> = new Schema({
//     customerDetails: {
//         name: { type: String, required: true },
//         email: { type: String, required: true },
//         phone: { type: String, required: true },
//     },
//     product_name: { type: String, required: true },
//     product_id: { type: String, required: true },
//     amount: { type: Number, required: true },
//     payment_gateway: { type: String, enum: ["esewa", "khalti", "paypal"], required: true },
//     status: { type: String, enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"], default: "PENDING" },
//     pidx: { type: String },
//     paypal_order_id: { type: String },
// }, {
//     timestamps: true
// });

// const Transaction: Model<ITransaction> = mongoose.model<ITransaction>("Transaction", transactionSchema);

// export default Transaction;
