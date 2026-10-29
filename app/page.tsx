import { Suspense } from "react";
import { CourtApp } from "@/components/CourtApp";
import { authenticated } from "@/lib/auth/session";
import { redirect } from "next/navigation";

async function HomeContent() {
  if (!await authenticated()) redirect("/login");
  return <>
    <CourtApp />
    <form action="/api/auth/logout" method="post" style={{ position: "fixed", top: 12, right: 16, zIndex: 100 }}>
      <button type="submit" style={{ background: "#241710", color: "#f5f5f4", border: "1px solid #9b7542", borderRadius: 6, padding: "6px 12px", cursor: "pointer" }}>Log out</button>
    </form>
  </>;
}

export default function Home() {
  return <Suspense fallback={<div role="status">Opening the enchanted court?</div>}><HomeContent /></Suspense>;
}
