/**
 * PawpadApi - talks to the Pawpad server API on cPanel (api.pawpad.in).
 *
 * Course applications are saved on the server with real sequential IDs, and
 * the admin panel reads them from there. If the server can't be reached, the
 * callers fall back to the old browser-only behaviour, so nothing breaks
 * before the server is set up.
 */

(function (window) {
  // Set to "" to switch the server off and use the old browser-only behaviour.
  const API_BASE = "https://api.pawpad.in";
  const TOKEN_KEY = "pawpad_api_token";
  const TIMEOUT_MS = 15000;

  function getToken() {
    try {
      return localStorage.getItem(TOKEN_KEY) || "";
    } catch (e) {
      return "";
    }
  }

  function setToken(token) {
    try {
      if (token) localStorage.setItem(TOKEN_KEY, token);
      else localStorage.removeItem(TOKEN_KEY);
    } catch (e) {}
  }

  /**
   * Calls one API action. Resolves to { ok, status, data, networkError }:
   * networkError is true when the server could not be reached at all.
   */
  async function call(action, payload) {
    const base = window.PAWPAD_API_BASE !== undefined ? window.PAWPAD_API_BASE : API_BASE;
    if (!base) return { ok: false, status: 0, data: {}, networkError: true };

    const headers = { "Content-Type": "application/json" };
    const token = getToken();
    if (token) headers["X-Pawpad-Token"] = token;

    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), TIMEOUT_MS) : null;
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/index.php?action=${encodeURIComponent(action)}`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload || {}),
        signal: controller ? controller.signal : undefined
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && action !== "login") {
        setToken("");
        window.dispatchEvent(new CustomEvent("pawpad-api-unauthorized"));
      }
      return { ok: res.ok && data.ok === true, status: res.status, data, networkError: false };
    } catch (err) {
      console.warn(`PawpadApi: could not reach the server for "${action}"`, err);
      return { ok: false, status: 0, data: {}, networkError: true };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  async function publicGet(action, params) {
    const base = window.PAWPAD_API_BASE !== undefined ? window.PAWPAD_API_BASE : API_BASE;
    if (!base) return { ok: false, status: 0, data: {}, networkError: true };
    const query = new URLSearchParams({ action, ...(params || {}) });
    const controller = typeof AbortController === "function" ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
    try {
      const res = await fetch(`${base.replace(/\/$/, "")}/index.php?${query}`, {
        cache: "no-cache", signal: controller ? controller.signal : undefined
      });
      const data = await res.json().catch(() => ({}));
      return { ok: res.ok && data.ok === true, status: res.status, data, networkError: false };
    } catch (err) {
      return { ok: false, status: 0, data: {}, networkError: true };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  window.PawpadApi = {
    isEnabled() {
      const base = window.PAWPAD_API_BASE !== undefined ? window.PAWPAD_API_BASE : API_BASE;
      return Boolean(base);
    },
    hasSession() {
      return Boolean(getToken());
    },
    call,
    getBlogPosts() { return publicGet("list_blog_posts"); },
    getBlogPost(slug) { return publicGet("get_blog_post", { slug }); },
    async login(email, password) {
      const result = await call("login", { email, password });
      if (result.ok && result.data.token) setToken(result.data.token);
      return result;
    },
    async logout() {
      if (getToken()) await call("logout", {});
      setToken("");
    },
    clearSession() {
      setToken("");
    },
    /**
     * Published website content. A plain GET (no custom headers) so visitors'
     * browsers don't need an extra CORS round trip.
     */
    async getContent() {
      const base = window.PAWPAD_API_BASE !== undefined ? window.PAWPAD_API_BASE : API_BASE;
      if (!base) return { ok: false, status: 0, data: {}, networkError: true };
      const controller = typeof AbortController === "function" ? new AbortController() : null;
      const timer = controller ? setTimeout(() => controller.abort(), 8000) : null;
      try {
        const res = await fetch(`${base.replace(/\/$/, "")}/index.php?action=get_content`, {
          cache: "no-cache",
          signal: controller ? controller.signal : undefined
        });
        const data = await res.json().catch(() => ({}));
        return { ok: res.ok && data.ok === true, status: res.status, data, networkError: false };
      } catch (err) {
        console.warn("PawpadApi: could not load published content", err);
        return { ok: false, status: 0, data: {}, networkError: true };
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
    /**
     * Uploads a WebP image or a PDF (as a data: URL) and returns its public address.
     */
    async uploadFile(kind, filename, dataUrl) {
      const result = await call("upload_file", { kind, filename, content: dataUrl });
      if (result.ok) return { ok: true, url: result.data.url, usage: result.data.usage };
      return {
        ok: false,
        error: (result.data && result.data.error) || "The Pawpad server could not be reached. Please check your internet connection."
      };
    }
  };
})(window);
