import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/ui/sidebar";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function ReportsPage() {
  return (
    <>
      <AppHeader title="Báo cáo" />
      <PageBody>
        <ComingSoon
          title="Báo cáo & Thống kê"
          description="Báo cáo doanh thu theo ngày/tháng/năm, thống kê theo bác sĩ, dịch vụ, chi nhánh. Xuất Excel, biểu đồ trực quan."
        />
      </PageBody>
    </>
  );
}
