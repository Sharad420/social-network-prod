import aiosmtplib
import httpx
import uuid
from email.message import EmailMessage
from django.conf import settings
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken
from rest_framework_simplejwt.views import TokenRefreshView

from .models import RefreshSession


# Adds jti(JWT id) to Django refresh token.
###########################################################################################
# Redundant. But can be used later on for session management and stuff like that.
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
            old_token = CustomRefreshToken(raw_refresh)
            old_jti = old_token.get("jti")
        except Exception:
            raise InvalidToken("Invalid refesh token")
        
        session = RefreshSession.objects.filter(jti=old_jti, revoked=False).first()
        if not session:
            raise InvalidToken("Refresh token revoked or invalid")
        
        request.data["refresh"] = raw_refresh

        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            new_refresh = response.data.get("refresh")
            if new_refresh:
                new_token = CustomRefreshToken(new_refresh)
                new_jti = new_token.get("jti")

                session.jti = new_jti
                session.expires_at = timezone.now() + settings.SIMPLE_JWT['REFRESH_TOKEN_LIFETIME']
                session.save()

                response.set_cookie(
                    key="refresh_token",
                    value=new_refresh,
                    httponly=True,
                    secure=True,  # Set to True for production HTTPS
                    samesite="None", # Change to "Lax" if API and Frontend share a domain
                    path="/",
                    max_age=int(settings.SIMPLE_JWT["REFRESH_TOKEN_LIFETIME"].total_seconds()),
                )

                del response.data["refresh"]
        
        return response
    

###########################################################################################

async def send_verification_email(to_email: str, code: str):
    sender_email = settings.DEFAULT_FROM_EMAIL
    sender_name = settings.DEFAULT_FROM_NAME

    url = "https://api.mailjet.com/v3.1/send"

    data = {
        'Messages': [
                        {
                                "From": {
                                        "Email": sender_email,
                                        "Name": sender_name
                                },
                                "To": [
                                        {
                                                "Email": to_email,
                                                "Name": "You"
                                        }
                                ],
                                "Subject": "Verify your email",
                                "TextPart": f"Ah yes, your secret digits\n Your verification code is {code}. Please enter it within 3 minutes to be validated.",
                                "HTMLPart": f"""<h3>Ah yes, your secret digits</h3>
                                              <p>Your code is: <strong>{code}</strong>. Please enter it within 3 minutes to be validated. Cheers!</p>
                                              """,
                        }
                ]
    }

    try:
        async with httpx.AsyncClient(
            auth=(settings.MAILJET_API_KEY, settings.MAILJET_SECRET_KEY),
            timeout=10.0
        ) as client:
            response = await client.post(url, json=data)
            response.raise_for_status()
            return True
    except Exception as e:
        print(f"Error sending email: {e}")
        return False



"""
REFRESH TOKEN ARCHITECTURE SUMMARY:
-----------------------------------
1. STORAGE: 
   - Access Token: Returned in JSON body (stored in React memory/state).
   - Refresh Token: Set in an HttpOnly, Secure, SameSite=None cookie (invisible to JS).

2. ROTATION & MULTI-DEVICE TRACKING:
   - Uses a custom 'RefreshSession' table to track active sessions by 'jti'.
   - On /token/refresh/: 
      a. Extracts old JTI from the cookie.
      b. Validates against 'RefreshSession' (checks if revoked=False).
      c. Executes SimpleJWT rotation (generates new Access + Refresh pair).
      d. Updates the existing 'RefreshSession' record with the NEW JTI and resets 'expires_at'.
      e. Overwrites the browser cookie with the new rotated Refresh Token.

3. SECURITY (DOUBLE-LAYER REVOCATION):
   - Logout & Password Reset trigger a dual-kill:
      a. Internal: SimpleJWT Blacklist (OutstandingToken/BlacklistedToken).
      b. External: Sets 'revoked=True' in our 'RefreshSession' table.
   - This ensures that even if one layer is bypassed, the session is dead.

4. XSS/CSRF DEFENSE:
   - HttpOnly prevents XSS-based token theft.
   - withCredentials: true in Axios allows the browser to handle cookie attachment automatically.
"""
