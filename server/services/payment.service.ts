import {
  createTransaction,
  getTransactionByProductId,
  updateTransactionStatus,
  getPendingTransactionByPaypalId,
} from "../repositories/transaction.repository.js";
import {
  initiatePaypalOrder,
  capturePaypalOrder,
  generateEsewaConfig,
  checkEsewaStatus,
  initiateKhaltiPayment,
  verifyKhaltiPayment,
} from "../providers/payment.providers.js";

export const processPaymentInitiation = async (data: any) => {
  const { amount, productId, paymentGateway, customerName, customerEmail, customerPhone, productName } = data;

  if (paymentGateway === "paypal") {
    const paypalOrder = await initiatePaypalOrder(amount, productId, productName);
    
    await createTransaction({
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

    return { id: paypalOrder.id, status: paypalOrder.status };
  } 
  
  if (paymentGateway === "esewa") {
    const esewaConfig = generateEsewaConfig(amount, productId);
    
    await createTransaction({
      productId,
      productName,
      amount: amount.toString(),
      paymentGateway: "esewa",
      status: "PENDING",
      customerName,
      customerEmail,
      customerPhone,
    });

    return { url: esewaConfig.url, data: esewaConfig.data };
  } 
  
  if (paymentGateway === "khalti") {
    const khaltiPayment = await initiateKhaltiPayment(amount, productId, productName, customerPhone);
    
    await createTransaction({
      productId,
      productName,
      amount: amount.toString(),
      paymentGateway: "khalti",
      status: "PENDING",
      customerName,
      customerEmail,
      customerPhone,
      pidx: khaltiPayment.pidx,
    });

    return { url: khaltiPayment.payment_url };
  }

  throw new Error("Invalid payment gateway.");
};

export const verifyPaymentStatus = async (productId: string, status: string, pidx?: string, paypalOrderId?: string) => {
  const transaction = await getTransactionByProductId(productId);
  if (!transaction) throw new Error("Transaction not found");

  if (transaction.status !== "PENDING") {
    return { status: transaction.status, message: `Transaction already ${transaction.status}` };
  }

  if (status === "FAILED") {
    await updateTransactionStatus(transaction.id, "FAILED");
    return { status: "FAILED", message: "Transaction status updated to FAILED" };
  }

  const { paymentGateway, amount } = transaction;

  if (paymentGateway === "paypal") {
    if (!paypalOrderId) throw new Error("PayPal order ID is required for verification");
    const captureResult = await capturePaypalOrder(paypalOrderId);
    const newStatus = captureResult.status === "COMPLETED" ? "COMPLETED" : "FAILED";
    await updateTransactionStatus(transaction.id, newStatus);
    return { status: newStatus, message: `Transaction status updated to ${newStatus}` };
  }

  if (paymentGateway === "esewa") {
    const checkResult = await checkEsewaStatus(amount, productId);
    const newStatus = checkResult.status === "COMPLETE" ? "COMPLETED" : "FAILED";
    await updateTransactionStatus(transaction.id, newStatus);
    return { status: newStatus, message: `Transaction status updated to ${newStatus}` };
  }

  if (paymentGateway === "khalti") {
    if (!pidx) throw new Error("Khalti PIDX is required for verification");
    const checkResult = await verifyKhaltiPayment(pidx);
    const newStatus = checkResult.status === "Completed" ? "COMPLETED" : "FAILED";
    await updateTransactionStatus(transaction.id, newStatus);
    return { status: newStatus, message: `Transaction status updated to ${newStatus}` };
  }

  throw new Error("Invalid payment gateway for verification");
};

export const processPaypalWebhook = async (paypalOrderId: string) => {
  const transaction = await getPendingTransactionByPaypalId(paypalOrderId);
  if (transaction) {
    await updateTransactionStatus(transaction.id, "COMPLETED");
    console.log(`[WEBHOOK] PayPal transaction ${transaction.productId} marked as COMPLETED.`);
  }
};