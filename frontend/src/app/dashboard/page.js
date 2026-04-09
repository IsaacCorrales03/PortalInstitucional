import { Suspense } from "react";
import DashboardShell from "@/components/dashboard/DashboardShell";
import AppLoader from "@/components/dashboard/AppLoader";
export default function Page() {
  return (
    <Suspense>
      <AppLoader />
    </Suspense>
  );
}