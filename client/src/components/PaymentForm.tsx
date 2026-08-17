import React, { useState } from "react";
import axios from "axios";
import { generateUniqueId } from "../utils/helpers";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import "./PaymentComponent.css";

interface PaymentFormData {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productName: string;
  amount: number | "";
  paymentGateway: "esewa" | "khalti" | "paypal";
}

const PaymentComponent: React.FC = () => {
  const [formData, setFormData] = useState<PaymentFormData>({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    productName: "",
    amount: "",
    paymentGateway: "esewa",
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID || "";

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" ? (value === "" ? "" : Number(value)) : value,
    }));
  };

  const selectGateway = (gateway: "esewa" | "khalti" | "paypal") => {
    setFormData((prev) => ({ ...prev, paymentGateway: gateway }));
  };

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.paymentGateway === "paypal") return;

    setIsSubmitting(true);
    try {
      const productId = generateUniqueId();
      sessionStorage.setItem("current_transaction_id", productId);

      const response = await axios.post("http://localhost:5000/api/initiate-payment", {
        ...formData,
        productId,
      });

      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        alert("Payment URL is invalid. Please try again.");
      }
    } catch (error) {
      console.error("Error initiating payment:", error);
      alert("Payment initiation failed. Please check your connection.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getButtonColor = () => {
    if (formData.paymentGateway === "esewa") return "#61B15A";
    if (formData.paymentGateway === "khalti") return "#5E338D";
    return "#111827";
  };

  return (
    <PayPalScriptProvider options={{ clientId: clientId, currency: "USD" }}>
      <div className="payment-wrapper">
        <div className="payment-header">
          <h2>Secure Checkout</h2>
          <p>Select your payment method and enter your details</p>
        </div>

        <form onSubmit={handleStandardSubmit}>
          <div className="input-group">
            <input
              type="text"
              name="customerName"
              className="cool-input"
              value={formData.customerName}
              onChange={handleChange}
              required
              placeholder="Full Name"
            />
          </div>

          <div className="input-group">
            <input
              type="email"
              name="customerEmail"
              className="cool-input"
              value={formData.customerEmail}
              onChange={handleChange}
              required
              placeholder="Email Address"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
            <input
              type="tel"
              name="customerPhone"
              className="cool-input"
              value={formData.customerPhone}
              onChange={handleChange}
              required
              placeholder="Phone Number"
            />
            <input
              type="number"
              name="amount"
              className="cool-input"
              value={formData.amount}
              onChange={handleChange}
              required
              min="1"
              placeholder="Amount (NPR)"
            />
          </div>

          <div className="input-group">
            <input
              type="text"
              name="productName"
              className="cool-input"
              value={formData.productName}
              onChange={handleChange}
              required
              placeholder="Product / Service Name"
            />
          </div>

          <p style={{ margin: "0 0 10px 2px", fontSize: "14px", fontWeight: "600", color: "#374151" }}>
            Payment Method
          </p>

          <div className="gateway-selector">
            <div
              className={`gateway-card esewa ${formData.paymentGateway === "esewa" ? "active" : ""}`}
              onClick={() => selectGateway("esewa")}
            >
              eSewa
            </div>
            <div
              className={`gateway-card khalti ${formData.paymentGateway === "khalti" ? "active" : ""}`}
              onClick={() => selectGateway("khalti")}
            >
              Khalti
            </div>
            <div
              className={`gateway-card paypal ${formData.paymentGateway === "paypal" ? "active" : ""}`}
              onClick={() => selectGateway("paypal")}
            >
              PayPal
            </div>
          </div>

          {formData.paymentGateway === "paypal" ? (
            <div className="paypal-container">
              {!clientId ? (
                <p style={{ color: "#ef4444", fontSize: "13px", textAlign: "center" }}>
                  Missing VITE_PAYPAL_CLIENT_ID in frontend .env
                </p>
              ) : (
                <PayPalButtons
                  style={{ layout: "vertical", shape: "rect", color: "blue" }}
                  createOrder={async () => {
                    const productId = generateUniqueId();
                    sessionStorage.setItem("current_transaction_id", productId);

                    const response = await axios.post("http://localhost:5000/api/initiate-payment", {
                      ...formData,
                      productId,
                    });
                    return response.data.id;
                  }}
                  onApprove={async (data) => {
                    const productId = sessionStorage.getItem("current_transaction_id");
                    try {
                      const response = await axios.post("http://localhost:5000/api/payment-status", {
                        product_id: productId,
                        paypal_order_id: data.orderID,
                      });

                      if (response.data.status === "COMPLETED") {
                        window.location.href = `/success?transaction_id=${productId}`;
                      } else {
                        alert("Payment verification failed.");
                      }
                    } catch (err) {
                      console.error(err);
                      alert("Error capturing payment.");
                    }
                  }}
                  onError={(err) => {
                    console.error("PayPal Error:", err);
                  }}
                />
              )}
            </div>
          ) : (
            <button
              type="submit"
              className="pay-btn"
              disabled={isSubmitting}
              style={{ backgroundColor: getButtonColor() }}
            >
              {isSubmitting
                ? "Processing..."
                : `Pay with ${formData.paymentGateway.charAt(0).toUpperCase() + formData.paymentGateway.slice(1)}`}
            </button>
          )}
        </form>
      </div>
    </PayPalScriptProvider>
  );
};

export default PaymentComponent;