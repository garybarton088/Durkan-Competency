"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LEVELS = ["Not assessed", "Awareness", "Developing", "Working", "Practitioner", "Expert"];

function Section({ title, children }) {
  return (
    <div className="card" style={{ padding: 16, marginBottom: 16 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{title}</h3>
      {children}
    </div>
  );
}

function TickGroup({ label, items, checkedIds, onToggle }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <span className="lbl">{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
        {items.map((item) => (
          <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" checked={checkedIds.includes(item.id)} onChange={() => onToggle(item.id)} />
            {item.name}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function StaffForm({ userId, profile, lookups, categories, initialExperience, initialQuals, initialAssessments }) {
  const supabase = createClient();
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    job_title: profile?.job_title || "",
    discipline: profile?.discipline || "",
    department: profile?.department || "",
    bsa_relevant: profile?.bsa_relevant || false,
  });
  const [savedProfile, setSavedProfile] = useState(false);

  const [experience, setExperience] = useState(initialExperience);
  const byCat = (cat) => experience.filter((e) => e.category === cat).map((e) => e.item_id);

  const [quals, setQuals] = useState(initialQuals);
  const [newQual, setNewQual] = useState({ name: "", awarding_body: "", date_obtained: "", expiry_date: "", certificate_ref: "" });

  const [assessments, setAssessments] = useState(
    Object.fromEntries(
      categories.map((c) => {
        const existing = initialAssessments.find((a) => a.category_id === c.id);
        return [c.id, existing || { category_id: c.id, level: 0, evidence: "", status: "self_assessed" }];
      })
    )
  );
  const [savedCat, setSavedCat] = useState(null);

  async function saveProfile() {
    await supabase.from("profiles").update(form).eq("id", userId);
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 1500);
  }

  async function toggleExperience(category, itemId) {
    const exists = experience.find((e) => e.category === category && e.item_id === itemId);
    if (exists) {
      await supabase.from("staff_experience").delete().eq("staff_id", userId).eq("category", category).eq("item_id", itemId);
      setExperience((prev) => prev.filter((e) => !(e.category === category && e.item_id === itemId)));
    } else {
      await supabase.from("staff_experience").insert({ staff_id: userId, category, item_id: itemId });
      setExperience((prev) => [...prev, { staff_id: userId, category, item_id: itemId }]);
    }
  }

  async function addQual() {
    if (!newQual.name.trim()) return;
    const { data, error } = await supabase
      .from("qualifications")
      .insert({ staff_id: userId, ...newQual })
      .select()
      .single();
    if (!error && data) {
      setQuals((prev) => [data, ...prev]);
      setNewQual({ name: "", awarding_body: "", date_obtained: "", expiry_date: "", certificate_ref: "" });
    }
  }

  async function removeQual(id) {
    await supabase.from("qualifications").delete().eq("id", id);
    setQuals((prev) => prev.filter((q) => q.id !== id));
  }

  async function saveAssessment(catId, submit) {
    const current = assessments[catId];
    const payload = {
      staff_id: userId,
      category_id: catId,
      level: current.level,
      evidence: current.evidence,
      last_assessed: new Date().toISOString().slice(0, 10),
      status: submit ? "pending_verification" : "self_assessed",
    };
    const { data } = await supabase
      .from("competency_assessments")
      .upsert(payload, { onConflict: "staff_id,category_id" })
      .select()
      .single();
    if (data) setAssessments((prev) => ({ ...prev, [catId]: data }));
    setSavedCat(catId);
    setTimeout(() => setSavedCat(null), 1500);
  }

  return (
    <div style={{ maxWidth: 760 }}>
      <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 2 }}>My profile</h2>
      <p style={{ fontSize: 13, color: "#7a7666", marginTop: 0, marginBottom: 18 }}>
        Keep this up to date — the bid team searches this data to staff tenders.
      </p>

      <Section title="Basic details">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
          <div><span className="lbl">Full name</span><input className="fld" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></div>
          <div><span className="lbl">Job title</span><input className="fld" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} /></div>
          <div><span className="lbl">Discipline</span><input className="fld" value={form.discipline} onChange={(e) => setForm({ ...form, discipline: e.target.value })} /></div>
          <div><span className="lbl">Department</span><input className="fld" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, marginBottom: 10 }}>
          <input type="checkbox" checked={form.bsa_relevant} onChange={(e) => setForm({ ...form, bsa_relevant: e.target.checked })} />
          I work on higher-risk building / BSA duty-holder roles
        </label>
        <button className="btn primary" onClick={saveProfile}>{savedProfile ? "Saved" : "Save details"}</button>
      </Section>

      <Section title="Project experience">
        <TickGroup label="Project types" items={lookups.projectTypes || []} checkedIds={byCat("project_type")} onToggle={(id) => toggleExperience("project_type", id)} />
        <TickGroup label="Project values" items={lookups.valueBands || []} checkedIds={byCat("value_band")} onToggle={(id) => toggleExperience("value_band", id)} />
        <TickGroup label="Build types" items={lookups.buildTypes || []} checkedIds={byCat("build_type")} onToggle={(id) => toggleExperience("build_type", id)} />
        <TickGroup label="Contract types" items={lookups.contractTypes || []} checkedIds={byCat("contract_type")} onToggle={(id) => toggleExperience("contract_type", id)} />
        <p style={{ fontSize: 11, color: "#8a8676", margin: 0 }}>Ticks save immediately — no need to click save.</p>
      </Section>

      <Section title="Qualifications & training">
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
          {quals.map((q) => (
            <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 3, fontSize: 12.5 }}>
              <div>
                <strong>{q.name}</strong>
                <span style={{ color: "#7a7666" }}> · {q.awarding_body} {q.expiry_date ? `· expires ${q.expiry_date}` : ""}</span>
              </div>
              <button className="btn danger" onClick={() => removeQual(q.id)}>Remove</button>
            </div>
          ))}
          {quals.length === 0 && <div style={{ fontSize: 12.5, color: "#9b9787" }}>No qualifications added yet.</div>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1.5fr 1fr 1fr", gap: 8, marginBottom: 8 }}>
          <input className="fld" placeholder="Qualification name" value={newQual.name} onChange={(e) => setNewQual({ ...newQual, name: e.target.value })} />
          <input className="fld" placeholder="Awarding body" value={newQual.awarding_body} onChange={(e) => setNewQual({ ...newQual, awarding_body: e.target.value })} />
          <input className="fld" type="date" placeholder="Obtained" value={newQual.date_obtained} onChange={(e) => setNewQual({ ...newQual, date_obtained: e.target.value })} />
          <input className="fld" type="date" placeholder="Expiry" value={newQual.expiry_date} onChange={(e) => setNewQual({ ...newQual, expiry_date: e.target.value })} />
        </div>
        <button className="btn" onClick={addQual}>Add qualification</button>
      </Section>

      <Section title="Competency self-assessment">
        <p style={{ fontSize: 11.5, color: "#7a7666", marginTop: -6, marginBottom: 12 }}>
          Submitting sends your entry to a senior for verification. Until verified it won't count as compliant for tenders.
        </p>
        {categories.map((c) => {
          const a = assessments[c.id];
          return (
            <div key={c.id} style={{ borderTop: "1px solid var(--line)", padding: "12px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: a.status === "verified" ? "var(--sage)" : a.status === "pending_verification" ? "var(--amber)" : "#9b9787",
                  }}
                >
                  {a.status === "verified" ? "Verified" : a.status === "pending_verification" ? "Pending verification" : "Self-assessed only"}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, marginBottom: 8 }}>
                <select
                  className="fld"
                  disabled={a.status === "verified"}
                  value={a.level}
                  onChange={(e) => setAssessments({ ...assessments, [c.id]: { ...a, level: Number(e.target.value) } })}
                >
                  {LEVELS.map((l, i) => <option key={i} value={i}>{i} · {l}</option>)}
                </select>
                <input
                  className="fld"
                  placeholder="Evidence — projects, roles, examples"
                  disabled={a.status === "verified"}
                  value={a.evidence}
                  onChange={(e) => setAssessments({ ...assessments, [c.id]: { ...a, evidence: e.target.value } })}
                />
              </div>
              {a.status !== "verified" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn" onClick={() => saveAssessment(c.id, false)}>{savedCat === c.id ? "Saved" : "Save draft"}</button>
                  <button className="btn primary" onClick={() => saveAssessment(c.id, true)}>Submit for verification</button>
                </div>
              )}
            </div>
          );
        })}
      </Section>
    </div>
  );
}
