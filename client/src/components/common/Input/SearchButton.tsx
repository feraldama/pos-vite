import React from "react";
import ActionButton from "../Button/ActionButton"; // Ajustá la ruta si es distinta

interface SearchButtonProps {
  searchTerm: string;
  onSearch: (value: string) => void;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
  onSearchSubmit: React.MouseEventHandler<HTMLButtonElement>;
  placeholder?: string;
  className?: string;
}

export default function SearchButton({
  searchTerm,
  onSearch,
  onKeyPress,
  onSearchSubmit,
  placeholder = "Buscar...",
}: SearchButtonProps) {
  return (
    <div className="flex items-center flex-row flex-wrap py-4 bg-white sm:max-w-full lg:max-w-xl gap-2">
      <div className="relative flex-1 min-w-0">
        <div className="absolute inset-y-0 left-2 flex items-center pointer-events-none">
          <svg
            className="w-4 h-4 text-gray-500"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 20 20"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"
            />
          </svg>
        </div>
        <input
          type="text"
          id="table-search-users"
          className="block w-full pl-8 pr-4 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500"
          placeholder={placeholder}
          value={searchTerm}
          onChange={(e) => onSearch(e.target.value)}
          onKeyDown={onKeyPress}
        />
      </div>
      <ActionButton
        label="Buscar"
        onClick={onSearchSubmit}
        className="text-white rounded-lg flex-shrink-0"
      />
    </div>
  );
}
