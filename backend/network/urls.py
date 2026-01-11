
from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from rest_framework.permissions import AllowAny

from . import views
from .utils import CustomTokenRefreshView

urlpatterns = [
    path("login", views.login_view, name="login"),
    path("logout", views.logout_view, name="logout"),
    path("register", views.register, name="register"),
    path("send_verification", views.send_verification, name="send_verification"),
    path("verify_email", views.verify_email, name="verify_email"),
    path("reset_password", views.reset_password, name="reset_password"),
    path("newpost", views.new_post, name="newpost"), 
    path("follow", views.follow, name="following"),
    path("user", views.current_user, name="current_user"),
    path("check_username", views.check_username, name="check_username"),
    path("token/refresh", CustomTokenRefreshView.as_view(permission_classes=[AllowAny]), name="token_refresh"), # Out of the box refresh token method.
    path("get_posts/<str:type>", views.get_posts, name="get_posts"),
    path("profile/<str:username>", views.profile, name="profile"),
    path("profile/<str:username>/follow", views.follow, name="follow"),
    path("posts/<int:postid>/like", views.toggle_like, name="like"), 
    path("posts/<int:postid>/likers", views.show_likers, name="show_likers"),
    path("posts/<int:postid>/comments", views.comments, name="comments"),
    path("posts/<int:postid>/edit", views.edit_post, name="edit"),
    path("posts/<int:postid>/delete", views.delete_post, name="delete"), 
    path("<str:username>/<str:follow_type>", views.show_follow_data, name="show_follow_data"),
]
