from django.contrib.auth.models import AbstractUser
from django.db import models
import hashlib


class User(AbstractUser):
    is_user_verified = models.BooleanField(default=False)
    profile_image_url = models.URLField(blank=True, null=True)
    pass


class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="posts")
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)
    # One post can be liked by many users, and one user can like many posts.
    likes = models.ManyToManyField(User, related_name="liked_posts", blank=True)
    # Counts can be accessed directly with posts.likes.count()

    def serialize(self, request_user=None):
        return {
            "id": self.id,
            "user":self.user.username,
            "content":self.content,
            "timestamp":self.timestamp.strftime("%d-%m-%Y %H:%M:%S"),
            "likes": self.likes.count(),
            "liked": request_user in self.likes.all() if request_user and request_user.is_authenticated else False,
            "comments": self.comments.count()
        }

# Understand this relationship, recommended to use this over ManytoMany in User class to avoid complications.
class Follow(models.Model):
    # Alice follows Bob and following set gives all FOLLOW objects where the follower is Alice.
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following_set')
    # Bob is followed by Alice and follower_set gives all FOLLOW objects where the following is Bob.
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name='follower_set')

    class Meta:
        unique_together=("follower","following")

class Comment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    content = models.TextField()
    timestamp = models.DateTimeField(auto_now_add=True)

    def serialize(self):
        return {
            "user":self.user.username,
            "content":self.content,
            "timestamp":self.timestamp.strftime("%d-%m-%Y %H:%M:%S")
        }

# Refresh token store, for session management during password reset and for blacklisting expired refresh tokens
class RefreshSession(models.Model):
    #  Some of these fields are kinda optional, the important ones are user, jti, hash, revoked
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="refresh_sessions")
    jti = models.CharField(max_length=255, unique=True) # Unique jti from the refresh token(Have to inject, refreshTokenView does not automatically provide one)
    token_hash = models.CharField(max_length=128, blank=True, null=True) #SHA256 of the token
    user_agent = models.TextField(blank=True, null=True)
    ip_address = models.CharField(max_length=45, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    last_used = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    revoked = models.BooleanField(default=False) # Tells if this refresh token is revoked or not.

    def revoke(self):
        self.revoked = True
        self.save(update_fields=["revoked"])

    @staticmethod
    def hash_token(raw_token: str) -> str:
        return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    
# 3 prev passwords per user.
class PreviousPassword(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="previous_passwords")
    password_hash = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)



# Completely irrelevant to the project here
class GoogleOAuthToken(models.Model):
    service = models.CharField(max_length=50, unique=True)
    refresh_token = models.TextField()
    scope = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)