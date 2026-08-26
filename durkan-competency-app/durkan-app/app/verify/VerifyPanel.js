"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function VerifyPanel({ initialPending }) {
  const supabase = createClient();
  const [pending, setPending] = useState(initialPending);

  async function verify(id) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("competency_assessments")
      .update({ status: "verified", verified_by: user.id, verified_at: new Date().toISOString() })
      .eq("id", id);
    setPending((prev) => prev.filter((p) => p.id !== id));
  }

  async function sendBack(id) {
    await supabase.from("competency_assessments").update({ status: "self_assessed" }).eq("id", id);
    setPending((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 2 }}>Verify submissions</h2>
      <p style={{ fontSize: 13, color: "#7a7666", marginTop: 0, marginBottom: 16 }}>
        {pending.length} entr{pending.length === 1 ? "y" : "ies"} waiting for sign-off.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {pending.map((p) => (
          <div key={p.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <strong style={{ fontSize: 13.5 }}>{p.profiles?.full_name}</strong>
                <span style={{ color: "#7a7666", fontSize: 12 }}> · {p.profiles?.job_title}</span>
              </div>
              <span className="mono" style={{ fontSize: 11, color: "#9b9787" }}>{p.category_id}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4 }}>{p.competency_categories?.name}</div>
            <div style={{ fontSize: 12.5, marginBottom: 4 }}>Self-rated level: <strong>{p.level}</strong> / 5</div>
            <div style={{ fontSize: 12.5, color: "#7a7666", marginBottom: 10 }}>{p.evidence || "No evidence notes provided."}</div>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn primary" onClick={() => verify(p.id)}>Verify</button>
              <button className="btn" onClick={() => sendBack(p.id)}>Send back to staff</button>
            </div>
          </div>
        ))}
        {pending.length === 0 && (
          <div className="card" style={{ padding: 24, textAlign: "center", color: "#9b9787", fontSize: 13 }}>
            Nothing waiting for review.
          </div>
        )}
      </div>
    </div>
  );
}
