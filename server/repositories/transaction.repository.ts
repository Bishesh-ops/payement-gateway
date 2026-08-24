import { eq, and, lt } from "drizzle-orm";
import { db } from "../config/db.config.js";
import { transactions } from "../models/PaymentModel.js";

export type NewTransaction = typeof transactions.$inferInsert;

export const createTransaction = async (data: NewTransaction) => {
  const [newTx] = await db.insert(transactions).values(data).returning();
  return newTx;
};

export const getTransactionByProductId = async (productId: string) => {
  const [transaction] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.productId, productId));
  return transaction;
};

export const getPendingTransactionByPaypalId = async (paypalOrderId: string) => {
  const [transaction] = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.paypalOrderId, paypalOrderId),
        eq(transactions.status, "PENDING")
      )
    );
  return transaction;
};

export const getAbandonedPendingTransactions = async (olderThan: Date) => {
  return await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.status, "PENDING"),
        lt(transactions.createdAt, olderThan)
      )
    );
};

export const updateTransactionStatus = async (
  id: string,
  status: "COMPLETED" | "FAILED" | "PENDING" | "REFUNDED"
) => {
  const [updatedTx] = await db
    .update(transactions)
    .set({ status, updatedAt: new Date() })
    .where(eq(transactions.id, id))
    .returning();
  return updatedTx;
};