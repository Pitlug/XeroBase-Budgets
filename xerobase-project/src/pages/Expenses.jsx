import { useState, useEffect } from "react";
import api from "../api";
import "../styles/Expenses.css";
import Navbar from "../components/Navbar";

const CATEGORIES = [
    "Housing",
    "Utilities",
    "Groceries",
    "Transportation",
    "Insurance",
    "Healthcare",
    "Dining Out",
    "Entertainment",
    "Subscriptions",
    "Personal Care",
    "Clothing",
    "Education",
    "Savings",
    "Debt Payment",
    "Gifts/Donations",
    "Travel",
    "Other",
];

const PAYMENT_METHODS = [
    "Cash",
    "Debit Card",
    "Credit Card",
    "Bank Transfer",
    "Check",
    "Mobile Payment",
    "Other",
];

function Expenses() {
    const [entries, setEntries] = useState([]);
    const [date, setDate] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [merchant, setMerchant] = useState("");
    const [description, setDescription] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = () => {
        api.get("/api/expenses/")
            .then((res) => setEntries(res.data))
            .catch((err) => console.error(err));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/api/expenses/", {
                date,
                amount,
                category,
                merchant,
                description,
                payment_method: paymentMethod,
            });
            setDate("");
            setAmount("");
            setCategory("");
            setMerchant("");
            setDescription("");
            setPaymentMethod("");
            fetchEntries();
        } catch (err) {
            alert("Failed to save expense entry: " + err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id) => {
        api.delete(`/api/expenses/delete/${id}/`)
            .then(() => fetchEntries())
            .catch((err) => alert(err));
    };

    return (
        <div className="expenses-page">
            <Navbar />
            <div className="expenses-content">
                <h1 className="expenses-title">Expense Tracker</h1>

                <div className="expenses-form-card">
                    <h2>Add Expense Entry</h2>
                    <form onSubmit={handleSubmit} className="expenses-form">
                        <div className="form-group">
                            <label htmlFor="date">Date</label>
                            <input
                                type="date"
                                id="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="amount">Amount ($)</label>
                            <input
                                type="number"
                                id="amount"
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="category">Category</label>
                            <select
                                id="category"
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                required
                            >
                                <option value="" disabled>Select a category</option>
                                {CATEGORIES.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="paymentMethod">Payment Method</label>
                            <select
                                id="paymentMethod"
                                value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)}
                                required
                            >
                                <option value="" disabled>Select a method</option>
                                {PAYMENT_METHODS.map((method) => (
                                    <option key={method} value={method}>{method}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="merchant">Merchant</label>
                            <input
                                type="text"
                                id="merchant"
                                placeholder="e.g. Walmart, Shell, Netflix"
                                value={merchant}
                                onChange={(e) => setMerchant(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group form-group-full">
                            <label htmlFor="description">Description</label>
                            <textarea
                                id="description"
                                placeholder="Optional notes about this expense..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="2"
                            />
                        </div>
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? "Saving..." : "Add Entry"}
                        </button>
                    </form>
                </div>

                <div className="expenses-list-card">
                    <h2>Expense Entries</h2>
                    {entries.length === 0 ? (
                        <p className="no-entries">No expense entries yet. Add one above.</p>
                    ) : (
                        <table className="expenses-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Category</th>
                                    <th>Merchant</th>
                                    <th>Payment</th>
                                    <th>Description</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => (
                                    <tr key={entry.id}>
                                        <td>{entry.date}</td>
                                        <td>${parseFloat(entry.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                        <td>
                                            <span className="category-badge">{entry.category}</span>
                                        </td>
                                        <td>{entry.merchant}</td>
                                        <td>{entry.payment_method}</td>
                                        <td className="description-cell">{entry.description || "—"}</td>
                                        <td>
                                            <button
                                                className="delete-btn"
                                                onClick={() => handleDelete(entry.id)}
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Expenses;