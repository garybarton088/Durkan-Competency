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
    department: profile?.department || "",
    business_division: profile?.business_division || "",
    start_date: profile?.start_date ? profile.start_date.slice(0, 7) : "",
    cscs_card_type: profile?.cscs_card_type || "",
    cscs_card_number: profile?.cscs_card_number || "",
    cscs_expiry_date: profile?.cscs_expiry_date || "",
  });
  const [savedProfile, setSavedProfile] = useState(false);

  const [experience, setExperience] = useState(initialExperience);
  const byCat = (cat) => experience.filter((e) => e.category === cat).map((e) => e.item_id);

  const [quals, setQuals] = useState(initialQuals);
  const [newQual, setNewQual] = useState({ name: "", awarding_body: "", date_obtained: "", expiry_date: "", certificate_ref: "", qual_type: "academic", has_expiry: false });

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
    const payload = {
      ...form,
      start_date: form.start_date ? `${form.start_date}-01` : null,
      cscs_expiry_date: form.cscs_expiry_date ? form.cscs_expiry_date : null,
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
    if (error) {
      alert("Couldn't save: " + error.message);
      return;
    }
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 1500);
  }

  function lengthOfService(monthValue) {
    if (!monthValue) return null;
    const [y, m] = monthValue.split("-").map(Number);
    const start = new Date(y, m - 1, 1);
    const now = new Date();
    let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (now.getDate() < start.getDate()) months -= 1;
    if (months < 0) return null;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    const parts = [];
    if (years > 0) parts.push(`${years} year${years === 1 ? "" : "s"}`);
    if (remMonths > 0 || years === 0) parts.push(`${remMonths} month${remMonths === 1 ? "" : "s"}`);
    return parts.join(", ");
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
    const { has_expiry, ...rest } = newQual;
    const toInsert = {
      ...rest,
      expiry_date: has_expiry && rest.expiry_date ? rest.expiry_date : null,
      date_obtained: rest.date_obtained ? rest.date_obtained : null,
    };
    const { data, error } = await supabase
      .from("qualifications")
      .insert({ staff_id: userId, ...toInsert })
      .select()
      .single();
    if (error) {
      alert("Couldn't add qualification: " + error.message);
      return;
    }
    if (data) {
      setQuals((prev) => [data, ...prev]);
      setNewQual({ name: "", awarding_body: "", date_obtained: "", expiry_date: "", certificate_ref: "", qual_type: newQual.qual_type, has_expiry: newQual.qual_type === "training" });
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
          <div><span className="lbl">Department</span><input className="fld" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /></div>
          <div>
            <span className="lbl">Business / Division</span>
            <select className="fld" value={form.business_division} onChange={(e) => setForm({ ...form, business_division: e.target.value })}>
              <option value="">Select...</option>
              <option value="Group">Group</option>
              <option value="Regen">Regen</option>
              <option value="Homes">Homes</option>
            </select>
          </div>
          <div>
            <span className="lbl">Durkan start date</span>
            <input className="fld" type="month" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
          </div>
          <div>
            <span className="lbl">Length of service</span>
            <div className="fld" style={{ background: "#F0EDE4", color: "#7A7666", display: "flex", alignItems: "center" }}>
              {lengthOfService(form.start_date) || "—"}
            </div>
          </div>
        </div>
        <button className="btn primary" onClick={saveProfile}>{savedProfile ? "Saved" : "Save details"}</button>
      </Section>

      <Section title="Qualifications & training">
        <div style={{ marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>CSCS card</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 1fr", gap: 8 }}>
            <div>
              <span className="lbl">Card type</span>
              <select className="fld" value={form.cscs_card_type} onChange={(e) => setForm({ ...form, cscs_card_type: e.target.value })}>
                <option value="">Select...</option>
                <option>Labourer (Green)</option>
                <option>Experienced Worker (Red)</option>
                <option>Skilled Worker (Blue)</option>
                <option>Advanced Craft (Gold)</option>
                <option>Supervisor (Gold)</option>
                <option>Manager (Black)</option>
                <option>Professionally Qualified Person (White)</option>
                <option>Academically Qualified Person (White)</option>
                <option>Provisional / Trainee (Red)</option>
              </select>
            </div>
            <div>
              <span className="lbl">Card number</span>
              <input className="fld" value={form.cscs_card_number} onChange={(e) => setForm({ ...form, cscs_card_number: e.target.value })} />
            </div>
            <div>
              <span className="lbl">Expiry date</span>
              <input className="fld" type="date" value={form.cscs_expiry_date} onChange={(e) => setForm({ ...form, cscs_expiry_date: e.target.value })} />
            </div>
          </div>
          <button className="btn" style={{ marginTop: 8 }} onClick={saveProfile}>{savedProfile ? "Saved" : "Save CSCS details"}</button>
        </div>

        {[
          { key: "academic", label: "Academic qualifications", hint: "Degrees, diplomas, NVQs, HNCs and similar." },
          { key: "training", label: "Training courses", hint: "SMSTS, CSCS, NEBOSH and similar formal training." },
          { key: "cpd", label: "CPD", hint: "Ongoing continuing professional development." },
        ].map((group) => {
          const groupQuals = quals.filter((q) => (q.qual_type || "academic") === group.key);
          return (
            <div key={group.key} style={{ marginBottom: 18 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>{group.label}</div>
              <div style={{ fontSize: 11, color: "#8a8676", marginBottom: 8 }}>{group.hint}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {groupQuals.map((q) => (
                  <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 3, fontSize: 12.5 }}>
                    <div>
                      <strong>{q.name}</strong>
                      <span style={{ color: "#7a7666" }}> · {q.awarding_body} {q.expiry_date ? `· expires ${q.expiry_date}` : ""}</span>
                    </div>
                    <button className="btn danger" onClick={() => removeQual(q.id)}>Remove</button>
                  </div>
                ))}
                {groupQuals.length === 0 && <div style={{ fontSize: 12, color: "#9b9787" }}>None added yet.</div>}
              </div>
            </div>
          );
        })}

        <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12 }}>
          <span className="lbl">Add a qualification</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1.5fr 1fr", gap: 8, marginBottom: 8 }}>
            <select
              className="fld"
              value={newQual.qual_type}
              onChange={(e) => setNewQual({ ...newQual, qual_type: e.target.value, has_expiry: e.target.value === "training" })}
            >
              <option value="academic">Academic</option>
              <option value="training">Training course</option>
              <option value="cpd">CPD</option>
            </select>
            <input className="fld" placeholder="Qualification name" value={newQual.name} onChange={(e) => setNewQual({ ...newQual, name: e.target.value })} />
            <input className="fld" placeholder="Awarding body" value={newQual.awarding_body} onChange={(e) => setNewQual({ ...newQual, awarding_body: e.target.value })} />
            <input className="fld" type="date" placeholder="Obtained" value={newQual.date_obtained} onChange={(e) => setNewQual({ ...newQual, date_obtained: e.target.value })} />
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5, marginBottom: 8 }}>
            <input type="checkbox" checked={newQual.has_expiry} onChange={(e) => setNewQual({ ...newQual, has_expiry: e.target.checked, expiry_date: e.target.checked ? newQual.expiry_date : "" })} />
            This has an expiry date
          </label>
          {newQual.has_expiry && (
            <div style={{ marginBottom: 8, maxWidth: 200 }}>
              <span className="lbl">Expiry date</span>
              <input className="fld" type="date" value={newQual.expiry_date} onChange={(e) => setNewQual({ ...newQual, expiry_date: e.target.value })} />
            </div>
          )}
          <button className="btn" onClick={addQual}>Add qualification</button>
        </div>
      </Section>

      <Section title="Project experience">
        <TickGroup label="Project types" items={lookups.projectTypes || []} checkedIds={byCat("project_type")} onToggle={(id) => toggleExperience("project_type", id)} />
        <TickGroup label="Project values" items={lookups.valueBands || []} checkedIds={byCat("value_band")} onToggle={(id) => toggleExperience("value_band", id)} />
        <TickGroup label="Build types" items={lookups.buildTypes || []} checkedIds={byCat("build_type")} onToggle={(id) => toggleExperience("build_type", id)} />
        <TickGroup label="Client types" items={lookups.clientTypes || []} checkedIds={byCat("client_type")} onToggle={(id) => toggleExperience("client_type", id)} />
        <TickGroup label="Procurement types" items={lookups.procurementTypes || []} checkedIds={byCat("procurement_type")} onToggle={(id) => toggleExperience("procurement_type", id)} />
        <TickGroup label="Contract types" items={lookups.contractTypes || []} checkedIds={byCat("contract_type")} onToggle={(id) => toggleExperience("contract_type", id)} />
        <TickGroup label="Digital / BIM experience" items={lookups.bimTypes || []} checkedIds={byCat("bim_type")} onToggle={(id) => toggleExperience("bim_type", id)} />
        <p style={{ fontSize: 11, color: "#8a8676", margin: 0 }}>Ticks save immediately — no need to click save.</p>
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
