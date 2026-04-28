import React from "react";
import { NavLink } from "react-router-dom";
import { Map, Heart, History, Settings2, LogIn, LogOut, User } from "lucide-react";
import { useAuth } from "../lib/auth";

const tab = ({ isActive }) =>
  `flex flex-col items-center justify-center gap-0.5 px-3 py-1 transition-colors ${
    isActive ? "text-[var(--terracotta)]" : "text-[var(--text-secondary)]"
  }`;

export default function BottomNav() {
  const { user, logout } = useAuth();
  const isAuthed = !!user && user !== false;
  const isAdmin = isAuthed && user.role === "admin";

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-[700] glass-bar"
      data-testid="bottom-nav"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px))" }}
    >
      <div className="max-w-xl mx-auto flex items-center justify-around px-2 py-2">
        <NavLink to="/" end className={tab} data-testid="nav-map">
          <Map size={20} strokeWidth={1.5} />
          <span className="text-[10px] tracking-widest uppercase">Map</span>
        </NavLink>
        <NavLink to="/favorites" className={tab} data-testid="nav-favorites">
          <Heart size={20} strokeWidth={1.5} />
          <span className="text-[10px] tracking-widest uppercase">Saved</span>
        </NavLink>
        <NavLink to="/visits" className={tab} data-testid="nav-visits">
          <History size={20} strokeWidth={1.5} />
          <span className="text-[10px] tracking-widest uppercase">Visits</span>
        </NavLink>
        {isAdmin && (
          <NavLink to="/admin" className={tab} data-testid="nav-admin">
            <Settings2 size={20} strokeWidth={1.5} />
            <span className="text-[10px] tracking-widest uppercase">Admin</span>
          </NavLink>
        )}
        {isAuthed ? (
          <button onClick={logout} className={tab({ isActive: false })} data-testid="nav-logout">
            <LogOut size={20} strokeWidth={1.5} />
            <span className="text-[10px] tracking-widest uppercase">Sign out</span>
          </button>
        ) : (
          <NavLink to="/login" className={tab} data-testid="nav-login">
            <LogIn size={20} strokeWidth={1.5} />
            <span className="text-[10px] tracking-widest uppercase">Sign in</span>
          </NavLink>
        )}
      </div>
    </nav>
  );
}
