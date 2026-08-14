import React, { useState } from "react";
import axios from "axios";
import { generateUniqueId } from "../utils/helpers";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "amount" ? Number(value) : value,
    }));
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
      alert("Payment failed. Please check the console for details.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <PayPalScriptProvider options={{ clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || "test" }}>
      <div style={{ maxWidth: "500px", margin: "40px auto", padding: "30px", borderRadius: "10px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", fontFamily: "system-ui, sans-serif" }}>
        <h2 style={{ textAlign: "center", marginBottom: "10px", color: "#333" }}>Secure Checkout</h2>
        <p style={{ textAlign: "center", marginBottom: "30px", color: "#666", fontSize: "14px" }}>Fill in your details to proceed with the payment</p>

        <form onSubmit={handleStandardSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <input
            type="text"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            required
            placeholder="Full Name"
            style={{ padding: "12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "15px" }}
          />
          <input
            type="email"
            name="customerEmail"
            value={formData.customerEmail}
            onChange={handleChange}
            required
            placeholder="Email Address"
            style={{ padding: "12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "15px" }}
          />
          <input
            type="tel"
            name="customerPhone"
            value={formData.customerPhone}
            onChange={handleChange}
            required
            placeholder="Phone Number"
            style={{ padding: "12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "15px" }}
          />
          <input
            type="text"
            name="productName"
            value={formData.productName}
            onChange={handleChange}
            required
            placeholder="Product/Service Name"
            style={{ padding: "12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "15px" }}
          />
          <input
            type="number"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            required
            min="1"
            placeholder="Amount (NPR)"
            style={{ padding: "12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "15px" }}
          />
          <select
            name="paymentGateway"
            value={formData.paymentGateway}
            onChange={handleChange}
            required
            style={{ padding: "12px", borderRadius: "6px", border: "1px solid #ccc", fontSize: "15px", backgroundColor: "#fff" }}
          >
            <option value="esewa">eSewa</option>
            <option value="khalti">Khalti</option>
            <option value="paypal">PayPal</option>
          </select>

          {formData.paymentGateway === "paypal" ? (
            <div style={{ marginTop: "10px" }}>
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
                  console.error("PayPal UI Error:", err);
                  alert("Something went wrong with PayPal.");
                }}
              />
            </div>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                padding: "14px",
                backgroundColor: formData.paymentGateway === "esewa" ? "#61B15A" : "#5E338D",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "16px",
                fontWeight: "600",
                cursor: isSubmitting ? "not-allowed" : "pointer",
                opacity: isSubmitting ? 0.7 : 1,
                marginTop: "10px",
                transition: "background-color 0.2s"
              }}
            >
              {isSubmitting ? "Processing..." : `Pay securely with ${formData.paymentGateway.charAt(0).toUpperCase() + formData.paymentGateway.slice(1)}`}
            </button>
          )}
        </form>
      </div>
    </PayPalScriptProvider>
  );
};

export default PaymentComponent;