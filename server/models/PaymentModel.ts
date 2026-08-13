import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITransaction extends Document {
    customerDetails: {
        name: string;
        email: string;
        phone: string;
    },
    product_name: string;
    product_id: string;
    amount: number;
    payment_gateway: "esewa" | "khalti" | "paypal";
    status: "PENDING" | "COMPLETED" | "FAILED" | "REFUNDED";
}

const transactionSchema: Schema<ITransaction> = new Schema({
    customerDetails: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true },
    },
    product_name: { type: String, required: true },
    product_id: { type: String, required: true },
    amount: { type: Number, required: true },
    payment_gateway: { type: String, enum: ["esewa", "khalti", "paypal"], required: true },
    status: { type: String, enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"], default: "PENDING" }
}, {
    timestamps: true
});

const Transaction: Model<ITransaction> = mongoose.model<ITransaction>("Transaction", transactionSchema);

export default Transaction;
