import Post from "../components/Post";
import { useEffect, useState, useRef } from "react"
import { Loader2 } from "lucide-react";
import axios from "axios"
import api from "../api";


export default function Following() {
  const [posts, setPosts] = useState([])
  // For infinite scroll
  const [nextPage, setNextPage] = useState(null)
  const [loading, setLoading] = useState(false)

  const loaderRef = useRef(null)
  

  // On mount
  useEffect(() => {

    api.get("/get_posts/following")
      .then(res => {
        setLoading(true)
        // DRF pagination response has `results`
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

  useEffect(() => {
    if (!loaderRef.current) return

    // Creates an observer to observe the sentinel div at the end of the page.
    // If the observee is found, call loadMore();
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && nextPage) loadMore();
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
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">
          People you follow
        </h1>
        {posts.length === 0 ? (
          <p className="text-gray-500">No posts yet.</p>
        ) : (
          <div className="space-y-4">
            {posts.map(p => <Post key={p.id} post={p} />)}
          </div>
        )}
      </div>
      <div ref={loaderRef} className="flex flex-col justify-center items-center py-6">
        {loading && <Loader2 className="h-6 w-6 animate-spin text-gray-500" />}
        {!nextPage && !loading && (
          <p className="text-sm text-gray-400 text-center mt-2">
            You're all caught up! 🚀
          </p>
        )}
      </div>
    </>
  )
}