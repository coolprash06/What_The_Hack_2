import { Suspense } from "react";
import { redirect } from "next/navigation";
import { authenticated } from "@/lib/auth/session";
async function LoginContent() {
  if (await authenticated()) redirect("/");
  return <iframe src="/minecraft/index.html" title="Minecraft Enchanting Login" style={{ position: "fixed", inset: 0, width: "100%", height: "100%", border: 0 }} />;
}

export default function Login() {
  return <Suspense fallback={<div role="status">Opening the enchanted court?</div>}><LoginContent /></Suspense>;
}
