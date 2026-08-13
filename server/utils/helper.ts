import { createHmac, randomUUID } from "crypto";

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

export { generateUniqueId, generateHmacSha256Hash };