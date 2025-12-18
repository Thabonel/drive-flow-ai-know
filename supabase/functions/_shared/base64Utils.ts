import { encodeBase64, decodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";

/**
 * Converts Uint8Array to base64 using Deno standard library.
 * Handles files of any size efficiently.
 */
export function arrayBufferToBase64(buffer: Uint8Array): string {
  return encodeBase64(buffer);
}

/**
 * Converts base64 string back to Uint8Array.
 */
export function base64ToArrayBuffer(base64: string): Uint8Array {
  return decodeBase64(base64);
}
