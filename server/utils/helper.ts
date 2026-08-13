import { createHmac, randomUUID } from "crypto";
import axios from "axios";

function generateUniqueId(){
    return `id-${randomUUID()}`;
}

function generateHmacSha256Hash(data: string, secret: string): string {
    if (!data || !secret) {
        throw new Error("Data and secret are required for HMAC SHA256 hashing.");
    }
    const hash = createHmac("sha256", secret)
        .update(data)
        .digest("base64");
    return hash;

}

const convertNprToUsd = async (amountInNpr: number): Promise<string> => {
    try{
        const response = await axios.get("https://open.er-api.com/v6/latest/USD");
        const UsdRate = response.data.rates.NPR;
        return (amountInNpr / UsdRate).toFixed(2);
    } catch (error) {
        console.error("Error converting NPR to USD:", error);
        throw new Error("Failed to convert currency");
    }
}

export { generateUniqueId, generateHmacSha256Hash, convertNprToUsd };