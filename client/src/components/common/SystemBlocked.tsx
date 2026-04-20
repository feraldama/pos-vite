import { LockClosedIcon, PhoneIcon, EnvelopeIcon } from "@heroicons/react/24/solid";

export default function SystemBlocked() {
  const adminPhone = import.meta.env.VITE_ADMIN_CONTACT_PHONE || "";
  const adminEmail = import.meta.env.VITE_ADMIN_CONTACT_EMAIL || "";
  const adminName = import.meta.env.VITE_ADMIN_CONTACT_NAME || "el administrador";

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm font-baloo px-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="system-blocked-title"
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-red-700 px-6 py-8 flex flex-col items-center">
          <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center mb-4 ring-4 ring-white/10">
            <LockClosedIcon className="w-12 h-12 text-white" />
          </div>
          <h1
            id="system-blocked-title"
            className="text-2xl md:text-3xl font-bold text-white text-center"
          >
            Sistema Bloqueado
          </h1>
        </div>

        <div className="px-6 py-6 space-y-4">
          <p className="text-slate-700 text-center text-base leading-relaxed">
            El acceso al sistema se encuentra <span className="font-semibold">temporalmente suspendido</span>.
          </p>
          <p className="text-slate-600 text-center text-sm leading-relaxed">
            Por favor, póngase en contacto con {adminName} para regularizar la situación y restablecer el servicio.
          </p>

          {(adminPhone || adminEmail) && (
            <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
              <p className="text-xs uppercase tracking-wider text-slate-500 text-center font-semibold">
                Datos de contacto
              </p>
              {adminPhone && (
                <a
                  href={`tel:${adminPhone}`}
                  className="flex items-center justify-center gap-2 text-slate-700 hover:text-red-600 transition-colors"
                >
                  <PhoneIcon className="w-5 h-5" />
                  <span className="font-medium">{adminPhone}</span>
                </a>
              )}
              {adminEmail && (
                <a
                  href={`mailto:${adminEmail}`}
                  className="flex items-center justify-center gap-2 text-slate-700 hover:text-red-600 transition-colors break-all"
                >
                  <EnvelopeIcon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{adminEmail}</span>
                </a>
              )}
            </div>
          )}

          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800 text-center">
              Disculpe las molestias. El sistema será reactivado una vez confirmada la regularización.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
