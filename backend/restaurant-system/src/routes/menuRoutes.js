const router = require('express').Router();
const c = require('../controllers/menuController')
const A = require('../utils/asyncHandler')
router.get('/', A(c.list))


module.exports = router;