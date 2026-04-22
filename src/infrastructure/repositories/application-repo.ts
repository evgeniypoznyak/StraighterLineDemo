import type { Application } from "@/src/domain/application";

/**
 * In-memory store of full application aggregates. Holds PII.
 *
 * A module-scoped Map persists across calls within a single Next.js server
 * process. This is fine for the take-home (per spec: in-memory only). In
 * production this would be a database with encryption at rest.
 */
const store = new Map<string, Application>();

export const applicationRepo = {
  save(app: Application): void {
    store.set(app.id, app);
  },
  findById(id: string): Application | undefined {
    return store.get(id);
  },
  count(): number {
    return store.size;
  },
  clear(): void {
    store.clear();
  },
};
