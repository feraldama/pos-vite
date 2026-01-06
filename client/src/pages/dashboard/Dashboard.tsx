// import React from "react";
import { useAuth } from "../../contexts/useAuth";

function Dashboard() {
  const { user } = useAuth();

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
    </main>
  );
}

export default Dashboard;
