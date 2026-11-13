/**
 * Read and preserve the original response bytes, stopping at the configured cap.
 * Fetch may decompress the body, so Content-Length is not a reliable byte bound.
 */
export async function readBoundedResponse(
  response: Response,
  maximumBytes: number,
  sizeError: string,
  minimumBytes = 0,
): Promise<Buffer> {
  const reader = response.body?.getReader();
  if (!reader) {
    if (minimumBytes) throw new Error(sizeError);
    return Buffer.alloc(0);
  }

  // Grow a bounded buffer instead of retaining a list of chunks: a response
  // split into many tiny chunks must not multiply bookkeeping memory.
  let bytes = Buffer.alloc(0);
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value.byteLength > maximumBytes - size) {
        // Request cancellation immediately without masking the size error if
        // the underlying stream cannot acknowledge cancellation.
        void reader.cancel().catch(() => {});
        throw new Error(sizeError);
      }
      const required = size + value.byteLength;
      if (required > bytes.length) {
        const next = Buffer.alloc(Math.min(maximumBytes, Math.max(65_536, required, bytes.length * 2)));
        bytes.copy(next, 0, 0, size);
        bytes = next;
      }
      bytes.set(value, size);
      size += value.byteLength;
    }
    if (size < minimumBytes) throw new Error(sizeError);
    return bytes.subarray(0, size);
  } finally {
    reader.releaseLock();
  }
}
