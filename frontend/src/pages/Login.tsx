import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-20 sm:py-28">
      <span className="eyebrow">Account</span>
      <h1 className="mt-2 font-display text-3xl italic">Welcome back</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password" type="password" value={password} onChange={setPassword} />
        {error && <p className="text-sm text-(--color-berry)">{error}</p>}
        <button disabled={loading} className="btn btn-primary w-full">
          {loading ? "Logging in..." : "Log in"}
        </button>
      </form>
      <p className="mt-5 text-sm text-(--color-muted)">
        No account? <Link to="/signup" className="text-(--color-berry)">Sign up</Link>
      </p>
    </div>
  );
}

export function Field({
  label, type, value, onChange,
}: { label: string; type: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block text-xs uppercase tracking-wide text-(--color-muted)">{label}</span>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field"
      />
    </label>
  );
}
