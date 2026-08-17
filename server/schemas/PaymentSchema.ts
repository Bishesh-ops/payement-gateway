import { z } from "zod";

export const initiatePaymentSchema = z.object({
  body: z.object({
    amount: z
      .number()
      .positive({ error: "Amount must be greater than 0" }),
    productId: z.string().min(1, { error: "Product ID cannot be empty" }),
    paymentGateway: z.enum(["esewa", "khalti", "paypal"]).refine(
      (val) => ["esewa", "khalti", "paypal"].includes(val),
      { error: "Invalid payment gateway. Must be esewa, khalti, or paypal" }
    ),
    customerName: z.string().min(2, { error: "Name must be at least 2 characters" }),
    customerEmail: z.email({ error: "Invalid email address" }),
    customerPhone: z.string().min(7, { error: "Phone number is too short" }),
    productName: z.string().min(1, { error: "Product name is required" }),
  }),
});

// Schema for the /payment-status route
export const paymentStatusSchema = z.object({
  body: z.object({
    product_id: z.string(),
    pidx: z.string().optional(),
    paypal_order_id: z.string().optional(),
    status: z.string().optional(),
  }),
});