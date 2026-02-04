import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Heart, MessageCircle } from "lucide-react"
import HeartBrokenIcon from '@mui/icons-material/HeartBroken';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";

import { useAuth } from "./AuthContext";
import api from "../api";
import { toast } from "sonner";




// Each Post is a seperate component, so all hooks/states are SELF CONTAINED
export default function Post({ post, canEditAndDelete = false, onDelete, onEdit }) {
  const { user, isAuthenticated } = useAuth()
  const [likes, setLikes] = useState(post.likes)
  const [liked, setLiked] = useState(post.liked)
  const [likers, setLikers] = useState([])
  const [showLikers, setShowLikers] = useState(false)

  const [commentData, setCommentData] = useState([])
  const [showComments, setShowComments] = useState(false)
  const [newComment, setNewComment] = useState("")
  const [commentCount, setCommentCount] = useState(post.comments)

  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState("");

  const textareaRef = useRef(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.selectionStart = textareaRef.current.value.length;
      textareaRef.current.selectionEnd = textareaRef.current.value.length;
    }
  }, [editing]);

  // Optimistic likes
  async function handleLike(postId) {
    if (!isAuthenticated) return

      // optimistic update
      setLikes(prev => prev + (liked ? -1 : 1))
      setLiked(prev => !prev)

    try {
      const res = await api.post(`/posts/${postId}/like`)

      // This is not optimistic because a like has to be posted.
      setLikes(res.data.likes)
      setLiked(res.data.liked)
    } catch (err) {
      console.error("Error toggling like", err)
      toast.error(err.response?.data?.error || "Could not like this post, please try again")

      // rollback to previous state
      setLikes(prev => prev + (liked ? 1 : -1))
      setLiked(prev => !prev)
    }
  }

  async function handleShowLikers(postId) {
    if (!isAuthenticated) return
    try {
      const res = await api.get(`/posts/${postId}/likers`)
      setLikers(res.data)
      setShowLikers(true)
    } catch (err) {
      console.error("Error fetching likers", err)
      toast.error(err.response?.data?.error || "Something went wrong, try again")
    }
  }

  // Keeping the immediate fetch strategy.
  async function handleShowComments(postId) {
    // If already visible, hide it.
    if (showComments) {
      setShowComments(false)
      return
    }

    try {
      const res = await api.get(`/posts/${postId}/comments`)
      setCommentData(res.data) // Use spread operator to keep prev state but add current postId comments
      setShowComments(true)
    } catch (err) {
      console.error("Error fetching comments", err)
      toast.error(err.response?.data?.error || "Could not load comments, try again")
    }
  }

  async function handleNewComment(postId) {
    if (!newComment || newComment.trim() === "") {
      toast.error("Comment cannot be empty")
      return
    }

    try {
      const res = await api.post(`/posts/${postId}/comments`, { content: newComment})
      const comment = res.data
      // This is not optimistic, it ensures the promise is fulfilled before changing state.
      // Truly optimistic does it before promise being fulfilled, like your likes.
      setCommentData(prev => ([
        ...prev, 
        comment // Set previous postId comment state/empty and add new comment
      ]))
      setCommentCount(prev => prev + 1)

      // Clear only this post's input
      setNewComment("")
    } catch (err) {
      console.error("Error posting comment", err)
      toast.error(err.response?.data?.error || "Could not post comment, try again")
    }
  }

  {/* ONLY IF USER == PROFILE USER, ONLY FROM PROFILE PAGE */}


  // save edit → call parent
  function handleSave(postId) {
    onEdit?.(postId, editContent);
    setEditing(false);
  }

  async function handleDelete(postId) {
    try {
      await api.delete(`/posts/${postId}/delete`)
      onDelete?.(postId)  // tell parent to remove from state, i.e profile page
    } catch (err) {
      toast.error(err.response?.data?.error || "Could not delete post")
    }
  }

  {/* ONLY IF USER == PROFILE USER, ONLY FROM PROFILE PAGE */}


  return (
    <>
      <Card className="w-full max-w-lg mx-auto mb-4 shadow-sm rounded-2xl">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span className="font-bold" >
              <Link
                to={`/profile/${post.user.username}`}
                className="!text-black !hover:underline"
              >
                {post.user.username}
              </Link>
            </span>
            <span className="text-sm text-gray-500">{formatTime(post.timestamp)}</span>
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {editing ? (
            <div>
              <textarea
                ref={textareaRef}
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full border rounded p-2"
              />
              <div className="flex gap-2 mt-2 mb-4">
                <button onClick={() => handleSave(post.id)} className="px-3 py-1 bg-green-500 text-white rounded hover:!border-green-500 hover:!text-green-100">Save</button>
                <button onClick={() => setEditing(false)} className="px-3 py-1 bg-gray-300 text-white rounded">Cancel</button>
              </div>
            </div>
          ) :  (
              <>
                <p className="mb-8 text-left">{post.content}</p>
                {canEditAndDelete && (
                  <div className="flex gap-2 mt-2 mb-4">
                    <button onClick={() => {
                      setEditContent(post.content)
                      setEditing(true)
                    }} 
                      className="px-3 py-1 bg-yellow-500 text-white rounded hover:!border-blue-500 hover:!text-blue-100"
                    >
                        Edit
                    </button>
                    <button onClick={() => handleDelete(post.id)} className="px-3 py-1 border hover:!border-red-500 text-red-500 hover:!bg-red-50 rounded">Delete</button>
                  </div>
                )}
              </>
          )}
          
          <div className="flex items-center text-sm text-gray-600">
            {/* Like button */}
            <Button
              variant="naked"
              size="tight"
              className="text-gray-600 hover:text-black !p-0 h-5"
              onClick={() => handleLike(post.id)}
              disabled = { !isAuthenticated }
            >
              {liked ? (
                <Heart className="w-5 h-5 text-red-500 fill-red-500" /> 
              ) : (
                <Heart className="w-5 h-5" />
              )}
            </Button>
            <span 
            className="pl-2 pr-4 cursor-pointer"
            onClick={() => handleShowLikers(post.id)}>
              {likes} likes
            </span>

            {/* Comment button */}
            <Button
              variant="naked"
              size="tight"
              className="text-gray-600 hover:text-black !p-0 h-5"
              onClick={() => handleShowComments(post.id)}
            >
              <MessageCircle className="w-5 h-5" style={{ color: "currentColor" }}/>
            </Button>
            <span 
            className="pl-2 cursor-pointer"
            onClick={() => handleShowComments(post.id)}>
              {commentCount} comments
            </span>
          </div>
          
          {/* Comments dropdown */}
          {showComments && (
            <div className="mt-4 border-t pt-2">
              {isAuthenticated && (
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    className="flex-1 border rounded px-2 py-1 text-sm"
                    placeholder="Write a comment..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <Button size="sm" onClick={() => handleNewComment(post.id)}>
                    Post
                  </Button>
                </div>
              )}
              {commentData.length === 0 ? (
                <p className="text-sm text-gray-500">Be the first one to comment!</p>
              ) : (
                <ul className="list-unstyled text-left space-y-2">
                  {commentData.map((c, i) => (
                    <li key={i} className="text-sm">
                      <span className="font-bold">{c.user}:</span> {c.content}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog box to show likers */}
      <Dialog open={showLikers} onOpenChange={setShowLikers}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Liked by</DialogTitle>          
            <DialogDescription className="sr-only">
              Users who liked this post
            </DialogDescription>
          </DialogHeader>
            {likers.length === 0 ? (
              <p className="text-sm text-gray-500">
                Be the first one to like this post!
              </p>
            ) : (
              <ul className="space-y-2">
                {likers.map((liker, index) => (
                  <li key={index}>
                    <Link
                      to={`/profile/${liker.username}`}
                      className="text-blue-600 hover:underline"
                    >
                      {liker.username}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
        </DialogContent>
      </Dialog>
    </>
  )
}

// helper to format timestamps
function formatTime(timestamp) {
  const date = new Date(timestamp)
  return date.toLocaleString([], { dateStyle: "medium", timeStyle: "short" })
}
