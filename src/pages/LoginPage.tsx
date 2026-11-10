import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function LoginPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", nome: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isRegister) {
        await register(form.email, form.password, form.nome);
      } else {
        await login(form.email, form.password);
      }
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.error || "Falha na autenticação");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "var(--color-bg)" }}>
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ fontFamily: "'JetBrains Mono', monospace", color: "var(--color-text)" }}
          >
            StockBR
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            Análise Fundamentalista
          </p>
        </div>

        <div className="card p-8">
          <h2 className="text-lg font-semibold mb-6" style={{ color: "var(--color-text)" }}>
            {isRegister ? "Criar conta" : "Acessar plataforma"}
          </h2>

          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-sm flex items-center gap-2"
              style={{
                background: "var(--color-danger-muted)",
                color: "var(--color-danger)",
                border: "1px solid var(--color-danger-border)",
              }}
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  Nome completo
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  className="input-field w-full px-4 py-2.5 text-sm"
                  placeholder="Seu nome"
                  required
                />
              </div>
            )}
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Email
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="input-field w-full px-4 py-2.5 text-sm"
                placeholder="seu@email.com"
                required
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--color-text-secondary)" }}
              >
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="input-field w-full px-4 py-2.5 pr-11 text-sm"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 cursor-pointer"
                  style={{ color: "var(--color-text-muted)" }}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-2.5 text-sm cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processando...
                </span>
              ) : (
                isRegister ? "Criar conta" : "Entrar"
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            {isRegister ? "Já possui uma conta?" : "Ainda não tem acesso?"}{" "}
            <button
              onClick={() => { setIsRegister(!isRegister); setError(""); }}
              className="font-medium transition-colors"
              style={{ color: "var(--color-accent)" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "var(--color-accent-hover)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--color-accent)"; }}
            >
              {isRegister ? "Fazer login" : "Registrar-se"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
