import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/firebase/session";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSessionUser()) redirect("/dashboard");
  return children;
}
