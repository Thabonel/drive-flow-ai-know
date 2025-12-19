/**
 * Converts Uint8Array to base64 using native browser/Deno APIs.
 * Handles files of any size efficiently by processing in chunks.
 */
export function arrayBufferToBase64(buffer: Uint8Array): string {
  // Convert Uint8Array to binary string
  let binaryString = '';
  const chunkSize = 8192;
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.subarray(i, Math.min(i + chunkSize, buffer.length));
    binaryString += String.fromCharCode(...chunk);
  }
  // Use native btoa for base64 encoding
  return btoa(binaryString);
}

/**
 * Converts base64 string back to Uint8Array using native browser/Deno APIs.
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
  // Use native atob for base64 decoding
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
