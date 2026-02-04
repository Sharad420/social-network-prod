import { useParams, Link } from "react-router-dom";
import { useAuth } from "../components/AuthContext";
import { useState, useEffect } from "react"
import { Skeleton } from "../components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { toast } from "sonner";


import api from "../api";
import Post from "../components/Post";


// ⚠️ React Hooks must always be called in the same order on every render.
// Earlier, some useState hooks were declared **after a conditional return** for loading (`if (!profile) return ...`).
// On the first render, those hooks were skipped, and on subsequent renders they ran, causing React to throw:
// "React has detected a change in the order of Hooks called by Profile".
// ✅ Fix: always declare all hooks at the top of the component, before any return statements, and use safe initial values.
export default function Profile() {
    // Just assigns user to a local variable
    const { user: loggedInUser, isAuthenticated } = useAuth()
    // From route `profile/<username>` gets the username
    const { username } = useParams(); // Profile being viewed

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    // Other hooks for functionality.
    const [posts, setPosts] = useState(profile?.posts || []);
    const [followers, setFollowers] = useState(profile?.followers || 0);
    const [following, setFollowing] = useState(profile?.following || 0);
    const [isFollowing, setIsFollowing] = useState(profile?.is_following || false);

    const [followList, setFollowList] = useState([]);
    const [showFollowList, setShowFollowList] = useState(0);

    useEffect(() => {
        async function fetchProfile() {
	    setLoading(true);
	    setProfile(null);
            try {
                const res = await api.get(`/profile/${username}`);
                const data = res.data;

                setProfile(data);
                setPosts(data.posts || []);
                setFollowers(data.followers || 0);
                setFollowing(data.following || 0);
                setIsFollowing(data.is_following || false);
            } catch (err) {
                console.error("Error fetching profile:", err.response?.data?.error || err.message);
            } finally {
		setLoading(false);
	    }
        }
        fetchProfile();
    }, [username]);

    if (loading) return (
        <>
            <p>Loading profile...</p>
            <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                </div>
            </div>  
        </>
    )

    if (!profile) return (
	<>
	    <div className="flex flex-col items-center justify-center p-10">
	        <h1 className="text-2xl font-bold text-red-500">404 - Error</h1>
		<p className="text-gray-500">The user "{username}" does not exist on The Warp Network.</p>
	    </div>
	</>
    )

    const isOwnProfile = isAuthenticated && loggedInUser?.username === username;

    // Define your helper functions
    async function handleFollow() {
        try {
            const res = await api.post(`/profile/${username}/follow`)
            setFollowers(res.data?.followers)
            setIsFollowing(res.data?.is_following)
        } catch (err) {
            console.error("Unable to follow", err)
            toast.error(err.response?.data?.err || "Unable to follow, please try again")
        }
    }



    async function handleShowFollow(profileUsername, type) {
        if (!["following", "followers"].includes(type)) return;

        try {
            // clear stale data while fetching
            setFollowList([]);
            const res = await api.get(`/${profileUsername}/${type}`);
            
            setFollowList(res.data?.users || []);
            setShowFollowList(type === "following" ? 1 : 2);
        } catch (err) {
            console.error("Unable to fetch data", err);
            toast.error(err.response?.data?.error || "Unable to fetch data, please try again");
        }
    }

    async function handleSaveEdit(postId, newContent) {
        try {
            const res = await api.patch(`/posts/${postId}/edit`, {
                "content": newContent,
            })
            const updatedPost = res.data
            setPosts(prevPosts => 
                prevPosts.map(p => (p.id === postId ? {...p, ...updatedPost } : p))
            )
            toast.success("Post edited successfully!")
        } catch (err) {
            console.error("Error updating post", err)
            toast.error(err.response?.data?.error || "Could not update post, try again")
        }
    } 

    // ONly for fade-out and remove logic, the actual deletion happens in Post.jsx 
    async function handleDeletePost(postId) {
        try {
            // Optimistically remove the post after fade-out
            setPosts(prev =>
                prev.map(p => (p.id === postId ? { ...p, isDeleting: true } : p))
            );

            setTimeout(() => {
                // Actually remove from state after animation
                setPosts(prev => prev.filter(p => p.id !== postId));
            }, 500); // match fade-out animation
        } catch (err) {
            console.error("Error deleting post:", err);
            toast.error(err.response?.data?.error || "Could not delete post");
        }
    }

    return (
        <>
            <div className="max-w-2xl mx-auto p-4">
                {/* Top section with username + follow/unfollow */}
                <div className="flex items-center justify-between mb-6">
                    <h1 className="font-bold text-xl sm:text-2xl md:text-3xl break-all leading-tight max-w-full">@{profile.username}</h1>

                    {!isOwnProfile && (
                        <button
                            onClick={handleFollow}
                            className={`px-4 py-2 rounded ${
                                isFollowing
                                    ? "bg-gray-300 text-white"
                                    : "bg-blue-500 text-white"
                            }`}
                        >
                            {isFollowing ? "Unfollow" : "Follow"}
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="flex gap-6 mb-15">
                    <button 
                        onClick={() => handleShowFollow(username, "followers")}
                        className="text-blue-500 hover:underline"
                    >
                        {followers} Followers
                    </button>
                    <button 
                        onClick={() => handleShowFollow(username, "following")}
                        className="text-blue-500 hover:underline"
                    >
                        {following} Following
                    </button>
                </div>

                {/* Posts */}
                {posts.length === 0 ? (
                <p className="text-gray-500">No posts yet.</p>
                ) : (<div className="space-y-4">
                    {posts.map(post => (
                        <div key={post.id} className={`transition-all duration-500 ${post.isDeleting ? "fade-out" : ""}`}>
                            <Post
                                post={post}
                                canEditAndDelete={isOwnProfile}
                                onDelete={() => handleDeletePost(post.id)}
                                onEdit={(id, newContent) => handleSaveEdit(id, newContent)}
                            />
                        </div>
                    ))}
                </div>)}

            </div>

            {/* Dialog box to show followers/following */}
            <Dialog open={showFollowList !== 0} onOpenChange={() => setShowFollowList(0)}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                <DialogTitle>{showFollowList === 1 ? "Following" : "Followers"}</DialogTitle>
                <DialogDescription className="sr-only">
                    Users who {showFollowList === 1 ? "are followed by" : "follow"} this profile
                </DialogDescription>
                </DialogHeader>
                {followList.length === 0 ? (
                <p className="text-sm text-gray-500">
                    No {showFollowList === 1 ? "following" : "followers"} yet.
                </p>
                ) : (
                <ul className="space-y-2">
                    {followList.map((user, index) => (
                    <li key={index}>
                        <Link
                        to={`/profile/${user.username}`}
                        className="text-blue-600 hover:underline"
                        >
                        {user.username}
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
