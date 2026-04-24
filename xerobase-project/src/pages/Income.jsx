import { useState, useEffect } from "react";
import api from "../api";
import "../styles/Income.css";
import Navbar from "../components/Navbar";

function Income() {
    const [entries, setEntries] = useState([]);
    const [date, setDate] = useState("");
    const [amount, setAmount] = useState("");
    const [incomeSource, setIncomeSource] = useState("");
    const [earnedBy, setEarnedBy] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = () => {
        api.get("/api/income/")
            .then((res) => setEntries(res.data))
            .catch((err) => console.error(err));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/api/income/", {
                date,
                amount,
                income_source: incomeSource,
                earned_by: earnedBy,
            });
            setDate("");
            setAmount("");
            setIncomeSource("");
            setEarnedBy("");
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
                            <label htmlFor="incomeSource">Employer / Income Source</label>
                            <input
                                type="text"
                                id="incomeSource"
                                placeholder="e.g. Acme Corp, Freelance, Rental"
                                value={incomeSource}
                                onChange={(e) => setIncomeSource(e.target.value)}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="earnedBy">Earned By</label>
                            <input
                                type="text"
                                id="earnedBy"
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
                                        <td>{entry.income_source}</td>
                                        <td>{entry.earned_by}</td>
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

export default Income;