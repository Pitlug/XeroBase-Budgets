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


RECURRENCE_CHOICES = [
    ("none", "Not recurring"),
    ("weekly", "Weekly"),
    ("biweekly", "Bi-weekly"),
    ("monthly", "Monthly"),
    ("quarterly", "Quarterly"),
    ("yearly", "Yearly"),
]


class ExpenseEntry(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="expense_entries")
    date = models.DateField()
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100)
    subcategory = models.CharField(max_length=100, blank=True, default="")
    merchant = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    payment_method = models.CharField(max_length=100)
    is_recurring = models.BooleanField(default=False)
    recurrence_frequency = models.CharField(
        max_length=20, choices=RECURRENCE_CHOICES, default="none", blank=True
    )
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


class ExpenseSubcategory(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="expense_subcategories")
    # Stored as the category NAME (string) so default categories — which only live
    # in the React frontend, not the DB — can also have subcategories attached.
    category_name = models.CharField(max_length=100)
    name = models.CharField(max_length=100)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "category_name", "name")
        ordering = ["category_name", "name"]

    def __str__(self):
        return f"{self.category_name} > {self.name}"
    
class BudgetEntry(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="budget_entries")
    category = models.CharField(max_length=100)
    subcategory = models.CharField(max_length=100, blank=True, default="")
    projected_amount = models.DecimalField(max_digits=10, decimal_places=2)
    # Period stored as "YYYY-MM" — matches the value of an HTML <input type="month">
    period = models.CharField(max_length=7)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("user", "category", "subcategory", "period")
        ordering = ["category", "subcategory"]

    def __str__(self):
        sub = f" > {self.subcategory}" if self.subcategory else ""
        return f"{self.user.username} | {self.period} | {self.category}{sub} = {self.projected_amount}"