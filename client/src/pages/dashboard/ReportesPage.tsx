import React, { useState } from "react";
import { usePermiso } from "../../hooks/usePermiso";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  getEstadisticasJugadores,
  getResumenGeneral,
  getTopJugadores,
  type EstadisticaJugador,
  type ResumenGeneral,
} from "../../services/reportes.service";

const ReportesPage: React.FC = () => {
  const puedeLeer = usePermiso("REPORTES", "leer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingType, setLoadingType] = useState<string | null>(null);

  if (!puedeLeer) return <div>No tienes permiso para ver los reportes</div>;

  // Función para generar PDF de estadísticas de jugadores
  const handleGenerarEstadisticasJugadores = async () => {
    setLoading(true);
    setLoadingType("estadisticas");
    setError(null);
    try {
      const response = await getEstadisticasJugadores(1, 1000);
      const jugadores: EstadisticaJugador[] = response.data || [];

      // Ordenar jugadores por nombre
      const jugadoresOrdenados = jugadores.sort((a, b) => {
        const nombreA = a.ClienteNombre.toLowerCase();
        const nombreB = b.ClienteNombre.toLowerCase();
        return nombreA.localeCompare(nombreB);
      });

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Estadísticas de Jugadores", 14, 18);

      const rows = jugadoresOrdenados.map((j) => [
        j.ClienteId,
        `${j.ClienteNombre} ${j.ClienteApellido}`,
        j.totalPartidos.toString(),
        j.partidosGanados.toString(),
        j.partidosPerdidos.toString(),
        `${j.porcentajeVictorias}%`,
      ]);

      autoTable(doc, {
        head: [
          ["ID", "JUGADOR", "PARTIDOS", "GANADOS", "PERDIDOS", "% VICTORIAS"],
        ],
        body: rows,
        startY: 28,
        theme: "grid",
        headStyles: { fillColor: [59, 130, 246] },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
      });

      doc.save("estadisticas_jugadores.pdf");
    } catch {
      setError("Error al generar el PDF de estadísticas de jugadores");
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  // Función para generar PDF de resumen general
  const handleGenerarResumenGeneral = async () => {
    setLoading(true);
    setLoadingType("resumen");
    setError(null);
    try {
      const response = await getResumenGeneral();
      const resumen: ResumenGeneral = response.data;

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Resumen General del Sistema", 14, 18);

      let y = 35;
      doc.setFontSize(12);
      doc.text(`Total de Partidos: ${resumen.totalPartidos}`, 14, y);
      y += 8;
      doc.text(`Total de Jugadores: ${resumen.totalJugadores}`, 14, y);
      y += 8;
      doc.text(`Partidos Finalizados: ${resumen.partidosFinalizados}`, 14, y);
      y += 8;
      doc.text(`Partidos Pendientes: ${resumen.partidosPendientes}`, 14, y);
      y += 8;
      doc.text(
        `Promedio de Jugadores por Partido: ${parseFloat(
          String(resumen.promedioJugadoresPorPartido || "0")
        ).toFixed(2)}`,
        14,
        y
      );

      doc.save("resumen_general.pdf");
    } catch {
      setError("Error al generar el PDF de resumen general");
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  // Función para generar PDF de top jugadores por partidos jugados
  const handleGenerarTopPartidos = async () => {
    setLoading(true);
    setLoadingType("top-partidos");
    setError(null);
    try {
      const response = await getTopJugadores("totalPartidos", 20);
      const jugadores: EstadisticaJugador[] = response.data || [];

      // Ordenar jugadores por total de partidos (descendente) y luego por nombre en caso de empate
      const jugadoresOrdenados = jugadores.sort((a, b) => {
        // Primero por total de partidos (descendente)
        if (b.totalPartidos !== a.totalPartidos) {
          return b.totalPartidos - a.totalPartidos;
        }
        // En caso de empate, ordenar por nombre
        const nombreA = a.ClienteNombre.toLowerCase();
        const nombreB = b.ClienteNombre.toLowerCase();
        return nombreA.localeCompare(nombreB);
      });

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Top 20 - Más Partidos Jugados", 14, 18);

      const rows = jugadoresOrdenados.map((j, index) => [
        (index + 1).toString(),
        `${j.ClienteNombre} ${j.ClienteApellido}`,
        j.totalPartidos.toString(),
        j.partidosGanados.toString(),
        `${j.porcentajeVictorias}%`,
      ]);

      autoTable(doc, {
        head: [["#", "JUGADOR", "PARTIDOS", "GANADOS", "% VICTORIAS"]],
        body: rows,
        startY: 28,
        theme: "grid",
        headStyles: { fillColor: [16, 185, 129] },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
      });

      doc.save("top_partidos_jugados.pdf");
    } catch {
      setError("Error al generar el PDF de top jugadores");
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  // Función para generar PDF de top jugadores por victorias
  const handleGenerarTopVictorias = async () => {
    setLoading(true);
    setLoadingType("top-victorias");
    setError(null);
    try {
      const response = await getTopJugadores("partidosGanados", 20);
      const jugadores: EstadisticaJugador[] = response.data || [];

      // Ordenar jugadores por victorias (descendente) y luego por nombre en caso de empate
      const jugadoresOrdenados = jugadores.sort((a, b) => {
        // Primero por victorias (descendente)
        if (b.partidosGanados !== a.partidosGanados) {
          return b.partidosGanados - a.partidosGanados;
        }
        // En caso de empate, ordenar por nombre
        const nombreA = a.ClienteNombre.toLowerCase();
        const nombreB = b.ClienteNombre.toLowerCase();
        return nombreA.localeCompare(nombreB);
      });

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Top 20 - Más Victorias", 14, 18);

      const rows = jugadoresOrdenados.map((j, index) => [
        (index + 1).toString(),
        `${j.ClienteNombre} ${j.ClienteApellido}`,
        j.partidosGanados.toString(),
        j.totalPartidos.toString(),
        `${j.porcentajeVictorias}%`,
      ]);

      autoTable(doc, {
        head: [["#", "JUGADOR", "VICTORIAS", "PARTIDOS", "% VICTORIAS"]],
        body: rows,
        startY: 28,
        theme: "grid",
        headStyles: { fillColor: [239, 68, 68] },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
      });

      doc.save("top_victorias.pdf");
    } catch {
      setError("Error al generar el PDF de top victorias");
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  // Función para generar PDF de top jugadores por porcentaje de victorias
  const handleGenerarTopPorcentaje = async () => {
    setLoading(true);
    setLoadingType("top-porcentaje");
    setError(null);
    try {
      const response = await getTopJugadores("porcentajeVictorias", 20);
      const jugadores: EstadisticaJugador[] = response.data || [];

      // Ordenar jugadores por porcentaje de victorias (descendente) y luego por nombre en caso de empate
      const jugadoresOrdenados = jugadores.sort((a, b) => {
        // Primero por porcentaje de victorias (descendente)
        if (b.porcentajeVictorias !== a.porcentajeVictorias) {
          return b.porcentajeVictorias - a.porcentajeVictorias;
        }
        // En caso de empate, ordenar por nombre
        const nombreA = a.ClienteNombre.toLowerCase();
        const nombreB = b.ClienteNombre.toLowerCase();
        return nombreA.localeCompare(nombreB);
      });

      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text("Top 20 - Mejor Porcentaje de Victorias", 14, 18);

      const rows = jugadoresOrdenados.map((j, index) => [
        (index + 1).toString(),
        `${j.ClienteNombre} ${j.ClienteApellido}`,
        `${j.porcentajeVictorias}%`,
        j.partidosGanados.toString(),
        j.totalPartidos.toString(),
      ]);

      autoTable(doc, {
        head: [["#", "JUGADOR", "% VICTORIAS", "VICTORIAS", "PARTIDOS"]],
        body: rows,
        startY: 28,
        theme: "grid",
        headStyles: { fillColor: [168, 85, 247] },
        styles: { fontSize: 10 },
        margin: { left: 14, right: 14 },
      });

      doc.save("top_porcentaje_victorias.pdf");
    } catch {
      setError("Error al generar el PDF de top porcentaje");
    } finally {
      setLoading(false);
      setLoadingType(null);
    }
  };

  return (
    <div className="container mx-auto px-4">
      <h1 className="text-4xl font-bold mb-8 text-center">Reportes</h1>

      {/* Reportes de Jugadores */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">
          Reportes de Jugadores
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-lg text-lg shadow transition disabled:opacity-50"
            onClick={handleGenerarEstadisticasJugadores}
            disabled={loading}
          >
            {loadingType === "estadisticas"
              ? "Generando..."
              : "ESTADÍSTICAS DE JUGADORES"}
          </button>

          <button
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 px-6 rounded-lg text-lg shadow transition disabled:opacity-50"
            onClick={handleGenerarResumenGeneral}
            disabled={loading}
          >
            {loadingType === "resumen" ? "Generando..." : "RESUMEN GENERAL"}
          </button>
        </div>
      </div>

      {/* Reportes de Rankings */}
      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-4 text-gray-800">
          Rankings de Jugadores
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-lg text-lg shadow transition disabled:opacity-50"
            onClick={handleGenerarTopPartidos}
            disabled={loading}
          >
            {loadingType === "top-partidos"
              ? "Generando..."
              : "TOP - MÁS PARTIDOS"}
          </button>

          <button
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-6 rounded-lg text-lg shadow transition disabled:opacity-50"
            onClick={handleGenerarTopVictorias}
            disabled={loading}
          >
            {loadingType === "top-victorias"
              ? "Generando..."
              : "TOP - MÁS VICTORIAS"}
          </button>

          <button
            className="bg-violet-600 hover:bg-violet-700 text-white font-bold py-4 px-6 rounded-lg text-lg shadow transition disabled:opacity-50"
            onClick={handleGenerarTopPorcentaje}
            disabled={loading}
          >
            {loadingType === "top-porcentaje"
              ? "Generando..."
              : "TOP - MEJOR % VICTORIAS"}
          </button>
        </div>
      </div>

      {/* Estados de carga y error */}
      {loading && (
        <div className="text-center py-4">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-lg">
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            Generando PDF...
          </div>
        </div>
      )}

      {error && (
        <div className="text-center py-4">
          <div className="inline-flex items-center px-4 py-2 bg-red-100 text-red-800 rounded-lg">
            <svg
              className="w-5 h-5 mr-2"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportesPage;
