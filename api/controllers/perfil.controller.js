const Perfil = require("../models/perfil.model");

exports.getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const itemsPerPage = parseInt(req.query.itemsPerPage) || 10;
    const result = await Perfil.getAllPaginated(page, itemsPerPage);
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const perfil = await Perfil.getById(req.params.id);
    if (!perfil)
      return res.status(404).json({ message: "Perfil no encontrado" });
    res.json(perfil);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const perfil = await Perfil.create(req.body);
    res.status(201).json(perfil);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const perfil = await Perfil.update(req.params.id, req.body);
    res.json(perfil);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await Perfil.delete(req.params.id);
    res.json({ message: "Perfil eliminado" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
