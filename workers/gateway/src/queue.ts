import type { Env, QueuedMutation } from "./types.ts";
import { isQueuableMutationPath } from "./types.ts";

/**
 * Durable Object acting as an offline mutation queue for a school.
 */
export class SchoolSyncQueue {
  state: DurableObjectState;
  env: Env;

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    if (request.method === "POST" && url.pathname === "/enqueue") {
      try {
        const payload = (await request.json()) as QueuedMutation;
        const queue = (await this.state.storage.get<QueuedMutation[]>("queue")) || [];
        
        queue.push(payload);
        await this.state.storage.put("queue", queue);
        
        return new Response(JSON.stringify({ status: "queued", length: queue.length }), { 
          status: 202,
          headers: { "Content-Type": "application/json", "X-Served-From": "offline-queue" }
        });
      } catch (err) {
        return new Response("Bad Request", { status: 400 });
      }
    }

    if (request.method === "POST" && url.pathname === "/flush") {
      await this.flushQueue();
      return new Response(JSON.stringify({ status: "flushed" }), { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  }

  async flushQueue() {
    const queue = (await this.state.storage.get<QueuedMutation[]>("queue")) || [];
    if (queue.length === 0) return;

    const fetchImpl = this.env.fetch || fetch;
    const remainingQueue: QueuedMutation[] = [];

    for (const item of queue) {
      try {
        const upstreamUrl = new URL(item.path, this.env.UPSTREAM_API);
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
          "X-From-Offline-Queue": "true"
        };
        // Replay the original auth token so the upstream can authenticate
        // the delayed mutation just as it would an in-session request.
        if (item.authHeader) {
          headers["Authorization"] = item.authHeader;
        }
        const response = await fetchImpl(new Request(upstreamUrl.toString(), {
          method: item.method,
          headers,
          body: JSON.stringify(item.body)
        }));

        if (!response.ok && response.status >= 500) {
          // Upstream down, keep in queue
          remainingQueue.push(item);
        } else if (!response.ok && response.status < 500) {
           // Client error (4xx) - drop it or log it to DLQ (Dead Letter Queue)
           console.error("Queue item failed permanently:", item, response.status);
        }
        // Success -> dropped from queue
      } catch (err) {
        // Network error -> keep in queue
        remainingQueue.push(item);
      }
    }

    if (remainingQueue.length === 0) {
      await this.state.storage.delete("queue");
    } else {
      await this.state.storage.put("queue", remainingQueue);
    }
  }
}

/**
 * Handle POST/PUT/DELETE requests.
 * Tries upstream first. If upstream fails (offline), enqueues it.
 */
export async function handleMutation(req: Request, env: Env, url: URL, userId: string, schoolId: string): Promise<Response> {
  const fetchImpl = env.fetch || fetch;
  const upstreamUrl = new URL(url.pathname + url.search, env.UPSTREAM_API);

  // We need the body for both upstream and queueing
  let bodyText = "";
  try {
     bodyText = await req.text();
  } catch (e) {}

  try {
    // Try online mutation
    const response = await fetchImpl(new Request(upstreamUrl.toString(), {
      method: req.method,
      headers: req.headers,
      body: bodyText || undefined
    }));

    if (response.ok) {
       // Online mutation succeeded, maybe trigger a flush of any existing queue
       // In a real system you'd want to be careful with ordering here.
       return response;
    }
    
    // Upstream returned an error (e.g. 502 Bad Gateway), assume offline and fall through
    throw new Error(`Upstream error: ${response.status}`);
  } catch (err) {
    // We are offline. Can we queue this?
    if (isQueuableMutationPath(url.pathname)) {
        
        // Convert request into a queue item
        const payload: QueuedMutation = {
           id: crypto.randomUUID(),
           schoolId,
           userId,
           method: req.method,
           path: url.pathname + url.search,
           body: bodyText ? JSON.parse(bodyText) : null,
           timestamp: Date.now(),
           // Store the original auth token so flushQueue() can replay it
           authHeader: req.headers.get("Authorization") || undefined
        };

        // Get DO instance for this school
        const id = env.SYNC_QUEUE.idFromName(schoolId);
        const obj = env.SYNC_QUEUE.get(id);

        // Enqueue
        const queueRes = await obj.fetch(new Request("http://do/enqueue", {
            method: "POST",
            body: JSON.stringify(payload),
            headers: { "Content-Type": "application/json" }
        }));

        return queueRes;
    }
    
    // Cannot queue
    return new Response(JSON.stringify({ error: "Offline: changes can't be saved yet." }), {
       status: 503,
       headers: { "Content-Type": "application/json" }
    });
  }
}
