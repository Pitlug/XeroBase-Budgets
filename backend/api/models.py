from django.db import models
from django.contrib.auth.models import User


class Note(models.Model):
    title = models.CharField(max_length=100)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notes")

    def __str__(self):
        return self.title


class IncomeEntry(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="income_entries")
    date = models.DateField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    income_source = models.CharField(max_length=255)
    earned_by = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.earned_by} - {self.income_source} - {self.amount} on {self.date}"


class ExpenseEntry(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="expense_entries")
    date = models.DateField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100)
    merchant = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    payment_method = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.merchant} - {self.category} - {self.amount} on {self.date}"


class ExpenseCategory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="expense_categories")
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "name")
        ordering = ["name"]

    def __str__(self):
        return self.name