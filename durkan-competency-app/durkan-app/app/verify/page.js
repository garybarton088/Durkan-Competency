import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import VerifyPanel from "./VerifyPanel";

export default async function VerifyPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: myProfile } = await supabase.from("profiles").select("role").eq("id", user.id).single();

  if (myProfile?.role !== "senior") {
    redirect("/staff");
  }

  const { data: pending } = await supabase
    .from("competency_assessments")
    .select("*, profiles!competency_assessments_staff_id_fkey(full_name, job_title, department), competency_categories(name)")
    .eq("status", "pending_verification")
    .order("updated_at", { ascending: true });

  return <VerifyPanel initialPending={pending || []} />;
}
