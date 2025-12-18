/**
 * Converts a Uint8Array to base64 using chunked processing.
 * Handles files up to 20MB+ without stack overflow.
 */
export function arrayBufferToBase64(buffer: Uint8Array): string {
  // Try native method first (available in modern browsers since Sept 2025)
  if (typeof (buffer as any).toBase64 === 'function') {
    try {
      return (buffer as any).toBase64();
    } catch (error) {
      console.warn('Native toBase64() failed, using fallback:', error);
    }
  }

  // Fallback: Process in 8KB chunks to avoid stack overflow
  const CHUNK_SIZE = 8192;
  let result = '';

  for (let i = 0; i < buffer.length; i += CHUNK_SIZE) {
    const chunk = buffer.subarray(i, i + CHUNK_SIZE);
    result += String.fromCharCode.apply(null, chunk as any);
  }

  return btoa(result);
}

/**
 * Converts base64 string back to Uint8Array.
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
  if (typeof (Uint8Array as any).fromBase64 === 'function') {
    try {
      return (Uint8Array as any).fromBase64(base64);
    } catch (error) {
      console.warn('Native fromBase64() failed, using fallback:', error);
    }
  }

  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);

  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  return bytes;
}
