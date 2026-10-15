"""
Users views — matches frontend authService.js:
  POST /api/users/register/  { name, credentials }  → user object
  POST /api/auth/login/      { credentials }         → { access, refresh, user }
  POST /api/auth/refresh/    { refresh }             → { access }
  GET/PATCH /api/users/me/                           → user object
"""
import base64
import json

from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .serializers import RegisterSerializer, UserProfileSerializer

User = get_user_model()


def _decode_credentials(encoded: str) -> dict:
    """Decode Base64 JSON credentials sent by the frontend."""
    try:
        decoded = base64.b64decode(encoded).decode('utf-8')
        return json.loads(decoded)
    except Exception:
        return {}


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """
    POST /api/users/register/
    Body: { name, credentials: base64({"identifier":"...","password":"..."}) }
    """
    name = request.data.get('name', '')
    encoded = request.data.get('credentials', '')
    creds = _decode_credentials(encoded)

    identifier = creds.get('identifier', '')
    password = creds.get('password', '')

    if not identifier or not password:
        return Response(
            {'detail': 'identifier and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    is_email = '@' in identifier
    name_parts = name.strip().split(' ', 1)
    first_name = name_parts[0]
    last_name = name_parts[1] if len(name_parts) > 1 else ''

    base_username = identifier.split('@')[0] if is_email else identifier
    username = base_username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f'{base_username}{counter}'
        counter += 1

    user_data = {
        'username': username,
        'email': identifier if is_email else f'{identifier}@placeholder.local',
        'password': password,
        'first_name': first_name,
        'last_name': last_name,
    }

    serializer = RegisterSerializer(data=user_data)
    if not serializer.is_valid():
        first_key = next(iter(serializer.errors))
        first_msg = serializer.errors[first_key][0]
        return Response({'detail': str(first_msg)}, status=status.HTTP_400_BAD_REQUEST)

    user = serializer.save()
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'role': user.role,
    }, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([AllowAny])
def user_login(request):
    """
    POST /api/auth/login/
    Body: { credentials: base64({"identifier":"...","password":"..."}) }
    Returns: { access, refresh, user }
    """
    encoded = request.data.get('credentials', '')
    creds = _decode_credentials(encoded)

    identifier = creds.get('identifier', '')
    password = creds.get('password', '')

    if not identifier or not password:
        return Response(
            {'detail': 'identifier and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user = None
    if '@' in identifier:
        user = User.objects.filter(email=identifier).first()
    if not user:
        user = User.objects.filter(username=identifier).first()

    if not user or not user.check_password(password):
        return Response({'detail': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    if not user.is_active:
        return Response({'detail': 'Account is disabled'}, status=status.HTTP_401_UNAUTHORIZED)

    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': {
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'role': user.role,
        }
    })


@api_view(['POST'])
@permission_classes([AllowAny])
def token_refresh(request):
    """
    POST /api/auth/refresh/
    Body: { refresh }
    Returns: { access }
    """
    refresh_str = request.data.get('refresh', '')
    if not refresh_str:
        return Response({'detail': 'refresh token required'}, status=status.HTTP_400_BAD_REQUEST)
    try:
        refresh = RefreshToken(refresh_str)
        return Response({'access': str(refresh.access_token)})
    except Exception:
        return Response({'detail': 'Invalid or expired refresh token'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def me(request):
    """
    GET  /api/users/me/
    PATCH /api/users/me/
    """
    if request.method == 'GET':
        return Response({
            'id': request.user.id,
            'username': request.user.username,
            'email': request.user.email,
            'first_name': request.user.first_name,
            'last_name': request.user.last_name,
            'role': request.user.role,
        })

    serializer = UserProfileSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
