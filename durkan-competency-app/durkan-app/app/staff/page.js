import { createClient } from "@/lib/supabase/server";
import StaffForm from "./StaffForm";

export default async function StaffPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: projectTypes }, { data: valueBands }, { data: buildTypes }, { data: contractTypes }, { data: categories }, { data: myExperience }, { data: myQuals }, { data: myAssessments }] =
    await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("project_types").select("*").order("sort_order"),
      supabase.from("value_bands").select("*").order("sort_order"),
      supabase.from("build_types").select("*").order("sort_order"),
      supabase.from("contract_types").select("*").order("sort_order"),
      supabase.from("competency_categories").select("*").order("sort_order"),
      supabase.from("staff_experience").select("*").eq("staff_id", user.id),
      supabase.from("qualifications").select("*").eq("staff_id", user.id).order("date_obtained", { ascending: false }),
      supabase.from("competency_assessments").select("*").eq("staff_id", user.id),
    ]);

  return (
    <StaffForm
      userId={user.id}
      profile={profile}
      lookups={{ projectTypes, valueBands, buildTypes, contractTypes }}
      categories={categories || []}
      initialExperience={myExperience || []}
      initialQuals={myQuals || []}
      initialAssessments={myAssessments || []}
    />
  );
}
