import cron from "node-cron";
import {
  getAbandonedPendingTransactions,
  updateTransactionStatus,
} from "../repositories/transaction.repository.js";
import {
  verifyKhaltiPayment,
  checkEsewaStatus,
} from "../providers/payment.providers.js";

export const startTransactionSweeper = () => {
  cron.schedule("*/15 * * * *", async () => {
    console.log("[SWEEPER] Running background check for abandoned transactions...");

    try {
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

      const pendingTransactions = await getAbandonedPendingTransactions(tenMinutesAgo);

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

            const checkResult = await verifyKhaltiPayment(pidx);
            const khaltiStatus = checkResult.status;

            if (khaltiStatus === "Completed") {
              await updateTransactionStatus(tx.id, "COMPLETED");
              console.log(`[SWEEPER] Khalti tx ${tx.productId} recovered and marked COMPLETED.`);
            } else if (["Expired", "User canceled", "Failed"].includes(khaltiStatus)) {
              await updateTransactionStatus(tx.id, "FAILED");
              console.log(`[SWEEPER] Khalti tx ${tx.productId} expired/failed. Marked FAILED.`);
            }
          }

          if (tx.paymentGateway === "esewa") {
            if (!tx.amount || !tx.productId) {
              console.log(`[SWEEPER] Skipping eSewa tx ${tx.id} - missing amount or productId.`);
              continue;
            }

            const checkResult = await checkEsewaStatus(tx.amount, tx.productId);
            const esewaStatus = checkResult.status;

            if (esewaStatus === "COMPLETE") {
              await updateTransactionStatus(tx.id, "COMPLETED");
              console.log(`[SWEEPER] eSewa tx ${tx.productId} recovered and marked COMPLETED.`);
            } else if (["FAILED", "CANCELED", "NOT_FOUND"].includes(esewaStatus)) {
              await updateTransactionStatus(tx.id, "FAILED");
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