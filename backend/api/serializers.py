import re
from decimal import Decimal
from django.contrib.auth.models import User
from django.db.models import Sum
from rest_framework import serializers
from .models import (
    Note, IncomeEntry, ExpenseEntry, ExpenseCategory,
    ExpenseSubcategory, BudgetEntry,
)


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
        fields = [
            "id", "date", "amount", "category", "subcategory", "merchant",
            "description", "payment_method", "is_recurring", "recurrence_frequency",
            "created_at", "user",
        ]
        extra_kwargs = {"user": {"read_only": True}}


class ExpenseCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseCategory
        fields = ["id", "name", "created_at", "user"]
        extra_kwargs = {"user": {"read_only": True}}

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Category name cannot be empty.")
        return value


class ExpenseSubcategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = ExpenseSubcategory
        fields = ["id", "category_name", "name", "created_at", "user"]
        extra_kwargs = {"user": {"read_only": True}}

    def validate_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Subcategory name cannot be empty.")
        return value

    def validate_category_name(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("Category name cannot be empty.")
        return value


class BudgetEntrySerializer(serializers.ModelSerializer):
    actual_amount = serializers.SerializerMethodField()

    class Meta:
        model = BudgetEntry
        fields = [
            "id", "entry_type", "category", "subcategory", "projected_amount",
            "actual_amount", "period", "created_at", "user",
        ]
        extra_kwargs = {"user": {"read_only": True}}

    def validate_period(self, value):
        if not re.match(r"^\d{4}-\d{2}$", value):
            raise serializers.ValidationError("Period must be in YYYY-MM format.")
        return value

    def validate_entry_type(self, value):
        if value not in ("income", "expense"):
            raise serializers.ValidationError("entry_type must be 'income' or 'expense'.")
        return value

    def get_actual_amount(self, obj):
        try:
            year_str, month_str = obj.period.split("-")
            year, month = int(year_str), int(month_str)
        except (ValueError, AttributeError):
            return "0.00"

        if obj.entry_type == "income":
            # Sum IncomeEntry rows for the same user/month, optionally filtered
            # by income_source matching the budget's category, and earned_by
            # matching the subcategory if one is set.
            qs = IncomeEntry.objects.filter(
                user_id=obj.user_id,
                date__year=year,
                date__month=month,
                income_source=obj.category,
            )
            if obj.subcategory:
                qs = qs.filter(earned_by=obj.subcategory)
        else:
            qs = ExpenseEntry.objects.filter(
                user_id=obj.user_id,
                category=obj.category,
                date__year=year,
                date__month=month,
            )
            if obj.subcategory:
                qs = qs.filter(subcategory=obj.subcategory)

        total = qs.aggregate(total=Sum("amount"))["total"]
        return str(total or Decimal("0.00"))