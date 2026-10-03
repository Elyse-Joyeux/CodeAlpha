const router = require('express').Router()
const c = require('../controllers/reservationController')
const A = require('../utils/asyncHandler')


router.param('id', require('../middleware/validateId'))
router.post('/', A(c.create))
router.get('/', A(c.list))
router.delete('/:id', A(c.cancel))


module.exports = router;