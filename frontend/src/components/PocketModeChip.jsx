import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BellRing, X, Check } from "lucide-react";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import useLocale from "../hooks/useLocale";
import { t } from "../lib/i18n";
import { registerServiceWorker, requestNotificationPermission } from "../lib/notifications";

/**
 * PocketModeChip — subtle opt-in toast that invites the user to enable
 * whispered background notifications so the app can reach them even when
 * the phone is locked in a pocket. Appears once on the ListenPage when:
 *   • the browser supports Notifications, AND
 *   • the user hasn't already enabled background whispers, AND
 *   • they haven't dismissed this prompt in this session.
 * Fades away after 12s if ignored, and remembers the dismissal so it
 * doesn't reappear on the same device.
 */
const STORAGE_KEY = "aura-pocket-mode-dismissed";

export default function PocketModeChip() {
  const { user, refresh } = useAuth() || {};
  const { lang } = useLocale();
  const [visible, setVisible] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [justEnabled, setJustEnabled] = useState(false);

  // Eligibility check on mount + whenever user loads.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) return;
    if (!user || user.notifications_enabled) return;
    if (window.localStorage.getItem(STORAGE_KEY)) return;
    // Soft entrance after the page settles.
    const t1 = setTimeout(() => setVisible(true), 3500);
    // Auto-dismiss after 12s if user ignores.
    const t2 = setTimeout(() => setVisible(false), 3500 + 12000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [user]);

  const dismiss = useCallback(() => {
    try { window.localStorage.setItem(STORAGE_KEY, new Date().toISOString()); } catch (_) {}
    setVisible(false);
  }, []);

  const enable = useCallback(async () => {
    setEnabling(true);
    try {
      const permission = await requestNotificationPermission();
      if (permission !== "granted") {
        setEnabling(false);
        return;
      }
      await registerServiceWorker();
      await api.patch("/me/profile", { notifications_enabled: true });
      if (typeof refresh === "function") await refresh();
      setJustEnabled(true);
      // Linger briefly so the user sees confirmation, then fade.
      setTimeout(() => {
        setVisible(false);
        try { window.localStorage.setItem(STORAGE_KEY, new Date().toISOString()); } catch (_) {}
      }, 2400);
    } catch (err) {
      // Silent failure — user can still enable from /profile.
      setVisible(false);
    } finally {
      setEnabling(false);
    }
  }, [refresh]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="pocket-mode-chip"
          data-testid="pocket-mode-chip"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 14 }}
          transition={{ duration: 0.35 }}
          className="fixed left-0 right-0 bottom-20 sm:bottom-24 z-40 pointer-events-none px-4 flex justify-center"
        >
          <div
            className="pointer-events-auto flex items-center gap-3 pl-4 pr-2 py-2 rounded-full shadow-lg max-w-xs sm:max-w-md"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              boxShadow: "0 12px 30px rgba(26, 36, 48, 0.18)",
            }}
          >
            {justEnabled ? (
              <>
                <Check size={16} style={{ color: "var(--terracotta)" }} />
                <span className="text-sm" style={{ color: "var(--text-primary)" }}>
                  {t(lang, "pocket.enabled")}
                </span>
              </>
            ) : (
              <>
                <BellRing size={16} style={{ color: "var(--terracotta)" }} />
                <span className="text-sm leading-tight" style={{ color: "var(--text-primary)" }}>
                  {t(lang, "pocket.prompt")}
                </span>
                <button
                  type="button"
                  onClick={enable}
                  disabled={enabling}
                  data-testid="pocket-mode-enable-btn"
                  className="ml-1 px-3 py-1.5 rounded-full text-xs font-medium transition-opacity disabled:opacity-60"
                  style={{
                    background: "var(--terracotta)",
                    color: "#fff",
                    letterSpacing: "0.04em",
                  }}
                >
                  {enabling ? t(lang, "pocket.enabling") : t(lang, "pocket.enable")}
                </button>
                <button
                  type="button"
                  onClick={dismiss}
                  aria-label="Dismiss"
                  data-testid="pocket-mode-dismiss-btn"
                  className="p-1.5 rounded-full hover:bg-[var(--bg)] transition-colors"
                >
                  <X size={14} style={{ color: "var(--text-tertiary)" }} />
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
