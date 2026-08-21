import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import type { ReactNode } from "react";

/**
 * Base para los modales de la app.
 *
 * Los modales estaban armados a mano con un `fixed inset-0` y un overlay: no
 * declaraban `role="dialog"`, el tabulador se escapaba al contenido de atrás,
 * Escape no cerraba, el foco no volvía al botón que los abrió y el fondo seguía
 * scrolleando. El Dialog de Headless UI resuelve todo eso de entrada.
 */
interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  /** Ancho máximo del panel. Por defecto "max-w-2xl". */
  maxWidth?: string;
  /** Pie del modal, normalmente los botones de acción. */
  footer?: ReactNode;
  /** z-index base, para modales que se abren encima de otro modal. */
  zIndex?: string;
}

export default function Modal({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-2xl",
  footer,
  zIndex = "z-50",
}: ModalProps) {
  return (
    <Dialog open={open} onClose={onClose} className={`relative ${zIndex}`}>
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-slate-900/60 transition-opacity duration-200"
      />

      <div className="fixed inset-0 flex items-center justify-center overflow-y-auto p-4">
        <DialogPanel
          className={`w-full ${maxWidth} max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-lg bg-white shadow-xl`}
        >
          {title && (
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-4">
              <DialogTitle className="text-lg font-semibold text-slate-900">
                {title}
              </DialogTitle>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="-m-2 inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                <XMarkIcon aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>
          )}

          <div className="px-6 py-5">{children}</div>

          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 px-6 py-4">
              {footer}
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
