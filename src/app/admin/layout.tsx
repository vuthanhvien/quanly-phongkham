import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppShell, MainContent } from "@/components/ui/sidebar";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <AppSidebar />
      <MainContent>{children}</MainContent>
    </AppShell>
  );
}
