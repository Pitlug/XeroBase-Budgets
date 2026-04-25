import { useState, useEffect, useMemo } from "react";
import api from "../api";
import "../styles/Budgets.css";
import Navbar from "../components/Navbar";
import { DEFAULT_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from "../constants";

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
    const [actualMonthlyIncome, setActualMonthlyIncome] = useState(0);
    const [customExpenseCategories, setCustomExpenseCategories] = useState([]);
    const [customSubcategories, setCustomSubcategories] = useState([]);

    // Per-section "add" forms
    const [loadingIncome, setLoadingIncome] = useState(false);
    const [newIncomeCategory, setNewIncomeCategory] = useState("");
    const [newIncomeSubcategory, setNewIncomeSubcategory] = useState("");
    const [newIncomeProjected, setNewIncomeProjected] = useState("");

    const [loadingExpense, setLoadingExpense] = useState(false);
    const [newExpenseCategory, setNewExpenseCategory] = useState("");
    const [newExpenseSubcategory, setNewExpenseSubcategory] = useState("");
    const [newExpenseProjected, setNewExpenseProjected] = useState("");

    // Inline edit (single global state — only one row edited at a time)
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState("");

    // Confirm delete
    const [confirmDelete, setConfirmDelete] = useState(null);

    useEffect(() => {
        fetchExpenseCategories();
        fetchSubcategories();
    }, []);

    useEffect(() => {
        fetchBudgets();
        fetchMonthlyIncome();
    }, [period]);

    const fetchBudgets = () => {
        api.get(`/api/budgets/?period=${period}`)
            .then((res) => setBudgets(res.data))
            .catch((err) => console.error(err));
    };

    const fetchMonthlyIncome = () => {
        api.get(`/api/income/?period=${period}`)
            .then((res) => {
                const total = res.data.reduce(
                    (sum, entry) => sum + parseFloat(entry.amount || 0),
                    0
                );
                setActualMonthlyIncome(total);
            })
            .catch((err) => console.error(err));
    };

    const fetchExpenseCategories = () => {
        api.get("/api/expense-categories/")
            .then((res) => setCustomExpenseCategories(res.data))
            .catch((err) => console.error(err));
    };

    const fetchSubcategories = () => {
        api.get("/api/expense-subcategories/")
            .then((res) => setCustomSubcategories(res.data))
            .catch((err) => console.error(err));
    };

    // Split budget rows by type for separate tables
    const incomeBudgets = useMemo(
        () => budgets.filter((b) => b.entry_type === "income"),
        [budgets]
    );
    const expenseBudgets = useMemo(
        () => budgets.filter((b) => b.entry_type !== "income"),
        [budgets]
    );

    const allExpenseCategories = useMemo(() => {
        const customNames = customExpenseCategories.map((c) => c.name);
        return [...new Set([...DEFAULT_CATEGORIES, ...customNames])].sort((a, b) =>
            a.localeCompare(b)
        );
    }, [customExpenseCategories]);

    // Income categories: defaults + ones the user has previously used in income
    // budgets (since income categories aren't stored as a separate model).
    const allIncomeCategories = useMemo(() => {
        const usedNames = incomeBudgets.map((b) => b.category);
        return [...new Set([...DEFAULT_INCOME_CATEGORIES, ...usedNames])].sort(
            (a, b) => a.localeCompare(b)
        );
    }, [incomeBudgets]);

    const subcategoriesForExpense = useMemo(() => {
        if (!newExpenseCategory) return [];
        return customSubcategories
            .filter((s) => s.category_name === newExpenseCategory)
            .map((s) => s.name)
            .sort((a, b) => a.localeCompare(b));
    }, [newExpenseCategory, customSubcategories]);

    // Totals
    const incomeTotals = useMemo(() => {
        let projected = 0, actual = 0;
        for (const b of incomeBudgets) {
            projected += parseFloat(b.projected_amount || 0);
            actual += parseFloat(b.actual_amount || 0);
        }
        return { projected, actual };
    }, [incomeBudgets]);

    const expenseTotals = useMemo(() => {
        let projected = 0, actual = 0;
        for (const b of expenseBudgets) {
            projected += parseFloat(b.projected_amount || 0);
            actual += parseFloat(b.actual_amount || 0);
        }
        return { projected, actual };
    }, [expenseBudgets]);

    // Zero-based reconciliation (projected income − projected expenses)
    const projectedNet = incomeTotals.projected - expenseTotals.projected;
    const actualNet = incomeTotals.actual - expenseTotals.actual;

    const handleAddBudget = async (entry_type) => {
        const isIncome = entry_type === "income";
        const cat = isIncome ? newIncomeCategory : newExpenseCategory;
        const sub = isIncome ? newIncomeSubcategory : newExpenseSubcategory;
        const projected = isIncome ? newIncomeProjected : newExpenseProjected;
        if (!cat || !projected) {
            alert("Please pick a category and enter a projected amount.");
            return;
        }
        if (isIncome) setLoadingIncome(true); else setLoadingExpense(true);
        try {
            await api.post("/api/budgets/", {
                entry_type,
                category: cat,
                subcategory: sub,
                projected_amount: projected,
                period,
            });
            if (isIncome) {
                setNewIncomeCategory("");
                setNewIncomeSubcategory("");
                setNewIncomeProjected("");
            } else {
                setNewExpenseCategory("");
                setNewExpenseSubcategory("");
                setNewExpenseProjected("");
            }
            fetchBudgets();
        } catch (err) {
            const data = err?.response?.data;
            const msg =
                data?.non_field_errors?.[0] ||
                data?.detail ||
                data?.period?.[0] ||
                "Could not add row. A budget for this category may already exist for this period.";
            alert(msg);
        } finally {
            if (isIncome) setLoadingIncome(false); else setLoadingExpense(false);
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
                entry_type: budget.entry_type,
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

    const renderRow = (b, isIncome) => {
        const projected = parseFloat(b.projected_amount || 0);
        const actual = parseFloat(b.actual_amount || 0);
        // For expenses: remaining = projected − actual (positive = under)
        // For income:   remaining = actual − projected (positive = above target)
        const remaining = isIncome ? actual - projected : projected - actual;
        const isOver = remaining < 0;
        const pct = projected > 0 ? Math.min((actual / projected) * 100, 100) : 0;
        return (
            <tr key={b.id}>
                <td>
                    <span className={isIncome ? "income-badge" : "category-badge"}>
                        {b.category}
                    </span>
                </td>
                <td>
                    {b.subcategory ? (
                        <span className="subcategory-badge">{b.subcategory}</span>
                    ) : (
                        <span className="muted">
                            {isIncome ? "any source" : "whole category"}
                        </span>
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
                                <button className="edit-btn" onClick={() => saveEdit(b)}>Save</button>
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
                                <button className="edit-btn" onClick={() => startEdit(b)}>Edit</button>
                                <button className="delete-btn" onClick={() => requestDelete(b)}>Delete</button>
                            </>
                        )}
                    </div>
                </td>
            </tr>
        );
    };

    return (
        <div className="budgets-page">
            <Navbar />
            <div className="budgets-content">
                <h1 className="budgets-title">Zero-Based Budget</h1>

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

                {/* Zero-based reconciliation */}
                <div className="budgets-summary">
                    <div className="summary-tile income-tile">
                        <div className="summary-label">Projected Income</div>
                        <div className="summary-value">+${formatMoney(incomeTotals.projected)}</div>
                        <div className="summary-sub">Actual: ${formatMoney(incomeTotals.actual)}</div>
                    </div>
                    <div className="summary-tile expense-tile">
                        <div className="summary-label">Projected Expenses</div>
                        <div className="summary-value">−${formatMoney(expenseTotals.projected)}</div>
                        <div className="summary-sub">Actual: ${formatMoney(expenseTotals.actual)}</div>
                    </div>
                    <div
                        className={`summary-tile remaining-tile ${
                            Math.abs(projectedNet) < 0.005
                                ? "balanced-budget"
                                : projectedNet > 0
                                    ? "under-budget"
                                    : "over-budget"
                        }`}
                    >
                        <div className="summary-label">
                            {Math.abs(projectedNet) < 0.005
                                ? "Balanced ✓"
                                : projectedNet > 0
                                    ? "Unallocated"
                                    : "Over-allocated"}
                        </div>
                        <div className="summary-value">
                            {projectedNet < 0 ? "−" : ""}${formatMoney(Math.abs(projectedNet))}
                        </div>
                        <div className="summary-sub">
                            Actual net: {actualNet < 0 ? "−" : ""}${formatMoney(Math.abs(actualNet))}
                        </div>
                    </div>
                </div>

                {/* Helpful banner about zero-based goal */}
                <div className="zero-based-tip">
                    <strong>Zero-based budgeting goal:</strong> projected income minus projected
                    expenses should equal $0.00 — every dollar earned has a job.
                </div>

                {/* === INCOME SECTION === */}
                <div className="budgets-form-card income-section">
                    <h2>Add Projected Income</h2>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleAddBudget("income");
                        }}
                        className="budgets-form"
                    >
                        <div className="form-group">
                            <label htmlFor="newIncomeCategory">Income Source</label>
                            <select
                                id="newIncomeCategory"
                                value={newIncomeCategory}
                                onChange={(e) => {
                                    setNewIncomeCategory(e.target.value);
                                    setNewIncomeSubcategory("");
                                }}
                                required
                            >
                                <option value="" disabled>Select an income source</option>
                                {allIncomeCategories.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="newIncomeSubcategory">
                                Earned By (optional)
                            </label>
                            <input
                                type="text"
                                id="newIncomeSubcategory"
                                placeholder="Person earning, e.g. John"
                                value={newIncomeSubcategory}
                                onChange={(e) => setNewIncomeSubcategory(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="newIncomeProjected">Projected Amount ($)</label>
                            <input
                                type="number"
                                id="newIncomeProjected"
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                value={newIncomeProjected}
                                onChange={(e) => setNewIncomeProjected(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="submit-btn income-submit-btn" disabled={loadingIncome}>
                            {loadingIncome ? "Saving..." : "Add Income Row"}
                        </button>
                    </form>
                </div>

                <div className="budgets-list-card income-section">
                    <h2>Income Budget — {formatPeriodLabel(period)}</h2>
                    {incomeBudgets.length === 0 ? (
                        <p className="no-entries">No income projected yet. Add one above.</p>
                    ) : (
                        <table className="budgets-table">
                            <thead>
                                <tr>
                                    <th>Source</th>
                                    <th>Earned By</th>
                                    <th className="num-col">Projected</th>
                                    <th className="num-col">Actual</th>
                                    <th className="num-col">Variance</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>{incomeBudgets.map((b) => renderRow(b, true))}</tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="2" className="totals-label">Income totals</td>
                                    <td className="num-col"><strong>+${formatMoney(incomeTotals.projected)}</strong></td>
                                    <td className="num-col"><strong>+${formatMoney(incomeTotals.actual)}</strong></td>
                                    <td className="num-col"></td>
                                    <td></td>
                                </tr>
                                <tr className="footer-income-row">
                                    <td colSpan="2" className="totals-label">Actual income from Income page</td>
                                    <td className="num-col"></td>
                                    <td className="num-col"><strong>${formatMoney(actualMonthlyIncome)}</strong></td>
                                    <td className="num-col"></td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>

                {/* === EXPENSE SECTION === */}
                <div className="budgets-form-card expense-section">
                    <h2>Add Projected Expense</h2>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            handleAddBudget("expense");
                        }}
                        className="budgets-form"
                    >
                        <div className="form-group">
                            <label htmlFor="newExpenseCategory">Category</label>
                            <select
                                id="newExpenseCategory"
                                value={newExpenseCategory}
                                onChange={(e) => {
                                    setNewExpenseCategory(e.target.value);
                                    setNewExpenseSubcategory("");
                                }}
                                required
                            >
                                <option value="" disabled>Select a category</option>
                                {allExpenseCategories.map((c) => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="newExpenseSubcategory">Subcategory (optional)</label>
                            <select
                                id="newExpenseSubcategory"
                                value={newExpenseSubcategory}
                                onChange={(e) => setNewExpenseSubcategory(e.target.value)}
                                disabled={!newExpenseCategory}
                            >
                                <option value="">
                                    {newExpenseCategory
                                        ? "(none — entire category)"
                                        : "Pick a category first"}
                                </option>
                                {subcategoriesForExpense.map((sub) => (
                                    <option key={sub} value={sub}>{sub}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="newExpenseProjected">Projected Amount ($)</label>
                            <input
                                type="number"
                                id="newExpenseProjected"
                                placeholder="0.00"
                                step="0.01"
                                min="0"
                                value={newExpenseProjected}
                                onChange={(e) => setNewExpenseProjected(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="submit-btn" disabled={loadingExpense}>
                            {loadingExpense ? "Saving..." : "Add Expense Row"}
                        </button>
                    </form>
                </div>

                <div className="budgets-list-card expense-section">
                    <h2>Expense Budget — {formatPeriodLabel(period)}</h2>
                    {expenseBudgets.length === 0 ? (
                        <p className="no-entries">No expenses budgeted yet. Add one above.</p>
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
                            <tbody>{expenseBudgets.map((b) => renderRow(b, false))}</tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan="2" className="totals-label">Expense totals</td>
                                    <td className="num-col"><strong>−${formatMoney(expenseTotals.projected)}</strong></td>
                                    <td className="num-col"><strong>−${formatMoney(expenseTotals.actual)}</strong></td>
                                    <td className={`num-col ${expenseTotals.projected - expenseTotals.actual < 0 ? "amount-over" : "amount-ok"}`}>
                                        <strong>
                                            {expenseTotals.projected - expenseTotals.actual < 0 ? "−" : ""}
                                            ${formatMoney(Math.abs(expenseTotals.projected - expenseTotals.actual))}
                                        </strong>
                                    </td>
                                    <td></td>
                                </tr>
                            </tfoot>
                        </table>
                    )}
                </div>

                {/* Final reconciliation */}
                <div className="reconciliation-card">
                    <h2>Zero-Based Reconciliation</h2>
                    <div className="reconciliation-row">
                        <span>Projected income</span>
                        <span className="amount-ok">+${formatMoney(incomeTotals.projected)}</span>
                    </div>
                    <div className="reconciliation-row">
                        <span>Projected expenses</span>
                        <span className="amount-over">−${formatMoney(expenseTotals.projected)}</span>
                    </div>
                    <div className={`reconciliation-row reconciliation-net ${
                        Math.abs(projectedNet) < 0.005
                            ? "net-balanced"
                            : projectedNet > 0
                                ? "net-positive"
                                : "net-negative"
                    }`}>
                        <span>
                            {Math.abs(projectedNet) < 0.005
                                ? "✓ Budget balances"
                                : projectedNet > 0
                                    ? "Unallocated income"
                                    : "Over-allocated"}
                        </span>
                        <span>
                            {projectedNet < 0 ? "−" : ""}${formatMoney(Math.abs(projectedNet))}
                        </span>
                    </div>
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
                        <p className="modal-info">This will not affect existing income or expense entries.</p>
                        <div className="confirm-summary">
                            <div><strong>Type:</strong> {confirmDelete.entry_type === "income" ? "Income" : "Expense"}</div>
                            <div>
                                <strong>{confirmDelete.entry_type === "income" ? "Source" : "Category"}:</strong>{" "}
                                {confirmDelete.category}
                                {confirmDelete.subcategory && ` › ${confirmDelete.subcategory}`}
                            </div>
                            <div><strong>Projected:</strong> ${formatMoney(confirmDelete.projected_amount)}</div>
                            <div><strong>Period:</strong> {formatPeriodLabel(confirmDelete.period)}</div>
                        </div>
                        <div className="confirm-actions">
                            <button className="confirm-cancel-btn" onClick={() => setConfirmDelete(null)}>Cancel</button>
                            <button className="confirm-delete-btn" onClick={confirmDeleteAction}>Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Budgets;