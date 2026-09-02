"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LEVELS = ["Not assessed", "Just starting", "Getting there", "Solid & dependable", "Very strong", "Expert"];

export default function VerifyPanel({ initialPending, isSenior, ownPendingCount }) {
  const supabase = createClient();
  const [pending, setPending] = useState(
    initialPending.map((p) => ({ ...p, _level: p.level, _evidence: p.evidence }))
  );

  function updateLocal(id, patch) {
    setPending((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  async function verify(item) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase
      .from("competency_assessments")
      .update({
        level: item._level,
        evidence: item._evidence,
        status: "verified",
        verified_by: user.id,
        verified_at: new Date().toISOString(),
      })
      .eq("id", item.id);
    setPending((prev) => prev.filter((p) => p.id !== item.id));
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 2 }}>Verify competencies</h2>
      <p style={{ fontSize: 13, color: "#5c6b78", marginTop: 0, marginBottom: 16 }}>
        {isSenior
          ? `Showing every self-assessed entry company-wide (senior oversight), excluding your own — those need a colleague with senior access to review. ${pending.length} not yet verified.`
          : `Showing entries for your direct reports. ${pending.length} not yet verified. Adjust the level or evidence if needed, then verify.`}
      </p>
      {isSenior && ownPendingCount > 0 && (
        <div style={{ background: "#FFF8EC", border: "1px solid #C77D0A", borderRadius: 4, padding: "8px 12px", marginBottom: 16, fontSize: 12.5, color: "#8a5a06" }}>
          You have {ownPendingCount} of your own competency rating{ownPendingCount === 1 ? "" : "s"} awaiting verification — you can't verify your own, so ask another senior colleague to review them here.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {pending.map((p) => (
          <div key={p.id} className="card" style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
              <div>
                <a href={`/report/${p.staff_id}`} style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>{p.profiles?.full_name} →</a>
                <span style={{ color: "#5c6b78", fontSize: 12 }}> · {p.profiles?.job_title}</span>
              </div>
              <span className="mono" style={{ fontSize: 11, color: "#8a97a1" }}>{p.category_id}</span>
            </div>
            <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>{p.competency_categories?.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, marginBottom: 10 }}>
              <select className="fld" value={p._level} onChange={(e) => updateLocal(p.id, { _level: Number(e.target.value) })}>
                {LEVELS.map((l, i) => <option key={i} value={i}>{i} · {l}</option>)}
              </select>
              <input
                className="fld"
                value={p._evidence || ""}
                placeholder="No evidence notes provided."
                onChange={(e) => updateLocal(p.id, { _evidence: e.target.value })}
              />
            </div>
            <button className="btn primary" onClick={() => verify(p)}>Verify</button>
          </div>
        ))}
        {pending.length === 0 && (
          <div className="card" style={{ padding: 24, textAlign: "center", color: "#8a97a1", fontSize: 13 }}>
            {isSenior
              ? "Nothing waiting for review."
              : "You have no direct reports with entries awaiting verification — or nobody has you set as their line manager yet."}
          </div>
        )}
      </div>
    </div>
  );
}
