from django.contrib.auth.models import User
from rest_framework import serializers
from .models import Note, IncomeEntry, ExpenseEntry


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "password"]
        extra_kwargs = {"password": {"write_only": True}}

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class NoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Note
        fields = ["id", "title", "content", "created_at", "author"]
        extra_kwargs = {"author": {"read_only": True}}


class IncomeEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = IncomeEntry
        fields = ["id", "date", "amount", "income_source", "earned_by", "created_at", "user"]
        extra_kwargs = {"user": {"read_only": True}}


class ExpenseEntrySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseEntry
        fields = ["id", "date", "amount", "category", "merchant", "description", "payment_method", "created_at", "user"]
        extra_kwargs = {"user": {"read_only": True}}