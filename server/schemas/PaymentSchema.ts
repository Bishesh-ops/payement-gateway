import { z } from "zod";

export const initiatePaymentSchema = z.object({
  amount: z
    .number({ error: "Valid amount is required" })
    .positive({ error: "Amount must be greater than 0" })
    .min(10, { error: "Amount cannot be lower than Rs. 10" }),
  productId: z.string().min(1, { error: "Product ID cannot be empty" }),
  paymentGateway: z.string(),
  customerName: z.string().min(2, { error: "Name must be at least 2 characters" }),
  customerEmail: z.email({ error: "Invalid email address" }),
  customerPhone: z.string().min(7, { error: "Phone number is too short" }),
  productName: z.string().min(1, { error: "Product name is required" }),
});
export type InitiatePaymentBody = z.infer<typeof initiatePaymentSchema>;
// Schema for the /payment-status route
export const paymentStatusSchema = z.object({
  product_id: z.string(),
  pidx: z.string().optional(),
  paypal_order_id: z.string().optional(),
  status: z.string(),
});
export type PaymentStatusBody = z.infer<typeof paymentStatusSchema>;
