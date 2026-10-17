function safeUser(user) {
  return {
    id: user._id,
    name: user.name,
    username: user.username,
    bio: user.bio,
    avatar: user.avatar,
    location: user.location,
    followers: user.followers?.length || 0,
    following: user.following?.length || 0,
    createdAt: user.createdAt,
  };
}

function shapePost(post, viewerId) {
  const viewer = String(viewerId);
  return {
    id: post._id,
    text: post.text,
    image: post.image,
    createdAt: post.createdAt,
    author: post.author
      ? {
          id: post.author._id,
          name: post.author.name,
          username: post.author.username,
          avatar: post.author.avatar,
        }
      : null,

    likes: post.likes.length,
    liked: post.likes.some((id) => String(id) === viewer),
    comments: post.comments.map((comment) => ({
      id: comment._id,
      text: comment.text,
      createdAt: comment.createdAt,
      author: comment.author
        ? {
            id: comment.author._id,
            name: comment.author.name,
            username: comment.author.username,
            avatar: comment.author.avatar,
          }
        : null,
    })),
  };
}

module.exports = { safeUser, shapePost };
