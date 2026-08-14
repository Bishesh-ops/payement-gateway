import express from 'express';

import {
    initiatePayment,
    paymentStatus,
} from '../controllers/PaymentController.js';
import validate from "../middleware/validateResource.js";
import { initiatePaymentSchema, paymentStatusSchema } from "../schemas/paymentSchema.js";
const router = express.Router();

router.post('/initiate-payment', validate(initiatePaymentSchema), initiatePayment);
router.post('/payment-status', validate(paymentStatusSchema), paymentStatus);

export default router;