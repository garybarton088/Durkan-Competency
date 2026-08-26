import { signIn, signUp } from "./actions";

export default function LoginPage({ searchParams }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div className="card" style={{ width: 380, padding: 24 }}>
        <div className="mono" style={{ fontSize: 10.5, color: "var(--amber)", letterSpacing: "0.08em", fontWeight: 600 }}>
          DURKAN
        </div>
        <h1 style={{ fontSize: 19, fontWeight: 600, marginTop: 4, marginBottom: 18 }}>Competency register</h1>

        {searchParams?.error && (
          <div style={{ background: "#fbeceb", color: "var(--brick)", fontSize: 12.5, padding: "8px 10px", borderRadius: 3, marginBottom: 12 }}>
            {searchParams.error}
          </div>
        )}
        {searchParams?.message && (
          <div style={{ background: "#eef3ea", color: "var(--sage)", fontSize: 12.5, padding: "8px 10px", borderRadius: 3, marginBottom: 12 }}>
            {searchParams.message}
          </div>
        )}

        <form action={signIn} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <span className="lbl">Work email</span>
            <input className="fld" type="email" name="email" required placeholder="name@durkan.co.uk" />
          </div>
          <div>
            <span className="lbl">Password</span>
            <input className="fld" type="password" name="password" required />
          </div>
          <button className="btn primary" style={{ justifyContent: "center", marginTop: 4 }}>Sign in</button>
        </form>

        <details style={{ marginTop: 18 }}>
          <summary style={{ fontSize: 12.5, color: "var(--steel)", cursor: "pointer" }}>First time here? Create an account</summary>
          <form action={signUp} style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 10 }}>
            <div>
              <span className="lbl">Full name</span>
              <input className="fld" name="full_name" required />
            </div>
            <div>
              <span className="lbl">Work email</span>
              <input className="fld" type="email" name="email" required />
            </div>
            <div>
              <span className="lbl">Password</span>
              <input className="fld" type="password" name="password" required minLength={8} />
            </div>
            <button className="btn" style={{ justifyContent: "center" }}>Create account</button>
            <p style={{ fontSize: 11, color: "#8a8676" }}>
              New accounts start with staff-level access. A senior person can upgrade you to
              senior or bid_team in the Supabase table editor (profiles table, role column).
            </p>
          </form>
        </details>
      </div>
    </div>
  );
}
