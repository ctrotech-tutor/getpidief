import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ─────────────────────────────────────────────────────────────────────────────
// UI STORE — global modal, toast, sidebar state
// ─────────────────────────────────────────────────────────────────────────────

interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  description?: string;
  duration?: number;
}

interface UIState {
  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Command palette
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;

  // Toasts
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;

  // Modals
  shareModalDocumentId: string | null;
  setShareModalDocumentId: (id: string | null) => void;
  reportModalDocumentId: string | null;
  setReportModalDocumentId: (id: string | null) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: false,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  commandPaletteOpen: false,
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),

  toasts: [],
  addToast: (toast) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts.slice(-2), { ...toast, id }] }));
    // Auto-dismiss
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, toast.duration ?? 4000);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  shareModalDocumentId: null,
  setShareModalDocumentId: (id) => set({ shareModalDocumentId: id }),
  reportModalDocumentId: null,
  setReportModalDocumentId: (id) => set({ reportModalDocumentId: id }),
}));

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION STORE — unread count + realtime list
// ─────────────────────────────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  metadata: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

interface NotificationState {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  resetUnread: () => void;
  realtimeNotifications: NotificationItem[];
  addRealtimeNotification: (n: NotificationItem) => void;
  markAllRead: () => void;
}

export const useNotificationStore = create<NotificationState>()((set) => ({
  unreadCount: 0,
  setUnreadCount: (count) => set({ unreadCount: count }),
  incrementUnread: () => set((s) => ({ unreadCount: s.unreadCount + 1 })),
  resetUnread: () => set({ unreadCount: 0 }),
  realtimeNotifications: [],
  addRealtimeNotification: (n) =>
    set((s) => ({
      realtimeNotifications: [n, ...s.realtimeNotifications].slice(0, 50),
      unreadCount: s.unreadCount + 1,
    })),
  markAllRead: () =>
    set((s) => ({
      unreadCount: 0,
      realtimeNotifications: s.realtimeNotifications.map((n) => ({ ...n, isRead: true })),
    })),
}));

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD STORE — upload queue and progress
// ─────────────────────────────────────────────────────────────────────────────

type UploadStatus = "queued" | "uploading" | "processing" | "complete" | "error";

interface UploadItem {
  id: string;
  file: File;
  documentId?: string;
  status: UploadStatus;
  progress: number; // 0–100
  error?: string;
  uploadedUrl?: string;
}

interface UploadState {
  uploads: UploadItem[];
  addUpload: (file: File) => string;
  updateUpload: (id: string, update: Partial<UploadItem>) => void;
  removeUpload: (id: string) => void;
  clearCompleted: () => void;
}

export const useUploadStore = create<UploadState>()((set) => ({
  uploads: [],
  addUpload: (file) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({
      uploads: [...s.uploads, { id, file, status: "queued", progress: 0 }],
    }));
    return id;
  },
  updateUpload: (id, update) =>
    set((s) => ({
      uploads: s.uploads.map((u) => (u.id === id ? { ...u, ...update } : u)),
    })),
  removeUpload: (id) =>
    set((s) => ({ uploads: s.uploads.filter((u) => u.id !== id) })),
  clearCompleted: () =>
    set((s) => ({
      uploads: s.uploads.filter((u) => u.status !== "complete"),
    })),
}));

// ─────────────────────────────────────────────────────────────────────────────
// ONBOARDING STORE — persisted partial state across steps
// ─────────────────────────────────────────────────────────────────────────────

interface OnboardingState {
  currentStep: number;
  institutionId?: string;
  institutionName?: string;
  faculty?: string;
  major?: string;
  academicLevel?: string;
  academicYear?: number;
  selectedTagIds: string[];
  isContributor: boolean;
  setStep: (step: number) => void;
  setInstitution: (id: string, name: string) => void;
  setAcademicFocus: (data: Partial<OnboardingState>) => void;
  setSelectedTags: (tagIds: string[]) => void;
  reset: () => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set) => ({
      currentStep: 1,
      selectedTagIds: [],
      isContributor: false,
      setStep: (step) => set({ currentStep: step }),
      setInstitution: (id, name) => set({ institutionId: id, institutionName: name }),
      setAcademicFocus: (data) => set(data),
      setSelectedTags: (tagIds) => set({ selectedTagIds: tagIds }),
      reset: () =>
        set({
          currentStep: 1,
          institutionId: undefined,
          faculty: undefined,
          major: undefined,
          selectedTagIds: [],
          isContributor: false,
        }),
    }),
    {
      name: "getpidief-onboarding",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
