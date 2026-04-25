import { useState, useEffect, useMemo } from "react";
import api from "../api";
import "../styles/Budgets.css";
import Navbar from "../components/Navbar";
import { DEFAULT_CATEGORIES } from "../constants";

const getCurrentPeriod = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};

const formatPeriodLabel = (period) => {
    if (!period) return "";
    const [y, m] = period.split("-");
    const d = new Date(parseInt(y), parseInt(m) - 1, 1);
    return d.toLocaleString("en-US", { month: "long", year: "numeric" });
};

const formatMoney = (n) =>
    parseFloat(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Budgets() {
    const [period, setPeriod] = useState(getCurrentPeriod());
    const [budgets, setBudgets] = useState([]);
    const [customCategories, setCustomCategories] = useState([]);
    const [customSubcategories, setCustomSubcategories] = useState([]);
    const [loading, setLoading] = useState(false);

    // Add-row form
    const [newCategory, setNewCategory] = useState("");
    const [newSubcategory, setNewSubcategory] = useState("");
    const [newProjected, setNewProjected] = useState("");

    // Inline edit
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState("");

    // Confirm delete
    const [confirmDelete, setConfirmDelete] = useState(null);

    useEffect(() => {
        fetchCategories();
        fetchSubcategories();
    }, []);

    useEffect(() => {
        fetchBudgets();
    }, [period]);

    const fetchBudgets = () => {
        api.get(`/api/budgets/?period=${period}`)
            .then((res) => setBudgets(res.data))
            .catch((err) => console.error(err));
    };

    const fetchCategories = () => {
        api.get("/api/expense-categories/")
            .then((res) => setCustomCategories(res.data))
            .catch((err) => console.error(err));
    };

    const fetchSubcategories = () => {
        api.get("/api/expense-subcategories/")
            .then((res) => setCustomSubcategories(res.data))
            .catch((err) => console.error(err));
    };

    const allCategories = useMemo(() => {
        const customNames = customCategories.map((c) => c.name);
        return [...new Set([...DEFAULT_CATEGORIES, ...customNames])].sort((a, b) =>
            a.localeCompare(b)
        );
    }, [customCategories]);

    const subcategoriesForNew = useMemo(() => {
        if (!newCategory) return [];
        return customSubcategories
            .filter((s) => s.category_name === newCategory)
            .map((s) => s.name)
            .sort((a, b) => a.localeCompare(b));
    }, [newCategory, customSubcategories]);

    const totals = useMemo(() => {
        let projected = 0, actual = 0;
        for (const b of budgets) {
            projected += parseFloat(b.projected_amount || 0);
            actual += parseFloat(b.actual_amount || 0);
        }
        return { projected, actual, remaining: projected - actual };
    }, [budgets]);

    const handleAddBudget = async (e) => {
        e.preventDefault();
        if (!newCategory || !newProjected) {
            alert("Please pick a category and enter a projected amount.");
            return;
        }
        setLoading(true);
        try {
            await api.post("/api/budgets/", {
                category: newCategory,
                subcategory: newSubcategory,
                projected_amount: newProjected,
                period,
            });
            setNewCategory("");
            setNewSubcategory("");
            setNewProjected("");
            fetchBudgets();
        } catch (err) {
            const data = err?.response?.data;
            const msg =
                data?.non_field_errors?.[0] ||
                data?.detail ||
                data?.period?.[0] ||
                "Could not add budget. A budget for this category/subcategory may already exist for this period.";
            alert(msg);
        } finally {
            setLoading(false);
        }
    };

    const startEdit = (budget) => {
        setEditingId(budget.id);
        setEditValue(budget.projected_amount);
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValue("");
    };

    const saveEdit = async (budget) => {
        if (!editValue || isNaN(parseFloat(editValue))) {
            alert("Please enter a valid amount.");
            return;
        }
        try {
            await api.put(`/api/budgets/${budget.id}/`, {
                category: budget.category,
                subcategory: budget.subcategory,
                projected_amount: editValue,
                period: budget.period,
            });
            cancelEdit();
            fetchBudgets();
        } catch (err) {
            alert("Could not update: " + err);
        }
    };

    const requestDelete = (budget) => setConfirmDelete(budget);

    const confirmDeleteAction = async () => {
        if (!confirmDelete) return;
        try {
            await api.delete(`/api/budgets/delete/${confirmDelete.id}/`);
            if (editingId === confirmDelete.id) cancelEdit();
            fetchBudgets();
        } catch (err) {
            alert("Could not delete: " + err);
        } finally {
            setConfirmDelete(null);
        }
    };

    return (
        <div className="budgets-page">
            <Navbar />
            <div className="budgets-content">
                <h1 className="budgets-title">Budget Tracker</h1>

                {/* Period selector */}
                <div className="budgets-period-card">
                    <label htmlFor="period">Budget Period</label>
                    <input
                        type="month"
                        id="period"
                        value={period}
                        onChange={(e) => setPeriod(e.target.value)}
                    />
                    <span className="period-label">{formatPeriodLabel(period)}</span>
                </div>

                {/* Summary */}
                <div className="budgets-summary">
                    <div className="summary-tile">
                        <div className="summary-label">Total Projected</div>
                        <div className="summary-value">${formatMoney(totals.projected)}</div>
                    </div>
                    <div className="summary-tile">
                        <div className="summary-label">Total Actual</div>
                        <div className="summary-value">${formatMoney(totals.actual)}</div>
                    </div>
                    <div
                        className={`summary-tile remaining-tile ${
                            totals.remaining < 0 ? "over-budget" : "under-budget"
                        }`}
                    >
                        <div className="summary-label">
                            {totals.remaining < 0 ? "Over Budget" : "Remaining"}
                        </div>
                        <div className="summary-value">
                            ${formatMoney(Math.abs(totals.remaining))}
                        </div>
                    </div>
                </div>

                {/* Add new budget row */}
                <div className="budgets-form-card">
                    <h2>Add Budget Row</h2>
                    <form onSubmit={handleAddBudget} className="budgets-form">
                        <div className="form-group">
                            <label htmlFor="newCategory">Category</label>
                            <select
                                id="newCategory"
                                value={newCategory}
                                onChange={(e) => {
                                    setNewCategory(e.target.value);
                                    setNewSubcategory("");
                                }}
                                required
                            >
                                <option value="" disabled>Select a category</option>
                                {allCategories.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="newSubcategory">Subcategory (optional)</label>
                            <select
                                id="newSubcategory"
                                value={newSubcategory}
                                onChange={(e) => setNewSubcategory(e.target.value)}
                                disabled={!newCategory}
                            >
                                <option value="">
                                    {newCategory
                                        ? "(none — entire category)"
                                        : "Pick a category first"}
                                </option>
                                {subcategoriesForNew.map((sub) => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="newProjected">Projected Amount ($)</label>
                            <input
                                type="number"
                                id="newProjected"
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                value={newProjected}
                                onChange={(e) => setNewProjected(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="submit-btn" disabled={loading}>
                            {loading ? "Saving..." : "Add Budget"}
                        </button>
                    </form>
                </div>

                {/* Main table */}
                <div className="budgets-list-card">
                    <h2>Budget Allocations — {formatPeriodLabel(period)}</h2>
                    {budgets.length === 0 ? (
                        <p className="no-entries">
                            No budgets set for this period yet. Add one above to get started.
                        </p>
                    ) : (
                        <table className="budgets-table">
                            <thead>
                                <tr>
                                    <th>Category</th>
                                    <th>Subcategory</th>
                                    <th className="num-col">Projected</th>
                                    <th className="num-col">Actual</th>
                                    <th className="num-col">Remaining</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {budgets.map((b) => {
                                    const projected = parseFloat(b.projected_amount || 0);
                                    const actual = parseFloat(b.actual_amount || 0);
                                    const remaining = projected - actual;
                                    const isOver = remaining < 0;
                                    const pct = projected > 0 ? Math.min((actual / projected) * 100, 100) : 0;
                                    return (
                                        <tr key={b.id}>
                                            <td>
                                                <span className="category-badge">{b.category}</span>
                                            </td>
                                            <td>
                                                {b.subcategory ? (
                                                    <span className="subcategory-badge">{b.subcategory}</span>
                                                ) : (
                                                    <span className="muted">whole category</span>
                                                )}
                                            </td>
                                            <td className="num-col">
                                                {editingId === b.id ? (
                                                    <input
                                                        type="number"
                                                        className="inline-edit-input"
                                                        step="0.01"
                                                        min="0"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Enter") saveEdit(b);
                                                            if (e.key === "Escape") cancelEdit();
                                                        }}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <span>${formatMoney(projected)}</span>
                                                )}
                                            </td>
                                            <td className="num-col">
                                                <div className="actual-cell">
                                                    <span className={isOver ? "amount-over" : "amount-ok"}>
                                                        ${formatMoney(actual)}
                                                    </span>
                                                    <div className="progress-bar">
                                                        <div
                                                            className={`progress-fill ${isOver ? "over" : "ok"}`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            </td>
                                            <td className={`num-col ${isOver ? "amount-over" : "amount-ok"}`}>
                                                {isOver ? "−" : ""}${formatMoney(Math.abs(remaining))}
                                            </td>
                                            <td>
                                                <div className="action-buttons">
                                                    {editingId === b.id ? (
                                                        <>
                                                            <button
                                                                className="edit-btn"
                                                                onClick={() => saveEdit(b)}
                                                            >
                                                                Save
                                                            </button>
                                                            <button
                                                                className="cancel-edit-btn"
                                                                onClick={cancelEdit}
                                                                style={{ padding: "5px 12px", fontSize: 12 }}
                                                            >
                                                                Cancel
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button
                                                                className="edit-btn"
                                                                onClick={() => startEdit(b)}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                className="delete-btn"
                                                                onClick={() => requestDelete(b)}
                                                            >
                                                                Delete
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="2" className="totals-label">Totals</td>
                                    <td className="num-col"><strong>${formatMoney(totals.projected)}</strong></td>
                                    <td className="num-col"><strong>${formatMoney(totals.actual)}</strong></td>
                                    <td className={`num-col ${totals.remaining < 0 ? "amount-over" : "amount-ok"}`}>
                                        <strong>
                                            {totals.remaining < 0 ? "−" : ""}${formatMoney(Math.abs(totals.remaining))}
                                        </strong>
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>
            </div>

            {/* Confirm-delete modal */}
            {confirmDelete && (
                <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
                    <div
                        className="modal-card confirm-modal-card"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <h3>Delete this budget row?</h3>
                            <button className="modal-close" onClick={() => setConfirmDelete(null)}>×</button>
                        </div>
                        <p className="modal-info">This will not affect any of your existing expense entries.</p>
                        <div className="confirm-summary">
                            <div><strong>Category:</strong> {confirmDelete.category}{confirmDelete.subcategory && ` › ${confirmDelete.subcategory}`}</div>
                            <div><strong>Projected:</strong> ${formatMoney(confirmDelete.projected_amount)}</div>
                            <div><strong>Period:</strong> {formatPeriodLabel(confirmDelete.period)}</div>
                        </div>
                        <div className="confirm-actions">
                            <button
                                className="confirm-cancel-btn"
                                onClick={() => setConfirmDelete(null)}
                            >
                                Cancel
                            </button>
                            <button
                                className="confirm-delete-btn"
                                onClick={confirmDeleteAction}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Budgets;