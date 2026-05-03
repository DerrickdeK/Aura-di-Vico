import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import BottomNav from "./components/BottomNav";
import LandingPage from "./pages/LandingPage";
import ListenPage from "./pages/ListenPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import OnboardingPage from "./pages/OnboardingPage";
import DiscoveriesPage from "./pages/DiscoveriesPage";
import ProfilePage from "./pages/ProfilePage";
import AdminPage from "./pages/AdminPage";
import ContributePage from "./pages/ContributePage";
import AdminContributionsPage from "./pages/AdminContributionsPage";
import { ForgotPasswordPage, ResetPasswordPage } from "./pages/PasswordPages";
import GiftComposerPage from "./pages/GiftComposerPage";
import GiftRecipientPage from "./pages/GiftRecipientPage";
import "./App.css";

function ListenGate() {
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
        <Route path="/" element={<LandingPage />} />
        <Route path="/listen" element={<ListenGate />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
        <Route path="/discoveries" element={<DiscoveriesPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/contribute" element={<ContributePage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/contributions" element={<AdminContributionsPage />} />
        <Route path="/gift/new" element={<GiftComposerPage />} />
        <Route path="/gift/:slug" element={<GiftRecipientPage />} />
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
