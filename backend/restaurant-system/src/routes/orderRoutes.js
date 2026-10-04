const router = require('express').Router()
const c = require('../controllers/orderController')
const A = require('../utils/asyncHandler')
const { requireAdmin } = require('../middleware/auth')



router.param('id', require('../middleware/validateId'));
router.post('/', A(c.place))
router.get('/', A(c.list))
router.patch('/:id/status', (req, res, next) => {
  // Recording payment is a customer action; order preparation stays with staff.
  if (req.body.status === 'paid') return next()
  return requireAdmin(req, res, next)
}, A(c.setStatus))


module.exports = router;
