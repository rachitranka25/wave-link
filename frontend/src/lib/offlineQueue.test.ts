import { beforeEach, describe, expect, it } from "vitest";
import { clearQueue, enqueue, generateId, getDeviceId, getQueue } from "./offlineQueue";

beforeEach(() => {
  localStorage.clear();
});

describe("getDeviceId", () => {
  it("generates a device id and persists it", () => {
    const first = getDeviceId();
    expect(first).toBeTruthy();
    expect(localStorage.getItem("wave-link-device-id")).toBe(first);
  });

  it("returns the same id on subsequent calls", () => {
    const first = getDeviceId();
    const second = getDeviceId();
    expect(second).toBe(first);
  });
});

describe("generateId", () => {
  it("generates unique ids", () => {
    expect(generateId()).not.toBe(generateId());
  });
});

describe("queue helpers", () => {
  const KEY = "test-queue";

  it("starts empty", () => {
    expect(getQueue(KEY)).toEqual([]);
  });

  it("enqueues items and persists them", () => {
    enqueue(KEY, { text: "first" });
    const queue = enqueue(KEY, { text: "second" });

    expect(queue).toEqual([{ text: "first" }, { text: "second" }]);
    expect(getQueue(KEY)).toEqual([{ text: "first" }, { text: "second" }]);
  });

  it("clears the queue", () => {
    enqueue(KEY, { text: "first" });
    clearQueue(KEY);
    expect(getQueue(KEY)).toEqual([]);
  });

  it("keeps separate queues isolated by key", () => {
    enqueue("queue-a", { text: "a" });
    enqueue("queue-b", { text: "b" });

    expect(getQueue("queue-a")).toEqual([{ text: "a" }]);
    expect(getQueue("queue-b")).toEqual([{ text: "b" }]);
  });
});
