import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SearchPanel from "./SearchPanel";

export const maxDuration = 30;

export default async function SearchPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!["senior", "bid_team"].includes(myProfile?.role)) {
    redirect("/staff");
  }

  const [{ data: staffOverview }, { data: experience }, { data: projectTypes }, { data: valueBands }, { data: buildTypes }, { data: clientTypes }, { data: procurementTypes }, { data: contractTypes }, { data: bimTypes }, { data: frameTypes }, { data: refurbTypes }, { data: residentialTypes }, { data: scaleBands }, { data: constraintTypes }, { data: accreditationTypes }, { data: materialTypes }, { data: sustainabilityTypes }, { data: mmcTypes }, { data: categories }] =
    await Promise.all([
      supabase.from("staff_overview").select("*"),
      supabase.from("staff_experience").select("*"),
      supabase.from("project_types").select("*").order("sort_order"),
      supabase.from("value_bands").select("*").order("sort_order"),
      supabase.from("build_types").select("*").order("sort_order"),
      supabase.from("client_types").select("*").order("sort_order"),
      supabase.from("procurement_types").select("*").order("sort_order"),
      supabase.from("contract_types").select("*").order("sort_order"),
      supabase.from("bim_types").select("*").order("sort_order"),
      supabase.from("frame_types").select("*").order("sort_order"),
      supabase.from("refurb_types").select("*").order("sort_order"),
      supabase.from("residential_types").select("*").order("sort_order"),
      supabase.from("scale_bands").select("*").order("sort_order"),
      supabase.from("constraint_types").select("*").order("sort_order"),
      supabase.from("accreditation_types").select("*").order("sort_order"),
      supabase.from("material_types").select("*").order("sort_order"),
      supabase.from("sustainability_types").select("*").order("sort_order"),
      supabase.from("mmc_types").select("*").order("sort_order"),
      supabase.from("competency_categories").select("*").order("sort_order"),
    ]);

  return (
    <SearchPanel
      staff={staffOverview || []}
      experience={experience || []}
      lookups={{ projectTypes, valueBands, buildTypes, clientTypes, procurementTypes, contractTypes, bimTypes, frameTypes, refurbTypes, residentialTypes, scaleBands, constraintTypes, accreditationTypes, materialTypes, sustainabilityTypes, mmcTypes }}
      categories={categories || []}
    />
  );
}
