from django.contrib.auth.models import User
from rest_framework import generics
from .serializers import UserSerializer, NoteSerializer, IncomeEntrySerializer, ExpenseEntrySerializer, ExpenseCategorySerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import Note, IncomeEntry, ExpenseEntry, ExpenseCategory


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
        return IncomeEntry.objects.filter(user=self.request.user).order_by("-date")

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


class ExpenseEntryDelete(generics.DestroyAPIView):
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