import { useState, useEffect, useMemo } from "react";
import api from "../api";
import "../styles/Dashboard.css";
import Navbar from "../components/Navbar";
import Note from "../components/Note";
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

// A consistent palette mapped by category index
const CATEGORY_COLORS = [
    "#1976d2", "#43a047", "#fb8c00", "#8e24aa", "#e53935",
    "#00897b", "#5e35b1", "#fdd835", "#3949ab", "#d81b60",
    "#7cb342", "#f4511e", "#00acc1", "#6d4c41", "#546e7a",
    "#ec407a", "#26a69a", "#ab47bc", "#ff7043", "#789262",
];

const colorForIndex = (i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length];

function Dashboard() {
    const [period, setPeriod] = useState(getCurrentPeriod());
    const [incomeEntries, setIncomeEntries] = useState([]);
    const [expenseEntries, setExpenseEntries] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [customCategories, setCustomCategories] = useState([]);

    // Notes state (preserved from original Home page)
    const [notes, setNotes] = useState([]);
    const [content, setContent] = useState("");
    const [title, setTitle] = useState("");

    useEffect(() => {
        getNotes();
        fetchCategories();
    }, []);

    useEffect(() => {
        fetchIncome();
        fetchExpenses();
        fetchBudgets();
    }, [period]);

    const fetchIncome = () => {
        api.get(`/api/income/?period=${period}`)
            .then((res) => setIncomeEntries(res.data))
            .catch((err) => console.error(err));
    };

    const fetchExpenses = () => {
        api.get("/api/expenses/")
            .then((res) => setExpenseEntries(res.data))
            .catch((err) => console.error(err));
    };

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

    const getNotes = () => {
        api.get("/api/notes/")
            .then((res) => setNotes(res.data))
            .catch((err) => console.error(err));
    };

    const deleteNote = (id) => {
        api.delete(`/api/notes/delete/${id}/`)
            .then(() => getNotes())
            .catch((err) => alert(err));
    };

    const createNote = (e) => {
        e.preventDefault();
        api.post("/api/notes/", { title, content })
            .then(() => {
                setTitle("");
                setContent("");
                getNotes();
            })
            .catch((err) => alert(err));
    };

    // === Derived data ===

    // Filter expenses to selected month
    const periodExpenses = useMemo(() => {
        const [y, m] = period.split("-").map(Number);
        return expenseEntries.filter((e) => {
            const [ey, em] = e.date.split("-").map(Number);
            return ey === y && em === m;
        });
    }, [expenseEntries, period]);

    // Totals
    const totalIncome = useMemo(
        () => incomeEntries.reduce((s, e) => s + parseFloat(e.amount || 0), 0),
        [incomeEntries]
    );

    const totalExpenses = useMemo(
        () => periodExpenses.reduce((s, e) => s + parseFloat(e.amount || 0), 0),
        [periodExpenses]
    );

    const netCashflow = totalIncome - totalExpenses;

    // The full list of categories shown by default — defaults + any the user
    // has spent in or budgeted for during the selected period.
    const allCategoryNames = useMemo(() => {
        const merged = new Set([
            ...DEFAULT_CATEGORIES,
            ...customCategories.map((c) => c.name),
            ...periodExpenses.map((e) => e.category),
        ]);
        return [...merged].sort((a, b) => a.localeCompare(b));
    }, [customCategories, periodExpenses]);

    // Build per-category breakdown: actual spent, projected from budgets
    const categoryRows = useMemo(() => {
        // Sum actuals
        const actualByCat = {};
        for (const e of periodExpenses) {
            actualByCat[e.category] = (actualByCat[e.category] || 0) + parseFloat(e.amount || 0);
        }
        // Sum projected from expense budget rows (they may have subcategories,
        // so we sum all rows for a category)
        const projectedByCat = {};
        for (const b of budgets) {
            if (b.entry_type === "expense") {
                projectedByCat[b.category] =
                    (projectedByCat[b.category] || 0) + parseFloat(b.projected_amount || 0);
            }
        }

        return allCategoryNames.map((name, i) => {
            const actual = actualByCat[name] || 0;
            const projected = projectedByCat[name] || 0;
            const remaining = projected - actual;
            const pct = projected > 0 ? Math.min((actual / projected) * 100, 100) : 0;
            let status = "no-budget";
            if (projected > 0) {
                if (actual === 0) status = "untouched";
                else if (actual > projected) status = "over";
                else if (actual / projected >= 0.85) status = "warning";
                else status = "ok";
            } else if (actual > 0) {
                status = "unbudgeted-spend";
            }
            return {
                name,
                actual,
                projected,
                remaining,
                pct,
                status,
                color: colorForIndex(i),
            };
        });
    }, [allCategoryNames, periodExpenses, budgets]);

    // Pie chart data — only categories with actual spending > 0
    const pieData = useMemo(() => {
        const slices = categoryRows
            .filter((r) => r.actual > 0)
            .map((r) => ({ name: r.name, value: r.actual, color: r.color }));
        const total = slices.reduce((s, x) => s + x.value, 0);
        return { slices, total };
    }, [categoryRows]);

    // Pie chart geometry
    const pieSize = 240;
    const radius = pieSize / 2 - 4;
    const cx = pieSize / 2;
    const cy = pieSize / 2;

    const pieSegments = useMemo(() => {
        if (pieData.total === 0) return [];
        let cumulative = 0;
        return pieData.slices.map((s) => {
            const startAngle = (cumulative / pieData.total) * 2 * Math.PI;
            cumulative += s.value;
            const endAngle = (cumulative / pieData.total) * 2 * Math.PI;
            const x1 = cx + radius * Math.sin(startAngle);
            const y1 = cy - radius * Math.cos(startAngle);
            const x2 = cx + radius * Math.sin(endAngle);
            const y2 = cy - radius * Math.cos(endAngle);
            const largeArc = endAngle - startAngle > Math.PI ? 1 : 0;
            // Single-slice 100% case — draw as a circle
            const path =
                pieData.slices.length === 1
                    ? `M ${cx} ${cy - radius} A ${radius} ${radius} 0 1 1 ${cx - 0.01} ${cy - radius} Z`
                    : `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
            const pct = (s.value / pieData.total) * 100;
            return { ...s, path, pct };
        });
    }, [pieData, cx, cy, radius]);

    // Top "needs attention" categories — over or near limit
    const attentionCats = useMemo(() => {
        return categoryRows
            .filter((r) => r.status === "over" || r.status === "warning" || r.status === "unbudgeted-spend")
            .sort((a, b) => {
                // Over first, then warning, then unbudgeted-spend
                const order = { over: 0, warning: 1, "unbudgeted-spend": 2 };
                return order[a.status] - order[b.status];
            });
    }, [categoryRows]);

    return (
        <div className="dashboard-page">
            <Navbar />
            <div className="dashboard-content">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">Dashboard</h1>
                    <div className="dashboard-period">
                        <label htmlFor="period">Viewing</label>
                        <input
                            type="month"
                            id="period"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                        />
                        <span className="period-label">{formatPeriodLabel(period)}</span>
                    </div>
                </div>

                {/* === Top KPI strip === */}
                <div className="kpi-grid">
                    <div className="kpi-tile kpi-income">
                        <div className="kpi-label">Income</div>
                        <div className="kpi-value">+${formatMoney(totalIncome)}</div>
                        <div className="kpi-sub">
                            {incomeEntries.length} {incomeEntries.length === 1 ? "entry" : "entries"} this month
                        </div>
                    </div>
                    <div className="kpi-tile kpi-expense">
                        <div className="kpi-label">Expenses</div>
                        <div className="kpi-value">−${formatMoney(totalExpenses)}</div>
                        <div className="kpi-sub">
                            {periodExpenses.length} {periodExpenses.length === 1 ? "transaction" : "transactions"}
                        </div>
                    </div>
                    <div className={`kpi-tile ${netCashflow >= 0 ? "kpi-net-positive" : "kpi-net-negative"}`}>
                        <div className="kpi-label">Net Cashflow</div>
                        <div className="kpi-value">
                            {netCashflow < 0 ? "−" : "+"}${formatMoney(Math.abs(netCashflow))}
                        </div>
                        <div className="kpi-sub">
                            {netCashflow >= 0 ? "You earned more than you spent" : "Spending exceeds income"}
                        </div>
                    </div>
                </div>

                {/* === Pie chart + needs attention === */}
                <div className="dashboard-grid">
                    <div className="dashboard-card pie-card">
                        <h2>Spending Breakdown</h2>
                        {pieData.total === 0 ? (
                            <div className="empty-pie">
                                <p>No expenses recorded for {formatPeriodLabel(period)} yet.</p>
                                <p className="empty-pie-hint">
                                    Head to the Expenses page to add your first transaction.
                                </p>
                            </div>
                        ) : (
                            <div className="pie-layout">
                                <svg
                                    width={pieSize}
                                    height={pieSize}
                                    viewBox={`0 0 ${pieSize} ${pieSize}`}
                                    className="pie-svg"
                                >
                                    {pieSegments.map((seg) => (
                                        <path
                                            key={seg.name}
                                            d={seg.path}
                                            fill={seg.color}
                                            stroke="white"
                                            strokeWidth="2"
                                        >
                                            <title>{`${seg.name}: $${formatMoney(seg.value)} (${seg.pct.toFixed(1)}%)`}</title>
                                        </path>
                                    ))}
                                    <circle cx={cx} cy={cy} r={radius * 0.55} fill="white" />
                                    <text
                                        x={cx}
                                        y={cy - 6}
                                        textAnchor="middle"
                                        className="pie-center-label"
                                    >
                                        Total
                                    </text>
                                    <text
                                        x={cx}
                                        y={cy + 18}
                                        textAnchor="middle"
                                        className="pie-center-value"
                                    >
                                        ${formatMoney(pieData.total)}
                                    </text>
                                </svg>
                                <ul className="pie-legend">
                                    {pieSegments.map((seg) => (
                                        <li key={seg.name}>
                                            <span
                                                className="legend-swatch"
                                                style={{ backgroundColor: seg.color }}
                                            />
                                            <span className="legend-name">{seg.name}</span>
                                            <span className="legend-value">${formatMoney(seg.value)}</span>
                                            <span className="legend-pct">{seg.pct.toFixed(1)}%</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="dashboard-card attention-card">
                        <h2>Needs Attention</h2>
                        {attentionCats.length === 0 ? (
                            <div className="all-clear">
                                <div className="all-clear-icon">✓</div>
                                <p>All categories look good.</p>
                                <p className="all-clear-hint">Nothing is over budget right now.</p>
                            </div>
                        ) : (
                            <ul className="attention-list">
                                {attentionCats.map((c) => (
                                    <li key={c.name} className={`attention-item status-${c.status}`}>
                                        <div className="attention-row1">
                                            <span className="attention-name">{c.name}</span>
                                            <span className="attention-tag">
                                                {c.status === "over" && "OVER"}
                                                {c.status === "warning" && "85%+"}
                                                {c.status === "unbudgeted-spend" && "NO BUDGET"}
                                            </span>
                                        </div>
                                        <div className="attention-row2">
                                            <span>
                                                ${formatMoney(c.actual)}
                                                {c.projected > 0 && ` of $${formatMoney(c.projected)}`}
                                            </span>
                                            {c.projected > 0 && (
                                                <span className={c.remaining < 0 ? "amount-over" : "amount-ok"}>
                                                    {c.remaining < 0 ? "−" : ""}${formatMoney(Math.abs(c.remaining))}
                                                </span>
                                            )}
                                        </div>
                                        {c.projected > 0 && (
                                            <div className="attention-bar">
                                                <div
                                                    className={`attention-bar-fill ${c.status === "over" ? "over" : "warn"}`}
                                                    style={{ width: `${c.pct}%` }}
                                                />
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* === All categories breakdown === */}
                <div className="dashboard-card">
                    <h2>Category Breakdown — {formatPeriodLabel(period)}</h2>
                    <table className="category-table">
                        <thead>
                            <tr>
                                <th>Category</th>
                                <th className="num-col">Actual</th>
                                <th className="num-col">Projected</th>
                                <th className="num-col">Remaining</th>
                                <th>Progress</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categoryRows.map((c) => (
                                <tr key={c.name}>
                                    <td>
                                        <span className="cat-dot" style={{ backgroundColor: c.color }} />
                                        {c.name}
                                    </td>
                                    <td className="num-col">${formatMoney(c.actual)}</td>
                                    <td className="num-col">
                                        {c.projected > 0 ? `$${formatMoney(c.projected)}` : (
                                            <span className="muted">—</span>
                                        )}
                                    </td>
                                    <td className={`num-col ${c.projected > 0 ? (c.remaining < 0 ? "amount-over" : "amount-ok") : ""}`}>
                                        {c.projected > 0 ? (
                                            `${c.remaining < 0 ? "−" : ""}$${formatMoney(Math.abs(c.remaining))}`
                                        ) : (
                                            <span className="muted">—</span>
                                        )}
                                    </td>
                                    <td>
                                        {c.projected > 0 ? (
                                            <div className="row-progress">
                                                <div className="row-progress-track">
                                                    <div
                                                        className={`row-progress-fill status-${c.status}`}
                                                        style={{ width: `${c.pct}%` }}
                                                    />
                                                </div>
                                                <span className="row-progress-label">{c.pct.toFixed(0)}%</span>
                                            </div>
                                        ) : (
                                            <span className="muted">No budget set</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* === Notes section (preserved) === */}
                <div className="dashboard-card notes-card">
                    <h2>Quick Notes</h2>
                    <p className="notes-info">
                        Jot down reminders for yourself — anything from upcoming bills to budgeting goals.
                    </p>

                    <form onSubmit={createNote} className="notes-form">
                        <input
                            type="text"
                            placeholder="Note title"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                        <textarea
                            placeholder="Note content..."
                            rows="2"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            required
                        />
                        <button type="submit" className="notes-submit-btn">Add Note</button>
                    </form>

                    <div className="notes-list">
                        {notes.length === 0 ? (
                            <p className="no-entries">No notes yet.</p>
                        ) : (
                            notes.map((note) => (
                                <Note note={note} onDelete={deleteNote} key={note.id} />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;