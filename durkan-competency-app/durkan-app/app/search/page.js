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

  const [{ data: staffOverview }, { data: experience }, { data: lookups }, { data: categories }] =
    await Promise.all([
      supabase.from("staff_overview").select("*"),
      supabase.from("staff_experience").select("*"),
      supabase.rpc("get_all_lookups"),
      supabase.from("competency_categories").select("*").order("sort_order"),
    ]);

  return (
    <SearchPanel
      staff={staffOverview || []}
      experience={experience || []}
      lookups={lookups || {}}
      categories={categories || []}
    />
  );
}
