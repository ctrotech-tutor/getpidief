"use client";

type Update = { id: string; following: boolean; pending: boolean; failed?: boolean };
const listeners = new Set<(update: Update) => void>();
const pending = new Map<string, boolean>();
export const pendingFollow = (id: string) => pending.get(id);
export function subscribeFollow(listener: (update: Update) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }
function publish(update: Update) { for (const listener of listeners) listener(update); }
export function startFollow(id: string, following: boolean): boolean {
  if (pending.has(id)) return false;
  pending.set(id, following); publish({ id, following, pending: true }); return true;
}
export function finishFollow(id: string, following: boolean, failed = false) {
  pending.delete(id); publish({ id, following, pending: false, failed });
}
