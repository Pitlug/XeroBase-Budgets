export const ACCESS_TOKEN = "access";
export const REFRESH_TOKEN = "refresh";

// Categories shown on the Expenses page and the "Expense Budget" section of Budgets.
export const DEFAULT_CATEGORIES = [
    "Housing", "Utilities", "Groceries", "Transportation", "Insurance",
    "Healthcare", "Dining Out", "Entertainment", "Subscriptions",
    "Personal Care", "Clothing", "Education", "Savings", "Debt Payment",
    "Gifts/Donations", "Travel",
];

// Income-only categories. Used ONLY on the Budgets page's Income section —
// these never appear on the Expenses page.
export const DEFAULT_INCOME_CATEGORIES = [
    "Salary",
    "Side Hustle",
    "Freelance",
    "Investment",
    "Rental Income",
    "Bonus",
    "Refund",
    "Gift Received",
    "Other Income",
];