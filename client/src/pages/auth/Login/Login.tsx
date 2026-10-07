import { useState, useRef } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { useAuth } from "../../../contexts/useAuth";
import { useNavigate } from "react-router-dom";
import {
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import PasswordInput from "../../../components/common/Input/PasswordInput";
import logo from "../../../assets/img/logo.jpg";

interface Credentials {
  email: string;
  password: string;
}

const inputClass =
  "block h-11 w-full rounded-md bg-white px-3 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline-2 focus:-outline-offset-2 focus:outline-brand";

function Login() {
  const [credentials, setCredentials] = useState<Credentials>({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [capsLock, setCapsLock] = useState(false);
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handlePasswordKey = (e: KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState("CapsLock"));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    try {
      await login(credentials);
      navigate("/dashboard");
    } catch (error) {
      if (error instanceof TypeError) {
        // fetch lanza TypeError cuando no hay conexión con el servidor
        setError("No se pudo conectar con el servidor. Intente nuevamente.");
      } else if (error instanceof Error && error.message) {
        setError(error.message);
      } else {
        setError("Credenciales incorrectas");
      }
      passwordInputRef.current?.select();
    }
  };

  return (
    <div className="flex min-h-dvh bg-gray-50">
      {/* Panel de marca (solo escritorio) */}
      <aside className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-brand p-12 text-white lg:flex">
        <div
          className="absolute -right-24 -bottom-24 h-96 w-96 rounded-full bg-brand-accent/15"
          aria-hidden="true"
        />
        <div
          className="absolute -top-16 -left-16 h-64 w-64 rounded-full bg-white/5"
          aria-hidden="true"
        />
        <span className="relative text-sm font-semibold tracking-widest text-brand-accent uppercase">
          Decorpar
        </span>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold tracking-tight">
            Gestión de ventas y caja
          </h1>
          <p className="mt-4 text-lg text-white/80">
            Ventas, créditos, cajas y reportes en un solo lugar.
          </p>
        </div>
        <p className="relative text-sm text-white/60">
          © {new Date().getFullYear()} Decorpar
        </p>
      </aside>

      {/* Formulario */}
      <main className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:max-w-xl lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <img
            alt="Decorpar"
            src={logo}
            width={64}
            height={64}
            className="h-16 w-16 object-contain"
          />
          <h2 className="mt-8 text-2xl/9 font-bold tracking-tight text-gray-900">
            Iniciar sesión
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Ingrese su usuario y contraseña para continuar.
          </p>

          {error && (
            <div
              className="mt-6 flex items-start gap-3 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800"
              role="alert"
            >
              <ExclamationCircleIcon
                className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
                aria-hidden="true"
              />
              <p className="flex-1">{error}</p>
              <button
                type="button"
                onClick={() => setError("")}
                className="-m-1.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-red-700 hover:bg-red-100 focus-visible:outline-2 focus-visible:outline-red-700"
                aria-label="Cerrar mensaje"
              >
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-6">
            <div>
              <label
                htmlFor="email"
                className="block text-sm/6 font-medium text-gray-900"
              >
                Usuario
              </label>
              <div className="mt-2">
                <input
                  autoFocus
                  id="email"
                  name="email"
                  type="text"
                  value={credentials.email}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  aria-invalid={error ? true : undefined}
                  className={inputClass}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm/6 font-medium text-gray-900"
              >
                Contraseña
              </label>
              <div className="mt-2">
                <PasswordInput
                  ref={passwordInputRef}
                  id="password"
                  name="password"
                  value={credentials.password}
                  onChange={handleChange}
                  onKeyDown={handlePasswordKey}
                  onKeyUp={handlePasswordKey}
                  onBlur={() => setCapsLock(false)}
                  required
                  autoComplete="current-password"
                  aria-invalid={error ? true : undefined}
                  aria-describedby={capsLock ? "caps-lock-warning" : undefined}
                  className={inputClass}
                />
              </div>
              {capsLock && (
                <p
                  id="caps-lock-warning"
                  className="mt-2 flex items-center gap-1.5 text-sm text-amber-800"
                >
                  <ExclamationTriangleIcon
                    className="h-4 w-4 shrink-0"
                    aria-hidden="true"
                  />
                  Bloq Mayús está activado
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand px-3 text-base font-semibold text-white shadow-xs transition-colors hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading && (
                <svg
                  className="h-5 w-5 motion-safe:animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="opacity-25"
                  />
                  <path
                    d="M4 12a8 8 0 0 1 8-8"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                  />
                </svg>
              )}
              {loading ? "Ingresando…" : "Ingresar"}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-gray-500 lg:hidden">
            © {new Date().getFullYear()} Decorpar
          </p>
        </div>
      </main>
    </div>
  );
}

export default Login;
