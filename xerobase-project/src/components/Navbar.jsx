import { useNavigate } from "react-router-dom";
import "../styles/Navbar.css";

function Navbar() {
    const navigate = useNavigate();

    return (
        <nav className="navbar">
            <div className="navbar-brand">XeroBase Budgets</div>
            <div className="navbar-links">
                <button onClick={() => navigate("/")}>Home</button>
                <button onClick={() => navigate("/income")}>Income</button>
                <button onClick={() => navigate("/expenses")}>Expenses</button>
                <button onClick={() => navigate("/budgets")}>Budgets</button>
                <button className="logout-btn" onClick={() => navigate("/logout")}>Logout</button>
            </div>
        </nav>
    );
}

export default Navbar;