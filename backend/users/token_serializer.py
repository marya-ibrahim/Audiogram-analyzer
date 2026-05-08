import re
import base64
import json
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


def _decode_credentials(credentials: str) -> tuple[str, str]:
    """Decode Base64 and extract identifier and password."""
    try:
        decoded = base64.b64decode(credentials.encode()).decode('utf-8')
        data = json.loads(decoded)
        return data['identifier'], data['password']
    except Exception:
        raise serializers.ValidationError({'credentials': 'Invalid credentials format.'})


class EmailOrPhoneTokenSerializer(TokenObtainPairSerializer):
    """Login with Base64-encoded credentials."""

    username_field = 'credentials'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['credentials'] = serializers.CharField()
        self.fields.pop('username', None)
        self.fields.pop('password', None)

    def validate(self, attrs):
        credentials = attrs.get('credentials', '').strip()
        identifier, password = _decode_credentials(credentials)

        # Find user by email or phone number
        user = None
        if '@' in identifier:
            user = User.objects.filter(email__iexact=identifier).first()
        else:
            user = User.objects.filter(phone_number=identifier).first()

        # Validate user existence, password, and active status
        if not user:
            raise serializers.ValidationError({'identifier': 'No account found with this email or phone.'})
        if not user.check_password(password):
            raise serializers.ValidationError({'password': 'Incorrect password.'})
        if not user.is_active:
            raise serializers.ValidationError({'identifier': 'This account is inactive.'})

        # Generate JWT tokens
        refresh = self.get_token(user)
        return {
            'refresh': str(refresh),
            'access':  str(refresh.access_token),
            'user': {
                'id':    user.id,
                'name':  user.first_name or user.username,
                'email': user.email,
                'phone': user.phone_number,
            }
        }
