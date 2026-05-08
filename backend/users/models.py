from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Extended user model for audiogram patients and audiologists."""

    ROLE_PATIENT = "patient"
    ROLE_AUDIOLOGIST = "audiologist"
    ROLE_CHOICES = [
        (ROLE_PATIENT, "Patient"),
        (ROLE_AUDIOLOGIST, "Audiologist"),
    ]

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_PATIENT)
    date_of_birth = models.DateField(null=True, blank=True)
    phone_number = models.CharField(max_length=20, blank=True)

    def __str__(self):
        return f"{self.username} ({self.role})"
