import { AppHeader } from "@/components/layout/app-header";
import { PageBody } from "@/components/ui/sidebar";
import { StatCard } from "@/components/ui/card";
import { Users, CalendarDays, Package, TrendingUp } from "lucide-react";
import styled from "styled-components";
import { tokens as t } from "@/components/ui/tokens";

const Grid4 = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  @media (max-width: 1200px) { grid-template-columns: repeat(2, 1fr); }
  @media (max-width: 640px)  { grid-template-columns: 1fr; }
`;

const Grid3 = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 16px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const PlaceholderCard = styled.div`
  background: white;
  border-radius: ${t.radiusLg};
  border: 1px solid ${t.colorBorder};
  box-shadow: ${t.shadowCard};
  overflow: hidden;
`;

const PlaceholderHeader = styled.div`
  padding: 14px 16px 12px;
  border-bottom: 1px solid ${t.colorBorder};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  font-weight: 600;
  color: ${t.colorText};
`;

const PlaceholderBody = styled.div`
  padding: 20px 16px;
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeSm};
  color: ${t.colorTextSubtle};
`;

const StatusRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid ${t.colorBorder};
  font-family: ${t.fontFamily};
  font-size: ${t.fontSizeMd};
  color: ${t.colorText};

  &:last-child { border-bottom: none; }

  span:last-child { font-weight: 600; color: ${t.colorTextSubtle}; }
`;

export default function DashboardPage() {
  return (
    <>
      <AppHeader title="Tổng quan" />
      <PageBody>
        <Grid4 style={{ marginBottom: 16 }}>
          <StatCard label="Khách hàng" value="–" description="Tổng số khách" icon={<Users />} color="blue" />
          <StatCard label="Lịch hẹn hôm nay" value="–" description="Đã đặt lịch" icon={<CalendarDays />} color="green" />
          <StatCard label="Cảnh báo kho" value="–" description="Sắp hết hàng" icon={<Package />} color="red" />
          <StatCard label="Doanh thu tháng" value="–" description="Tháng hiện tại" icon={<TrendingUp />} color="purple" />
        </Grid4>

        <Grid3>
          <PlaceholderCard>
            <PlaceholderHeader>Lịch hẹn hôm nay</PlaceholderHeader>
            <PlaceholderBody>Hệ thống đang được thiết lập. Dữ liệu sẽ hiển thị khi có lịch hẹn.</PlaceholderBody>
          </PlaceholderCard>

          <PlaceholderCard>
            <PlaceholderHeader>Trạng thái phòng khám</PlaceholderHeader>
            {["Đang chờ", "Đang tư vấn", "Đang phẫu thuật", "Hậu phẫu"].map((s) => (
              <StatusRow key={s}>
                <span>{s}</span>
                <span>–</span>
              </StatusRow>
            ))}
          </PlaceholderCard>
        </Grid3>
      </PageBody>
    </>
  );
}
