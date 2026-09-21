import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";

/**
 * Route guard — renders child routes via <Outlet />.
 * Use as a LAYOUT route wrapper:
 *
 *   <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
 *     <Route path="/admin" element={<AdminLayout />}>
 *       ...
 *     </Route>
 *   </Route>
 */
export default function ProtectedRoute({ allowedRoles = [] }) {
  const location = useLocation();
  const [status, setStatus] = useState("checking");
  const [role, setRole] = useState(null);
  const [debugInfo, setDebugInfo] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setDebugInfo("No Firebase user");
        setStatus("unauthenticated");
        return;
      }

      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          setDebugInfo(`No /users doc for uid ${user.uid}`);
          setStatus("no-profile");
          return;
        }

        const data = snap.data();
        const r = data.role || "";
        setRole(r);
        setDebugInfo(`role="${r}" (uid ${user.uid})`);
        setStatus("ok");
      } catch (err) {
        console.error("ProtectedRoute: failed to load profile:", err);
        setDebugInfo(`Error: ${err.message}`);
        setStatus("error");
      }
    });

    return () => unsub();
  }, []);

  // ── 1. Still checking auth + role ──
  if (status === "checking") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8F7F5",
          flexDirection: "column",
          gap: 14,
          fontFamily: "'Lexend', sans-serif",
          color: "#6b7280",
        }}
      >
        <i
          className="fa-solid fa-circle-notch fa-spin"
          style={{ fontSize: 32, color: "#f57c00" }}
        />
        <p style={{ margin: 0, fontWeight: 600 }}>Verifying access…</p>
      </div>
    );
  }

  // ── 2. Not logged in → send to login ──
  if (status === "unauthenticated") {
    return (
      <Navigate to="/login" replace state={{ from: location.pathname }} />
    );
  }

  // ── 3. Logged in but no profile / error ──
  if (status === "no-profile" || status === "error") {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8F7F5",
          padding: 24,
          flexDirection: "column",
          gap: 14,
          fontFamily: "'Lexend', sans-serif",
          textAlign: "center",
        }}
      >
        <i
          className="fa-solid fa-triangle-exclamation"
          style={{ fontSize: 42, color: "#dc2626" }}
        />
        <h2
          style={{
            margin: 0,
            color: "#16213e",
            fontWeight: 800,
            fontSize: 20,
          }}
        >
          Account Not Configured
        </h2>
        <p
          style={{
            margin: 0,
            color: "#6b7280",
            fontSize: 14,
            maxWidth: 400,
            lineHeight: 1.5,
          }}
        >
          Your account does not have a profile set up. Please contact the
          administrator.
        </p>
        <button
          onClick={() => auth.signOut().then(() => window.location.replace("/login"))}
          style={{
            marginTop: 8,
            background: "#f57c00",
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  // ── 4. Role check ──
  const normalized = String(role || "").trim().toLowerCase();
  const allowed = allowedRoles.map((r) => String(r).toLowerCase());

  if (allowed.length > 0 && !allowed.includes(normalized)) {
    console.warn(
      `ProtectedRoute: role "${role}" not allowed. Needed one of:`,
      allowedRoles
    );

    // Show access-denied page (NOT redirect — avoids infinite loop)
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#F8F7F5",
          padding: 24,
          flexDirection: "column",
          gap: 14,
          fontFamily: "'Lexend', sans-serif",
          textAlign: "center",
        }}
      >
        <i
          className="fa-solid fa-lock"
          style={{ fontSize: 42, color: "#dc2626" }}
        />
        <h2
          style={{
            margin: 0,
            color: "#16213e",
            fontWeight: 800,
            fontSize: 20,
          }}
        >
          Access Denied
        </h2>
        <p
          style={{
            margin: 0,
            color: "#6b7280",
            fontSize: 14,
            maxWidth: 400,
            lineHeight: 1.5,
          }}
        >
          Your role <strong>“{role}”</strong> does not have permission to view
          this page.
        </p>
        <p
          style={{
            margin: 0,
            color: "#9ca3af",
            fontSize: 12,
            maxWidth: 400,
            lineHeight: 1.5,
          }}
        >
          {debugInfo}
        </p>
        <button
          onClick={() => auth.signOut().then(() => window.location.replace("/login"))}
          style={{
            marginTop: 8,
            background: "#f57c00",
            color: "#fff",
            border: "none",
            padding: "10px 20px",
            borderRadius: 10,
            fontWeight: 700,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          Sign Out
        </button>
      </div>
    );
  }

  // ── 5. All good → render child routes ──
  // ✅ THIS is the fix: use <Outlet />, NOT `children`
  return <Outlet />;
}