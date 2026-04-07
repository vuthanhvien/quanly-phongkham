import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/ui/sidebar";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function TreatmentsPage() {
  return (
    <>
      <AppHeader title="Liệu trình" />
      <PageBody>
        <ComingSoon
          title="Quản lý liệu trình"
          description="Lập kế hoạch điều trị theo lộ trình, theo dõi từng buổi trị liệu, gắn với hồ sơ bệnh án và hóa đơn."
        />
      </PageBody>
    </>
  );
}
