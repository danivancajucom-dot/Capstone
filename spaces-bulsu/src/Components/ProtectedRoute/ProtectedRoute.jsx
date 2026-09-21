import { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../../firebase";

/**
 * Wraps protected routes. Blocks access unless:
 *  - user is logged in (Firebase Auth)
 *  - user's Firestore role matches one of `allowedRoles`
 *
 * Usage:
 *   <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
 *     <Route path="/admin" element={<AdminLayout />}>...</Route>
 *   </Route>
 */
export default function ProtectedRoute({ allowedRoles = [], children }) {
  const location = useLocation();
  const [status, setStatus] = useState("checking");
  const [role, setRole] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("unauthenticated");
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!snap.exists()) {
          setStatus("no-profile");
          return;
        }
        const data = snap.data();
        setRole(data.role || "");
        setStatus("ok");
      } catch (err) {
        console.error("ProtectedRoute: failed to load profile:", err);
        setStatus("error");
      }
    });
    return () => unsub();
  }, []);

  // ── Loading state (avoid flash of wrong content) ──
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

  // ── Not logged in → send to login ──
  if (status === "unauthenticated") {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // ── Logged in but no Firestore profile ──
  if (status === "no-profile" || status === "error") {
    return <Navigate to="/login" replace />;
  }

  // ── Role check ──
  const normalized = String(role || "").trim().toLowerCase();
  const allowed = allowedRoles.map((r) => String(r).toLowerCase());

  if (allowed.length > 0 && !allowed.includes(normalized)) {
    console.warn(
      `ProtectedRoute: role "${role}" is not allowed. Needed one of:`,
      allowedRoles
    );
    return <Navigate to="/login" replace />;
  }

  // ── All good → render the layout ──
  return children;
}