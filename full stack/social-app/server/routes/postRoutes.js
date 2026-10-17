const express = require('express')
const auth = require('../middleware/auth')
const { listPosts, createPost, deletePost, toggleLike, addComment } = require('../controllers/postContoller')


const router = express.Router()
router.get('/posts', auth, listPosts)
router.post('/posts', auth, createPost)
router.delete('/posts/:id', auth, deletePost)
router.post('/posts/:id/like', auth, toggleLike)
router.post('/posts/:id/comments', auth, addComment)



module.exports = router;
