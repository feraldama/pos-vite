import { useId } from "react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onItemsPerPageChange: (items: number) => void;
}

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
  onItemsPerPageChange,
}: PaginationProps) => {
  const selectId = useId();

  // Calcular el rango de páginas a mostrar
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      // Mostrar todas las páginas si son pocas
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pageNumbers = [];
    const maxVisiblePages = 2; // Menos páginas visibles en mobile

    // Siempre mostrar la primera página
    pageNumbers.push(1);

    // Calcular el rango alrededor de la página actual
    let startPage = Math.max(2, currentPage - maxVisiblePages);
    let endPage = Math.min(totalPages - 1, currentPage + maxVisiblePages);

    // Asegurarse de que mostramos suficientes páginas si estamos cerca de los extremos
    if (currentPage <= 3) {
      endPage = 4;
    } else if (currentPage >= totalPages - 2) {
      startPage = totalPages - 3;
    }

    // Agregar puntos suspensivos si hay un salto entre la primera página y el rango
    if (startPage > 2) {
      pageNumbers.push("...");
    }

    // Agregar páginas en el rango calculado
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    // Agregar puntos suspensivos si hay un salto entre el rango y la última página
    if (endPage < totalPages - 1) {
      pageNumbers.push("...");
    }

    // Siempre mostrar la última página
    pageNumbers.push(totalPages);

    return pageNumbers;
  };

  const pageNumbers = getPageNumbers();

  const opcionesPorPagina = [10, 25, 50, 100];

  // min-h-11 (44px) en cada control: antes eran de 28px, incómodos en la
  // pantalla táctil del POS
  const controlBase =
    "min-h-11 px-3 py-1 border-t border-b border-slate-300 bg-white text-sm font-medium " +
    "transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-2 " +
    "focus-visible:outline-blue-600 focus-visible:z-10 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="flex flex-col sm:flex-row justify-between items-center mt-4 gap-4">
      <div className="flex items-center order-2 sm:order-1">
        {/* htmlFor: la etiqueta estaba suelta, sin asociar al select */}
        <label htmlFor={selectId} className="mr-2 text-sm text-slate-600">
          Mostrar:
        </label>
        <select
          id={selectId}
          value={itemsPerPage}
          onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
          className="min-h-11 cursor-pointer border border-slate-300 rounded-md px-2 py-1 text-sm text-slate-900 bg-white transition-colors duration-200 hover:border-slate-400 focus:outline-2 focus:-outline-offset-2 focus:outline-blue-600"
        >
          {opcionesPorPagina.map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <nav
        aria-label="Paginación"
        className="inline-flex rounded-md shadow-sm order-1 sm:order-2 w-full sm:w-auto overflow-x-auto sm:overflow-visible"
      >
        <div className="flex">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`${controlBase} border-l rounded-l-md text-slate-700 hover:bg-slate-50 whitespace-nowrap ${
              currentPage === 1 ? "" : "cursor-pointer"
            }`}
          >
            Anterior
          </button>

          {pageNumbers.map((number, index) =>
            number === "..." ? (
              // Los puntos no son un control: antes era un <button disabled>,
              // que el lector de pantalla anunciaba como botón deshabilitado
              <span
                key={`ellipsis-${index}`}
                aria-hidden="true"
                className="min-h-11 flex items-center px-3 py-1 border-t border-b border-slate-300 bg-white text-sm font-medium text-slate-500"
              >
                …
              </span>
            ) : (
              <button
                type="button"
                key={number}
                onClick={() => onPageChange(number as number)}
                // aria-current marca la página actual para lectores de pantalla
                aria-current={currentPage === number ? "page" : undefined}
                aria-label={`Página ${number}`}
                className={`${controlBase} cursor-pointer tabular-nums whitespace-nowrap ${
                  currentPage === number
                    ? "text-blue-700 bg-blue-50 font-semibold"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {number}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`${controlBase} border-r rounded-r-md text-slate-700 hover:bg-slate-50 whitespace-nowrap ${
              currentPage === totalPages ? "" : "cursor-pointer"
            }`}
          >
            Siguiente
          </button>
        </div>
      </nav>
    </div>
  );
};

export default Pagination;
