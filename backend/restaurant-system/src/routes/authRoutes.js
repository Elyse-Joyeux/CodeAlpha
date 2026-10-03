const router = require('express').Router()


router.post('/login', require('../controllers/authController').login)


module.exports = router;