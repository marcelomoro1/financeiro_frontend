import { NavLink } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "../contexts/ThemeContext";
import api from "../services/api";

interface SidebarProps {
  user: { nome: string; email: string } | null;
  onLogout: () => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
  { to: "/simulacao", label: "Carteiras", icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" },
];

function formatTime(dateStr: string | null): string {
  if (!dateStr) return "\u2014";
  const d = new Date(dateStr);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

export default function Sidebar({ user, onLogout, mobileOpen = false, onClose }: SidebarProps) {
  const { theme, toggleTheme } = useTheme();

  const { data: status } = useQuery({
    queryKey: ["status"],
    queryFn: () => api.get("/dashboard/status").then((r) => r.data),
    refetchInterval: 30_000,
  });

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={onClose}
        />
      )}
      <aside
        className={`w-64 flex-shrink-0 flex flex-col border-r h-full fixed md:static inset-y-0 left-0 z-40 transition-transform duration-200 md:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          background: "var(--color-sidebar)",
          borderColor: "var(--color-border)",
        }}
      >
      <div className="p-5">
        <div className="mb-10">
          <h1 className="font-bold text-[15px] leading-tight tracking-tight" style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text)" }}>
            StockBR
          </h1>
          <p className="text-[11px] font-medium" style={{ color: "var(--color-text-muted)" }}>
            Análise Fundamentalista
          </p>
        </div>

        <div className="sidebar-section-label">Principal</div>

        <nav className="space-y-0.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              style={({ isActive }) => ({
                color: isActive ? "var(--color-accent)" : "var(--color-text-secondary)",
                background: isActive ? "var(--color-accent-muted)" : "transparent",
                borderColor: isActive ? "var(--color-accent-border)" : "transparent",
              })}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 border"
            >
              <svg className="w-[18px] h-[18px] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
              </svg>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t p-4" style={{ borderColor: "var(--color-border)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
            style={{ background: "var(--color-accent)" }}
          >
            {user?.nome?.charAt(0)?.toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" style={{ color: "var(--color-text)" }}>
              {user?.nome}
            </p>
            <p className="text-[11px] truncate" style={{ color: "var(--color-text-muted)" }}>
              {user?.email}
            </p>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 mb-1"
          style={{ color: "var(--color-text-secondary)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-hover)"; e.currentTarget.style.color = "var(--color-text)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-secondary)"; }}
        >
          <span className="flex items-center gap-3">
            {theme === "dark" ? (
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
            {theme === "dark" ? "Modo claro" : "Modo escuro"}
          </span>
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150"
          style={{ color: "var(--color-text-muted)" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "var(--color-surface-hover)"; e.currentTarget.style.color = "var(--color-text)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
        >
          <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sair
        </button>

        {status && (
          <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--color-border-light)" }}>
            <div className="flex items-center gap-1.5">
              <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--color-text-muted)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>
                Preços: {formatTime(status.ultimaAtualizacaoPrecos)}
              </span>
            </div>
          </div>
        )}
      </div>
      </aside>
    </>
  );
}
