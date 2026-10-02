const menu = require('../services/menuService')

exports.list = async (req, res) => 
    res.json(await menu.listWithPortions())

exports.create = async (req, res) =>
    res.status(201).json(await menu.create(req.body))

exports.update = async (req, res) =>
    res.json(await menu.update(req.params.id, req.body))

exports.remove = async (req, res) => {
    await menu.remove(req.params.id);
    res.json({ ok: true })
}