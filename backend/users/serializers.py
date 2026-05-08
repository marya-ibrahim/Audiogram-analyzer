import re
import base64
import json
from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'name', 'username', 'email', 'first_name', 'phone_number', 'role']
        read_only_fields = ['id']

    def get_name(self, obj):
        return obj.first_name or obj.username


def _decode_credentials(credentials: str) -> tuple:
    """Decode Base64 and extract identifier and password."""
    try:
        decoded = base64.b64decode(credentials.encode()).decode('utf-8')
        data = json.loads(decoded)
        return data['identifier'], data['password']
    except Exception:
        raise serializers.ValidationError({'credentials': 'Invalid credentials format.'})


class RegisterSerializer(serializers.Serializer):
    """
    Register with: name + Base64-encoded credentials.
    credentials = btoa(JSON.stringify({ identifier, password }))
    """
    name        = serializers.CharField(max_length=150)
    credentials = serializers.CharField(write_only=True)

    def _is_email(self, value):
        return '@' in value

    def _is_phone(self, value):
        return bool(re.match(r'^\+?[\d\s\-]{7,20}$', value))

    def validate(self, attrs):
        identifier, password = _decode_credentials(attrs['credentials'])
        identifier = identifier.strip()

        if not self._is_email(identifier) and not self._is_phone(identifier):
            raise serializers.ValidationError({'identifier': 'Enter a valid email or phone number.'})
        if len(password) < 6:
            raise serializers.ValidationError({'password': 'Password must be at least 6 characters.'})
        if self._is_email(identifier) and User.objects.filter(email__iexact=identifier).exists():
            raise serializers.ValidationError({'identifier': 'This email is already registered.'})
        if self._is_phone(identifier) and User.objects.filter(phone_number=identifier).exists():
            raise serializers.ValidationError({'identifier': 'This phone number is already registered.'})

        attrs['_identifier'] = identifier
        attrs['_password']   = password
        return attrs

    def create(self, validated_data):
        name       = validated_data['name']
        identifier = validated_data['_identifier']
        password   = validated_data['_password']

        # Generate a unique username from the user's name
        base = re.sub(r'[^a-zA-Z0-9]', '', name.lower()) or 'user'
        username = base
        counter  = 1
        while User.objects.filter(username=username).exists():
            username = f'{base}{counter}'
            counter += 1

        # Create user with email or phone depending on identifier type
        if self._is_email(identifier):
            user = User(username=username, email=identifier, first_name=name)
        else:
            user = User(username=username, phone_number=identifier, first_name=name)

        # Hash password and save
        user.set_password(password)
        user.save()
        return user
