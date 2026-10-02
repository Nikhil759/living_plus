import { redirect } from "next/navigation";
import { resolveLandingRoute } from "@/lib/auth/landing";

export default async function RootPage() {
  redirect(await resolveLandingRoute());
}
