const inventory = require('../services/inventoryService')
const reports = require('../services/reportService')

exports.dailyReport = async (req, res) => 
    res.json(await reports.daily(req.query.date));

exports.alerts = async (req, res) =>
    res.json(await inventory.lowStock())

exports.listInventory = async (req, res) =>
    res.json(await inventory.list())

exports.createInventory = async (req, res) =>
    res.status(201).json(await inventory.create(req.body))

exports.updateInventory = async (req, res) =>
    res.json(await inventory.update(req.params.id, req.body))

exports.removeInventory = async (req, res) => {
    await inventory.remove(req.params.id)
    res.json({ ok: true })
}