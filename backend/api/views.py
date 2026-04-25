from django.contrib.auth.models import User
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated, AllowAny
from .serializers import (
    UserSerializer, NoteSerializer, IncomeEntrySerializer,
    ExpenseEntrySerializer, ExpenseCategorySerializer, ExpenseSubcategorySerializer,
    BudgetEntrySerializer,
)
from .models import (
    Note, IncomeEntry, ExpenseEntry, ExpenseCategory, ExpenseSubcategory,
    BudgetEntry,
)


class NoteListCreate(generics.ListCreateAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Note.objects.filter(author=self.request.user)

    def perform_create(self, serializer):
        if serializer.is_valid():
            serializer.save(author=self.request.user)
        else:
            print(serializer.errors)


class NoteDelete(generics.DestroyAPIView):
    serializer_class = NoteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Note.objects.filter(author=self.request.user)


class CreateUserView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [AllowAny]


class IncomeEntryListCreate(generics.ListCreateAPIView):
    serializer_class = IncomeEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = IncomeEntry.objects.filter(user=self.request.user)
        period = self.request.query_params.get("period")
        if period:
            try:
                year_str, month_str = period.split("-")
                year, month = int(year_str), int(month_str)
                qs = qs.filter(date__year=year, date__month=month)
            except (ValueError, AttributeError):
                pass
        return qs.order_by("-date")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class IncomeEntryDelete(generics.DestroyAPIView):
    serializer_class = IncomeEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return IncomeEntry.objects.filter(user=self.request.user)


class ExpenseEntryListCreate(generics.ListCreateAPIView):
    serializer_class = ExpenseEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ExpenseEntry.objects.filter(user=self.request.user).order_by("-date")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ExpenseEntryDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExpenseEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ExpenseEntry.objects.filter(user=self.request.user)


class ExpenseCategoryListCreate(generics.ListCreateAPIView):
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ExpenseCategory.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ExpenseCategoryDelete(generics.DestroyAPIView):
    serializer_class = ExpenseCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ExpenseCategory.objects.filter(user=self.request.user)


class ExpenseSubcategoryListCreate(generics.ListCreateAPIView):
    serializer_class = ExpenseSubcategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = ExpenseSubcategory.objects.filter(user=self.request.user)
        category_filter = self.request.query_params.get("category")
        if category_filter:
            qs = qs.filter(category_name=category_filter)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ExpenseSubcategoryDelete(generics.DestroyAPIView):
    serializer_class = ExpenseSubcategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return ExpenseSubcategory.objects.filter(user=self.request.user)


class BudgetEntryListCreate(generics.ListCreateAPIView):
    serializer_class = BudgetEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = BudgetEntry.objects.filter(user=self.request.user)
        period = self.request.query_params.get("period")
        if period:
            qs = qs.filter(period=period)
        return qs.order_by("category", "subcategory")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class BudgetEntryDetail(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BudgetEntrySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return BudgetEntry.objects.filter(user=self.request.user)