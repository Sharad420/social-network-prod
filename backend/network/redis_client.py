import os, json, hashlib, secrets
import redis.asyncio as redis
from kombu.utils.url import safequote

# Securely fetch Redis host/port from environment or default
redis_host = safequote(os.environ.get('REDIS_HOST', 'localhost'))
redis_port = safequote(os.environ.get('REDIS_PORT', '6379'))

# Create Redis client
redis_client = redis.Redis(host=redis_host, port=redis_port, db=0)

# Get salt
STATIC_SALT = os.getenv("OTP_SALT", 'sTF/9EJDll+*TdGL')

# Just using these code: str things for type safety.

def hash_code(code: str) -> str:
    return hashlib.sha256((STATIC_SALT + code).encode()).hexdigest()

# Set a key with optional expiration
async def add_key_value_redis(key: str, code: str, expire: int = 300):
    hashed_code = hash_code(code)
    await redis_client.set(key, hashed_code, ex=expire)

# Compare the user entered code and stored code
async def verify_code_redis(key: str, code: str) -> bool:
    stored_hash = await redis_client.get(key)
    if not stored_hash:
        return False
    return hash_code(code) == stored_hash.decode()

# Delete a key
async def delete_key_redis(key):
    await redis_client.delete(key)

# Get key for debugging
async def get_value_redis(key: str) -> str:
    value = await redis_client.get(key)
    return value.decode() if value else None

