import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Category } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
};

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

/**
 * Risolve un riferimento a categoria (ID o nome legacy) alla Category corrispondente.
 *
 * Compatibilità retroattiva: le vecchie transazioni salvavano il *nome* della categoria
 * nel campo `category`; quelle nuove (post-migrazione) salvano l'*ID* del documento.
 * Questa funzione prova prima l'ID, poi il nome, in modo da supportare entrambi i casi
 * senza richiedere che la migrazione one-shot sia già completata.
 *
 * Usare questa funzione ovunque si dereferenzia `t.category` → Category invece di
 * duplicare inline `categories.find(c => c.id === …) || categories.find(c => c.name === …)`.
 */
export function resolveCategory(categoryRef: string, cats: Category[]): Category | undefined {
  if (!categoryRef) return undefined;

  // 1. Match esatto per ID
  const byId = cats.find(c => c.id === categoryRef);
  if (byId) return byId;

  // 2. Match esatto per nome
  const byName = cats.find(c => c.name === categoryRef);
  if (byName) return byName;

  // 3. Match case-insensitive + trim
  const norm = categoryRef.trim().toLowerCase();
  const byNorm = cats.find(c => c.name.trim().toLowerCase() === norm);
  if (byNorm) return byNorm;

  // 4. Match parziale (es. "Mangiar fuori/bar" → "Mangiar fuori")
  const byPartial = cats.find(c =>
    norm.startsWith(c.name.trim().toLowerCase()) ||
    c.name.trim().toLowerCase().startsWith(norm)
  );
  return byPartial;
}

/**
 * Logs a Firestore error to the console.
 * Does NOT re-throw: callers already handle UI feedback (toast) and control
 * flow. Re-throwing caused dead code after the call site in snapshot error
 * handlers and unhandled promise rejections in async CRUD callbacks.
 */
export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const msg = error instanceof Error ? error.message : String(error);
  console.error("Firestore Error:", operationType, path, msg);
}
