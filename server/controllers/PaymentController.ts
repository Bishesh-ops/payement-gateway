import type { Request, Response } from "express";
import axios, { AxiosResponse } from "axios";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import {
  CheckoutPaymentIntent,
  Client,
  Environment,
  LogLevel,
  OrdersController,
} from "@paypal/paypal-server-sdk";

import { db } from "../config/db.config.js"; 
import { transactions } from "../models/PaymentModel.js";

import { convertNprToUsd, generateHmacSha256Hash } from "../utils/helper.js";
import {
  initiatePaymentSchema,
  paymentStatusSchema,
  type InitiatePaymentBody,
  type PaymentStatusBody,
} from "../schemas/PaymentSchema.js";

let cachedOrdersController: OrdersController | null = null;
const getOrdersController = (): OrdersController => {
  if (cachedOrdersController) {
    return cachedOrdersController;
  }

  const paypalClient = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: process.env.PAYPAL_CLIENT_ID as string,
      oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET as string,
    },
    timeout: 0,
    environment: Environment.Sandbox,
    logging: {
      logLevel: LogLevel.Info,
      logRequest: { logBody: true },
      logResponse: { logHeaders: true },
    },
  });

  cachedOrdersController = new OrdersController(paypalClient);
  return cachedOrdersController;
};

interface PaymentConfig {
  url: string;
  data: any;
  headers: any;
  responseHandler: (response: AxiosResponse) => string | undefined;
}

export const initiatePayment = async (
  req: Request<{}, {}, InitiatePaymentBody>,
  res: Response
) => {
  const validation = initiatePaymentSchema.safeParse(req.body);
  if (!validation.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: validation.error.format(),
    });
  }

  const {
    amount,
    productId,
    paymentGateway,
    customerName,
    customerEmail,
    customerPhone,
    productName,
  } = validation.data;

  try {
    let paymentConfig: PaymentConfig;

    if (paymentGateway === "paypal") {
      const orderRequest = {
        body: {
          intent: CheckoutPaymentIntent.Capture,
          purchaseUnits: [
            {
              amount: {
                currencyCode: "USD",
                value: await convertNprToUsd(amount),
              },
              referenceId: productId,
              description: productName,
            },
          ],
        },
      };

      try {
        const { body } = await getOrdersController().createOrder(orderRequest);
        const paypalOrder = JSON.parse(body as string);

        await db.insert(transactions).values({
          productId,
          productName,
          amount: amount.toString(),
          paymentGateway: "paypal",
          status: "PENDING",
          customerName,
          customerEmail,
          customerPhone,
          paypalOrderId: paypalOrder.id,
        });

        return res.status(200).json({
          id: paypalOrder.id,
          status: paypalOrder.status,
        });
      } catch (error: any) {
        console.error("Error creating PayPal order:", error.response?.data || error.message || error);
        return res.status(500).json({
          message: "Failed to initiate PayPal order",
          error: error.message || "Unknown error occurred",
        });
      }
    }

    else if (paymentGateway === "esewa") {
      const paymentData = {
        amount,
        failure_url: process.env.FAILURE_URL,
        product_delivery_charge: "0",
        product_service_charge: "0",
        product_code: process.env.ESEWA_MERCHANT_ID,
        signed_field_names: "total_amount,transaction_uuid,product_code",
        success_url: process.env.SUCCESS_URL,
        tax_amount: "0",
        total_amount: amount,
        transaction_uuid: productId,
      };

      const dataString = `total_amount=${paymentData.total_amount},transaction_uuid=${paymentData.transaction_uuid},product_code=${paymentData.product_code}`;
      const signature = generateHmacSha256Hash(dataString, process.env.ESEWA_SECRET as string);

      paymentConfig = {
        url: process.env.ESEWA_PAYMENT_URL as string,
        data: { ...paymentData, signature },
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        responseHandler: (response: AxiosResponse) => response.request?.res?.responseUrl,
      };
    }

    else if (paymentGateway === "khalti") {
      paymentConfig = {
        url: process.env.KHALTI_PAYMENT_URL as string,
        data: {
          amount: amount * 100, // Khalti requires amount in paisa
          mobile: customerPhone,
          product_identity: productId,
          product_name: productName,
          return_url: process.env.SUCCESS_URL,
          failure_url: process.env.FAILURE_URL,
          public_key: process.env.KHALTI_PUBLIC_KEY,
          website_url: "http://localhost:5173",
          purchase_order_id: productId,
          purchase_order_name: productName,
        },
        headers: {
          Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        responseHandler: (response: AxiosResponse<{ payment_url: string; pidx?: string }>) => response.data?.payment_url,
      };
    } else {
      return res.status(400).json({ error: "Invalid payment gateway." });
    }

    const payment = await axios.post(paymentConfig.url, paymentConfig.data, {
      headers: paymentConfig.headers,
    });
    const paymentUrl = paymentConfig.responseHandler(payment);

    if (!paymentUrl) {
      throw new Error("Payment URL not found in the response.");
    }

    await db.insert(transactions).values({
      productId,
      productName,
      amount: amount.toString(),
      paymentGateway: paymentGateway as "esewa" | "khalti" | "paypal",
      status: "PENDING",
      customerName,
      customerEmail,
      customerPhone,
      pidx: payment.data?.pidx || null,
    });

    return res.status(200).json({ url: paymentUrl });
  } catch (error: any) {
    console.error("Error during payment initiation:", error.response?.data || error.message);
    return res.status(500).json({
      message: "Payment initiation failed",
      error: error.response?.data || error.message,
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
      details: validation.error.format(),
    });
  }

  const { product_id, pidx, paypal_order_id, status } = validation.data;

  try {
    // Select record from PostgreSQL
    const [transaction] = await db
      .select()
      .from(transactions)
      .where(eq(transactions.productId, product_id));

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found" });
    }

    if (transaction.status !== "PENDING") {
      return res.status(200).json({
        message: `Transaction already ${transaction.status}`,
        status: transaction.status,
      });
    }

    const { paymentGateway } = transaction;

    if (status === "FAILED") {
      await db
        .update(transactions)
        .set({ status: "FAILED", updatedAt: new Date() })
        .where(eq(transactions.productId, product_id));

      return res.status(200).json({
        message: "Transaction status updated to FAILED",
        status: "FAILED",
      });
    }

    if (paymentGateway === "paypal") {
      if (!paypal_order_id) {
        return res.status(400).json({ message: "PayPal order ID is required for verification" });
      }

      try {
        const captureResponse = await getOrdersController().captureOrder({ id: paypal_order_id });
        const captureResult = JSON.parse(captureResponse.body as string);

        const newStatus = captureResult.status === "COMPLETED" ? "COMPLETED" : "FAILED";

        await db
          .update(transactions)
          .set({ status: newStatus, updatedAt: new Date() })
          .where(eq(transactions.productId, product_id));

        return res.status(200).json({
          message: `Transaction status updated to ${newStatus}`,
          status: newStatus,
        });
      } catch (error: any) {
        await db
          .update(transactions)
          .set({ status: "FAILED", updatedAt: new Date() })
          .where(eq(transactions.productId, product_id));

        return res.status(500).json({
          message: "Failed to capture PayPal payment",
          error: error.message || "Unknown error occurred",
        });
      }
    }

    if (paymentGateway === "esewa") {
      const paymentData = {
        product_code: process.env.ESEWA_MERCHANT_ID,
        total_amount: transaction.amount,
        transaction_uuid: transaction.productId,
      };

      const response = await axios.get(
        process.env.ESEWA_PAYMENT_STATUS_CHECK_URL as string,
        { params: paymentData }
      );

      const paymentStatusCheck = response.data;
      const newStatus = paymentStatusCheck.status === "COMPLETE" ? "COMPLETED" : "FAILED";

      await db
        .update(transactions)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(transactions.productId, product_id));

      return res.status(200).json({
        message: `Transaction status updated to ${newStatus}`,
        status: newStatus,
      });
    }

    if (paymentGateway === "khalti") {
      let paymentStatusCheck;
      try {
        const response = await axios.post(
          process.env.KHALTI_VERIFICATION_URL as string,
          { pidx },
          {
            headers: {
              Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
              "Content-Type": "application/json",
            },
          }
        );
        paymentStatusCheck = response.data;
      } catch (error: any) {
        if (error.response?.status === 400) {
          paymentStatusCheck = error.response.data;
        } else {
          throw error;
        }
      }

      const newStatus = paymentStatusCheck.status === "Completed" ? "COMPLETED" : "FAILED";

      await db
        .update(transactions)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(transactions.productId, product_id));

      return res.status(200).json({
        message: `Transaction status updated to ${newStatus}`,
        status: newStatus,
      });
    }

    return res.status(400).json({ message: "Invalid payment gateway" });
  } catch (error: any) {
    console.error("Error during payment status check:", error);
    return res.status(500).json({
      message: "Payment status check failed",
      error: error.response?.data || error.message,
    });
  }
};

export const webHook = async (req: Request, res: Response) => {
  try {
    const event = req.body;

    if (event.event_type === "PAYPAL.CAPTURE.COMPLETED") {
      const paypalOrderId = event.resource.supplementary_data.related_ids.order_id;

      const [transaction] = await db
        .select()
        .from(transactions)
        .where(
          and(
            eq(transactions.paypalOrderId, paypalOrderId),
            eq(transactions.status, "PENDING")
          )
        );

      if (transaction) {
        await db
          .update(transactions)
          .set({ status: "COMPLETED", updatedAt: new Date() })
          .where(eq(transactions.id, transaction.id));

        console.log(`[WEBHOOK] PayPal transaction ${transaction.productId} marked as COMPLETED.`);
      }
    }
    return res.status(200).send("Webhook Received");
  } catch (error) {
    console.error("WebHook Error: ", error);
    return res.status(500).send("Webhook processing failed.");
  }
};