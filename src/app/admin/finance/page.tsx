import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/ui/sidebar";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function FinancePage() {
  return (
    <>
      <AppHeader title="Thu chi" />
      <PageBody>
        <ComingSoon
          title="Quản lý thu chi"
          description="Tạo hóa đơn, ghi nhận thanh toán, theo dõi công nợ, quản lý chi phí vận hành và báo cáo doanh thu."
        />
      </PageBody>
    </>
  );
}
