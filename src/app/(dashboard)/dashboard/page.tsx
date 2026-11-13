import { redirect } from "next/navigation";

// The app is only recordings now; /dashboard is kept so old links and the installed start URL still work.
export default function DashboardPage() {
  redirect("/recordings");
}
