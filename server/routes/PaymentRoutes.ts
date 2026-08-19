import express from 'express';

import {
  initiatePayment,
  paymentStatus,
  webHook,
} from '../controllers/PaymentController.js';
import Transaction from '../models/PaymentModel.js';
const router = express.Router();

router.post('/initiate-payment', initiatePayment);
router.post('/payment-status', paymentStatus);
router.post('/webhook/paypal', webHook);

if (process.env.NODE_ENV !== "production") {
  router.get("/debug/transactions", async (req, res) => {
    if (
      !process.env.DEBUG_KEY ||
      req.headers["x-debug-key"] !== process.env.DEBUG_KEY
    ) {
      return res.status(404).json({ error: "Not found" });
    }

    try {
      const allTransactions = await Transaction.find({});
      return res.status(200).json({
        count: allTransactions.length,
        transactions: allTransactions,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  });
}

export default router;