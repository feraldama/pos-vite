import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  obtenerUrlImagenProducto,
  suscribirCambiosImagen,
  versionImagenProducto,
} from "../../services/imagenProducto.service";

interface Props {
  productoId: number;
  /** false = el producto no tiene foto: no se hace ningún pedido. */
  tieneImagen?: boolean;
  /** Ancho a pedir en px; conviene ~2x el tamaño en pantalla. */
  ancho?: number;
  alt: string;
  className?: string;
  /** Imagen a mostrar si no hay foto. Sin esto se muestra "Sin imagen". */
  fallback?: string;
}

function ImagenProducto({
  productoId,
  tieneImagen = true,
  ancho = 160,
  alt,
  className = "",
  fallback,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [src, setSrc] = useState<string | null>(null);
  const [error, setError] = useState(false);
  // Cambia cuando se edita la foto de este producto: fuerza a pedirla de nuevo
  const version = useSyncExternalStore(suscribirCambiosImagen, () =>
    versionImagenProducto(productoId)
  );

  // Solo se pide la imagen cuando el elemento está por entrar en pantalla:
  // en grillas con cientos de productos no se bajan las que no se ven
  useEffect(() => {
    if (!tieneImagen || visible) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((e) => e.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [tieneImagen, visible]);

  useEffect(() => {
    setSrc(null);
    setError(false);
    if (!tieneImagen || !visible) return;
    let vigente = true;
    obtenerUrlImagenProducto(productoId, ancho).then((url) => {
      if (!vigente) return;
      if (url) setSrc(url);
      else setError(true);
    });
    return () => {
      vigente = false;
    };
  }, [productoId, ancho, tieneImagen, visible, version]);

  if (src) {
    return <img src={src} alt={alt} className={className} decoding="async" />;
  }
  if (!tieneImagen || error) {
    if (fallback) return <img src={fallback} alt={alt} className={className} />;
    return (
      <div
        className={`${className} flex items-center justify-center bg-gray-200 text-xs text-gray-500`}
      >
        Sin imagen
      </div>
    );
  }
  // Cargando
  return (
    <div
      ref={ref}
      role="img"
      aria-label={alt || undefined}
      className={`${className} animate-pulse bg-gray-200`}
    />
  );
}

export default ImagenProducto;
