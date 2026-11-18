const Producto = require("../models/producto.model");
const {
  obtenerMiniatura,
  invalidarMiniaturas,
} = require("../utils/miniaturaProducto");
const { optimizarImagen } = require("../utils/optimizarImagen");

// La foto llega en base64: se achica antes de guardarla, para que la base no
// crezca aunque el cliente mande el original (versiones viejas del front,
// formatos que el navegador no pudo procesar)
async function optimizarImagenDelBody(body) {
  if (typeof body.ProductoImagen !== "string" || body.ProductoImagen === "") {
    return body;
  }
  const original = Buffer.from(body.ProductoImagen, "base64");
  const optimizada = await optimizarImagen(original);
  return { ...body, ProductoImagen: optimizada.toString("base64") };
}

// No devolver la foto en la respuesta (el cliente la pide aparte)
const sinImagen = (producto) => {
  if (!producto || typeof producto !== "object") return producto;
  // eslint-disable-next-line no-unused-vars
  const { ProductoImagen, ...resto } = producto;
  return resto;
};

// getAllProductos
exports.getAllProductos = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "ProductoId";
    const sortOrder = req.query.sortOrder || "ASC";
    const { productos, total } = await Producto.getAllPaginated(
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: productos,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// searchProductos
exports.searchProductos = async (req, res) => {
  try {
    const { q: searchTerm } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || "ProductoId";
    const sortOrder = req.query.sortOrder || "ASC";
    if (!searchTerm || searchTerm.trim() === "") {
      return res
        .status(400)
        .json({ error: "El término de búsqueda no puede estar vacío" });
    }
    const { productos, total } = await Producto.search(
      searchTerm,
      limit,
      offset,
      sortBy,
      sortOrder
    );
    res.json({
      data: productos,
      pagination: {
        totalItems: total,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
        itemsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// getProductoById
exports.getProductoById = async (req, res) => {
  try {
    let producto = await Producto.getById(req.params.id);
    if (!producto) {
      return res.status(404).json({ message: "Producto no encontrado" });
    }
    res.json(producto);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// createProducto
exports.createProducto = async (req, res) => {
  try {
    // Validación básica de campos requeridos
    const camposRequeridos = [
      "ProductoCodigo",
      "ProductoNombre",
      "ProductoPrecioVenta",
      "LocalId",
    ];
    for (const campo of camposRequeridos) {
      if (
        req.body[campo] === undefined ||
        req.body[campo] === null ||
        (typeof req.body[campo] === "string" && req.body[campo].trim() === "")
      ) {
        return res.status(400).json({
          success: false,
          message: `El campo ${campo} es requerido`,
        });
      }
    }
    // Crear producto
    const nuevoProducto = await Producto.create(
      await optimizarImagenDelBody(req.body)
    );
    res.status(201).json({
      success: true,
      data: sinImagen(nuevoProducto),
      message: "Producto creado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al crear producto",
      error: error.message,
    });
  }
};

// updateProducto
exports.updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const productoData = req.body;
    if (!productoData.ProductoNombre) {
      return res.status(400).json({
        success: false,
        message: "ProductoNombre es un campo requerido",
      });
    }
    const updatedProducto = await Producto.update(
      id,
      await optimizarImagenDelBody(productoData)
    );
    invalidarMiniaturas(id);
    if (!updatedProducto) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }
    res.json({
      success: true,
      data: updatedProducto,
      message: "Producto actualizado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al actualizar producto",
      error: error.message,
    });
  }
};

// deleteProducto
exports.deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Producto.delete(id);
    invalidarMiniaturas(id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: "Producto no encontrado",
      });
    }
    res.json({
      success: true,
      message: "Producto eliminado exitosamente",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error al eliminar producto",
      error: error.message,
    });
  }
};

// Obtener todos los productos sin paginación
exports.getAllProductosSinPaginacion = async (req, res) => {
  try {
    const productos = await Producto.getAll();
    res.json({ data: productos });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Detecta el tipo de imagen por sus primeros bytes
function tipoImagen(buffer) {
  if (buffer[0] === 0x89 && buffer[1] === 0x50) return "image/png";
  if (buffer[0] === 0x47 && buffer[1] === 0x49) return "image/gif";
  if (buffer.slice(0, 4).toString() === "RIFF") return "image/webp";
  return "image/jpeg";
}

// Devuelve la imagen del producto reducida (?ancho=96|160|320|640|1200).
// "no-cache" + ETag: el navegador la guarda pero revalida, así una foto
// editada se ve al instante y una sin cambios responde 304 sin cuerpo.
exports.getProductoImagen = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ error: "Id inválido" });

    const imagen = await obtenerMiniatura(id, req.query.ancho, Producto.getImagen);
    if (!imagen) return res.status(404).end();

    res.set({
      "Content-Type": tipoImagen(imagen.buffer),
      "Cache-Control": "private, no-cache",
      ETag: imagen.etag,
    });
    if (req.headers["if-none-match"] === imagen.etag) {
      return res.status(304).end();
    }
    res.send(imagen.buffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
