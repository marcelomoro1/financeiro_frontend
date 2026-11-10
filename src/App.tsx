import { useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Menu } from "lucide-react";
import { useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import SimulacaoPage from "./pages/SimulacaoPage";
import DetalhePage from "./pages/DetalhePage";
import Sidebar from "./components/Sidebar";

function PrivateLayout() {
  const { isAuthenticated, user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!isAuthenticated) return <Navigate to="/login" />;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar user={user} onLogout={logout} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div
          className="md:hidden flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="p-1.5 -ml-1.5 rounded-lg cursor-pointer"
            style={{ color: "var(--color-text)" }}
            aria-label="Abrir menu"
          >
            <Menu size={22} />
          </button>
          <span
            className="font-bold text-sm tracking-tight"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text)" }}
          >
            StockBR
          </span>
        </div>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<PrivateLayout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/simulacao" element={<SimulacaoPage />} />
        <Route path="/acao/:ticker" element={<DetalhePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}
