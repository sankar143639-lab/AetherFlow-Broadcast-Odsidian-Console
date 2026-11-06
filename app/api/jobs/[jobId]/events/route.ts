/**
 * Next.js App Router API Route
 * GET /api/jobs/[jobId]/events
 * High-performance Server-Sent Events (SSE) streaming real-time worker progress,
 * FFmpeg encoding telemetry, and execution logs directly to frontend clients.
 */

import { SSEPipelineEvent } from '@/lib/types.ts';

// Shared in-memory event emitter hub for active job streams
type Subscriber = (event: SSEPipelineEvent) => void;
export const jobSubscribers = new Map<string, Set<Subscriber>>();

export function broadcastJobEvent(event: SSEPipelineEvent): void {
  const subscribers = jobSubscribers.get(event.jobId);
  if (subscribers) {
    subscribers.forEach((subscriber) => {
      try {
        subscriber(event);
      } catch (err) {
        console.error(`Failed to push SSE event to subscriber for job ${event.jobId}`, err);
      }
    });
  }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ jobId: string }> }
): Promise<Response> {
  const { jobId } = await context.params;

  if (!jobId) {
    return new Response(JSON.stringify({ error: 'Missing jobId parameter' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create an SSE ReadableStream
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Function to send formatted SSE frame
      const pushEvent = (event: SSEPipelineEvent) => {
        const payload = `event: ${event.type.toLowerCase()}\ndata: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(payload));
      };

      // Send initial connection handshake
      pushEvent({
        type: 'HEARTBEAT',
        jobId,
        stage: 'IDLE',
        percent: 0,
        timestamp: new Date().toISOString(),
      });

      // Register subscriber
      let subscribers = jobSubscribers.get(jobId);
      if (!subscribers) {
        subscribers = new Set<Subscriber>();
        jobSubscribers.set(jobId, subscribers);
      }
      subscribers.add(pushEvent);

      // Heartbeat interval to prevent client timeout
      const heartbeatTimer = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          clearInterval(heartbeatTimer);
        }
      }, 15000);

      // Cleanup when client disconnects or aborts
      request.signal.addEventListener('abort', () => {
        clearInterval(heartbeatTimer);
        const currentSubscribers = jobSubscribers.get(jobId);
        if (currentSubscribers) {
          currentSubscribers.delete(pushEvent);
          if (currentSubscribers.size === 0) {
            jobSubscribers.delete(jobId);
          }
        }
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable proxy buffering (Nginx / Cloudflare)
    },
  });
}
