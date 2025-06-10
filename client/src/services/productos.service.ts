import api from "./api";

export const getProductos = async (params = {}) => {
  const res = await api.get("/productos", { params });
  return res.data;
};

export const getProductosAll = async () => {
  const res = await api.get("/productos/all");
  return res.data;
};
