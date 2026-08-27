import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SearchPanel from "./SearchPanel";

export default async function SearchPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (!["senior", "bid_team"].includes(myProfile?.role)) {
    redirect("/staff");
  }

  const [{ data: staffOverview }, { data: experience }, { data: projectTypes }, { data: valueBands }, { data: buildTypes }, { data: clientTypes }, { data: procurementTypes }, { data: contractTypes }, { data: bimTypes }, { data: categories }] =
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
      supabase.from("competency_categories").select("*").order("sort_order"),
    ]);

  return (
    <SearchPanel
      staff={staffOverview || []}
      experience={experience || []}
      lookups={{ projectTypes, valueBands, buildTypes, clientTypes, procurementTypes, contractTypes, bimTypes }}
      categories={categories || []}
    />
  );
}
