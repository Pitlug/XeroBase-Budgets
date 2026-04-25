import { useState, useEffect, useRef, useMemo } from "react";
import api from "../api";
import "../styles/Expenses.css";
import Navbar from "../components/Navbar";

const DEFAULT_CATEGORIES = [
    "Housing", "Utilities", "Groceries", "Transportation", "Insurance",
    "Healthcare", "Dining Out", "Entertainment", "Subscriptions",
    "Personal Care", "Clothing", "Education", "Savings", "Debt Payment",
    "Gifts/Donations", "Travel",
];

const PAYMENT_METHODS = [
    "Cash", "Debit Card", "Credit Card", "Bank Transfer", "Check",
    "Mobile Payment", "Other",
];

const RECURRENCE_OPTIONS = [
    { value: "weekly", label: "Weekly" },
    { value: "biweekly", label: "Bi-weekly" },
    { value: "monthly", label: "Monthly" },
    { value: "quarterly", label: "Quarterly" },
    { value: "yearly", label: "Yearly" },
];

const recurrenceLabel = (val) => {
    const o = RECURRENCE_OPTIONS.find((x) => x.value === val);
    return o ? o.label : "";
};

function Expenses() {
    const [entries, setEntries] = useState([]);
    const [customCategories, setCustomCategories] = useState([]);
    const [customSubcategories, setCustomSubcategories] = useState([]);

    // Form state
    const [date, setDate] = useState("");
    const [amount, setAmount] = useState("");
    const [category, setCategory] = useState("");
    const [subcategory, setSubcategory] = useState("");
    const [merchant, setMerchant] = useState("");
    const [description, setDescription] = useState("");
    const [paymentMethod, setPaymentMethod] = useState("");
    const [isRecurring, setIsRecurring] = useState(false);
    const [recurrenceFrequency, setRecurrenceFrequency] = useState("monthly");
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);

    // Inline new-category / new-subcategory UI
    const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState("");
    const [showNewSubcategoryInput, setShowNewSubcategoryInput] = useState(false);
    const [newSubcategoryName, setNewSubcategoryName] = useState("");

    // Modals
    const [showManageCategoriesModal, setShowManageCategoriesModal] = useState(false);
    const [showManageSubcategoriesModal, setShowManageSubcategoriesModal] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);

    const merchantInputRef = useRef(null);
    const formCardRef = useRef(null);

    useEffect(() => {
        fetchEntries();
        fetchCategories();
        fetchSubcategories();
    }, []);

    const fetchEntries = () => {
        api.get("/api/expenses/")
            .then((res) => setEntries(res.data))
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
        const merged = [...DEFAULT_CATEGORIES, ...customNames];
        return [...new Set(merged)].sort((a, b) => a.localeCompare(b));
    }, [customCategories]);

    const subcategoriesForSelected = useMemo(() => {
        if (!category) return [];
        return customSubcategories
            .filter((s) => s.category_name === category)
            .map((s) => s.name)
            .sort((a, b) => a.localeCompare(b));
    }, [category, customSubcategories]);

    const merchantSuggestions = useMemo(() => {
        const seen = new Set();
        const list = [];
        for (const entry of entries) {
            if (entry.merchant && !seen.has(entry.merchant.toLowerCase())) {
                seen.add(entry.merchant.toLowerCase());
                list.push(entry.merchant);
            }
        }
        return list;
    }, [entries]);

    const merchantSuggestion = useMemo(() => {
        if (!merchant) return "";
        const match = merchantSuggestions.find(
            (m) => m.toLowerCase().startsWith(merchant.toLowerCase())
                && m.toLowerCase() !== merchant.toLowerCase()
        );
        return match || "";
    }, [merchant, merchantSuggestions]);

    const resetForm = () => {
        setDate("");
        setAmount("");
        setCategory("");
        setSubcategory("");
        setMerchant("");
        setDescription("");
        setPaymentMethod("");
        setIsRecurring(false);
        setRecurrenceFrequency("monthly");
        setShowNewCategoryInput(false);
        setNewCategoryName("");
        setShowNewSubcategoryInput(false);
        setNewSubcategoryName("");
        setEditingId(null);
    };

    const handleCategoryChange = (e) => {
        const value = e.target.value;
        setSubcategory("");
        setShowNewSubcategoryInput(false);
        setNewSubcategoryName("");
        if (value === "__OTHER__") {
            setShowNewCategoryInput(true);
            setCategory("");
        } else {
            setShowNewCategoryInput(false);
            setNewCategoryName("");
            setCategory(value);
        }
    };

    const handleSubcategoryChange = (e) => {
        const value = e.target.value;
        if (value === "__OTHER__") {
            setShowNewSubcategoryInput(true);
            setSubcategory("");
        } else {
            setShowNewSubcategoryInput(false);
            setNewSubcategoryName("");
            setSubcategory(value);
        }
    };

    const handleAddNewCategory = async () => {
        const name = newCategoryName.trim();
        if (!name) return;
        try {
            const res = await api.post("/api/expense-categories/", { name });
            setCustomCategories([...customCategories, res.data]);
            setCategory(res.data.name);
            setNewCategoryName("");
            setShowNewCategoryInput(false);
        } catch (err) {
            const msg = err?.response?.data?.name?.[0] || err?.response?.data?.detail || "Could not add category.";
            alert(msg);
        }
    };

    const handleAddNewSubcategory = async () => {
        const name = newSubcategoryName.trim();
        if (!name || !category) return;
        try {
            const res = await api.post("/api/expense-subcategories/", {
                category_name: category,
                name,
            });
            setCustomSubcategories([...customSubcategories, res.data]);
            setSubcategory(res.data.name);
            setNewSubcategoryName("");
            setShowNewSubcategoryInput(false);
        } catch (err) {
            const msg = err?.response?.data?.name?.[0]
                || err?.response?.data?.non_field_errors?.[0]
                || err?.response?.data?.detail
                || "Could not add subcategory.";
            alert(msg);
        }
    };

    const handleDeleteCategory = async (id) => {
        try {
            await api.delete(`/api/expense-categories/delete/${id}/`);
            setCustomCategories(customCategories.filter((c) => c.id !== id));
        } catch (err) {
            alert("Could not delete category: " + err);
        }
    };

    const handleDeleteSubcategory = async (id) => {
        try {
            await api.delete(`/api/expense-subcategories/delete/${id}/`);
            setCustomSubcategories(customSubcategories.filter((s) => s.id !== id));
        } catch (err) {
            alert("Could not delete subcategory: " + err);
        }
    };

    const handleMerchantKeyDown = (e) => {
        if (e.key === "Tab" && merchantSuggestion) {
            e.preventDefault();
            setMerchant(merchantSuggestion);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!category) {
            alert("Please select or add a category.");
            return;
        }
        setLoading(true);
        const payload = {
            date,
            amount,
            category,
            subcategory,
            merchant,
            description,
            payment_method: paymentMethod,
            is_recurring: isRecurring,
            recurrence_frequency: isRecurring ? recurrenceFrequency : "none",
        };
        try {
            if (editingId) {
                await api.put(`/api/expenses/${editingId}/`, payload);
            } else {
                await api.post("/api/expenses/", payload);
            }
            resetForm();
            fetchEntries();
        } catch (err) {
            alert("Failed to save expense entry: " + err);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (entry) => {
        setEditingId(entry.id);
        setDate(entry.date);
        setAmount(entry.amount);
        setCategory(entry.category);
        setSubcategory(entry.subcategory || "");
        setMerchant(entry.merchant);
        setDescription(entry.description || "");
        setPaymentMethod(entry.payment_method);
        setIsRecurring(!!entry.is_recurring);
        setRecurrenceFrequency(
            entry.recurrence_frequency && entry.recurrence_frequency !== "none"
                ? entry.recurrence_frequency
                : "monthly"
        );
        setShowNewCategoryInput(false);
        setNewCategoryName("");
        setShowNewSubcategoryInput(false);
        setNewSubcategoryName("");
        if (formCardRef.current) {
            formCardRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    };

    const handleCancelEdit = () => resetForm();

    const requestDelete = (entry) => setConfirmDelete(entry);

    const confirmDeleteAction = async () => {
        if (!confirmDelete) return;
        try {
            await api.delete(`/api/expenses/delete/${confirmDelete.id}/`);
            if (editingId === confirmDelete.id) resetForm();
            fetchEntries();
        } catch (err) {
            alert("Could not delete: " + err);
        } finally {
            setConfirmDelete(null);
        }
    };

    return (
        <div className="expenses-page">
            <Navbar />
            <div className="expenses-content">
                <h1 className="expenses-title">Expense Tracker</h1>

                <div className="expenses-form-card" ref={formCardRef}>
                    {editingId && (
                        <div className="editing-banner">
                            <span>Editing existing entry — make your changes and click Save.</span>
                            <button
                                type="button"
                                className="cancel-edit-btn"
                                onClick={handleCancelEdit}
                                style={{ padding: "4px 10px", fontSize: 12 }}
                            >
                                Cancel
                            </button>
                        </div>
                    )}
                    <h2>{editingId ? "Edit Expense Entry" : "Add Expense Entry"}</h2>
                    <form onSubmit={handleSubmit} className="expenses-form">
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

                        {/* Category */}
                        <div className="form-group">
                            <div className="label-row">
                                <label htmlFor="category">Category</label>
                                <button
                                    type="button" className="manage-link"
                                    onClick={() => setShowManageCategoriesModal(true)}
                                >
                                    ✎ Manage
                                </button>
                            </div>
                            {!showNewCategoryInput ? (
                                <select
                                    id="category" value={category}
                                    onChange={handleCategoryChange} required
                                >
                                    <option value="" disabled>Select a category</option>
                                    {allCategories.map((cat) => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                    <option value="__OTHER__">+ Other (add new...)</option>
                                </select>
                            ) : (
                                <div className="new-category-row">
                                    <input
                                        type="text" placeholder="Type new category name"
                                        value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddNewCategory();
                                            }
                                        }}
                                        autoFocus
                                    />
                                    <button type="button" className="add-cat-btn" onClick={handleAddNewCategory}>Add</button>
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

                        {/* Subcategory */}
                        <div className="form-group">
                            <div className="label-row">
                                <label htmlFor="subcategory">Subcategory</label>
                                <button
                                    type="button" className="manage-link"
                                    onClick={() => setShowManageSubcategoriesModal(true)}
                                    disabled={!category}
                                    title={!category ? "Select a category first" : ""}
                                >
                                    ✎ Manage
                                </button>
                            </div>
                            {!showNewSubcategoryInput ? (
                                <select
                                    id="subcategory" value={subcategory}
                                    onChange={handleSubcategoryChange}
                                    disabled={!category}
                                >
                                    <option value="">
                                        {category ? "Select a subcategory (optional)" : "Pick a category first"}
                                    </option>
                                    {subcategoriesForSelected.map((sub) => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                    {category && (
                                        <option value="__OTHER__">+ Other (add new...)</option>
                                    )}
                                </select>
                            ) : (
                                <div className="new-category-row">
                                    <input
                                        type="text" placeholder={`New subcategory under "${category}"`}
                                        value={newSubcategoryName}
                                        onChange={(e) => setNewSubcategoryName(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault();
                                                handleAddNewSubcategory();
                                            }
                                        }}
                                        autoFocus
                                    />
                                    <button type="button" className="add-cat-btn" onClick={handleAddNewSubcategory}>Add</button>
                                    <button
                                        type="button" className="cancel-cat-btn"
                                        onClick={() => {
                                            setShowNewSubcategoryInput(false);
                                            setNewSubcategoryName("");
                                        }}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Payment Method */}
                        <div className="form-group">
                            <label htmlFor="paymentMethod">Payment Method</label>
                            <select
                                id="paymentMethod" value={paymentMethod}
                                onChange={(e) => setPaymentMethod(e.target.value)} required
                            >
                                <option value="" disabled>Select a method</option>
                                {PAYMENT_METHODS.map((method) => (
                                    <option key={method} value={method}>{method}</option>
                                ))}
                            </select>
                        </div>

                        {/* Merchant */}
                        <div className="form-group">
                            <label htmlFor="merchant">
                                Merchant
                                {merchantSuggestion && (
                                    <span className="hint-text"> — press Tab to autocomplete</span>
                                )}
                            </label>
                            <div className="merchant-wrapper">
                                <div className="merchant-ghost" aria-hidden="true">
                                    <span className="ghost-typed">{merchant}</span>
                                    <span className="ghost-suggestion">
                                        {merchantSuggestion ? merchantSuggestion.slice(merchant.length) : ""}
                                    </span>
                                </div>
                                <input
                                    ref={merchantInputRef}
                                    type="text" id="merchant"
                                    placeholder="e.g. Walmart, Shell, Netflix"
                                    value={merchant}
                                    onChange={(e) => setMerchant(e.target.value)}
                                    onKeyDown={handleMerchantKeyDown}
                                    autoComplete="off" required
                                />
                            </div>
                        </div>

                        {/* Recurring toggle row */}
                        <div className="toggle-row">
                            <label className="toggle-switch">
                                <input
                                    type="checkbox" checked={isRecurring}
                                    onChange={(e) => setIsRecurring(e.target.checked)}
                                />
                                <span className="toggle-slider"></span>
                            </label>
                            <span className="toggle-label">Recurring expense</span>
                            {isRecurring && (
                                <select
                                    className="toggle-frequency-select"
                                    value={recurrenceFrequency}
                                    onChange={(e) => setRecurrenceFrequency(e.target.value)}
                                >
                                    {RECURRENCE_OPTIONS.map((o) => (
                                        <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                </select>
                            )}
                        </div>

                        {/* Description */}
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

                        {editingId ? (
                            <div className="form-actions">
                                <button type="submit" className="submit-btn" disabled={loading}>
                                    {loading ? "Saving..." : "Save Changes"}
                                </button>
                                <button type="button" className="cancel-edit-btn" onClick={handleCancelEdit}>Cancel</button>
                            </div>
                        ) : (
                            <button type="submit" className="submit-btn" disabled={loading}>
                                {loading ? "Saving..." : "Add Entry"}
                            </button>
                        )}
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
                                    <th>Recurring</th>
                                    <th>Description</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {entries.map((entry) => (
                                    <tr
                                        key={entry.id}
                                        className={editingId === entry.id ? "editing-row" : ""}
                                    >
                                        <td>{entry.date}</td>
                                        <td>${parseFloat(entry.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                                        <td>
                                            <div className="category-stack">
                                                <span className="category-badge">{entry.category}</span>
                                                {entry.subcategory && (
                                                    <span className="subcategory-badge">{entry.subcategory}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td>{entry.merchant}</td>
                                        <td>{entry.payment_method}</td>
                                        <td>
                                            {entry.is_recurring ? (
                                                <span className="recurring-badge">
                                                    🔁 {recurrenceLabel(entry.recurrence_frequency) || "Recurring"}
                                                </span>
                                            ) : (
                                                <span className="muted">—</span>
                                            )}
                                        </td>
                                        <td className="description-cell">{entry.description || "—"}</td>
                                        <td>
                                            <div className="action-buttons">
                                                <button className="edit-btn" onClick={() => handleEdit(entry)}>Edit</button>
                                                <button className="delete-btn" onClick={() => requestDelete(entry)}>Delete</button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Manage Categories Modal */}
            {showManageCategoriesModal && (
                <div className="modal-overlay" onClick={() => setShowManageCategoriesModal(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Manage Custom Categories</h3>
                            <button className="modal-close" onClick={() => setShowManageCategoriesModal(false)}>×</button>
                        </div>
                        <p className="modal-info">
                            Default categories cannot be removed. Only categories you add yourself appear here.
                            Removing a category does not delete its existing expenses or subcategories.
                        </p>
                        {customCategories.length === 0 ? (
                            <p className="no-entries">No custom categories yet.</p>
                        ) : (
                            <ul className="category-manage-list">
                                {customCategories.map((cat) => (
                                    <li key={cat.id}>
                                        <span>{cat.name}</span>
                                        <button className="delete-btn" onClick={() => handleDeleteCategory(cat.id)}>Remove</button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {/* Manage Subcategories Modal */}
            {showManageSubcategoriesModal && (
                <div className="modal-overlay" onClick={() => setShowManageSubcategoriesModal(false)}>
                    <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Subcategories of "{category}"</h3>
                            <button className="modal-close" onClick={() => setShowManageSubcategoriesModal(false)}>×</button>
                        </div>
                        <p className="modal-info">
                            These subcategories belong to the currently selected category.
                            Removing a subcategory does not affect existing expenses.
                        </p>
                        {customSubcategories.filter((s) => s.category_name === category).length === 0 ? (
                            <p className="no-entries">No subcategories under this category yet.</p>
                        ) : (
                            <ul className="category-manage-list">
                                {customSubcategories
                                    .filter((s) => s.category_name === category)
                                    .map((sub) => (
                                        <li key={sub.id}>
                                            <span>{sub.name}</span>
                                            <button className="delete-btn" onClick={() => handleDeleteSubcategory(sub.id)}>Remove</button>
                                        </li>
                                    ))}
                            </ul>
                        )}
                    </div>
                </div>
            )}

            {/* Confirm Delete Modal */}
            {confirmDelete && (
                <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
                    <div className="modal-card confirm-modal-card" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Delete this expense?</h3>
                            <button className="modal-close" onClick={() => setConfirmDelete(null)}>×</button>
                        </div>
                        <p className="modal-info">This action cannot be undone.</p>
                        <div className="confirm-summary">
                            <div><strong>Date:</strong> {confirmDelete.date}</div>
                            <div><strong>Amount:</strong> ${parseFloat(confirmDelete.amount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</div>
                            <div><strong>Merchant:</strong> {confirmDelete.merchant}</div>
                            <div>
                                <strong>Category:</strong> {confirmDelete.category}
                                {confirmDelete.subcategory && ` › ${confirmDelete.subcategory}`}
                            </div>
                            {confirmDelete.is_recurring && (
                                <div><strong>Recurring:</strong> {recurrenceLabel(confirmDelete.recurrence_frequency)}</div>
                            )}
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

export default Expenses;