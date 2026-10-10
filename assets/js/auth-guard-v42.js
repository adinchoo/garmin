// auth-guard-v42.js - Patch 002 Authentication Hardening
// Provides reliable session restoration, redirect loop fix, and auth state cleanup
(() => {
  "use strict";
  let initialized = false;

  function clearAppState() {
    try {
      const S = window.APP;
      if (S) {
        S.user = null;
        S.profile = {};
        S.daily = [];
        S.sleep = [];
        S.activities = [];
        S.body = [];
        S.meals = [];
        S.reports = [];
        // Destroy charts
        Object.values(S.charts || {}).forEach(c => {
          try { c.destroy(); } catch {}
        });
        S.charts = {};
      }
      // Clear any cached streams
      window.__activeActivityStreams = null;
    } catch (e) {
      console.warn("[AuthGuard] Failed to clear state", e);
    }
  }

  async function guard() {
    if (initialized) return;
    initialized = true;
    const db = window.db;
    if (!db) {
      console.error("[AuthGuard] Supabase client not ready");
      return;
    }

    // Handle unhandled rejections globally
    window.addEventListener("unhandledrejection", (event) => {
      console.warn("[AuthGuard] Unhandled rejection", event.reason);
      // Prevent app crash, show toast if available
      if (window.UI && window.UI.toast) {
        const msg = event.reason && event.reason.message ? event.reason.message : "Something went wrong";
        // Avoid leaking internal errors
        const safeMsg = /JWT|token|auth|supabase/i.test(msg) ? "Session issue. Please sign in again." : msg;
        window.UI.toast(safeMsg, "error");
      }
    });

    // Listen for auth changes - handles expiry, sign out in other tab
    db.auth.onAuthStateChange(async (event, session) => {
      console.log("[AuthGuard] Auth event", event);
      if (event === "SIGNED_OUT") {
        clearAppState();
        // Avoid redirect loop: only redirect if not already on login page
        if (!location.pathname.endsWith("login.html") && !location.pathname.endsWith("auth.html")) {
          location.replace("./login.html");
        }
      } else if (event === "TOKEN_REFRESHED") {
        console.log("[AuthGuard] Token refreshed");
      } else if (event === "SIGNED_IN" && session) {
        // Session restored, let app load continue
      }
    });

    try {
      // First try getSession (faster, from storage), then getUser (validates with server)
      const { data: { session }, error: sessionError } = await db.auth.getSession();
      if (sessionError) {
        console.warn("[AuthGuard] getSession error", sessionError.message);
      }

      const { data: { user }, error } = await db.auth.getUser();
      if (error || !user) {
        console.log("[AuthGuard] No authenticated user, redirecting to login");
        clearAppState();
        // Prevent loop: if already on login.html, do nothing
        if (location.pathname.endsWith("login.html") || location.pathname.endsWith("index.html") && location.hash.includes("login")) {
          return;
        }
        // For index.html, redirect to login.html instead of same page (fixes original loop)
        if (location.pathname.endsWith("index.html") || location.pathname.endsWith("/") || location.pathname.endsWith("dashboard.html")) {
          location.replace("./login.html");
          return;
        }
        return;
      }

      // User authenticated - continue
      console.log("[AuthGuard] Authenticated as", user.email);

    } catch (e) {
      console.error("[AuthGuard] Guard failed", e);
      clearAppState();
      location.replace("./login.html");
    }
  }

  // Expose for app.js to call
  window.AuthGuard = { guard, clearAppState };

  // Auto-run on load if db is ready, otherwise wait
  document.addEventListener("DOMContentLoaded", () => {
    const check = setInterval(() => {
      if (window.db) {
        clearInterval(check);
        guard();
      }
    }, 50);
    setTimeout(() => clearInterval(check), 5000);
  });
})();
