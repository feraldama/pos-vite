import React, { useState, useMemo, useEffect } from "react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { getColegios } from "../../services/colegio.service";
import { getColegioCursos } from "../../services/colegio.service";

// Definir la interfaz Nomina localmente
interface Nomina {
  NominaId: number;
  NominaNombre: string;
  NominaApellido: string;
  ColegioId: number;
  ColegioCursoId: number;
  ColegioNombre?: string;
  ColegioCursoNombre?: string;
}

interface Colegio {
  ColegioId: number;
  ColegioNombre: string;
}

interface ColegioCurso {
  ColegioId: number;
  ColegioCursoId: number;
  ColegioCursoNombre: string;
}

interface NominaModalProps {
  show: boolean;
  onClose: () => void;
  nominas: Nomina[];
  onSelect: (nomina: Nomina) => void;
  onCreateNomina?: (nomina: Nomina) => void;
}

const NominaModal: React.FC<NominaModalProps> = ({
  show,
  onClose,
  nominas,
  onSelect,
  onCreateNomina,
}) => {
  const [filtros, setFiltros] = useState({
    nombre: "",
    apellido: "",
  });
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [colegios, setColegios] = useState<Colegio[]>([]);
  const [cursos, setCursos] = useState<ColegioCurso[]>([]);
  const [formData, setFormData] = useState<Nomina>({
    NominaId: 0,
    NominaNombre: "",
    NominaApellido: "",
    ColegioId: 0,
    ColegioCursoId: 0,
  });

  // Cargar colegios al montar el componente
  useEffect(() => {
    const fetchColegios = async () => {
      try {
        const data = await getColegios(1, 1000);
        setColegios(data.data || []);
      } catch (error) {
        console.error("Error al cargar colegios:", error);
      }
    };
    fetchColegios();
  }, []);

  // Cargar cursos cuando se selecciona un colegio
  useEffect(() => {
    const fetchCursos = async () => {
      if (formData.ColegioId > 0) {
        try {
          const cursosData = await getColegioCursos(formData.ColegioId);
          setCursos(cursosData || []);
          // Resetear curso cuando cambia el colegio
          setFormData((prev) => ({ ...prev, ColegioCursoId: 0 }));
        } catch (error) {
          console.error("Error al cargar cursos:", error);
          setCursos([]);
        }
      } else {
        setCursos([]);
        setFormData((prev) => ({ ...prev, ColegioCursoId: 0 }));
      }
    };
    fetchCursos();
  }, [formData.ColegioId]);

  const nominasFiltradas = useMemo(() => {
    return nominas.filter(
      (n) =>
        n.NominaNombre.toLowerCase().includes(filtros.nombre.toLowerCase()) &&
        (n.NominaApellido || "")
          .toLowerCase()
          .includes(filtros.apellido.toLowerCase())
    );
  }, [nominas, filtros]);

  const totalPages = Math.ceil(nominasFiltradas.length / rowsPerPage);
  const paginatedNominas = nominasFiltradas.slice(
    (page - 1) * rowsPerPage,
    page * rowsPerPage
  );

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "NominaNombre" || name === "NominaApellido"
          ? value.toUpperCase()
          : name === "ColegioId" || name === "ColegioCursoId"
          ? Number(value) || 0
          : value,
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    // Validar campos requeridos
    if (
      !formData.NominaNombre ||
      !formData.ColegioId ||
      formData.ColegioId === 0 ||
      !formData.ColegioCursoId ||
      formData.ColegioCursoId === 0
    ) {
      return;
    }

    if (onCreateNomina) {
      try {
        await onCreateNomina(formData);
        setShowCreateModal(false);
        // Reset form data
        setFormData({
          NominaId: 0,
          NominaNombre: "",
          NominaApellido: "",
          ColegioId: 0,
          ColegioCursoId: 0,
        });
        setCursos([]);
      } catch (error) {
        // El error ya se maneja en el componente padre
        console.error("Error al crear nómina:", error);
        // No cerrar el modal si hay error
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setShowCreateModal(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50" />
      <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] p-6 relative flex flex-col">
        <button
          type="button"
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl cursor-pointer"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClose();
          }}
        >
          &times;
        </button>
        <div className="flex justify-between items-center mb-4 pr-8">
          <h2 className="text-2xl font-semibold text-gray-800">
            Buscar Nómina
          </h2>
          {onCreateNomina && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              <PlusIcon className="w-4 h-4" />
              Nueva Nómina
            </button>
          )}
        </div>
        <div className="bg-gray-50 rounded-lg p-4 mb-4 flex-shrink-0">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Nombre
              </label>
              <input
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                placeholder="Buscar"
                value={filtros.nombre}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, nombre: e.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">
                Apellido
              </label>
              <input
                className="w-full border border-gray-200 rounded px-2 py-1 text-sm"
                placeholder="Buscar"
                value={filtros.apellido}
                onChange={(e) =>
                  setFiltros((f) => ({ ...f, apellido: e.target.value }))
                }
              />
            </div>
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-auto rounded-lg flex-1 min-h-0">
          <table className="min-w-full bg-white">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-sm">
                <th className="py-2 px-4 text-left">ID</th>
                <th className="py-2 px-4 text-left">Nombre</th>
                <th className="py-2 px-4 text-left">Apellido</th>
                <th className="py-2 px-4 text-left">Colegio</th>
                <th className="py-2 px-4 text-left">Curso</th>
              </tr>
            </thead>
            <tbody>
              {paginatedNominas.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-4 text-gray-400">
                    No hay nóminas
                  </td>
                </tr>
              )}
              {paginatedNominas.map((n) => (
                <tr
                  key={n.NominaId}
                  className="hover:bg-blue-50 cursor-pointer transition"
                  onClick={() => onSelect(n)}
                >
                  <td className="py-2 px-4">{n.NominaId}</td>
                  <td className="py-2 px-4">{n.NominaNombre}</td>
                  <td className="py-2 px-4">{n.NominaApellido || ""}</td>
                  <td className="py-2 px-4">{n.ColegioNombre || ""}</td>
                  <td className="py-2 px-4">{n.ColegioCursoNombre || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Paginación */}
        <div className="flex items-center justify-between mt-4 flex-shrink-0">
          <div className="text-sm text-gray-500">
            {nominasFiltradas.length === 0
              ? "0"
              : `${(page - 1) * rowsPerPage + 1} to ${Math.min(
                  page * rowsPerPage,
                  nominasFiltradas.length
                )} of ${nominasFiltradas.length}`}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Filas por página:</span>
            <select
              className="border border-gray-200 rounded px-2 py-1 text-sm"
              value={rowsPerPage}
              onChange={(e) => {
                setRowsPerPage(Number(e.target.value));
                setPage(1);
              }}
            >
              {[5, 10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1 rounded text-gray-500 border border-gray-200 disabled:opacity-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPage((p) => Math.max(1, p - 1));
              }}
              disabled={page === 1}
            >
              Anterior
            </button>
            <button
              type="button"
              className="px-3 py-1 rounded text-gray-500 border border-gray-200 disabled:opacity-50"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setPage((p) => Math.min(totalPages, p + 1));
              }}
              disabled={page === totalPages || totalPages === 0}
            >
              Siguiente
            </button>
          </div>
        </div>

        {/* Modal para crear nómina */}
        {showCreateModal && (
          <div
            className="fixed inset-0 z-60 flex items-center justify-center"
            onClick={handleBackdropClick}
          >
            <div className="absolute inset-0 bg-black opacity-50" />
            <div className="relative w-full max-w-2xl max-h-full z-10">
              <form
                onSubmit={handleCreateSubmit}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-white rounded-lg shadow max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-start justify-between p-4 border-b rounded-t">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Crear nueva nómina
                  </h3>
                  <button
                    type="button"
                    className="text-gray-400 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 ml-auto inline-flex justify-center items-center"
                    onClick={() => setShowCreateModal(false)}
                  >
                    <svg
                      className="w-3 h-3"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 14 14"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                      />
                    </svg>
                  </button>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-6 gap-6">
                    <div className="col-span-6 sm:col-span-3">
                      <label
                        htmlFor="NominaNombre"
                        className="block mb-2 text-sm font-medium text-gray-900"
                      >
                        Nombre
                      </label>
                      <input
                        type="text"
                        name="NominaNombre"
                        id="NominaNombre"
                        value={formData.NominaNombre}
                        onChange={handleInputChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        required
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <label
                        htmlFor="NominaApellido"
                        className="block mb-2 text-sm font-medium text-gray-900"
                      >
                        Apellido
                      </label>
                      <input
                        type="text"
                        name="NominaApellido"
                        id="NominaApellido"
                        value={formData.NominaApellido}
                        onChange={handleInputChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                      />
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <label
                        htmlFor="ColegioId"
                        className="block mb-2 text-sm font-medium text-gray-900"
                      >
                        Colegio
                      </label>
                      <select
                        name="ColegioId"
                        id="ColegioId"
                        value={formData.ColegioId}
                        onChange={handleInputChange}
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                        required
                      >
                        <option value="0">Seleccione un colegio</option>
                        {colegios.map((colegio) => (
                          <option
                            key={colegio.ColegioId}
                            value={colegio.ColegioId}
                          >
                            {colegio.ColegioNombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-6 sm:col-span-3">
                      <label
                        htmlFor="ColegioCursoId"
                        className="block mb-2 text-sm font-medium text-gray-900"
                      >
                        Curso
                      </label>
                      <select
                        name="ColegioCursoId"
                        id="ColegioCursoId"
                        value={formData.ColegioCursoId}
                        onChange={handleInputChange}
                        disabled={
                          !formData.ColegioId || formData.ColegioId === 0
                        }
                        className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 disabled:bg-gray-100"
                        required
                      >
                        <option value="0">Seleccione un curso</option>
                        {cursos.map((curso) => (
                          <option
                            key={curso.ColegioCursoId}
                            value={curso.ColegioCursoId}
                          >
                            {curso.ColegioCursoNombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex items-center p-6 space-x-2 border-t border-gray-200 rounded-b">
                  <button
                    type="submit"
                    className="text-white bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 text-center cursor-pointer"
                  >
                    Crear Nómina
                  </button>
                  <button
                    type="button"
                    className="text-gray-500 bg-white hover:bg-gray-100 focus:ring-4 focus:outline-none focus:ring-blue-300 rounded-lg border border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900 focus:z-10 cursor-pointer"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowCreateModal(false);
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NominaModal;
