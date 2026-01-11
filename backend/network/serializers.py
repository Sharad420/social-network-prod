from rest_framework import serializers
from .models import Post, Comment, User

# Just a cleaner, more flexible way of what you're already doing, it's just that this integrates well into DRF

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username"]


class CommentSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField(read_only=True)

    class Meta:
        model = Comment
        fields = ["id", "user", "content", "timestamp"]

class PostSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    likes = serializers.SerializerMethodField()
    liked = serializers.SerializerMethodField()
    comments = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ["id", "user", "content", "timestamp", "likes", "liked", "comments"]

    def get_likes(self, obj):
        return obj.likes.count()
    
    def get_liked(self, obj):
        user = self.context.get("request").user
        if user and user.is_authenticated:
            return obj.likes.filter(id=user.id).exists()
        
        return False
    
    def get_comments(self, obj):
        return obj.comments.count()