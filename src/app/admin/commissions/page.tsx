import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/ui/sidebar";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function CommissionsPage() {
  return (
    <>
      <AppHeader title="Hoa hồng" />
      <PageBody>
        <ComingSoon
          title="Quản lý hoa hồng"
          description="Cấu hình quy tắc hoa hồng theo dịch vụ, tính toán tự động theo hóa đơn, theo dõi thanh toán hoa hồng cho từng nhân viên."
        />
      </PageBody>
    </>
  );
}
