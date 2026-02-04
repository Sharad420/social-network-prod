import asyncio
import httpx
import json
import secrets
import os
import urllib.parse
import random
import hashlib
import traceback
from asgiref.sync import sync_to_async
from django.conf import settings
from django.contrib.auth import authenticate, login, logout
from django.db import IntegrityError
from django.http import HttpResponse, HttpResponseRedirect, HttpResponseNotFound
from django.shortcuts import render
from django.urls import reverse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.core.validators import validate_email
from django.core.exceptions import ValidationError
from django.contrib.auth.hashers import check_password
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticatedOrReadOnly, AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken
from rest_framework.pagination import PageNumberPagination
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken



from .utils import CustomRefreshToken, CustomTokenRefreshView
from .utils import send_verification_email
from .redis_client import *
from .models import User, Post, Follow, Comment, RefreshSession, PreviousPassword, GoogleOAuthToken
from .serializers import PostSerializer, CommentSerializer, UserSerializer



# Shatty, americanrockline@gmail.com, password
# test_acc, americanrockline@gmail.com, password
# GojoSaturo, americanrockline@gamail.com, GojoSaturo
# ErenJeager, americanrockline@gmail.com, ErenJeager
# Prototype, americanrockline@gmail.com, Prototype
# testReset, ksharadc20@gmail.com, testReset4


##############################################################################################
##############################################################################################
##############################################################################################
"""LOGIN/LOGOUT FLOW"""


# Login based on access and refresh tokens
@api_view(["POST"])
def login_view(request):
    # Attempt to sign user in
    username = request.data["username"]
    password = request.data["password"]

    user = authenticate(request, username=username, password=password)

    # Check if authentication successful
    if user is not None:
        refresh = CustomRefreshToken.for_user(user)
        RefreshSession.objects.create(
            user=user,
            jti=refresh['jti'],
            token_hash=RefreshSession.hash_token(str(refresh)),
            user_agent=request.META.get("HTTP_USER_AGENT"),
            ip_address=request.META.get("REMOTE_ADDR", ""),
            expires_at=timezone.now() + settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME'],
        )
        access = refresh.access_token

        # No need to use Django session based logic for stateless JWT.
        # login(request, user)
        response = Response(
            {
                "message": "Logged in successfully", 
                "username": user.username,
                "access": str(access),
            },
            status=status.HTTP_200_OK,
        )
        
        response.set_cookie(
            key="refresh_token",
            value=str(refresh),
            httponly=True,
            samesite="None",
            secure=True,
            path="/",
            max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
        )
        # Sending the cookie with every request, because both token/refresh and /logout need it. This was the best option, since multiple routes cannot be added.

        return response
    else:
        return Response(
            {"error":"Invalid credentials"}, 
            status=status.HTTP_401_UNAUTHORIZED
            )
    # No else bacause now react handles the get method.

# Extract JTI from refresh token and revoke corresponding token in DB.
# The permission classes check for the access token, so even if it is expired, it is handled.
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def logout_view(request):
    raw_refresh = request.COOKIES.get("refresh_token")
    # print("Logout cookie:", raw_refresh)
    if not raw_refresh:
        return Response({"detail": "No refresh token provided."}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        token = CustomRefreshToken(raw_refresh)
    
        jti = token.get("jti")
        token.blacklist()
        try:
            session = RefreshSession.objects.get(jti=jti, revoked=False)
            session.revoke()
        except RefreshSession.DoesNotExist:
            #  return Response({"detail": "Token already revoked or not found"}, status=status.HTTP_400_BAD_REQUEST)
            pass
        
        response = Response({"message":"Successfully logged out"}, status=status.HTTP_200_OK)
        response.delete_cookie(
		"refresh_token",
		path="/",
		samesite="None", 
	)
        return response
    except TokenError:
        raise InvalidToken("Invalid refresh token")


##############################################################################################
##############################################################################################
##############################################################################################









##############################################################################################
##############################################################################################
##############################################################################################
"""REGISTRATION/RESET PASSWORD FLOW"""


# DRF does not support async views!! So just stick to native async def supported by Django
# async in Python is "infectious". Which means every function call in the async view must also be async.

@api_view(["GET"])
def check_username(request):
    username = request.GET.get("username")
    if not username:
        return Response({"available": False})
    
    exists = User.objects.filter(username=username).exists()
    return Response({"available": not exists})


"""Sends verification email for registering/password reset"""

async def send_verification(request):
    try:
        if request.method != "POST":
            return JsonResponse({"error": "Invalid method"}, status=405)

        body = request.body
        data = json.loads(body.decode("utf-8"))
        # print(f"Data after sending for verification : {data}")
        email = data.get("email")

        flow_type = data.get("type")
        if flow_type not in ("reset", "register"):
                return JsonResponse({"error": "Invalid type"}, status=400)

        # TODO: Backend check to ensure email is unique ✅


        if not email:
            return JsonResponse({"error": "Email required"}, status=400)
        try:
            validate_email(email)
        except ValidationError:
            return JsonResponse({"error": "Invalid email format"}, status=400)
        
        static_salt = os.getenv("OTP_SALT", 'sTF/9EJDll+*TdGL')
        hashed_email = hashlib.sha256((static_salt + email).encode()).hexdigest()
        # print(f"hashed email: {hashed_email}")
        exists = await sync_to_async(User.objects.filter(email=hashed_email).exists)()
        if flow_type == "register":
            if exists:
                return JsonResponse({"error": "Email already registered"}, status=400)

        if flow_type == "reset":
            if not exists:
                return JsonResponse({"error": "No account found for this email"}, status=404) 
        
        existing = await get_value_redis(f"verify:{flow_type}:{email}")
        if existing:
            return JsonResponse({"error":"OTP already sent. Please wait until it expires"}, status=400)

        # Generate OTP
        code = f"{secrets.randbelow(10**6):06d}"

        # Save code to Redis (async)
        await add_key_value_redis(f"verify:{flow_type}:{email}", code, expire=180)

        # Send email (async)
        success = await send_verification_email(email, code)
        if not success:
            return JsonResponse({"error": "Failed to send email. Try again later."}, status=503)

        return JsonResponse({"message": "Email verification sent"})

    except Exception as e:
       # traceback.print_exc()
        error_msg = f"Exception: {str(e)}\n{traceback.format_exc()}"
        print(error_msg) # This SHOULD go to journalctl
        return JsonResponse({"error": str(e)}, status=500)


# Verifes the code entered by the user.

async def verify_email(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)
    
    # print("Raw body after verification:", request.body)

    data = json.loads(request.body.decode("utf-8"))
    
    flow_type = data.get("type")
    if flow_type not in ("reset", "register"):
        return JsonResponse({"error": "Invalid type"}, status=400)
    
    email = data.get("email")
    code = data.get("code")


    if not code or not email:
        return JsonResponse({"error":"No code or email entered"}, status=400)
    
    is_valid = await verify_code_redis(f"verify:{flow_type}:{email}", code)
    if not is_valid:
        return JsonResponse({"error":"Incorrect code"}, status=400)
    

    await delete_key_redis(f"verify:{flow_type}:{email}")
    
    # Create single-use token to verify while creating user, cleaner seperation, don't need to send email across traffic, just the token.
    token = secrets.token_urlsafe(32)
    # print(f"\nEmail BEFORE adding to redis: {email}")
    await add_key_value_redis(f"verified_token:{flow_type}:{token}", email, expire=600)
    data = await get_value_redis(f"verified_token:{flow_type}:{token}")
    # print(f"\nEmail AFTER adding to redis: {data}")


    return JsonResponse({
        "message":"Email successfully verified",
        "verified":True,
        "token":token
        })


async def register(request):
    if request.method != "POST":
        return JsonResponse({"error": "Invalid method"}, status=405)
    
    # print("Raw body:", request.body)
    
    body = request.body
    data = json.loads(body.decode("utf-8"))
    # print(data)
    username = data.get("username")
    password = data.get("password")
    confirm_password = data.get("confirmPassword")
    token = data.get("token")


    if not username or not password or not token:
        return JsonResponse({"field": None,"error": "Missing required fields"}, status=400)
    
    if len(username) < 3:
        return JsonResponse({"field": "username", "error": "Username must have at least 3 characters"}, status=400)
    
    if len(password) < 8:
        return JsonResponse({"field":"password", "error": "Password must have at least 8 characters"}, status=400)

    if password != confirm_password:
        return JsonResponse({"field":"confirmPassword", "error": "Passwords do not match!"}, status=400)
    
    exists = await sync_to_async(User.objects.filter(username=username).exists)()
    if exists:
        return JsonResponse({"field":"username", "error": "Username already taken"}, status=400)

    # Check single-use token in Redis
    email = await get_value_redis(f"verified_token:register:{token}")
    # print(f"Email retrieved from redis: {email}")
    if not email:
        return JsonResponse({"error": "Session expired or invalid token"}, status=404)

    await delete_key_redis(f"verified_token:register:{token}")

    # Create user safely with hashed password
    try:
        user = await sync_to_async(User.objects.create_user)(
            username=username, email=email, password=password
        )
    except IntegrityError:
        # Safety net
        return JsonResponse({"field":"username", "error": "Username already taken"}, status=400)
    except Exception as e:
        import traceback
        # print("User creation failed:", traceback.format_exc())  # full traceback
        return JsonResponse({"error": f"Account creation failed: {str(e)}"}, status=400)

    return JsonResponse({"message": "Account created successfully! Login to continue."}, status=201)


async def reset_password(request):
    if (request.method != "PATCH"):
        return JsonResponse({"error":"Invalid Method"}, status=405)
    
    body = request.body
    data = json.loads(body.decode("utf-8"))
    token = data.get("token")
    new_password = data.get("new_password")
    confirm_new_password = data.get("confirm_new_password")
    flow_type = data.get("type") 


    if flow_type != "reset":
        return JsonResponse({"error": "Invalid flow type"}, status=400)

    if not token or not new_password:
        return JsonResponse({"error":"Missing token or password"}, status=400)
    
    if len(new_password) < 8:
        return JsonResponse({"field":"password", "error": "Password must have at least 8 characters"}, status=400)

    if new_password != confirm_new_password:
        return JsonResponse({"field":"confirmPassword", "error": "Passwords do not match!"}, status=400)
    
    # Check single-use token in Redis
    email = await get_value_redis(f"verified_token:{flow_type}:{token}")
    if not email:
        return JsonResponse({"error": "Session expired or invalid token"}, status=404)
    
    user = await sync_to_async(User.objects.get)(email=email)

    if check_password(new_password, user.password):
        return JsonResponse({"error": "New password cannot be the same as the current password"}, status=400)
    
    # Check last 3 previous passwords
    old_hashes = await sync_to_async(list)(
        PreviousPassword.objects.filter(user=user).order_by('-created_at')[:3]
    )
    for old in old_hashes:
        if check_password(new_password, old.password_hash):
            return JsonResponse({"error": "Cannot reuse the last 3 passwords"}, status=400)
    
    # Hash the old password and store
    await sync_to_async(PreviousPassword.objects.create)(
        user=user,
        password_hash=user.password
    )

    # Rotate history to keep last 3
    if len(old_hashes) >= 3:
        await sync_to_async(old_hashes[-1].delete)()

    user.set_password(new_password)
    await sync_to_async(user.save)()

    # helpers.py or top of views.py
    def bulk_blacklist_user_sessions(user):
        
        # 1. Kill the JWTs in SimpleJWT's internal tracker
        tokens = OutstandingToken.objects.filter(user=user)
        for token in tokens:
            BlacklistedToken.objects.get_or_create(token=token)
            
        # 2. Kill the sessions in your custom tracker
        RefreshSession.objects.filter(user=user, revoked=False).update(revoked=True)

    # 2. NUCLEAR OPTION: Logout everywhere
    await sync_to_async(bulk_blacklist_user_sessions)(user)

    # Delete single-use token
    await delete_key_redis(f"verified_token:reset:{token}")

    return JsonResponse({"message": "Password reset successfully"}, status=200)


##############################################################################################
##############################################################################################
##############################################################################################





##############################################################################################
##############################################################################################
##############################################################################################
"""Access/Refresh token endpoint"""

# API to check if the current user is logged in or not.
@api_view(["GET"])
@permission_classes([AllowAny])
def current_user(request):
    if request.user.is_authenticated:
        return Response({"is_authenticated": True, "username": request.user.username})
    else:
        return Response({"is_authenticated": False})

    
##############################################################################################
##############################################################################################
##############################################################################################










##############################################################################################
##############################################################################################
##############################################################################################
"""Post Actions"""


# Change in prod, always use a csrf_token
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def new_post(request):
    content = request.data.get("content", "").strip()
    if not content:
        return Response({"error": "Content cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

    post = Post.objects.create(user=request.user, content=content)

    serializer = PostSerializer(post, context={"request": request})
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def show_likers(request, postid):
    try:
        post = Post.objects.get(id=postid)
    except ObjectDoesNotExist:
        return Response({"error":"Post not found"}, status=status.HTTP_404_NOT_FOUND)
    
    likers = post.likes.all()
    
    # Only username required
    serializer = UserSerializer(likers, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticatedOrReadOnly])
def comments(request, postid):
    try:
        post = Post.objects.get(id=postid)
    except ObjectDoesNotExist:
        return Response({"error":"Post not found"}, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == "GET":
        comments_list = post.comments.all().order_by("-timestamp")
        serializer = CommentSerializer(comments_list, many=True, context={"request":request})
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    if request.method == "POST":
        content = request.data.get("content").strip()
        # Validate the content of the post and handle it gracefully.
        if not content:
            return Response({"error": "Content cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        # Save the new post into the database.
        comment = Comment.objects.create(user=request.user, content=content, post=post)

        serializer = CommentSerializer(comment, context={"request":request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def edit_post(request, postid):
    try:
        post = Post.objects.get(id=postid)
    except ObjectDoesNotExist:
        return Response({"error": "Post not found"}, status=status.HTTP_404_NOT_FOUND)

    if post.user != request.user:
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)

    content = request.data.get("content", "").strip()
    if not content:
        return Response({"error": "Content cannot be empty"}, status=status.HTTP_400_BAD_REQUEST)

    post.content = content
    post.save()

    serializer = PostSerializer(post, context={"request": request})
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_post(request, postid):
    try:
        post = Post.objects.get(id=postid)
    except ObjectDoesNotExist:
        return Response({"error": "Post not found"}, status=status.HTTP_404_NOT_FOUND)

    if post.user != request.user:
        return Response({"error": "Unauthorized"}, status=status.HTTP_403_FORBIDDEN)
    
    post.delete()
    return Response({"message": "Post deleted"}, status=status.HTTP_200_OK)



@api_view(["POST"])
@permission_classes([IsAuthenticated])
def toggle_like(request, postid):
    try:
        post_to_like = Post.objects.get(id=postid)
    except ObjectDoesNotExist:
        return Response({"error":"Post does not exist"}, status=status.HTTP_404_NOT_FOUND)
    
    if (request.user.is_authenticated) and (request.user in post_to_like.likes.all()):
        post_to_like.likes.remove(request.user)
    else:
        post_to_like.likes.add(request.user)

    # Another parameter added to serialize method.
    serializer = PostSerializer(post_to_like, context={"request":request})
    return Response(serializer.data, status=status.HTTP_200_OK)



##############################################################################################
##############################################################################################
##############################################################################################







##############################################################################################
##############################################################################################
##############################################################################################
"""Follow/Profile flow"""


def _get_user_posts(user):
    return Post.objects.filter(user=user).order_by("-timestamp")



@api_view(["GET"])
@permission_classes([IsAuthenticatedOrReadOnly])
def get_posts(request, type):

    # Fetch posts based on the type parameter.
    if type == "all":
        posts = Post.objects.all().order_by("-timestamp")
    elif type == "following":
        following_users = Follow.objects.filter(follower=request.user).values_list("following", flat=True)
        posts = Post.objects.filter(user__in=following_users).order_by("-timestamp")
    elif type == "user": 
        # ACTUALLY NEVER HITTING THIS ROUTE THO, MAYBE IN THE FUTURE.
        username = request.GET.get("username")
        if not username:
            return Response({"error": "Username not provided"}, status=status.HTTP_400_BAD_REQUEST)
        try:
            user = User.objects.get(username=username)
        except ObjectDoesNotExist:
            return Response({"error": "User not found"}, status=status.HTTP_404_NOT_FOUND)

        posts = Post.objects.filter(user=user).order_by("-timestamp")
    else:
        return Response(data={"error": "Invalid type parameter."}, status=status.HTTP_400_BAD_REQUEST)
        
    # Using DRF Paginator and Serializer
    paginator = PageNumberPagination()
    paginator.page_size = 10
    result_page = paginator.paginate_queryset(posts, request)
    serializer = PostSerializer(result_page, many=True, context={"request":request})

    return paginator.get_paginated_response(serializer.data)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def profile(request, username):
    data = _get_user_info(request, username)
    if data is None:
        return Response({"error":"User not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(data)



def _get_user_info(request, username):
    try:
        user = User.objects.get(username=username)
    except ObjectDoesNotExist:
        return None
    
    # Get the following and followers count
    followers_count=Follow.objects.filter(following=user).count()
    following_count=Follow.objects.filter(follower=user).count()

    # Get the posts of the user
    posts = _get_user_posts(user)
    serialized_posts = PostSerializer(posts, many=True, context={"request":request})

    # Get if the current user is following the requested user. O(1) operation. Can think of caching later on.
    is_following = False
    if request.user.is_authenticated and request.user != user:
        is_following = Follow.objects.filter(follower=request.user, following=user).exists()

    # Build the API response
    return {
        "username": user.username,
        "name": f"{user.first_name} {user.last_name}",
        "followers":followers_count,
        "following":following_count,
        "is_following":is_following,
        "posts":serialized_posts.data
    }


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def follow(request, username):

    try:
        user_to_follow = User.objects.get(username=username)
    except ObjectDoesNotExist:
        return Response({"error": "User not available"}, status=status.HTTP_404_NOT_FOUND)
    
    if request.user == user_to_follow:
        return Response({"error": "You can't follow yourself bruh"}, status=status.HTTP_400_BAD_REQUEST)
        
    # Get the relation if already exists so that we can unfollow, or create it.
    follow_relation, created = Follow.objects.get_or_create(
        following=user_to_follow, follower=request.user
    )
    # If already created, we unfollow.
    if not created:
        follow_relation.delete()
        is_following = False
    else:
        is_following = True

    data = {
        "is_following":is_following,
        "followers": Follow.objects.filter(following=user_to_follow).count()
    }

    return Response(data, status=status.HTTP_200_OK)


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def show_follow_data(request, username, follow_type):
    if follow_type not in ["following", "followers"]:
        return Response({"error": "Not a valid request"}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(username=username)
    except ObjectDoesNotExist:
        return Response({"error":"User not found"}, status=status.HTTP_404_NOT_FOUND)
    
    fol_list = []
    if follow_type == "following":
        # select_related Does a join to reduce number of queries, read up a little more about it.
        fol_list = Follow.objects.filter(follower=user).select_related("following")
        users = [f.following for f in fol_list]
    elif follow_type == "followers":
        fol_list = Follow.objects.filter(following=user).select_related("follower")
        users = [f.follower for f in fol_list]

    serializer = UserSerializer(users, many=True, context={"request":request})

    data = {
        "follow_type":follow_type, 
        "users": serializer.data
    }

    return Response(data, status=status.HTTP_200_OK)


##############################################################################################
##############################################################################################
##############################################################################################

















# TODO: Rate limiters for email, passwords, OTP (Very Imp!)
# TODO: HTTPS (Critical!)
# TODO: CSRF/JWT (Critical!) ✅
# TODO: More complex password policy 
# TODO: Email server is currently personal, check for a real provider later.
# TODO: Change WSGI to ASGI to support global event loops. Also helps in case you want to add WebSockets later on.


# Reg flow:
    # Submits email, email and generated OTP stored in redis. User verifies. If OTP expires, sends OTP again as per user click.
    # Backend checks if code works, if so, stores the email as a token and sends token to client.
    # Client then enters username(unique), password(>= 8 chars), submits along with token.
    # Backend verifies token, verifies username, password and stores in Postgres. Redirect to login.

# Login/Logout flow:
    # Send login info, backend verifies and sends back access and refresh token to client.
    # isAuthenticated and user hooks are set to true and user respectively.
    # isAuth and user is set in a context provider, so every page can access these hooks.
    # Logout deletes the access and refresh token, and logs out user. Sets isAuth to false.

# Service flow:
    # Required info plus auth header containing the access token is sent.
    # Backend verifies the token against the secret key. if verified, performs action.
    # If token does not exist, refresh token is sent to get fresh access token.
    # If refToken does not exist, redirect to login, set isAuth and user to false and null.
    # Axios interceptor can add this auth header to every request.


# Decided to send refresh token as a cookie, and access token as a JWT object to be stored in localStorage.
# Did it so that I can handle both CSRF and XSS attacks.
