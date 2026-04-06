import { AppHeader } from "@/components/layout/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CalendarDays, Package, TrendingUp } from "lucide-react";

const stats = [
  {
    title: "Khách hàng",
    value: "–",
    description: "Tổng số khách",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
  {
    title: "Lịch hẹn hôm nay",
    value: "–",
    description: "Đã đặt lịch",
    icon: CalendarDays,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  {
    title: "Cảnh báo kho",
    value: "–",
    description: "Sản phẩm sắp hết",
    icon: Package,
    color: "text-orange-600",
    bg: "bg-orange-50",
  },
  {
    title: "Doanh thu tháng",
    value: "–",
    description: "Tháng hiện tại",
    icon: TrendingUp,
    color: "text-purple-600",
    bg: "bg-purple-50",
  },
];

export default function DashboardPage() {
  return (
    <div>
      <AppHeader title="Tổng quan" />
      <div className="p-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {stats.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Placeholder cho dashboard content */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Lịch hẹn hôm nay</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Chưa có dữ liệu. Hệ thống đang được thiết lập.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Trạng thái phòng khám</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {["Đang chờ", "Đang tư vấn", "Đang phẫu thuật", "Hậu phẫu"].map(
                (status) => (
                  <div
                    key={status}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{status}</span>
                    <span className="font-medium">–</span>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
