import express from 'express';

import {
    initiatePayment,
    paymentStatus,
} from '../controllers/PaymentController.js';
import validate from "../middleware/validateResource.js";
import { initiatePaymentSchema, paymentStatusSchema } from '../schemas/PaymentSchema.js';
import Transaction from '../models/PaymentModel.js';
const router = express.Router();

router.post('/initiate-payment', validate(initiatePaymentSchema), initiatePayment);
router.post('/payment-status', validate(paymentStatusSchema), paymentStatus);
router.get("/debug/transactions", async (req, res) => {
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

export default router;