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

const RATE_CACHE_TTL_MS = 5 * 60 * 1000; 
let cachedRate: { value: number; fetchedAt: number } | null = null;

const getNprPerUsd = async (): Promise<number> => {
    const isFresh = cachedRate && Date.now() - cachedRate.fetchedAt < RATE_CACHE_TTL_MS;
    if (isFresh) {
        return cachedRate!.value;
    }

    try {
        const response = await axios.get("https://open.er-api.com/v6/latest/USD", {
            timeout: 5000,
        });
        const rate = response.data.rates.NPR;
        cachedRate = { value: rate, fetchedAt: Date.now() };
        return rate;
    } catch (error) {
        if (cachedRate) {
            console.error("Exchange rate refresh failed, using cached rate:", error);
            return cachedRate.value;
        }
        console.error("Error fetching NPR/USD exchange rate:", error);
        throw new Error("Failed to convert currency");
    }
};

const convertNprToUsd = async (amountInNpr: number): Promise<string> => {
    const usdRate = await getNprPerUsd();
    return (amountInNpr / usdRate).toFixed(2);
}

export { generateUniqueId, generateHmacSha256Hash, convertNprToUsd };