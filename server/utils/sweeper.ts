import cron from "node-cron";
import axios from "axios";
import Transaction from "../models/PaymentModel.js";

export const startTransactionSweeper = () => {
    // Every 15 minutes it checks if there are any abandoned transactions.
    cron.schedule("*/15 * * * *", async () => {
        console.log("[SWEEPER] Running background check for abandoned transactions...");

        try {
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            // Pending Transactions apparently this can be a list or a singular Transaction.
            const pendingTransactions = await Transaction.find({
                status: "PENDING",
                createdAt: { $lt: tenMinutesAgo }
            });

            if (pendingTransactions.length === 0) {
                return;
            }

            console.log(`[SWEEPER] Found ${pendingTransactions.length} pending transactions to verify.`);

            for (const tx of pendingTransactions) {
                try {

                    if (tx.payment_gateway === "khalti") {
                        const pidx = tx.pidx;

                        if (!pidx) {
                            console.log(`[SWEEPER] Skipping Khalti tx ${tx.product_id} - no pidx stored.`); // Because Khalti will have a pidx in its transaction response.
                            continue;
                        }

                        const response = await axios.post(
                            process.env.KHALTI_VERIFICATION_URL as string,
                            { pidx },
                            { headers: { Authorization: `Key ${process.env.KHALTI_SECRET_KEY}` } }
                        );

                        const khaltiStatus = response.data.status;

                        if (khaltiStatus === "Completed") {
                            tx.status = "COMPLETED";
                            await tx.save();
                            console.log(`[SWEEPER] Khalti tx ${tx.product_id} recovered and marked COMPLETED.`);
                        } else if (["Expired", "User canceled", "Failed"].includes(khaltiStatus)) {
                            tx.status = "FAILED";
                            await tx.save();
                            console.log(`[SWEEPER] Khalti tx ${tx.product_id} expired/failed. Marked FAILED.`);
                        }
                    }

                    if (tx.payment_gateway === "esewa") {
                        const url = `${process.env.ESEWA_PAYMENT_STATUS_CHECK_URL}?product_code=${process.env.ESEWA_MERCHANT_ID}&total_amount=${tx.amount}&transaction_uuid=${tx.product_id}`;

                        const response = await axios.get(url);

                        const esewaStatus = response.data.status;

                        if (esewaStatus === "COMPLETE") {
                            tx.status = "COMPLETED";
                            await tx.save();
                            console.log(`[SWEEPER] eSewa tx ${tx.product_id} recovered and marked COMPLETED.`);
                        } else if (esewaStatus === "FAILED" || esewaStatus === "CANCELED" || esewaStatus === "NOT_FOUND") {
                            tx.status = "FAILED";
                            await tx.save();
                            console.log(`[SWEEPER] eSewa tx ${tx.product_id} failed or not found. Marked FAILED.`);
                        }
                    }

                } catch (innerError: any) {
                    console.error(
                        `[SWEEPER] API Error verifying tx ${tx.product_id}:`,
                        innerError?.response?.data || innerError.message
                    );
                }
            }
        } catch (error) {
            console.error("[SWEEPER] Database error during sweep:", error);
        }
    });
};