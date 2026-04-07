import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/ui/sidebar";
import { ComingSoon } from "@/components/ui/coming-soon";

export default function WarehousePage() {
  return (
    <>
      <AppHeader title="Kho & Vật tư" />
      <PageBody>
        <ComingSoon
          title="Quản lý kho & vật tư"
          description="Nhập kho, xuất kho FIFO, theo dõi hạn dùng, kit vật tư phẫu thuật theo từng ca mổ, cảnh báo tồn kho thấp."
        />
      </PageBody>
    </>
  );
}
