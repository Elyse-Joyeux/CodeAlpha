const express = require('express')
const auth = require('../middleware/auth')
const { getMe, updateMe, listUsers, getProfile, toggleFollow } = require('../controllers/userController')


const router = express.Router()
router.get('/me', auth, getMe)
router.patch('/me', auth, updateMe)
router.get('/users', auth, listUsers)
router.get('/users/:username', auth, getProfile)
router.post('/users/:id/follow', auth, toggleFollow)



module.exports = router;