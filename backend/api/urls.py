from django.urls import path
from . import views

urlpatterns = [
    path("notes/", views.NoteListCreate.as_view(), name="note-list"),
    path("notes/delete/<int:pk>/", views.NoteDelete.as_view(), name="delete-note"),

    path("income/", views.IncomeEntryListCreate.as_view(), name="income-list"),
    path("income/delete/<int:pk>/", views.IncomeEntryDelete.as_view(), name="delete-income"),

    path("expenses/", views.ExpenseEntryListCreate.as_view(), name="expense-list"),
    path("expenses/<int:pk>/", views.ExpenseEntryDetail.as_view(), name="expense-detail"),
    path("expenses/delete/<int:pk>/", views.ExpenseEntryDetail.as_view(), name="delete-expense"),

    path("expense-categories/", views.ExpenseCategoryListCreate.as_view(), name="category-list"),
    path("expense-categories/delete/<int:pk>/", views.ExpenseCategoryDelete.as_view(), name="delete-category"),

    path("expense-subcategories/", views.ExpenseSubcategoryListCreate.as_view(), name="subcategory-list"),
    path("expense-subcategories/delete/<int:pk>/", views.ExpenseSubcategoryDelete.as_view(), name="delete-subcategory"),
]