const router = require('express').Router()
const c = require('../controllers/orderController')
const A = require('id', require('../utils/asyncHandler'))



router.param('id', require('../middleware/validateId'))
router.post('/', A(c.place))
router.get('/', A(c.list))
router.path('/:id/status', A(c.setStatus))


module.exports = router;