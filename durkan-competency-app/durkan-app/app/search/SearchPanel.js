"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const LEVELS = ["Not assessed", "Just starting", "Getting there", "Solid & dependable", "Very strong", "Expert"];
const LEVEL_DESCRIPTIONS = [
  "Haven't rated this yet.",
  "Aware of it, but still learning the basics.",
  "Building experience — not fully independent yet.",
  "Can be trusted to do this well day-to-day without supervision.",
  "Often the person others turn to for this.",
  "Could teach or mentor others in this area.",
];
const EVIDENCE_EXAMPLES = {
  TDC: "e.g. 'Site Manager on the Kings Cross scheme, RC frame, 2022-24'",
  BFS: "e.g. 'Led fire strategy coordination on a 12-storey HRB scheme, working directly with the fire engineer'",
  BSA: "e.g. 'Acting Principal Designer duties on two Gateway 2 submissions in 2024'",
  HSW: "e.g. 'Principal Contractor CDM duties on a live hospital refurb — zero RIDDOR incidents over 18 months'",
  BEH: "e.g. 'Raised a design safety concern that changed the cladding spec on the Riverside scheme'",
  MGT: "e.g. 'Line manage 4 site managers; review and sign off their competency assessments quarterly'",
};

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

function ChecklistItem({ done, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, padding: "6px 0" }}>
      <span
        style={{
          width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
          background: done ? "var(--sage)" : "#E1E5E8",
          color: "#fff", fontSize: 11, fontWeight: 700,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        {done ? "✓" : ""}
      </span>
      <span style={{ color: done ? "var(--ink)" : "#5c6b78" }}>{label}</span>
    </div>
  );
}

export default function StaffForm({ userId, profile, lookups, categories, initialExperience, initialQuals, initialAssessments, initialClientExperience, allStaff, initialGatewayExperience }) {
  const supabase = createClient();
  const [form, setForm] = useState({
    full_name: profile?.full_name || "",
    job_title: profile?.job_title || "",
    department: profile?.department || "",
    business_division: profile?.business_division || "",
    start_date: profile?.start_date ? profile.start_date.slice(0, 7) : "",
    line_manager_id: profile?.line_manager_id || "",
    cscs_card_type: profile?.cscs_card_type || "",
    cscs_card_number: profile?.cscs_card_number || "",
    cscs_expiry_date: profile?.cscs_expiry_date || "",
  });
  const [savedProfile, setSavedProfile] = useState(false);
  const [tab, setTab] = useState("basic");

  const [experience, setExperience] = useState(initialExperience);
  const byCat = (cat) => experience.filter((e) => e.category === cat).map((e) => e.item_id);

  const [quals, setQuals] = useState(initialQuals);
  const [clientExperience, setClientExperience] = useState(initialClientExperience || []);
  const [newClientEntry, setNewClientEntry] = useState({ client_id: "", other_client_name: "", project_name: "", is_durkan_job: true });
  const [hrbForm, setHrbForm] = useState({
    currently_on_hrb: profile?.currently_on_hrb || false,
    current_hrb_project: profile?.current_hrb_project || "",
    current_hrb_outline: profile?.current_hrb_outline || "",
  });
  const [savedHrb, setSavedHrb] = useState(false);
  const [gatewayExperience, setGatewayExperience] = useState(initialGatewayExperience || []);
  const [newGatewayEntry, setNewGatewayEntry] = useState({ project_name: "", gateway_stage: "Gateway 2", outline: "" });
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
  const [lastSaved, setLastSaved] = useState(
    Object.fromEntries(categories.map((c) => {
      const existing = initialAssessments.find((a) => a.category_id === c.id);
      return [c.id, { level: existing?.level || 0, evidence: existing?.evidence || "" }];
    }))
  );

  const [confirmedAt, setConfirmedAt] = useState(profile?.profile_confirmed_at || null);
  const [confirming, setConfirming] = useState(false);

  async function saveProfile() {
    const payload = {
      ...form,
      start_date: form.start_date ? `${form.start_date}-01` : null,
      cscs_expiry_date: form.cscs_expiry_date ? form.cscs_expiry_date : null,
      line_manager_id: form.line_manager_id || null,
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

  async function addClientEntry() {
    const isOther = newClientEntry.client_id === "other";
    if (isOther && !newClientEntry.other_client_name.trim()) return;
    if (!isOther && !newClientEntry.client_id) return;
    const payload = {
      staff_id: userId,
      client_id: isOther ? null : Number(newClientEntry.client_id),
      other_client_name: isOther ? newClientEntry.other_client_name.trim() : "",
      project_name: newClientEntry.project_name,
      is_durkan_job: newClientEntry.is_durkan_job,
    };
    const { data, error } = await supabase.from("client_experience").insert(payload).select().single();
    if (error) {
      alert("Couldn't add: " + error.message);
      return;
    }
    if (data) {
      setClientExperience((prev) => [data, ...prev]);
      setNewClientEntry({ client_id: "", other_client_name: "", project_name: "", is_durkan_job: true });
    }
  }

  async function removeClientEntry(id) {
    await supabase.from("client_experience").delete().eq("id", id);
    setClientExperience((prev) => prev.filter((c) => c.id !== id));
  }

  function clientName(entry) {
    if (entry.other_client_name) return entry.other_client_name;
    const c = (lookups.clients || []).find((x) => x.id === entry.client_id);
    return c ? c.name : "Unknown client";
  }

  async function saveHrb() {
    const payload = {
      currently_on_hrb: hrbForm.currently_on_hrb,
      current_hrb_project: hrbForm.currently_on_hrb ? hrbForm.current_hrb_project : "",
      current_hrb_outline: hrbForm.currently_on_hrb ? hrbForm.current_hrb_outline : "",
    };
    const { error } = await supabase.from("profiles").update(payload).eq("id", userId);
    if (error) {
      alert("Couldn't save: " + error.message);
      return;
    }
    setSavedHrb(true);
    setTimeout(() => setSavedHrb(false), 1500);
  }

  async function addGatewayEntry() {
    if (!newGatewayEntry.project_name.trim()) return;
    const { data, error } = await supabase
      .from("gateway_experience")
      .insert({ staff_id: userId, ...newGatewayEntry })
      .select()
      .single();
    if (error) {
      alert("Couldn't add: " + error.message);
      return;
    }
    if (data) {
      setGatewayExperience((prev) => [data, ...prev]);
      setNewGatewayEntry({ project_name: "", gateway_stage: "Gateway 2", outline: "" });
    }
  }

  async function removeGatewayEntry(id) {
    await supabase.from("gateway_experience").delete().eq("id", id);
    setGatewayExperience((prev) => prev.filter((g) => g.id !== id));
  }

  async function saveAssessment(catId) {
    const current = assessments[catId];
    const payload = {
      staff_id: userId,
      category_id: catId,
      level: current.level,
      evidence: current.evidence,
      last_assessed: new Date().toISOString().slice(0, 10),
      status: "self_assessed",
    };
    const { data } = await supabase
      .from("competency_assessments")
      .upsert(payload, { onConflict: "staff_id,category_id" })
      .select()
      .single();
    if (data) {
      setAssessments((prev) => ({ ...prev, [catId]: data }));
      setLastSaved((prev) => ({ ...prev, [catId]: { level: data.level, evidence: data.evidence } }));
    }
    setSavedCat(catId);
    setTimeout(() => setSavedCat(null), 1500);
  }

  async function confirmProfile() {
    setConfirming(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from("profiles").update({ profile_confirmed_at: now }).eq("id", userId);
    setConfirming(false);
    if (error) {
      alert("Couldn't confirm: " + error.message);
      return;
    }
    setConfirmedAt(now);
  }

  const basicComplete = Boolean(form.full_name && form.job_title && form.department);
  const competencyRatedCount = Object.values(assessments).filter((a) => a.level > 0).length;
  const formattedConfirmDate = confirmedAt
    ? new Date(confirmedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })
    : null;

  return (
    <div style={{ maxWidth: 760 }}>
      <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 2 }}>My profile</h2>
      <p style={{ fontSize: 13, color: "#5c6b78", marginTop: 0, marginBottom: 18 }}>
        Keep this up to date — the bid team searches this data to staff tenders.
      </p>

      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap", background: "#EAF2EF", padding: 6, borderRadius: 6 }}>
        {[
          ["basic", "Basic details"],
          ["quals", "Qualifications"],
          ["clients", "Clients"],
          ["experience", "Project experience"],
          ["competency", "Competencies"],
          ["hrb", "HRB & Gateway"],
          ["confirm", "Review & confirm"],
        ].map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              all: "unset",
              cursor: "pointer",
              padding: "9px 16px",
              fontSize: 13.5,
              fontWeight: 700,
              borderRadius: 4,
              color: tab === key ? "#fff" : "var(--ink)",
              background: tab === key ? "var(--ink)" : "transparent",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "basic" && (
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
            <div className="fld" style={{ background: "#EAF2EF", color: "#5c6b78", display: "flex", alignItems: "center" }}>
              {lengthOfService(form.start_date) || "—"}
            </div>
          </div>
          <div>
            <span className="lbl">Line manager</span>
            <select className="fld" value={form.line_manager_id} onChange={(e) => setForm({ ...form, line_manager_id: e.target.value })}>
              <option value="">Select...</option>
              {(allStaff || []).filter((s) => s.id !== userId).map((s) => (
                <option key={s.id} value={s.id}>{s.full_name || "Unnamed"}</option>
              ))}
            </select>
          </div>
        </div>
        <button className="btn primary" onClick={saveProfile}>{savedProfile ? "Saved" : "Save details"}</button>
      </Section>
      )}

      {tab === "quals" && (
      <Section title="Qualifications & training">
        <div style={{ marginBottom: 18, paddingBottom: 16, borderBottom: "1px solid var(--line)" }}>
          <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 8 }}>CSCS card</div>
          <div style={{ display: "grid", gridTemplateColumns: form.cscs_card_type && form.cscs_card_type !== "None / Expired" ? "1.5fr 1fr 1fr" : "1.5fr", gap: 8 }}>
            <div>
              <span className="lbl">Card type</span>
              <select
                className="fld"
                value={form.cscs_card_type}
                onChange={(e) => {
                  const value = e.target.value;
                  const clearing = value === "None / Expired" || value === "";
                  setForm({
                    ...form,
                    cscs_card_type: value,
                    cscs_card_number: clearing ? "" : form.cscs_card_number,
                    cscs_expiry_date: clearing ? "" : form.cscs_expiry_date,
                  });
                }}
              >
                <option value="">Select...</option>
                <option>None / Expired</option>
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
            {form.cscs_card_type && form.cscs_card_type !== "None / Expired" && (
              <>
                <div>
                  <span className="lbl">Card number</span>
                  <input className="fld" value={form.cscs_card_number} onChange={(e) => setForm({ ...form, cscs_card_number: e.target.value })} />
                </div>
                <div>
                  <span className="lbl">Expiry date</span>
                  <input className="fld" type="date" value={form.cscs_expiry_date} onChange={(e) => setForm({ ...form, cscs_expiry_date: e.target.value })} />
                </div>
              </>
            )}
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
              <div style={{ fontSize: 11, color: "#6b7a86", marginBottom: 8 }}>{group.hint}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 10 }}>
                {groupQuals.map((q) => (
                  <div key={q.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 3, fontSize: 12.5 }}>
                    <div>
                      <strong>{q.name}</strong>
                      <span style={{ color: "#5c6b78" }}> · {q.awarding_body} {q.expiry_date ? `· expires ${q.expiry_date}` : ""}</span>
                    </div>
                    <button className="btn danger" onClick={() => removeQual(q.id)}>Remove</button>
                  </div>
                ))}
                {groupQuals.length === 0 && <div style={{ fontSize: 12, color: "#8a97a1" }}>None added yet.</div>}
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
      )}

      {tab === "clients" && (
      <Section title="Clients you've worked for">
        <p style={{ fontSize: 11.5, color: "#6b7a86", marginTop: -6, marginBottom: 12 }}>
          Pick a client, add the project name, and tick if it was a Durkan job — add as many as apply. No need to go back further than about the last 5 years unless it's particularly relevant.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {clientExperience.map((c) => (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 3, fontSize: 12.5 }}>
              <div>
                <strong>{clientName(c)}</strong>
                {c.project_name && <span style={{ color: "#5c6b78" }}> · {c.project_name}</span>}
                {c.is_durkan_job && <span style={{ color: "var(--steel)", fontWeight: 600 }}> · Durkan job</span>}
              </div>
              <button className="btn danger" onClick={() => removeClientEntry(c.id)}>Remove</button>
            </div>
          ))}
          {clientExperience.length === 0 && <div style={{ fontSize: 12.5, color: "#8a97a1" }}>No clients added yet.</div>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1.3fr 1fr", gap: 8, marginBottom: 8 }}>
          <select
            className="fld"
            value={newClientEntry.client_id}
            onChange={(e) => setNewClientEntry({ ...newClientEntry, client_id: e.target.value })}
          >
            <option value="">Select a client...</option>
            <optgroup label="Housing associations">
              {(lookups.clients || []).filter((c) => c.category === "housing_association").map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
            <optgroup label="London local authorities">
              {(lookups.clients || []).filter((c) => c.category === "local_authority").map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
            <option value="other">Other (please specify)</option>
          </select>
          <input className="fld" placeholder="Project name" value={newClientEntry.project_name} onChange={(e) => setNewClientEntry({ ...newClientEntry, project_name: e.target.value })} />
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" checked={newClientEntry.is_durkan_job} onChange={(e) => setNewClientEntry({ ...newClientEntry, is_durkan_job: e.target.checked })} />
            Durkan job
          </label>
        </div>
        {newClientEntry.client_id === "other" && (
          <input
            className="fld"
            placeholder="Client name"
            style={{ marginBottom: 8 }}
            value={newClientEntry.other_client_name}
            onChange={(e) => setNewClientEntry({ ...newClientEntry, other_client_name: e.target.value })}
          />
        )}
        <button className="btn" onClick={addClientEntry}>Add client</button>
      </Section>
      )}

      {tab === "experience" && (
      <Section title="Project experience">
        <p style={{ fontSize: 12.5, color: "#5c6b78", marginTop: -6, marginBottom: 16, lineHeight: 1.5 }}>
          This is where you record the breadth of your practical experience — the sectors, build
          types, contracts and specialisms you've actually worked with. Only tick something if
          you've genuinely delivered it yourself, not just observed it or worked alongside someone
          who did. This is what the bid team searches against, so accuracy here matters more than
          ticking as many boxes as possible.
        </p>
        <TickGroup label="Project types" items={lookups.projectTypes || []} checkedIds={byCat("project_type")} onToggle={(id) => toggleExperience("project_type", id)} />
        <TickGroup label="Project values" items={lookups.valueBands || []} checkedIds={byCat("value_band")} onToggle={(id) => toggleExperience("value_band", id)} />
        <TickGroup label="Build types" items={lookups.buildTypes || []} checkedIds={byCat("build_type")} onToggle={(id) => toggleExperience("build_type", id)} />
        <TickGroup label="Client types" items={lookups.clientTypes || []} checkedIds={byCat("client_type")} onToggle={(id) => toggleExperience("client_type", id)} />
        <TickGroup label="Procurement types" items={lookups.procurementTypes || []} checkedIds={byCat("procurement_type")} onToggle={(id) => toggleExperience("procurement_type", id)} />
        <TickGroup label="Contract types" items={lookups.contractTypes || []} checkedIds={byCat("contract_type")} onToggle={(id) => toggleExperience("contract_type", id)} />
        <TickGroup label="Digital / BIM experience" items={lookups.bimTypes || []} checkedIds={byCat("bim_type")} onToggle={(id) => toggleExperience("bim_type", id)} />

        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--steel)", margin: "16px 0 10px", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          Structure & frame
        </div>
        <TickGroup label="Frame types" items={lookups.frameTypes || []} checkedIds={byCat("frame_type")} onToggle={(id) => toggleExperience("frame_type", id)} />
        <TickGroup label="MMC / offsite methods" items={lookups.mmcTypes || []} checkedIds={byCat("mmc_type")} onToggle={(id) => toggleExperience("mmc_type", id)} />
        <TickGroup label="Materials" items={lookups.materialTypes || []} checkedIds={byCat("material_type")} onToggle={(id) => toggleExperience("material_type", id)} />

        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--steel)", margin: "16px 0 10px", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          Refurbishment & maintenance
        </div>
        <TickGroup label="Refurbishment / maintenance types" items={lookups.refurbTypes || []} checkedIds={byCat("refurb_type")} onToggle={(id) => toggleExperience("refurb_type", id)} />

        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--steel)", margin: "16px 0 10px", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          Residential
        </div>
        <TickGroup label="Residential project types" items={lookups.residentialTypes || []} checkedIds={byCat("residential_type")} onToggle={(id) => toggleExperience("residential_type", id)} />
        <TickGroup label="Scale (unit count)" items={lookups.scaleBands || []} checkedIds={byCat("scale_band")} onToggle={(id) => toggleExperience("scale_band", id)} />

        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--steel)", margin: "16px 0 10px", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          Sustainability
        </div>
        <TickGroup label="M&E / sustainability" items={lookups.sustainabilityTypes || []} checkedIds={byCat("sustainability_type")} onToggle={(id) => toggleExperience("sustainability_type", id)} />

        <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--steel)", margin: "16px 0 10px", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          Stakeholders & accreditation
        </div>
        <TickGroup label="Constraints / third parties" items={lookups.constraintTypes || []} checkedIds={byCat("constraint_type")} onToggle={(id) => toggleExperience("constraint_type", id)} />
        <TickGroup label="Warranty & design accreditation" items={lookups.accreditationTypes || []} checkedIds={byCat("accreditation_type")} onToggle={(id) => toggleExperience("accreditation_type", id)} />

        <p style={{ fontSize: 11, color: "#6b7a86", margin: "16px 0 0" }}>Ticks save immediately — no need to click save.</p>
      </Section>
      )}

      {tab === "competency" && (
      <Section title="Competency self-assessment">
        <p style={{ fontSize: 11.5, color: "#5c6b78", marginTop: -6, marginBottom: 10 }}>
          Rate yourself honestly against each area below. A senior reviewer can verify or adjust these at any time — you don't need to submit anything separately.
        </p>
        {Object.keys(assessments).some((catId) => assessments[catId].level !== lastSaved[catId]?.level || assessments[catId].evidence !== lastSaved[catId]?.evidence) && (
          <div style={{ background: "#FFF8EC", border: "1px solid #C77D0A", borderRadius: 4, padding: "8px 12px", marginBottom: 14, fontSize: 12.5, color: "#8a5a06", fontWeight: 600 }}>
            You have unsaved ratings below — each area has its own Save button, so make sure to click it for every one you've changed.
          </div>
        )}
        <div style={{ background: "#EAF2EF", borderRadius: 4, padding: "10px 12px", marginBottom: 16 }}>
          <div className="lbl" style={{ marginBottom: 8 }}>What the scores mean</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {LEVELS.map((l, i) => (
              <div key={i} style={{ fontSize: 12, display: "flex", gap: 8 }}>
                <strong style={{ minWidth: 130, flexShrink: 0 }}>{i} · {l}</strong>
                <span style={{ color: "#5c6b78" }}>{LEVEL_DESCRIPTIONS[i]}</span>
              </div>
            ))}
          </div>
        </div>
        {categories.map((c) => {
          const a = assessments[c.id];
          const isDirty = a.level !== lastSaved[c.id]?.level || a.evidence !== lastSaved[c.id]?.evidence;
          return (
            <div
              key={c.id}
              style={{
                borderTop: "1px solid var(--line)",
                padding: "12px",
                margin: "0 -12px",
                background: isDirty ? "#FFF8EC" : "transparent",
                borderLeft: isDirty ? "3px solid #C77D0A" : "3px solid transparent",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{c.name}</span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isDirty ? "#C77D0A" : a.status === "verified" ? "var(--sage)" : "#8a97a1",
                  }}
                >
                  {isDirty ? "Unsaved changes" : a.status === "verified" ? "Verified" : "Not yet verified"}
                </span>
              </div>
              <p style={{ fontSize: 12, color: "#5c6b78", margin: "2px 0 8px" }}>{c.description}</p>
              <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 10, marginBottom: 4 }}>
                <select
                  className="fld"
                  disabled={a.status === "verified"}
                  value={a.level}
                  onChange={(e) => setAssessments({ ...assessments, [c.id]: { ...a, level: Number(e.target.value) } })}
                >
                  {LEVELS.map((l, i) => <option key={i} value={i}>{i} · {l}</option>)}
                </select>
                <textarea
                  className="fld"
                  rows={2}
                  placeholder={EVIDENCE_EXAMPLES[c.id] || "e.g. a specific project, your role on it, and roughly when"}
                  disabled={a.status === "verified"}
                  value={a.evidence}
                  onChange={(e) => setAssessments({ ...assessments, [c.id]: { ...a, evidence: e.target.value } })}
                />
              </div>
              <p style={{ fontSize: 11, color: "#8a97a1", margin: "0 0 8px 190px" }}>
                Name the project or situation and what you actually did — specifics help a reviewer trust the rating.
              </p>
              {a.status !== "verified" && (
                <button className={isDirty ? "btn primary" : "btn"} onClick={() => saveAssessment(c.id)}>
                  {savedCat === c.id ? "Saved" : isDirty ? "Save this rating" : "Save"}
                </button>
              )}
            </div>
          );
        })}
      </Section>
      )}

      {tab === "hrb" && (
      <Section title="Higher-risk buildings & Gateway experience">
        <p style={{ fontSize: 12.5, color: "#5c6b78", marginTop: -6, marginBottom: 16, lineHeight: 1.5 }}>
          This is used to prioritise Building Safety Act compliance checks — the people working on
          higher-risk buildings, or who've taken a project through a BSR Gateway, are where our
          legal exposure is highest, so this is what your line manager will look at most closely
          when reviewing your competency ratings.
        </p>

        <div style={{ marginBottom: 20, paddingBottom: 18, borderBottom: "1px solid var(--line)" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={hrbForm.currently_on_hrb}
              onChange={(e) => setHrbForm({ ...hrbForm, currently_on_hrb: e.target.checked })}
            />
            I am currently working on a higher-risk building
          </label>
          {hrbForm.currently_on_hrb && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginBottom: 10 }}>
              <div>
                <span className="lbl">Project name</span>
                <input className="fld" value={hrbForm.current_hrb_project} onChange={(e) => setHrbForm({ ...hrbForm, current_hrb_project: e.target.value })} />
              </div>
              <div>
                <span className="lbl">Your role / the works involved</span>
                <input
                  className="fld"
                  placeholder="e.g. Site Manager overseeing façade remediation on an 18-storey residential tower"
                  value={hrbForm.current_hrb_outline}
                  onChange={(e) => setHrbForm({ ...hrbForm, current_hrb_outline: e.target.value })}
                />
              </div>
            </div>
          )}
          <button className="btn" onClick={saveHrb}>{savedHrb ? "Saved" : "Save"}</button>
        </div>

        <div style={{ fontSize: 12.5, fontWeight: 600, marginBottom: 2 }}>BSR Gateway experience</div>
        <p style={{ fontSize: 11, color: "#6b7a86", marginBottom: 10 }}>
          Any projects where you've taken a scheme through Gateway 2 (design) and/or Gateway 3
          (completion) with the Building Safety Regulator.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
          {gatewayExperience.map((g) => (
            <div key={g.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "8px 10px", border: "1px solid var(--line)", borderRadius: 3, fontSize: 12.5 }}>
              <div>
                <strong>{g.project_name}</strong>
                <span style={{ color: "var(--steel)", fontWeight: 600 }}> · {g.gateway_stage}</span>
                {g.outline && <div style={{ color: "#5c6b78", marginTop: 2 }}>{g.outline}</div>}
              </div>
              <button className="btn danger" onClick={() => removeGatewayEntry(g.id)}>Remove</button>
            </div>
          ))}
          {gatewayExperience.length === 0 && <div style={{ fontSize: 12.5, color: "#8a97a1" }}>No Gateway experience added yet.</div>}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 8, marginBottom: 8 }}>
          <input className="fld" placeholder="Project name" value={newGatewayEntry.project_name} onChange={(e) => setNewGatewayEntry({ ...newGatewayEntry, project_name: e.target.value })} />
          <select className="fld" value={newGatewayEntry.gateway_stage} onChange={(e) => setNewGatewayEntry({ ...newGatewayEntry, gateway_stage: e.target.value })}>
            <option>Gateway 2</option>
            <option>Gateway 3</option>
            <option>Gateway 2 & 3</option>
          </select>
        </div>
        <textarea
          className="fld"
          rows={2}
          placeholder="Brief outline of the works and your role — e.g. 'Principal Contractor's Gateway 3 submission for a 14-storey residential block, coordinating the golden thread handover'"
          style={{ marginBottom: 8 }}
          value={newGatewayEntry.outline}
          onChange={(e) => setNewGatewayEntry({ ...newGatewayEntry, outline: e.target.value })}
        />
        <button className="btn" onClick={addGatewayEntry}>Add Gateway experience</button>
      </Section>
      )}

      {tab === "confirm" && (
      <Section title="Review & confirm">
        <p style={{ fontSize: 13, color: "#5c6b78", marginTop: -6, marginBottom: 16 }}>
          A quick summary of what's on file, and a final step to confirm it's accurate and up to date.
        </p>

        <div style={{ background: "#EAF2EF", borderRadius: 4, padding: "10px 14px", marginBottom: 18 }}>
          <ChecklistItem done={basicComplete} label="Basic details (name, job title, department) completed" />
          <ChecklistItem done={quals.length > 0} label={`${quals.length} qualification${quals.length === 1 ? "" : "s"} added`} />
          <ChecklistItem done={clientExperience.length > 0} label={`${clientExperience.length} client${clientExperience.length === 1 ? "" : "s"} added`} />
          <ChecklistItem done={experience.length > 0} label={`${experience.length} project experience tick${experience.length === 1 ? "" : "s"} recorded`} />
          <ChecklistItem done={competencyRatedCount === categories.length} label={`${competencyRatedCount} of ${categories.length} competency areas rated`} />
        </div>

        {formattedConfirmDate && (
          <p style={{ fontSize: 12.5, color: "var(--sage)", fontWeight: 600, marginBottom: 12 }}>
            Last confirmed on {formattedConfirmDate}.
          </p>
        )}

        <p style={{ fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
          By confirming, you're saying that everything in your profile — your details, qualifications,
          clients, project experience and competency ratings — is accurate and up to date to the best
          of your knowledge. You can still come back and edit anything later; just revisit this tab to
          confirm again after making changes.
        </p>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button className="btn primary" onClick={confirmProfile} disabled={confirming}>
            {confirming ? "Confirming..." : confirmedAt ? "Confirm again" : "Confirm my profile is up to date"}
          </button>
          <a href={`/report/${userId}`} className="btn" style={{ textDecoration: "none" }}>View my full report</a>
        </div>
      </Section>
      )}
    </div>
  );
}
