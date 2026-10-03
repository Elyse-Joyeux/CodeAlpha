const router = require('express').Router()
const admin = require('../controllers/adminController');
const menu = require('../controllers/menuController')
const A = require('../utils/asyncHandler')
const { requireAdmin } = require('../middleware/auth')


router.use(requireAdmin)
router.param('id', require('../middleware/validateId'))

router.get('/reports/daily', A(admin.dailyReport));
router.get('/alerts', A(admin.alerts))

router.get('/inventory', A(admin.listInventory))
router.post('/inventory', A(admin.createInventory))
router.patch('/inventory/:id', A(admin.updateInventory))
router.delete('/inventory/:id', A(admin.removeInventory))

router.post('/menu', A(menu.create))
router.patch('/menu/:id', A(menu.update))
router.delete('/menu/:id', A(menu.remove))


module.exports = router;
