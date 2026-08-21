import { useState } from "react";
import {
  PencilSquareIcon,
  TrashIcon,
  CreditCardIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronUpDownIcon,
} from "@heroicons/react/24/outline";

interface DataTableRow {
  id: string | number;
  [key: string]: unknown;
}

interface DataTableColumn<T extends DataTableRow> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  status?: boolean;
}

interface DataTableProps<T extends DataTableRow> {
  columns: DataTableColumn<T>[];
  data: T[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onViewCredit?: (item: T) => void;
  emptyMessage?: string;
  actions?: boolean;
  customActions?: (item: T) => React.ReactNode;
  getStatusColor?: (status: unknown) => string;
  getStatusText?: (status: unknown) => string;
  sortKey?: string;
  sortOrder?: "asc" | "desc";
  onSort?: (key: string, order: "asc" | "desc") => void;
  /** Título accesible de la tabla, se lee en lectores de pantalla. */
  caption?: string;
}

const ACCION_BASE =
  "inline-flex items-center justify-center h-8 w-8 rounded-md cursor-pointer " +
  "transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2";

function DataTable<T extends DataTableRow>({
  columns,
  data,
  onEdit,
  onDelete,
  onViewCredit,
  emptyMessage = "No se encontraron registros",
  actions = true,
  customActions,
  getStatusColor,
  getStatusText,
  sortKey,
  sortOrder,
  onSort,
  caption,
}: DataTableProps<T>) {
  // Si se pasa onSort, el ordenamiento lo maneja el componente padre
  const [localSortKey, setLocalSortKey] = useState<string | null>(null);
  const [localSortOrder, setLocalSortOrder] = useState<"asc" | "desc">("asc");

  // Sólo ordenar si hay una columna elegida. La condición anterior incluía
  // `|| localSortOrder`, que siempre es truthy ("asc"), así que en el primer
  // render ordenaba por localSortKey = null: el comparador devolvía 1 para
  // todos los pares y Array.sort reacomodaba las filas sin criterio.
  const sortedData = !onSort && localSortKey
    ? [...data].sort((a, b) => {
        const aValue = a[localSortKey];
        const bValue = b[localSortKey];
        if (aValue == null && bValue == null) return 0;
        if (aValue == null) return 1;
        if (bValue == null) return -1;
        if (aValue === bValue) return 0;
        const menor = aValue < bValue ? -1 : 1;
        return localSortOrder === "asc" ? menor : -menor;
      })
    : data;

  const activeKey = onSort ? sortKey : localSortKey;
  const activeOrder = onSort ? sortOrder : localSortOrder;

  const alternarOrden = (key: string) => {
    if (onSort) {
      onSort(key, sortKey === key && sortOrder === "asc" ? "desc" : "asc");
      return;
    }
    if (localSortKey === key) {
      setLocalSortOrder(localSortOrder === "asc" ? "desc" : "asc");
    } else {
      setLocalSortKey(key);
      setLocalSortOrder("asc");
    }
  };

  const totalColumnas = columns.length + (actions ? 1 : 0);

  return (
    <div className="relative overflow-x-auto rounded-lg border border-slate-200 shadow-sm">
      <table className="w-full text-sm text-left text-slate-700">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="text-xs text-slate-600 uppercase bg-slate-50 border-b border-slate-200">
          <tr>
            {columns.map((column) => {
              const activa = activeKey === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  // aria-sort le dice al lector de pantalla por qué columna y en
                  // qué sentido está ordenada la tabla
                  aria-sort={
                    activa
                      ? activeOrder === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                  className="p-0"
                >
                  {/* Botón real en vez de un th clickeable: así se puede ordenar
                      con teclado y tiene foco visible */}
                  <button
                    type="button"
                    onClick={() => alternarOrden(column.key)}
                    className="flex w-full items-center gap-1 px-6 py-3 text-left uppercase cursor-pointer transition-colors duration-200 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600"
                  >
                    {column.label}
                    {activa ? (
                      activeOrder === "asc" ? (
                        <ChevronUpIcon
                          aria-hidden="true"
                          className="h-3.5 w-3.5 shrink-0"
                        />
                      ) : (
                        <ChevronDownIcon
                          aria-hidden="true"
                          className="h-3.5 w-3.5 shrink-0"
                        />
                      )
                    ) : (
                      <ChevronUpDownIcon
                        aria-hidden="true"
                        className="h-3.5 w-3.5 shrink-0 text-slate-500"
                      />
                    )}
                  </button>
                </th>
              );
            })}
            {actions && (
              <th scope="col" className="px-6 py-3">
                Acciones
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sortedData.map((item) => (
            <tr
              key={item.id}
              className="bg-white border-b border-slate-200 last:border-b-0 transition-colors duration-200 hover:bg-slate-50"
            >
              {columns.map((column) => (
                <td key={column.key} className="px-6 py-4 tabular-nums">
                  {column.render ? (
                    column.render(item)
                  ) : column.status ? (
                    <div className="flex items-center">
                      <div
                        aria-hidden="true"
                        className={`h-2.5 w-2.5 rounded-full ${
                          getStatusColor?.(item[column.key]) || "bg-slate-500"
                        } mr-2`}
                      ></div>
                      {getStatusText?.(item[column.key]) ||
                        String(item[column.key])}
                    </div>
                  ) : (
                    String(item[column.key])
                  )}
                </td>
              ))}
              {actions && (
                <td className="px-6 py-4">
                  {customActions ? (
                    customActions(item)
                  ) : (
                    // gap-2 = 8px, la separación mínima entre targets táctiles
                    <div className="flex gap-2">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(item)}
                          aria-label={`Editar registro ${item.id}`}
                          title="Editar"
                          className={`${ACCION_BASE} text-blue-600 hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-blue-600`}
                        >
                          <PencilSquareIcon
                            aria-hidden="true"
                            className="h-5 w-5"
                          />
                        </button>
                      )}
                      {onViewCredit && item.VentaTipo === "CR" && (
                        <button
                          type="button"
                          onClick={() => onViewCredit(item)}
                          aria-label={`Ver detalles de crédito del registro ${item.id}`}
                          title="Ver detalles de crédito"
                          className={`${ACCION_BASE} text-green-700 hover:bg-green-50 hover:text-green-800 focus-visible:outline-green-700`}
                        >
                          <CreditCardIcon
                            aria-hidden="true"
                            className="h-5 w-5"
                          />
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(item)}
                          aria-label={`Eliminar registro ${item.id}`}
                          title="Eliminar"
                          className={`${ACCION_BASE} text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-red-600`}
                        >
                          <TrashIcon aria-hidden="true" className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  )}
                </td>
              )}
            </tr>
          ))}

          {/* Estado vacío dentro de la tabla, para no romper su estructura */}
          {data.length === 0 && (
            <tr className="bg-white">
              <td
                colSpan={totalColumnas}
                className="px-6 py-10 text-center text-slate-500"
              >
                {emptyMessage}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export default DataTable;
