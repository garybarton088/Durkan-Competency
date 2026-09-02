import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PrintButton from "./PrintButton";

export const maxDuration = 30;

const LEVELS = ["Not assessed", "Just starting", "Getting there", "Solid & dependable", "Very strong", "Expert"];

const CATEGORY_MAP = {
  project_type: "projectTypes",
  value_band: "valueBands",
  build_type: "buildTypes",
  client_type: "clientTypes",
  procurement_type: "procurementTypes",
  contract_type: "contractTypes",
  bim_type: "bimTypes",
  frame_type: "frameTypes",
  refurb_type: "refurbTypes",
  residential_type: "residentialTypes",
  scale_band: "scaleBands",
  constraint_type: "constraintTypes",
  accreditation_type: "accreditationTypes",
  material_type: "materialTypes",
  sustainability_type: "sustainabilityTypes",
  mmc_type: "mmcTypes",
};

const CATEGORY_LABELS = {
  project_type: "Project types",
  value_band: "Project values",
  build_type: "Build types",
  client_type: "Client types",
  procurement_type: "Procurement types",
  contract_type: "Contract types",
  bim_type: "Digital / BIM experience",
  frame_type: "Frame types",
  refurb_type: "Refurbishment / maintenance",
  residential_type: "Residential project types",
  scale_band: "Scale (unit count)",
  constraint_type: "Constraints / third parties",
  accreditation_type: "Warranty & design accreditation",
  material_type: "Materials",
  sustainability_type: "M&E / sustainability",
  mmc_type: "MMC / offsite methods",
};

function Section({ title, children }) {
  return (
    <div className="card" style={{ padding: 16, marginBottom: 14 }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>{title}</h3>
      {children}
    </div>
  );
}

export default async function ReportPage({ params }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  const isSelf = params.id === user.id;
  const canView = isSelf || ["senior", "bid_team"].includes(myProfile?.role);
  if (!canView) redirect("/staff");

  const [
    { data: profile },
    { data: lookups },
    { data: categories },
    { data: experience },
    { data: quals },
    { data: assessments },
    { data: clientExperience },
    { data: gatewayExperience },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", params.id).single(),
    supabase.rpc("get_all_lookups"),
    supabase.from("competency_categories").select("*").order("sort_order"),
    supabase.from("staff_experience").select("*").eq("staff_id", params.id),
    supabase.from("qualifications").select("*").eq("staff_id", params.id).order("date_obtained", { ascending: false }),
    supabase.from("competency_assessments").select("*").eq("staff_id", params.id),
    supabase.from("client_experience").select("*").eq("staff_id", params.id).order("created_at", { ascending: false }),
    supabase.from("gateway_experience").select("*").eq("staff_id", params.id).order("created_at", { ascending: false }),
  ]);

  if (!profile) redirect("/staff");

  let manager = null;
  if (profile.line_manager_id) {
    const { data: m } = await supabase.from("profiles").select("full_name").eq("id", profile.line_manager_id).single();
    manager = m;
  }

  const clientName = (entry) => {
    if (entry.other_client_name) return entry.other_client_name;
    const c = (lookups?.clients || []).find((x) => x.id === entry.client_id);
    return c ? c.name : "Unknown client";
  };

  const lengthOfService = (dateStr) => {
    if (!dateStr) return null;
    const start = new Date(dateStr);
    const now = new Date();
    let months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth());
    if (now.getDate() < start.getDate()) months -= 1;
    const years = Math.floor(months / 12);
    const remMonths = months % 12;
    const parts = [];
    if (years > 0) parts.push(`${years} year${years === 1 ? "" : "s"}`);
    if (remMonths > 0 || years === 0) parts.push(`${remMonths} month${remMonths === 1 ? "" : "s"}`);
    return parts.join(", ");
  };

  const groupedByCategory = Object.entries(CATEGORY_MAP).map(([cat, lookupKey]) => {
    const ids = experience.filter((e) => e.category === cat).map((e) => e.item_id);
    const names = (lookups?.[lookupKey] || []).filter((item) => ids.includes(item.id)).map((item) => item.name);
    return { cat, label: CATEGORY_LABELS[cat], names };
  }).filter((g) => g.names.length > 0);

  const qualGroups = [
    { key: "academic", label: "Academic qualifications" },
    { key: "training", label: "Training courses" },
    { key: "cpd", label: "CPD" },
  ].map((g) => ({ ...g, items: quals.filter((q) => (q.qual_type || "academic") === g.key) }));

  return (
    <div style={{ maxWidth: 820 }}>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: #fff !important; }
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }} className="no-print">
        <div>
          <h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 2 }}>Staff report</h2>
          <p style={{ fontSize: 13, color: "#5c6b78", marginTop: 0 }}>A full summary of everything on file for this person.</p>
        </div>
        <PrintButton />
      </div>

      <div className="card" style={{ padding: 20, marginBottom: 14 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 2 }}>{profile.full_name || "Unnamed"}</h1>
        <div style={{ fontSize: 14, color: "#5c6b78", marginBottom: 10 }}>
          {profile.job_title}{profile.department ? ` · ${profile.department}` : ""}{profile.business_division ? ` · ${profile.business_division}` : ""}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 20px", fontSize: 12.5, color: "#5c6b78" }}>
          {profile.start_date && <span>Started {new Date(profile.start_date).toLocaleDateString("en-GB", { month: "long", year: "numeric" })} ({lengthOfService(profile.start_date)})</span>}
          {manager?.full_name && <span>Line manager: <strong style={{ color: "var(--ink)" }}>{manager.full_name}</strong></span>}
          <span>
            Profile status: <strong style={{ color: profile.profile_confirmed_at ? "var(--steel)" : "var(--brick)" }}>
              {profile.profile_confirmed_at ? `Confirmed ${new Date(profile.profile_confirmed_at).toLocaleDateString("en-GB")}` : "Not yet confirmed"}
            </strong>
          </span>
        </div>
      </div>

      {profile.currently_on_hrb && (
        <div className="card" style={{ padding: 16, marginBottom: 14, borderLeft: "3px solid var(--steel)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>Currently working on a higher-risk building</h3>
          <div style={{ fontSize: 13 }}><strong>{profile.current_hrb_project}</strong></div>
          {profile.current_hrb_outline && <div style={{ fontSize: 12.5, color: "#5c6b78", marginTop: 2 }}>{profile.current_hrb_outline}</div>}
        </div>
      )}

      <Section title="CSCS card">
        {profile.cscs_card_type && profile.cscs_card_type !== "None / Expired" ? (
          <div style={{ fontSize: 13 }}>
            <strong>{profile.cscs_card_type}</strong>
            {profile.cscs_card_number && ` · ${profile.cscs_card_number}`}
            {profile.cscs_expiry_date && ` · expires ${new Date(profile.cscs_expiry_date).toLocaleDateString("en-GB")}`}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "#8a97a1" }}>None on file.</div>
        )}
      </Section>

      <Section title="Qualifications & training">
        {qualGroups.every((g) => g.items.length === 0) ? (
          <div style={{ fontSize: 13, color: "#8a97a1" }}>None on file.</div>
        ) : (
          qualGroups.map((g) => g.items.length > 0 && (
            <div key={g.key} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#5c6b78", marginBottom: 4 }}>{g.label}</div>
              {g.items.map((q) => (
                <div key={q.id} style={{ fontSize: 13, marginBottom: 2 }}>
                  {q.name}{q.awarding_body && ` — ${q.awarding_body}`}{q.expiry_date && ` (expires ${new Date(q.expiry_date).toLocaleDateString("en-GB")})`}
                </div>
              ))}
            </div>
          ))
        )}
      </Section>

      <Section title="Clients & Gateway experience">
        {clientExperience.length === 0 && gatewayExperience.length === 0 ? (
          <div style={{ fontSize: 13, color: "#8a97a1" }}>None on file.</div>
        ) : (
          <>
            {clientExperience.map((c) => (
              <div key={c.id} style={{ fontSize: 13, marginBottom: 3 }}>
                <strong>{clientName(c)}</strong>{c.project_name && ` — ${c.project_name}`}{c.is_durkan_job && " (Durkan job)"}
              </div>
            ))}
            {gatewayExperience.map((g) => (
              <div key={g.id} style={{ fontSize: 13, marginBottom: 3 }}>
                <strong>{g.gateway_stage}</strong> — {g.project_name}{g.outline && `: ${g.outline}`}
              </div>
            ))}
          </>
        )}
      </Section>

      <Section title="Project experience">
        {groupedByCategory.length === 0 ? (
          <div style={{ fontSize: 13, color: "#8a97a1" }}>Nothing recorded yet.</div>
        ) : (
          groupedByCategory.map((g) => (
            <div key={g.cat} style={{ marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "#5c6b78" }}>{g.label}: </span>
              <span style={{ fontSize: 13 }}>{g.names.join(", ")}</span>
            </div>
          ))
        )}
      </Section>

      <Section title="Competency ratings">
        {categories.map((c) => {
          const a = assessments.find((x) => x.category_id === c.id);
          const level = a?.level || 0;
          return (
            <div key={c.id} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderTop: "1px solid var(--line)", fontSize: 13 }}>
              <span>{c.name}</span>
              <span>
                <strong>{LEVELS[level]}</strong>
                {a?.status === "verified" && <span style={{ color: "var(--steel)", fontWeight: 600 }}> · Verified</span>}
              </span>
            </div>
          );
        })}
      </Section>
    </div>
  );
}
