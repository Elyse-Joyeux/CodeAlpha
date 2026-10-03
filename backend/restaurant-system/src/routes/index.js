const router = require('express').Router()


router.use('/menu', require('./menuRoutes'))
router.use('/orders', require('./orderRoutes'))
router.use('/tables', require('./tableRoutes'))
router.use('/reservations', require('./reservationRoutes'))
router.use('/auth', require('./authRoutes'))
router.use('/admin', require('./adminRoutes'))



module.exports = router;