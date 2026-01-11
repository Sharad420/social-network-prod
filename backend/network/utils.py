import aiosmtplib
import uuid
from email.message import EmailMessage
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import RefreshSession


# Adds jti(JWT id) to Django refresh token.
# Redundant.
class CustomRefreshToken(RefreshToken):
    @classmethod
    def for_user(cls, user):
        token = super().for_user(user)
        token['jti'] = str(uuid.uuid4())
        return token

# Verifies the refresh token sent by the user.
class CustomTokenRefreshView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        # print("COOKIES:", request.COOKIES)
        # Gets refresh token from request.

        # Handles the refresh token being sent in cookie.
        raw_refresh = request.COOKIES.get("refresh_token")

        if not raw_refresh:
            raise InvalidToken("No refresh token provided")
        
        try:
            token = RefreshToken(raw_refresh)
        except Exception:
            raise InvalidToken("Invalid refesh token")
        
        jti = token.get("jti")
        session = RefreshSession.objects.filter(jti=jti, revoked=False).first()

        if not session:
            raise InvalidToken("Refresh token revoked or invalid")
        
        request.data["refresh"] = raw_refresh
        
        return super().post(request, *args, **kwargs)

async def send_verification_email(to_email: str, code: str):
    msg = EmailMessage()
    msg["From"] = settings.EMAIL_HOST_USER
    msg["To"] = to_email
    msg["Subject"] = "Verify your email - Social Network"
    msg.set_content(
        f"Your verification code is {code}.\n"
        "Please type this code into the verification box within 2 minutes to confirm your email."
    )

    await aiosmtplib.send(
        msg,
        hostname=settings.EMAIL_HOST,
        port=settings.EMAIL_PORT,
        username=settings.EMAIL_HOST_USER,
        password=settings.EMAIL_HOST_PASSWORD,
        use_tls=False,
        start_tls=settings.EMAIL_USE_TLS,
    )
