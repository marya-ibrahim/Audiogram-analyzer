from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import User
from .serializers import UserSerializer, RegisterSerializer


class RegisterView(APIView):
    """POST /api/users/register/ — تسجيل مستخدم جديد"""
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserProfileView(APIView):
    """GET/PUT /api/users/me/ — عرض وتعديل بيانات المستخدم الحالي"""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def put(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UserDetailView(APIView):
    """GET /api/users/{id}/ — عرض مستخدم (للأخصائيين فقط)"""
    permission_classes = [IsAuthenticated]

    def get(self, request, user_id):
        if request.user.role != 'audiologist' and request.user.id != user_id:
            return Response({'error': 'غير مصرح'}, status=status.HTTP_403_FORBIDDEN)
        try:
            user = User.objects.get(id=user_id)
            return Response(UserSerializer(user).data)
        except User.DoesNotExist:
            return Response({'error': 'المستخدم غير موجود'}, status=status.HTTP_404_NOT_FOUND)

    def delete(self, request, user_id):
        if request.user.role != 'audiologist' and request.user.id != user_id:
            return Response({'error': 'غير مصرح'}, status=status.HTTP_403_FORBIDDEN)
        try:
            User.objects.get(id=user_id).delete()
            return Response({'message': 'تم حذف المستخدم بنجاح'})
        except User.DoesNotExist:
            return Response({'error': 'المستخدم غير موجود'}, status=status.HTTP_404_NOT_FOUND)