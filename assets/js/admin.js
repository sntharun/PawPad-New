/**
 * Pawpad Management Suite — Admin Control Application
 * Features:
 * - Secure PIN Authentication Gate
 * - Omnichannel Website Content Editor (Home, About, Grooming, Courses, Boarding, Forms, etc.)
 * - Course Applications Review & Approval Workflow
 * - Automatic WebP Image Optimizer & Slot Assigning
 * - JSON Export / Import & Factory Reset
 */

(function () {
  const { useState, useEffect, useRef, useMemo } = React;

  const AUTH_USER_STORAGE_KEY = "pawpad_admin_user";

  // In-page messages instead of browser pop-ups: showNotice("✓ Saved.") or showNotice("Could not …").
  // Messages starting with ⚠️, "Could not", "Error", "Failed", "Invalid", "Not " or "Please" show as warnings.
  function showNotice(text, kind) {
    const message = String(text);
    const isError = kind ? kind === "error" : /^(⚠️|Could not|Error|Failed|Invalid|Not |Please)/.test(message);
    window.dispatchEvent(new CustomEvent("pawpad-admin-notice", { detail: { text: message, kind: isError ? "error" : "info" } }));
  }
  window.PawpadAdminNotice = showNotice;

  function NoticeArea() {
    const [notices, setNotices] = useState([]);
    useEffect(() => {
      const onNotice = (e) => {
        const id = Date.now() + Math.random();
        setNotices((prev) => [...prev.slice(-3), { id, ...e.detail }]);
        setTimeout(() => setNotices((prev) => prev.filter((n) => n.id !== id)), e.detail.kind === "error" ? 10000 : 6000);
      };
      window.addEventListener("pawpad-admin-notice", onNotice);
      return () => window.removeEventListener("pawpad-admin-notice", onNotice);
    }, []);
    return React.createElement(
      "div",
      { "aria-live": "polite", style: { position: "fixed", top: "16px", right: "16px", zIndex: 2000, display: "flex", flexDirection: "column", gap: "8px", maxWidth: "min(420px, calc(100vw - 32px))" } },
      notices.map((n) => React.createElement(
        "div",
        { key: n.id, className: "card", role: n.kind === "error" ? "alert" : "status", "data-notice": n.kind, style: { padding: "12px 14px", display: "flex", gap: "10px", alignItems: "flex-start", fontSize: "14px", fontWeight: 600, boxShadow: "0 6px 24px rgba(0,0,0,0.15)", borderLeft: `4px solid ${n.kind === "error" ? "var(--admin-danger)" : "var(--admin-success)"}`, color: n.kind === "error" ? "var(--admin-danger)" : "var(--admin-text)" } },
        React.createElement("span", { style: { flex: 1 } }, n.text),
        React.createElement("button", { type: "button", "aria-label": "Close message", onClick: () => setNotices((prev) => prev.filter((x) => x.id !== n.id)), style: { background: "none", border: "none", cursor: "pointer", color: "inherit", fontSize: "16px", lineHeight: 1 } }, "×")
      ))
    );
  }
  const AUTH_STORAGE_KEY = "pawpad_admin_auth_session";

  // Icons Helper
  const Icons = {
    Dashboard: () => React.createElement("svg", { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("rect", { x: 3, y: 3, width: 7, height: 7 }), React.createElement("rect", { x: 14, y: 3, width: 7, height: 7 }), React.createElement("rect", { x: 14, y: 14, width: 7, height: 7 }), React.createElement("rect", { x: 3, y: 14, width: 7, height: 7 })),
    Applications: () => React.createElement("svg", { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("path", { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" }), React.createElement("polyline", { points: "14 2 14 8 20 8" }), React.createElement("line", { x1: 16, y1: 13, x2: 8, y2: 13 }), React.createElement("line", { x1: 16, y1: 17, x2: 8, y2: 17 }), React.createElement("polyline", { points: "10 9 9 9 8 9" })),
    Content: () => React.createElement("svg", { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("path", { d: "M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" }), React.createElement("path", { d: "M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" })),
    Media: () => React.createElement("svg", { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("rect", { x: 3, y: 3, width: 18, height: 18, rx: 2, ry: 2 }), React.createElement("circle", { cx: 8.5, cy: 8.5, r: 1.5 }), React.createElement("polyline", { points: "21 15 16 10 5 21" })),
    Settings: () => React.createElement("svg", { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("circle", { cx: 12, cy: 12, r: 3 }), React.createElement("path", { d: "M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" })),
    Check: () => React.createElement("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2.5, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("polyline", { points: "20 6 9 17 4 12" })),
    Close: () => React.createElement("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("line", { x1: 18, y1: 6, x2: 6, y2: 18 }), React.createElement("line", { x1: 6, y1: 6, x2: 18, y2: 18 })),
    External: () => React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" }), React.createElement("polyline", { points: "15 3 21 3 21 9" }), React.createElement("line", { x1: 10, y1: 14, x2: 21, y2: 3 })),
    Paw: () => React.createElement("svg", { viewBox: "0 0 64 64", width: 22, height: 22, fill: "var(--admin-gold)" }, React.createElement("ellipse", { cx: "32", cy: "16", rx: "5.5", ry: "7.5" }), React.createElement("ellipse", { cx: "20", cy: "24", rx: "6", ry: "8" }), React.createElement("ellipse", { cx: "44", cy: "24", rx: "6", ry: "8" }), React.createElement("ellipse", { cx: "11", cy: "38", rx: "5", ry: "6.5" }), React.createElement("ellipse", { cx: "53", cy: "38", rx: "5", ry: "6.5" }), React.createElement("ellipse", { cx: "32", cy: "46", rx: "13", ry: "11" })),
    Lock: () => React.createElement("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("rect", { x: 3, y: 11, width: 18, height: 11, rx: 2, ry: 2 }), React.createElement("path", { d: "M7 11V7a5 5 0 0 1 10 0v4" })),
    Key: () => React.createElement("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("path", { d: "M21 2l-2 2m-1.5 1.5L14 9l-3-3 2.5-2.5a4.95 4.95 0 1 0-7 7L13.5 17.5l2-2 1.5 1.5 3-3-1.5-1.5L21 10" })),
    Shield: () => React.createElement("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("path", { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" })),
    User: () => React.createElement("svg", { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("path", { d: "M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" }), React.createElement("circle", { cx: 12, cy: 7, r: "4" })),
    Sun: () => React.createElement("svg", { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("circle", { cx: 12, cy: 12, r: 5 }), React.createElement("line", { x1: 12, y1: 1, x2: 12, y2: 3 }), React.createElement("line", { x1: 12, y1: 21, x2: 12, y2: 23 }), React.createElement("line", { x1: 4.22, y1: 4.22, x2: 5.64, y2: 5.64 }), React.createElement("line", { x1: 18.36, y1: 18.36, x2: 19.78, y2: 19.78 }), React.createElement("line", { x1: 1, y1: 12, x2: 3, y2: 12 }), React.createElement("line", { x1: 21, y1: 12, x2: 23, y2: 12 }), React.createElement("line", { x1: 4.22, y1: 19.78, x2: 5.64, y2: 18.36 }), React.createElement("line", { x1: 18.36, y1: 5.64, x2: 19.78, y2: 4.22 })),
    Moon: () => React.createElement("svg", { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("path", { d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" })),
    Trash: () => React.createElement("svg", { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("polyline", { points: "3 6 5 6 21 6" }), React.createElement("path", { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" }), React.createElement("line", { x1: "10", y1: "11", x2: "10", y2: "17" }), React.createElement("line", { x1: "14", y1: "11", x2: "14", y2: "17" })),
    Mail: () => React.createElement("svg", { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("path", { d: "M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" }), React.createElement("polyline", { points: "22,6 12,13 2,6" })),
    Copy: () => React.createElement("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" }, React.createElement("rect", { x: "9", y: "9", width: "13", height: "13", rx: "2", ry: "2" }), React.createElement("path", { d: "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" }))
  };

  // AUTHENTICATION GATE (EMAIL & PASSWORD)
  function AuthGate({ onAuthenticated }) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
      e.preventDefault();
      setError("");
      const cleanEmail = (email || "").trim().toLowerCase();

      if (!cleanEmail) {
        setError("Please enter your administrator email.");
        return;
      }

      if (!password) {
        setError("Please enter your password.");
        return;
      }

      if (!window.PawpadApi || !window.PawpadApi.isEnabled()) {
        setError("The Pawpad server is switched off in assets/js/api-client.js, so nobody can sign in.");
        return;
      }

      setLoading(true);

      // Sign-in is checked by the Pawpad server (api.pawpad.in); no passwords live in this page.
      const result = await window.PawpadApi.login(cleanEmail, password);
      if (!result.ok) {
        setLoading(false);
        if (result.networkError) {
          setError("Can't reach the Pawpad server (api.pawpad.in). Check your internet connection and try again.");
        } else {
          setError((result.data && result.data.error) || "Invalid email or password.");
        }
        return;
      }

      const serverUser = result.data.user || {};
      const userData = {
        email: serverUser.email || cleanEmail,
        name: (serverUser.email || cleanEmail).split("@")[0],
        role: serverUser.role || "admin",
        roleLabel: serverUser.roleLabel || "",
        picture: null,
        authenticatedAt: new Date().toISOString(),
        authMethod: "pawpad_server"
      };
      localStorage.setItem(AUTH_STORAGE_KEY, "authenticated");
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(userData));
      if (window.PawpadApplicationsStore) await window.PawpadApplicationsStore.refresh();
      if (window.PawpadContentStore && window.PawpadContentStore.ready) await window.PawpadContentStore.ready;
      onAuthenticated(userData);
    };

    return React.createElement(
      "div",
      {
        style: {
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "radial-gradient(circle at center, var(--admin-card-hover) 0%, var(--admin-bg) 100%)",
          padding: "24px"
        }
      },
      React.createElement(
        "div",
        {
          className: "card",
          style: {
            maxWidth: "420px",
            width: "100%",
            textAlign: "center",
            padding: "44px 32px",
            boxShadow: "0 20px 50px rgba(46,46,46,0.08)",
            border: "1px solid var(--admin-border)",
            position: "relative"
          }
        },
        React.createElement("div", { style: { display: "flex", justifyContent: "center", marginBottom: "16px" } }, React.createElement(Icons.Paw, null)),
        React.createElement("h1", { style: { fontFamily: "var(--font-display)", fontSize: "26px", color: "var(--admin-text)", marginBottom: "8px" } }, "Pawpad Admin Portal"),
        React.createElement("p", { style: { color: "var(--admin-text-muted)", fontSize: "14px", marginBottom: "24px" } }, "Sign in with your email and password to access the administration dashboard."),

        // Error message
        error && React.createElement(
          "div",
          { style: { color: "var(--admin-danger)", background: "rgba(248, 113, 113, 0.12)", border: "1px solid rgba(248, 113, 113, 0.3)", borderRadius: "8px", padding: "12px 14px", fontSize: "13px", marginBottom: "20px", textAlign: "left", lineHeight: "1.4" } },
          "⚠️ ", error
        ),

        // Login Form
        React.createElement(
          "form",
          { onSubmit: handleSubmit, style: { display: "flex", flexDirection: "column", gap: "16px", textAlign: "left" } },
          React.createElement(
            "div",
            null,
            React.createElement("label", { style: { display: "block", fontSize: "12px", fontWeight: "600", color: "var(--admin-text-muted)", marginBottom: "6px" } }, "Email Address"),
            React.createElement("input", {
              type: "email",
              className: "input-field",
              required: true,
              autoFocus: true,
              value: email,
              onChange: (e) => setEmail(e.target.value),
              placeholder: "e.g. admin@pawpad.in"
            })
          ),
          React.createElement(
            "div",
            null,
            React.createElement("label", { style: { display: "block", fontSize: "12px", fontWeight: "600", color: "var(--admin-text-muted)", marginBottom: "6px" } }, "Password"),
            React.createElement(
              "div",
              { style: { position: "relative" } },
              React.createElement("input", {
                type: showPassword ? "text" : "password",
                className: "input-field",
                required: true,
                value: password,
                onChange: (e) => setPassword(e.target.value),
                placeholder: "••••••••",
                style: { paddingRight: "44px" }
              }),
              React.createElement(
                "button",
                {
                  type: "button",
                  onClick: () => setShowPassword(!showPassword),
                  style: {
                    position: "absolute",
                    right: "10px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    color: "var(--admin-text-muted)",
                    cursor: "pointer",
                    fontSize: "12px",
                    padding: "4px"
                  }
                },
                showPassword ? "Hide" : "Show"
              )
            )
          ),
          React.createElement(
            "button",
            {
              type: "submit",
              disabled: loading,
              className: "btn-admin btn-admin-primary",
              style: { marginTop: "8px", width: "100%", padding: "12px", fontSize: "14px", fontWeight: "600", justifyContent: "center" }
            },
            loading ? "Signing in..." : "Sign In to Admin Portal"
          )
        ),

        React.createElement(
          "div",
          { style: { marginTop: "24px", paddingTop: "18px", borderTop: "1px solid var(--admin-border-subtle)", fontSize: "12px", color: "var(--admin-text-faint)" } },
          "Authorized Staff & Admin Access"
        )
      )
    );
  }

  // -------------------------------------------------------------
  // DASHBOARD OVERVIEW TAB
  // -------------------------------------------------------------
  function DashboardTab({ stats, setActiveTab, applications }) {
    const recentApps = applications.slice(0, 5);
    const overridesCount = window.PawpadContentStore ? window.PawpadContentStore.getOverrideCount() : 0;

    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "28px" } },

      // Welcome banner
      React.createElement(
        "div",
        { className: "card admin-banner", style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" } },
        React.createElement(
          "div",
          null,
          React.createElement("h2", { style: { fontFamily: "var(--font-display)", fontSize: "24px", marginBottom: "6px" } }, "Welcome to Pawpad Control Center"),
          React.createElement("p", { style: { fontSize: "14px" } }, "Manage live website contents, approve course applications, and optimize WebP images across all pages.")
        ),
        React.createElement(
          "div",
          { style: { display: "flex", gap: "10px" } },
          React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: () => setActiveTab("content") }, "Edit Website Copy"),
          React.createElement("button", { className: "btn-admin btn-admin-primary", onClick: () => setActiveTab("applications") }, "View Applications (", stats.pending, ")")
        )
      ),

      // Metrics Tiles
      React.createElement(
        "div",
        { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" } },

        React.createElement(
          "div",
          { className: "card", style: { cursor: "pointer" }, onClick: () => setActiveTab("applications") },
          React.createElement("div", { style: { fontSize: "13px", color: "var(--admin-text-muted)", marginBottom: "8px" } }, "Pending Course Admissions"),
          React.createElement("div", { style: { fontSize: "32px", fontWeight: "700", color: stats.pending > 0 ? "var(--admin-warning)" : "var(--admin-text)" } }, stats.pending),
          React.createElement("div", { style: { fontSize: "12px", color: "var(--admin-text-faint)", marginTop: "6px" } }, "Requires staff review & action")
        ),

        React.createElement(
          "div",
          { className: "card", style: { cursor: "pointer" }, onClick: () => setActiveTab("applications") },
          React.createElement("div", { style: { fontSize: "13px", color: "var(--admin-text-muted)", marginBottom: "8px" } }, "Approved / Enrolled Students"),
          React.createElement("div", { style: { fontSize: "32px", fontWeight: "700", color: "var(--admin-success)" } }, (stats.approved || 0) + (stats.enrolled || 0)),
          React.createElement("div", { style: { fontSize: "12px", color: "var(--admin-text-faint)", marginTop: "6px" } }, `${stats.approved || 0} approved, ${stats.enrolled || 0} enrolled`)
        ),

        React.createElement(
          "div",
          { className: "card", style: { cursor: "pointer" }, onClick: () => setActiveTab("content") },
          React.createElement("div", { style: { fontSize: "13px", color: "var(--admin-text-muted)", marginBottom: "8px" } }, "Active CMS Customizations"),
          React.createElement("div", { style: { fontSize: "32px", fontWeight: "700", color: "var(--admin-gold)" } }, overridesCount),
          React.createElement("div", { style: { fontSize: "12px", color: "var(--admin-text-faint)", marginTop: "6px" } }, "Live overrides synced to pages")
        ),

        React.createElement(
          "div",
          { className: "card", style: { cursor: "pointer" }, onClick: () => setActiveTab("media") },
          React.createElement("div", { style: { fontSize: "13px", color: "var(--admin-text-muted)", marginBottom: "8px" } }, "WebP Image Converter"),
          React.createElement("div", { style: { fontSize: "32px", fontWeight: "700", color: "var(--admin-info)" } }, "Ready"),
          React.createElement("div", { style: { fontSize: "12px", color: "var(--admin-text-faint)", marginTop: "6px" } }, "Auto-compress & update slots")
        )
      ),

      // Recent Applications Table Card
      React.createElement(
        "div",
        { className: "card" },
        React.createElement(
          "div",
          { style: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" } },
          React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--admin-text)" } }, "Recent Course Application Requests"),
          React.createElement("button", { className: "btn-admin btn-admin-secondary", style: { padding: "6px 12px", fontSize: "13px" }, onClick: () => setActiveTab("applications") }, "View All →")
        ),

        recentApps.length === 0
          ? React.createElement("div", { style: { padding: "30px", textAlign: "center", color: "var(--admin-text-muted)" } }, "No applications submitted yet.")
          : React.createElement(
            "div",
            { style: { overflowX: "auto" } },
            React.createElement(
              "table",
              { style: { width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" } },
              React.createElement(
                "thead",
                null,
                React.createElement(
                  "tr",
                  { style: { borderBottom: "1px solid var(--admin-border)", color: "var(--admin-text-muted)" } },
                  React.createElement("th", { style: { padding: "12px" } }, "ID"),
                  React.createElement("th", { style: { padding: "12px" } }, "Candidate"),
                  React.createElement("th", { style: { padding: "12px" } }, "Course"),
                  React.createElement("th", { style: { padding: "12px" } }, "Date"),
                  React.createElement("th", { style: { padding: "12px" } }, "Status"),
                  React.createElement("th", { style: { padding: "12px", textAlign: "right" } }, "Action")
                )
              ),
              React.createElement(
                "tbody",
                null,
                recentApps.map((app) =>
                  React.createElement(
                    "tr",
                    { key: app.id, style: { borderBottom: "1px solid var(--admin-border-subtle)" } },
                    React.createElement("td", { style: { padding: "12px", fontFamily: "monospace", color: "var(--admin-gold)" } }, app.id),
                    React.createElement("td", { style: { padding: "12px", fontWeight: "600" } }, app.applicant?.name || "Anonymous"),
                    React.createElement("td", { style: { padding: "12px", color: "var(--admin-text-muted)" } }, app.courseName || "Certification"),
                    React.createElement("td", { style: { padding: "12px", color: "var(--admin-text-faint)", fontSize: "13px" } }, new Date(app.createdAt).toLocaleDateString()),
                    React.createElement(
                      "td",
                      { style: { padding: "12px" } },
                      React.createElement("span", { className: `badge badge-${app.status === "pending_review" ? "pending" : app.status === "approved" ? "approved" : app.status === "rejected" ? "rejected" : app.status === "interview_scheduled" ? "interview" : "enrolled"}` },
                        applicationStatusLabel(app.status, true)
                      )
                    ),
                    React.createElement(
                      "td",
                      { style: { padding: "12px", textAlign: "right" } },
                      React.createElement("button", { className: "btn-admin btn-admin-secondary", style: { padding: "4px 10px", fontSize: "12px" }, onClick: () => setActiveTab("applications") }, "Review")
                    )
                  )
                )
              )
            )
          )
      )
    );
  }

  // -------------------------------------------------------------
  // COURSE APPLICATIONS APPROVAL SUBPAGE
  // -------------------------------------------------------------
  function todayString() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  const PAYMENT_MODE_OPTIONS = [["upi", "UPI"], ["cash", "Cash"], ["card", "Card"], ["bank_transfer", "Bank transfer"]];

  function formatRupees(amount) {
    const n = Number(amount) || 0;
    return "₹" + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
  }

  /**
   * Status names. After the interview is scheduled, a Manager sees "Pending Admin Approval":
   * only an Owner or Administrator can approve or decline.
   */
  /**
   * The course's price on the website today (Website Content CMS). An application keeps the
   * price the candidate saw when applying; this shows the admin when the price has changed since.
   */
  function currentWebsiteFee(app) {
    const store = window.PawpadContentStore;
    if (!store || typeof store.feeForApplication !== "function" || !app) return "";
    const key = String(app.courseKey || "").toLowerCase();
    const code = String(app.courseCode || "").toUpperCase();
    if (/gssc|consult/.test(key) || code === "GSSC" || code === "STUDIO") {
      const format = String((app.responses || {}).consultation_format || "");
      return store.feeForApplication("pawpad-application-consulting-gssc.html", /person|visit/i.test(format) ? "in-person" : "online");
    }
    const course = (store.get("courses").courseList || []).find((c) => c && ((key && String(c.key || "").toLowerCase() === key) || (code && String(c.code || "").toUpperCase() === code)));
    return course && course.price ? store.formatPrice(course.price) : "";
  }

  function applicationStatusLabel(status, canAdmin) {
    if (status === "interview_scheduled") return canAdmin ? "Interview Scheduled" : "Pending Admin Approval";
    return { pending_review: "Pending Review", approved: "Approved", rejected: "Declined", enrolled: "Enrolled" }[status] || status;
  }

  function ApplicationsTab({ applications, onUpdate, canAdmin }) {
    const [confirmModal, setConfirmModal] = useState({ isOpen: false });
    const askConfirm = (options, onYes) => setConfirmModal({
      isOpen: true,
      confirmStyle: "btn-admin-danger",
      ...options,
      onConfirm: () => {
        setConfirmModal({ isOpen: false });
        onYes();
      }
    });
    const [selectedApp, setSelectedApp] = useState(null);
    const [payment, setPayment] = useState({ amount: "", paidOn: todayString(), mode: "", reference: "" });
    const [paymentNotice, setPaymentNotice] = useState("");
    const [savingPayment, setSavingPayment] = useState(false);
    useEffect(() => {
      setPaymentNotice("");
      setPayment({ amount: "", paidOn: todayString(), mode: "", reference: "" });
    }, [selectedApp && selectedApp.id]);
    const [statusFilter, setStatusFilter] = useState("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [newNote, setNewNote] = useState("");
    const [interviewInput, setInterviewInput] = useState("");
    const [selectedIds, setSelectedIds] = useState([]);
    const [isSendingMail, setIsSendingMail] = useState(false);
    const [emailNotification, setEmailNotification] = useState(null);
    const [copiedNotification, setCopiedNotification] = useState(false);
    const [previewModalData, setPreviewModalData] = useState(null);

    const filtered = useMemo(() => {
      return applications.filter((app) => {
        const matchesStatus = statusFilter === "all" || app.status === statusFilter;
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          !q ||
          (app.applicant?.name && app.applicant.name.toLowerCase().includes(q)) ||
          (app.applicant?.email && app.applicant.email.toLowerCase().includes(q)) ||
          (app.applicant?.phone && app.applicant.phone.toLowerCase().includes(q)) ||
          (app.id && app.id.toLowerCase().includes(q)) ||
          (app.courseName && app.courseName.toLowerCase().includes(q));
        return matchesStatus && matchesSearch;
      });
    }, [applications, statusFilter, searchQuery]);

    // Any candidate can be selected and permanently deleted (removed from the database).
    const visibleDeclined = filtered;

    const selectedDeclinedCount = useMemo(() => {
      return selectedIds.filter((id) => applications.some((a) => a.id === id)).length;
    }, [selectedIds, applications]);

    const allVisibleDeclinedSelected =
      visibleDeclined.length > 0 && visibleDeclined.every((a) => selectedIds.includes(a.id));

    const toggleSelectRow = (id) => {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    };

    const toggleSelectAllVisibleDeclined = () => {
      if (allVisibleDeclinedSelected) {
        const visibleIds = visibleDeclined.map((a) => a.id);
        setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
      } else {
        const visibleIds = visibleDeclined.map((a) => a.id);
        setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
      }
    };

    const handleDelete = (app) => {
      if (!app) return;
      const candidateName = app.applicant?.name ? `${app.applicant.name} (${app.id})` : app.id;
      askConfirm({
        title: "Delete candidate?",
        message: `Permanently delete ${candidateName}? All of this candidate's details, notes and emails are removed from the database. This cannot be undone.`,
        confirmText: "Yes, delete"
      }, () => {
        if (window.PawpadApplicationsStore) {
          window.PawpadApplicationsStore.deleteApplication(app.id);
          if (selectedApp && selectedApp.id === app.id) {
            setSelectedApp(null);
          }
          setSelectedIds((prev) => prev.filter((id) => id !== app.id));
          onUpdate();
        }
      });
    };

    const handleBulkDelete = () => {
      const declinedSelected = selectedIds.filter((id) => applications.some((a) => a.id === id));

      if (declinedSelected.length === 0) {
        showNotice("Please select at least one candidate to delete.");
        return;
      }

      askConfirm({
        title: "Delete candidates?",
        message: `Permanently delete ${declinedSelected.length} candidate(s)? All their details, notes and emails are removed from the database. This cannot be undone.`,
        confirmText: "Yes, delete"
      }, () => {
        if (window.PawpadApplicationsStore) {
          if (typeof window.PawpadApplicationsStore.deleteMultiple === "function") {
            window.PawpadApplicationsStore.deleteMultiple(declinedSelected);
          } else {
            declinedSelected.forEach((id) => window.PawpadApplicationsStore.deleteApplication(id));
          }
          if (selectedApp && declinedSelected.includes(selectedApp.id)) {
            setSelectedApp(null);
          }
          setSelectedIds((prev) => prev.filter((id) => !declinedSelected.includes(id)));
          onUpdate();
        }
      });
    };

    const handleStatusChange = (id, newStatus, note = "", interviewDate = "") => {
      if (window.PawpadApplicationsStore) {
        window.PawpadApplicationsStore.updateStatus(id, newStatus, note, interviewDate);
        if (selectedApp && selectedApp.id === id) {
          setSelectedApp(window.PawpadApplicationsStore.getById(id));
        }
        onUpdate();
      }
    };

    const handleScheduleInterview = async () => {
      if (!selectedApp) return;
      if (!interviewInput) {
        showNotice("Please select an interview date and time first.");
        return;
      }

      setIsSendingMail(true);
      try {
        const res = await window.PawpadApplicationsStore.scheduleInterviewWithEmail(
          selectedApp.id,
          interviewInput,
          newNote.trim()
        );
        if (res && res.success) {
          setSelectedApp(window.PawpadApplicationsStore.getById(selectedApp.id));
          setNewNote("");
          setEmailNotification({
            type: "interview",
            title: "Interview Scheduled & Candidate Email Dispatched",
            message: res.emailSent === false
              ? `Interview saved, but the email to ${res.emailData.recipient || "the candidate"} could NOT be sent: ${res.emailError}`
              : `Notification email sent to ${res.emailData.recipient || "candidate"} ${res.deliveryLabel || "from courses@pawpad.in"}.`,
            emailData: res.emailData
          });
          onUpdate();
        } else {
          showNotice("Could not schedule interview: " + (res?.error || "Unknown error"));
        }
      } catch (err) {
        console.error("Failed to schedule interview:", err);
        showNotice("Error scheduling interview: " + err.message);
      } finally {
        setIsSendingMail(false);
      }
    };

    const handleDecline = () => {
      if (!selectedApp) return;
      const app = selectedApp;
      const decline = async (sendEmail) => {
        setConfirmModal({ isOpen: false });
        setIsSendingMail(true);
        const res = await window.PawpadApplicationsStore.declineApplication(app.id, sendEmail, newNote.trim());
        setIsSendingMail(false);
        if (!res || !res.success) return showNotice("Could not decline the application: " + ((res && res.error) || "Unknown error"));
        setSelectedApp(window.PawpadApplicationsStore.getById(app.id));
        setNewNote("");
        onUpdate();
        if (!sendEmail) showNotice("✓ Application declined. No email was sent.");
        else if (res.emailSent === false) showNotice(`⚠️ Application declined, but the email to ${res.emailData.recipient} could NOT be sent: ${res.emailError}`);
        else showNotice(`✓ Application declined. A polite email was sent to ${res.emailData.recipient} from courses@pawpad.in.`);
      };
      setConfirmModal({
        isOpen: true,
        title: "Decline this application?",
        message: `Decline ${app.applicant?.name || app.id}? Would you like to send the candidate a polite decline email from courses@pawpad.in?`,
        confirmText: "Decline & send email",
        confirmStyle: "btn-admin-danger",
        altText: "Decline without email",
        cancelText: "Cancel",
        onConfirm: () => decline(true),
        onAlt: () => decline(false)
      });
    };

    const handleApproveApplication = async () => {
      if (!selectedApp) return;

      setIsSendingMail(true);
      try {
        const res = await window.PawpadApplicationsStore.approveApplicationWithEmail(
          selectedApp.id,
          newNote.trim()
        );
        if (res && res.success) {
          setSelectedApp(window.PawpadApplicationsStore.getById(selectedApp.id));
          setNewNote("");
          setEmailNotification({
            type: "approval",
            title: "Application Approved & Confirmation Email Dispatched",
            message: res.emailSent === false
              ? `Approval saved, but the email to ${res.emailData.recipient || "the candidate"} could NOT be sent: ${res.emailError}`
              : `Course approval details and next steps sent to ${res.emailData.recipient || "candidate"} ${res.deliveryLabel || "from courses@pawpad.in"}.`,
            emailData: res.emailData
          });
          onUpdate();
        } else {
          showNotice("Could not approve application: " + (res?.error || "Unknown error"));
        }
      } catch (err) {
        console.error("Failed to approve application:", err);
        showNotice("Error approving application: " + err.message);
      } finally {
        setIsSendingMail(false);
      }
    };

    const copyToClipboard = (text) => {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 3000);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        setCopiedNotification(true);
        setTimeout(() => setCopiedNotification(false), 3000);
      }
    };

    const handleAddNote = (id) => {
      if (!newNote.trim()) return;
      if (window.PawpadApplicationsStore) {
        window.PawpadApplicationsStore.addNote(id, newNote.trim(), "Admin");
        setNewNote("");
        if (selectedApp && selectedApp.id === id) {
          setSelectedApp(window.PawpadApplicationsStore.getById(id));
        }
        onUpdate();
      }
    };

    const replaceApp = (app) => {
      if (window.PawpadApplicationsStore && app) {
        window.PawpadApplicationsStore._replaceFromServer(app);
        setSelectedApp(window.PawpadApplicationsStore.getById(app.id));
        onUpdate();
      }
    };

    const handleRecordPayment = async () => {
      if (!selectedApp || savingPayment) return;
      if (!payment.amount || !payment.mode || !payment.paidOn) {
        setPaymentNotice("⚠️ Please fill in the amount, the date and how it was paid.");
        return;
      }
      setSavingPayment(true);
      setPaymentNotice("");
      const result = await window.PawpadApi.call("record_payment", { applicationId: selectedApp.id, ...payment });
      setSavingPayment(false);
      if (!result.ok) {
        setPaymentNotice("⚠️ " + ((result.data && result.data.error) || "The Pawpad server could not be reached."));
        return;
      }
      replaceApp(result.data.application);
      setPayment({ amount: "", paidOn: todayString(), mode: "", reference: "" });
      setPaymentNotice("✓ Payment recorded. You can now mark the candidate Enrolled.");
    };

    const handleDeletePayment = (p) => askConfirm({
      title: "Remove payment?",
      message: `Remove the payment of ${formatRupees(p.amount)} (${p.paidOn})? Only do this if it was recorded by mistake.`,
      confirmText: "Yes, remove"
    }, () => removePayment(p));

    const removePayment = async (p) => {
      const result = await window.PawpadApi.call("delete_payment", { id: p.id });
      if (!result.ok) {
        setPaymentNotice("⚠️ " + ((result.data && result.data.error) || "The Pawpad server could not be reached."));
        return;
      }
      replaceApp(result.data.application);
      setPaymentNotice("✓ Payment removed.");
    };

    const handleExport = () => {
      if (window.PawpadApplicationsStore) {
        const csv = window.PawpadApplicationsStore.exportCSV();
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `pawpad-course-applications-${new Date().toISOString().slice(0, 10)}.csv`;
        link.click();
      }
    };

    // Selection checkboxes and delete are for the Owner / Administrator only (the server refuses Managers too).
    const isDeclinedFilter = Boolean(canAdmin);

    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "24px" } },
      React.createElement(ConfirmModal, { ...confirmModal, onCancel: () => setConfirmModal({ isOpen: false }) }),

      // Top Controls
      React.createElement(
        "div",
        { style: { display: "flex", flexDirection: "column", gap: "12px" } },
        React.createElement(
          "div",
          { className: "card", style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" } },

          // Status Filter Buttons
          React.createElement(
            "div",
            { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
            [
              { id: "all", label: "All Requests" },
              { id: "pending_review", label: "Pending Review" },
              { id: "interview_scheduled", label: canAdmin ? "Interview Scheduled" : "Pending Admin Approval" },
              { id: "approved", label: "Approved" },
              { id: "enrolled", label: "Enrolled" },
              { id: "rejected", label: "Declined" }
            ].map((tab) =>
              React.createElement(
                "button",
                {
                  key: tab.id,
                  className: `btn-admin ${statusFilter === tab.id ? "btn-admin-primary" : "btn-admin-secondary"}`,
                  style: { padding: "6px 14px", fontSize: "13px" },
                  onClick: () => setStatusFilter(tab.id)
                },
                tab.label,
                tab.id !== "all" && ` (${applications.filter((a) => a.status === tab.id).length})`
              )
            )
          ),

          // Actions
          React.createElement(
            "div",
            { style: { display: "flex", gap: "10px", alignItems: "center" } },
            React.createElement("input", {
              type: "text",
              className: "input-field",
              placeholder: "Search candidate, phone, email...",
              value: searchQuery,
              onChange: (e) => setSearchQuery(e.target.value),
              style: { width: "240px", padding: "8px 12px", fontSize: "13px" }
            }),
            React.createElement(
              "button",
              { className: "btn-admin btn-admin-secondary", style: { padding: "8px 14px", fontSize: "13px" }, onClick: handleExport },
              "Export CSV"
            )
          )
        ),

        // Bulk Selection & Delete Bar in Decline Filter
        isDeclinedFilter &&
        React.createElement(
          "div",
          {
            className: "card card-danger",
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "12px",
              padding: "12px 20px"
            }
          },
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: "14px", flexWrap: "wrap" } },
            React.createElement(
              "label",
              {
                style: {
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer"
                }
              },
              React.createElement("input", {
                type: "checkbox",
                checked: allVisibleDeclinedSelected,
                onChange: toggleSelectAllVisibleDeclined,
                disabled: visibleDeclined.length === 0,
                style: { width: "16px", height: "16px", cursor: "pointer" }
              }),
              "Select all shown"
            ),
            React.createElement(
              "span",
              { style: { fontSize: "13px", color: "var(--admin-text-muted)" } },
              selectedDeclinedCount > 0
                ? `(${selectedDeclinedCount} of ${visibleDeclined.length} selected)`
                : `(${visibleDeclined.length} declined total)`
            )
          ),
          React.createElement(
            "div",
            { style: { display: "flex", gap: "10px", alignItems: "center" } },
            selectedDeclinedCount > 0 &&
            React.createElement(
              "button",
              {
                className: "btn-admin btn-admin-secondary",
                style: { padding: "6px 12px", fontSize: "12px" },
                onClick: () => setSelectedIds([])
              },
              "Clear Selection"
            ),
            React.createElement(
              "button",
              {
                className: "btn-admin btn-admin-danger",
                style: {
                  padding: "8px 16px",
                  fontSize: "13px",
                  opacity: selectedDeclinedCount === 0 ? 0.6 : 1
                },
                disabled: selectedDeclinedCount === 0,
                onClick: handleBulkDelete
              },
              React.createElement(Icons.Trash, null),
              ` Delete Selected${selectedDeclinedCount > 0 ? ` (${selectedDeclinedCount})` : ""}`
            )
          )
        )
      ),

      // Applications Table
      React.createElement(
        "div",
        { className: "card", style: { padding: "0" } },
        filtered.length === 0
          ? React.createElement("div", { style: { padding: "48px", textAlign: "center", color: "var(--admin-text-muted)" } }, "No matching course applications found.")
          : React.createElement(
            "div",
            { style: { overflowX: "auto" } },
            React.createElement(
              "table",
              { style: { width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" } },
              React.createElement(
                "thead",
                null,
                React.createElement(
                  "tr",
                  { style: { borderBottom: "1px solid var(--admin-border)", background: "var(--admin-sidebar)", color: "var(--admin-text-muted)" } },
                  isDeclinedFilter &&
                  React.createElement(
                    "th",
                    { style: { padding: "16px 8px 16px 16px", width: "42px", textAlign: "center" } },
                    React.createElement("input", {
                      type: "checkbox",
                      checked: allVisibleDeclinedSelected,
                      onChange: toggleSelectAllVisibleDeclined,
                      title: "Select all shown",
                      style: { width: "16px", height: "16px", cursor: "pointer" }
                    })
                  ),
                  React.createElement("th", { style: { padding: "16px" } }, "Application ID"),
                  React.createElement("th", { style: { padding: "16px" } }, "Candidate"),
                  React.createElement("th", { style: { padding: "16px" } }, "Target Course"),
                  React.createElement("th", { style: { padding: "16px" } }, "Location"),
                  React.createElement("th", { style: { padding: "16px" } }, "Date Applied"),
                  React.createElement("th", { style: { padding: "16px" } }, "Status"),
                  React.createElement("th", { style: { padding: "16px", textAlign: "right" } }, "Actions")
                )
              ),
              React.createElement(
                "tbody",
                null,
                filtered.map((app) => {
                  const isDeclined = app.status === "rejected";
                  const isChecked = selectedIds.includes(app.id);

                  return React.createElement(
                    "tr",
                    {
                      key: app.id,
                      style: {
                        borderBottom: "1px solid var(--admin-border-subtle)",
                        transition: "background 0.1s ease",
                        background: isChecked ? "rgba(239, 68, 68, 0.06)" : "transparent"
                      },
                      onMouseEnter: (e) => {
                        if (!isChecked) e.currentTarget.style.background = "rgba(177, 141, 78, 0.05)";
                      },
                      onMouseLeave: (e) => {
                        e.currentTarget.style.background = isChecked ? "rgba(239, 68, 68, 0.06)" : "transparent";
                      }
                    },
                    isDeclinedFilter &&
                    React.createElement(
                      "td",
                      { style: { padding: "16px 8px 16px 16px", width: "42px", textAlign: "center" } },
                      React.createElement("input", {
                        type: "checkbox",
                        checked: isChecked,
                        onChange: () => toggleSelectRow(app.id),
                        style: { width: "16px", height: "16px", cursor: "pointer" }
                      })
                    ),
                    React.createElement("td", { style: { padding: "16px", fontFamily: "monospace", color: "var(--admin-gold)", fontWeight: "600" } }, app.id),
                    React.createElement(
                      "td",
                      { style: { padding: "16px" } },
                      React.createElement("div", { style: { fontWeight: "600" } }, app.applicant?.name || "Unnamed Candidate"),
                      React.createElement("div", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, app.applicant?.phone || "", app.applicant?.email ? ` · ${app.applicant.email}` : "")
                    ),
                    React.createElement(
                      "td",
                      { style: { padding: "16px" } },
                      React.createElement("div", { style: { color: "var(--admin-text)" } }, app.courseName),
                      React.createElement("div", { style: { fontSize: "12px", color: "var(--admin-gold-light)" } }, app.courseFee)
                    ),
                    React.createElement("td", { style: { padding: "16px", color: "var(--admin-text-muted)" } }, app.applicant?.city || "Bengaluru"),
                    React.createElement("td", { style: { padding: "16px", color: "var(--admin-text-faint)", fontSize: "13px" } }, new Date(app.createdAt).toLocaleDateString()),
                    React.createElement(
                      "td",
                      { style: { padding: "16px" } },
                      React.createElement("span", { className: `badge badge-${app.status === "pending_review" ? "pending" : app.status === "approved" ? "approved" : app.status === "rejected" ? "rejected" : app.status === "interview_scheduled" ? "interview" : "enrolled"}` },
                        applicationStatusLabel(app.status, canAdmin)
                      )
                    ),
                    React.createElement(
                      "td",
                      { style: { padding: "16px", textAlign: "right" } },
                      React.createElement(
                        "div",
                        { style: { display: "flex", gap: "8px", justifyContent: "flex-end", alignItems: "center" } },
                        React.createElement(
                          "button",
                          {
                            className: "btn-admin btn-admin-primary",
                            style: { padding: "6px 14px", fontSize: "13px" },
                            onClick: () => {
                              setSelectedApp(app);
                              setInterviewInput(app.interviewDate || "");
                            }
                          },
                          app.status === "enrolled"
                            ? "View Details"
                            : app.status === "approved"
                            ? "Review & Enroll"
                            : app.status === "rejected"
                            ? "View Record"
                            : canAdmin ? "Inspect & Approve" : "Open"
                        ),
                        canAdmin && React.createElement(
                          "button",
                          {
                            className: "btn-admin btn-admin-danger",
                            style: { padding: "6px 12px", fontSize: "13px" },
                            title: "Permanently delete this candidate",
                            onClick: (e) => {
                              e.stopPropagation();
                              handleDelete(app);
                            }
                          },
                          React.createElement(Icons.Trash, null),
                          " Delete"
                        )
                      )
                    )
                  );
                })
              )
            )
          )
      ),

      // Detailed Modal for Application Approval
      selectedApp &&
      React.createElement(
        "div",
        { className: "modal-overlay", onClick: () => setSelectedApp(null) },
        React.createElement(
          "div",
          { className: "modal-card", onClick: (e) => e.stopPropagation() },

          // Modal Header
          React.createElement(
            "div",
            { style: { padding: "20px 28px", borderBottom: "1px solid var(--admin-border)", display: "flex", justifyContent: "space-between", alignItems: "center" } },
            React.createElement(
              "div",
              null,
              React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "10px" } },
                React.createElement("h2", { style: { fontFamily: "var(--font-display)", fontSize: "20px", color: "var(--admin-text)" } }, "Application ", selectedApp.id),
                React.createElement("span", { className: `badge badge-${selectedApp.status === "pending_review" ? "pending" : selectedApp.status === "approved" ? "approved" : selectedApp.status === "rejected" ? "rejected" : selectedApp.status === "interview_scheduled" ? "interview" : "enrolled"}` },
                  applicationStatusLabel(selectedApp.status, canAdmin)
                )
              ),
              React.createElement("div", { style: { fontSize: "13px", color: "var(--admin-text-muted)", marginTop: "4px" } }, selectedApp.courseName, " (", selectedApp.courseFee, ")",
                (() => {
                  const now = currentWebsiteFee(selectedApp);
                  const norm = (t) => String(t || "").replace(/\s+/g, "");
                  return now && norm(now) !== norm(selectedApp.courseFee)
                    ? React.createElement("span", { "data-current-fee": now, style: { marginLeft: "8px", color: "var(--admin-gold-light)" } }, "· Website price now: ", now, " (applied at ", selectedApp.courseFee || "—", ")")
                    : null;
                })())
            ),
            React.createElement("button", { className: "btn-admin btn-admin-secondary", style: { padding: "8px" }, onClick: () => setSelectedApp(null) }, React.createElement(Icons.Close, null))
          ),

          // Modal Body Content (Scrollable)
          React.createElement(
            "div",
            { style: { padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" } },

            // Candidate Notification Dispatch Banner
            emailNotification &&
              React.createElement(
                "div",
                {
                  style: {
                    background: "var(--admin-success-bg, #dcfce7)",
                    border: "1px solid var(--admin-success, #166534)",
                    borderRadius: "8px",
                    padding: "16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px"
                  }
                },
                React.createElement(
                  "div",
                  { style: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" } },
                  React.createElement(
                    "div",
                    { style: { display: "flex", alignItems: "center", gap: "8px" } },
                    React.createElement(
                      "span",
                      { style: { color: "var(--admin-success, #166534)", fontWeight: "bold" } },
                      "✓"
                    ),
                    React.createElement(
                      "strong",
                      { style: { color: "var(--admin-success, #166534)", fontSize: "14px" } },
                      emailNotification.title
                    )
                  ),
                  React.createElement(
                    "button",
                    {
                      className: "btn-admin btn-admin-secondary",
                      style: { padding: "2px 8px", fontSize: "11px" },
                      onClick: () => setEmailNotification(null)
                    },
                    "Dismiss"
                  )
                ),
                React.createElement(
                  "div",
                  { style: { fontSize: "13px", color: "#1e3a2b" } },
                  emailNotification.message
                ),
                React.createElement(
                  "div",
                  { style: { display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" } },
                  React.createElement(
                    "a",
                    {
                      href: emailNotification.emailData.gmailUrl,
                      target: "_blank",
                      rel: "noopener noreferrer",
                      className: "btn-admin btn-admin-primary",
                      style: { padding: "6px 12px", fontSize: "12px", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }
                    },
                    React.createElement(Icons.External, null),
                    "Open in Gmail"
                  ),
                  React.createElement(
                    "a",
                    {
                      href: emailNotification.emailData.mailtoUrl,
                      className: "btn-admin btn-admin-secondary",
                      style: { padding: "6px 12px", fontSize: "12px", textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }
                    },
                    React.createElement(Icons.Mail, null),
                    "Default Email Client"
                  ),
                  React.createElement(
                    "button",
                    {
                      className: "btn-admin btn-admin-secondary",
                      style: { padding: "6px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "6px" },
                      onClick: () => copyToClipboard(emailNotification.emailData.body)
                    },
                    React.createElement(Icons.Copy, null),
                    copiedNotification ? "Copied to Clipboard!" : "Copy Email Text"
                  )
                )
              ),

            // Candidate Profile Strip
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", background: "var(--admin-bg)", padding: "16px", borderRadius: "10px", border: "1px solid var(--admin-border)" } },
              React.createElement("div", null, React.createElement("div", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "NAME"), React.createElement("div", { style: { fontWeight: "600" } }, selectedApp.applicant?.name)),
              React.createElement("div", null, React.createElement("div", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "PHONE"), React.createElement("div", { style: { fontWeight: "600" } }, React.createElement("a", { href: `https://wa.me/${(selectedApp.applicant?.phone || "").replace(/[^0-9]/g, "")}`, target: "_blank", style: { color: "var(--admin-gold-light)", textDecoration: "none" } }, selectedApp.applicant?.phone, " ↗"))),
              React.createElement("div", null, React.createElement("div", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "EMAIL"), React.createElement("div", { style: { fontWeight: "600" } }, selectedApp.applicant?.email || "—")),
              React.createElement("div", null, React.createElement("div", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "CITY / LOCATION"), React.createElement("div", { style: { fontWeight: "600" } }, selectedApp.applicant?.city || "Bengaluru"))
            ),

            // Candidate Email Communications & Audit Status
            React.createElement(
              "div",
              {
                style: {
                  background: "var(--admin-bg)",
                  padding: "16px",
                  borderRadius: "10px",
                  border: "1px solid var(--admin-border-subtle)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px"
                }
              },
              React.createElement(
                "div",
                { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                React.createElement(
                  "h4",
                  { style: { fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--admin-gold)", margin: 0 } },
                  "Candidate Email Notifications"
                ),
                React.createElement(
                  "span",
                  { style: { fontSize: "11px", color: "var(--admin-text-muted)" } },
                  "Sent from courses@pawpad.in"
                )
              ),

              React.createElement(
                "div",
                { style: { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" } },
                selectedApp.interviewDate &&
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: "12px",
                        padding: "6px 10px",
                        background: "var(--admin-card)",
                        borderRadius: "6px",
                        border: "1px solid var(--admin-border)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }
                    },
                    React.createElement("span", { style: { fontWeight: "600", color: "var(--admin-gold)" } }, "Interview:"),
                    React.createElement(
                      "span",
                      null,
                      window.PawpadApplicationsStore
                        ? window.PawpadApplicationsStore.formatInterviewDate(selectedApp.interviewDate)
                        : selectedApp.interviewDate
                    ),
                    React.createElement(
                      "button",
                      {
                        className: "btn-admin btn-admin-secondary",
                        style: { padding: "2px 8px", fontSize: "11px" },
                        onClick: () => {
                          if (window.PawpadApplicationsStore) {
                            const preview = window.PawpadApplicationsStore.generateInterviewEmail(selectedApp, selectedApp.interviewDate);
                            setPreviewModalData({ title: "Interview Notification Preview", emailData: preview });
                          }
                        }
                      },
                      "Preview / Resend"
                    )
                  ),
                selectedApp.status === "approved" &&
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: "12px",
                        padding: "6px 10px",
                        background: "var(--admin-card)",
                        borderRadius: "6px",
                        border: "1px solid var(--admin-border)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }
                    },
                    React.createElement("span", { style: { fontWeight: "600", color: "var(--admin-success, #166534)" } }, "Admission:"),
                    React.createElement("span", null, "Application Approved"),
                    React.createElement(
                      "button",
                      {
                        className: "btn-admin btn-admin-secondary",
                        style: { padding: "2px 8px", fontSize: "11px" },
                        onClick: () => {
                          if (window.PawpadApplicationsStore) {
                            const preview = window.PawpadApplicationsStore.generateApprovalEmail(selectedApp);
                            setPreviewModalData({ title: "Course Approval Confirmation Preview", emailData: preview });
                          }
                        }
                      },
                      "Preview / Resend"
                    )
                  ),
                selectedApp.status === "enrolled" &&
                  React.createElement(
                    "div",
                    {
                      style: {
                        fontSize: "12px",
                        padding: "6px 10px",
                        background: "rgba(16, 185, 129, 0.1)",
                        borderRadius: "6px",
                        border: "1px solid rgba(16, 185, 129, 0.3)",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }
                    },
                    React.createElement("span", { style: { fontWeight: "600", color: "var(--admin-success, #10b981)" } }, "Enrollment:"),
                    React.createElement("span", null, "Deposit Confirmed & Enrolled"),
                    React.createElement(
                      "button",
                      {
                        className: "btn-admin btn-admin-secondary",
                        style: { padding: "2px 8px", fontSize: "11px" },
                        onClick: () => {
                          if (window.PawpadApplicationsStore) {
                            const preview = window.PawpadApplicationsStore.generateApprovalEmail(selectedApp);
                            setPreviewModalData({ title: "Admission Confirmation Preview", emailData: preview });
                          }
                        }
                      },
                      "Admission Letter"
                    )
                  )
              )
            ),

            // Questionnaire Responses
            React.createElement(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: "14px" } },
              React.createElement("h4", { style: { fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--admin-gold)" } }, "Candidate Questionnaire"),

              React.createElement(
                "div",
                { style: { background: "var(--admin-bg)", padding: "14px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)" } },
                React.createElement("div", { style: { fontSize: "12px", color: "var(--admin-text-muted)", marginBottom: "4px" } }, "Why do you want to take this course?"),
                React.createElement("p", { style: { fontSize: "14px", lineHeight: "1.6" } }, selectedApp.responses?.why || "—")
              ),

              React.createElement(
                "div",
                { style: { background: "var(--admin-bg)", padding: "14px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)" } },
                React.createElement("div", { style: { fontSize: "12px", color: "var(--admin-text-muted)", marginBottom: "4px" } }, "Prior handling & grooming experience:"),
                React.createElement("p", { style: { fontSize: "14px", lineHeight: "1.6" } }, selectedApp.responses?.experience || "None specified")
              ),

              React.createElement(
                "div",
                { style: { background: "var(--admin-bg)", padding: "14px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)" } },
                React.createElement("div", { style: { fontSize: "12px", color: "var(--admin-text-muted)", marginBottom: "4px" } }, "How would you handle a dog/cat that is resisting or struggling?"),
                React.createElement("p", { style: { fontSize: "14px", lineHeight: "1.6" } }, selectedApp.responses?.handling || "—")
              ),

              selectedApp.responses?.healthDisclosure &&
              React.createElement(
                "div",
                { style: { background: "var(--admin-bg)", padding: "14px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)" } },
                React.createElement("div", { style: { fontSize: "12px", color: "var(--admin-text-muted)", marginBottom: "4px" } }, "Health & Physical Readiness Disclosure:"),
                React.createElement("p", { style: { fontSize: "14px", lineHeight: "1.6" } }, selectedApp.responses.healthDisclosure)
              ),

              // Every other answer the form collected (consulting details, physical capability, ...)
              ...Object.keys(selectedApp.responses || {})
                .filter((key) => !["why", "experience", "handling", "careerFit", "healthDisclosure"].includes(key) && selectedApp.responses[key])
                .map((key) =>
                  React.createElement(
                    "div",
                    { key: "resp-" + key, style: { background: "var(--admin-bg)", padding: "14px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)" } },
                    React.createElement("div", { style: { fontSize: "12px", color: "var(--admin-text-muted)", marginBottom: "4px" } },
                      key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) + ":"
                    ),
                    React.createElement("p", { style: { fontSize: "14px", lineHeight: "1.6", whiteSpace: "pre-wrap" } }, String(selectedApp.responses[key]))
                  )
                )
            ),

            // Payments (course fee): only after an Owner/Administrator approved; needed before enrolling
            (selectedApp.status === "approved" || selectedApp.status === "enrolled" || (selectedApp.payments || []).length > 0) && React.createElement(
              "div",
              { "data-section": "payments", style: { display: "flex", flexDirection: "column", gap: "10px" } },
              React.createElement("h4", { style: { fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--admin-gold)" } },
                "Payments", (selectedApp.payments || []).length > 0 ? ` · ${formatRupees(selectedApp.paidTotal)} received` : ""),
              (selectedApp.payments || []).length === 0
                ? React.createElement("p", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "No payment recorded yet. Record the payment, then click Confirm Enrolled.")
                : (selectedApp.payments || []).map((p) => React.createElement(
                    "div",
                    { key: p.id, style: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap", fontSize: "13px", padding: "8px 12px", background: "var(--admin-bg)", borderRadius: "6px", border: "1px solid var(--admin-border-subtle)" } },
                    React.createElement("strong", null, formatRupees(p.amount)),
                    React.createElement("span", null, `${p.paidOn} · ${p.modeLabel}${p.reference ? ` · Ref ${p.reference}` : ""}`),
                    React.createElement("span", { style: { color: "var(--admin-text-faint)", fontSize: "11px", flex: 1 } }, `recorded by ${p.recordedBy}`),
                    canAdmin && React.createElement("button", { className: "btn-admin btn-admin-secondary", style: { padding: "3px 8px", fontSize: "11px" }, onClick: () => handleDeletePayment(p) }, "Remove")
                  )),
              (selectedApp.status === "approved" || selectedApp.status === "enrolled") && React.createElement(
                "div",
                { style: { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" } },
                React.createElement("input", { className: "input-field", inputMode: "decimal", placeholder: "Amount (₹)", "aria-label": "Payment amount", value: payment.amount, onChange: (e) => setPayment({ ...payment, amount: e.target.value }), style: { width: "130px" } }),
                React.createElement("input", { type: "date", className: "input-field", "aria-label": "Payment date", value: payment.paidOn, max: todayString(), onChange: (e) => setPayment({ ...payment, paidOn: e.target.value }), style: { width: "auto" } }),
                React.createElement(
                  "select",
                  { className: "input-field", "aria-label": "Payment mode", value: payment.mode, onChange: (e) => setPayment({ ...payment, mode: e.target.value }), style: { width: "auto" } },
                  React.createElement("option", { value: "" }, "Paid by…"),
                  PAYMENT_MODE_OPTIONS.map(([value, label]) => React.createElement("option", { key: value, value }, label))
                ),
                React.createElement("input", { className: "input-field", placeholder: "Reference no. (UTR / receipt)", "aria-label": "Payment reference", value: payment.reference, onChange: (e) => setPayment({ ...payment, reference: e.target.value }), style: { flex: 1, minWidth: "160px" } }),
                React.createElement("button", { className: "btn-admin btn-admin-primary", disabled: savingPayment, onClick: handleRecordPayment }, savingPayment ? "Saving…" : "Record Payment")
              ),
              paymentNotice && React.createElement("p", { role: "status", style: { fontSize: "13px", fontWeight: 600, color: paymentNotice.startsWith("✓") ? "var(--admin-success)" : "var(--admin-danger)" } }, paymentNotice)
            ),

            // Staff Notes and Audit Trail
            React.createElement(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: "12px" } },
              React.createElement("h4", { style: { fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--admin-gold)" } }, "Staff Notes & Admissions Log"),

              React.createElement(
                "div",
                { style: { maxHeight: "140px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" } },
                (selectedApp.staffNotes || []).map((note, idx) =>
                  React.createElement(
                    "div",
                    { key: idx, style: { fontSize: "13px", padding: "8px 12px", background: "var(--admin-bg)", borderRadius: "6px", border: "1px solid var(--admin-border-subtle)" } },
                    React.createElement("span", { style: { color: "var(--admin-gold-light)", fontWeight: "600" } }, note.author, " "),
                    React.createElement("span", { style: { color: "var(--admin-text-faint)", fontSize: "11px" } }, "· ", new Date(note.date).toLocaleString(), ": "),
                    React.createElement("span", null, note.text)
                  )
                )
              ),

              React.createElement(
                "div",
                { style: { display: "flex", gap: "8px" } },
                React.createElement("input", {
                  type: "text",
                  className: "input-field",
                  placeholder: "Add private internal staff note...",
                  value: newNote,
                  onChange: (e) => setNewNote(e.target.value),
                  onKeyDown: (e) => {
                    if (e.key === "Enter") handleAddNote(selectedApp.id);
                  }
                }),
                React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: () => handleAddNote(selectedApp.id) }, "Add Note")
              )
            )
          ),

          // Modal Footer Actions
          React.createElement(
            "div",
            { style: { padding: "18px 28px", borderTop: "1px solid var(--admin-border)", background: "var(--admin-sidebar)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" } },

            // Left: Status context or Interview Scheduling
            selectedApp.status === "enrolled"
              ? React.createElement(
                  "div",
                  { style: { display: "flex", alignItems: "center", gap: "8px", color: "var(--admin-success, #10b981)", fontSize: "13px", fontWeight: "600" } },
                  React.createElement(Icons.Check, null),
                  "Student Enrolled — Admission & Seat Confirmed"
                )
              : selectedApp.status === "rejected"
              ? React.createElement(
                  "div",
                  { style: { color: "var(--admin-danger, #f87171)", fontSize: "13px", fontWeight: "500" } },
                  "Application status: Declined"
                )
              : selectedApp.status === "approved"
              ? React.createElement(
                  "div",
                  { style: { color: "var(--admin-gold, #f59e0b)", fontSize: "13px", fontWeight: "500" } },
                  "Application Approved · record the payment, then Confirm Enrolled"
                )
              : React.createElement(
                  "div",
                  { style: { display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" } },
                  !canAdmin && selectedApp.status === "interview_scheduled" && React.createElement("span", { "data-pending-admin": "true", style: { flexBasis: "100%", fontSize: "13px", color: "var(--admin-gold)", fontWeight: 600 } },
                    "Pending Admin Approval — after the interview an Owner or Administrator approves or declines. You can still change the interview time."),
                  React.createElement("span", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "Interview Date:"),
                  React.createElement("input", {
                    type: "datetime-local",
                    className: "input-field",
                    style: { width: "210px", padding: "6px 10px", fontSize: "12px" },
                    value: interviewInput,
                    onChange: (e) => setInterviewInput(e.target.value)
                  }),
                  React.createElement(
                    "button",
                    {
                      className: "btn-admin btn-admin-primary",
                      disabled: isSendingMail,
                      style: { padding: "6px 14px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" },
                      onClick: handleScheduleInterview
                    },
                    React.createElement(Icons.Mail, null),
                    isSendingMail ? "Scheduling & Sending..." : (selectedApp.interviewDate ? "Reschedule & Send Invite" : "Schedule & Send Invite")
                  )
                ),

            // Right: Contextual Action Buttons
            React.createElement(
              "div",
              { style: { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" } },

              // Rejected state actions
              canAdmin && selectedApp.status === "rejected" &&
                React.createElement(
                  "button",
                  {
                    className: "btn-admin btn-admin-secondary",
                    style: { padding: "10px 16px" },
                    onClick: () => handleStatusChange(selectedApp.id, "pending_review", "Application reopened for review.")
                  },
                  "Reopen for Review"
                ),
              canAdmin && React.createElement(
                  "button",
                  {
                    className: "btn-admin btn-admin-danger",
                    style: { padding: "10px 18px", display: "flex", alignItems: "center", gap: "6px" },
                    onClick: () => handleDelete(selectedApp)
                  },
                  React.createElement(Icons.Trash, null),
                  " Delete Candidate"
                ),

              // Decline action (Only available if NOT rejected and NOT enrolled)
              canAdmin && (selectedApp.status === "pending_review" || selectedApp.status === "interview_scheduled" || selectedApp.status === "approved") &&
                React.createElement(
                  "button",
                  {
                    className: "btn-admin btn-admin-danger",
                    style: { padding: "10px 16px" },
                    disabled: isSendingMail,
                    onClick: handleDecline
                  },
                  "Decline"
                ),

              // Approve action (Only available if pending_review or interview_scheduled)
              canAdmin && (selectedApp.status === "pending_review" || selectedApp.status === "interview_scheduled") &&
                React.createElement(
                  "button",
                  {
                    className: "btn-admin btn-admin-success",
                    disabled: isSendingMail,
                    style: { padding: "10px 20px", display: "flex", alignItems: "center", gap: "6px" },
                    onClick: handleApproveApplication
                  },
                  React.createElement(Icons.Check, null),
                  isSendingMail ? "Approving & Sending..." : "✓ Approve & Send Confirmation"
                ),

              // Confirm Enrolled (after approval; a Manager, who can't approve, may enrol any open application).
              // Needs a recorded payment — the server checks this too.
              selectedApp.status === "approved" &&
                React.createElement(
                  "button",
                  {
                    className: "btn-admin btn-admin-primary",
                    disabled: (selectedApp.payments || []).length === 0,
                    title: (selectedApp.payments || []).length === 0 ? "Record a payment first" : "Mark this candidate as enrolled",
                    style: { padding: "10px 20px", display: "flex", alignItems: "center", gap: "6px", opacity: (selectedApp.payments || []).length === 0 ? 0.5 : 1 },
                    onClick: () => handleStatusChange(selectedApp.id, "enrolled", "Payment received. Student successfully enrolled.")
                  },
                  React.createElement(Icons.Check, null),
                  "Confirm Enrolled"
                ),

              // Close / Done button
              React.createElement(
                "button",
                {
                  className: "btn-admin btn-admin-secondary",
                  style: { padding: "10px 18px" },
                  onClick: () => setSelectedApp(null)
                },
                selectedApp.status === "enrolled" ? "Done" : "Close"
              )
            )
          )
        )
      ),

      // Preview Email Modal
      previewModalData &&
      React.createElement(
        "div",
        {
          className: "modal-overlay",
          style: { zIndex: 1100 },
          onClick: () => setPreviewModalData(null)
        },
        React.createElement(
          "div",
          {
            className: "modal-card",
            style: { width: "650px", maxWidth: "100%", maxHeight: "85vh" },
            onClick: (e) => e.stopPropagation()
          },
          React.createElement(
            "div",
            {
              style: {
                padding: "16px 24px",
                borderBottom: "1px solid var(--admin-border)",
                background: "var(--admin-sidebar)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }
            },
            React.createElement("h3", { style: { margin: 0, fontSize: "16px" } }, previewModalData.title),
            React.createElement(
              "button",
              { className: "btn-admin btn-admin-secondary", style: { padding: "6px" }, onClick: () => setPreviewModalData(null) },
              React.createElement(Icons.Close, null)
            )
          ),
          React.createElement(
            "div",
            { style: { padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "14px" } },
            React.createElement(
              "div",
              { style: { fontSize: "13px", color: "var(--admin-text-muted)" } },
              React.createElement("strong", null, "Recipient: "),
              previewModalData.emailData.recipient,
              React.createElement("br", null),
              React.createElement("strong", null, "Subject: "),
              previewModalData.emailData.subject
            ),
            React.createElement(
              "textarea",
              {
                readOnly: true,
                className: "input-field",
                style: {
                  height: "300px",
                  fontFamily: "monospace",
                  fontSize: "12px",
                  lineHeight: "1.5",
                  whiteSpace: "pre-wrap",
                  padding: "12px"
                },
                value: previewModalData.emailData.body
              }
            )
          ),
          React.createElement(
            "div",
            {
              style: {
                padding: "14px 24px",
                borderTop: "1px solid var(--admin-border)",
                background: "var(--admin-sidebar)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "10px"
              }
            },
            React.createElement(
              "button",
              {
                className: "btn-admin btn-admin-secondary",
                onClick: () => copyToClipboard(previewModalData.emailData.body)
              },
              React.createElement(Icons.Copy, null),
              copiedNotification ? "Copied!" : "Copy Text"
            ),
            React.createElement(
              "div",
              { style: { display: "flex", gap: "8px" } },
              React.createElement(
                "a",
                {
                  href: previewModalData.emailData.gmailUrl,
                  target: "_blank",
                  rel: "noopener noreferrer",
                  className: "btn-admin btn-admin-primary",
                  style: { textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }
                },
                React.createElement(Icons.External, null),
                "Open in Gmail"
              ),
              React.createElement(
                "a",
                {
                  href: previewModalData.emailData.mailtoUrl,
                  className: "btn-admin btn-admin-secondary",
                  style: { textDecoration: "none", display: "flex", alignItems: "center", gap: "6px" }
                },
                React.createElement(Icons.Mail, null),
                "Default Mail Client"
              )
            )
          )
        )
      )
    );
  }

  // -------------------------------------------------------------
  // COURSE DOCUMENT UPLOAD & LINK WIDGET
  // -------------------------------------------------------------
  // Course pages that are part of the website itself (course_forms/ folder).
  const COURSE_FORM_PAGES = [
    "pawpad-essentials-cat-page.html",
    "pawpad-essentials-dog-page.html",
    "pawpad-foundations-page.html",
    "pawpad-practitioner-cat-page.html",
    "pawpad-practitioner-dog-page.html",
    "pawpad-studio-consulting-page.html",
    "pawpad-application-pacgc.html",
    "pawpad-application-pcgec.html",
    "pawpad-application-pcgpc.html",
    "pawpad-application-pfgec.html",
    "pawpad-application-pfgpc.html",
    "pawpad-application-consulting-gssc.html"
  ];

  function CourseDocUploadWidget({ label, currentUrl, onSelectUrl, acceptTypes = ".pdf", allowUpload = true }) {
    const existingFiles = COURSE_FORM_PAGES;
    const [uploading, setUploading] = useState(false);
    const [uploadSuccess, setUploadSuccess] = useState("");
    const fileInputRef = React.useRef(null);

    // New pages are added to the website code; from here you can upload a PDF (e.g. a syllabus) to the server.
    const handleFileUpload = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setUploadSuccess("⚠️ Only PDF files can be uploaded here.");
        return;
      }
      setUploading(true);
      setUploadSuccess("");
      const reader = new FileReader();
      reader.onload = async (evt) => {
        const upload = await window.PawpadApi.uploadFile("pdf", file.name, evt.target.result);
        setUploading(false);
        if (upload.ok) {
          onSelectUrl(upload.url);
          setUploadSuccess(`✓ Uploaded '${file.name}'. Click Save to publish.`);
        } else {
          setUploadSuccess(`⚠️ Upload failed: ${upload.error}`);
        }
        setTimeout(() => setUploadSuccess(""), 6000);
      };
      reader.onerror = () => {
        setUploading(false);
        setUploadSuccess("⚠️ The file could not be read.");
      };
      reader.readAsDataURL(file);
    };

    const cleanFilename = currentUrl
      ? (/^https?:\/\//.test(currentUrl) ? currentUrl.split("/").pop() : currentUrl.replace(/^\/?course_forms\//, ""))
      : "";
    // Relative to the admin page, so it also works when the site lives in a sub-folder (GitHub Pages).
    const previewHref = currentUrl
      ? (/^(https?:)?\/\//.test(currentUrl)
        ? currentUrl
        : currentUrl.replace(/^\/+/, "").replace(/^(?!course_forms\/|assets\/|uploads\/)([^/]+\.html)$/, "course_forms/$1"))
      : "";

    return React.createElement(
      "div",
      { style: { background: "var(--admin-bg)", padding: "14px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)", display: "flex", flexDirection: "column", gap: "10px" } },

      // Top Label & Preview Link
      React.createElement(
        "div",
        { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "6px" } },
        React.createElement("label", { style: { fontSize: "12px", fontWeight: "600", color: "var(--admin-gold-light)" } }, label),
        currentUrl &&
        React.createElement(
          "a",
          {
            href: previewHref,
            target: "_blank",
            rel: "noopener noreferrer",
            style: { fontSize: "11px", color: "var(--admin-gold)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "4px" }
          },
          "Preview File ↗"
        )
      ),

      // Status Pill & Action Buttons
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" } },
        React.createElement(
          "div",
          {
            style: {
              flex: "1",
              minWidth: "140px",
              background: "var(--admin-card)",
              padding: "7px 10px",
              borderRadius: "6px",
              border: "1px solid var(--admin-border)",
              fontSize: "12px",
              color: currentUrl ? "var(--admin-text)" : "var(--admin-text-faint)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap"
            }
          },
          currentUrl ? `📄 ${cleanFilename}` : "No document linked"
        ),
        React.createElement(
          "input",
          {
            type: "file",
            ref: fileInputRef,
            accept: acceptTypes,
            style: { display: "none" },
            onChange: handleFileUpload
          }
        ),
        allowUpload && React.createElement(
          "button",
          {
            type: "button",
            className: "btn-admin btn-admin-primary",
            style: { padding: "6px 12px", fontSize: "11px" },
            disabled: uploading,
            onClick: () => fileInputRef.current && fileInputRef.current.click()
          },
          uploading ? "Uploading..." : "📁 Upload PDF"
        ),
        currentUrl &&
        React.createElement(
          "button",
          {
            type: "button",
            className: "btn-admin btn-admin-secondary",
            style: { padding: "6px 8px", fontSize: "11px", color: "var(--admin-danger)" },
            onClick: () => onSelectUrl("")
          },
          "Unlink"
        )
      ),

      uploadSuccess &&
      React.createElement("span", { style: { color: uploadSuccess.startsWith("⚠️") ? "var(--admin-danger)" : "var(--admin-success)", fontSize: "11px", fontWeight: "600" } }, uploadSuccess),

      // Quick Select from course_forms/ directory
      existingFiles.length > 0 &&
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "8px" } },
        React.createElement("span", { style: { fontSize: "11px", color: "var(--admin-text-muted)", whiteSpace: "nowrap" } }, "Or select existing:"),
        React.createElement(
          "select",
          {
            className: "input-field",
            style: { padding: "5px 8px", fontSize: "11px", flex: "1" },
            value: cleanFilename,
            onChange: (e) => {
              if (e.target.value) {
                onSelectUrl(`course_forms/${e.target.value}`);
              }
            }
          },
          React.createElement("option", { value: "" }, "-- Choose from course_forms/ --"),
          existingFiles.map((fname) =>
            React.createElement("option", { key: fname, value: fname }, fname)
          )
        )
      )
    );
  }

  // -------------------------------------------------------------
  // LIST / PARAGRAPH TEXT BOX
  // Boxes like "Bullet Points (one per line)" are saved as a list. The text is
  // kept exactly as typed while editing, so Enter, blank lines and spaces work
  // and the cursor never jumps; empty lines are only dropped from the saved list.
  // -------------------------------------------------------------
  function ListTextarea({ value, onChange, separator, ...rest }) {
    const sep = separator || "\n";
    const normalize = (text) => String(text || "").split(sep).map((l) => l.trim()).filter((l) => l.length > 0).join(sep);
    const [raw, setRaw] = useState(value || "");
    useEffect(() => {
      // Only take the saved value when it really changed from outside (e.g. "Reset to default").
      if (normalize(value) !== normalize(raw)) setRaw(value || "");
    }, [value]);
    return React.createElement("textarea", {
      ...rest,
      value: raw,
      onChange: (e) => {
        setRaw(e.target.value);
        onChange(e);
      }
    });
  }

  // -------------------------------------------------------------
  // IMAGE UPLOAD & WEBP OPTIMIZATION WIDGET
  // -------------------------------------------------------------
  function ImageUploadWidget({ label, currentUrl, onSelectUrl }) {
    const [uploading, setUploading] = useState(false);
    const [statusMsg, setStatusMsg] = useState("");
    const fileInputRef = React.useRef(null);

    const handleImageUpload = async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      setUploading(true);
      setStatusMsg("Optimizing & converting to WebP...");

      let webpDataUrl = "";
      let originalBytes = file.size || 0;
      let webpBytes = 0;

      try {
        // Convert / optimize via PawpadImageOptimizer or direct Canvas
        if (window.PawpadImageOptimizer && (window.PawpadImageOptimizer.convertToWebP || window.PawpadImageOptimizer.optimizeImage)) {
          const fn = window.PawpadImageOptimizer.convertToWebP || window.PawpadImageOptimizer.optimizeImage;
          const result = await fn.call(window.PawpadImageOptimizer, file, 0.85, 1200);
          webpDataUrl = result.dataUrl;
          webpBytes = result.webpSizeBytes || result.optimizedSize || 0;
          if (result.originalSizeBytes) originalBytes = result.originalSizeBytes;
        } else {
          webpDataUrl = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.naturalWidth;
              canvas.height = img.naturalHeight;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0);
              resolve(canvas.toDataURL("image/webp", 0.85));
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
          });
          webpBytes = Math.round((webpDataUrl.length * 3) / 4);
        }

        // Save the compressed image on the Pawpad server so every visitor can load it.
        const upload = await window.PawpadApi.uploadFile("image", file.name, webpDataUrl);
        const savedPct = originalBytes && webpBytes ? Math.round(((originalBytes - webpBytes) / originalBytes) * 100) : 0;

        if (upload.ok) {
          onSelectUrl(upload.url);
          setStatusMsg(`✓ Uploaded to the server${savedPct > 0 ? ` (${savedPct}% smaller)` : ""}. Click Save to publish.`);
        } else {
          setStatusMsg(`⚠️ Upload failed: ${upload.error}`);
        }
      } catch (err) {
        console.error("Image upload/convert error:", err);
        setStatusMsg("Failed to convert image. Please check format.");
      } finally {
        setUploading(false);
        setTimeout(() => setStatusMsg(""), 6000);
      }
    };

    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "6px" } },
      label && React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, label),
      React.createElement(
        "div",
        { style: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" } },

        // Live Thumbnail
        currentUrl &&
        React.createElement("img", {
          src: currentUrl,
          alt: "Preview",
          style: { width: "38px", height: "38px", objectFit: "cover", borderRadius: "6px", border: "1px solid var(--admin-border)" },
          onError: (e) => {
            e.target.onerror = null;
            e.target.style.opacity = "0.4";
            e.target.title = "Image could not be loaded from this path";
          }
        }),

        // Hidden input & Button
        React.createElement("input", {
          type: "file",
          ref: fileInputRef,
          accept: "image/*",
          style: { display: "none" },
          onChange: handleImageUpload
        }),
        React.createElement(
          "button",
          {
            type: "button",
            className: "btn-admin btn-admin-primary",
            style: { padding: "7px 12px", fontSize: "12px" },
            disabled: uploading,
            onClick: () => fileInputRef.current && fileInputRef.current.click()
          },
          uploading ? "Converting..." : "📷 Upload & Convert to WebP"
        ),

        // Text input for direct path / slot reference
        React.createElement("input", {
          className: "input-field",
          style: { flex: "1", minWidth: "160px", padding: "7px 10px", fontSize: "12px" },
          placeholder: "assets/img/pawpad/...webp",
          value: currentUrl || "",
          onChange: (e) => onSelectUrl(e.target.value)
        })
      ),
      statusMsg &&
      React.createElement("span", { style: { color: "var(--admin-success)", fontSize: "11px", fontWeight: "600" } }, statusMsg)
    );
  }

  const GroomingImageUploadWidget = ImageUploadWidget;

  // -------------------------------------------------------------
  // REUSABLE CONFIRMATION MODAL (YES / NO)
  // -------------------------------------------------------------
  function ConfirmModal({ isOpen, title, message, confirmText, cancelText, confirmStyle, onConfirm, onCancel, altText, onAlt }) {
    if (!isOpen) return null;
    return React.createElement(
      "div",
      // Above any other window (e.g. the candidate popup it was opened from).
      { className: "modal-overlay", onClick: onCancel, style: { zIndex: 1300 } },
      React.createElement(
        "div",
        { className: "modal-card", style: { maxWidth: "500px", padding: "28px" }, onClick: (e) => e.stopPropagation() },
        React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "20px", color: "var(--admin-gold)", marginBottom: "12px" } }, title || "Confirm Action"),
        React.createElement("p", { style: { fontSize: "14px", color: "var(--admin-text)", lineHeight: "1.6", marginBottom: "24px" } }, message),
        React.createElement(
          "div",
          { style: { display: "flex", justifyContent: "flex-end", gap: "12px", flexWrap: "wrap" } },
          React.createElement("button", { type: "button", className: "btn-admin btn-admin-secondary", onClick: onCancel }, cancelText || "No, Cancel"),
          altText && React.createElement("button", { type: "button", className: "btn-admin btn-admin-secondary", onClick: onAlt }, altText),
          React.createElement("button", { type: "button", className: `btn-admin ${confirmStyle || "btn-admin-primary"}`, onClick: onConfirm }, confirmText || "Yes, Proceed")
        )
      )
    );
  }

  // -------------------------------------------------------------
  // SMALL CMS BUILDING BLOCKS (sections, fields, editable lists)
  // -------------------------------------------------------------
  const CMS_PAGE_OPTIONS = [
    ["home", "Home"], ["about", "About"], ["experience", "Experience"], ["grooming", "Grooming"], ["courses", "Courses"],
    ["studioSetup", "Studio Setup"], ["boarding", "Boarding"], ["myotherapy", "Myotherapy"], ["contact", "Contact"]
  ];

  function CmsSection({ title, hint, children }) {
    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "14px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
      React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, title),
      hint && React.createElement("p", { style: { fontSize: "12px", color: "var(--admin-text-muted)", margin: 0 } }, hint),
      children
    );
  }

  /** One labelled input. kind: "text" (default), "textarea", "image", "page" (page picker) or "checkbox". */
  function CmsField({ label, value, onChange, kind, placeholder, rows }) {
    const id = React.useId();
    const labelEl = React.createElement("label", { htmlFor: id, style: { display: "block", fontSize: "12px", color: "var(--admin-text-muted)", marginBottom: "4px" } }, label);
    if (kind === "image") {
      return React.createElement(ImageUploadWidget, { label, currentUrl: value || "", onSelectUrl: onChange });
    }
    if (kind === "lines") {
      // One item per line (e.g. bullet points); empty lines are dropped.
      return React.createElement("div", null, labelEl,
        React.createElement(ListTextarea, { id, separator: "\n", className: "input-field", rows: rows || 4, placeholder,
          value: Array.isArray(value) ? value.join("\n") : (value || ""),
          onChange: (e) => onChange(e.target.value.split("\n").map((l) => l.trim()).filter(Boolean)) }));
    }
    if (kind === "checkbox") {
      return React.createElement("label", { style: { display: "inline-flex", alignItems: "center", gap: "8px", fontSize: "13px", fontWeight: 600 } },
        React.createElement("input", { type: "checkbox", checked: Boolean(value), onChange: (e) => onChange(e.target.checked) }), label);
    }
    if (kind === "page") {
      const known = CMS_PAGE_OPTIONS.some(([k]) => k === value);
      return React.createElement("div", null, labelEl,
        React.createElement("select", { id, className: "input-field", value: known ? value : "", onChange: (e) => onChange(e.target.value) },
          !known && React.createElement("option", { value: "" }, value ? `"${value}" (not a page — choose one)` : "Choose a page…"),
          CMS_PAGE_OPTIONS.map(([k, l]) => React.createElement("option", { key: k, value: k }, l))));
    }
    return React.createElement("div", null, labelEl,
      kind === "textarea"
        ? React.createElement("textarea", { id, className: "input-field", rows: rows || 3, placeholder, value: value || "", onChange: (e) => onChange(e.target.value) })
        : React.createElement("input", { id, className: "input-field", placeholder, value: value || "", onChange: (e) => onChange(e.target.value) }));
  }

  /**
   * An editable list with Add, Remove and Move up/down.
   * fields: null for a list of plain text lines, or [{ key, label, kind }] for a list of cards.
   */
  function CmsList({ items, onChange, fields, addLabel, itemLabel, newItem, columns }) {
    const list = Array.isArray(items) ? items : [];
    const set = (i, value) => onChange(list.map((it, j) => (j === i ? value : it)));
    const move = (i, d) => {
      const j = i + d;
      if (j < 0 || j >= list.length) return;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      onChange(next);
    };
    const small = { padding: "3px 9px", fontSize: "12px" };
    const controls = (i) => React.createElement("div", { style: { display: "flex", gap: "6px", flexShrink: 0 } },
      React.createElement("button", { type: "button", className: "btn-admin btn-admin-secondary", style: small, disabled: i === 0, onClick: () => move(i, -1), "aria-label": "Move up" }, "↑"),
      React.createElement("button", { type: "button", className: "btn-admin btn-admin-secondary", style: small, disabled: i === list.length - 1, onClick: () => move(i, 1), "aria-label": "Move down" }, "↓"),
      React.createElement("button", { type: "button", className: "btn-admin btn-admin-danger", style: small, onClick: () => onChange(list.filter((_, j) => j !== i)), "aria-label": "Remove" }, "Remove"));
    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "10px" } },
      list.map((item, i) => fields
        ? React.createElement("div", { key: i, "data-cms-item": i, style: { background: "var(--admin-card)", padding: "14px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)", display: "flex", flexDirection: "column", gap: "10px" } },
            React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" } },
              React.createElement("strong", { style: { fontSize: "13px", color: "var(--admin-gold-light)" } }, `${itemLabel || "Item"} #${i + 1}`), controls(i)),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: columns || "1fr", gap: "10px" } },
              fields.map((f) => React.createElement("div", { key: f.key, style: f.kind === "textarea" || f.kind === "image" || f.wide ? { gridColumn: "1 / -1" } : null },
                React.createElement(CmsField, { label: f.label, kind: f.kind, value: (item || {})[f.key], onChange: (v) => set(i, { ...(item || {}), [f.key]: v }) })))))
        : React.createElement("div", { key: i, "data-cms-item": i, style: { display: "flex", gap: "8px", alignItems: "center" } },
            React.createElement("input", { className: "input-field", "aria-label": `${itemLabel || "Line"} ${i + 1}`, value: item || "", onChange: (e) => set(i, e.target.value) }), controls(i))),
      React.createElement("div", null,
        React.createElement("button", { type: "button", className: "btn-admin btn-admin-secondary", onClick: () => onChange([...list, newItem !== undefined ? JSON.parse(JSON.stringify(newItem)) : (fields ? {} : "")]) }, addLabel || "+ Add"))
    );
  }

  /**
   * A course's "Know More" page: title lines, intro, and sections (heading, text, bullet list).
   * Starts from the page's current text, so nothing has to be typed again.
   */
  function KnowMoreEditor({ course, onChange }) {
    const defaults = window.PawpadContentStore ? (window.PawpadContentStore.getDefault("courses").courseList || []) : [];
    const def = defaults.find((d) => d && d.key === course.key) || {};
    const km = course.knowMore || def.knowMore || { heading: String(course.title || "").replace(/\s*\([A-Z0-9]{2,12}\)\s*$/, ""), lede: course.desc || "", intro: [], sections: [], note: "" };
    const set = (patch) => onChange({ ...km, ...patch });
    const page = course.knowMoreUrl ? String(course.knowMoreUrl).replace(/^\/?/, "") : `course_forms/course.html?key=${encodeURIComponent(course.key || "")}`;
    return React.createElement(
      "details",
      { "data-knowmore": course.key, style: { background: "var(--admin-bg)", padding: "14px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)" } },
      React.createElement("summary", { style: { cursor: "pointer", fontWeight: 600, fontSize: "13px", color: "var(--admin-gold-light)" } }, "Know More page (click to edit)"),
      React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" } },
        React.createElement("p", { style: { fontSize: "12px", color: "var(--admin-text-muted)", margin: 0 } },
          "This is the page customers see when they click Know More. Write **words** between two stars to make them bold. ",
          React.createElement("a", { href: page, target: "_blank", rel: "noopener noreferrer", style: { color: "var(--admin-gold)" } }, "Open the live page ↗")),
        React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
          React.createElement(CmsField, { label: "Small line above the title", value: km.eyebrow, onChange: (v) => set({ eyebrow: v }) }),
          React.createElement(CmsField, { label: "Line under the title", value: km.breadcrumb, onChange: (v) => set({ breadcrumb: v }) })),
        React.createElement(CmsField, { label: "Page title", value: km.heading, onChange: (v) => set({ heading: v }) }),
        React.createElement(CmsField, { label: "Opening sentence (larger text)", kind: "textarea", rows: 2, value: km.lede, onChange: (v) => set({ lede: v }) }),
        React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Intro paragraphs"),
        React.createElement(CmsList, { items: km.intro, itemLabel: "Paragraph", addLabel: "+ Add paragraph", onChange: (list) => set({ intro: list }) }),
        React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Sections"),
        React.createElement(CmsList, {
          items: km.sections, itemLabel: "Section", addLabel: "+ Add section", columns: "1fr",
          newItem: { heading: "New section", text: "", items: [], numbered: false },
          fields: [
            { key: "heading", label: "Heading" },
            { key: "text", label: "Text (leave a blank line between paragraphs)", kind: "textarea" },
            { key: "items", label: "Bullet points (one per line)", kind: "lines", wide: true },
            { key: "numbered", label: "Number the points (1, 2, 3…)", kind: "checkbox" }
          ],
          onChange: (list) => set({ sections: list })
        }),
        React.createElement(CmsField, { label: "Note at the bottom (optional)", kind: "textarea", rows: 2, value: km.note, onChange: (v) => set({ note: v }) }),
        React.createElement("p", { style: { fontSize: "12px", color: "var(--admin-text-muted)", margin: 0 } }, "The Apply Now button is added at the end automatically and always opens this course's application form.")
      )
    );
  }

  // -------------------------------------------------------------
  // WEBSITE CONTENT CMS EDITOR TAB
  // -------------------------------------------------------------
  function ContentEditorTab() {
    const [selectedPage, setSelectedPage] = useState("home");
    const [formData, setFormData] = useState({});
    const [toastMessage, setToastMessage] = useState("");
    const [confirmModal, setConfirmModal] = useState({ isOpen: false });

    const pages = [
      { id: "home", label: "Home Page" },
      { id: "about", label: "About Page" },
      { id: "experience", label: "Experience Page" },
      { id: "grooming", label: "Grooming Service" },
      { id: "courses", label: "Courses & Academy" },
      { id: "studioSetup", label: "Studio Setup & Consulting" },
      { id: "boarding", label: "Boarding Service" },
      { id: "myotherapy", label: "Myotherapy & Wellness" },
      { id: "contact", label: "Contact & Timings" },
      { id: "footer", label: "Footer (all pages)" }
    ];

    useEffect(() => {
      if (window.PawpadContentStore) {
        setFormData(JSON.parse(JSON.stringify(window.PawpadContentStore.get(selectedPage))));
      }
    }, [selectedPage]);

    const handleSave = () => {
      const pageLabel = pages.find((p) => p.id === selectedPage)?.label || selectedPage;
      setConfirmModal({
        isOpen: true,
        title: "Save Live Changes",
        message: `Are you sure you want to save and publish your modifications to "${pageLabel}"? This will update the live website immediately.`,
        confirmText: "Yes, Save Changes",
        cancelText: "No, Keep Editing",
        confirmStyle: "btn-admin-primary",
        onConfirm: async () => {
          setConfirmModal({ isOpen: false });
          if (window.PawpadContentStore) {
            setToastMessage(`Publishing ${pageLabel}…`);
            window.PawpadContentStore.update(selectedPage, formData);
            const result = await window.PawpadContentStore.lastPublish;
            if (result.ok) {
              // Images uploaded while publishing now have their server address.
              setFormData(JSON.parse(JSON.stringify(window.PawpadContentStore.get(selectedPage))));
              setToastMessage(`✓ ${pageLabel} is published. Every visitor now sees these changes.`);
            } else {
              setToastMessage(`⚠️ Not published: ${result.error}`);
            }
            setTimeout(() => setToastMessage(""), result.ok ? 4000 : 9000);
          }
        }
      });
    };

    const handleResetPage = () => {
      const pageLabel = pages.find((p) => p.id === selectedPage)?.label || selectedPage;
      setConfirmModal({
        isOpen: true,
        title: "Reset to Default",
        message: `Are you sure you want to reset all modifications on the "${pageLabel}" page to factory defaults? All custom text, images, and pricing for this page will revert to standard defaults.`,
        confirmText: "Yes, Reset to Default",
        cancelText: "No, Cancel",
        confirmStyle: "btn-admin-danger",
        onConfirm: async () => {
          setConfirmModal({ isOpen: false });
          if (window.PawpadContentStore) {
            window.PawpadContentStore.resetPage(selectedPage);
            setFormData(JSON.parse(JSON.stringify(window.PawpadContentStore.get(selectedPage))));
            const result = await window.PawpadContentStore.lastPublish;
            setToastMessage(result.ok ? `Reset ${pageLabel} to the standard content and published it.` : `⚠️ Not published: ${result.error}`);
            setTimeout(() => setToastMessage(""), result.ok ? 4000 : 9000);
          }
        }
      });
    };

    const updateField = (field, val) => {
      setFormData((prev) => ({ ...prev, [field]: val }));
    };

    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "24px" } },

      // Confirmation Modal (Yes/No)
      React.createElement(ConfirmModal, {
        ...confirmModal,
        onCancel: () => setConfirmModal({ isOpen: false })
      }),

      // Page Selector Bar
      React.createElement(
        "div",
        { className: "card", style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" } },

        React.createElement(
          "div",
          { style: { display: "flex", gap: "6px", flexWrap: "wrap" } },
          pages.map((p) =>
            React.createElement(
              "button",
              {
                key: p.id,
                className: `btn-admin ${selectedPage === p.id ? "btn-admin-primary" : "btn-admin-secondary"}`,
                style: { padding: "8px 14px", fontSize: "13px" },
                onClick: () => setSelectedPage(p.id)
              },
              p.label
            )
          )
        ),

        React.createElement(
          "div",
          { style: { display: "flex", gap: "10px", alignItems: "center" } },
          toastMessage && React.createElement("span", { style: { color: "var(--admin-success)", fontSize: "13px", fontWeight: "600" } }, toastMessage),
          React.createElement("button", { type: "button", className: "btn-admin btn-admin-secondary", onClick: handleResetPage }, "Reset to Default"),
          React.createElement("button", { type: "button", className: "btn-admin btn-admin-primary", onClick: handleSave }, "Save Live Changes")
        )
      ),

      // Page Form Fields
      React.createElement(
        "div",
        { className: "card", style: { display: "flex", flexDirection: "column", gap: "20px" } },
        React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "20px", color: "var(--admin-gold)" } }, `Editing: ${pages.find((p) => p.id === selectedPage)?.label}`),

        // Dynamically Render Page Form Controls
        selectedPage === "home" &&
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "24px" } },

          // 1. Hero Section
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Hero Header & Cover"),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "Hero Eyebrow Pill"), React.createElement("input", { className: "input-field", value: formData.heroEyebrow || "", onChange: (e) => updateField("heroEyebrow", e.target.value) })),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Title Line 1"), React.createElement("input", { className: "input-field", value: formData.heroTitle1 || "", onChange: (e) => updateField("heroTitle1", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Title Line 2"), React.createElement("input", { className: "input-field", value: formData.heroTitle2 || "", onChange: (e) => updateField("heroTitle2", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Title Accent (Italics)"), React.createElement("input", { className: "input-field", value: formData.heroTitleAccent || "", onChange: (e) => updateField("heroTitleAccent", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Title End"), React.createElement("input", { className: "input-field", value: formData.heroTitleEnd || "", onChange: (e) => updateField("heroTitleEnd", e.target.value) }))
            ),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "Hero Lead Paragraph"), React.createElement("textarea", { className: "input-field", value: formData.heroLead || "", onChange: (e) => updateField("heroLead", e.target.value) })),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "Hero Secondary Subtext"), React.createElement("textarea", { className: "input-field", value: formData.heroSub || "", onChange: (e) => updateField("heroSub", e.target.value) })),
            React.createElement(ImageUploadWidget, {
              label: "Hero Cover Image (WebP Auto-Converted)",
              currentUrl: formData.heroImage || "",
              onSelectUrl: (newUrl) => updateField("heroImage", newUrl)
            }),

            // Hero Stats
            React.createElement(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: "10px", marginTop: "8px" } },
              React.createElement("h5", { style: { color: "var(--admin-gold-light)", fontSize: "13.5px" } }, "Hero Highlight Statistics"),
              React.createElement(
                "div",
                { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
                (formData.stats || [{ strong: "8+", label: "years of conscious care" }, { strong: "4,200+", label: "tails wagged" }, { strong: "0", label: "sedation, ever" }]).map((st, sidx) =>
                  React.createElement(
                    "div",
                    { key: sidx, style: { background: "var(--admin-card)", padding: "12px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)", display: "flex", flexDirection: "column", gap: "6px" } },
                    React.createElement("label", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, `Stat #${sidx + 1} Value`),
                    React.createElement("input", {
                      className: "input-field",
                      value: st.strong || "",
                      onChange: (e) => {
                        const list = [...(formData.stats || [{ strong: "8+", label: "years of conscious care" }, { strong: "4,200+", label: "tails wagged" }, { strong: "0", label: "sedation, ever" }])];
                        list[sidx] = { ...list[sidx], strong: e.target.value };
                        updateField("stats", list);
                      }
                    }),
                    React.createElement("label", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, `Stat #${sidx + 1} Label`),
                    React.createElement("input", {
                      className: "input-field",
                      value: st.label || "",
                      onChange: (e) => {
                        const list = [...(formData.stats || [{ strong: "8+", label: "years of conscious care" }, { strong: "4,200+", label: "tails wagged" }, { strong: "0", label: "sedation, ever" }])];
                        list[sidx] = { ...list[sidx], label: e.target.value };
                        updateField("stats", list);
                      }
                    })
                  )
                )
              )
            )
          ),

          // 2. Services Snapshot Cards
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Services Snapshot Cards (Homepage Grid)"),
            (formData.services || []).map((svc, idx) =>
              React.createElement(
                "div",
                {
                  key: svc.key || idx,
                  style: { background: "var(--admin-card)", padding: "16px", borderRadius: "10px", border: "1px solid var(--admin-border)", display: "flex", flexDirection: "column", gap: "12px" }
                },
                React.createElement(
                  "div",
                  { style: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--admin-border-subtle)", paddingBottom: "8px" } },
                  React.createElement("span", { style: { fontWeight: "700", fontSize: "14px", color: "var(--admin-text)" } }, `${svc.no || "0" + (idx + 1)} — ${svc.title || "Service"}`),
                  React.createElement("span", { className: "badge badge-approved", style: { fontSize: "11px" } }, `Key: ${svc.key || ""}`)
                ),
                React.createElement(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "10px" } },
                  React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Title"), React.createElement("input", { className: "input-field", value: svc.title || "", onChange: (e) => { const list = [...formData.services]; list[idx].title = e.target.value; updateField("services", list); } })),
                  React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Price Text"), React.createElement("input", { className: "input-field", value: svc.price || "", onChange: (e) => { const list = [...formData.services]; list[idx].price = e.target.value; updateField("services", list); } })),
                  React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "CTA Button Text"), React.createElement("input", { className: "input-field", value: svc.cta || "", onChange: (e) => { const list = [...formData.services]; list[idx].cta = e.target.value; updateField("services", list); } })),
                  React.createElement(CmsField, { label: "Target Page", kind: "page", value: svc.target || "", onChange: (v) => { const list = [...formData.services]; list[idx] = { ...list[idx], target: v }; updateField("services", list); } })
                ),
                React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Blurb / Short Description"), React.createElement("textarea", { className: "input-field", style: { minHeight: "60px" }, value: svc.blurb || "", onChange: (e) => { const list = [...formData.services]; list[idx].blurb = e.target.value; updateField("services", list); } })),
                React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Bullet Points (One per line)"), React.createElement(ListTextarea, { separator: "\n",  className: "input-field", style: { minHeight: "70px" }, value: Array.isArray(svc.points) ? svc.points.join("\n") : (svc.points || ""), onChange: (e) => { const list = [...formData.services]; list[idx].points = e.target.value.split("\n").filter((p) => p.trim().length > 0); updateField("services", list); } })),
                React.createElement(ImageUploadWidget, {
                  label: "Card Image (WebP Auto-Converted)",
                  currentUrl: svc.img || "",
                  onSelectUrl: (newUrl) => { const list = [...formData.services]; list[idx].img = newUrl; updateField("services", list); }
                })
              )
            )
          ),

          // 4. Values Strip Section
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Core Values Section"),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Eyebrow"), React.createElement("input", { className: "input-field", value: ((formData.values && formData.values.eyebrow)) ?? "The Pawpad way", onChange: (e) => updateField("values", { ...(formData.values || {}), eyebrow: e.target.value }) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Headline Title"), React.createElement("input", { className: "input-field", value: ((formData.values && formData.values.title)) ?? "Four quiet commitments that ", onChange: (e) => updateField("values", { ...(formData.values || {}), title: e.target.value }) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Title Accent (Italics)"), React.createElement("input", { className: "input-field", value: ((formData.values && formData.values.titleAccent)) ?? "change everything", onChange: (e) => updateField("values", { ...(formData.values || {}), titleAccent: e.target.value }) }))
            ),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              ((formData.values && formData.values.items) || [
                { title: "Never rushed", body: "We space appointments so every pet gets the time they need." },
                { title: "Listen first", body: "We read body language before we read calendars." },
                { title: "No sedation", body: "Ever. Some pets need three visits before we touch a clipper." },
                { title: "Skilled with fearful & rescue dogs", body: "Years of rescue work mean we know how to meet fearful animals." }
              ]).map((valItem, vidx) =>
                React.createElement(
                  "div",
                  { key: vidx, style: { background: "var(--admin-card)", padding: "14px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)", display: "flex", flexDirection: "column", gap: "8px" } },
                  React.createElement("label", { style: { fontSize: "12px", fontWeight: "600", color: "var(--admin-gold-light)" } }, `Value #${vidx + 1}`),
                  React.createElement("input", {
                    className: "input-field",
                    placeholder: "Title",
                    value: valItem.title || "",
                    onChange: (e) => {
                      const items = [...((formData.values && formData.values.items) || [])];
                      items[vidx] = { ...(items[vidx] || {}), title: e.target.value };
                      updateField("values", { ...(formData.values || {}), items });
                    }
                  }),
                  React.createElement("textarea", {
                    className: "input-field",
                    style: { minHeight: "65px", fontSize: "13px" },
                    placeholder: "Description",
                    value: valItem.body || "",
                    onChange: (e) => {
                      const items = [...((formData.values && formData.values.items) || [])];
                      items[vidx] = { ...(items[vidx] || {}), body: e.target.value };
                      updateField("values", { ...(formData.values || {}), items });
                    }
                  })
                )
              )
            )
          ),

          // 5. Marquee Ticker
          React.createElement(CmsSection, { title: "Marquee Scrolling Ticker", hint: "Each line scrolls past endlessly. Add as many as you like." },
            React.createElement(CmsList, { items: formData.marqueeItems, itemLabel: "Line", addLabel: "+ Add line", onChange: (list) => updateField("marqueeItems", list) })
          ),

          // 6. Testimonials
          React.createElement(CmsSection, { title: "Testimonials (Word of paw)", hint: "Shown one at a time on the home page. Quotation marks are added automatically." },
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
              ["eyebrow", "title", "titleAccent"].map((k) => React.createElement(CmsField, {
                key: k,
                label: { eyebrow: "Eyebrow", title: "Headline Title", titleAccent: "Title Accent (Italics)" }[k],
                value: (formData.testimonialsHead || {})[k],
                onChange: (v) => updateField("testimonialsHead", { ...(formData.testimonialsHead || {}), [k]: v })
              }))),
            React.createElement(CmsList, {
              items: formData.testimonials,
              itemLabel: "Testimonial",
              addLabel: "+ Add testimonial",
              columns: "1fr 1fr",
              fields: [{ key: "quote", label: "What they said", kind: "textarea" }, { key: "name", label: "Name" }, { key: "pet", label: "Pet / detail (e.g. Maggie)" }],
              onChange: (list) => updateField("testimonials", list)
            })
          )
        ),

        selectedPage === "experience" &&
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "24px" } },
          React.createElement(CmsSection, { title: "Page Header" },
            React.createElement(CmsField, { label: "Eyebrow", value: formData.eyebrow, onChange: (v) => updateField("eyebrow", v) }),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
              React.createElement(CmsField, { label: "Title start", value: formData.title, onChange: (v) => updateField("title", v) }),
              React.createElement(CmsField, { label: "Title accent (italics)", value: formData.titleAccent, onChange: (v) => updateField("titleAccent", v) }),
              React.createElement(CmsField, { label: "Title end", value: formData.titleEnd, onChange: (v) => updateField("titleEnd", v) })),
            React.createElement(CmsField, { label: "Lead paragraph", kind: "textarea", value: formData.lead, onChange: (v) => updateField("lead", v) })
          ),
          React.createElement(CmsSection, { title: "The Visit, Step by Step", hint: "Each step has its own photo. Numbers (01, 02…) are added automatically." },
            React.createElement(CmsList, {
              items: formData.steps, itemLabel: "Step", addLabel: "+ Add step", columns: "1fr",
              fields: [{ key: "title", label: "Title" }, { key: "body", label: "Text", kind: "textarea" }, { key: "img", label: "Photo (WebP Auto-Converted)", kind: "image" }],
              onChange: (list) => updateField("steps", list)
            })
          ),
          React.createElement(CmsSection, { title: "Handling Philosophy (two photos + text)" },
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
              ["eyebrow", "title", "titleAccent"].map((k) => React.createElement(CmsField, { key: k, label: { eyebrow: "Eyebrow", title: "Title", titleAccent: "Title accent (italics)" }[k], value: (formData.handling || {})[k], onChange: (v) => updateField("handling", { ...(formData.handling || {}), [k]: v }) }))),
            React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Paragraphs"),
            React.createElement(CmsList, { items: (formData.handling || {}).paragraphs, itemLabel: "Paragraph", addLabel: "+ Add paragraph", onChange: (list) => updateField("handling", { ...(formData.handling || {}), paragraphs: list }) }),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement(CmsField, { label: "Photo 1", kind: "image", value: (formData.handling || {}).img1, onChange: (v) => updateField("handling", { ...(formData.handling || {}), img1: v }) }),
              React.createElement(CmsField, { label: "Photo 2", kind: "image", value: (formData.handling || {}).img2, onChange: (v) => updateField("handling", { ...(formData.handling || {}), img2: v }) }),
              React.createElement(CmsField, { label: "Badge title", value: (formData.handling || {}).badgeTitle, onChange: (v) => updateField("handling", { ...(formData.handling || {}), badgeTitle: v }) }),
              React.createElement(CmsField, { label: "Badge text", value: (formData.handling || {}).badgeText, onChange: (v) => updateField("handling", { ...(formData.handling || {}), badgeText: v }) }))
          ),
          React.createElement(CmsSection, { title: "Products We Use" },
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "12px" } },
              ["eyebrow", "title", "titleAccent", "titleEnd"].map((k) => React.createElement(CmsField, { key: k, label: { eyebrow: "Eyebrow", title: "Title start", titleAccent: "Title accent (italics)", titleEnd: "Title end" }[k], value: (formData.products || {})[k], onChange: (v) => updateField("products", { ...(formData.products || {}), [k]: v }) }))),
            React.createElement(CmsField, { label: "Lead paragraph", kind: "textarea", value: (formData.products || {}).lead, onChange: (v) => updateField("products", { ...(formData.products || {}), lead: v }) }),
            React.createElement(CmsList, {
              items: (formData.products || {}).items, itemLabel: "Card", addLabel: "+ Add card", columns: "1fr",
              fields: [{ key: "name", label: "Title" }, { key: "note", label: "Text", kind: "textarea" }],
              onChange: (list) => updateField("products", { ...(formData.products || {}), items: list })
            })
          )
        ),

        selectedPage === "footer" &&
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "24px" } },
          React.createElement("p", { style: { fontSize: "13px", color: "var(--admin-text-muted)", margin: 0 } }, "The footer is the dark area at the bottom of every page. Changes here show on all pages."),
          React.createElement(CmsSection, { title: "Left: Call to Action" },
            React.createElement(CmsField, { label: "Eyebrow", value: formData.eyebrow, onChange: (v) => updateField("eyebrow", v) }),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement(CmsField, { label: "Headline (line 1)", value: formData.title, onChange: (v) => updateField("title", v) }),
              React.createElement(CmsField, { label: "Headline (line 2, italics)", value: formData.titleAccent, onChange: (v) => updateField("titleAccent", v) })),
            React.createElement(CmsField, { label: "Paragraph", kind: "textarea", value: formData.lead, onChange: (v) => updateField("lead", v) }),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement(CmsField, { label: "Button text (leave empty to hide)", value: formData.buttonText, onChange: (v) => updateField("buttonText", v) }),
              React.createElement(CmsField, { label: "Button goes to", kind: "page", value: formData.buttonTarget, onChange: (v) => updateField("buttonTarget", v) }))
          ),
          React.createElement(CmsSection, { title: "Hours" },
            React.createElement(CmsField, { label: "Heading", value: formData.hoursTitle, onChange: (v) => updateField("hoursTitle", v) }),
            React.createElement(CmsList, { items: formData.hoursLines, itemLabel: "Line", addLabel: "+ Add line", onChange: (list) => updateField("hoursLines", list) })
          ),
          React.createElement(CmsSection, { title: "Address & Contact" },
            React.createElement(CmsField, { label: "Heading", value: formData.addressTitle, onChange: (v) => updateField("addressTitle", v) }),
            React.createElement(CmsList, { items: formData.addressLines, itemLabel: "Address line", addLabel: "+ Add line", onChange: (list) => updateField("addressLines", list) }),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
              React.createElement(CmsField, { label: "Phone (as shown)", value: formData.phoneDisplay, onChange: (v) => updateField("phoneDisplay", v) }),
              React.createElement(CmsField, { label: "Phone (for calling, e.g. +919148443330)", value: formData.phone, onChange: (v) => updateField("phone", v) }),
              React.createElement(CmsField, { label: "Email (optional)", value: formData.email, onChange: (v) => updateField("email", v) })),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
              React.createElement(CmsField, { label: "Instagram link (empty = hide)", value: formData.instagram, onChange: (v) => updateField("instagram", v) }),
              React.createElement(CmsField, { label: "Facebook link (empty = hide)", value: formData.facebook, onChange: (v) => updateField("facebook", v) }),
              React.createElement(CmsField, { label: "X / Twitter link (empty = hide)", value: formData.twitter, onChange: (v) => updateField("twitter", v) }))
          ),
          React.createElement(CmsSection, { title: "Bottom Row", hint: "The Explore links always list the website's pages." },
            React.createElement(CmsField, { label: "Explore heading", value: formData.exploreTitle, onChange: (v) => updateField("exploreTitle", v) }),
            React.createElement(CmsField, { label: "Footer logo (upload a large PNG for the sharpest result)", kind: "image", value: formData.logo, onChange: (v) => updateField("logo", v) }),
            React.createElement(CmsField, { label: "Copyright line", value: formData.copyright, onChange: (v) => updateField("copyright", v) })
          )
        ),

        selectedPage === "courses" &&
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "24px" } },

          // Header Settings
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Page Header & Hero"),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "Eyebrow"), React.createElement("input", { className: "input-field", value: formData.eyebrow || "", onChange: (e) => updateField("eyebrow", e.target.value) })),
            // The website shows: Title start + accent (italics) + end. Saving also updates the plain "title".
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
              [["title1", "Headline Title (start)"], ["titleAccent", "Title Accent (italics)"], ["titleEnd", "Title End (optional)"]].map(([k, label]) =>
                React.createElement(CmsField, {
                  key: k, label, value: formData[k],
                  onChange: (v) => setFormData((prev) => {
                    const next = { ...prev, [k]: v };
                    next.title = [next.title1, next.titleAccent, next.titleEnd].filter(Boolean).join(" ");
                    return next;
                  })
                }))),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "Lead Text"), React.createElement("textarea", { className: "input-field", value: formData.lead || "", onChange: (e) => updateField("lead", e.target.value) })),
            React.createElement(ImageUploadWidget, {
              label: "Hero Snapshot Image (WebP Auto-Converted)",
              currentUrl: (formData.heroImage && !formData.heroImage.includes("courses-snapshot") && !formData.heroImage.includes("courses-cover-image")) ? formData.heroImage : "assets/img/pawpad/courses-cover-new.webp",
              onSelectUrl: (newUrl) => updateField("heroImage", newUrl)
            })
          ),

          // Global Admissions & Application Form Settings
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Admissions & Application Form Policies"),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" } },
              React.createElement(
                "div",
                { style: { gridColumn: "1 / -1" } },
                React.createElement("label", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "Cohort Deposit Requirement Notice"),
                React.createElement("textarea", {
                  className: "input-field",
                  style: { minHeight: "65px" },
                  value: formData.depositNotice || "",
                  onChange: (e) => updateField("depositNotice", e.target.value)
                })
              ),
              React.createElement(
                "div",
                { style: { gridColumn: "1 / -1" } },
                React.createElement("label", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "Admissions Review Note"),
                React.createElement("textarea", {
                  className: "input-field",
                  style: { minHeight: "65px" },
                  value: formData.admissionsNote || "",
                  onChange: (e) => updateField("admissionsNote", e.target.value)
                })
              ),
              React.createElement(
                "div",
                { style: { display: "flex", alignItems: "center", gap: "10px", marginTop: "4px" } },
                React.createElement("input", {
                  type: "checkbox",
                  id: "allowSubmissionsCheck",
                  checked: formData.allowSubmissions !== false,
                  onChange: (e) => updateField("allowSubmissions", e.target.checked)
                }),
                React.createElement("label", { htmlFor: "allowSubmissionsCheck", style: { fontSize: "13px", color: "var(--admin-text)", cursor: "pointer" } }, "Accept New Candidate Applications Online")
              ),
              formData.allowSubmissions === false && React.createElement("div", { style: { gridColumn: "1 / -1" } },
                React.createElement(CmsField, { label: "Message shown on the application forms while applications are closed", kind: "textarea", rows: 2, value: (formData.closedMessage) ?? "We are not taking new applications for this course at the moment.", onChange: (v) => updateField("closedMessage", v) })),
              React.createElement(
                "div",
                { style: { gridColumn: "1 / -1", marginTop: "8px" } },
                React.createElement("label", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "Course Applications & Enquiries Web3Forms Access Key"),
                React.createElement("input", {
                  className: "input-field",
                  placeholder: "e.g. a9a21b4b-47ee-4889-b709-9f101c59874d",
                  value: formData.web3FormsAccessKey || "",
                  onChange: (e) => updateField("web3FormsAccessKey", e.target.value)
                })
              )
            )
          ),

          // Course Offerings & Programs List
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px" } },
            React.createElement(
              "div",
              { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" } },
              React.createElement(
                "div",
                null,
                React.createElement("h4", { style: { color: "var(--admin-gold-light)", fontSize: "17px", fontFamily: "var(--font-display)" } }, "Academy Programs & Courses (", (formData.courseList || []).length, ")"),
                React.createElement("p", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Configure curriculum tracks, course fees, deposit requirements, and each course's Know More page.")
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  className: "btn-admin btn-admin-primary",
                  style: { padding: "8px 16px", fontSize: "13px" },
                  onClick: () => {
                    const list = formData.courseList && Array.isArray(formData.courseList) ? [...formData.courseList] : [];
                    list.unshift({
                      key: "course-" + Date.now(),
                      code: "NAC",
                      cat: "Certification",
                      title: "New Academy Course",
                      price: "₹35,000",
                      priceNum: 35000,
                      deposit: "₹8,750",
                      duration: "2 weeks",
                      img: "assets/img/pawpad/courses-cover-new.webp",
                      knowMoreUrl: "",
                      enrollUrl: "course_forms/pawpad-application-pacgc.html",
                      desc: "Hands-on professional grooming training with live handling practice.",
                      includes: ["Practical handling sessions", "Skin & coat care", "Tool safety"],
                      note: "Admission criteria and guidelines for this course."
                    });
                    updateField("courseList", list);
                  }
                },
                "+ Add New Course / Academy Program"
              )
            ),

            // Individual Course Cards
            (formData.courseList || []).map((course, idx) =>
              React.createElement(
                "div",
                {
                  key: course.key || idx,
                  style: {
                    background: "var(--admin-bg)",
                    padding: "20px",
                    borderRadius: "10px",
                    border: "1px solid var(--admin-border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px"
                  }
                },

                // Top Title / Category Bar
                React.createElement(
                  "div",
                  { style: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--admin-border-subtle)", paddingBottom: "12px" } },
                  React.createElement(
                    "div",
                    { style: { display: "flex", alignItems: "center", gap: "10px" } },
                    React.createElement("span", { style: { fontWeight: "700", fontSize: "15px", color: "var(--admin-text)" } }, `#${idx + 1} ${course.title || "Untitled Course"}`),
                    React.createElement("span", { className: "badge badge-approved", style: { fontSize: "11px" } }, course.cat || "Academy")
                  ),
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      className: "btn-admin btn-admin-danger",
                      style: { padding: "4px 10px", fontSize: "12px" },
                      onClick: () => {
                        if (confirm(`Remove '${course.title}' course offering?`)) {
                          const list = [...formData.courseList];
                          list.splice(idx, 1);
                          updateField("courseList", list);
                        }
                      }
                    },
                    "Delete Course"
                  )
                ),

                // Fields Grid
                React.createElement(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr", gap: "12px" } },

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Course Name"),
                    React.createElement("input", {
                      className: "input-field",
                      value: course.title || "",
                      onChange: (e) => {
                        const list = [...formData.courseList];
                        list[idx].title = e.target.value;
                        updateField("courseList", list);
                      }
                    })
                  ),

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Course Code / Abbreviation"),
                    React.createElement("input", {
                      className: "input-field",
                      placeholder: "e.g. PCGEC, PFGEC, CSM",
                      // The code is shown to candidates and starts their application number (e.g. PCGEC - 007).
                      // The internal key stays the same, so the course keeps its pages and order.
                      value: course.code !== undefined ? course.code : String(course.key || "").toUpperCase(),
                      onChange: (e) => {
                        const list = [...formData.courseList];
                        const code = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
                        // Keep the "(CODE)" at the end of the course name in step with the code.
                        const title = String(list[idx].title || "");
                        list[idx] = { ...list[idx], code, title: code && /\([A-Z0-9]{1,12}\)\s*$/.test(title) ? title.replace(/\([A-Z0-9]{1,12}\)\s*$/, "(" + code + ")") : title };
                        updateField("courseList", list);
                      }
                    })
                  ),

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Program Track"),
                    React.createElement(
                      "select",
                      {
                        className: "input-field",
                        value: (course.cat) ?? "Certification",
                        onChange: (e) => {
                          const list = [...formData.courseList];
                          list[idx].cat = e.target.value;
                          updateField("courseList", list);
                        }
                      },
                      ["Comprehensive Certification", "Essentials", "Practitioner", "Foundations", "Mentorship", "Masterclass"].map((c) =>
                        React.createElement("option", { key: c, value: c }, c)
                      )
                    )
                  ),

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Total Fee Display"),
                    React.createElement("input", {
                      className: "input-field",
                      placeholder: "e.g. ₹95,000",
                      value: course.price || "",
                      onChange: (e) => {
                        const val = e.target.value;
                        const num = parseFloat(String(val).replace(/,/g, "").replace(/[^0-9.]/g, "")) || 0;
                        const list = [...formData.courseList];
                        list[idx].price = val;
                        list[idx].priceNum = num;
                        updateField("courseList", list);
                      }
                    })
                  ),

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Required Deposit"),
                    React.createElement("input", {
                      className: "input-field",
                      placeholder: "e.g. ₹23,750",
                      value: course.deposit || "",
                      onChange: (e) => {
                        const list = [...formData.courseList];
                        list[idx].deposit = e.target.value;
                        updateField("courseList", list);
                      }
                    })
                  ),

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Duration / Cohort"),
                    React.createElement("input", {
                      className: "input-field",
                      placeholder: "e.g. 7 weeks",
                      value: course.duration || "",
                      onChange: (e) => {
                        const list = [...formData.courseList];
                        list[idx].duration = e.target.value;
                        updateField("courseList", list);
                      }
                    })
                  )
                ),

                // Image & Document Upload Widgets
                React.createElement(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "14px", alignItems: "start" } },
                  React.createElement(ImageUploadWidget, {
                    label: "Course Cover Image (WebP Auto-Converted)",
                    currentUrl: course.img || "",
                    onSelectUrl: (newUrl) => {
                      const list = [...formData.courseList];
                      list[idx].img = newUrl;
                      updateField("courseList", list);
                    }
                  }),
                  React.createElement("div", { style: { gridColumn: "span 2", fontSize: "12px", color: "var(--admin-text-muted)", background: "var(--admin-bg)", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)" } },
                    React.createElement("strong", { style: { color: "var(--admin-gold-light)" } }, "Apply Now / Enroll Now"),
                    React.createElement("div", { style: { marginTop: "4px" } }, "Opens this course's application form: ", React.createElement("code", null, String(course.enrollUrl || "course_forms/pawpad-application-pacgc.html").replace(/^course_forms\//, "")), ". This link is fixed and can't be changed here."))
                ),

                React.createElement(KnowMoreEditor, {
                  course,
                  onChange: (km) => {
                    const list = [...formData.courseList];
                    list[idx] = { ...list[idx], knowMore: km };
                    updateField("courseList", list);
                  }
                }),

                // Description, Included Modules, Guidelines
                React.createElement(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Course Overview / Curriculum Summary"),
                    React.createElement("textarea", {
                      className: "input-field",
                      style: { minHeight: "85px", fontSize: "13px" },
                      value: course.desc || "",
                      onChange: (e) => {
                        const list = [...formData.courseList];
                        list[idx].desc = e.target.value;
                        updateField("courseList", list);
                      }
                    })
                  ),

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Included Highlights / Modules (One per line)"),
                    React.createElement(ListTextarea, { separator: "\n", 
                      className: "input-field",
                      style: { minHeight: "85px", fontSize: "13px" },
                      value: Array.isArray(course.includes) ? course.includes.join("\n") : (course.includes || ""),
                      onChange: (e) => {
                        const list = [...formData.courseList];
                        list[idx].includes = e.target.value.split("\n").filter((l) => l.trim().length > 0);
                        updateField("courseList", list);
                      }
                    })
                  )
                ),

                React.createElement(
                  "div",
                  null,
                  React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Eligibility & Admissions Notes"),
                  React.createElement("input", {
                    className: "input-field",
                    placeholder: "e.g. Flagship practitioner certification for individuals looking to launch their own salon...",
                    value: course.note || "",
                    onChange: (e) => {
                      const list = [...formData.courseList];
                      list[idx].note = e.target.value;
                      updateField("courseList", list);
                    }
                  })
                )
              )
            )
          )
          ,
          React.createElement(CmsSection, { title: "Student Testimonials", hint: "The quotes from past students on the Courses page. Remove them all to hide the section." },
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement(CmsField, { label: "Small line above the title", value: (formData.studentTestimonialsHead || {}).eyebrow, onChange: (v) => updateField("studentTestimonialsHead", { ...(formData.studentTestimonialsHead || {}), eyebrow: v }) }),
              React.createElement(CmsField, { label: "Section title", value: (formData.studentTestimonialsHead || {}).title, onChange: (v) => updateField("studentTestimonialsHead", { ...(formData.studentTestimonialsHead || {}), title: v }) })),
            React.createElement(CmsList, {
              items: formData.studentTestimonials, onChange: (v) => updateField("studentTestimonials", v),
              itemLabel: "Testimonial", addLabel: "+ Add testimonial", columns: "1fr 1fr", newItem: { name: "", studio: "", quote: "" },
              fields: [{ key: "name", label: "Student name" }, { key: "studio", label: "Their studio / business" }, { key: "quote", label: "What they said", kind: "textarea" }]
            })),
          React.createElement(CmsSection, { title: "Course Enquiry Form (bottom of the page)", hint: "The text next to the enquiry form, the button, and the message shown after sending." },
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement(CmsField, { label: "Small line above the title", value: formData.ctaEyebrow, onChange: (v) => updateField("ctaEyebrow", v) }),
              React.createElement(CmsField, { label: "Title", value: formData.ctaTitle, onChange: (v) => updateField("ctaTitle", v) })),
            React.createElement(CmsField, { label: "Text under the title", kind: "textarea", value: formData.ctaLead, onChange: (v) => updateField("ctaLead", v) }),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement(CmsField, { label: "Button text", value: formData.ctaButtonText, onChange: (v) => updateField("ctaButtonText", v) }),
              React.createElement(CmsField, { label: "Title after sending", value: formData.ctaSuccessTitle, onChange: (v) => updateField("ctaSuccessTitle", v) })),
            React.createElement(CmsField, { label: "Message after sending", kind: "textarea", rows: 2, value: formData.ctaSuccessText, onChange: (v) => updateField("ctaSuccessText", v) }),
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement(CmsField, { label: "Enquiries are sent to (email)", value: formData.courseEnquiryEmail, onChange: (v) => updateField("courseEnquiryEmail", v) }),
              React.createElement(CmsField, { label: "Email subject", value: formData.courseEnquirySubject, onChange: (v) => updateField("courseEnquirySubject", v) })))
        ),

        selectedPage === "grooming" &&
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "24px" } },

          // Header Settings
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Page Header & Hero"),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "Eyebrow"), React.createElement("input", { className: "input-field", value: formData.eyebrow || "", onChange: (e) => updateField("eyebrow", e.target.value) })),
            (() => {
              // Older saves have the whole headline in "title"; split it the same way the website does.
              const t = formData.title === undefined ? "Stress-free " : String(formData.title);
              const m = formData.titleAccent === undefined ? t.match(/^(.*\S)\s+(\S+)\s*$/) : null;
              const main = m ? m[1] + " " : t;
              const accent = formData.titleAccent !== undefined ? formData.titleAccent : (m ? m[2] : "");
              return React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
                React.createElement(CmsField, { label: "Headline Title", value: main, onChange: (v) => setFormData((prev) => ({ ...prev, title: v, titleAccent: accent })) }),
                React.createElement(CmsField, { label: "Title Accent (italics, next line)", value: accent, onChange: (v) => setFormData((prev) => ({ ...prev, title: main, titleAccent: v })) }));
            })(),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "Lead Text"), React.createElement("textarea", { className: "input-field", value: formData.lead || "", onChange: (e) => updateField("lead", e.target.value) })),
            React.createElement(GroomingImageUploadWidget, {
              label: "Hero Snapshot Image (WebP Auto-Converted)",
              currentUrl: formData.heroImage || "",
              onSelectUrl: (newUrl) => updateField("heroImage", newUrl)
            })
          ),

          // Packages & Services List
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px" } },
            React.createElement(
              "div",
              { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" } },
              React.createElement(
                "div",
                null,
                React.createElement("h4", { style: { color: "var(--admin-gold-light)", fontSize: "17px", fontFamily: "var(--font-display)" } }, "Grooming Services & Packages (", (formData.packages || []).length, ")"),
                React.createElement("p", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Add, edit, or customize pricing and details. New services go to the top (#1) in admin and are organized on the live site by species and care sections.")
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  className: "btn-admin btn-admin-primary",
                  style: { padding: "8px 16px", fontSize: "13px" },
                  onClick: () => {
                    const list = formData.packages && Array.isArray(formData.packages) ? [...formData.packages] : [];
                    list.unshift({
                      cat: "Dog",
                      key: "new-service-" + Date.now(),
                      title: "New Grooming Service",
                      sub: "Gentle coat care",
                      price: "₹1,500",
                      priceNum: 1500,
                      duration: "60 mins",
                      isDogOnly: true,
                      petType: "Dog",
                      img: "assets/img/pawpad/grooming-snapshot.webp",
                      includes: ["Bath & conditioning", "Blow dry", "Nail clipping"],
                      note: "Description for this new grooming service."
                    });
                    updateField("packages", list);
                  }
                },
                "+ Add New Grooming Package"
              )
            ),

            // Individual Package Cards
            (formData.packages || []).map((pkg, idx) => {
              const catLower = String(pkg.cat || "").toLowerCase();
              const isCat = pkg.isCatOnly === true || pkg.petType === "Cat" || catLower === "cat";
              const forBoth = pkg.allowPetTypeSelection === true && !pkg.isDogOnly && !pkg.isCatOnly;
              const petChoice = forBoth ? "Both" : isCat ? "Cat" : "Dog";
              const isCare = ["nail-clipping", "massage", "hygiene-clip", "bath-brush-dogs", "bath-brush-cats", "bath-brush-subscription"].includes(pkg.key) || (forBoth && (catLower === "care" || catLower === "wellness"));
              const sectionLabel = isCare ? "🛁 Care & Bath" : forBoth ? "🐾 Dogs & Cats" : isCat ? "🐱 Cat Services" : "🐶 Dog Services";
              const setPet = (choice) => {
                const list = [...formData.packages];
                list[idx] = { ...list[idx],
                  petType: choice === "Both" ? undefined : choice,
                  isDogOnly: choice === "Dog", isCatOnly: choice === "Cat", allowPetTypeSelection: choice === "Both" };
                updateField("packages", list);
              };

              return React.createElement(
                "div",
                {
                  key: pkg.key || idx,
                  style: {
                    background: "var(--admin-bg)",
                    padding: "20px",
                    borderRadius: "10px",
                    border: "1px solid var(--admin-border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px"
                  }
                },

                // Top Title / Category Bar
                React.createElement(
                  "div",
                  { style: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--admin-border-subtle)", paddingBottom: "12px" } },
                  React.createElement(
                    "div",
                    { style: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" } },
                    React.createElement("span", { style: { fontWeight: "700", fontSize: "15px", color: "var(--admin-text)" } }, `#${idx + 1} ${pkg.title || "Untitled Service"}`),
                    React.createElement("span", { className: "badge badge-approved", style: { fontSize: "11px" } }, pkg.cat || "General"),
                    React.createElement("span", { style: { fontSize: "11px", color: "var(--admin-gold)", background: "rgba(201, 168, 106, 0.12)", padding: "2px 8px", borderRadius: "6px" } }, sectionLabel)
                  ),
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      className: "btn-admin btn-admin-danger",
                      style: { padding: "4px 10px", fontSize: "12px" },
                      onClick: () => {
                        if (confirm(`Remove '${pkg.title}' grooming package?`)) {
                          const list = [...formData.packages];
                          list.splice(idx, 1);
                          updateField("packages", list);
                        }
                      }
                    },
                    "Delete Package"
                  )
                ),

                // Fields Grid
                React.createElement(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "12px" } },

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Service Name"),
                    React.createElement("input", {
                      className: "input-field",
                      value: pkg.title || "",
                      onChange: (e) => {
                        const list = [...formData.packages];
                        list[idx].title = e.target.value;
                        updateField("packages", list);
                      }
                    })
                  ),

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Category"),
                    React.createElement(
                      "select",
                      {
                        className: "input-field",
                        value: (pkg.cat) ?? "Dog",
                        onChange: (e) => {
                          const list = [...formData.packages];
                          const newCat = e.target.value;
                          list[idx] = { ...list[idx], cat: newCat };
                          // Only the pet categories set the pet; Styling, Care and Wellness keep the pet chosen below.
                          if (newCat === "Cat") list[idx] = { ...list[idx], petType: "Cat", isCatOnly: true, isDogOnly: false, allowPetTypeSelection: false };
                          if (newCat === "Dog" || newCat === "Puppy") list[idx] = { ...list[idx], petType: "Dog", isDogOnly: true, isCatOnly: false, allowPetTypeSelection: false };
                          updateField("packages", list);
                        }
                      },
                      ["Puppy", "Dog", "Cat", "Care", "Wellness", "Styling"].map((c) =>
                        React.createElement("option", { key: c, value: c }, c)
                      )
                    )
                  ),

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "For which pet?"),
                    React.createElement("select", { className: "input-field", value: petChoice, "aria-label": "For which pet", onChange: (e) => setPet(e.target.value) },
                      React.createElement("option", { value: "Dog" }, "Dogs"),
                      React.createElement("option", { value: "Cat" }, "Cats"),
                      React.createElement("option", { value: "Both" }, "Dogs & Cats"))
                  ),

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Price Display"),
                    React.createElement("input", {
                      className: "input-field",
                      placeholder: "e.g. ₹1,600",
                      value: pkg.price || "",
                      onChange: (e) => {
                        const val = e.target.value;
                        const num = parseFloat(String(val).replace(/,/g, "").replace(/[^0-9.]/g, "")) || 0;
                        const list = [...formData.packages];
                        list[idx].price = val;
                        list[idx].priceNum = num;
                        updateField("packages", list);
                      }
                    })
                  ),

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Duration / Badge"),
                    React.createElement("input", {
                      className: "input-field",
                      placeholder: "e.g. Coat care",
                      value: pkg.duration || "",
                      onChange: (e) => {
                        const list = [...formData.packages];
                        list[idx].duration = e.target.value;
                        updateField("packages", list);
                      }
                    })
                  )
                ),

                // Subtitle & Image Widget
                React.createElement(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", alignItems: "end" } },
                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Subtitle / Short Hook"),
                    React.createElement("input", {
                      className: "input-field",
                      value: pkg.sub || "",
                      onChange: (e) => {
                        const list = [...formData.packages];
                        list[idx].sub = e.target.value;
                        updateField("packages", list);
                      }
                    })
                  ),
                  React.createElement(GroomingImageUploadWidget, {
                    label: "Service Image (WebP Auto-Converted)",
                    currentUrl: pkg.img || "",
                    onSelectUrl: (newUrl) => {
                      const list = [...formData.packages];
                      list[idx].img = newUrl;
                      updateField("packages", list);
                    }
                  })
                ),

                // Included Features & Notes
                React.createElement(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Included Services (One per line)"),
                    React.createElement(ListTextarea, { separator: "\n", 
                      className: "input-field",
                      style: { minHeight: "80px", fontSize: "13px" },
                      value: Array.isArray(pkg.includes) ? pkg.includes.join("\n") : (pkg.includes || ""),
                      onChange: (e) => {
                        const list = [...formData.packages];
                        list[idx].includes = e.target.value.split("\n").filter((l) => l.trim().length > 0);
                        updateField("packages", list);
                      }
                    })
                  ),

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Package Description / Notes"),
                    React.createElement("textarea", {
                      className: "input-field",
                      style: { minHeight: "80px", fontSize: "13px" },
                      value: pkg.note || "",
                      onChange: (e) => {
                        const list = [...formData.packages];
                        list[idx].note = e.target.value;
                        updateField("packages", list);
                      }
                    })
                  )
                )
              );
            })
          ),

          // "Before you book" cards
          React.createElement(CmsSection, { title: "Before You Book (tips cards)", hint: "The numbered cards near the bottom of the Grooming page." },
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
              ["eyebrow", "title", "titleAccent"].map((k) => React.createElement(CmsField, {
                key: k,
                label: { eyebrow: "Eyebrow", title: "Title", titleAccent: "Title accent (italics)" }[k],
                value: (formData.notesHead || { eyebrow: "Before you book", title: "A few small things that ", titleAccent: "help a lot" })[k],
                onChange: (v) => updateField("notesHead", { eyebrow: "Before you book", title: "A few small things that ", titleAccent: "help a lot", ...(formData.notesHead || {}), [k]: v })
              }))),
            React.createElement(CmsList, {
              items: formData.notes, itemLabel: "Card", addLabel: "+ Add card", columns: "1fr",
              fields: [{ key: "t", label: "Title" }, { key: "d", label: "Text", kind: "textarea" }],
              onChange: (list) => updateField("notes", list)
            })
          ),

          // Add-ons Manager
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "14px", marginTop: "12px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement(
              "div",
              { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
              React.createElement("div", { style: { display: "flex", flexDirection: "column", gap: "6px" } },
                React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Grooming Add-ons (", (formData.addOns || []).length, ")"),
                React.createElement(CmsField, { kind: "checkbox", label: "Show the add-ons list on the Grooming page", value: formData.showAddOns === true, onChange: (v) => updateField("showAddOns", v) })),
              React.createElement(
                "button",
                {
                  type: "button",
                  className: "btn-admin btn-admin-secondary",
                  style: { padding: "6px 12px", fontSize: "12px" },
                  onClick: () => {
                    const list = formData.addOns && Array.isArray(formData.addOns) ? [...formData.addOns] : [];
                    list.push({ name: "New Add-on Treatment", price: "+ ₹300" });
                    updateField("addOns", list);
                  }
                },
                "+ Add Add-on"
              )
            ),
            (formData.addOns || []).map((addon, aidx) =>
              React.createElement(
                "div",
                { key: aidx, style: { display: "grid", gridTemplateColumns: "2fr 1fr auto", gap: "10px", alignItems: "center" } },
                React.createElement("input", {
                  className: "input-field",
                  placeholder: "Treatment Name",
                  value: addon.name || "",
                  onChange: (e) => {
                    const list = [...formData.addOns];
                    list[aidx].name = e.target.value;
                    updateField("addOns", list);
                  }
                }),
                React.createElement("input", {
                  className: "input-field",
                  placeholder: "+ ₹400",
                  value: addon.price || "",
                  onChange: (e) => {
                    const list = [...formData.addOns];
                    list[aidx].price = e.target.value;
                    updateField("addOns", list);
                  }
                }),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    className: "btn-admin btn-admin-danger",
                    style: { padding: "8px 12px", fontSize: "12px" },
                    onClick: () => {
                      const list = [...formData.addOns];
                      list.splice(aidx, 1);
                      updateField("addOns", list);
                    }
                  },
                  "×"
                )
              )
            )
          )
        ),

        selectedPage === "boarding" &&
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "24px" } },

          // 1. Header & Hero Settings
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Page Header & Hero"),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "Eyebrow"), React.createElement("input", { className: "input-field", value: formData.eyebrow || "", onChange: (e) => updateField("eyebrow", e.target.value) })),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "Headline Title"), React.createElement("input", { className: "input-field", value: formData.title || "", onChange: (e) => updateField("title", e.target.value) })),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "Section Subtitle"), React.createElement("input", { className: "input-field", value: formData.sub || "", onChange: (e) => updateField("sub", e.target.value) })),
            React.createElement("p", { style: { fontSize: "12px", color: "var(--admin-text-muted)", margin: 0 } }, "The Boarding page has no lead paragraph or hero photo; package photos are set per package below.")
          ),

          // 2. Policy Notice & Guidelines
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Boarding Policy, Eligibility & Contact Rules"),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "Mandatory Policy & Small Dog Disclosure"), React.createElement("textarea", { className: "input-field", style: { minHeight: "65px" }, value: formData.policyNotice || "", onChange: (e) => updateField("policyNotice", e.target.value) })),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 2fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "WhatsApp Booking Number"), React.createElement("input", { className: "input-field", placeholder: "e.g. 919148443330", value: formData.whatsappNumber || "", onChange: (e) => updateField("whatsappNumber", e.target.value) }))
            )
          ),

          // 3. Boarding Services & Packages List (Similar format to Grooming)
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px" } },
            React.createElement(
              "div",
              { style: { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" } },
              React.createElement(
                "div",
                null,
                React.createElement("h4", { style: { color: "var(--admin-gold-light)", fontSize: "17px", fontFamily: "var(--font-display)" } }, "Boarding Services & Packages (", (formData.packages || []).length, ")"),
                React.createElement("p", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Add, edit, or customize stay packages, pricing, images, and routine inclusions. New services go to the top (#1) in admin.")
              ),
              React.createElement(
                "button",
                {
                  type: "button",
                  className: "btn-admin btn-admin-primary",
                  style: { padding: "8px 16px", fontSize: "13px" },
                  onClick: () => {
                    const list = formData.packages && Array.isArray(formData.packages) ? [...formData.packages] : [];
                    list.unshift({
                      key: "boarding-" + Date.now(),
                      tag: "Boarding Tier",
                      title: "New Boarding Package",
                      price: "₹1,000",
                      priceNum: 1000,
                      priceUnit: "per dog, per night",
                      img: "assets/img/pawpad/boarding-sleeping-puppy-toy.webp",
                      desc: "Personalized home-like boarding care with continuous supervision.",
                      includes: ["Supervised quiet rest", "Scheduled home-cooked feeding", "Care report at checkout"],
                      note: "Important guidelines and prerequisites for this boarding stay.",
                      requiresTrialDay: false
                    });
                    updateField("packages", list);
                  }
                },
                "+ Add New Boarding Package"
              )
            ),

            // Individual Package Cards
            (formData.packages || []).map((pkg, idx) =>
              React.createElement(
                "div",
                {
                  key: pkg.key || idx,
                  style: {
                    background: "var(--admin-bg)",
                    padding: "20px",
                    borderRadius: "10px",
                    border: "1px solid var(--admin-border)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "14px"
                  }
                },

                // Top Title / Tag Bar
                React.createElement(
                  "div",
                  { style: { display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--admin-border-subtle)", paddingBottom: "12px" } },
                  React.createElement(
                    "div",
                    { style: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" } },
                    React.createElement("span", { style: { fontWeight: "700", fontSize: "15px", color: "var(--admin-text)" } }, `#${idx + 1} ${pkg.title || "Untitled Package"}`),
                    React.createElement("span", { className: "badge badge-approved", style: { fontSize: "11px" } }, pkg.tag || "Boarding"),
                    React.createElement("span", { style: { fontSize: "11px", color: "var(--admin-gold)", background: "rgba(201, 168, 106, 0.12)", padding: "2px 8px", borderRadius: "6px" } }, `Key: ${pkg.key || "custom"}`)
                  ),
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      className: "btn-admin btn-admin-danger",
                      style: { padding: "4px 10px", fontSize: "12px" },
                      onClick: () => {
                        if (confirm(`Remove '${pkg.title}' boarding package?`)) {
                          const list = [...formData.packages];
                          list.splice(idx, 1);
                          updateField("packages", list);
                        }
                      }
                    },
                    "Delete Package"
                  )
                ),

                // Trial day rule for this package (the Trial Day package itself never needs one)
                !(pkg.key === "trial-day" || String(pkg.title || "").toLowerCase().includes("trial")) && React.createElement(CmsField, {
                  kind: "checkbox",
                  label: "Needs a trial day first (customers who haven't done one pay the Trial Day price too)",
                  value: pkg.requiresTrialDay !== undefined ? pkg.requiresTrialDay : pkg.key === "overnight",
                  onChange: (v) => { const list = [...formData.packages]; list[idx] = { ...list[idx], requiresTrialDay: v }; updateField("packages", list); }
                }),

                // Fields Grid
                React.createElement(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 1fr", gap: "12px" } },

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Package Title"),
                    React.createElement("input", {
                      className: "input-field",
                      value: pkg.title || "",
                      onChange: (e) => {
                        const list = [...formData.packages];
                        list[idx].title = e.target.value;
                        updateField("packages", list);
                      }
                    })
                  ),

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Step / Tag Badge"),
                    React.createElement("input", {
                      className: "input-field",
                      placeholder: "e.g. Step 1 · Mandatory Assessment",
                      value: pkg.tag || "",
                      onChange: (e) => {
                        const list = [...formData.packages];
                        list[idx].tag = e.target.value;
                        updateField("packages", list);
                      }
                    })
                  ),

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Price Display"),
                    React.createElement("input", {
                      className: "input-field",
                      placeholder: "e.g. ₹850",
                      value: pkg.price || "",
                      onChange: (e) => {
                        const val = e.target.value;
                        const num = parseFloat(String(val).replace(/,/g, "").replace(/[^0-9.]/g, "")) || 0;
                        const list = [...formData.packages];
                        list[idx].price = val;
                        list[idx].priceNum = num;
                        updateField("packages", list);
                      }
                    })
                  ),

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Price Unit"),
                    React.createElement("input", {
                      className: "input-field",
                      placeholder: "e.g. per dog, per night",
                      value: pkg.priceUnit || "",
                      onChange: (e) => {
                        const list = [...formData.packages];
                        list[idx].priceUnit = e.target.value;
                        updateField("packages", list);
                      }
                    })
                  ),

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Option Key / ID"),
                    React.createElement("input", {
                      className: "input-field",
                      placeholder: "e.g. trial-day",
                      value: pkg.key || "",
                      onChange: (e) => {
                        const list = [...formData.packages];
                        list[idx].key = e.target.value;
                        updateField("packages", list);
                      }
                    })
                  )
                ),

                // Subtitle & Image Widget (Same format as Grooming)
                React.createElement(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", alignItems: "end" } },
                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Subtitle / Short Hook Description"),
                    React.createElement("textarea", {
                      className: "input-field",
                      style: { minHeight: "80px", fontSize: "13px" },
                      value: pkg.desc || "",
                      onChange: (e) => {
                        const list = [...formData.packages];
                        list[idx].desc = e.target.value;
                        updateField("packages", list);
                      }
                    })
                  ),
                  React.createElement(ImageUploadWidget, {
                    label: "Package Image (WebP Auto-Converted)",
                    currentUrl: pkg.img || "",
                    onSelectUrl: (newUrl) => {
                      const list = [...formData.packages];
                      list[idx].img = newUrl;
                      updateField("packages", list);
                    }
                  })
                ),

                // Included Features & Notes
                React.createElement(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Included Services & Routine (One per line)"),
                    React.createElement(ListTextarea, { separator: "\n", 
                      className: "input-field",
                      style: { minHeight: "85px", fontSize: "13px" },
                      value: Array.isArray(pkg.includes) ? pkg.includes.join("\n") : (pkg.includes || ""),
                      onChange: (e) => {
                        const list = [...formData.packages];
                        list[idx].includes = e.target.value.split("\n").filter((l) => l.trim().length > 0);
                        updateField("packages", list);
                      }
                    })
                  ),

                  React.createElement(
                    "div",
                    null,
                    React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Package Description / Prerequisites Notes"),
                    React.createElement("textarea", {
                      className: "input-field",
                      style: { minHeight: "85px", fontSize: "13px" },
                      value: pkg.note || "",
                      onChange: (e) => {
                        const list = [...formData.packages];
                        list[idx].note = e.target.value;
                        updateField("packages", list);
                      }
                    })
                  )
                )
              )
            )
          ),

          // 4. Daily Life & Care Standards (Visual & Pillars)
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Daily Routine & Care Standards Section"),

            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Standards Eyebrow"), React.createElement("input", { className: "input-field", value: formData.standardsEyebrow || "", onChange: (e) => updateField("standardsEyebrow", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Standards Headline Title"), React.createElement("input", { className: "input-field", value: formData.standardsTitle || "", onChange: (e) => updateField("standardsTitle", e.target.value) }))
            ),

            // Visual Image & Quote Card
            React.createElement(
              "div",
              { style: { background: "var(--admin-card)", padding: "16px", borderRadius: "8px", border: "1px solid var(--admin-border)", display: "flex", flexDirection: "column", gap: "12px" } },
              React.createElement("h5", { style: { color: "var(--admin-gold-light)", fontSize: "14px" } }, "Standards Visual & Quote Card"),
              React.createElement(ImageUploadWidget, {
                label: "Care Standards Photo (WebP Auto-Converted)",
                currentUrl: formData.standardsImg || "",
                onSelectUrl: (newUrl) => updateField("standardsImg", newUrl)
              }),
              React.createElement(
                "div",
                { style: { display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" } },
                React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Quote Overlay Text"), React.createElement("textarea", { className: "input-field", style: { minHeight: "55px" }, value: formData.standardsQuote || "", onChange: (e) => updateField("standardsQuote", e.target.value) })),
                React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Quote Attribution / Author"), React.createElement("input", { className: "input-field", value: formData.standardsAuthor || "", onChange: (e) => updateField("standardsAuthor", e.target.value) }))
              )
            ),

            // Care Routine Pillars List
            React.createElement(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: "12px", marginTop: "6px" } },
              React.createElement(
                "div",
                { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                React.createElement("h5", { style: { color: "var(--admin-gold-light)", fontSize: "14px" } }, "Care Routine Pillars (", (formData.pillars || []).length, ")"),
                React.createElement(
                  "button",
                  {
                    type: "button",
                    className: "btn-admin btn-admin-secondary",
                    style: { padding: "6px 12px", fontSize: "12px" },
                    onClick: () => {
                      const list = formData.pillars && Array.isArray(formData.pillars) ? [...formData.pillars] : [];
                      list.push({ icon: "🐾", title: "New Care Pillar", desc: "Detailed description of this care standard routine." });
                      updateField("pillars", list);
                    }
                  },
                  "+ Add Care Pillar"
                )
              ),
              (formData.pillars || []).map((pillar, pidx) =>
                React.createElement(
                  "div",
                  { key: pidx, style: { background: "var(--admin-card)", padding: "14px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)", display: "flex", flexDirection: "column", gap: "10px" } },
                  React.createElement(
                    "div",
                    { style: { display: "grid", gridTemplateColumns: "80px 1fr auto", gap: "10px", alignItems: "center" } },
                    React.createElement("input", {
                      className: "input-field",
                      placeholder: "🍲",
                      value: pillar.icon || "",
                      onChange: (e) => {
                        const list = [...formData.pillars];
                        list[pidx].icon = e.target.value;
                        updateField("pillars", list);
                      }
                    }),
                    React.createElement("input", {
                      className: "input-field",
                      placeholder: "Pillar Title",
                      value: pillar.title || "",
                      onChange: (e) => {
                        const list = [...formData.pillars];
                        list[pidx].title = e.target.value;
                        updateField("pillars", list);
                      }
                    }),
                    React.createElement(
                      "button",
                      {
                        type: "button",
                        className: "btn-admin btn-admin-danger",
                        style: { padding: "8px 12px", fontSize: "12px" },
                        onClick: () => {
                          const list = [...formData.pillars];
                          list.splice(pidx, 1);
                          updateField("pillars", list);
                        }
                      },
                      "Delete"
                    )
                  ),
                  React.createElement("textarea", {
                    className: "input-field",
                    style: { minHeight: "55px", fontSize: "13px" },
                    placeholder: "Pillar description text",
                    value: pillar.desc || "",
                    onChange: (e) => {
                      const list = [...formData.pillars];
                      list[pidx].desc = e.target.value;
                      updateField("pillars", list);
                    }
                  })
                )
              )
            )
          ),

          // 5. Boarding FAQs Manager
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "14px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement(
              "div",
              { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
              React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Boarding FAQs (", (formData.faq || []).length, ")"),
              React.createElement(
                "button",
                {
                  type: "button",
                  className: "btn-admin btn-admin-primary",
                  style: { padding: "6px 14px", fontSize: "12px" },
                  onClick: () => {
                    const list = formData.faq && Array.isArray(formData.faq) ? [...formData.faq] : [];
                    list.unshift({ q: "New Boarding Question?", a: "Detailed explanation and policy answer goes here." });
                    updateField("faq", list);
                  }
                },
                "+ Add FAQ Question"
              )
            ),

            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "FAQ Eyebrow"), React.createElement("input", { className: "input-field", value: formData.faqEyebrow || "", onChange: (e) => updateField("faqEyebrow", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "FAQ Section Title"), React.createElement("input", { className: "input-field", value: formData.faqTitle || "", onChange: (e) => updateField("faqTitle", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "FAQ Subtitle"), React.createElement("input", { className: "input-field", value: formData.faqSub || "", onChange: (e) => updateField("faqSub", e.target.value) }))
            ),

            (formData.faq || []).map((faqItem, fidx) =>
              React.createElement(
                "div",
                { key: fidx, style: { display: "flex", flexDirection: "column", gap: "8px", background: "var(--admin-card)", padding: "14px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)" } },
                React.createElement(
                  "div",
                  { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                  React.createElement("label", { style: { fontSize: "12px", fontWeight: "600", color: "var(--admin-gold-light)" } }, `Question #${fidx + 1}`),
                  React.createElement(
                    "button",
                    {
                      type: "button",
                      className: "btn-admin btn-admin-danger",
                      style: { padding: "3px 8px", fontSize: "11px" },
                      onClick: () => {
                        const list = [...formData.faq];
                        list.splice(fidx, 1);
                        updateField("faq", list);
                      }
                    },
                    "Delete FAQ"
                  )
                ),
                React.createElement("input", {
                  className: "input-field",
                  placeholder: "Question text",
                  value: faqItem.q || "",
                  onChange: (e) => {
                    const list = [...formData.faq];
                    list[fidx].q = e.target.value;
                    updateField("faq", list);
                  }
                }),
                React.createElement("textarea", {
                  className: "input-field",
                  style: { minHeight: "65px", fontSize: "13px" },
                  placeholder: "Answer text",
                  value: faqItem.a || "",
                  onChange: (e) => {
                    const list = [...formData.faq];
                    list[fidx].a = e.target.value;
                    updateField("faq", list);
                  }
                })
              )
            )
          ),

          // 6. Bottom Call to Action (CTA) Banner
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Bottom Call-To-Action (CTA) Banner"),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "CTA Eyebrow"), React.createElement("input", { className: "input-field", value: formData.ctaEyebrow || "", onChange: (e) => updateField("ctaEyebrow", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "CTA Headline Title"), React.createElement("input", { className: "input-field", value: formData.ctaTitle || "", onChange: (e) => updateField("ctaTitle", e.target.value) }))
            ),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "CTA Description Text"), React.createElement("textarea", { className: "input-field", style: { minHeight: "65px" }, value: formData.ctaDesc || "", onChange: (e) => updateField("ctaDesc", e.target.value) })),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Primary Cart Button Text"), React.createElement("input", { className: "input-field", placeholder: "Book Trial Day (₹850)", value: formData.ctaButtonText || "", onChange: (e) => updateField("ctaButtonText", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "WhatsApp Button Text"), React.createElement("input", { className: "input-field", placeholder: "Chat on WhatsApp", value: formData.ctaWhatsAppText || "", onChange: (e) => updateField("ctaWhatsAppText", e.target.value) }))
            )
          )
        ),

        selectedPage === "about" &&
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "24px" } },

          // 1. Hero & Studio Meta
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Page Header & Studio Meta"),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Eyebrow"), React.createElement("input", { className: "input-field", value: ((formData.hero && formData.hero.eyebrow)) ?? "About Pawpad", onChange: (e) => updateField("hero", { ...(formData.hero || {}), eyebrow: e.target.value }) })),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Headline Title"), React.createElement("input", { className: "input-field", value: ((formData.hero && formData.hero.title)) ?? "Our story", onChange: (e) => updateField("hero", { ...(formData.hero || {}), title: e.target.value }) })),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Lead Paragraph"), React.createElement("textarea", { className: "input-field", style: { minHeight: "75px" }, value: (formData.hero && formData.hero.lead) || "", onChange: (e) => updateField("hero", { ...(formData.hero || {}), lead: e.target.value }) })),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Founded Year"), React.createElement("input", { className: "input-field", value: ((formData.hero && formData.hero.metaFounded)) ?? "2017", onChange: (e) => updateField("hero", { ...(formData.hero || {}), metaFounded: e.target.value }) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Studio Location"), React.createElement("input", { className: "input-field", value: ((formData.hero && formData.hero.metaStudio)) ?? "Kalyan Nagar", onChange: (e) => updateField("hero", { ...(formData.hero || {}), metaStudio: e.target.value }) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Run By"), React.createElement("input", { className: "input-field", value: ((formData.hero && formData.hero.metaRunBy)) ?? "Leena Munikempanna", onChange: (e) => updateField("hero", { ...(formData.hero || {}), metaRunBy: e.target.value }) }))
            )
          ),

          // 2. Founder's Story & Puchki Memory
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Founder's Story & Puchki Memory"),
            React.createElement(ImageUploadWidget, {
              label: "Founder Portrait Photo (WebP Auto-Converted)",
              currentUrl: (formData.founder && formData.founder.portrait) || "assets/img/pawpad/leena-portrait.webp",
              onSelectUrl: (newUrl) => updateField("founder", { ...(formData.founder || {}), portrait: newUrl })
            }),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Founder Name"), React.createElement("input", { className: "input-field", value: ((formData.founder && formData.founder.name)) ?? "Leena Munikempanna", onChange: (e) => updateField("founder", { ...(formData.founder || {}), name: e.target.value }) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Role Subtitle"), React.createElement("input", { className: "input-field", value: ((formData.founder && formData.founder.role)) ?? "Founder · Pawpad · since 2017", onChange: (e) => updateField("founder", { ...(formData.founder || {}), role: e.target.value }) }))
            ),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Founder Quote (Sidebar)"), React.createElement("input", { className: "input-field", value: (formData.founder && formData.founder.quote) || '"Every animal deserves someone who stops. Who looks. Who stays."', onChange: (e) => updateField("founder", { ...(formData.founder || {}), quote: e.target.value }) })),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Main Story Eyebrow"), React.createElement("input", { className: "input-field", value: ((formData.founder && formData.founder.eyebrow)) ?? "Our story · told by Leena", onChange: (e) => updateField("founder", { ...(formData.founder || {}), eyebrow: e.target.value }) })),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Story Paragraphs (One per line — press Enter for a new paragraph)"), React.createElement(ListTextarea, { separator: "\n",  className: "input-field", style: { minHeight: "140px", lineHeight: "1.5" }, value: Array.isArray(formData.founder && formData.founder.paragraphs) ? formData.founder.paragraphs.join("\n") : ((formData.founder && formData.founder.paragraphs) || ""), onChange: (e) => updateField("founder", { ...(formData.founder || {}), paragraphs: e.target.value.split("\n").map((p) => p.trim()).filter((p) => p.length > 0) }) })),

            // Dew / Puchki Callout
            React.createElement(
              "div",
              { style: { background: "var(--admin-card)", padding: "16px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)", display: "flex", flexDirection: "column", gap: "12px" } },
              React.createElement("h5", { style: { color: "var(--admin-gold-light)", fontSize: "13.5px" } }, "In Memory of Dew (Puchki) Callout"),
              React.createElement(ImageUploadWidget, {
                label: "Dew / Puchki Image (WebP Auto-Converted)",
                currentUrl: (formData.founder && formData.founder.dewImg) || "assets/img/pawpad/about-puchki.webp",
                onSelectUrl: (newUrl) => updateField("founder", { ...(formData.founder || {}), dewImg: newUrl })
              }),
              React.createElement(
                "div",
                { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px" } },
                React.createElement("div", null, React.createElement("label", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "Eyebrow"), React.createElement("input", { className: "input-field", value: ((formData.founder && formData.founder.dewEyebrow)) ?? "In memory of", onChange: (e) => updateField("founder", { ...(formData.founder || {}), dewEyebrow: e.target.value }) })),
                React.createElement("div", null, React.createElement("label", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "Title"), React.createElement("input", { className: "input-field", value: ((formData.founder && formData.founder.dewTitle)) ?? "Dew", onChange: (e) => updateField("founder", { ...(formData.founder || {}), dewTitle: e.target.value }) })),
                React.createElement("div", null, React.createElement("label", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "Subtitle Accent"), React.createElement("input", { className: "input-field", value: ((formData.founder && formData.founder.dewSubtitle)) ?? "— Puchki —", onChange: (e) => updateField("founder", { ...(formData.founder || {}), dewSubtitle: e.target.value }) }))
              ),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "Memory Narrative"), React.createElement("textarea", { className: "input-field", style: { minHeight: "75px" }, value: (formData.founder && formData.founder.dewText) || "", onChange: (e) => updateField("founder", { ...(formData.founder || {}), dewText: e.target.value }) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "Dedication Line"), React.createElement("input", { className: "input-field", value: ((formData.founder && formData.founder.dewDedication)) ?? "— In memory of Dew (Puchki), the best girl.", onChange: (e) => updateField("founder", { ...(formData.founder || {}), dewDedication: e.target.value }) }))
            ),

            // Closing Paragraphs & Signoff
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Closing Paragraph 1 (Streeties connection)"), React.createElement("textarea", { className: "input-field", style: { minHeight: "60px" }, value: (formData.founder && formData.founder.closingParagraph1) || "", onChange: (e) => updateField("founder", { ...(formData.founder || {}), closingParagraph1: e.target.value }) })),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Closing Paragraph 2 (Recognition)"), React.createElement("textarea", { className: "input-field", style: { minHeight: "60px" }, value: (formData.founder && formData.founder.closingParagraph2) || "", onChange: (e) => updateField("founder", { ...(formData.founder || {}), closingParagraph2: e.target.value }) })),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Closing Paragraph 3 (Since 2017 & safety)"), React.createElement("textarea", { className: "input-field", style: { minHeight: "60px" }, value: (formData.founder && formData.founder.closingParagraph3) || "", onChange: (e) => updateField("founder", { ...(formData.founder || {}), closingParagraph3: e.target.value }) })),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Sign-off"), React.createElement("input", { className: "input-field", value: ((formData.founder && formData.founder.signoff)) ?? "— Leena, founder, Pawpad", onChange: (e) => updateField("founder", { ...(formData.founder || {}), signoff: e.target.value }) }))
          ),

          // 3. Our Philosophy & Collage Gallery
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Our Philosophy & Collage Gallery"),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Eyebrow"), React.createElement("input", { className: "input-field", value: ((formData.philosophy && formData.philosophy.eyebrow)) ?? "Our philosophy", onChange: (e) => updateField("philosophy", { ...(formData.philosophy || {}), eyebrow: e.target.value }) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Headline Title"), React.createElement("input", { className: "input-field", value: ((formData.philosophy && formData.philosophy.title)) ?? "Our Philosophy", onChange: (e) => updateField("philosophy", { ...(formData.philosophy || {}), title: e.target.value }) }))
            ),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Lead Paragraph"), React.createElement("textarea", { className: "input-field", style: { minHeight: "65px" }, value: (formData.philosophy && formData.philosophy.lead) || "", onChange: (e) => updateField("philosophy", { ...(formData.philosophy || {}), lead: e.target.value }) })),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Body Paragraphs (One per line — press Enter for a new paragraph)"), React.createElement(ListTextarea, { separator: "\n",  className: "input-field", style: { minHeight: "120px" }, value: Array.isArray(formData.philosophy && formData.philosophy.paragraphs) ? formData.philosophy.paragraphs.join("\n") : ((formData.philosophy && formData.philosophy.paragraphs) || ""), onChange: (e) => updateField("philosophy", { ...(formData.philosophy || {}), paragraphs: e.target.value.split("\n").map((p) => p.trim()).filter((p) => p.length > 0) }) })),

            // 5 Philosophy Collage Images
            React.createElement("h5", { style: { color: "var(--admin-gold-light)", fontSize: "13.5px", marginTop: "8px" } }, "Philosophy Photos (6 tiles, two per row)"),
            React.createElement("p", { style: { fontSize: "12px", color: "var(--admin-text-muted)", margin: 0 } }, "The website shows 6 photos, or 4 if fewer than 6 are filled in, so the grid never has a gap. Leave a tile empty to hide it."),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              [0, 1, 2, 3, 4, 5].map((gidx) => {
                const gallery = (formData.philosophy && formData.philosophy.gallery) || [
                  "assets/img/pawpad/about-our-philosophy-collage.webp",
                  "assets/img/pawpad/about-our-philosophy-collage-2.webp",
                  "assets/img/pawpad/about-our-philosophy-collage-3.webp",
                  "assets/img/pawpad/about-our-philosophy-collage-4.webp",
                  "assets/img/pawpad/about-our-philosophy-collage-5.webp",
                  "assets/img/pawpad/about-our-philosophy-collage-3-1.webp"
                ];
                return React.createElement(ImageUploadWidget, {
                  key: gidx,
                  label: `Collage Tile #${gidx + 1} (WebP Auto-Converted)`,
                  currentUrl: gallery[gidx] || "",
                  onSelectUrl: (newUrl) => {
                    const list = [...gallery];
                    list[gidx] = newUrl;
                    updateField("philosophy", { ...(formData.philosophy || {}), gallery: list });
                  }
                });
              })
            )
          ),

          // 4. The Studio Space Gallery
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "The Studio Space Gallery"),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Eyebrow"), React.createElement("input", { className: "input-field", value: ((formData.studio && formData.studio.eyebrow)) ?? "The studio", onChange: (e) => updateField("studio", { ...(formData.studio || {}), eyebrow: e.target.value }) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Title"), React.createElement("input", { className: "input-field", value: ((formData.studio && formData.studio.title)) ?? "A cozy space", onChange: (e) => updateField("studio", { ...(formData.studio || {}), title: e.target.value }) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Title Accent (Italics)"), React.createElement("input", { className: "input-field", value: ((formData.studio && formData.studio.titleAccent)) ?? "Oodles of patience", onChange: (e) => updateField("studio", { ...(formData.studio || {}), titleAccent: e.target.value }) }))
            ),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Lead Paragraph"), React.createElement("textarea", { className: "input-field", style: { minHeight: "65px" }, value: (formData.studio && formData.studio.lead) || "", onChange: (e) => updateField("studio", { ...(formData.studio || {}), lead: e.target.value }) })),

            // 4 Studio Images with Captions
            React.createElement("h5", { style: { color: "var(--admin-gold-light)", fontSize: "13.5px", marginTop: "6px" } }, "Studio Space Photos & Captions"),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" } },
              [0, 1, 2, 3].map((sidx) => {
                const items = (formData.studio && formData.studio.items) || [
                  { img: "assets/img/pawpad/about-studio-ample-spacing.webp", caption: "Ample spacing" },
                  { img: "assets/img/pawpad/about-studio-images-hygienic.webp", caption: "Hygienic setup" },
                  { img: "assets/img/pawpad/experience-space-2.webp", caption: "Quiet studio" },
                  { img: "assets/img/pawpad/experience-space-3.webp", caption: "Calm care area" }
                ];
                const item = items[sidx] || {};
                return React.createElement(
                  "div",
                  { key: sidx, style: { background: "var(--admin-card)", padding: "14px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)", display: "flex", flexDirection: "column", gap: "8px" } },
                  React.createElement(ImageUploadWidget, {
                    label: `Studio Photo #${sidx + 1}`,
                    currentUrl: item.img || "",
                    onSelectUrl: (newUrl) => {
                      const list = [...items];
                      list[sidx] = { ...list[sidx], img: newUrl };
                      updateField("studio", { ...(formData.studio || {}), items: list });
                    }
                  }),
                  React.createElement("label", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "Pill Caption Overlay"),
                  React.createElement("input", {
                    className: "input-field",
                    placeholder: "e.g. Quiet studio",
                    value: item.caption || "",
                    onChange: (e) => {
                      const list = [...items];
                      list[sidx] = { ...list[sidx], caption: e.target.value };
                      updateField("studio", { ...(formData.studio || {}), items: list });
                    }
                  })
                );
              })
            )
          ),

          // 5. Professional Certifications
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Professional Certifications Accordion"),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Eyebrow"), React.createElement("input", { className: "input-field", value: ((formData.certifications && formData.certifications.eyebrow)) ?? "Certifications", onChange: (e) => updateField("certifications", { ...(formData.certifications || {}), eyebrow: e.target.value }) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Headline Title"), React.createElement("input", { className: "input-field", value: ((formData.certifications && formData.certifications.title)) ?? "Professional education", onChange: (e) => updateField("certifications", { ...(formData.certifications || {}), title: e.target.value }) }))
            ),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Lead Text"), React.createElement("textarea", { className: "input-field", style: { minHeight: "65px" }, value: (formData.certifications && formData.certifications.lead) || "", onChange: (e) => updateField("certifications", { ...(formData.certifications || {}), lead: e.target.value }) })),

            // Cert list
            ((formData.certifications && formData.certifications.certsList) || []).map((c, cidx) =>
              React.createElement(
                "div",
                { key: cidx, style: { background: "var(--admin-card)", padding: "14px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)", display: "flex", flexDirection: "column", gap: "8px" } },
                React.createElement(
                  "div",
                  { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
                  React.createElement("label", { style: { fontSize: "12px", fontWeight: "600", color: "var(--admin-gold-light)" } }, `Certification #${cidx + 1}`),
                  React.createElement("button", {
                    type: "button",
                    className: "btn-admin btn-admin-danger",
                    style: { padding: "3px 8px", fontSize: "11px" },
                    onClick: () => {
                      const list = [...((formData.certifications && formData.certifications.certsList) || [])];
                      list.splice(cidx, 1);
                      updateField("certifications", { ...(formData.certifications || {}), certsList: list });
                    }
                  }, "Delete")
                ),
                React.createElement(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" } },
                  React.createElement("div", null, React.createElement("label", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "Certification Name"), React.createElement("input", { className: "input-field", value: c.name || "", onChange: (e) => { const list = [...((formData.certifications && formData.certifications.certsList) || [])]; list[cidx].name = e.target.value; updateField("certifications", { ...(formData.certifications || {}), certsList: list }); } })),
                  React.createElement("div", null, React.createElement("label", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "Issuing Body / Organization"), React.createElement("input", { className: "input-field", value: c.org || "", onChange: (e) => { const list = [...((formData.certifications && formData.certifications.certsList) || [])]; list[cidx].org = e.target.value; updateField("certifications", { ...(formData.certifications || {}), certsList: list }); } }))
                ),
                React.createElement("div", null, React.createElement("label", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "Description Body"), React.createElement("textarea", { className: "input-field", style: { minHeight: "65px" }, value: c.body || "", onChange: (e) => { const list = [...((formData.certifications && formData.certifications.certsList) || [])]; list[cidx].body = e.target.value; updateField("certifications", { ...(formData.certifications || {}), certsList: list }); } }))
              )
            ),
            React.createElement("button", {
              type: "button",
              className: "btn-admin btn-admin-secondary",
              style: { alignSelf: "flex-start", marginTop: "4px" },
              onClick: () => {
                const list = [...((formData.certifications && formData.certifications.certsList) || [])];
                list.push({ name: "New Certification", org: "Organization Name", body: "Description of the curriculum and qualification..." });
                updateField("certifications", { ...(formData.certifications || {}), certsList: list });
              }
            }, "+ Add Certification")
          )
        ),

        selectedPage === "studioSetup" &&
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "24px" } },

          // 1. Header & Hero
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "1. Hero Header & Overview"),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Eyebrow"), React.createElement("input", { className: "input-field", value: (formData.eyebrow) ?? "Studio Setup & Business Consulting", onChange: (e) => updateField("eyebrow", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Headline Title Prefix"), React.createElement("input", { className: "input-field", value: (formData.title) ?? "Planning your ", onChange: (e) => updateField("title", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Headline Accent (Italic Gold)"), React.createElement("input", { className: "input-field", value: formData.titleAccent !== undefined ? formData.titleAccent : "grooming space?", onChange: (e) => updateField("titleAccent", e.target.value) }))
            ),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Hero Lead Paragraph"), React.createElement("textarea", { className: "input-field", style: { minHeight: "75px" }, value: (formData.heroLead) ?? "Get layout, equipment and budget guidance from PawPad, where many working studio owners got their start — not a generic checklist.", onChange: (e) => updateField("heroLead", e.target.value) })),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Secondary Intro Text"), React.createElement("textarea", { className: "input-field", style: { minHeight: "85px" }, value: formData.introText || "", onChange: (e) => updateField("introText", e.target.value) })),
            React.createElement(ImageUploadWidget, {
              label: "Studio Setup Hero / Layout Image (WebP Auto-Converted)",
              currentUrl: formData.heroImage || "",
              onSelectUrl: (newUrl) => updateField("heroImage", newUrl)
            }),
            React.createElement(CmsField, { label: "Caption on the hero photo (leave empty to hide)", value: formData.heroCaption, onChange: (v) => updateField("heroCaption", v) })
          ),

          // 2. Audience ("Who this is for") & Value ("What you get")
          React.createElement(
            "div",
            { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" } },
            React.createElement(CmsSection, { title: "2. Left card: Who This Is For" },
              ((key, fields) => React.createElement("div", { style: { display: "grid", gridTemplateColumns: `repeat(${fields.length}, 1fr)`, gap: "12px" } },
              fields.map(([k, label]) => React.createElement(CmsField, {
                key: k, label,
                kind: k === "lead" ? "textarea" : undefined,
                value: ((formData.headings || {})[key] || {})[k],
                onChange: (v) => updateField("headings", { ...(formData.headings || {}), [key]: { ...((formData.headings || {})[key] || {}), [k]: v } })
              }))))("audience", [["eyebrow", "Eyebrow"], ["title", "Card title"]]),
              React.createElement(CmsList, { items: formData.whoThisIsFor, itemLabel: "Point", addLabel: "+ Add point", onChange: (list) => updateField("whoThisIsFor", list) })
            ),
            React.createElement(CmsSection, { title: "3. Right card: What You Get", hint: "Add as many deliverables as you need." },
              ((key, fields) => React.createElement("div", { style: { display: "grid", gridTemplateColumns: `repeat(${fields.length}, 1fr)`, gap: "12px" } },
              fields.map(([k, label]) => React.createElement(CmsField, {
                key: k, label,
                kind: k === "lead" ? "textarea" : undefined,
                value: ((formData.headings || {})[key] || {})[k],
                onChange: (v) => updateField("headings", { ...(formData.headings || {}), [key]: { ...((formData.headings || {})[key] || {}), [k]: v } })
              }))))("value", [["eyebrow", "Eyebrow"], ["title", "Card title"]]),
              React.createElement(CmsList, {
                items: formData.whatYouGet, itemLabel: "Deliverable", addLabel: "+ Add deliverable",
                fields: [{ key: "title", label: "Title" }, { key: "desc", label: "Description", kind: "textarea" }],
                onChange: (list) => updateField("whatYouGet", list)
              })
            )
          ),

          // 3. Consultation Packages (The 2 Options)
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px" } },
            React.createElement("h4", { style: { color: "var(--admin-gold-light)", fontSize: "17px", fontFamily: "var(--font-display)" } }, "4. Consultation Packages (", (formData.packages || []).length, ")"),
            ((key, fields) => React.createElement("div", { style: { display: "grid", gridTemplateColumns: `repeat(${fields.length}, 1fr)`, gap: "12px" } },
              fields.map(([k, label]) => React.createElement(CmsField, {
                key: k, label,
                kind: k === "lead" ? "textarea" : undefined,
                value: ((formData.headings || {})[key] || {})[k],
                onChange: (v) => updateField("headings", { ...(formData.headings || {}), [key]: { ...((formData.headings || {})[key] || {}), [k]: v } })
              }))))("packages", [["eyebrow", "Section eyebrow"], ["title", "Section title (start)"], ["titleAccent", "Title accent (italics)"]]),
            ((key, fields) => React.createElement("div", { style: { display: "grid", gridTemplateColumns: `repeat(${fields.length}, 1fr)`, gap: "12px" } },
              fields.map(([k, label]) => React.createElement(CmsField, {
                key: k, label,
                kind: k === "lead" ? "textarea" : undefined,
                value: ((formData.headings || {})[key] || {})[k],
                onChange: (v) => updateField("headings", { ...(formData.headings || {}), [key]: { ...((formData.headings || {})[key] || {}), [k]: v } })
              }))))("packages", [["lead", "Section intro"]]),
            React.createElement(CmsField, { kind: "checkbox", label: "Also show an \"Add to Cart\" button (off = customers book through the consultation form only)", value: formData.showAddToCart === true, onChange: (v) => updateField("showAddToCart", v) }),
            (formData.packages || []).map((pkg, idx) =>
              React.createElement(
                "div",
                { key: pkg.key || idx, className: "card", style: { display: "flex", flexDirection: "column", gap: "14px", border: "1px solid var(--admin-border-subtle)", background: "var(--admin-card-bg)" } },
                React.createElement(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: "12px" } },
                  React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Package Title"), React.createElement("input", { className: "input-field", value: pkg.title || "", onChange: (e) => { const list = [...formData.packages]; list[idx].title = e.target.value; updateField("packages", list); } })),
                  React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Tag / Badge"), React.createElement("input", { className: "input-field", value: pkg.tag || "", onChange: (e) => { const list = [...formData.packages]; list[idx].tag = e.target.value; updateField("packages", list); } })),
                  React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Price Display (e.g. ₹20,000)"), React.createElement("input", { className: "input-field", value: pkg.price || "", onChange: (e) => { const list = [...formData.packages]; list[idx].price = e.target.value; updateField("packages", list); } })),
                  React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Duration / Format"), React.createElement("input", { className: "input-field", value: pkg.duration || "", onChange: (e) => { const list = [...formData.packages]; list[idx].duration = e.target.value; updateField("packages", list); } }))
                ),
                React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Description"), React.createElement("textarea", { className: "input-field", style: { minHeight: "65px" }, value: pkg.desc || "", onChange: (e) => { const list = [...formData.packages]; list[idx].desc = e.target.value; updateField("packages", list); } })),
                React.createElement(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
                  React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Includes (One per line)"), React.createElement(ListTextarea, { separator: "\n",  className: "input-field", style: { minHeight: "80px" }, value: Array.isArray(pkg.includes) ? pkg.includes.join("\n") : (pkg.includes || ""), onChange: (e) => { const list = [...formData.packages]; list[idx].includes = e.target.value.split("\n").filter((l) => l.trim().length > 0); updateField("packages", list); } })),
                  React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Package Note / Travel Terms"), React.createElement("textarea", { className: "input-field", style: { minHeight: "80px" }, value: pkg.note || "", onChange: (e) => { const list = [...formData.packages]; list[idx].note = e.target.value; updateField("packages", list); } }))
                ),
                React.createElement(
                  "div",
                  { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
                  React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "CTA Button Text"), React.createElement("input", { className: "input-field", value: (pkg.ctaText) ?? "Book Now", onChange: (e) => { const list = [...formData.packages]; list[idx].ctaText = e.target.value; updateField("packages", list); } })),
                  React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Booking Form URL"), React.createElement("input", { className: "input-field", value: pkg.applyUrl || "", onChange: (e) => { const list = [...formData.packages]; list[idx].applyUrl = e.target.value; updateField("packages", list); } }))
                )
              )
            )
          ),

          // 4. Studio Infrastructure Gallery
          React.createElement(CmsSection, { title: "5. Studio Infrastructure Gallery" },
            ((key, fields) => React.createElement("div", { style: { display: "grid", gridTemplateColumns: `repeat(${fields.length}, 1fr)`, gap: "12px" } },
              fields.map(([k, label]) => React.createElement(CmsField, {
                key: k, label,
                kind: k === "lead" ? "textarea" : undefined,
                value: ((formData.headings || {})[key] || {})[k],
                onChange: (v) => updateField("headings", { ...(formData.headings || {}), [key]: { ...((formData.headings || {})[key] || {}), [k]: v } })
              }))))("gallery", [["eyebrow", "Eyebrow"], ["title", "Title (start)"], ["titleAccent", "Title accent (italics)"]]),
            ((key, fields) => React.createElement("div", { style: { display: "grid", gridTemplateColumns: `repeat(${fields.length}, 1fr)`, gap: "12px" } },
              fields.map(([k, label]) => React.createElement(CmsField, {
                key: k, label,
                kind: k === "lead" ? "textarea" : undefined,
                value: ((formData.headings || {})[key] || {})[k],
                onChange: (v) => updateField("headings", { ...(formData.headings || {}), [key]: { ...((formData.headings || {})[key] || {}), [k]: v } })
              }))))("gallery", [["lead", "Intro text"]]),
            React.createElement(CmsList, {
              items: formData.gallery, itemLabel: "Photo", addLabel: "+ Add photo", columns: "1fr",
              fields: [{ key: "img", label: "Photo (WebP Auto-Converted)", kind: "image" }, { key: "caption", label: "Caption" }],
              onChange: (list) => updateField("gallery", list)
            })
          ),

          // 4b. How to get started (3-step process)
          React.createElement(CmsSection, { title: "6. How To Get Started (steps)", hint: "Step numbers are added automatically." },
            ((key, fields) => React.createElement("div", { style: { display: "grid", gridTemplateColumns: `repeat(${fields.length}, 1fr)`, gap: "12px" } },
              fields.map(([k, label]) => React.createElement(CmsField, {
                key: k, label,
                kind: k === "lead" ? "textarea" : undefined,
                value: ((formData.headings || {})[key] || {})[k],
                onChange: (v) => updateField("headings", { ...(formData.headings || {}), [key]: { ...((formData.headings || {})[key] || {}), [k]: v } })
              }))))("roadmap", [["eyebrow", "Eyebrow"], ["title", "Title (start)"], ["titleAccent", "Title accent (italics)"], ["buttonText", "Button text"]]),
            React.createElement(CmsList, {
              items: formData.steps, itemLabel: "Step", addLabel: "+ Add step", columns: "1fr",
              fields: [{ key: "title", label: "Title" }, { key: "desc", label: "Text", kind: "textarea" }],
              onChange: (list) => updateField("steps", list)
            })
          ),

          // 5. Frequently Asked Questions (FAQ)
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement(
              "div",
              { style: { display: "flex", justifyContent: "space-between", alignItems: "center" } },
              React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "7. Frequently Asked Questions (", (formData.faqs || []).length, ")"),
              React.createElement(
                "button",
                {
                  className: "btn-admin btn-admin-secondary",
                  style: { padding: "6px 12px", fontSize: "12px" },
                  onClick: () => {
                    const list = [...(formData.faqs || [])];
                    list.push({ q: "New Question?", a: "Detailed answer..." });
                    updateField("faqs", list);
                  }
                },
                "+ Add Question"
              )
            ),
            (formData.faqs || []).map((faq, idx) =>
              React.createElement(
                "div",
                { key: idx, style: { display: "flex", flexDirection: "column", gap: "8px", background: "var(--admin-card-bg)", padding: "12px", borderRadius: "8px", border: "1px solid var(--admin-border-subtle)" } },
                React.createElement(
                  "div",
                  { style: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "10px" } },
                  React.createElement("input", {
                    className: "input-field",
                    style: { fontWeight: "600", fontSize: "13px" },
                    placeholder: "Question",
                    value: faq.q || "",
                    onChange: (e) => {
                      const list = [...(formData.faqs || [])];
                      list[idx] = { ...list[idx], q: e.target.value };
                      updateField("faqs", list);
                    }
                  }),
                  React.createElement(
                    "button",
                    {
                      className: "btn-admin btn-admin-danger",
                      style: { padding: "6px 10px", fontSize: "11px", flexShrink: 0 },
                      onClick: () => {
                        const list = (formData.faqs || []).filter((_, i) => i !== idx);
                        updateField("faqs", list);
                      }
                    },
                    "Remove"
                  )
                ),
                React.createElement("textarea", {
                  className: "input-field",
                  style: { minHeight: "55px", fontSize: "12.5px" },
                  placeholder: "Answer",
                  value: faq.a || "",
                  onChange: (e) => {
                    const list = [...(formData.faqs || [])];
                    list[idx] = { ...list[idx], a: e.target.value };
                    updateField("faqs", list);
                  }
                })
              )
            ),
            React.createElement("div", { style: { marginTop: "12px" } },
              React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Footer Disclaimer & Terms Note"),
              React.createElement("textarea", {
                className: "input-field",
                style: { minHeight: "60px", fontSize: "12.5px" },
                value: formData.disclaimer || "",
                onChange: (e) => updateField("disclaimer", e.target.value)
              })
            )
          )
        ),

        selectedPage === "myotherapy" &&
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "24px" } },

          // 1. Header & Hero
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Page Header & Hero"),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Eyebrow"), React.createElement("input", { className: "input-field", value: (formData.eyebrow) ?? "PAWPAD · MYOTHERAPY", onChange: (e) => updateField("eyebrow", e.target.value) })),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Headline Title"), React.createElement("input", { className: "input-field", value: (formData.title) ?? "Myotherapy – Coming Soon", onChange: (e) => updateField("title", e.target.value) })),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Editorial Lead Paragraph"), React.createElement("textarea", { className: "input-field", style: { minHeight: "85px" }, value: formData.lead || "", onChange: (e) => updateField("lead", e.target.value) })),
            React.createElement(ImageUploadWidget, {
              label: "Myotherapy Banner Cover Image (WebP Auto-Converted)",
              currentUrl: formData.heroImage || "",
              onSelectUrl: (newUrl) => updateField("heroImage", newUrl)
            })
          ),

          // 2. Editorial Content & Methodology
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Editorial Body & Methodology"),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Body Paragraph 1 (Gentle hands-on bodywork)"), React.createElement("textarea", { className: "input-field", style: { minHeight: "95px" }, value: formData.body1 || "", onChange: (e) => updateField("body1", e.target.value) })),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr 1.2fr", gap: "10px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "Link Prefix"), React.createElement("input", { className: "input-field", value: formData.body2Prefix !== undefined ? formData.body2Prefix : "Curious about the methodology? ", onChange: (e) => updateField("body2Prefix", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "Link Text"), React.createElement("input", { className: "input-field", value: (formData.linkText) ?? "Visit Galen Myotherapy", onChange: (e) => updateField("linkText", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "Link URL"), React.createElement("input", { className: "input-field", value: (formData.linkUrl) ?? "https://www.galenmyotherapy.com", onChange: (e) => updateField("linkUrl", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "Link Suffix"), React.createElement("input", { className: "input-field", value: formData.body2Suffix !== undefined ? formData.body2Suffix : ". Join the waitlist to be the first to know when sessions open.", onChange: (e) => updateField("body2Suffix", e.target.value) }))
            ),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Editorial Note / Footer Text"), React.createElement("input", { className: "input-field", value: (formData.note) ?? "Pawpad · Details current as of this document's creation date.", onChange: (e) => updateField("note", e.target.value) }))
          ),

          // 3. Waitlist & Web3Forms Settings
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "3. Waitlist & Web3Forms Settings"),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Waitlist Card Eyebrow"), React.createElement("input", { className: "input-field", value: (formData.waitlistEyebrow) ?? "PRIORITY ACCESS", onChange: (e) => updateField("waitlistEyebrow", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Waitlist Title"), React.createElement("input", { className: "input-field", value: (formData.waitlistTitle) ?? "Join the Myotherapy Waitlist", onChange: (e) => updateField("waitlistTitle", e.target.value) }))
            ),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Waitlist Subtitle / Description"), React.createElement("textarea", { className: "input-field", style: { minHeight: "65px" }, value: (formData.waitlistSubtitle) ?? "Be the first to know when appointments and consultation slots open. Leave your details below or write to us directly.", onChange: (e) => updateField("waitlistSubtitle", e.target.value) })),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1.2fr 1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Web3Forms Access Key"), React.createElement("input", { className: "input-field", placeholder: "e.g. YOUR_ACCESS_KEY_HERE", value: formData.web3FormsAccessKey || "", onChange: (e) => updateField("web3FormsAccessKey", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Direct Email Target"), React.createElement("input", { className: "input-field", value: (formData.waitlistEmail) ?? "info@pawpad.in", onChange: (e) => updateField("waitlistEmail", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Email Subject Line"), React.createElement("input", { className: "input-field", value: (formData.waitlistSubject) ?? "Myotherapy Waitlist", onChange: (e) => updateField("waitlistSubject", e.target.value) }))
            )
          )
        ),

        selectedPage === "contact" &&
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "24px" } },
          React.createElement(CmsSection, { title: "Map (Find us)", hint: "Paste the studio address, a Google Maps link, or the code from Google Maps → Share → Embed a map." },
            React.createElement("div", { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement(CmsField, { label: "Eyebrow", value: formData.mapEyebrow ?? "Find us", onChange: (v) => updateField("mapEyebrow", v) }),
              React.createElement(CmsField, { label: "Title", value: formData.mapTitle ?? "Come visit.", onChange: (v) => updateField("mapTitle", v) })),
            React.createElement(CmsField, { label: "Map location", kind: "textarea", rows: 2, value: formData.map ?? "Pawpad, 426, 5th Main Rd, HRBR Layout 2nd Block, Kalyan Nagar, Bengaluru, Karnataka 560043", onChange: (v) => updateField("map", v) })
          ),

          // 1. Top Banner
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Top Banner Header"),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Banner Eyebrow"), React.createElement("input", { className: "input-field", value: (formData.bannerEyebrow) ?? "Contact Pawpad", onChange: (e) => updateField("bannerEyebrow", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Headline Title"), React.createElement("input", { className: "input-field", value: (formData.bannerTitle) ?? "Come say hello.", onChange: (e) => updateField("bannerTitle", e.target.value) }))
            ),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Banner Lead Paragraph"), React.createElement("textarea", { className: "input-field", style: { minHeight: "65px" }, value: formData.bannerLead || "", onChange: (e) => updateField("bannerLead", e.target.value) })),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Studio Badge Top Label"), React.createElement("input", { className: "input-field", value: (formData.studioBadgeLabel) ?? "STUDIO", onChange: (e) => updateField("studioBadgeLabel", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Studio Badge Name"), React.createElement("input", { className: "input-field", value: (formData.studioBadgeName) ?? "Kalyan Nagar", onChange: (e) => updateField("studioBadgeName", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Studio Badge City"), React.createElement("input", { className: "input-field", value: (formData.studioBadgeCity) ?? "BENGALURU", onChange: (e) => updateField("studioBadgeCity", e.target.value) }))
            )
          ),

          // 2. Get in Touch Details
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Get In Touch & Numbered Details"),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Section Eyebrow"), React.createElement("input", { className: "input-field", value: (formData.mainEyebrow) ?? "Get in touch", onChange: (e) => updateField("mainEyebrow", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Section Title"), React.createElement("input", { className: "input-field", value: (formData.mainTitle) ?? "We are here for you.", onChange: (e) => updateField("mainTitle", e.target.value) }))
            ),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Subtext Description"), React.createElement("textarea", { className: "input-field", style: { minHeight: "60px" }, value: formData.mainSubtext || "", onChange: (e) => updateField("mainSubtext", e.target.value) })),

            // 01 Email & 02 Phone
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "01 Email Address"), React.createElement("input", { className: "input-field", value: (formData.email) ?? "info@pawpad.in", onChange: (e) => updateField("email", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "02 Phone 1 (Dial Digits)"), React.createElement("input", { className: "input-field", value: (formData.phone) ?? "9148443330", onChange: (e) => updateField("phone", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "02 Phone 1 Display Format"), React.createElement("input", { className: "input-field", value: (formData.phoneDisplay) ?? "9148443330", onChange: (e) => updateField("phoneDisplay", e.target.value) }))
            ),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "02 Second Phone (optional, leave empty to hide)"), React.createElement("input", { className: "input-field", value: formData.phone2 || "", onChange: (e) => updateField("phone2", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "02 Phone 2 Display Format"), React.createElement("input", { className: "input-field", value: formData.phone2Display || "", onChange: (e) => updateField("phone2Display", e.target.value) }))
            ),

            // 03 Address
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "03 Address Lines (One per line)"), React.createElement(ListTextarea, { separator: "\n",  className: "input-field", style: { minHeight: "75px" }, value: Array.isArray(formData.addressLines) ? formData.addressLines.join("\n") : (formData.addressLines || ""), onChange: (e) => updateField("addressLines", e.target.value.split("\n").filter((l) => l.trim().length > 0)) })),

            // 04 Opening Hours
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Weekdays Hours"), React.createElement("input", { className: "input-field", value: (formData.hoursWeekdays) ?? "Weekdays: 11 AM - 8 PM", onChange: (e) => updateField("hoursWeekdays", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Weekends Hours"), React.createElement("input", { className: "input-field", value: (formData.hoursWeekends) ?? "Weekends: 10 AM - 8 PM", onChange: (e) => updateField("hoursWeekends", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Closed Accent Text"), React.createElement("input", { className: "input-field", value: (formData.hoursClosed) ?? "Thursdays: Closed", onChange: (e) => updateField("hoursClosed", e.target.value) }))
            )
          ),

          // 3. Studio Promo Card
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Studio Promo Card (Right Column)"),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Card Eyebrow"), React.createElement("input", { className: "input-field", value: (formData.cardEyebrow) ?? "Pawpad Grooming Studio", onChange: (e) => updateField("cardEyebrow", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Card Title Line 1"), React.createElement("input", { className: "input-field", value: (formData.cardTitle) ?? "Soft hands", onChange: (e) => updateField("cardTitle", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Card Title Accent (Italics)"), React.createElement("input", { className: "input-field", value: (formData.cardTitleAccent) ?? "Calm pets.", onChange: (e) => updateField("cardTitleAccent", e.target.value) }))
            ),
            React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Card Description"), React.createElement("textarea", { className: "input-field", style: { minHeight: "65px" }, value: formData.cardDesc || "", onChange: (e) => updateField("cardDesc", e.target.value) })),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Book Button Text"), React.createElement("input", { className: "input-field", value: (formData.cardBtnBook) ?? "Book a session", onChange: (e) => updateField("cardBtnBook", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Call Button Text"), React.createElement("input", { className: "input-field", value: (formData.cardBtnCall) ?? "Call us", onChange: (e) => updateField("cardBtnCall", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Call Phone Link"), React.createElement("input", { className: "input-field", value: (formData.cardCallPhone) ?? "+919148443330", onChange: (e) => updateField("cardCallPhone", e.target.value) }))
            )
          ),

          // 4. Social Media Links
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px", background: "var(--admin-bg)", padding: "18px", borderRadius: "10px", border: "1px solid var(--admin-border-subtle)" } },
            React.createElement("h4", { style: { color: "var(--admin-gold)", fontSize: "15px" } }, "Social Media & Stay Connected Links"),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Social Eyebrow"), React.createElement("input", { className: "input-field", value: (formData.socialEyebrow) ?? "Follow Pawpad", onChange: (e) => updateField("socialEyebrow", e.target.value) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Social Headline Title"), React.createElement("input", { className: "input-field", value: (formData.socialTitle) ?? "Stay connected.", onChange: (e) => updateField("socialTitle", e.target.value) }))
            ),
            React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Instagram URL"), React.createElement("input", { className: "input-field", value: (formData.socials && formData.socials.instagram) || "", onChange: (e) => updateField("socials", { ...(formData.socials || {}), instagram: e.target.value }) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Facebook URL"), React.createElement("input", { className: "input-field", value: (formData.socials && formData.socials.facebook) || "", onChange: (e) => updateField("socials", { ...(formData.socials || {}), facebook: e.target.value }) })),
              React.createElement("div", null, React.createElement("label", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "Twitter / X URL"), React.createElement("input", { className: "input-field", value: (formData.socials && formData.socials.twitter) || "", onChange: (e) => updateField("socials", { ...(formData.socials || {}), twitter: e.target.value }) }))
            )
          )
        )
      )
    );
  }

  // -------------------------------------------------------------
  // MEDIA & WEBP OPTIMIZER TAB
  // -------------------------------------------------------------
  function MediaManagerTab() {
    const [optimizedImage, setOptimizedImage] = useState(null);
    const [quality, setQuality] = useState(0.85);
    const [isConverting, setIsConverting] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState("home.heroImage");
    const [assignNotice, setAssignNotice] = useState("");
    const [uploads, setUploads] = useState({ files: [], usage: null });
    const [convertNotice, setConvertNotice] = useState("");
    const fileInputRef = useRef(null);

    const loadUploads = async () => {
      if (!window.PawpadApi) return;
      const result = await window.PawpadApi.call("list_uploads", {});
      if (result.ok) setUploads({ files: result.data.files || [], usage: result.data.usage || null });
    };

    useEffect(() => {
      loadUploads();
    }, []);

    const oldFormatCount = uploads.files.filter((f) => f.kind === "image" && /\.(jpe?g|png)$/i.test(f.url)).length;

    const handleConvertOld = async () => {
      setConvertNotice("Converting old JPG/PNG uploads to WebP…");
      const result = await window.PawpadApi.call("convert_uploads", {});
      if (!result.ok) {
        setConvertNotice("⚠️ " + ((result.data && result.data.error) || "The server could not be reached."));
        return;
      }
      // The published pages now point at the new .webp files.
      if (window.PawpadContentStore) await window.PawpadContentStore.refreshFromServer();
      setConvertNotice(`✓ Converted ${result.data.converted} image(s) to WebP` + (result.data.failed ? `, ${result.data.failed} could not be converted` : "") + ". The originals were deleted.");
      setTimeout(() => setConvertNotice(""), 8000);
      loadUploads();
    };

    const handleDeleteUpload = async (file) => {
      if (!window.confirm(`Delete "${file.name || file.url}" from the server? Any page still using it will show a broken image.`)) return;
      const result = await window.PawpadApi.call("delete_upload", { id: file.id });
      if (!result.ok) showNotice("Could not delete: " + ((result.data && result.data.error) || "The server could not be reached."));
      loadUploads();
    };

    const imageSlots = [
      { id: "home.heroImage", page: "home", field: "heroImage", label: "Home Page — Hero Cover Photo" },
      { id: "grooming.heroImage", page: "grooming", field: "heroImage", label: "Grooming Page — Banner Cover" },
      { id: "courses.heroImage", page: "courses", field: "heroImage", label: "Courses Page — Academy Banner" },
      { id: "studioSetup.heroImage", page: "studioSetup", field: "heroImage", label: "Studio Setup Page — Hero Cover Photo" },
      { id: "about.founder.portrait", page: "about", field: "founder.portrait", label: "About Page — Founder Portrait Photo" },
      { id: "about.founder.dewImg", page: "about", field: "founder.dewImg", label: "About Page — Puchki Memory Photo" },
      { id: "boarding.heroImage", page: "boarding", field: "heroImage", label: "Boarding Page — Cover Photo" },
      { id: "boarding.standardsImg", page: "boarding", field: "standardsImg", label: "Boarding Page — Care Standards Photo" },
      { id: "myotherapy.heroImage", page: "myotherapy", field: "heroImage", label: "Myotherapy Page — Cover Photo" }
    ];

    const processFile = async (file) => {
      if (!file) return;
      setIsConverting(true);
      try {
        if (window.PawpadImageOptimizer) {
          const res = await window.PawpadImageOptimizer.convertToWebP(file, quality);
          setOptimizedImage({ ...res, originalFile: file, fileName: file.name.replace(/\.[^/.]+$/, "") + ".webp" });
        }
      } catch (err) {
        console.error("WebP Optimization error:", err);
        showNotice("Failed to convert image to WebP format. Please check file.");
      } finally {
        setIsConverting(false);
      }
    };

    const handleFileSelect = (e) => {
      const file = e.target.files[0];
      processFile(file);
    };

    const handleAssignSlot = async () => {
      if (!optimizedImage) return;
      const slot = imageSlots.find((s) => s.id === selectedSlot);
      if (!slot || !window.PawpadContentStore) return;

      setAssignNotice("Uploading and publishing…");
      const upload = await window.PawpadApi.uploadFile("image", optimizedImage.fileName || "pawpad-image", optimizedImage.dataUrl);
      if (!upload.ok) {
        setAssignNotice(`⚠️ Upload failed: ${upload.error}`);
        return;
      }
      window.PawpadContentStore.updateField(slot.page, slot.field, upload.url);
      const result = await window.PawpadContentStore.lastPublish;
      setAssignNotice(result.ok ? `✓ Image is live on '${slot.label}'.` : `⚠️ Uploaded, but not published: ${result.error}`);
      setTimeout(() => setAssignNotice(""), 6000);
      loadUploads();
    };

    const handleDownloadWebp = () => {
      if (!optimizedImage) return;
      const a = document.createElement("a");
      a.href = optimizedImage.dataUrl;
      a.download = optimizedImage.fileName || "optimized-pawpad.webp";
      a.click();
    };

    const formatBytes = (bytes) => {
      if (bytes < 1024) return bytes + " B";
      else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
      else return (bytes / 1048576).toFixed(2) + " MB";
    };

    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "24px" } },

      React.createElement(
        "div",
        { className: "card admin-banner" },
        React.createElement("h2", { style: { fontFamily: "var(--font-display)", fontSize: "22px", marginBottom: "6px" } }, "Automatic WebP Image Performance Engine"),
        React.createElement("p", { style: { fontSize: "14px" } }, "Upload any image (PNG, JPG, HEIC, GIF). The system automatically compresses it to high-efficiency .webp format to keep your website lightning fast.")
      ),

      // Upload Zone
      React.createElement(
        "div",
        {
          className: "card",
          style: {
            border: "2px dashed var(--admin-border)",
            padding: "48px 24px",
            textAlign: "center",
            cursor: "pointer",
            background: "var(--admin-card-hover)"
          },
          onClick: () => fileInputRef.current && fileInputRef.current.click(),
          onDragOver: (e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = "var(--admin-gold)";
          },
          onDragLeave: (e) => {
            e.currentTarget.style.borderColor = "var(--admin-border)";
          },
          onDrop: (e) => {
            e.preventDefault();
            e.currentTarget.style.borderColor = "var(--admin-border)";
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
              processFile(e.dataTransfer.files[0]);
            }
          }
        },
        React.createElement("input", {
          type: "file",
          ref: fileInputRef,
          style: { display: "none" },
          accept: "image/*",
          onChange: handleFileSelect
        }),
        React.createElement("div", { style: { display: "flex", justifyContent: "center", marginBottom: "12px" } }, React.createElement(Icons.Media, null)),
        React.createElement("div", { style: { fontSize: "16px", fontWeight: "600", color: "var(--admin-text)", marginBottom: "6px" } }, isConverting ? "Compressing & Converting to WebP..." : "Click or drag & drop an image to optimize"),
        React.createElement("div", { style: { fontSize: "13px", color: "var(--admin-text-faint)" } }, "Supports PNG, JPEG, SVG, WebP · Automatically creates high-compression .webp")
      ),

      // Conversion Result Card
      optimizedImage &&
      React.createElement(
        "div",
        { className: "card", style: { display: "flex", flexDirection: "column", gap: "20px" } },
        React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--admin-gold)" } }, "WebP Optimization Result"),

        React.createElement(
          "div",
          { style: { display: "grid", gridTemplateColumns: "minmax(240px, 320px) 1fr", gap: "24px", alignItems: "center" } },

          // Image Preview Frame
          React.createElement(
            "div",
            { style: { background: "var(--admin-bg)", padding: "8px", borderRadius: "12px", border: "1px solid var(--admin-border)", textAlign: "center" } },
            React.createElement("img", {
              src: optimizedImage.dataUrl,
              alt: "Optimized WebP Preview",
              style: { width: "100%", height: "200px", objectFit: "cover", borderRadius: "8px" }
            }),
            React.createElement("div", { style: { fontSize: "12px", color: "var(--admin-gold-light)", marginTop: "6px", fontFamily: "monospace" } }, `${optimizedImage.width} × ${optimizedImage.height} px · .webp`)
          ),

          // Metrics & Slot Assigning
          React.createElement(
            "div",
            { style: { display: "flex", flexDirection: "column", gap: "16px" } },

            // Stats
            React.createElement(
              "div",
              { style: { display: "flex", gap: "16px", flexWrap: "wrap" } },
              React.createElement(
                "div",
                { style: { background: "var(--admin-bg)", padding: "12px 18px", borderRadius: "8px", border: "1px solid var(--admin-border)" } },
                React.createElement("div", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "ORIGINAL SIZE"),
                React.createElement("div", { style: { fontSize: "18px", fontWeight: "700" } }, formatBytes(optimizedImage.originalSizeBytes))
              ),
              React.createElement(
                "div",
                { style: { background: "var(--admin-bg)", padding: "12px 18px", borderRadius: "8px", border: "1px solid var(--admin-border)" } },
                React.createElement("div", { style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, "WEBP OPTIMIZED"),
                React.createElement("div", { style: { fontSize: "18px", fontWeight: "700", color: "var(--admin-success)" } }, formatBytes(optimizedImage.webpSizeBytes))
              ),
              React.createElement(
                "div",
                { style: { background: "var(--admin-success-bg)", padding: "12px 18px", borderRadius: "8px", border: "1px solid #86efac" } },
                React.createElement("div", { style: { fontSize: "11px", color: "var(--admin-success)" } }, "SAVINGS"),
                React.createElement("div", { style: { fontSize: "18px", fontWeight: "700", color: "var(--admin-success)" } }, `-${optimizedImage.savedPercent}%`)
              )
            ),

            // Slot Destination Select
            React.createElement(
              "div",
              { style: { display: "flex", flexDirection: "column", gap: "6px" } },
              React.createElement("label", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "Assign Directly to Website Page Slot:"),
              React.createElement(
                "select",
                {
                  className: "input-field",
                  value: selectedSlot,
                  onChange: (e) => setSelectedSlot(e.target.value)
                },
                imageSlots.map((s) => React.createElement("option", { key: s.id, value: s.id }, s.label))
              )
            ),

            // Action Buttons
            React.createElement(
              "div",
              { style: { display: "flex", gap: "10px", alignItems: "center" } },
              React.createElement(
                "button",
                { className: "btn-admin btn-admin-primary", onClick: handleAssignSlot },
                "Apply WebP Image to Slot"
              ),
              React.createElement(
                "button",
                { className: "btn-admin btn-admin-secondary", onClick: handleDownloadWebp },
                "Download .webp File"
              ),
              assignNotice && React.createElement("span", { style: { color: assignNotice.startsWith("⚠️") ? "var(--admin-danger)" : "var(--admin-success)", fontSize: "13px", fontWeight: "600" } }, assignNotice)
            )
          )
        )
      ),

      // Files stored on the server
      React.createElement(
        "div",
        { className: "card" },
        React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--admin-gold)", marginBottom: "6px" } }, "Uploaded Files on the Server"),
        uploads.usage && React.createElement("p", { style: { fontSize: "13px", color: "var(--admin-text-muted)", marginBottom: "12px" } },
          `Storage used: ${formatBytes(uploads.usage.usedBytes)} of ${formatBytes(uploads.usage.quotaBytes)}. Delete photos you no longer use to free space.`
        ),
        oldFormatCount > 0 && React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", marginBottom: "14px" } },
          React.createElement("span", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } },
            `${oldFormatCount} older upload(s) are JPG/PNG. Convert them to smaller WebP files (pages using them are updated automatically):`),
          React.createElement("button", { className: "btn-admin btn-admin-primary", onClick: handleConvertOld }, "Convert to WebP")
        ),
        convertNotice && React.createElement("p", { role: "status", style: { fontSize: "13px", fontWeight: 600, marginBottom: "12px", color: convertNotice.startsWith("⚠️") ? "var(--admin-danger)" : "var(--admin-success)" } }, convertNotice),
        uploads.files.length === 0
          ? React.createElement("p", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "No files uploaded yet.")
          : React.createElement(
              "div",
              { style: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "12px" } },
              uploads.files.map((file) =>
                React.createElement(
                  "div",
                  { key: file.id, style: { border: "1px solid var(--admin-border)", borderRadius: "8px", padding: "8px", display: "flex", flexDirection: "column", gap: "6px" } },
                  file.kind === "image"
                    ? React.createElement("img", { src: file.url, alt: file.name, loading: "lazy", style: { width: "100%", height: "100px", objectFit: "cover", borderRadius: "6px" } })
                    : React.createElement("a", { href: file.url, target: "_blank", rel: "noopener", style: { fontSize: "13px" } }, "📄 PDF"),
                  React.createElement("div", { style: { fontSize: "11px", color: "var(--admin-text-muted)", wordBreak: "break-all" } }, `${file.name || "file"} · ${formatBytes(file.bytes)}`),
                  React.createElement("button", { className: "btn-admin btn-admin-danger", style: { fontSize: "11px", padding: "4px 8px" }, onClick: () => handleDeleteUpload(file) }, "Delete")
                )
              )
            )
      )
    );
  }

  // -------------------------------------------------------------
  // CANCEL / RESCHEDULE A BOOKING (both email the customer, with a copy to info@)
  // -------------------------------------------------------------
  function BookingChangeModal({ mode, booking, onClose, onDone }) {
    const isReschedule = mode === "reschedule";
    const [reason, setReason] = useState("");
    const [choice, setChoice] = useState({ date: null, time: null });
    const [availability, setAvailability] = useState(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const loadSlots = async () => {
      setAvailability(null);
      setAvailability(await window.PawpadSlots.load(true));
    };
    useEffect(() => {
      if (isReschedule && window.PawpadSlots) loadSlots();
    }, []);

    const who = `${booking.pet.name || "Pet"} (${booking.serviceTitle}) for ${booking.customer.name}`;
    const canSubmit = !saving && (isReschedule ? reason.trim() && choice.date && choice.time : true);

    const submit = async () => {
      if (!canSubmit) return;
      setSaving(true);
      setError("");
      const result = isReschedule
        ? await window.PawpadApi.call("reschedule_booking", { id: booking.id, date: choice.date, time: choice.time, reason: reason.trim() })
        : await window.PawpadApi.call("cancel_booking", { id: booking.id, reason: reason.trim() });
      setSaving(false);
      if (!result.ok) {
        setError((result.data && result.data.error) || "The Pawpad server could not be reached.");
        if (isReschedule && result.status === 409) {
          setChoice({ date: choice.date, time: null });
          loadSlots();
        }
        return;
      }
      const d = result.data;
      const parts = [isReschedule ? "✓ Booking rescheduled." : "✓ Booking cancelled."];
      if (isReschedule ? d.calendarSynced === false : d.calendarRemoved === false) {
        parts.push("⚠️ The info@ calendar could not be updated; please check it on the phone.");
      }
      parts.push(d.emailSent ? `Email sent to ${booking.customer.email} (copy to info@).` : `⚠️ Email not sent: ${d.emailError}`);
      onDone(parts.join(" "));
    };

    return React.createElement(
      "div",
      { className: "modal-overlay", onClick: onClose },
      React.createElement(
        "div",
        { className: "modal-card", role: "dialog", "aria-label": isReschedule ? "Reschedule booking" : "Cancel booking", style: { maxWidth: isReschedule ? "760px" : "520px", padding: "28px", maxHeight: "90vh", overflowY: "auto" }, onClick: (e) => e.stopPropagation() },
        React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "20px", color: "var(--admin-gold)", marginBottom: "8px" } },
          isReschedule ? "Reschedule booking" : "Cancel booking"),
        React.createElement("p", { style: { fontSize: "14px", marginBottom: "4px" } }, who),
        React.createElement("p", { style: { fontSize: "13px", color: "var(--admin-text-muted)", marginBottom: "16px" } },
          `Currently: ${booking.label || `${booking.date} ${formatSlotTime(booking.time)}`} · Ref ${booking.ref}`),
        React.createElement("label", { style: { display: "block", fontSize: "12px", fontWeight: 600, color: "var(--admin-text-muted)", marginBottom: "4px" } },
          isReschedule ? "Reason for rescheduling (sent to the customer) *" : "Reason for cancelling (sent to the customer, optional)"),
        React.createElement("textarea", { className: "input-field", rows: 2, value: reason, onChange: (e) => setReason(e.target.value), "aria-label": "Reason", style: { width: "100%", marginBottom: "16px" } }),
        isReschedule && React.createElement(
          "div",
          { className: "reschedule-slots", style: { marginBottom: "16px" } },
          React.createElement("p", { style: { fontSize: "12px", fontWeight: 600, color: "var(--admin-text-muted)", marginBottom: "8px" } }, "New date and time (only free slots are shown)"),
          window.SlotPicker
            ? React.createElement(window.SlotPicker, { availability, serviceId: booking.serviceId, value: choice, onChange: setChoice, excluded: [], onRetry: loadSlots })
            : React.createElement("p", null, "The slot picker could not be loaded. Please reload the page.")
        ),
        error && React.createElement("p", { role: "alert", style: { color: "var(--admin-danger)", fontSize: "13px", fontWeight: 600, marginBottom: "12px" } }, error),
        React.createElement(
          "div",
          { style: { display: "flex", justifyContent: "flex-end", gap: "12px", flexWrap: "wrap" } },
          React.createElement("button", { type: "button", className: "btn-admin btn-admin-secondary", onClick: onClose }, "Close"),
          React.createElement("button", {
            type: "button",
            className: `btn-admin ${isReschedule ? "btn-admin-primary" : "btn-admin-danger"}`,
            disabled: !canSubmit,
            style: { opacity: canSubmit ? 1 : 0.5 },
            onClick: submit
          }, saving ? "Saving…" : isReschedule ? "Reschedule & email customer" : "Cancel booking & email customer")
        )
      )
    );
  }

  // -------------------------------------------------------------
  // GROOMING BOOKINGS TAB (slots from the Pawpad server + info@ calendar)
  // -------------------------------------------------------------
  function localDateString(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  function shiftDate(dateStr, days) {
    const [y, m, d] = dateStr.split("-").map(Number);
    return localDateString(new Date(y, m - 1, d + days));
  }

  function formatSlotTime(time) {
    const [h, m] = String(time).split(":").map(Number);
    return `${h % 12 === 0 ? 12 : h % 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  }

  /** One line of a booking's history: what was done, by whom, when. */
  function logLine(entry) {
    const when = entry.date ? new Date(entry.date).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";
    return `↺ ${entry.text}${entry.by ? ` — ${entry.by}` : ""}${when ? `, ${when}` : ""}`;
  }

  function BookingsTab({ canAdmin }) {
    const [date, setDate] = useState(() => localDateString(new Date()));
    const [day, setDay] = useState(null);
    const [loading, setLoading] = useState(false);
    const [notice, setNotice] = useState("");
    const [confirmModal, setConfirmModal] = useState({ isOpen: false });

    const serverError = (result) => (result.data && result.data.error) || "The Pawpad server could not be reached.";

    // Only the newest request counts, so an older, slower answer never replaces the day just chosen.
    const latestLoad = React.useRef(0);
    const load = async (target) => {
      const ticket = ++latestLoad.current;
      setLoading(true);
      const result = await window.PawpadApi.call("list_bookings", { date: target || date });
      if (ticket !== latestLoad.current) return;
      setLoading(false);
      if (result.ok) {
        setDay(result.data);
      } else {
        setNotice("⚠️ " + serverError(result));
      }
    };

    useEffect(() => {
      load(date);
    }, [date]);

    const flash = (text) => {
      setNotice(text);
      setTimeout(() => setNotice(""), text.startsWith("⚠️") ? 9000 : 4000);
    };

    // Cancel / reschedule open one window that asks for the reason and emails the customer.
    const [change, setChange] = useState(null);
    const handleCancel = (booking) => setChange({ mode: "cancel", booking });
    const handleReschedule = (booking) => setChange({ mode: "reschedule", booking });

    const handleCleanup = async () => {
      flash("Removing calendar events left by cancelled bookings…");
      const result = await window.PawpadApi.call("cleanup_calendar", {});
      if (!result.ok) return flash("⚠️ " + serverError(result));
      flash(result.data.failed ? `⚠️ ${result.data.failed} event(s) could not be removed from the calendar.` : "✓ The calendar is tidy: events of cancelled bookings are removed.");
      load();
    };

    const handleBlock = async (time) => {
      const reason = window.prompt(time ? `Block ${formatSlotTime(time)}? Reason (optional):` : "Block the whole day? Reason (optional):", "");
      if (reason === null) return;
      const result = await window.PawpadApi.call("block_slot", { date, time: time || "", reason });
      if (!result.ok) return flash("⚠️ " + serverError(result));
      setDay(result.data);
      flash(time ? `✓ ${formatSlotTime(time)} is blocked.` : "✓ The whole day is blocked.");
    };

    const handleUnblock = async (blockId) => {
      const result = await window.PawpadApi.call("unblock_slot", { id: blockId });
      if (!result.ok) return flash("⚠️ " + serverError(result));
      setDay(result.data);
      flash("✓ Unblocked.");
    };

    const stateBadge = {
      free: { text: "Free", style: { background: "var(--admin-card-hover)" } },
      booked: { text: "Booked", className: "badge-approved" },
      blocked: { text: "Blocked", className: "badge-rejected" },
      calendar: { text: "Calendar event", style: { background: "var(--admin-card-hover)", color: "var(--admin-gold)" } },
      unknown: { text: "Calendar unreachable", className: "badge-rejected" },
      closed: { text: "Studio closed", className: "badge-rejected" }
    };

    const cancelled = day ? day.bookings.filter((b) => b.status === "cancelled") : [];

    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "20px" } },
      React.createElement(ConfirmModal, { ...confirmModal, onCancel: () => setConfirmModal({ isOpen: false }) }),
      change && React.createElement(BookingChangeModal, {
        mode: change.mode,
        booking: change.booking,
        onClose: () => setChange(null),
        onDone: (message) => {
          setChange(null);
          flash(message.includes("⚠️") ? "⚠️ " + message : message);
          load();
        }
      }),

      // Day picker
      React.createElement(
        "div",
        { className: "card", style: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" } },
        React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: () => setDate(shiftDate(date, -1)) }, "← Previous day"),
        React.createElement("input", { type: "date", className: "input-field", value: date, onChange: (e) => e.target.value && setDate(e.target.value), style: { width: "auto" }, "aria-label": "Choose a day" }),
        React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: () => setDate(shiftDate(date, 1)) }, "Next day →"),
        React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: () => setDate(localDateString(new Date())) }, "Today"),
        React.createElement("div", { style: { flex: 1 } }),
        canAdmin && React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: handleCleanup, title: "Removes events of cancelled bookings that are still in the info@ calendar" }, "Tidy calendar"),
        React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: () => load() }, loading ? "Refreshing…" : "↻ Refresh")
      ),

      notice && React.createElement("div", { className: "card", role: "status", style: { color: notice.startsWith("⚠️") ? "var(--admin-danger)" : "var(--admin-success)", fontWeight: 600, fontSize: "14px" } }, notice),

      // Coming days overview
      day && day.upcoming.length > 0 && React.createElement(
        "div",
        { className: "card" },
        React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "16px", color: "var(--admin-gold)", marginBottom: "10px" } }, "Coming days with bookings"),
        React.createElement(
          "div",
          { style: { display: "flex", gap: "8px", flexWrap: "wrap" } },
          day.upcoming.map((u) => React.createElement(
            "button",
            { key: u.date, className: "btn-admin " + (u.date === date ? "btn-admin-primary" : "btn-admin-secondary"), style: { fontSize: "12px", padding: "6px 10px" }, onClick: () => setDate(u.date) },
            `${new Date(u.date + "T00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })} · ${u.booked}`
          ))
        )
      ),

      // The chosen day
      day && React.createElement(
        "div",
        { className: "card", style: { display: "flex", flexDirection: "column", gap: "12px" } },
        React.createElement(
          "div",
          { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" } },
          React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "20px", color: "var(--admin-text)" } }, day.label),
          canAdmin && !day.closed && (day.dayBlock
            ? React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: () => handleUnblock(day.dayBlock.id) }, "Unblock whole day")
            : React.createElement("button", { className: "btn-admin btn-admin-danger", onClick: () => handleBlock("") }, "Block whole day"))
        ),
        day.closed && React.createElement("p", { style: { color: "var(--admin-text-muted)" } }, "The studio is closed on Thursdays."),
        day.dayBlock && React.createElement("p", { style: { color: "var(--admin-danger)", fontSize: "14px" } }, `Whole day blocked${day.dayBlock.reason ? `: ${day.dayBlock.reason}` : ""}.`),
        (day.closures || []).map((c) => React.createElement("p", { key: "closure" + c.id, style: { color: "var(--admin-danger)", fontSize: "14px" } },
          `Studio closure: ${c.label}${c.reason ? ` (${c.reason})` : ""}.${canAdmin ? " Change it under Studio Closures." : ""}`)),
        day.calendarError && React.createElement("p", { style: { color: "var(--admin-danger)", fontSize: "14px" } }, `⚠️ ${day.calendarError} Customers can't book online until this is fixed.`),
        day.slots.map((slot) => {
          const badge = stateBadge[slot.state] || stateBadge.free;
          const b = slot.booking;
          return React.createElement(
            "div",
            { key: slot.time, "data-slot": slot.time, style: { display: "flex", alignItems: "flex-start", gap: "14px", padding: "12px 14px", borderRadius: "8px", border: "1px solid var(--admin-border)", background: "var(--admin-bg)", flexWrap: "wrap" } },
            React.createElement("strong", { style: { minWidth: "78px", fontSize: "15px" } }, formatSlotTime(slot.time)),
            React.createElement("span", { className: "badge " + (badge.className || ""), style: { fontSize: "11px", ...(badge.style || {}) } }, badge.text),
            React.createElement(
              "div",
              { style: { flex: 1, minWidth: "200px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "3px" } },
              b && React.createElement("span", { style: { fontWeight: 600 } }, `${b.pet.name || "Pet"}${b.pet.type ? ` (${b.pet.type}${b.pet.breed ? ` · ${b.pet.breed}` : ""})` : ""} — ${b.serviceTitle}`),
              b && React.createElement("span", null, `${b.customer.name} · `, React.createElement("a", { href: `tel:${b.customer.phone}` }, b.customer.phone), ` · ${b.customer.email}`),
              b && b.notes && React.createElement("span", { style: { fontStyle: "italic", color: "var(--admin-text-muted)" } }, `Notes: ${b.notes}`),
              b && b.source === "walkin" && React.createElement("span", { style: { fontSize: "11px", color: "var(--admin-gold)" } }, "Walk-in / phone booking"),
              b && (b.adminLog || []).map((entry, i) => React.createElement("span", { key: "log" + i, style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, logLine(entry))),
              b && React.createElement("span", { style: { color: "var(--admin-text-faint)", fontSize: "11px" } }, `Ref ${b.ref}`,
                b.calendarStatus === "failed" ? " · ⚠️ not added to the calendar" : "",
                b.emailStatus === "failed" ? " · ⚠️ confirmation email not sent" : ""),
              slot.state === "calendar" && React.createElement("span", { style: { color: "var(--admin-text-muted)" } }, "An event in the info@ calendar blocks this time."),
              slot.state === "blocked" && !day.dayBlock && React.createElement("span", { style: { color: "var(--admin-text-muted)" } }, "Blocked by an admin."),
              slot.state === "closed" && React.createElement("span", { style: { color: "var(--admin-text-muted)" } }, `Studio closure${slot.reason ? `: ${slot.reason}` : ""}.`)
            ),
            b && React.createElement("button", { className: "btn-admin btn-admin-secondary", style: { fontSize: "12px", padding: "5px 10px" }, onClick: () => handleReschedule(b) }, "Reschedule"),
            b && React.createElement("button", { className: "btn-admin btn-admin-danger", style: { fontSize: "12px", padding: "5px 10px" }, onClick: () => handleCancel(b) }, "Cancel booking"),
            canAdmin && slot.state === "free" && React.createElement("button", { className: "btn-admin btn-admin-secondary", style: { fontSize: "12px", padding: "5px 10px" }, onClick: () => handleBlock(slot.time) }, "Block"),
            canAdmin && slot.state === "blocked" && !day.dayBlock && slot.blockId && React.createElement("button", { className: "btn-admin btn-admin-secondary", style: { fontSize: "12px", padding: "5px 10px" }, onClick: () => handleUnblock(slot.blockId) }, "Unblock")
          );
        }),
        cancelled.length > 0 && React.createElement(
          "details",
          { style: { fontSize: "13px", color: "var(--admin-text-muted)" } },
          React.createElement("summary", null, `${cancelled.length} cancelled booking${cancelled.length > 1 ? "s" : ""} on this day`),
          cancelled.map((c) => React.createElement("p", { key: c.id, style: { marginTop: "6px" } },
            `${formatSlotTime(c.time)} · ${c.pet.name || "Pet"} · ${c.customer.name} · ${c.customer.phone} (cancelled by ${c.cancelledBy || "admin"})`))
        )
      )
    );
  }

  // -------------------------------------------------------------
  // UPCOMING GROOMING SESSIONS (every future booking, soonest first)
  // -------------------------------------------------------------
  function UpcomingGroomingTab() {
    const [bookings, setBookings] = useState(null);
    const [notice, setNotice] = useState("");
    const [confirmModal, setConfirmModal] = useState({ isOpen: false });

    const load = async () => {
      const result = await window.PawpadApi.call("list_upcoming_bookings", {});
      if (result.ok) setBookings(result.data.bookings || []);
      else setNotice("⚠️ " + ((result.data && result.data.error) || "The Pawpad server could not be reached."));
    };

    useEffect(() => {
      load();
    }, []);

    const [change, setChange] = useState(null);

    const days = [];
    (bookings || []).forEach((b) => {
      const last = days[days.length - 1];
      if (last && last.date === b.date) last.items.push(b);
      else days.push({ date: b.date, items: [b] });
    });

    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "16px" } },
      React.createElement(ConfirmModal, { ...confirmModal, onCancel: () => setConfirmModal({ isOpen: false }) }),
      change && React.createElement(BookingChangeModal, {
        mode: change.mode,
        booking: change.booking,
        onClose: () => setChange(null),
        onDone: (message) => {
          setChange(null);
          setNotice(message.includes("⚠️") ? "⚠️ " + message : message);
          load();
        }
      }),
      React.createElement(
        "div",
        { className: "card", style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" } },
        React.createElement("span", { style: { fontSize: "14px" } },
          bookings === null ? "Loading…" : `${bookings.length} upcoming grooming session${bookings.length === 1 ? "" : "s"} from today onwards.`),
        React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: load }, "↻ Refresh")
      ),
      notice && React.createElement("div", { className: "card", role: "status", style: { fontWeight: 600, fontSize: "14px", color: notice.startsWith("⚠️") ? "var(--admin-danger)" : "var(--admin-success)" } }, notice),
      bookings && bookings.length === 0 && React.createElement("div", { className: "card", style: { color: "var(--admin-text-muted)" } }, "No upcoming grooming sessions."),
      days.map((day) => React.createElement(
        "div",
        { key: day.date, className: "card", "data-day": day.date, style: { display: "flex", flexDirection: "column", gap: "10px" } },
        React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "17px", color: "var(--admin-gold)" } },
          `${new Date(day.date + "T00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })} · ${day.items.length} session${day.items.length === 1 ? "" : "s"}`),
        day.items.map((b) => React.createElement(
          "div",
          { key: b.id, "data-booking": b.ref, style: { display: "flex", alignItems: "flex-start", gap: "14px", padding: "10px 12px", borderRadius: "8px", border: "1px solid var(--admin-border)", background: "var(--admin-bg)", flexWrap: "wrap" } },
          React.createElement("strong", { style: { minWidth: "78px" } }, formatSlotTime(b.time)),
          React.createElement(
            "div",
            { style: { flex: 1, minWidth: "220px", fontSize: "13px", display: "flex", flexDirection: "column", gap: "3px" } },
            React.createElement("span", { style: { fontWeight: 600 } }, `${b.pet.name || "Pet"}${b.pet.type ? ` (${b.pet.type}${b.pet.breed ? ` · ${b.pet.breed}` : ""})` : ""} — ${b.serviceTitle}`),
            React.createElement("span", null, `${b.customer.name} · `, React.createElement("a", { href: `tel:${b.customer.phone}` }, b.customer.phone), ` · ${b.customer.email}`),
            b.notes && React.createElement("span", { style: { fontStyle: "italic", color: "var(--admin-text-muted)" } }, `Notes: ${b.notes}`),
            (b.adminLog || []).map((entry, i) => React.createElement("span", { key: "log" + i, style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, logLine(entry))),
            React.createElement("span", { style: { fontSize: "11px", color: "var(--admin-text-faint)" } }, `Ref ${b.ref}`, b.source === "walkin" ? " · walk-in / phone" : "")
          ),
          React.createElement("button", { className: "btn-admin btn-admin-secondary", style: { fontSize: "12px", padding: "5px 10px" }, onClick: () => setChange({ mode: "reschedule", booking: b }) }, "Reschedule"),
          React.createElement("button", { className: "btn-admin btn-admin-danger", style: { fontSize: "12px", padding: "5px 10px" }, onClick: () => setChange({ mode: "cancel", booking: b }) }, "Cancel booking")
        ))
      ))
    );
  }

  // -------------------------------------------------------------
  // STUDIO CLOSURES (Owner / Administrator): close dates, all day or some times
  // -------------------------------------------------------------
  function ClosuresTab() {
    const [closures, setClosures] = useState(null);
    const [times, setTimes] = useState(["10:00", "11:00", "12:00", "13:00", "16:00", "17:00", "18:00", "19:00"]);
    const [form, setForm] = useState({ startDate: todayString(), endDate: todayString(), allDay: true, times: [], reason: "" });
    const [preview, setPreview] = useState(null);
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState("");
    const [confirmModal, setConfirmModal] = useState({ isOpen: false });

    const serverError = (result) => (result.data && result.data.error) || "The Pawpad server could not be reached.";

    const load = async () => {
      const result = await window.PawpadApi.call("list_closures", {});
      if (result.ok) {
        setClosures(result.data.closures || []);
        if (Array.isArray(result.data.times)) setTimes(result.data.times);
      } else {
        setNotice("⚠️ " + serverError(result));
      }
    };
    useEffect(() => {
      load();
    }, []);

    const update = (patch) => {
      setPreview(null);
      setForm((prev) => {
        const next = { ...prev, ...patch };
        if (patch.startDate && next.endDate < patch.startDate) next.endDate = patch.startDate;
        return next;
      });
    };
    const toggleTime = (t) => update({ times: form.times.includes(t) ? form.times.filter((x) => x !== t) : [...form.times, t] });

    const payload = () => ({ startDate: form.startDate, endDate: form.endDate, allDay: form.allDay, times: form.allDay ? [] : form.times, reason: form.reason.trim() });

    // Step 1: show which bookings are inside the closure before anything is saved.
    const handleCheck = async () => {
      setBusy(true);
      setNotice("");
      const result = await window.PawpadApi.call("closure_preview", payload());
      setBusy(false);
      if (!result.ok) return setNotice("⚠️ " + serverError(result));
      setPreview(result.data);
    };

    const handleSave = async () => {
      setBusy(true);
      const result = await window.PawpadApi.call("create_closure", payload());
      setBusy(false);
      if (!result.ok) return setNotice("⚠️ " + serverError(result));
      setClosures(result.data.closures || []);
      setPreview(null);
      setForm({ startDate: todayString(), endDate: todayString(), allDay: true, times: [], reason: "" });
      setNotice(result.data.calendarSynced
        ? "✓ Closure saved. Those slots are no longer bookable, and the closure is in the info@ calendar."
        : "⚠️ Closure saved and the slots are no longer bookable, but it could not be added to the info@ calendar.");
    };

    const handleRemove = (c) => {
      setConfirmModal({
        isOpen: true,
        title: "Remove this closure?",
        message: `${c.label}${c.reason ? ` (${c.reason})` : ""}. The slots open again for booking and the calendar event is removed.`,
        confirmText: "Yes, re-open the slots",
        cancelText: "No, keep it",
        confirmStyle: "btn-admin-danger",
        onConfirm: async () => {
          setConfirmModal({ isOpen: false });
          const result = await window.PawpadApi.call("delete_closure", { id: c.id });
          if (!result.ok) return setNotice("⚠️ " + serverError(result));
          setClosures(result.data.closures || []);
          setNotice(result.data.calendarRemoved === false
            ? "⚠️ Closure removed and the slots are open again, but its calendar event could not be deleted. Please delete it on the phone."
            : "✓ Closure removed. The slots are open for booking again.");
        }
      });
    };

    const label = { display: "block", fontSize: "12px", fontWeight: 600, color: "var(--admin-text-muted)", marginBottom: "4px" };
    const canCheck = form.startDate && form.endDate && (form.allDay || form.times.length > 0) && !busy;

    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "20px", maxWidth: "900px" } },
      React.createElement(ConfirmModal, { ...confirmModal, onCancel: () => setConfirmModal({ isOpen: false }) }),
      React.createElement(
        "div",
        { className: "card", style: { display: "flex", flexDirection: "column", gap: "14px" } },
        React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--admin-gold)" } }, "Close the studio"),
        React.createElement("p", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } },
          "Choose the dates, then \"All day\" or the times to close. Closed slots disappear from the booking page and the closure is added to the info@ calendar. Bookings already made are NOT cancelled — you will see them before saving."),
        React.createElement(
          "div",
          { style: { display: "flex", gap: "12px", flexWrap: "wrap" } },
          React.createElement("div", null, React.createElement("label", { style: label, htmlFor: "closure-start" }, "From"),
            React.createElement("input", { id: "closure-start", type: "date", className: "input-field", min: todayString(), value: form.startDate, onChange: (e) => e.target.value && update({ startDate: e.target.value }) })),
          React.createElement("div", null, React.createElement("label", { style: label, htmlFor: "closure-end" }, "To (including)"),
            React.createElement("input", { id: "closure-end", type: "date", className: "input-field", min: form.startDate, value: form.endDate, onChange: (e) => e.target.value && update({ endDate: e.target.value }) })),
          React.createElement("div", { style: { flex: 1, minWidth: "220px" } }, React.createElement("label", { style: label, htmlFor: "closure-reason" }, "Reason (optional)"),
            React.createElement("input", { id: "closure-reason", className: "input-field", placeholder: "e.g. Diwali holiday, staff training", value: form.reason, onChange: (e) => update({ reason: e.target.value }) }))
        ),
        React.createElement(
          "div",
          { style: { display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" } },
          React.createElement("label", { style: { display: "inline-flex", gap: "6px", alignItems: "center", fontWeight: 600, fontSize: "14px" } },
            React.createElement("input", { type: "checkbox", checked: form.allDay, onChange: (e) => update({ allDay: e.target.checked }) }), "All day"),
          !form.allDay && times.map((t) => React.createElement("label", { key: t, style: { display: "inline-flex", gap: "4px", alignItems: "center", fontSize: "13px", padding: "4px 8px", border: "1px solid var(--admin-border)", borderRadius: "6px" } },
            React.createElement("input", { type: "checkbox", checked: form.times.includes(t), onChange: () => toggleTime(t), "aria-label": `Close ${t}` }),
            formatSlotTime(t), t === "10:00" ? " (Sat/Sun)" : ""))
        ),
        React.createElement("div", null,
          React.createElement("button", { className: "btn-admin btn-admin-primary", disabled: !canCheck, style: { opacity: canCheck ? 1 : 0.5 }, onClick: handleCheck }, busy && !preview ? "Checking…" : "Check bookings & continue")),
        preview && React.createElement(
          "div",
          { "data-section": "closure-preview", style: { padding: "14px", borderRadius: "8px", border: "1px solid var(--admin-border)", background: "var(--admin-bg)", display: "flex", flexDirection: "column", gap: "8px" } },
          React.createElement("strong", null, `Closure: ${preview.label}`),
          preview.affected.length === 0
            ? React.createElement("p", { style: { fontSize: "13px", color: "var(--admin-success)" } }, "✓ No bookings are inside this closure.")
            : React.createElement(React.Fragment, null,
                React.createElement("p", { role: "alert", style: { fontSize: "13px", color: "var(--admin-danger)", fontWeight: 600 } },
                  `${preview.affected.length} booking${preview.affected.length > 1 ? "s are" : " is"} inside this closure. ${preview.affected.length > 1 ? "They" : "It"} will NOT be cancelled — please contact the customer${preview.affected.length > 1 ? "s" : ""}, or reschedule/cancel under Grooming Bookings.`),
                React.createElement("ul", { style: { fontSize: "13px", paddingLeft: "18px" } },
                  preview.affected.map((b) => React.createElement("li", { key: b.id }, `${b.label} · ${b.pet.name || "Pet"} · ${b.serviceTitle} · ${b.customer.name} · ${b.customer.phone} · Ref ${b.ref}`)))),
          React.createElement("div", { style: { display: "flex", gap: "10px" } },
            React.createElement("button", { className: "btn-admin btn-admin-danger", disabled: busy, onClick: handleSave }, busy ? "Saving…" : "Save closure"),
            React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: () => setPreview(null) }, "Change"))
        ),
        notice && React.createElement("p", { role: "status", style: { fontSize: "14px", fontWeight: 600, color: notice.startsWith("⚠️") ? "var(--admin-danger)" : "var(--admin-success)" } }, notice)
      ),
      React.createElement(
        "div",
        { className: "card", style: { display: "flex", flexDirection: "column", gap: "10px" } },
        React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--admin-gold)" } }, "Upcoming closures"),
        closures === null ? React.createElement("p", null, "Loading…")
          : closures.length === 0 ? React.createElement("p", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "No closures planned.")
          : closures.map((c) => React.createElement(
              "div",
              { key: c.id, "data-closure": c.id, style: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap", padding: "10px 14px", borderRadius: "8px", border: "1px solid var(--admin-border)", background: "var(--admin-bg)" } },
              React.createElement("div", { style: { flex: 1, minWidth: "220px", fontSize: "13px" } },
                React.createElement("div", { style: { fontWeight: 600, fontSize: "14px" } }, c.label),
                React.createElement("div", { style: { color: "var(--admin-text-muted)" } }, `${c.reason || "No reason given"} · added by ${c.createdBy}`)),
              React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: () => handleRemove(c) }, "Remove (re-open)")
            ))
      )
    );
  }

  // -------------------------------------------------------------
  // TODAY'S CLOSING (Owner, Administrator, Manager)
  // -------------------------------------------------------------
  const CLOSING_STATUS_OPTIONS = [["completed", "Completed"], ["no_show", "No-show"], ["cancelled", "Cancelled"]];
  const CLOSING_MODE_OPTIONS = [...PAYMENT_MODE_OPTIONS, ["not_paid", "Not paid"]];

  /** Grooming packages from the website content (for prices and the walk-in service list). */
  function groomingPackages() {
    const store = window.PawpadContentStore;
    const grooming = store && typeof store.get === "function" ? store.get("grooming") : null;
    return (grooming && Array.isArray(grooming.packages) ? grooming.packages : []).filter((p) => p && p.key);
  }

  function listPrice(serviceId) {
    const pkg = groomingPackages().find((p) => p.key === serviceId);
    return pkg && typeof pkg.priceNum === "number" ? pkg.priceNum : null;
  }

  function closingForm(b) {
    const c = b.closing || {};
    let amount = c.amount;
    if ((amount === null || amount === undefined) && !c.saved) amount = listPrice(b.serviceId);
    return { status: c.status || "", amount: amount === null || amount === undefined ? "" : String(amount), mode: c.mode || "", reference: c.reference || "", note: c.note || "" };
  }

  function ClosingTab({ currentUser }) {
    const [date, setDate] = useState(() => localDateString(new Date()));
    const [day, setDay] = useState(null);
    const [forms, setForms] = useState({});
    const [saveState, setSaveState] = useState({});
    const [notice, setNotice] = useState("");
    const [showWalkin, setShowWalkin] = useState(false);
    const [report, setReport] = useState(null);
    const timers = useRef({});

    const serverError = (result) => (result.data && result.data.error) || "The Pawpad server could not be reached.";

    const applyDay = (data) => {
      setDay(data);
      const next = {};
      (data.bookings || []).forEach((b) => { next[b.id] = closingForm(b); });
      setForms(next);
      setSaveState({});
    };

    const latestLoad = React.useRef(0); // ignore an older day's answer arriving late
    const load = async (target) => {
      const ticket = ++latestLoad.current;
      const result = await window.PawpadApi.call("closing_day", { date: target || date });
      if (ticket !== latestLoad.current) return;
      if (result.ok) applyDay(result.data);
      else setNotice("⚠️ " + serverError(result));
    };
    useEffect(() => {
      setDay(null);
      load(date);
    }, [date]);

    const save = async (id, values) => {
      setSaveState((prev) => ({ ...prev, [id]: "saving" }));
      const result = await window.PawpadApi.call("save_closing", { bookingId: id, ...values });
      setSaveState((prev) => ({ ...prev, [id]: result.ok ? "saved" : "⚠️ " + serverError(result) }));
    };

    // Autosave: choices save at once, typing saves after a short pause.
    const change = (id, patch, immediate) => {
      const values = { ...forms[id], ...patch };
      setForms((prev) => ({ ...prev, [id]: values }));
      clearTimeout(timers.current[id]);
      if (immediate) save(id, values);
      else timers.current[id] = setTimeout(() => save(id, values), 700);
    };

    const isFuture = day && day.isFuture;
    const rows = day ? day.bookings : [];
    const totals = useMemo(() => {
      const t = { completed: 0, no_show: 0, cancelled: 0, none: 0, collected: 0, perMode: { upi: 0, cash: 0, card: 0, bank_transfer: 0 }, notPaid: [] };
      rows.forEach((b) => {
        const f = forms[b.id] || closingForm(b);
        t[f.status || "none"] += 1;
        const amount = parseFloat(String(f.amount).replace(/,/g, "")) || 0;
        if (t.perMode[f.mode] !== undefined) {
          t.perMode[f.mode] += amount;
          t.collected += amount;
        }
        if (f.status === "completed" && t.perMode[f.mode] === undefined) t.notPaid.push(b);
      });
      return t;
    }, [rows, forms]);
    const courseTotal = day ? (day.coursePayments || []).reduce((sum, p) => sum + p.amount, 0) : 0;

    const openReport = async () => {
      setNotice("");
      const result = await window.PawpadApi.call("preview_report", { date });
      if (!result.ok) return setNotice("⚠️ " + serverError(result));
      setReport({ ...result.data, sending: false, error: "" });
    };

    const sendReport = async () => {
      setReport((r) => ({ ...r, sending: true, error: "" }));
      const result = await window.PawpadApi.call("send_report", { date, force: (report.missing || []).length > 0 });
      if (!result.ok) {
        setReport((r) => ({ ...r, sending: false, error: serverError(result), missing: (result.data && result.data.missing) || r.missing }));
        return;
      }
      setReport(null);
      setDay((d) => ({ ...d, reports: result.data.reports }));
      setNotice(`✓ ${result.data.report.corrected ? "Corrected report" : "Daily report"} emailed from info@pawpad.in to ${result.data.report.recipients.join(", ")}.`);
    };

    const cell = { padding: "8px", borderBottom: "1px solid var(--admin-border-subtle)", verticalAlign: "top" };
    const small = { fontSize: "13px", padding: "6px 8px" };

    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "20px" } },
      report && React.createElement(ReportPreviewModal, { report, onClose: () => setReport(null), onSend: sendReport }),
      React.createElement(
        "div",
        { className: "card", style: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" } },
        React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: () => setDate(shiftDate(date, -1)) }, "← Previous day"),
        React.createElement("input", { type: "date", className: "input-field", value: date, onChange: (e) => e.target.value && setDate(e.target.value), style: { width: "auto" }, "aria-label": "Closing date" }),
        React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: () => setDate(shiftDate(date, 1)) }, "Next day →"),
        React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: () => setDate(localDateString(new Date())) }, "Today"),
        React.createElement("div", { style: { flex: 1 } }),
        React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: () => setShowWalkin(!showWalkin) }, showWalkin ? "Close walk-in form" : "+ Add walk-in / phone booking"),
        !isFuture && React.createElement("button", { className: "btn-admin btn-admin-primary", onClick: openReport, disabled: !day }, "Send daily report")
      ),
      notice && React.createElement("div", { className: "card", role: "status", style: { fontWeight: 600, fontSize: "14px", color: notice.startsWith("⚠️") ? "var(--admin-danger)" : "var(--admin-success)" } }, notice),
      showWalkin && React.createElement(WalkinForm, {
        date,
        isFuture,
        onAdded: (data) => {
          applyDay(data);
          setShowWalkin(false);
          setNotice(`✓ Walk-in / phone booking ${data.added.ref} added. ${data.slotMessage}`);
        }
      }),
      !day ? React.createElement("div", { className: "card" }, "Loading…") : React.createElement(
        "div",
        { className: "card", style: { display: "flex", flexDirection: "column", gap: "12px" } },
        React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "20px" } }, day.label),
        (day.reports || []).length > 0 && React.createElement("p", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } },
          `Report already sent ${day.reports.length} time${day.reports.length > 1 ? "s" : ""} (last by ${day.reports[day.reports.length - 1].sentBy}, ${new Date(day.reports[day.reports.length - 1].sentAt).toLocaleString("en-IN")}). Sending again emails a "Corrected report".`),
        isFuture && React.createElement("p", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "This day is in the future: statuses and payments can be filled in on the day."),
        rows.length === 0
          ? React.createElement("p", { style: { color: "var(--admin-text-muted)" } }, "No grooming bookings on this day.")
          : React.createElement(
              "div",
              { style: { overflowX: "auto" } },
              React.createElement(
                "table",
                { style: { width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" } },
                React.createElement("thead", null, React.createElement("tr", { style: { color: "var(--admin-text-muted)" } },
                  ["Time", "Customer / pet / service", "Status", "Amount (₹)", "Payment mode", "Reference", "Note", ""].map((h) => React.createElement("th", { key: h, style: cell }, h)))),
                React.createElement("tbody", null, rows.map((b) => {
                  const f = forms[b.id] || closingForm(b);
                  const st = saveState[b.id];
                  return React.createElement(
                    "tr",
                    { key: b.id, "data-closing": b.ref, style: { background: !f.status && !isFuture ? "rgba(220, 80, 60, 0.06)" : "transparent" } },
                    React.createElement("td", { style: { ...cell, fontWeight: 600, whiteSpace: "nowrap" } }, formatSlotTime(b.time)),
                    React.createElement("td", { style: { ...cell, minWidth: "190px" } },
                      React.createElement("div", { style: { fontWeight: 600 } }, b.customer.name, b.source === "walkin" ? " · walk-in" : ""),
                      React.createElement("div", null, `${b.pet.name || "Pet"}${b.pet.type ? ` (${b.pet.type})` : ""} — ${b.serviceTitle}`),
                      React.createElement("div", { style: { fontSize: "11px", color: "var(--admin-text-faint)" } }, `Ref ${b.ref}${b.status === "cancelled" ? " · cancelled in the admin panel" : ""}`)),
                    React.createElement("td", { style: cell },
                      React.createElement("select", { className: "input-field", style: small, disabled: isFuture, "aria-label": `Status ${b.ref}`, value: f.status, onChange: (e) => change(b.id, { status: e.target.value }, true) },
                        React.createElement("option", { value: "" }, "— choose —"),
                        CLOSING_STATUS_OPTIONS.map(([v, l]) => React.createElement("option", { key: v, value: v }, l)))),
                    React.createElement("td", { style: cell },
                      React.createElement("input", { className: "input-field", style: { ...small, width: "90px" }, disabled: isFuture, inputMode: "decimal", "aria-label": `Amount ${b.ref}`, value: f.amount, onChange: (e) => change(b.id, { amount: e.target.value }) })),
                    React.createElement("td", { style: cell },
                      React.createElement("select", { className: "input-field", style: small, disabled: isFuture, "aria-label": `Payment mode ${b.ref}`, value: f.mode, onChange: (e) => change(b.id, { mode: e.target.value }, true) },
                        React.createElement("option", { value: "" }, "— choose —"),
                        CLOSING_MODE_OPTIONS.map(([v, l]) => React.createElement("option", { key: v, value: v }, l)))),
                    React.createElement("td", { style: cell },
                      React.createElement("input", { className: "input-field", style: { ...small, width: "110px" }, disabled: isFuture, "aria-label": `Reference ${b.ref}`, placeholder: "UTR / receipt", value: f.reference, onChange: (e) => change(b.id, { reference: e.target.value }) })),
                    React.createElement("td", { style: cell },
                      React.createElement("input", { className: "input-field", style: { ...small, width: "140px" }, disabled: isFuture, "aria-label": `Note ${b.ref}`, value: f.note, onChange: (e) => change(b.id, { note: e.target.value }) })),
                    React.createElement("td", { style: { ...cell, fontSize: "11px", whiteSpace: "nowrap", color: st && st.startsWith("⚠️") ? "var(--admin-danger)" : "var(--admin-text-faint)" }, "data-save-state": st || "" },
                      st === "saving" ? "Saving…" : st === "saved" ? "Saved ✓" : st || "")
                  );
                }))
              )
            ),
        rows.length > 0 && !isFuture && React.createElement(
          "div",
          { "data-section": "closing-totals", style: { display: "flex", gap: "18px", flexWrap: "wrap", fontSize: "13px", padding: "12px", borderRadius: "8px", background: "var(--admin-bg)", border: "1px solid var(--admin-border)" } },
          React.createElement("span", null, `Completed: ${totals.completed}`),
          React.createElement("span", null, `No-shows: ${totals.no_show}`),
          React.createElement("span", null, `Cancelled: ${totals.cancelled}`),
          totals.none > 0 && React.createElement("span", { style: { color: "var(--admin-danger)", fontWeight: 600 } }, `No status: ${totals.none}`),
          PAYMENT_MODE_OPTIONS.map(([v, l]) => React.createElement("span", { key: v }, `${l}: ${formatRupees(totals.perMode[v])}`)),
          React.createElement("strong", null, `Grooming collected: ${formatRupees(totals.collected)}`),
          totals.notPaid.length > 0 && React.createElement("span", { style: { color: "var(--admin-danger)" } }, `Not paid: ${totals.notPaid.map((b) => `${formatSlotTime(b.time)} ${b.customer.name}`).join(", ")}`)
        )
      ),
      day && React.createElement(
        "div",
        { className: "card", style: { display: "flex", flexDirection: "column", gap: "8px" } },
        React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "16px", color: "var(--admin-gold)" } }, `Course payments recorded on this day · ${formatRupees(courseTotal)}`),
        (day.coursePayments || []).length === 0
          ? React.createElement("p", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "None. (Course payments are recorded under Course Applications.)")
          : day.coursePayments.map((p) => React.createElement("p", { key: p.id, style: { fontSize: "13px" } },
              `${p.applicationId} · ${p.candidate || "(application deleted)"} · ${formatRupees(p.amount)} · ${p.modeLabel}${p.reference ? ` · Ref ${p.reference}` : ""} · by ${p.recordedBy}`))
      )
    );
  }

  function WalkinForm({ date, isFuture, onAdded }) {
    const packages = groomingPackages();
    const [f, setF] = useState({ time: "", customerName: "", phone: "", petName: "", petType: "Dog", serviceId: "", serviceTitle: "", amount: "", mode: "", status: isFuture ? "" : "completed", reference: "" });
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);
    const [slots, setSlots] = useState(null);
    const set = (patch) => setF((prev) => ({ ...prev, ...patch }));

    // The day's studio slots, so a free one can be picked with one tap.
    useEffect(() => {
      let live = true;
      setSlots(null);
      window.PawpadApi.call("list_bookings", { date }).then((r) => { if (live) setSlots(r.ok ? (r.data.slots || []) : []); });
      return () => { live = false; };
    }, [date]);
    const SLOT_STATE_LABEL = { free: "Free", booked: "Booked", blocked: "Blocked", closed: "Closed", calendar: "Busy in calendar", unknown: "Calendar not readable" };

    const pickService = (key) => {
      const pkg = packages.find((p) => p.key === key);
      set(pkg ? { serviceId: pkg.key, serviceTitle: pkg.title, amount: typeof pkg.priceNum === "number" ? String(pkg.priceNum) : f.amount } : { serviceId: "", serviceTitle: "" });
    };

    const submit = async (e) => {
      e.preventDefault();
      if (!f.time || !f.customerName.trim()) return setError("Please fill in at least the time and the customer's name.");
      setSaving(true);
      setError("");
      const result = await window.PawpadApi.call("add_walkin", { ...f, date });
      setSaving(false);
      if (!result.ok) return setError((result.data && result.data.error) || "The Pawpad server could not be reached.");
      onAdded(result.data);
    };

    const label = { display: "block", fontSize: "12px", fontWeight: 600, color: "var(--admin-text-muted)", marginBottom: "4px" };
    const field = (key, text, props) => React.createElement("div", { style: { minWidth: "140px", flex: 1 } },
      React.createElement("label", { style: label, htmlFor: "walkin-" + key }, text),
      React.createElement("input", { id: "walkin-" + key, className: "input-field", value: f[key], onChange: (e) => set({ [key]: e.target.value }), ...(props || {}) }));

    return React.createElement(
      "form",
      { className: "card", onSubmit: submit, "data-section": "walkin", style: { display: "flex", flexDirection: "column", gap: "12px" } },
      React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "17px", color: "var(--admin-gold)" } }, "Add a walk-in or phone booking"),
      React.createElement("p", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, "If the time is free, the slot is taken (so nobody can book it online) and an event is added to the info@ calendar."),
      slots && slots.length > 0 && React.createElement("div", { "data-section": "walkin-slots" },
        React.createElement("p", { style: { ...label, marginBottom: "6px" } }, "Studio slots on this day (tap a free one)"),
        React.createElement("div", { style: { display: "flex", gap: "6px", flexWrap: "wrap" } },
          slots.map((sl) => {
            const free = sl.state === "free";
            return React.createElement("button", {
              type: "button", key: sl.time, "data-walkin-slot": sl.time, disabled: !free,
              title: SLOT_STATE_LABEL[sl.state] || sl.state,
              className: "btn-admin " + (f.time === sl.time ? "btn-admin-primary" : "btn-admin-secondary"),
              style: { padding: "5px 10px", fontSize: "12px", opacity: free ? 1 : 0.55 },
              onClick: () => set({ time: sl.time })
            }, `${formatSlotTime(sl.time)} · ${SLOT_STATE_LABEL[sl.state] || sl.state}`);
          }))),
      slots && slots.length === 0 && React.createElement("p", { style: { fontSize: "12px", color: "var(--admin-text-muted)" } }, "The studio has no slots on this day (closed). The booking will only be recorded."),
      React.createElement("div", { style: { display: "flex", gap: "12px", flexWrap: "wrap" } },
        field("time", "Time *", { type: "time", required: true }),
        field("customerName", "Customer name *", { required: true }),
        field("phone", "Phone", { type: "tel" }),
        field("petName", "Pet name"),
        React.createElement("div", { style: { minWidth: "110px" } },
          React.createElement("label", { style: label, htmlFor: "walkin-petType" }, "Pet"),
          React.createElement("select", { id: "walkin-petType", className: "input-field", value: f.petType, onChange: (e) => set({ petType: e.target.value }) },
            React.createElement("option", { value: "Dog" }, "Dog"), React.createElement("option", { value: "Cat" }, "Cat")))),
      React.createElement("div", { style: { display: "flex", gap: "12px", flexWrap: "wrap" } },
        React.createElement("div", { style: { minWidth: "220px", flex: 2 } },
          React.createElement("label", { style: label, htmlFor: "walkin-service" }, "Service"),
          React.createElement("select", { id: "walkin-service", className: "input-field", value: f.serviceId, onChange: (e) => pickService(e.target.value) },
            React.createElement("option", { value: "" }, "Other (type below)"),
            packages.map((p) => React.createElement("option", { key: p.key, value: p.key }, `${p.title}${p.price ? ` · ${p.price}` : ""}`)))),
        !f.serviceId && field("serviceTitle", "Service (if other)"),
        field("amount", "Amount (₹)", { inputMode: "decimal" }),
        React.createElement("div", { style: { minWidth: "140px" } },
          React.createElement("label", { style: label, htmlFor: "walkin-mode" }, "Payment mode"),
          React.createElement("select", { id: "walkin-mode", className: "input-field", value: f.mode, onChange: (e) => set({ mode: e.target.value }) },
            React.createElement("option", { value: "" }, "— choose —"),
            CLOSING_MODE_OPTIONS.map(([v, l]) => React.createElement("option", { key: v, value: v }, l)))),
        !isFuture && React.createElement("div", { style: { minWidth: "140px" } },
          React.createElement("label", { style: label, htmlFor: "walkin-status" }, "Status"),
          React.createElement("select", { id: "walkin-status", className: "input-field", value: f.status, onChange: (e) => set({ status: e.target.value }) },
            React.createElement("option", { value: "" }, "— not yet —"),
            CLOSING_STATUS_OPTIONS.map(([v, l]) => React.createElement("option", { key: v, value: v }, l))))),
      error && React.createElement("p", { role: "alert", style: { color: "var(--admin-danger)", fontWeight: 600, fontSize: "13px" } }, error),
      React.createElement("div", null, React.createElement("button", { type: "submit", className: "btn-admin btn-admin-primary", disabled: saving }, saving ? "Adding…" : "Add booking"))
    );
  }

  function ReportPreviewModal({ report, onClose, onSend }) {
    const missing = report.missing || [];
    return React.createElement(
      "div",
      { className: "modal-overlay", onClick: onClose },
      React.createElement(
        "div",
        { className: "modal-card", role: "dialog", "aria-label": "Daily report preview", style: { maxWidth: "980px", width: "96vw", padding: "24px", maxHeight: "92vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "12px" }, onClick: (e) => e.stopPropagation() },
        React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "20px", color: "var(--admin-gold)" } }, report.corrected ? "Preview: Corrected report" : "Preview: daily report"),
        React.createElement("p", { style: { fontSize: "13px" } }, `From info@pawpad.in to: ${(report.recipients || []).join(", ")}`),
        React.createElement("p", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, `Subject: ${report.subject}`),
        missing.length > 0 && React.createElement(
          "div",
          { role: "alert", "data-section": "missing-status", style: { padding: "12px", borderRadius: "8px", border: "1px solid var(--admin-danger)", color: "var(--admin-danger)", fontSize: "13px" } },
          React.createElement("strong", null, `⚠️ ${missing.length} booking${missing.length > 1 ? "s have" : " has"} no status yet:`),
          React.createElement("ul", { style: { paddingLeft: "18px", marginTop: "6px" } },
            missing.map((m) => React.createElement("li", { key: m.id }, `${formatSlotTime(m.time)} · ${m.customer} · ${m.pet} · ${m.service} (Ref ${m.ref})`))),
          React.createElement("p", { style: { marginTop: "6px" } }, "Close this preview and set their status, or send the report anyway.")
        ),
        React.createElement("iframe", { title: "Report preview", srcDoc: report.html, sandbox: "", style: { width: "100%", height: "55vh", border: "1px solid var(--admin-border)", borderRadius: "8px", background: "#fff" } }),
        report.error && React.createElement("p", { role: "alert", style: { color: "var(--admin-danger)", fontWeight: 600, fontSize: "13px" } }, report.error),
        React.createElement("div", { style: { display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" } },
          React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: onClose }, "Back to closing"),
          React.createElement("button", { className: "btn-admin " + (missing.length ? "btn-admin-danger" : "btn-admin-primary"), disabled: report.sending, onClick: onSend },
            report.sending ? "Sending…" : missing.length ? "Send anyway" : report.corrected ? "Send corrected report" : "Send report"))
      )
    );
  }

  // -------------------------------------------------------------
  // DAILY REPORTS (Owner / Administrator): every report that was sent
  // -------------------------------------------------------------
  function DailyReportsTab() {
    const [reports, setReports] = useState(null);
    const [viewing, setViewing] = useState(null);
    const [notice, setNotice] = useState("");

    useEffect(() => {
      window.PawpadApi.call("list_daily_reports", {}).then((result) => {
        if (result.ok) setReports(result.data.reports || []);
        else setNotice("⚠️ " + ((result.data && result.data.error) || "The Pawpad server could not be reached."));
      });
    }, []);

    const view = async (r) => {
      const result = await window.PawpadApi.call("get_daily_report", { id: r.id });
      if (result.ok) setViewing(result.data.report);
      else setNotice("⚠️ " + ((result.data && result.data.error) || "The Pawpad server could not be reached."));
    };

    const cell = { padding: "10px", borderBottom: "1px solid var(--admin-border-subtle)", textAlign: "left" };
    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "16px" } },
      viewing && React.createElement(
        "div",
        { className: "modal-overlay", onClick: () => setViewing(null) },
        React.createElement(
          "div",
          { className: "modal-card", role: "dialog", "aria-label": "Daily report", style: { maxWidth: "980px", width: "96vw", padding: "24px", maxHeight: "92vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px" }, onClick: (e) => e.stopPropagation() },
          React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--admin-gold)" } }, viewing.subject),
          React.createElement("p", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } }, `Sent by ${viewing.sentBy} on ${new Date(viewing.sentAt).toLocaleString("en-IN")} to ${viewing.recipients.join(", ")}`),
          React.createElement("iframe", { title: "Report", srcDoc: viewing.html, sandbox: "", style: { width: "100%", height: "65vh", border: "1px solid var(--admin-border)", borderRadius: "8px", background: "#fff" } }),
          React.createElement("div", { style: { textAlign: "right" } }, React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: () => setViewing(null) }, "Close"))
        )
      ),
      notice && React.createElement("div", { className: "card", role: "status", style: { color: "var(--admin-danger)", fontWeight: 600 } }, notice),
      React.createElement(
        "div",
        { className: "card", style: { padding: 0, overflowX: "auto" } },
        reports === null ? React.createElement("p", { style: { padding: "20px" } }, "Loading…")
          : reports.length === 0 ? React.createElement("p", { style: { padding: "20px", color: "var(--admin-text-muted)" } }, "No daily reports have been sent yet.")
          : React.createElement("table", { style: { width: "100%", borderCollapse: "collapse", fontSize: "14px" } },
              React.createElement("thead", null, React.createElement("tr", { style: { color: "var(--admin-text-muted)" } },
                ["Day", "Version", "Sent", "Sent by", ""].map((h) => React.createElement("th", { key: h, style: cell }, h)))),
              React.createElement("tbody", null, reports.map((r) => React.createElement("tr", { key: r.id, "data-report": r.id },
                React.createElement("td", { style: { ...cell, fontWeight: 600 } }, new Date(r.date + "T00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })),
                React.createElement("td", { style: cell }, r.corrected ? React.createElement("span", { className: "badge badge-pending" }, `Corrected report (v${r.version})`) : "Original"),
                React.createElement("td", { style: cell }, new Date(r.sentAt).toLocaleString("en-IN")),
                React.createElement("td", { style: cell }, r.sentBy),
                React.createElement("td", { style: { ...cell, textAlign: "right" } }, React.createElement("button", { className: "btn-admin btn-admin-secondary", style: { fontSize: "12px", padding: "5px 10px" }, onClick: () => view(r) }, "View"))
              ))))
      )
    );
  }

  // -------------------------------------------------------------
  // BOARDING REQUESTS (from the website checkout; the team confirms them)
  // -------------------------------------------------------------
  function BoardingRequestsTab() {
    const [requests, setRequests] = useState(null);
    const [statuses, setStatuses] = useState({ new: "New", confirmed: "Confirmed", declined: "Declined", completed: "Completed", cancelled: "Cancelled" });
    const [filter, setFilter] = useState("open");
    const [drafts, setDrafts] = useState({});
    const [saving, setSaving] = useState(null);

    const [nightInfo, setNightInfo] = useState(null);
    const load = async () => {
      window.PawpadApi.call("boarding_availability", {}).then((r) => { if (r.ok) setNightInfo(r.data); });
      const result = await window.PawpadApi.call("list_boarding_requests", {});
      if (result.ok) {
        setRequests(result.data.requests || []);
        if (result.data.statuses) setStatuses(result.data.statuses);
      } else {
        showNotice("Could not load boarding requests: " + ((result.data && result.data.error) || "The Pawpad server could not be reached."));
        setRequests([]);
      }
    };
    useEffect(() => {
      load();
    }, []);

    const save = async (r) => {
      const d = drafts[r.id] || {};
      setSaving(r.id);
      const result = await window.PawpadApi.call("update_boarding_request", { id: r.id, status: d.status || r.status, note: d.note || "" });
      setSaving(null);
      if (!result.ok) return showNotice("Could not save: " + ((result.data && result.data.error) || "The Pawpad server could not be reached."));
      setRequests((prev) => prev.map((x) => (x.id === r.id ? result.data.request : x)));
      window.PawpadApi.call("boarding_availability", {}).then((x) => { if (x.ok) setNightInfo(x.data); });
      setDrafts((prev) => ({ ...prev, [r.id]: {} }));
      showNotice(`✓ ${r.ref} saved.`);
    };

    const shown = (requests || []).filter((r) => filter === "all" || (filter === "open" ? (r.status === "new" || r.status === "confirmed") : r.status === filter));
    const count = (st) => (requests || []).filter((r) => r.status === st).length;
    const fullNights = nightInfo ? (nightInfo.nights || []).filter((n) => n.left === 0) : [];

    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "16px" } },
      nightInfo && React.createElement("div", { className: "card", "data-section": "boarding-capacity", style: { fontSize: "13px" } },
        React.createElement("strong", null, `Up to ${nightInfo.dogsPerNight} dogs per night`), " (only Confirmed stays count). ",
        fullNights.length
          ? `Full nights: ${fullNights.slice(0, 8).map((n) => new Date(n.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })).join(", ")}${fullNights.length > 8 ? ` and ${fullNights.length - 8} more` : ""}. Customers can't request these nights, and a stay that would go over can't be confirmed.`
          : "No night is full yet. A stay that would put more dogs on a night can't be confirmed."),
      React.createElement(
        "div",
        { className: "card", style: { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" } },
        [["open", "Open (new + confirmed)"], ["new", `New (${count("new")})`], ["confirmed", "Confirmed"], ["completed", "Completed"], ["declined", "Declined"], ["cancelled", "Cancelled"], ["all", "All"]].map(([k, l]) =>
          React.createElement("button", { key: k, className: "btn-admin " + (filter === k ? "btn-admin-primary" : "btn-admin-secondary"), style: { fontSize: "12px", padding: "6px 12px" }, onClick: () => setFilter(k) }, l)),
        React.createElement("div", { style: { flex: 1 } }),
        React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: load }, "↻ Refresh")
      ),
      requests === null ? React.createElement("div", { className: "card" }, "Loading…")
        : shown.length === 0 ? React.createElement("div", { className: "card", style: { color: "var(--admin-text-muted)" } }, "No boarding requests here.")
        : shown.map((r) => {
            const d = drafts[r.id] || {};
            return React.createElement(
              "div",
              { key: r.id, className: "card", "data-boarding": r.ref, style: { display: "flex", flexDirection: "column", gap: "10px" } },
              React.createElement("div", { style: { display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "8px", alignItems: "center" } },
                React.createElement("strong", { style: { fontSize: "16px" } }, `${r.ref} · ${r.customer.name}`),
                React.createElement("span", { className: "badge " + (r.status === "new" ? "badge-pending" : r.status === "confirmed" || r.status === "completed" ? "badge-approved" : "badge-rejected") }, r.statusLabel)),
              React.createElement("div", { style: { fontSize: "13px", display: "flex", flexDirection: "column", gap: "3px" } },
                r.stayEnd
                  ? React.createElement("span", { "data-stay": r.ref }, "Stay: ", React.createElement("strong", null, `${r.stayDate} → ${r.stayEnd}`),
                      ` · ${r.nights} night${r.nights === 1 ? "" : "s"}`, r.dogs ? ` · ${r.dogs} dog${r.dogs === 1 ? "" : "s"}` : "",
                      r.stayTime && r.stayTime !== "Flexible" ? ` · drop-off ${r.stayTime}` : "", ` · sent ${new Date(r.createdAt).toLocaleString("en-IN")}`)
                  : React.createElement("span", null, "Requested: ", React.createElement("strong", null, r.stayDate || "—"), r.stayTime ? ` · ${r.stayTime}` : "", ` · sent ${new Date(r.createdAt).toLocaleString("en-IN")}`),
                React.createElement("span", null, React.createElement("a", { href: `tel:${r.customer.phone}` }, r.customer.phone), r.customer.email ? ` · ${r.customer.email}` : "", r.customer.contactMethod ? ` · prefers ${r.customer.contactMethod}` : ""),
                r.items.map((i, k) => React.createElement("span", { key: "i" + k }, i.nights > 0
                  ? `• ${i.title} — ${i.quantity} dog${i.quantity === 1 ? "" : "s"} × ${i.nights} night${i.nights === 1 ? "" : "s"}${i.price ? ` — ${i.price}` : ""}${i.lineTotal ? ` (${i.lineTotal})` : ""}`
                  : `• ${i.title}${i.quantity > 1 ? ` × ${i.quantity}` : ""}${i.price ? ` — ${i.price}` : ""}`)),
                r.pets.map((p, k) => React.createElement("span", { key: "p" + k, style: { color: "var(--admin-text-muted)" } },
                  `🐶 ${p.name || "Dog"}${p.breed ? ` (${p.breed})` : ""}${p.size ? ` · ${p.size}` : ""}${p.temperament ? ` · ${p.temperament}` : ""}${p.trialDone === "no" ? " · first stay — trial day needed" : p.trialDone === "yes" ? " · trial day done" : ""}${p.healthNotes ? ` · ${p.healthNotes}` : ""}`)),
                (r.total || r.trialFee) && React.createElement("span", null, r.trialFee ? `Trial day fee ${r.trialFee} · ` : "", r.total ? `Estimated total ${r.total}` : ""),
                r.notes && React.createElement("span", { style: { fontStyle: "italic" } }, `Notes: ${r.notes}`),
                r.emailStatus === "failed" && React.createElement("span", { style: { color: "var(--admin-danger)" } }, "⚠️ The confirmation email could not be sent."),
                (r.adminLog || []).map((e, k) => React.createElement("span", { key: "l" + k, style: { fontSize: "11px", color: "var(--admin-text-muted)" } }, logLine(e)))),
              React.createElement("div", { style: { display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" } },
                React.createElement("select", { className: "input-field", style: { width: "auto" }, "aria-label": `Status ${r.ref}`, value: d.status || r.status, onChange: (e) => setDrafts((prev) => ({ ...prev, [r.id]: { ...d, status: e.target.value } })) },
                  Object.entries(statuses).map(([k, l]) => React.createElement("option", { key: k, value: k }, l))),
                React.createElement("input", { className: "input-field", style: { flex: 1, minWidth: "200px" }, placeholder: "Add a note (e.g. confirmed on WhatsApp for 2–4 Oct)", "aria-label": `Note ${r.ref}`, value: d.note || "", onChange: (e) => setDrafts((prev) => ({ ...prev, [r.id]: { ...d, note: e.target.value } })) }),
                React.createElement("button", { className: "btn-admin btn-admin-primary", disabled: saving === r.id || (!d.note && (!d.status || d.status === r.status)), onClick: () => save(r) }, saving === r.id ? "Saving…" : "Save"))
            );
          })
    );
  }

  // -------------------------------------------------------------
  // SYSTEM SETTINGS & BACKUPS TAB
  // -------------------------------------------------------------
  function SettingsTab({ currentUser }) {
    const [admins, setAdmins] = useState([]);
    const [newEmail, setNewEmail] = useState("");
    const [newAdminPassword, setNewAdminPassword] = useState("");
    const [newRole, setNewRole] = useState("admin");
    const [userNotice, setUserNotice] = useState("");
    const [backupNotice, setBackupNotice] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [currentPassword, setCurrentPassword] = useState("");
    const [passwordNotice, setPasswordNotice] = useState("");
    const [confirmModal, setConfirmModal] = useState({ isOpen: false });
    const importInputRef = useRef(null);

    const userEmail = (currentUser?.email || "").trim().toLowerCase();
    const isPrimaryOwner = currentUser?.role === "owner";
    // A Manager only sees their own password here (the server refuses everything else too).
    const isManager = currentUser?.role === "manager";
    const serverError = (result) => (result.data && result.data.error) || "The Pawpad server could not be reached.";

    // The admin team lives on the Pawpad server.
    const loadAdmins = async () => {
      if (isManager) return;
      const result = await window.PawpadApi.call("list_admins", {});
      if (result.ok) setAdmins(result.data.admins || []);
    };

    useEffect(() => {
      loadAdmins();
    }, []);

    const userList = admins;

    const handleAddEmail = async (e) => {
      e.preventDefault();
      const clean = newEmail.trim().toLowerCase();
      if (!clean || !clean.includes("@")) return;
      setUserNotice(`Adding '${clean}'...`);
      const result = await window.PawpadApi.call("add_admin", { email: clean, password: newAdminPassword, role: newRole });
      if (!result.ok) {
        setUserNotice("⚠️ " + serverError(result));
        return;
      }
      setAdmins(result.data.admins || []);
      setNewEmail("");
      setNewAdminPassword("");
      setUserNotice(`✓ '${clean}' can now sign in as ${newRole === "manager" ? "a Manager" : "an Administrator"}. Give them the starting password in person, and ask them to change it under "My Account Password".`);
      setTimeout(() => setUserNotice(""), 8000);
    };

    const handleRemoveEmail = (emailToRemove) => {
      setConfirmModal({
        isOpen: true,
        title: "Remove Team Member",
        message: `Are you sure you want to remove ${emailToRemove} from the admin panel? They will be signed out straight away.`,
        confirmText: "Yes, Remove",
        cancelText: "No, Cancel",
        confirmStyle: "btn-admin-danger",
        onConfirm: async () => {
          setConfirmModal({ isOpen: false });
          const result = await window.PawpadApi.call("remove_admin", { email: emailToRemove });
          if (!result.ok) {
            setUserNotice("⚠️ " + serverError(result));
            return;
          }
          setAdmins(result.data.admins || []);
          setUserNotice(`✓ ${emailToRemove} removed.`);
          setTimeout(() => setUserNotice(""), 3500);
        }
      });
    };

    const handleUpdatePassword = async (e) => {
      e.preventDefault();
      setPasswordNotice("");
      if (newPassword.length < 10) {
        setPasswordNotice("⚠️ The new password must be at least 10 characters.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setPasswordNotice("⚠️ Passwords do not match.");
        return;
      }
      setPasswordNotice("Saving new password on the Pawpad server...");
      const result = await window.PawpadApi.call("change_password", { currentPassword, newPassword });
      if (result.ok) {
        setNewPassword("");
        setConfirmPassword("");
        setCurrentPassword("");
        setPasswordNotice(`✓ Password for ${userEmail} updated. Other devices have been signed out.`);
        setTimeout(() => setPasswordNotice(""), 5000);
      } else {
        setPasswordNotice("⚠️ " + serverError(result));
      }
    };

    const handleExportBackup = () => {
      if (window.PawpadContentStore) {
        const json = window.PawpadContentStore.exportJSON();
        const blob = new Blob([json], { type: "application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `pawpad-cms-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
      }
    };

    const handleImportBackup = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (evt) => {
        if (window.PawpadContentStore && window.PawpadContentStore.importJSON(evt.target.result)) {
          setBackupNotice("Publishing the restored backup…");
          const result = await window.PawpadContentStore.lastPublish;
          setBackupNotice(result.ok ? "✓ Backup restored and published." : "⚠️ Not published: " + result.error);
          setTimeout(() => setBackupNotice(""), result.ok ? 4000 : 9000);
        } else {
          showNotice("Invalid backup file. Please provide a valid JSON export.");
        }
      };
      reader.readAsText(file);
    };

    const handleFactoryReset = () => {
      setConfirmModal({
        isOpen: true,
        title: "⚠️ Factory Reset Entire Website",
        message: "Are you sure you want to reset ALL pages, images, packages, services, and pricing across the entire website back to original factory defaults? This action cannot be undone.",
        confirmText: "Yes, Reset Everything",
        cancelText: "No, Cancel",
        confirmStyle: "btn-admin-danger",
        onConfirm: async () => {
          setConfirmModal({ isOpen: false });
          if (window.PawpadContentStore) {
            window.PawpadContentStore.resetAll();
            const result = await window.PawpadContentStore.lastPublish;
            if (!result.ok) {
              showNotice("Not published: " + result.error);
              return;
            }
            showNotice("✓ Website content reset to factory defaults and published. Reloading…");
            setTimeout(() => window.location.reload(), 1500);
          }
        }
      });
    };

    return React.createElement(
      "div",
      { style: { display: "flex", flexDirection: "column", gap: "24px", maxWidth: "800px" } },

      // Confirmation Modal (Yes/No)
      React.createElement(ConfirmModal, {
        ...confirmModal,
        onCancel: () => setConfirmModal({ isOpen: false })
      }),

      // Authorized Administrator Team (Owner Protected)
      !isManager && React.createElement(
        "div",
        { className: "card" },
        React.createElement("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px", marginBottom: "8px" } },
          React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px" } },
            React.createElement(Icons.Shield, null),
            React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--admin-gold)" } }, "Authorized Administrator Team")
          ),
          isPrimaryOwner ? (
            React.createElement("span", { className: "badge badge-approved", style: { fontSize: "11px" } }, "You are Primary Owner")
          ) : (
            React.createElement("span", { className: "badge", style: { fontSize: "11px", background: "var(--admin-card-hover)" } }, "🔒 Managed by Primary Owner")
          )
        ),
        isPrimaryOwner ? React.createElement("p", { style: { color: "var(--admin-text-muted)", fontSize: "13px", marginBottom: "16px" } },
          "Manage who can sign in. Add a person with a starting password (at least 10 characters) and give it to them in person; they can change it after signing in. ",
          "An Administrator can do everything. A Manager only sees Upcoming Grooming, Grooming Bookings, Course Applications and Today's Closing: they can cancel and reschedule bookings, schedule interviews, record payments, enrol, and send the daily report, but cannot block times, delete, edit the website or see the team."
        ) : React.createElement("p", { style: { color: "var(--admin-text-muted)", fontSize: "13px", marginBottom: "16px" } },
          "View authorized administrator team members."
        ),

        // Team list
        React.createElement(
          "div",
          { style: { display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" } },
          userList.map((item) => {
            const isOwner = item.role === "owner";
            const isCurrent = item.email.toLowerCase() === userEmail;
            return React.createElement(
              "div",
              {
                key: item.email,
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "var(--admin-bg)",
                  padding: "10px 16px",
                  borderRadius: "8px",
                  border: "1px solid var(--admin-border)"
                }
              },
              React.createElement(
                "div",
                { style: { display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" } },
                React.createElement(Icons.User, null),
                React.createElement("span", { style: { fontSize: "14px", fontWeight: "600", color: "var(--admin-text)" } }, item.email),
                isOwner ? (
                  React.createElement("span", { className: "badge badge-approved", style: { fontSize: "11px" } }, "Primary Owner")
                ) : (
                  React.createElement("span", { className: "badge", style: { fontSize: "11px", background: "var(--admin-card-hover)" } }, item.roleLabel || "Administrator")
                ),
                isCurrent && React.createElement("span", { style: { fontSize: "11px", color: "var(--admin-gold)", fontWeight: "600" } }, "(You)"),
              ),
              isPrimaryOwner && !isOwner && React.createElement(
                "button",
                {
                  onClick: () => handleRemoveEmail(item.email),
                  className: "btn-admin btn-admin-danger",
                  style: { padding: "4px 10px", fontSize: "12px" }
                },
                "Remove"
              )
            );
          })
        ),

        // Add email form (Owner Only)
        isPrimaryOwner ? (
          React.createElement(
            "form",
            { onSubmit: handleAddEmail, style: { display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" } },
            React.createElement("input", {
              type: "email",
              className: "input-field",
              placeholder: "Add staff email (e.g. newstaff@pawpad.in)",
              value: newEmail,
              onChange: (e) => setNewEmail(e.target.value),
              style: { flex: 1 }
            }),
            React.createElement("input", {
              type: "password",
              className: "input-field",
              placeholder: "Starting password",
              autoComplete: "new-password",
              minLength: 10,
              required: true,
              value: newAdminPassword,
              onChange: (e) => setNewAdminPassword(e.target.value),
              style: { flex: 1 }
            }),
            React.createElement(
              "select",
              { className: "input-field", value: newRole, onChange: (e) => setNewRole(e.target.value), "aria-label": "Role", style: { width: "auto" } },
              React.createElement("option", { value: "admin" }, "Administrator (everything)"),
              React.createElement("option", { value: "manager" }, "Manager (bookings, applications, daily closing)")
            ),
            React.createElement("button", { type: "submit", className: "btn-admin btn-admin-primary" }, "Add Team Member")
          )
        ) : (
          React.createElement(
            "div",
            { style: { padding: "10px 14px", background: "var(--admin-bg)", borderRadius: "6px", border: "1px solid var(--admin-border)", fontSize: "12px", color: "var(--admin-text-muted)" } },
            "🔒 Only the owner can add or remove administrator accounts."
          )
        ),
        userNotice && React.createElement("div", { style: { color: userNotice.startsWith("✓") ? "var(--admin-success)" : "var(--admin-danger)", fontSize: "13px", fontWeight: "600", marginTop: "8px" } }, userNotice)
      ),

      // My Account Password (Personal Password Update)
      React.createElement(
        "div",
        { className: "card" },
        React.createElement("div", { style: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" } },
          React.createElement(Icons.Key, null),
          React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--admin-gold)" } }, "My Account Password (" + userEmail + ")")
        ),
        React.createElement("p", { style: { color: "var(--admin-text-muted)", fontSize: "13px", marginBottom: "16px" } },
          "Update your individual login password. This change only applies to your account without affecting other administrators."
        ),
        React.createElement(
          "form",
          { onSubmit: handleUpdatePassword, style: { display: "flex", flexDirection: "column", gap: "12px" } },
          React.createElement("div", null,
            React.createElement("label", { style: { display: "block", fontSize: "12px", fontWeight: "600", color: "var(--admin-text-muted)", marginBottom: "4px" } }, "Current Password"),
            React.createElement("input", {
              type: "password",
              className: "input-field",
              placeholder: "Enter your current password",
              autoComplete: "current-password",
              value: currentPassword,
              onChange: (e) => setCurrentPassword(e.target.value)
            })
          ),
          React.createElement(
            "div",
            { style: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" } },
            React.createElement("div", null,
              React.createElement("label", { style: { display: "block", fontSize: "12px", fontWeight: "600", color: "var(--admin-text-muted)", marginBottom: "4px" } }, "New Password"),
              React.createElement("input", {
                type: "password",
                className: "input-field",
                placeholder: "Enter new password",
                value: newPassword,
                onChange: (e) => setNewPassword(e.target.value)
              })
            ),
            React.createElement("div", null,
              React.createElement("label", { style: { display: "block", fontSize: "12px", fontWeight: "600", color: "var(--admin-text-muted)", marginBottom: "4px" } }, "Confirm Password"),
              React.createElement("input", {
                type: "password",
                className: "input-field",
                placeholder: "Confirm new password",
                value: confirmPassword,
                onChange: (e) => setConfirmPassword(e.target.value)
              })
            )
          ),
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: "12px", marginTop: "4px" } },
            React.createElement("button", { type: "submit", className: "btn-admin btn-admin-primary" }, "Update My Password"),
            passwordNotice && React.createElement("span", { style: { color: passwordNotice.startsWith("✓") ? "var(--admin-success)" : "var(--admin-danger)", fontSize: "13px", fontWeight: "600" } }, passwordNotice)
          )
        )
      ),

      // Backup & Restore
      !isManager && React.createElement(
        "div",
        { className: "card" },
        React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "18px", color: "var(--admin-gold)", marginBottom: "10px" } }, "Backup & JSON Migration"),
        React.createElement("p", { style: { color: "var(--admin-text-muted)", fontSize: "13px", marginBottom: "16px" } }, "Download a full copy of your customized website copy and image slots to migrate or restore at any time."),

        React.createElement(
          "div",
          { style: { display: "flex", gap: "10px", alignItems: "center" } },
          React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: handleExportBackup }, "Download JSON Backup"),
          React.createElement("button", { className: "btn-admin btn-admin-secondary", onClick: () => importInputRef.current && importInputRef.current.click() }, "Restore from JSON"),
          React.createElement("input", {
            type: "file",
            ref: importInputRef,
            style: { display: "none" },
            accept: ".json",
            onChange: handleImportBackup
          }),
          backupNotice && React.createElement("span", { style: { color: "var(--admin-success)", fontSize: "13px", fontWeight: "600" } }, backupNotice)
        )
      ),

      // Factory Reset
      !isManager && React.createElement(
        "div",
        { className: "card card-danger" },
        React.createElement("h3", { style: { fontFamily: "var(--font-display)", fontSize: "18px", marginBottom: "10px" } }, "Factory Reset Site Content"),
        React.createElement("p", { style: { fontSize: "13px", marginBottom: "16px" } }, "Clears all overrides from localStorage and reverts the website back to its default clean code templates."),
        React.createElement("button", { className: "btn-admin btn-admin-danger", onClick: handleFactoryReset }, "Revert All Pages to Factory Defaults")
      )
    );
  }

  // -------------------------------------------------------------
  // MAIN ADMIN APP ROOT COMPONENT
  // -------------------------------------------------------------
  function AdminApp() {
    const [theme, setTheme] = useState(() => localStorage.getItem("pawpad_admin_theme") || "light");
    const [isAuthenticated, setIsAuthenticated] = useState(
      localStorage.getItem(AUTH_STORAGE_KEY) === "authenticated" && Boolean(window.PawpadApi && window.PawpadApi.hasSession())
    );
    // "loading" until the published website content has arrived from the server, then "ready" or "failed".
    const [contentStatus, setContentStatus] = useState("loading");
    const [legacyPrompt, setLegacyPrompt] = useState({ isOpen: false });
    const [currentUser, setCurrentUser] = useState(() => {
      try {
        const stored = localStorage.getItem(AUTH_USER_STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && parsed.email) return parsed;
        }
      } catch (e) { }
      return { email: "", name: "Admin", picture: null, role: "admin" };
    });

    const [activeTab, setActiveTab] = useState("dashboard");
    const [applications, setApplications] = useState([]);
    const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0, enrolled: 0 });

    useEffect(() => {
      document.body.setAttribute("data-theme", theme);
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("pawpad_admin_theme", theme);
    }, [theme]);

    const toggleTheme = () => {
      setTheme((prev) => (prev === "dark" ? "light" : "dark"));
    };

    const refreshData = () => {
      if (window.PawpadApplicationsStore) {
        setApplications(window.PawpadApplicationsStore.getAll());
        setStats(window.PawpadApplicationsStore.getStats());
      }
    };

    useEffect(() => {
      refreshData();
      window.addEventListener("pawpad-applications-updated", refreshData);
      return () => window.removeEventListener("pawpad-applications-updated", refreshData);
    }, []);

    // Server session expired: sign in again.
    useEffect(() => {
      const onUnauthorized = () => {
        if (localStorage.getItem(AUTH_STORAGE_KEY)) {
          handleLogout();
          showNotice("Please sign in again.");
        }
      };
      window.addEventListener("pawpad-api-unauthorized", onUnauthorized);
      // Always use the role the server knows (it may have changed since the last sign-in).
      if (isAuthenticated && window.PawpadApi) {
        window.PawpadApi.call("me", {}).then((result) => {
          if (result.ok && result.data.user) {
            setCurrentUser((prev) => {
              const next = { ...(prev || {}), ...result.data.user };
              try { localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(next)); } catch (e) { }
              return next;
            });
          }
        });
      }
      return () => window.removeEventListener("pawpad-api-unauthorized", onUnauthorized);
    }, [isAuthenticated]);

    // Editing must start from what is really published, or a save could overwrite newer content.
    const loadContent = () => {
      const store = window.PawpadContentStore;
      if (!store) {
        setContentStatus("ready");
        return;
      }
      setContentStatus("loading");
      // Use the copy loaded with the page; if that failed, ask the server again.
      Promise.resolve(store.ready).then((ok) => (ok ? true : store.refreshFromServer())).then((ok) => {
        setContentStatus(ok ? "ready" : "failed");
        const role = (currentUser && currentUser.role) || "";
        const legacy = ok && store.serverVersion === "" && role !== "manager" ? store.getLegacyLocalContent() : null;
        if (legacy) {
          setLegacyPrompt({
            isOpen: true,
            title: "Publish your earlier changes?",
            message: "This browser still has website changes that were saved here before the Pawpad server existed. Visitors have never seen them. Publish them to the live website now? (Choose \"No\" to start from the standard content instead.)",
            confirmText: "Yes, publish them",
            cancelText: "No, discard them",
            confirmStyle: "btn-admin-primary",
            onConfirm: async () => {
              setLegacyPrompt({ isOpen: false });
              const result = await store.publishAllFrom(legacy);
              if (result.ok) {
                store.discardLegacyLocalContent();
                showNotice("Your earlier changes are now live.");
              } else {
                showNotice("Could not publish: " + result.error);
              }
            }
          });
        }
      });
    };

    useEffect(() => {
      if (isAuthenticated) loadContent();
    }, [isAuthenticated]);

    const handleLogout = () => {
      if (window.PawpadApi) window.PawpadApi.logout();
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(AUTH_USER_STORAGE_KEY);
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      setIsAuthenticated(false);
      setCurrentUser(null);
    };

    if (!isAuthenticated) {
      return React.createElement(AuthGate, {
        onAuthenticated: (userData) => {
          setCurrentUser(userData);
          setIsAuthenticated(true);
        }
      });
    }

    if (contentStatus !== "ready") {
      return React.createElement(
        "div",
        { style: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px", background: "var(--admin-bg)" } },
        React.createElement(
          "div",
          { className: "card", style: { maxWidth: "440px", textAlign: "center", display: "flex", flexDirection: "column", gap: "14px" } },
          contentStatus === "loading"
            ? React.createElement("p", null, "Loading the published website content…")
            : React.createElement(React.Fragment, null,
                React.createElement("h3", { style: { color: "var(--admin-danger)" } }, "Couldn't load the website content"),
                React.createElement("p", { style: { fontSize: "14px", color: "var(--admin-text-muted)" } },
                  "The Pawpad server (api.pawpad.in) didn't answer. Editing is paused so nothing older overwrites the live website."),
                React.createElement("button", { className: "btn-admin btn-admin-primary", onClick: loadContent }, "Try again"),
                React.createElement("button", { className: "btn-admin", onClick: handleLogout }, "Sign out")
              )
        )
      );
    }

    // What each role sees. The server enforces the same rules, so hiding is only for tidiness.
    const role = (currentUser && currentUser.role) || "admin";
    const canAdmin = role === "owner" || role === "admin";
    const roleLabel = (currentUser && currentUser.roleLabel) || (role === "owner" ? "Owner" : role === "manager" ? "Manager" : "Administrator");
    const applicationsBadge = applications.filter((a) => a.status === (canAdmin ? "interview_scheduled" : "approved")).length;
    const navigationItems = [
      canAdmin && { id: "dashboard", label: "Dashboard", icon: Icons.Dashboard },
      { id: "upcoming", label: "Upcoming Grooming", icon: Icons.Dashboard },
      { id: "bookings", label: "Grooming Bookings", icon: Icons.Dashboard },
      { id: "closing", label: "Today's Closing", icon: Icons.Dashboard },
      { id: "boarding", label: "Boarding Requests", icon: Icons.Dashboard },
      canAdmin && { id: "reports", label: "Daily Reports", icon: Icons.Dashboard },
      canAdmin && { id: "closures", label: "Studio Closures", icon: Icons.Dashboard },
      // Badge: what is waiting for this person — Admins decide after interviews; Managers take payments after approval.
      { id: "applications", label: "Course Applications", icon: Icons.Applications, badge: applicationsBadge || null,
        badgeTitle: canAdmin ? "Pending Admin Approval" : "Approved – awaiting payment" },
      canAdmin && { id: "content", label: "Website Content CMS", icon: Icons.Content },
      canAdmin && { id: "media", label: "WebP Media Manager", icon: Icons.Media },
      { id: "settings", label: canAdmin ? "Settings & Backups" : "My Account", icon: Icons.Settings }
    ].filter(Boolean);
    // A Manager starts on Upcoming Grooming and can never open a hidden tab.
    const shownTab = navigationItems.some((item) => item.id === activeTab) ? activeTab : "upcoming";

    return React.createElement(
      "div",
      { className: "admin-app" },

      React.createElement(ConfirmModal, {
        ...legacyPrompt,
        onCancel: () => {
          setLegacyPrompt({ isOpen: false });
          if (window.PawpadContentStore) window.PawpadContentStore.discardLegacyLocalContent();
        }
      }),

      // Sidebar
      React.createElement(
        "aside",
        { className: "admin-sidebar" },

        // Brand Title & User Profile
        React.createElement(
          "div",
          { style: { padding: "20px", borderBottom: "1px solid var(--admin-border)", display: "flex", flexDirection: "column", gap: "14px" } },
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: "10px" } },
            React.createElement(Icons.Paw, null),
            React.createElement(
              "div",
              null,
              React.createElement("div", { style: { fontFamily: "var(--font-display)", fontSize: "18px", fontWeight: "600", color: "var(--admin-text)" } }, "Pawpad Admin"),
              React.createElement("div", { style: { fontSize: "11px", color: "var(--admin-text-faint)" } }, "Management Suite v2.0")
            )
          ),

          // User info capsule
          React.createElement(
            "div",
            {
              className: "admin-user-capsule",
              style: {
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "8px 12px",
                borderRadius: "8px"
              }
            },
            currentUser?.picture ? (
              React.createElement("img", {
                src: currentUser.picture,
                alt: currentUser.name || "Admin",
                style: { width: "28px", height: "28px", borderRadius: "50%", border: "1px solid var(--admin-gold)" }
              })
            ) : (
              React.createElement(
                "div",
                { style: { width: "28px", height: "28px", borderRadius: "50%", background: "var(--admin-card-hover)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--admin-gold)" } },
                React.createElement(Icons.User, null)
              )
            ),
            React.createElement(
              "div",
              { style: { overflow: "hidden" } },
              React.createElement("div", { style: { fontSize: "13px", fontWeight: "600", color: "var(--admin-text)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" } }, currentUser?.name || roleLabel),
              React.createElement("div", { style: { fontSize: "11px", color: "var(--admin-gold)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" } }, currentUser?.email || "")
            )
          )
        ),

        // Navigation Links
        React.createElement(
          "nav",
          { style: { padding: "16px 12px", flex: 1, display: "flex", flexDirection: "column", gap: "4px" } },
          navigationItems.map((item) =>
            React.createElement(
              "button",
              {
                key: item.id,
                onClick: () => setActiveTab(item.id),
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: "999px",
                  background: shownTab === item.id ? "var(--admin-champagne)" : "transparent",
                  color: shownTab === item.id ? "var(--admin-text)" : "var(--admin-text-muted)",
                  border: shownTab === item.id ? "1px solid var(--admin-border)" : "1px solid transparent",
                  fontSize: "14px",
                  fontWeight: shownTab === item.id ? "600" : "500",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.15s ease"
                }
              },
              React.createElement(
                "div",
                { style: { display: "flex", alignItems: "center", gap: "12px" } },
                React.createElement(item.icon, null),
                item.label
              ),
              item.badge &&
              React.createElement(
                "span",
                { className: "badge badge-pending", title: item.badgeTitle || "", "aria-label": item.badgeTitle ? `${item.badge} ${item.badgeTitle}` : undefined, "data-badge": item.id, style: { fontSize: "11px", padding: "2px 8px" } },
                item.badge
              )
            )
          )
        ),

        // Footer Actions
        React.createElement(
          "div",
          { style: { padding: "16px 20px", borderTop: "1px solid var(--admin-border)", display: "flex", flexDirection: "column", gap: "10px" } },
          React.createElement(
            "a",
            { href: "index.html", target: "_blank", className: "btn-admin btn-admin-secondary", style: { fontSize: "13px", width: "100%" } },
            "Open Live Website ",
            React.createElement(Icons.External, null)
          ),
          React.createElement(
            "button",
            { onClick: handleLogout, className: "btn-admin btn-admin-danger", style: { fontSize: "13px", width: "100%" } },
            "Sign Out"
          )
        )
      ),

      // Main Content Area
      React.createElement(
        "main",
        { className: "admin-main" },

        // Header
        React.createElement(
          "header",
          { className: "admin-header" },
          React.createElement(
            "div",
            null,
            React.createElement("h1", { style: { fontFamily: "var(--font-display)", fontSize: "22px", color: "var(--admin-text)" } },
              shownTab === "dashboard" && "Overview & Admissions Dashboard",
              shownTab === "upcoming" && "Upcoming Grooming Sessions",
              shownTab === "bookings" && "Grooming Bookings",
              shownTab === "applications" && "Course Applications & Admissions",
              shownTab === "content" && "Omnichannel Content Management",
              shownTab === "media" && "Media Manager & WebP Optimization",
              shownTab === "closing" && "Today's Closing",
              shownTab === "boarding" && "Boarding Requests",
              shownTab === "reports" && "Daily Reports",
              shownTab === "closures" && "Studio Closures",
              shownTab === "settings" && (canAdmin ? "System Settings & Backups" : "My Account")
            ),
            React.createElement("p", { style: { fontSize: "13px", color: "var(--admin-text-muted)" } },
              shownTab === "dashboard" && "Key metrics and real-time site activity",
              shownTab === "upcoming" && "Every booked grooming session from today onwards, soonest first",
              shownTab === "bookings" && "Bookings by day, cancellations and blocked times (synced with the info@ calendar)",
              shownTab === "applications" && "Review candidate responses and manage course approval lifecycle",
              shownTab === "content" && "Live updates to text, headlines, pricing, and packages",
              shownTab === "media" && "Automated compression to WebP and live asset slot replacement",
              shownTab === "closing" && "Status and payment of every booking of the day, walk-ins, and the daily report email",
              shownTab === "boarding" && "Boarding stays requested at the website checkout — confirm, decline or complete them here",
              shownTab === "reports" && "Every daily report that was emailed, with corrections",
              shownTab === "closures" && "Close the studio for dates or times; the slots disappear from the booking page",
              shownTab === "settings" && (canAdmin ? "Manage administrator accounts, password settings, and export data backups" : "Change your password")
            )
          ),
          React.createElement(
            "div",
            { style: { display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" } },
            React.createElement("span", { className: "badge " + (canAdmin ? "badge-approved" : "badge-interview"), "data-role": role, title: currentUser?.email || "", style: { fontSize: "12px", padding: "6px 12px" } },
              `Signed in as ${roleLabel}`),
            React.createElement(
              "button",
              {
                type: "button",
                onClick: toggleTheme,
                className: "btn-admin btn-admin-secondary",
                style: {
                  padding: "8px 16px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "13px",
                  fontWeight: "600",
                  borderRadius: "999px",
                  cursor: "pointer"
                },
                title: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"
              },
              theme === "dark" ? React.createElement(Icons.Sun, null) : React.createElement(Icons.Moon, null),
              theme === "dark" ? "Light Mode" : "Dark Mode"
            )
          )
        ),

        // Subpage Tab View Content
        React.createElement(
          "div",
          { className: "admin-content" },
          shownTab === "dashboard" && React.createElement(DashboardTab, { stats, setActiveTab, applications }),
          shownTab === "upcoming" && React.createElement(UpcomingGroomingTab, null),
          shownTab === "bookings" && React.createElement(BookingsTab, { canAdmin }),
          shownTab === "closing" && React.createElement(ClosingTab, { currentUser }),
          shownTab === "boarding" && React.createElement(BoardingRequestsTab, null),
          shownTab === "reports" && React.createElement(DailyReportsTab, null),
          shownTab === "closures" && React.createElement(ClosuresTab, null),
          shownTab === "applications" && React.createElement(ApplicationsTab, { applications, onUpdate: refreshData, canAdmin }),
          shownTab === "content" && React.createElement(ContentEditorTab, null),
          shownTab === "media" && React.createElement(MediaManagerTab, null),
          shownTab === "settings" && React.createElement(SettingsTab, { currentUser })
        )
      )
    );
  }

  // Mount Admin Panel
  const rootEl = document.getElementById("admin-root");
  if (rootEl) {
    ReactDOM.render(React.createElement(AdminApp, null), rootEl);
    const noticeEl = document.createElement("div");
    document.body.appendChild(noticeEl);
    ReactDOM.render(React.createElement(NoticeArea, null), noticeEl);
  }

})();
