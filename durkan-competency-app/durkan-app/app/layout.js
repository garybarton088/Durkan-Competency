import "./globals.css";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Durkan Competency Register",
  description: "Staff competency, experience and BSA compliance evidence",
};

async function SignOutButton() {
  return (
    <form
      action={async () => {
        "use server";
        const supabase = createClient();
        await supabase.auth.signOut();
        redirect("/login");
      }}
    >
      <button className="btn" style={{ width: "100%", justifyContent: "center" }}>
        Sign out
      </button>
    </form>
  );
}

export default async function RootLayout({ children }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    profile = data;
  }

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {!user ? (
          <>{children}</>
        ) : (
          <div style={{ display: "flex", minHeight: "100vh" }}>
            <div
              style={{
                width: 220,
                borderRight: "1px solid var(--line)",
                padding: "18px 12px",
                display: "flex",
                flexDirection: "column",
                gap: 18,
              }}
            >
              <div style={{ padding: "0 6px" }}>
                <img src="/durkan-logo.png" alt="Durkan" style={{ height: 22, marginBottom: 6 }} />
                <h1 style={{ fontSize: 16.5, fontWeight: 600, lineHeight: 1.25, marginTop: 2 }}>Competency register</h1>
                <div style={{ fontSize: 10.5, color: "#8a8676", marginTop: 3 }}>
                  {profile?.full_name} · {profile?.role}
                </div>
              </div>
              <nav style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <a className="navbtn" href="/staff">My profile</a>
                {profile?.role === "senior" && (
                  <a className="navbtn" href="/verify">Verify submissions</a>
                )}
                {(profile?.role === "senior" || profile?.role === "bid_team") && (
                  <a className="navbtn" href="/search">Tender search</a>
                )}
              </nav>
              <div style={{ marginTop: "auto" }}>
                <SignOutButton />
              </div>
            </div>
            <div style={{ flex: 1, padding: "22px 26px", minWidth: 0 }}>{children}</div>
          </div>
        )}
      </body>
    </html>
  );
}
