import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios, { AxiosError } from "axios";
import { base64Decode } from "../utils/helpers";

interface DecodedEsewaData {
  transaction_uuid?: string;
  total_amount?: string;
  status?: string;
}

const Success: React.FC = () => {
  const [paymentStatus, setPaymentStatus] = useState<"COMPLETED" | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [verificationError, setVerificationError] = useState<boolean>(false);

  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = new URLSearchParams(location.search);

  // 1. Extract query parameters across all three gateways
  const token = queryParams.get("data"); // eSewa encoded token
  const pidx = queryParams.get("pidx"); // Khalti PIDX
  const purchaseOrderId = queryParams.get("purchase_order_id"); // Khalti purchase_order_id
  const transactionIdParam = queryParams.get("transaction_id"); // PayPal / Generic transaction_id

  // 2. Decode eSewa payload if available
  const decoded: DecodedEsewaData | null = token ? base64Decode(token) : null;

  // 3. Resolve the unified transaction/product ID
  const product_id =
    decoded?.transaction_uuid || purchaseOrderId || transactionIdParam;

  // 4. Identify the active gateway
  const isEsewa = Boolean(token);
  const isKhalti = Boolean(pidx);
  const isPayPal = Boolean(transactionIdParam && !token && !pidx);

  const gatewayName = isPayPal
    ? "PayPal"
    : isKhalti
    ? "Khalti"
    : isEsewa
    ? "eSewa"
    : "Online Payment";

  // 5. Parse Amount (Khalti amounts are in paisa -> divide by 100)
  const rawAmountString =
    decoded?.total_amount ||
    queryParams.get("total_amount") ||
    queryParams.get("amount");

  const rawAmount = Number(rawAmountString) || 0;
  const total_amount = isKhalti ? rawAmount / 100 : rawAmount;

  useEffect(() => {
    const verifyPaymentAndUpdateStatus = async () => {
      if (!product_id) {
        setIsLoading(false);
        setVerificationError(true);
        return;
      }

      // PayPal is already captured in PaymentComponent before redirection
      if (isPayPal) {
        setPaymentStatus("COMPLETED");
        setIsLoading(false);
        return;
      }

      // eSewa & Khalti require backend verification on landing
      try {
        const response = await axios.post<{ status: string }>(
          "http://localhost:5000/api/payment-status",
          {
            product_id,
            pidx,
          }
        );

        if (response.status === 200) {
          setIsLoading(false);

          if (response.data.status === "COMPLETED") {
            setPaymentStatus("COMPLETED");
          } else {
            navigate(`/payment-failure?purchase_order_id=${product_id}`);
            return;
          }
        }
      } catch (error) {
        const axiosError = error as AxiosError;
        console.error("Error confirming payment:", axiosError);
        setIsLoading(false);
        setVerificationError(true);

        if (axiosError.response?.status === 400) {
          navigate(`/payment-failure?purchase_order_id=${product_id}`);
        }
      }
    };

    verifyPaymentAndUpdateStatus();
  }, [product_id, pidx, isPayPal, navigate]);

  if (isLoading) return <div className="loading-container">Loading...</div>;

  if (verificationError) {
    return (
      <div className="error-container">
        <h1>Oops! Error occurred on confirming payment</h1>
        <h2>We will resolve it soon.</h2>
        <p>
          Your transaction is being processed, but we couldn't verify its
          status.
        </p>
        <p>
          If the amount was deducted from your account, please contact our
          support team.
        </p>
        <p>
          Reference ID: {product_id || pidx || "Unknown"}
        </p>
        <button onClick={() => navigate("/")} className="go-home-button">
          Go to Homepage
        </button>
      </div>
    );
  }

  return (
    <div className="success-container">
      <div className="status-icon success">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="48"
          height="48"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      </div>
      <h1>Payment Successful!</h1>
      <p>Thank you for your payment. Your transaction was successful.</p>

      <div className="transaction-details">
        <h3>Transaction Details</h3>
        {total_amount > 0 && (
          <p>
            <strong>Amount Paid:</strong> NPR {total_amount}
          </p>
        )}
        <p>
          <strong>Transaction ID:</strong> {product_id}
        </p>
        {paymentStatus === "COMPLETED" && (
          <>
            <p>
              <strong>Payment Method:</strong> {gatewayName}
            </p>
            <p>
              <strong>Status:</strong> Completed
            </p>
          </>
        )}
      </div>

      <button onClick={() => navigate("/")} className="go-home-button">
        Go to Homepage
      </button>
    </div>
  );
};

export default Success;