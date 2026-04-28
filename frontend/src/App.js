import React, { useCallback, useEffect, useState } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { api } from "./lib/api";
import BottomNav from "./components/BottomNav";
import MapView from "./components/MapView";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import FavoritesPage from "./pages/FavoritesPage";
import VisitsPage from "./pages/VisitsPage";
import AdminPage from "./pages/AdminPage";
import "./App.css";

function MapPage() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);

  const refreshFavorites = useCallback(async () => {
    if (user && user !== false) {
      try {
        const { data } = await api.get("/me/favorites");
        setFavorites(data.map((p) => p.id));
      } catch {
        setFavorites([]);
      }
    } else {
      setFavorites([]);
    }
  }, [user]);

  useEffect(() => { refreshFavorites(); }, [refreshFavorites]);

  return (
    <div className="fixed inset-0 pb-16">
      <MapView favorites={favorites} refreshFavorites={refreshFavorites} />
    </div>
  );
}

function Shell() {
  return (
    <>
      <Routes>
        <Route path="/" element={<MapPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/favorites" element={<FavoritesPage />} />
        <Route path="/visits" element={<VisitsPage />} />
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
