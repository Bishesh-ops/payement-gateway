import type { Request, Response } from "express";
import { z } from "zod";
import {
  initiatePaymentSchema,
  paymentStatusSchema,
  type InitiatePaymentBody,
  type PaymentStatusBody,
} from "../schemas/PaymentSchema.js";

import {
  processPaymentInitiation,
  verifyPaymentStatus,
  processPaypalWebhook,
} from "../services/payment.service.js";

export const initiatePayment = async (
  req: Request<{}, {}, InitiatePaymentBody>,
  res: Response
) => {
  const validation = initiatePaymentSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: z.treeifyError(validation.error), 
    });
  }

  try {
    const paymentResult = await processPaymentInitiation(validation.data);
    return res.status(200).json(paymentResult);
  } catch (error: any) {
    console.error("Error during payment initiation:", error.message || error);
    return res.status(500).json({
      message: "Payment initiation failed",
      error: error.message || "Unknown error occurred",
    });
  }
};

export const paymentStatus = async (
  req: Request<{}, {}, PaymentStatusBody>,
  res: Response
) => {
  const validation = paymentStatusSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: z.treeifyError(validation.error),
    });
  }

  const { product_id, pidx, paypal_order_id, status } = validation.data;

  try {
    const result = await verifyPaymentStatus(
      product_id,
      status,
      pidx,
      paypal_order_id
    );
    
    return res.status(200).json(result);
  } catch (error: any) {
    console.error("Error during payment status check:", error.message || error);
    
    const statusCode = error.message.includes("not found") ? 404 : 500;
    
    return res.status(statusCode).json({
      message: "Payment status check failed",
      error: error.message || "Unknown error occurred",
    });
  }
};

export const webHook = async (req: Request, res: Response) => {
  try {
    const event = req.body;

    if (event.event_type === "PAYPAL.CAPTURE.COMPLETED") {
      const paypalOrderId = event.resource.supplementary_data?.related_ids?.order_id;
      
      if (paypalOrderId) {
        await processPaypalWebhook(paypalOrderId);
      }
    }
    
    return res.status(200).send("Webhook Received");
  } catch (error: any) {
    console.error("WebHook Error: ", error.message || error);
    return res.status(500).send("Webhook processing failed.");
  }
};