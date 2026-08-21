import React, { useId } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import ActionButton from "../Button/ActionButton";

interface SearchButtonProps {
  searchTerm: string;
  onSearch: (value: string) => void;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: () => void;
  placeholder?: string;
  className?: string;
  hideButton?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  /** Etiqueta accesible del campo. Por defecto usa el placeholder. */
  label?: string;
}

export default function SearchButton({
  searchTerm,
  onSearch,
  onKeyPress,
  onSearchSubmit,
  placeholder = "Buscar...",
  hideButton = false,
  inputRef,
  label,
}: SearchButtonProps) {
  // El id era fijo ("table-search-users"), así que dos buscadores en la misma
  // pantalla generaban ids duplicados y la etiqueta apuntaba al campo equivocado.
  const inputId = useId();

  return (
    <div className="flex items-center flex-row flex-wrap py-4 bg-white sm:max-w-full lg:max-w-xl gap-2">
      <div className="relative flex-1 min-w-0">
        {/* Etiqueta real: antes el campo sólo tenía placeholder, que no sirve
            como nombre accesible y desaparece al escribir */}
        <label htmlFor={inputId} className="sr-only">
          {label ?? placeholder}
        </label>
        <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
          <MagnifyingGlassIcon
            aria-hidden="true"
            className="w-4 h-4 text-slate-500"
          />
        </div>
        <input
          type="search"
          id={inputId}
          className="block w-full min-h-11 pl-9 pr-4 py-2 text-sm text-slate-900 border border-slate-300 rounded-lg bg-white placeholder:text-slate-500 transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => {
            const value = e.target.value;
            // No permitir que el primer carácter sea un 0
            if (value.startsWith("0")) {
              // Si comienza con 0, remover el 0 del inicio
              const cleanValue = value.replace(/^0+/, "");
              onSearch(cleanValue);
            } else {
              onSearch(value);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              onSearchSubmit();
            }
            if (onKeyPress) {
              onKeyPress(e);
            }
          }}
          ref={inputRef}
        />
      </div>
      {!hideButton && (
        <ActionButton
          label="Buscar"
          onClick={() => onSearchSubmit()}
          className="flex-shrink-0"
        />
      )}
    </div>
  );
}
