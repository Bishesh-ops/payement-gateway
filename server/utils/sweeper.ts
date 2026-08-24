import cron from "node-cron";
import axios from "axios";
import { and, eq, lt } from "drizzle-orm";
import { db } from "../config/db.config.js"; 
import { transactions } from "../models/PaymentModel.js";

export const startTransactionSweeper = () => {
  cron.schedule("*/15 * * * *", async () => {
    console.log("[SWEEPER] Running background check for abandoned transactions...");

    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      
      const pendingTransactions = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.status, "PENDING"),
            lt(transactions.createdAt, tenMinutesAgo)
          )
        );

      if (pendingTransactions.length === 0) {
        return;
      }

      console.log(`[SWEEPER] Found ${pendingTransactions.length} pending transactions to verify.`);

      for (const tx of pendingTransactions) {
        try {
          if (tx.paymentGateway === "khalti") {
            const pidx = tx.pidx;

            if (!pidx) {
              console.log(`[SWEEPER] Skipping Khalti tx ${tx.productId} - no pidx stored.`);
              continue;
            }

            const response = await axios.post(
              process.env.KHALTI_VERIFICATION_URL as string,
              { pidx },
              { headers: { Authorization: `Key ${process.env.KHALTI_SECRET_KEY}` } }
            );

            const khaltiStatus = response.data.status;

            if (khaltiStatus === "Completed") {
              await db
                .update(transactions)
                .set({ status: "COMPLETED", updatedAt: new Date() })
                .where(eq(transactions.id, tx.id));
              console.log(`[SWEEPER] Khalti tx ${tx.productId} recovered and marked COMPLETED.`);
            } else if (["Expired", "User canceled", "Failed"].includes(khaltiStatus)) {
              await db
                .update(transactions)
                .set({ status: "FAILED", updatedAt: new Date() })
                .where(eq(transactions.id, tx.id));
              console.log(`[SWEEPER] Khalti tx ${tx.productId} expired/failed. Marked FAILED.`);
            }
          }

          if (tx.paymentGateway === "esewa") {
            if (!tx.amount || !tx.productId) {
               console.log(`[SWEEPER] Skipping eSewa tx ${tx.id} - missing amount or productId.`);
               continue;
            }

            const url = `${process.env.ESEWA_PAYMENT_STATUS_CHECK_URL}?product_code=${process.env.ESEWA_MERCHANT_ID}&total_amount=${tx.amount}&transaction_uuid=${tx.productId}`;

            const response = await axios.get(url);
            const esewaStatus = response.data.status;

            if (esewaStatus === "COMPLETE") {
              await db
                .update(transactions)
                .set({ status: "COMPLETED", updatedAt: new Date() })
                .where(eq(transactions.id, tx.id));
              console.log(`[SWEEPER] eSewa tx ${tx.productId} recovered and marked COMPLETED.`);
            } else if (["FAILED", "CANCELED", "NOT_FOUND"].includes(esewaStatus)) {
              await db
                .update(transactions)
                .set({ status: "FAILED", updatedAt: new Date() })
                .where(eq(transactions.id, tx.id));
              console.log(`[SWEEPER] eSewa tx ${tx.productId} failed or not found. Marked FAILED.`);
            }
          }

        } catch (innerError: any) {
          console.error(
            `[SWEEPER] API Error verifying tx ${tx.productId}:`,
            innerError?.response?.data || innerError.message
          );
        }
      }
    } catch (error) {
      console.error("[SWEEPER] Database error during sweep:", error);
    }
  });
};