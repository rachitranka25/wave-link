const DEVICE_ID_KEY = "wave-link-device-id";

function generateId(): string {
  return crypto.randomUUID();
}

/** This browser's persistent identity when it acts as a simulated relay
 * device flushing its offline queue through the real mesh sync protocol. */
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = generateId();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}

export function getQueue<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function enqueue<T>(key: string, item: T): T[] {
  const queue = [...getQueue<T>(key), item];
  localStorage.setItem(key, JSON.stringify(queue));
  return queue;
}

export function clearQueue(key: string): void {
  localStorage.removeItem(key);
}

export const REPORT_QUEUE_KEY = "wave-link-queued-reports";
export const MESSAGE_QUEUE_KEY = "wave-link-queued-messages";
export { generateId };
