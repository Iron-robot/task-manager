import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { getErrorMessage } from "../api/client.js";
import AuthLayout from "../components/AuthLayout.jsx";
import ErrorMessage from "../components/ErrorMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const EMPTY = { username: "", email: "", password: "", password2: "" };

export default function SignupPage() {
  const { user, signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    // Quick client-side check; the server validates again (never trust the client).
    if (form.password !== form.password2) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await signup(form);
      navigate("/", { replace: true });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  const incomplete = Object.values(form).some((v) => !v);

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Your tasks are private to you."
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      <form onSubmit={handleSubmit} className="form" noValidate>
        <label>
          Username
          <input name="username" value={form.username} onChange={update} autoComplete="username" required autoFocus />
        </label>
        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={update} autoComplete="email" required />
        </label>
        <label>
          Password
          <input name="password" type="password" value={form.password} onChange={update} autoComplete="new-password" required />
          <span className="hint">At least 8 characters, not all numbers.</span>
        </label>
        <label>
          Confirm password
          <input name="password2" type="password" value={form.password2} onChange={update} autoComplete="new-password" required />
        </label>
        <ErrorMessage message={error} />
        <button className="btn btn-primary" disabled={submitting || incomplete}>
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}
