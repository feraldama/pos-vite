import { useState, useEffect, useRef } from "react";
import type { ChangeEvent, FormEvent, KeyboardEvent } from "react";
import { useAuth } from "../../../contexts/useAuth";
import { useNavigate } from "react-router-dom";
import {
  EyeIcon,
  EyeSlashIcon,
  ExclamationCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { EMPRESA } from "../../../config/empresa";

interface Credentials {
  email: string;
  password: string;
}

// El estado en reposo usa `border` y el foco usa `outline`, igual que el resto
// de los inputs de la app. Así no conviven dos utilidades de `outline-color`
// sobre el mismo elemento y queda una sola forma de estilar campos.
const inputClasses =
  "block w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 " +
  "text-base text-slate-900 placeholder:text-slate-500 " +
  "transition-colors duration-200 hover:border-slate-400 " +
  "focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600 " +
  "disabled:bg-slate-50 disabled:text-slate-500 " +
  "aria-[invalid=true]:border-red-500 sm:text-sm/6";

/** Monograma tipográfico: reemplaza al logo de la empresa anterior. */
function Monograma({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center justify-center rounded-lg font-bold tracking-tight ${className}`}
    >
      {EMPRESA.inicial}
    </span>
  );
}

function Login() {
  const [credentials, setCredentials] = useState<Credentials>({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  // Evita que el timer del mensaje de error dispare tras desmontar el componente
  useEffect(() => {
    return () => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    };
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (error) setError("");
    setCredentials({
      ...credentials,
      [e.target.name]: e.target.value,
    });
  };

  const handleCapsLock = (e: KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState("CapsLock"));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");
    try {
      await login(credentials);
      navigate("/dashboard");
    } catch (err) {
      const mensaje =
        err instanceof Error && err.message
          ? err.message
          : "Credenciales incorrectas";
      setError(mensaje);
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
      errorTimerRef.current = setTimeout(() => setError(""), 8000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-slate-50 lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* Panel de marca: sólo desktop, donde sobra ancho */}
      <aside className="relative hidden overflow-hidden bg-slate-900 lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative flex items-center gap-3">
          <Monograma className="h-10 w-10 bg-blue-600 text-lg text-white" />
          <div className="leading-tight">
            <p className="text-sm font-semibold text-white">{EMPRESA.nombre}</p>
            <p className="text-xs text-slate-400">{EMPRESA.rubro}</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Sistema de gestión
          </h1>
          <p className="mt-4 text-base/7 text-slate-300">
            Alquileres, ventas, caja e inventario de prendas en un solo lugar.
          </p>
        </div>

        <p className="relative text-xs text-slate-400">
          Acceso restringido a personal autorizado
        </p>
      </aside>

      {/* Panel de formulario */}
      <main className="flex min-h-dvh flex-col justify-center px-6 py-12 lg:min-h-0 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          {/* Marca sólo en mobile/tablet, donde no se muestra el panel lateral */}
          <div className="flex flex-col items-center lg:hidden">
            <Monograma className="h-14 w-14 bg-slate-900 text-2xl text-white" />
            <p className="mt-3 text-base font-semibold text-slate-900">
              {EMPRESA.nombre}
            </p>
            <p className="text-xs text-slate-500">{EMPRESA.rubro}</p>
          </div>

          <div className="mt-8 lg:mt-0">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Iniciar sesión
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Ingresá tus credenciales para acceder al sistema.
            </p>
          </div>

          {/* Región viva: los lectores de pantalla anuncian el error al aparecer */}
          <div aria-live="assertive">
            {error && (
              <div
                role="alert"
                className="mt-6 flex items-start gap-3 rounded-md border border-red-200 bg-red-50 px-4 py-3"
              >
                <ExclamationCircleIcon
                  aria-hidden="true"
                  className="mt-0.5 h-5 w-5 shrink-0 text-red-600"
                />
                <p className="flex-1 text-sm text-red-800">{error}</p>
                <button
                  type="button"
                  onClick={() => setError("")}
                  aria-label="Cerrar mensaje de error"
                  className="-m-1 cursor-pointer rounded p-1 text-red-600 transition-colors duration-200 hover:bg-red-100 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600"
                >
                  <XMarkIcon aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm/6 font-medium text-slate-900"
              >
                Usuario
              </label>
              <div className="mt-2">
                <input
                  ref={emailInputRef}
                  id="email"
                  name="email"
                  type="text"
                  value={credentials.email}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={submitting}
                  aria-invalid={error ? true : undefined}
                  className={inputClasses}
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm/6 font-medium text-slate-900"
              >
                Contraseña
              </label>
              <div className="relative mt-2">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  value={credentials.password}
                  onChange={handleChange}
                  onKeyUp={handleCapsLock}
                  onBlur={() => setCapsLock(false)}
                  required
                  autoComplete="current-password"
                  disabled={submitting}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={capsLock ? "caps-lock-aviso" : undefined}
                  className={inputClasses + " pr-11"}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  aria-pressed={showPassword}
                  className="absolute inset-y-0 right-0 flex cursor-pointer items-center rounded-r-md px-3 text-slate-500 transition-colors duration-200 hover:text-slate-700 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600"
                >
                  {showPassword ? (
                    <EyeSlashIcon aria-hidden="true" className="h-5 w-5" />
                  ) : (
                    <EyeIcon aria-hidden="true" className="h-5 w-5" />
                  )}
                </button>
              </div>
              {capsLock && (
                <p
                  id="caps-lock-aviso"
                  className="mt-2 text-xs font-medium text-amber-700"
                >
                  Bloq Mayús está activado.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2.5 text-sm/6 font-semibold text-white transition-colors duration-200 hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed disabled:bg-blue-600/60"
            >
              {submitting && (
                <svg
                  aria-hidden="true"
                  className="h-4 w-4 animate-spin motion-reduce:animate-none"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
                  />
                </svg>
              )}
              {submitting ? "Ingresando…" : "Ingresar"}
            </button>
          </form>

          <p className="mt-10 text-center text-xs text-slate-500">
            {EMPRESA.nombre} · {EMPRESA.telefono}
          </p>
        </div>
      </main>
    </div>
  );
}

export default Login;
