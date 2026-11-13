import { ReadableStream } from 'node:stream/web';
import { describe, expect, it, vi } from 'vitest';
import { readBoundedResponse } from './readBoundedResponse';

describe('readBoundedResponse', () => {
  it('preserves the original bytes across chunks at the exact cap', async () => {
    const response = new Response(new ReadableStream({
      start(controller) {
        controller.enqueue(Uint8Array.of(0, 255));
        controller.enqueue(Uint8Array.of(128, 10));
        controller.close();
      },
    }));
    expect(await readBoundedResponse(response, 4, 'source size invalid', 4))
      .toEqual(Buffer.from([0, 255, 128, 10]));
  });

  it.each([undefined, '2'])('cancels on actual overflow with Content-Length %s', async (contentLength) => {
    let produced = 0;
    const cancel = vi.fn();
    const response = new Response(new ReadableStream({
      pull(controller) {
        produced++;
        controller.enqueue(Uint8Array.of(10, 11));
      },
      cancel,
    }, { highWaterMark: 0 }), { headers: contentLength ? { 'Content-Length': contentLength } : {} });

    await expect(readBoundedResponse(response, 3, 'source size invalid')).rejects.toThrow('source size invalid');
    expect(produced).toBe(2);
    expect(cancel).toHaveBeenCalledOnce();
    expect(response.body?.locked).toBe(false);
  });

  it('retains the existing minimum-size failure for empty bodies', async () => {
    await expect(readBoundedResponse(new Response(null), 10, 'source size invalid', 1))
      .rejects.toThrow('source size invalid');
  });

  it('preserves an abort failure and releases the stream lock', async () => {
    const failure = new DOMException('Cancelled', 'AbortError');
    const response = new Response(new ReadableStream({ start: controller => controller.error(failure) }));
    await expect(readBoundedResponse(response, 4, 'source size invalid')).rejects.toBe(failure);
    expect(response.body?.locked).toBe(false);
  });
});
