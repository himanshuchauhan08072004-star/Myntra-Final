import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Field } from "./Login";

export function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signup(fullName, email, password);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="font-[family-name:var(--font-display)] text-3xl italic">Create your account</h1>
      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <Field label="Full name" type="text" value={fullName} onChange={setFullName} />
        <Field label="Email" type="email" value={email} onChange={setEmail} />
        <Field label="Password" type="password" value={password} onChange={setPassword} />
        {error && <p className="text-sm text-(--color-berry)">{error}</p>}
        <button
          disabled={loading}
          className="w-full rounded-full bg-(--color-ink) py-3 text-sm text-white disabled:opacity-50 dark:bg-white dark:text-black"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>
      <p className="mt-4 text-sm text-(--color-muted)">
        Already have an account? <Link to="/login" className="text-(--color-berry)">Log in</Link>
      </p>
    </div>
  );
}
