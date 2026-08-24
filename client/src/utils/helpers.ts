export function generateUniqueId() {
  return `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export function base64Decode<T>(base64: string | null): T | null {
  if (!base64) {
    console.error("Base64 string is null or undefined");
    return null;
  }
  try {
    const standardBase64 = base64.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(standardBase64);
    
    return JSON.parse(decoded) as T; 
  } catch (error) {
    console.error("Error decoding base64 string:", error);
    return null;
  }
}