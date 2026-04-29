import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Ear, Sparkles, User, Settings2, LogIn, PenLine } from "lucide-react";
import { useAuth } from "../lib/auth";

const tab = ({ isActive }) =>
  `flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition-colors ${
    isActive ? "text-[var(--terracotta)]" : "text-[var(--text-secondary)]"
  }`;

// Routes where the bottom nav should be hidden (full-bleed flows + landing).
const HIDDEN_PATHS = ["/login", "/register", "/onboarding"];
const HIDDEN_EXACT = new Set(["/"]);

export default function BottomNav() {
  const { user } = useAuth();
  const location = useLocation();
  if (HIDDEN_EXACT.has(location.pathname)) return null;
  if (HIDDEN_PATHS.some((p) => location.pathname.startsWith(p))) return null;

  const isAuthed = !!user && user !== false;
  const isAdmin = isAuthed && user.role === "admin";
  const isContributor = isAuthed && (user.role === "contributor" || user.role === "admin");

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-[700] glass-bar"
      data-testid="bottom-nav"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="max-w-xl mx-auto flex items-center justify-around px-2 py-2">
        <NavLink to="/listen" end className={tab} data-testid="nav-listen">
          <Ear size={20} strokeWidth={1.5} />
          <span className="text-[10px] tracking-widest uppercase">Listen</span>
        </NavLink>
        <NavLink to="/discoveries" className={tab} data-testid="nav-discoveries">
          <Sparkles size={20} strokeWidth={1.5} />
          <span className="text-[10px] tracking-widest uppercase">Whispers</span>
        </NavLink>
        {isContributor && (
          <NavLink to="/contribute" className={tab} data-testid="nav-contribute">
            <PenLine size={20} strokeWidth={1.5} />
            <span className="text-[10px] tracking-widest uppercase">Contribute</span>
          </NavLink>
        )}
        {isAuthed ? (
          <NavLink to="/profile" className={tab} data-testid="nav-profile">
            <User size={20} strokeWidth={1.5} />
            <span className="text-[10px] tracking-widest uppercase">Profile</span>
          </NavLink>
        ) : (
          <NavLink to="/login" className={tab} data-testid="nav-login">
            <LogIn size={20} strokeWidth={1.5} />
            <span className="text-[10px] tracking-widest uppercase">Sign in</span>
          </NavLink>
        )}
        {isAdmin && (
          <NavLink to="/admin" className={tab} data-testid="nav-admin">
            <Settings2 size={20} strokeWidth={1.5} />
            <span className="text-[10px] tracking-widest uppercase">Admin</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}
