import axios from "axios";
import { convertNprToUsd, generateHmacSha256Hash } from "../utils/helper.js";
import { CheckoutPaymentIntent, Client, Environment, LogLevel, OrdersController } from "@paypal/paypal-server-sdk";

let cachedOrdersController: OrdersController | null = null;
const getOrdersController = (): OrdersController => {
  if (cachedOrdersController) return cachedOrdersController;
  const paypalClient = new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: process.env.PAYPAL_CLIENT_ID as string,
      oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET as string,
    },
    timeout: 0,
    environment: Environment.Sandbox,
    logging: { logLevel: LogLevel.Info, logRequest: { logBody: true }, logResponse: { logHeaders: true } },
  });
  cachedOrdersController = new OrdersController(paypalClient);
  return cachedOrdersController;
};


export const initiatePaypalOrder = async (amount: number, productId: string, productName: string) => {
  const orderRequest = {
    body: {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [{
        amount: { currencyCode: "USD", value: await convertNprToUsd(amount) },
        referenceId: productId,
        description: productName,
      }],
    },
  };
  const { body } = await getOrdersController().createOrder(orderRequest);
  return JSON.parse(body as string);
};

export const capturePaypalOrder = async (paypalOrderId: string) => {
  const captureResponse = await getOrdersController().captureOrder({ id: paypalOrderId });
  return JSON.parse(captureResponse.body as string);
};

export const generateEsewaConfig = (amount: number, productId: string) => {
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

  return {
    url: process.env.ESEWA_PAYMENT_URL as string,
    data: { ...paymentData, signature },
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  };
};

export const checkEsewaStatus = async (amount: string, productId: string) => {
  const url = `${process.env.ESEWA_PAYMENT_STATUS_CHECK_URL}?product_code=${process.env.ESEWA_MERCHANT_ID}&total_amount=${amount}&transaction_uuid=${productId}`;
  const response = await axios.get(url);
  return response.data;
};

export const initiateKhaltiPayment = async (amount: number, productId: string, productName: string, phone: string) => {
  const response = await axios.post(
    process.env.KHALTI_PAYMENT_URL as string,
    {
      amount: amount * 100, // paisa
      mobile: phone,
      product_identity: productId,
      product_name: productName,
      return_url: process.env.SUCCESS_URL,
      failure_url: process.env.FAILURE_URL,
      public_key: process.env.KHALTI_PUBLIC_KEY,
      website_url: "http://localhost:5173",
      purchase_order_id: productId,
      purchase_order_name: productName,
    },
    {
      headers: {
        Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );
  return response.data;
};

export const verifyKhaltiPayment = async (pidx: string) => {
  const response = await axios.post(
    process.env.KHALTI_VERIFICATION_URL as string,
    { pidx },
    { headers: { Authorization: `Key ${process.env.KHALTI_SECRET_KEY}`, "Content-Type": "application/json" } }
  );
  return response.data;
};