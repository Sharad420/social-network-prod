import Post from "../components/Post";
import { useEffect, useState, useRef } from "react"
import { useAuth } from "../components/AuthContext";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button"
import axios from "axios"
import api from "../api";


// useRef basically gives a persistent reference to a DOM element that does NOT reset on re-renders, unlike useState. 
export default function Home() {
  const { isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([])
  const [newPost, setNewPost] = useState("")
  const [loadingNewPost, setLoadingNewPost] = useState(false)
  // For infinite scroll
  const [nextPage, setNextPage] = useState(null)
  const [loading, setLoading] = useState(false)

  const loaderRef = useRef(null)

  // On mount
  useEffect(() => {
    api.get("/get_posts/all")
      .then(res => {
        // DRF pagination response has `results`
        setLoading(true)
        setPosts(res.data.results || res.data.posts || [])
        setNextPage(res.data.next)
        setLoading(false)
      })
      .catch(err => {
        console.error("Error fetching posts:", err)
      })
  }, [])

  async function loadMore() {
    if (!nextPage || loading) return 
    setLoading(true)
    const res = await api.get(nextPage)
    setPosts(prev => [...prev, ...res.data.results]); // Append new posts
    setNextPage(res.data.next)
    setLoading(false)

  }

  async function handleNewPost() {
    if (!isAuthenticated) return
    if (newPost.trim() === "") return

    setLoadingNewPost(true)
    try {
      const res = await api.post(`/newpost`, { content : newPost })
      setPosts(prev => [res.data, ...prev]) // Prepend new post
      setNewPost("")
    } catch (err) {
      console.error("Trouble posting", err)
      toast.error(err.response?.data?.error || "Trouble posting, please try again")
    } finally {
      setLoadingNewPost(false)
    }
  }



  useEffect(() => {
    if (!loaderRef.current || !nextPage) return

    // Creates an observer to observe the sentinel div at the end of the page.
    // If the observee is found, call loadMore();
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) loadMore();
    });

    observer.observe(loaderRef.current);

    // Cleanup
    // Return only called in useEffect when there is a dep change OR unmount. 
    // So essentially when we move away this runs, else useEffect runs like normal.
    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current)
      }
      observer.disconnect();
    }
  }, [loadMore, nextPage])

  return (
    <>
       {isAuthenticated && <div className="w-full max-w-2xl mx-auto mb-4 p-4 border rounded-xl bg-white shadow-sm">
          <textarea
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            placeholder="Share your thoughts..."
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
          />
          <div className="flex justify-end mt-2">
            <Button
              onClick={handleNewPost}
              disabled={!newPost.trim() || loading}
              className="px-4 py-2"
            >
              {loading ? "Posting..." : "Post"}
            </Button>
          </div>
      </div>}
      <div className="p-4">
        {posts.length === 0 ? (
          <p className="text-gray-500">No posts yet.</p>
        ) : (
          posts.map(p => <Post key={p.id} post={p} />)
        )}
      </div>
      <div ref={loaderRef} className="flex justify-center items-center py-6">
        {nextPage && loading && (
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        )}
        {!nextPage && (
          <p className="text-sm text-gray-400">You're all caught up! 🚀</p>
        )}
      </div>
    </>
  )
}