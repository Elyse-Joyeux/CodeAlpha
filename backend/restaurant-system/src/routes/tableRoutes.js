const router = require('express').Router()
const c = require('../controllers/tableController')
const A = require('../utils/asyncHandler')


router.get('/', A(c.list))
router.get('/availability', A(c.availability))



module.exports = router;