import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import BottomNav from "./components/BottomNav";
import ListenPage from "./pages/ListenPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OnboardingPage from "./pages/OnboardingPage";
import DiscoveriesPage from "./pages/DiscoveriesPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import "./App.css";

function HomeGate() {
  const { user } = useAuth();
  if (user === null) return <p className="p-10 text-[var(--text-tertiary)]">…</p>;
  if (user === false) return <Navigate to="/login" replace />;
  if (!user.onboarded) return <Navigate to="/onboarding" replace />;
  return <ListenPage />;
}

function Shell() {
  return (
    <>
      <Routes>
        <Route path="/" element={<HomeGate />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/discoveries" element={<DiscoveriesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
      <BottomNav />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </AuthProvider>
  );
}
