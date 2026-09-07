"use client";

// Global toast stack. Adapted from beUI `animated-toast-stack`
// (beui.dev/components/motion/animated-toast-stack) onto the BCC tokens,
// framer-motion, and Phosphor icons, with the config surface trimmed to what
// the LXP uses: a fixed bottom-right stack behind a context provider.
//
// Complements UndoBar, which stays bottom-left for reversible actions; toasts
// are for plain success/error/progress feedback that today lives in inline
// setMessage() rows that shift page content.

import {
  Bell,
  Check,
  CircleNotch,
  Info,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;
const STACK_SPRING = { type: "spring", stiffness: 420, damping: 34, mass: 0.75 } as const;
const CONTENT_TRANSITION = { duration: 0.28, ease: EASE_OUT } as const;
const MAX_VISIBLE = 4;
const DEFAULT_DURATION = 4200;

export type ToastStatus = "neutral" | "info" | "loading" | "success" | "error";

export type Toast = {
  id: string;
  title: ReactNode;
  description?: ReactNode;
  status?: ToastStatus;
  action?: { label: ReactNode; onClick: () => void };
  /** ms before auto-dismiss; 0 keeps the toast until dismissed or updated. */
  duration?: number;
  createdAt: number;
};

type ToastInput = Omit<Toast, "id" | "createdAt"> & { id?: string };

type ToastContextValue = {
  showToast: (input: ToastInput) => string;
  updateToast: (id: string, patch: Partial<ToastInput>) => void;
  dismissToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

const STATUS_ICON: Record<ToastStatus, ReactNode> = {
  neutral: <Bell size={14} weight="bold" />,
  info: <Info size={14} weight="bold" />,
  loading: <CircleNotch size={14} weight="bold" />,
  success: <Check size={14} weight="bold" />,
  error: <WarningCircle size={14} weight="bold" />,
};

const STATUS_CLASS: Record<ToastStatus, string> = {
  neutral: "text-ink-soft bg-ink/5",
  info: "text-primary bg-primary/10",
  loading: "text-primary bg-primary/10",
  success: "text-success-text bg-success/10",
  error: "text-danger-text bg-danger/10",
};

let idSeed = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef<Map<string, { timer: number; signature: string }>>(new Map());

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((input: ToastInput) => {
    const toast: Toast = {
      duration: DEFAULT_DURATION,
      ...input,
      id: input.id ?? `toast-${Date.now()}-${idSeed++}`,
      createdAt: Date.now(),
    };
    setToasts((current) => [...current.filter((t) => t.id !== toast.id), toast]);
    return toast.id;
  }, []);

  const updateToast = useCallback((id: string, patch: Partial<ToastInput>) => {
    setToasts((current) =>
      current.map((t) =>
        t.id === id ? { ...t, ...patch, id, createdAt: Date.now() } : t,
      ),
    );
  }, []);

  // One auto-dismiss timer per toast, keyed on (createdAt, duration) so an
  // updateToast() restarts the clock and unrelated re-renders don't.
  useEffect(() => {
    const activeIds = new Set(toasts.map((t) => t.id));
    timers.current.forEach((entry, id) => {
      if (!activeIds.has(id)) {
        window.clearTimeout(entry.timer);
        timers.current.delete(id);
      }
    });
    toasts.forEach((toast) => {
      const duration = toast.duration ?? DEFAULT_DURATION;
      const existing = timers.current.get(toast.id);
      if (duration <= 0) {
        if (existing) {
          window.clearTimeout(existing.timer);
          timers.current.delete(toast.id);
        }
        return;
      }
      const signature = `${toast.createdAt}:${duration}`;
      if (existing?.signature === signature) return;
      if (existing) window.clearTimeout(existing.timer);
      const remaining = Math.max(duration - (Date.now() - toast.createdAt), 0);
      const timer = window.setTimeout(() => {
        timers.current.delete(toast.id);
        dismissToast(toast.id);
      }, remaining);
      timers.current.set(toast.id, { timer, signature });
    });
  }, [dismissToast, toasts]);

  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((entry) => window.clearTimeout(entry.timer));
      map.clear();
    };
  }, []);

  const value = useMemo(
    () => ({ showToast, updateToast, dismissToast }),
    [showToast, updateToast, dismissToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastStack toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

function ToastStack({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  // Hydration guard: document doesn't exist during SSR, so the portal can
  // only render after mount.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  if (!mounted) return null;

  const visible = toasts.slice(-MAX_VISIBLE);

  return createPortal(
    <ol
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed bottom-6 right-4 z-[90] flex w-[calc(100vw-2rem)] max-w-sm flex-col-reverse gap-2"
    >
      <AnimatePresence initial={false} mode="popLayout">
        {visible.map((toast, index) => (
          <ToastItem key={toast.id} toast={toast} index={index} onDismiss={onDismiss} />
        ))}
      </AnimatePresence>
    </ol>,
    document.body,
  );
}

function ToastItem({
  toast,
  index,
  onDismiss,
}: {
  toast: Toast;
  index: number;
  onDismiss: (id: string) => void;
}) {
  const reduce = useReducedMotion();
  const status = toast.status ?? "neutral";

  return (
    <motion.li
      layout
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.96, filter: "blur(10px)" }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={
        reduce
          ? { opacity: 0 }
          : {
              opacity: 0,
              x: 32,
              scale: 0.96,
              filter: "blur(8px)",
              transition: { duration: 0.18, ease: EASE_OUT },
            }
      }
      transition={STACK_SPRING}
      drag={reduce ? false : "x"}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.18}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 72 || Math.abs(info.velocity.x) > 520) {
          onDismiss(toast.id);
        }
      }}
      className="pointer-events-auto relative will-change-transform"
      style={{ zIndex: 20 - index }}
    >
      <div className="relative overflow-hidden rounded-2xl border border-rule bg-white/95 p-3 shadow-lg backdrop-blur-xl">
        <div className="flex items-start gap-3">
          <motion.span
            layout
            className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${STATUS_CLASS[status]}`}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={status}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.8, filter: "blur(6px)" }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.9, filter: "blur(6px)" }}
                transition={CONTENT_TRANSITION}
                className="inline-flex"
              >
                {status === "loading" ? (
                  <span className="inline-flex animate-spin">{STATUS_ICON[status]}</span>
                ) : (
                  STATUS_ICON[status]
                )}
              </motion.span>
            </AnimatePresence>
          </motion.span>

          <div className="min-w-0 flex-1">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={`${toast.id}-${status}-${String(toast.title)}`}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(6px)" }}
                animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(6px)" }}
                transition={CONTENT_TRANSITION}
              >
                <p className="line-clamp-2 text-sm font-medium leading-5 text-ink">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-0.5 line-clamp-2 text-xs leading-4 text-ink-soft">
                    {toast.description}
                  </p>
                ) : null}
              </motion.div>
            </AnimatePresence>

            {toast.action ? (
              <button
                type="button"
                onClick={toast.action.onClick}
                className="mt-2 inline-flex h-7 items-center rounded-full bg-primary/[0.06] px-3 text-xs font-medium text-ink transition-colors hover:bg-primary/[0.1]"
              >
                {toast.action.label}
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            aria-label="Dismiss notification"
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      </div>
    </motion.li>
  );
}
