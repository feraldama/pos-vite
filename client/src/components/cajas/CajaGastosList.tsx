import { useEffect, useState, useCallback } from "react";
import ActionButton from "../common/Button/ActionButton";
import DataTable from "../common/Table/DataTable";
import Swal from "sweetalert2";
import {
  getCajaGastosByCajaId,
  createCajaGasto,
  updateCajaGasto,
  deleteCajaGasto,
  type CajaGasto,
} from "../../services/cajagasto.service";
import { getTiposGasto } from "../../services/tipogasto.service";
import type { TipoGastoGrupo } from "../../services/tipogastogrupo.service";
import { getAllTipoGastoGrupo } from "../../services/tipogastogrupo.service";

// Definición local del tipo TipoGasto
interface TipoGasto {
  TipoGastoId: string | number;
  TipoGastoDescripcion: string;
  TipoGastoCantGastos?: number;
}

interface CajaGastosListProps {
  cajaId: string | number;
}

export default function CajaGastosList({ cajaId }: CajaGastosListProps) {
  const [gastos, setGastos] = useState<CajaGasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<CajaGasto>>({});
  const [tiposGasto, setTiposGasto] = useState<TipoGasto[]>([]);
  const [gruposGasto, setGruposGasto] = useState<TipoGastoGrupo[]>([]);
  const [nuevoGasto, setNuevoGasto] = useState({
    TipoGastoId: "",
    TipoGastoGrupoId: "",
  });

  const fetchGastos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCajaGastosByCajaId(cajaId);
      setGastos(data);
    } catch {
      setError("Error al obtener gastos de la caja");
    } finally {
      setLoading(false);
    }
  }, [cajaId]);

  useEffect(() => {
    fetchGastos();
    getTiposGasto().then(setTiposGasto);
    getAllTipoGastoGrupo().then(setGruposGasto);
  }, [cajaId, fetchGastos]);

  const handleDelete = async (id: string | number) => {
    const confirm = await Swal.fire({
      title: "¿Estás seguro?",
      text: "¡No podrás revertir esto!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Sí, eliminar!",
      cancelButtonText: "Cancelar",
    });
    if (!confirm.isConfirmed) return;
    try {
      await deleteCajaGasto(id);
      await fetchGastos();
      Swal.fire({
        icon: "success",
        title: "Gasto eliminado exitosamente",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error al eliminar gasto",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (formData.CajaGastoId) {
        // Assuming CajaGastoId is the key for update
        await updateCajaGasto(formData.CajaGastoId, formData);
        Swal.fire({
          icon: "success",
          title: "Gasto actualizado",
          timer: 1500,
          showConfirmButton: false,
        });
      } else {
        await createCajaGasto(formData as CajaGasto);
        Swal.fire({
          icon: "success",
          title: "Gasto creado",
          timer: 1500,
          showConfirmButton: false,
        });
      }
      setIsModalOpen(false);
      await fetchGastos();
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error al guardar gasto",
      });
    }
  };

  const columns = [
    { key: "CajaGastoId", label: "ID" },
    {
      key: "TipoGastoId",
      label: "Tipo de Gasto",
      render: (g: CajaGasto & { id: string | number }) => {
        const tipo = tiposGasto.find(
          (t) => String(t.TipoGastoId) === String(g.TipoGastoId)
        );
        return tipo ? tipo.TipoGastoDescripcion : g.TipoGastoId;
      },
    },
    {
      key: "TipoGastoGrupoId",
      label: "Grupo de Gasto",
      render: (g: CajaGasto & { id: string | number }) => {
        const grupo = gruposGasto.find(
          (gg) =>
            String(gg.TipoGastoGrupoId) === String(g.TipoGastoGrupoId) &&
            String(gg.TipoGastoId) === String(g.TipoGastoId)
        );
        return grupo ? grupo.TipoGastoGrupoDescripcion : g.TipoGastoGrupoId;
      },
    },
  ];

  // Adaptar los datos para DataTable (agregar 'id')
  const gastosWithId: (CajaGasto & { id: string | number })[] = gastos.map(
    (g) => ({ ...g, id: g.CajaGastoId })
  );

  // Nueva función para manejar el agregado de un gasto
  const handleAddGasto = async () => {
    if (!nuevoGasto.TipoGastoId || !nuevoGasto.TipoGastoGrupoId) return;
    // Validación de duplicado
    const yaExiste = gastos.some(
      (g) =>
        String(g.TipoGastoId) === String(nuevoGasto.TipoGastoId) &&
        String(g.TipoGastoGrupoId) === String(nuevoGasto.TipoGastoGrupoId)
    );
    if (yaExiste) {
      Swal.fire({
        icon: "warning",
        title: "Ya existe un gasto con ese tipo y grupo en esta caja",
      });
      return;
    }
    await createCajaGasto({
      CajaId: cajaId,
      TipoGastoId: nuevoGasto.TipoGastoId,
      TipoGastoGrupoId: nuevoGasto.TipoGastoGrupoId,
    });
    setNuevoGasto({ TipoGastoId: "", TipoGastoGrupoId: "" });
    fetchGastos();
    Swal.fire({
      icon: "success",
      title: "Gasto agregado exitosamente",
      timer: 1500,
      showConfirmButton: false,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <DataTable<CajaGasto & { id: string | number }>
        columns={columns}
        data={gastosWithId}
        // onEdit={handleEdit}
        onDelete={(g) => handleDelete(g.CajaGastoId)}
        emptyMessage="No hay gastos registrados"
      />
      {/* Inputs para agregar nuevo gasto */}
      <div className="flex flex-col sm:flex-row gap-2 mt-2">
        <select
          className="border rounded px-2 py-1 text-sm flex-1"
          value={nuevoGasto.TipoGastoId}
          onChange={(e) =>
            setNuevoGasto((prev) => ({
              ...prev,
              TipoGastoId: e.target.value,
              TipoGastoGrupoId: "", // Resetea el grupo al cambiar tipo
            }))
          }
        >
          <option value="">Tipo de gasto...</option>
          {tiposGasto.map((tg) => (
            <option key={tg.TipoGastoId} value={tg.TipoGastoId}>
              {tg.TipoGastoDescripcion}
            </option>
          ))}
        </select>
        <select
          className="border rounded px-2 py-1 text-sm flex-1"
          value={nuevoGasto.TipoGastoGrupoId}
          onChange={(e) =>
            setNuevoGasto((prev) => ({
              ...prev,
              TipoGastoGrupoId: e.target.value,
            }))
          }
        >
          <option value="">Grupo...</option>
          {gruposGasto
            .filter(
              (gg) => String(gg.TipoGastoId) === String(nuevoGasto.TipoGastoId)
            )
            .map((gg) => (
              <option key={gg.TipoGastoGrupoId} value={gg.TipoGastoGrupoId}>
                {gg.TipoGastoGrupoDescripcion}
              </option>
            ))}
        </select>
        <button
          type="button"
          className="text-white bg-blue-600 hover:bg-blue-700 rounded px-3 py-1 text-xs"
          onClick={handleAddGasto}
        >
          Agregar
        </button>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black opacity-50"
            onClick={() => setIsModalOpen(false)}
          />
          <form
            onSubmit={handleSubmit}
            className="relative bg-white rounded-lg shadow p-6 z-10 max-w-md w-full"
          >
            <h3 className="text-lg font-semibold mb-4">
              {formData.CajaGastoId ? "Editar Gasto" : "Nuevo Gasto"}
            </h3>
            <div className="mb-4">
              <label className="block mb-1">Tipo de Gasto</label>
              <select
                name="TipoGastoId"
                value={formData.TipoGastoId || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    TipoGastoId: e.target.value,
                  }))
                }
                className="w-full border rounded px-2 py-1"
                required
              >
                <option value="">Seleccione...</option>
                {tiposGasto.map((tg) => (
                  <option key={tg.TipoGastoId} value={tg.TipoGastoId}>
                    {tg.TipoGastoDescripcion}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-4">
              <label className="block mb-1">Grupo de Gasto</label>
              <select
                name="TipoGastoGrupoId"
                value={formData.TipoGastoGrupoId || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    TipoGastoGrupoId: e.target.value,
                  }))
                }
                className="w-full border rounded px-2 py-1"
                required
              >
                <option value="">Seleccione...</option>
                {gruposGasto.map((gg) => (
                  <option key={gg.TipoGastoGrupoId} value={gg.TipoGastoGrupoId}>
                    {gg.TipoGastoGrupoDescripcion}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 justify-end">
              <ActionButton label="Guardar" type="submit" />
              <ActionButton
                label="Cancelar"
                onClick={() => setIsModalOpen(false)}
              />
            </div>
          </form>
        </div>
      )}
      {loading && <div>Cargando gastos...</div>}
      {error && <div className="text-red-500">{error}</div>}
    </div>
  );
}
