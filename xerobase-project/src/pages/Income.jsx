import { useState, useEffect, useMemo } from "react";
import api from "../api";
import "../styles/Income.css";
import Navbar from "../components/Navbar";
import { DEFAULT_INCOME_CATEGORIES } from "../constants";

function Income() {
    const [entries, setEntries] = useState([]);
    const [date, setDate] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [incomeSource, setIncomeSource] = useState("");
    const [earnedBy, setEarnedBy] = useState("");
    const [loading, setLoading] = useState(false);

    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = () => {
        api.get("/api/income/")
            .then((res) => setEntries(res.data))
            .catch((err) => console.error(err));
    };

    // Defaults + any custom categories from existing entries
    const allCategories = useMemo(() => {
        const usedNames = entries.map((e) => e.category).filter(Boolean);
        return [...new Set([...DEFAULT_INCOME_CATEGORIES, ...usedNames])].sort(
            (a, b) => a.localeCompare(b)
        );
    }, [entries]);

    const handleCategoryChange = (e) => {
        const value = e.target.value;
        if (value === "__OTHER__") {
            setShowNewCategoryInput(true);
            setCategory("");
        } else {
            setShowNewCategoryInput(false);
            setNewCategoryName("");
            setCategory(value);
        }
    };

    const confirmNewCategory = () => {
        const name = newCategoryName.trim();
        if (!name) return;
        setCategory(name);
        setNewCategoryName("");
        setShowNewCategoryInput(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!category) {
            alert("Please pick or add an income category.");
            return;
        }
        setLoading(true);
        try {
            await api.post("/api/income/", {
                date,
                amount,
                category,
                income_source: incomeSource,
                earned_by: earnedBy,
            });
            setDate("");
            setAmount("");
            setCategory("");
            setIncomeSource("");
            setEarnedBy("");
            setShowNewCategoryInput(false);
            setNewCategoryName("");
            fetchEntries();
        } catch (err) {
            alert("Failed to save income entry: " + err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (id) => {
        api.delete(`/api/income/delete/${id}/`)
            .then(() => fetchEntries())
            .catch((err) => alert(err));
    };

    return (
        <div className="income-page">
            <Navbar />
            <div className="income-content">
                <h1 className="income-title">Income Tracker</h1>

                <div className="income-form-card">
                    <h2>Add Income Entry</h2>
                    <form onSubmit={handleSubmit} className="income-form">
                        <div className="form-group">
                            <label htmlFor="date">Date</label>
                            <input
                                type="date" id="date" value={date}
                                onChange={(e) => setDate(e.target.value)} required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="amount">Amount ($)</label>
                            <input
                                type="number" id="amount" placeholder="0.00"
                                step="0.01" min="0" value={amount}
                                onChange={(e) => setAmount(e.target.value)} required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="category">Category</label>
                            {!showNewCategoryInput ? (
                                <select
                                    id="category" value={category}
                                    onChange={handleCategoryChange} required
                                >
                                    <option value="" disabled>Select a category</option>
                                    {allCategories.map((c) => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                    <option value="__OTHER__">+ Other (add new...)</option>
                                </select>
                            ) : (
                                <div className="new-category-row">
                                    <input
                                        type="text" placeholder="Type new category"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                confirmNewCategory();
                                            }
                                        }}
                                        autoFocus
                                    />
                                    <button type="button" className="add-cat-btn" onClick={confirmNewCategory}>
                                        Use
                                    </button>
                                    <button
                                        type="button" className="cancel-cat-btn"
                                        onClick={() => {
                                            setShowNewCategoryInput(false);
                                            setNewCategoryName("");
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="form-group">
                            <label htmlFor="incomeSource">Employer / Source</label>
                            <input
                                type="text" id="incomeSource"
                                placeholder="e.g. Acme Corp"
                                value={incomeSource}
                                onChange={(e) => setIncomeSource(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group form-group-full">
                            <label htmlFor="earnedBy">Earned By</label>
                            <input
                                type="text" id="earnedBy"
                                placeholder="e.g. John, Jane"
                                value={earnedBy}
                                onChange={(e) => setEarnedBy(e.target.value)}
                                required
                            />
                        </div>
                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? "Saving..." : "Add Entry"}
                        </button>
                    </form>
                </div>

                <div className="income-list-card">
                    <h2>Income Entries</h2>
                    {entries.length === 0 ? (
                        <p className="no-entries">No income entries yet. Add one above.</p>
                    ) : (
                        <table className="income-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Amount</th>
                                    <th>Category</th>
                                    <th>Source</th>
                                    <th>Earned By</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => (
                                    <tr key={entry.id}>
                                        <td>{entry.date}</td>
                                        <td>${parseFloat(entry.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                        <td>
                                            {entry.category ? (
                                                <span className="income-category-badge">{entry.category}</span>
                                            ) : (
                                                <span className="muted">—</span>
                                            )}
                                        </td>
                                        <td>{entry.income_source}</td>
                                        <td>{entry.earned_by}</td>
                                        <td>
                                            <button className="delete-btn" onClick={() => handleDelete(entry.id)}>
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

export default Income;