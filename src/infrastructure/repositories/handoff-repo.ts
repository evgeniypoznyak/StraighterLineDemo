import type { DownstreamRecord } from "@/src/domain/handoff";

/**
 * Separate in-memory store for downstream handoff records. Decoupled from the
 * application aggregate: different shape, no SSN, no DOB, no address.
 *
 * Downstream consumers (review queue, notification worker, audit) read from
 * here. They should never need to touch the full Application.
 */
const store = new Map<string, DownstreamRecord>();

export const handoffRepo = {
  enqueue(record: DownstreamRecord): void {
    store.set(record.applicationId, record);
  },
  all(): DownstreamRecord[] {
    return Array.from(store.values());
  },
  count(): number {
    return store.size;
  },
  clear(): void {
    store.clear();
  },
};
