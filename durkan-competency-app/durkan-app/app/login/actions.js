"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signIn(formData) {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect("/staff");
}

export async function signUp(formData) {
  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email: formData.get("email"),
    password: formData.get("password"),
    options: { data: { full_name: formData.get("full_name") } },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  redirect(`/login?message=${encodeURIComponent("Check your email to confirm your account, then sign in.")}`);
}
