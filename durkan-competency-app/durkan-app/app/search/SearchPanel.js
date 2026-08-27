"use client";

import { useMemo, useState } from "react";

const LEVELS = ["Not assessed", "Awareness", "Developing", "Working", "Practitioner", "Expert"];

function FilterGroup({ label, items, selectedIds, onToggle }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span className="lbl">{label}</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px" }}>
        {items.map((item) => (
          <label key={item.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => onToggle(item.id)} />
            {item.name}
          </label>
        ))}
      </div>
    </div>
  );
}

export default function SearchPanel({ staff, experience, lookups, categories }) {
  const [filters, setFilters] = useState({ project_type: [], value_band: [], build_type: [], client_type: [], procurement_type: [], contract_type: [], bim_type: [] });
  const [minLevels, setMinLevels] = useState({});
  const [verifiedOnly, setVerifiedOnly] = useState(true);
  const [shortlist, setShortlist] = useState([]);
  const [copied, setCopied] = useState(false);

  function toggleFilter(cat, id) {
    setFilters((prev) => ({
      ...prev,
      [cat]: prev[cat].includes(id) ? prev[cat].filter((x) => x !== id) : [...prev[cat], id],
    }));
  }

  const expByStaff = useMemo(() => {
    const map = {};
    experience.forEach((e) => {
      map[e.staff_id] = map[e.staff_id] || {};
      map[e.staff_id][e.category] = map[e.staff_id][e.category] || [];
      map[e.staff_id][e.category].push(e.item_id);
    });
    return map;
  }, [experience]);

  const results = useMemo(() => {
    return staff.filter((s) => {
      const exp = expByStaff[s.id] || {};
      for (const cat of ["project_type", "value_band", "build_type", "client_type", "procurement_type", "contract_type", "bim_type"]) {
        const required = filters[cat];
        if (required.length === 0) continue;
        const has = exp[cat] || [];
        if (!required.some((id) => has.includes(id))) return false;
      }
      for (const [catId, min] of Object.entries(minLevels)) {
        if (!min) continue;
        const comp = s.competencies?.[catId];
        if (!comp || comp.level < Number(min)) return false;
        if (verifiedOnly && comp.status !== "verified") return false;
      }
      return true;
    });
  }, [staff, expByStaff, filters, minLevels, verifiedOnly]);

  function toggleShort(id) {
    setShortlist((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function copyList() {
    const lines = shortlist.map((id) => {
      const s = staff.find((x) => x.id === id);
      const comp = categories.map((c) => `${c.id}: ${LEVELS[s.competencies?.[c.id]?.level || 0]}`).join(", ");
      return `${s.full_name} — ${s.job_title} (${s.discipline})\n  ${comp}`;
    });
    navigator.clipboard?.writeText(lines.join("\n\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div>
      <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 2 }}>Tender search</h2>
      <p style={{ fontSize: 13, color: "#7a7666", marginTop: 0, marginBottom: 16 }}>
        Filter staff by experience and verified competency to build a tender shortlist.
      </p>

      <div className="card" style={{ padding: 14, marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <FilterGroup label="Project types" items={lookups.projectTypes || []} selectedIds={filters.project_type} onToggle={(id) => toggleFilter("project_type", id)} />
          <FilterGroup label="Project values" items={lookups.valueBands || []} selectedIds={filters.value_band} onToggle={(id) => toggleFilter("value_band", id)} />
          <FilterGroup label="Build types" items={lookups.buildTypes || []} selectedIds={filters.build_type} onToggle={(id) => toggleFilter("build_type", id)} />
          <FilterGroup label="Client types" items={lookups.clientTypes || []} selectedIds={filters.client_type} onToggle={(id) => toggleFilter("client_type", id)} />
          <FilterGroup label="Procurement types" items={lookups.procurementTypes || []} selectedIds={filters.procurement_type} onToggle={(id) => toggleFilter("procurement_type", id)} />
          <FilterGroup label="Contract types" items={lookups.contractTypes || []} selectedIds={filters.contract_type} onToggle={(id) => toggleFilter("contract_type", id)} />
          <FilterGroup label="Digital / BIM experience" items={lookups.bimTypes || []} selectedIds={filters.bim_type} onToggle={(id) => toggleFilter("bim_type", id)} />
        </div>
        <div style={{ borderTop: "1px solid var(--line)", marginTop: 8, paddingTop: 10 }}>
          <span className="lbl">Minimum competency level</span>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 8 }}>
            {categories.map((c) => (
              <div key={c.id}>
                <label style={{ fontSize: 11, color: "#7a7666" }}>{c.id}</label>
                <select className="fld" value={minLevels[c.id] || 0} onChange={(e) => setMinLevels({ ...minLevels, [c.id]: e.target.value })}>
                  <option value={0}>Any</option>
                  {LEVELS.slice(1).map((l, i) => <option key={i + 1} value={i + 1}>{i + 1}+ {l}</option>)}
                </select>
              </div>
            ))}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12.5 }}>
            <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} />
            Only count verified assessments (recommended for tender evidence)
          </label>
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 12.5, color: "#7a7666" }}>{results.length} matching staff</div>
        {shortlist.length > 0 && (
          <button className="btn" onClick={copyList}>{copied ? "Copied" : `Copy shortlist (${shortlist.length})`}</button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {results.map((s) => (
          <div key={s.id} className="card" style={{ padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" checked={shortlist.includes(s.id)} onChange={() => toggleShort(s.id)} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600 }}>{s.full_name}</div>
              <div style={{ fontSize: 11.5, color: "#7a7666" }}>{s.job_title} · {s.business_division}</div>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              {categories.map((c) => {
                const comp = s.competencies?.[c.id];
                const verified = comp?.status === "verified";
                return (
                  <span
                    key={c.id}
                    className="mono"
                    title={`${c.id}: ${LEVELS[comp?.level || 0]}${verified ? " (verified)" : ""}`}
                    style={{
                      width: 22, height: 22, borderRadius: 3, fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center",
                      background: verified ? "var(--steel)" : "#cfcabb", color: "#fff",
                    }}
                  >
                    {comp?.level || 0}
                  </span>
                );
              })}
            </div>
          </div>
        ))}
        {results.length === 0 && (
          <div className="card" style={{ padding: 20, textAlign: "center", fontSize: 13, color: "#9b9787" }}>
            No staff match these filters yet.
          </div>
        )}
      </div>
    </div>
  );
}
