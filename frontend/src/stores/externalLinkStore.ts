import { create } from "zustand";

export type ExternalLinkKind = "url" | "mail" | "phone";

export interface ExternalLinkRequest {
  url: string;
  kind: ExternalLinkKind;
  resolve: (opened: boolean) => void;
}

interface ExternalLinkState {
  pending: ExternalLinkRequest | null;
  request: (request: ExternalLinkRequest) => void;
  clear: () => void;
}

/**
 * Central gate for every URL that leaves the app. Components call
 * `openExternal()` and this store keeps the request alive while the
 * confirmation dialog is open. Keeping the resolver here means the caller can
 * await the user's decision without duplicating modal state in every page.
 */
export const useExternalLinkStore = create<ExternalLinkState>((set) => ({
  pending: null,
  request: (pending) => set({ pending }),
  clear: () => set({ pending: null }),
}));
