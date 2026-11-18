import { useState } from "react";
import { activarConTeclado } from "../../utils/teclado";
import Modal from "../../components/common/Modal";
import ActionButton from "../../components/common/Button/ActionButton";
import { PencilSquareIcon, ScissorsIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../contexts/useAuth";
import {
  getAlquileresProximosEntrega,
  getAlquileresProximosDevolucion,
  updateEstadoAlquiler,
  getAlquilerById,
} from "../../services/alquiler.service";
import { formatCurrency } from "../../utils/formato";
import { describirFiltro } from "../../utils/filtroFechas";
import FiltroRangoFechas from "../../components/alquileres/FiltroRangoFechas";
import CabeceraSeccionAlquileres from "../../components/alquileres/CabeceraSeccionAlquileres";
import { useSeccionAlquileres } from "../../hooks/useSeccionAlquileres";
import Swal from "sweetalert2";

interface AlquilerPrenda {
  ProductoNombre: string;
  ProductoCodigo: string;
  TipoPrendaNombre: string;
  AlquilerPrendasPrecio: number;
  ProductoImagen?: string;
  AlquilerPrendasObservacion?: string;
}

interface Alquiler {
  AlquilerId: number;
  ClienteId: number;
  AlquilerFechaAlquiler: string;
  AlquilerFechaEntrega?: string;
  AlquilerFechaDevolucion?: string;
  AlquilerEstado: string;
  AlquilerTotal: number;
  AlquilerEntrega: number;
  AlquilerDescuento?: number;
  ClienteNombre?: string;
  ClienteApellido?: string;
  ClienteTelefono?: string;
  ClienteRUC?: string;
  prendas: AlquilerPrenda[];
}

// Texto breve para lectores de pantalla al cambiar la lista de una sección
// (en vez de leer la tabla entera): "3 alquileres para "morales""
function anuncioSeccion(s: {
  visible: boolean;
  loading: boolean;
  busquedaAplicada: string;
  alquileres: unknown[];
  recortada: { limite: number } | null;
}) {
  if (!s.visible) return "";
  if (s.loading) return s.busquedaAplicada ? "Buscando..." : "";
  const n = s.alquileres.length;
  const cantidad = n === 1 ? "1 alquiler" : `${n} alquileres`;
  if (!s.busquedaAplicada) return cantidad;
  return `${cantidad} para "${s.busquedaAplicada}"${
    s.recortada ? `. Se muestran los primeros ${s.recortada.limite}` : ""
  }`;
}

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Se incrementa para forzar la recarga de ambas secciones
  const [recarga, setRecarga] = useState(0);
  const entrega = useSeccionAlquileres<Alquiler>(
    "Entrega",
    getAlquileresProximosEntrega,
    recarga
  );
  const devolucion = useSeccionAlquileres<Alquiler>(
    "Devolucion",
    getAlquileresProximosDevolucion,
    recarga
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentAlquiler, setCurrentAlquiler] = useState<Alquiler | null>(null);
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<string>("");

  // El voucher es descuento: no suma a lo entregado pero reduce el saldo
  const calcularSaldo = (alquiler: Alquiler) =>
    (alquiler.AlquilerTotal || 0) -
    (alquiler.AlquilerEntrega || 0) -
    (alquiler.AlquilerDescuento || 0);

  const formatearFecha = (fecha: string | null | undefined) => {
    if (!fecha) return "-";
    return new Date(fecha).toLocaleDateString("es-PY");
  };

  const handleAlquilerClick = async (alquiler: Alquiler) => {
    try {
      // Obtener el alquiler completo con todos los datos
      const alquilerCompleto = await getAlquilerById(alquiler.AlquilerId);
      // El servicio puede devolver el objeto directamente o dentro de data
      const alquilerData =
        (alquilerCompleto as { data?: Alquiler }).data || alquilerCompleto;
      setCurrentAlquiler(alquilerData as Alquiler);
      setEstadoSeleccionado(
        (alquilerData as Alquiler).AlquilerEstado || "Pendiente"
      );
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error al cargar alquiler:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo cargar el alquiler",
      });
    }
  };

  // Abre la pantalla de alquiler con el carrito cargado para agregar,
  // quitar o ajustar prendas
  const editarPrendas = (alquilerId: number) => {
    navigate(`/alquileres-venta?editar=${alquilerId}`);
  };

  // Devueltos/cancelados ya no se modifican
  const esEditable = (alquiler: Alquiler) =>
    !["Devuelto", "Cancelado"].includes(alquiler.AlquilerEstado);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setCurrentAlquiler(null);
    setEstadoSeleccionado("");
  };

  // El generador de tickets arrastra jspdf (~350 KB). Se carga recién al
  // imprimir, no al abrir el dashboard.
  const handlePrintTicket = async () => {
    if (!currentAlquiler) return;
    const { generarTicketAlquiler, agruparPrendasTicket } = await import(
      "../../utils/ticketAlquiler"
    );
    generarTicketAlquiler({
      alquilerId: currentAlquiler.AlquilerId,
      cliente: {
        nombre: currentAlquiler.ClienteNombre || "",
        apellido: currentAlquiler.ClienteApellido || "",
        ruc: currentAlquiler.ClienteRUC || "",
      },
      fechaAlquiler: currentAlquiler.AlquilerFechaAlquiler,
      fechaEntrega: currentAlquiler.AlquilerFechaEntrega,
      fechaDevolucion: currentAlquiler.AlquilerFechaDevolucion,
      prendas: agruparPrendasTicket(currentAlquiler.prendas || []),
      total: currentAlquiler.AlquilerTotal || 0,
      entregado: currentAlquiler.AlquilerEntrega || 0,
      pagos: currentAlquiler.AlquilerDescuento
        ? { voucher: currentAlquiler.AlquilerDescuento }
        : undefined,
      esReimpresion: true,
    });
  };

  const handleUpdateEstado = async () => {
    if (!currentAlquiler) return;

    try {
      await updateEstadoAlquiler(
        currentAlquiler.AlquilerId,
        estadoSeleccionado
      );

      Swal.fire({
        icon: "success",
        title: "Éxito",
        text: "Estado del alquiler actualizado correctamente",
        timer: 2000,
        showConfirmButton: false,
      });

      handleCloseModal();
      setRecarga((n) => n + 1);
    } catch (error) {
      console.error("Error al actualizar alquiler:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "No se pudo actualizar el estado del alquiler",
      });
    }
  };

  return (
    <main className="py-6 px-6 space-y-12 bg-gray-100 w-full">
      {/* Sección de Bienvenida */}
      {user && (
        <section className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-800">Panel de Control</h1>
          <div className="mt-4">
            <h2 className="text-xl font-semibold text-blue-600">
              Bienvenido, {user.nombre}
            </h2>
            <p className="text-gray-600 mt-1">
              Este es tu panel de administración
            </p>
          </div>
        </section>
      )}

      {/* Sección de Alquileres Próximos a Entrega */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <CabeceraSeccionAlquileres
          id="entrega"
          titulo={
            entrega.busquedaAplicada
              ? "Alquileres Pendientes de Entrega"
              : `Alquileres Próximos a Entrega (${describirFiltro(entrega.filtro)})`
          }
          subtitulo={
            entrega.busquedaAplicada &&
            "Buscando en todos los alquileres pendientes de entrega, sin límite de fechas"
          }
          minimizada={entrega.minimizada}
          onToggleMinimizada={entrega.toggleMinimizada}
          busqueda={entrega.busqueda}
          onBusqueda={entrega.setBusqueda}
          acciones={
            !entrega.busquedaAplicada && (
              <FiltroRangoFechas
                id="filtro-entrega"
                filtro={entrega.filtro}
                onChange={entrega.setFiltro}
              />
            )
          }
        />
        <p role="status" className="sr-only">
          {anuncioSeccion(entrega)}
        </p>
        <div id="entrega-contenido">
          {!entrega.visible ? (
            <p className="text-sm text-gray-500">
              Lista minimizada. Buscá un cliente o expandila para verla completa.
            </p>
          ) : entrega.loading ? (
            <p className="text-gray-600">Cargando...</p>
          ) : entrega.alquileres.length === 0 ? (
            <p className="text-gray-600">
              {entrega.busquedaAplicada
                ? `No hay alquileres pendientes de entrega para "${entrega.busquedaAplicada}"`
                : "No hay alquileres próximos a entrega"}
            </p>
          ) : (
            <>
              {entrega.recortada && (
                <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Se muestran los primeros {entrega.recortada.limite} resultados.
                  Escribí más datos del cliente para acotar la búsqueda.
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Alquiler ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha Entrega
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prendas
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entrega
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saldo
                      </th>
                      <th className="px-4 py-3">
                        <span className="sr-only">Acciones</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {entrega.alquileres.map((alquiler) => (
                      <tr
                        key={alquiler.AlquilerId}
                        role="button"
                        tabIndex={0}
                        aria-label={`Editar alquiler ${alquiler.AlquilerId} de ${alquiler.ClienteNombre}`}
                        onClick={() => handleAlquilerClick(alquiler)}
                        onKeyDown={activarConTeclado(() =>
                          handleAlquilerClick(alquiler)
                        )}
                        className="cursor-pointer transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600"
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {alquiler.AlquilerId}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {alquiler.ClienteNombre} {alquiler.ClienteApellido}
                          {alquiler.ClienteRUC && (
                            <span className="block text-xs text-gray-500">
                              CI/RUC: {alquiler.ClienteRUC}
                            </span>
                          )}
                          {alquiler.ClienteTelefono && (
                            <span className="block text-xs text-gray-500">
                              {alquiler.ClienteTelefono}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>{formatearFecha(alquiler.AlquilerFechaEntrega)}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Estado:{" "}
                            <span className="font-semibold">
                              {alquiler.AlquilerEstado}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <div className="flex flex-wrap gap-2">
                            {alquiler.prendas.map((prenda, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 border rounded p-2 bg-gray-50"
                              >
                                {prenda.ProductoImagen ? (
                                  <img
                                    src={`data:image/jpeg;base64,${prenda.ProductoImagen}`}
                                    alt={prenda.ProductoNombre}
                                    className="w-16 h-16 object-contain rounded"
                                  />
                                ) : (
                                  <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                                    Sin imagen
                                  </div>
                                )}
                                <div className="text-xs">
                                  <div className="font-medium">
                                    {prenda.ProductoNombre}
                                  </div>
                                  <div className="text-gray-500">
                                    {prenda.TipoPrendaNombre}
                                  </div>
                                  {prenda.ProductoCodigo && (
                                    <div className="text-slate-500">
                                      {prenda.ProductoCodigo}
                                    </div>
                                  )}
                                  {prenda.AlquilerPrendasObservacion && (
                                    <div className="mt-1 max-w-[180px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                      ✂ {prenda.AlquilerPrendasObservacion}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(alquiler.AlquilerTotal)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(alquiler.AlquilerEntrega || 0)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(calcularSaldo(alquiler))}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          {esEditable(alquiler) && (
                            <button
                              type="button"
                              aria-label={`Editar prendas del alquiler ${alquiler.AlquilerId}`}
                              title="Editar prendas"
                              onClick={(e) => {
                                e.stopPropagation();
                                editarPrendas(alquiler.AlquilerId);
                              }}
                              onKeyDown={(e) => e.stopPropagation()}
                              className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-700 transition-colors duration-200 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                            >
                              <PencilSquareIcon aria-hidden="true" className="h-4 w-4" />
                              Editar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Sección de Alquileres Próximos a Devolución */}
      <section className="bg-white rounded-lg shadow-md p-6">
        <CabeceraSeccionAlquileres
          id="devolucion"
          titulo={
            devolucion.busquedaAplicada
              ? "Alquileres Pendientes de Devolución"
              : `Alquileres Próximos a Devolución (${describirFiltro(devolucion.filtro)})`
          }
          subtitulo={
            devolucion.busquedaAplicada
              ? "Buscando en todos los alquileres sin devolver, sin límite de fechas"
              : "Incluye siempre los atrasados sin devolver"
          }
          minimizada={devolucion.minimizada}
          onToggleMinimizada={devolucion.toggleMinimizada}
          busqueda={devolucion.busqueda}
          onBusqueda={devolucion.setBusqueda}
          acciones={
            !devolucion.busquedaAplicada && (
              <FiltroRangoFechas
                id="filtro-devolucion"
                filtro={devolucion.filtro}
                onChange={devolucion.setFiltro}
              />
            )
          }
        />
        <p role="status" className="sr-only">
          {anuncioSeccion(devolucion)}
        </p>
        <div id="devolucion-contenido">
          {!devolucion.visible ? (
            <p className="text-sm text-gray-500">
              Lista minimizada. Buscá un cliente o expandila para verla completa.
            </p>
          ) : devolucion.loading ? (
            <p className="text-gray-600">Cargando...</p>
          ) : devolucion.alquileres.length === 0 ? (
            <p className="text-gray-600">
              {devolucion.busquedaAplicada
                ? `No hay alquileres sin devolver para "${devolucion.busquedaAplicada}"`
                : "No hay alquileres próximos a devolución"}
            </p>
          ) : (
            <>
              {devolucion.recortada && (
                <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                  Se muestran los primeros {devolucion.recortada.limite} resultados.
                  Escribí más datos del cliente para acotar la búsqueda.
                </p>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Alquiler ID
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cliente
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha Devolución
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Prendas
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entrega
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saldo
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {devolucion.alquileres.map((alquiler) => (
                      <tr
                        key={alquiler.AlquilerId}
                        role="button"
                        tabIndex={0}
                        aria-label={`Editar alquiler ${alquiler.AlquilerId} de ${alquiler.ClienteNombre}`}
                        onClick={() => handleAlquilerClick(alquiler)}
                        onKeyDown={activarConTeclado(() =>
                          handleAlquilerClick(alquiler)
                        )}
                        className="cursor-pointer transition-colors duration-200 hover:bg-slate-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-600"
                      >
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {alquiler.AlquilerId}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {alquiler.ClienteNombre} {alquiler.ClienteApellido}
                          {alquiler.ClienteRUC && (
                            <span className="block text-xs text-gray-500">
                              CI/RUC: {alquiler.ClienteRUC}
                            </span>
                          )}
                          {alquiler.ClienteTelefono && (
                            <span className="block text-xs text-gray-500">
                              {alquiler.ClienteTelefono}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            {formatearFecha(alquiler.AlquilerFechaDevolucion)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Estado:{" "}
                            <span className="font-semibold">
                              {alquiler.AlquilerEstado}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-900">
                          <div className="flex flex-wrap gap-2">
                            {alquiler.prendas.map((prenda, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 border rounded p-2 bg-gray-50"
                              >
                                {prenda.ProductoImagen ? (
                                  <img
                                    src={`data:image/jpeg;base64,${prenda.ProductoImagen}`}
                                    alt={prenda.ProductoNombre}
                                    className="w-16 h-16 object-contain rounded"
                                  />
                                ) : (
                                  <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-500">
                                    Sin imagen
                                  </div>
                                )}
                                <div className="text-xs">
                                  <div className="font-medium">
                                    {prenda.ProductoNombre}
                                  </div>
                                  <div className="text-gray-500">
                                    {prenda.TipoPrendaNombre}
                                  </div>
                                  {prenda.ProductoCodigo && (
                                    <div className="text-slate-500">
                                      {prenda.ProductoCodigo}
                                    </div>
                                  )}
                                  {prenda.AlquilerPrendasObservacion && (
                                    <div className="mt-1 max-w-[180px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                                      ✂ {prenda.AlquilerPrendasObservacion}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(alquiler.AlquilerTotal)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(alquiler.AlquilerEntrega || 0)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                          {formatCurrency(calcularSaldo(alquiler))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Modal para editar estado del alquiler */}
      {isModalOpen && currentAlquiler && (
        <Modal
          open={isModalOpen}
          onClose={handleCloseModal}
          title={`Editar estado del alquiler #${currentAlquiler.AlquilerId}`}
          maxWidth="max-w-md"
          footer={
            <div className="flex w-full flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                <ActionButton
                  variant="success"
                  label="Reimprimir ticket"
                  onClick={handlePrintTicket}
                />
                {esEditable(currentAlquiler) && (
                  <ActionButton
                    variant="neutral"
                    label="Editar prendas"
                    icon={PencilSquareIcon}
                    onClick={() => editarPrendas(currentAlquiler.AlquilerId)}
                  />
                )}
              </div>
              <div className="flex gap-2">
                <ActionButton
                  variant="secondary"
                  label="Cancelar"
                  onClick={handleCloseModal}
                />
                <ActionButton label="Guardar" onClick={handleUpdateEstado} />
              </div>
            </div>
          }
        >
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-2">
                Cliente: {currentAlquiler.ClienteNombre}{" "}
                {currentAlquiler.ClienteApellido}
              </p>
              <p className="text-sm text-gray-600 mb-4">
                Estado actual:{" "}
                <span className="font-semibold">
                  {currentAlquiler.AlquilerEstado}
                </span>
              </p>
              {currentAlquiler.prendas?.some(
                (p) => p.AlquilerPrendasObservacion
              ) && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    Ajustes pendientes
                  </p>
                  <ul className="space-y-1">
                    {currentAlquiler.prendas
                      .filter((p) => p.AlquilerPrendasObservacion)
                      .map((p, index) => (
                        <li
                          key={index}
                          className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1"
                        >
                          <ScissorsIcon
                            aria-hidden="true"
                            className="mr-1 inline h-4 w-4 align-text-bottom"
                          />
                          <span className="font-medium">{p.ProductoNombre}:</span>{" "}
                          {p.AlquilerPrendasObservacion}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              <label
                htmlFor="alquiler-estado"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Nuevo Estado
              </label>
              <select
                id="alquiler-estado"
                value={estadoSeleccionado}
                onChange={(e) => setEstadoSeleccionado(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Entregado">Entregado</option>
                <option value="Devuelto">Devuelto</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
        </Modal>
      )}
    </main>
  );
}

export default Dashboard;
