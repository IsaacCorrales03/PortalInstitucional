import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import { ToastProvider } from "@/lib/Toast";
import "./dashboard.css";

export const metadata = { title: "Dashboard — CTP Pavas" };

export default function DashboardLayout({ children }) {
  return (
    <ToastProvider>
      {children}
    </ToastProvider>
  );
}