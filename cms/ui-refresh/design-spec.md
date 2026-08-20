# CMS UI refresh — design spec

## Bối cảnh và giả định

Đây là bản thử nghiệm visual cho CMS quản lý phòng khám/clinic ERP đang có trong `cms/`. Sản phẩm là một công cụ vận hành nội bộ, không phải website marketing: người dùng phải chuyển nhanh giữa khách hàng, lịch hẹn, hồ sơ điều trị, đơn dịch vụ, kho, thu chi, nhân sự và workflow. Vì vậy một giao diện "hiện đại" ở đây không đồng nghĩa với thêm gradient, glassmorphism hay dashboard đầy chỉ số. Nó phải giúp nhân viên nhìn đúng trạng thái, hiểu việc ưu tiên trong ngày, và đi đến hành động tiếp theo với số lần quét mắt tối thiểu.

Chưa có logo, brand guideline hay screenshot định danh cụ thể được cung cấp. Các prototype dùng màu hồng hiện hữu `#e889ae` như một tín hiệu thương hiệu kế thừa, giữ trắng/xám lạnh hiện có làm nền và chỉ thêm màu ngọc lục bảo cho trạng thái lâm sàng tích cực. Các số và tên riêng trong prototype đều là dữ liệu minh hoạ có nhãn, không phải dữ liệu phòng khám thật. Khi triển khai, hệ thống phải tiếp tục lấy màu, font và border radius từ token trong `app-ui.tsx`/`styles.css`, không được hard-code palette demo.

## Người dùng, tình huống và nội dung

Đối tượng chính là lễ tân, điều phối viên, bác sĩ/điều dưỡng, quản lý chi nhánh và admin. Họ dùng màn hình desktop trong ca làm việc; trang Tổng quan là bề mặt phù hợp nhất để kiểm tra hệ thống visual mới vì nó vừa có thông tin tổng hợp vừa có lịch làm việc, danh sách và hành động. Prototype tập trung vào năm khối nội dung có trong CMS: điều hướng module; tiêu đề ngày/chi nhánh; các chỉ số vận hành; lịch hẹn hoặc hàng đợi cần xử lý; các hành động thường dùng; tín hiệu cảnh báo hoặc công việc theo luồng. Không thêm chart hoặc KPI không có nguồn dữ liệu.

## Hướng thiết kế chung

Mục tiêu là giảm cảm giác “một vùng trắng chứa nhiều card trắng”. Ưu tiên dùng vùng nền, quy tắc phân cách, typography, grouping và trạng thái có ngữ nghĩa để tạo hierarchy; chỉ dùng shadow khi có cảm giác lớp nổi thật như command palette hoặc nút hành động. Chữ nội dung tối thiểu 14px; nhãn nhỏ tối thiểu 12px; màu chữ phải đủ tương phản. Các thành phần Ant Design vẫn là nền tảng, nên mỗi hướng phải có mapping rõ sang Layout, Menu, Card, Table, Tag, Button, Badge, Drawer hiện tại.

## Ba hướng cần đối chiếu

1. **Clinical Command**: một “ca trực” theo ngữ cảnh, vệt màu hồng nhận diện, bề mặt ngọc lục bảo cho thông tin lâm sàng; sidebar mảnh, action rail rõ ràng. Form xuất phát từ nhịp vận hành trong ngày: timeline lịch hẹn là trục thị giác, không phải thêm một card KPI.
2. **Working Ledger**: cảm giác sổ điều phối có cấu trúc, nền giấy ấm và typography biên tập. Form xuất phát từ các bản ghi/biểu mẫu là hạt nhân của ERP: số liệu chỉ là margin note, còn hàng đợi công việc là phần chính.
3. **Signal Grid**: hệ thống điều hành có độ tương phản cao với grid lộ rõ và bề mặt màu phẳng có ý nghĩa. Form xuất phát từ mô hình module của CMS: khu vực nào vận hành gì được nhìn như một map, phù hợp cho quản lý cần thấy toàn cảnh.

## Tiêu chí chọn hướng

Hướng được chọn phải: vẫn dễ hiện thực hoá bằng Ant Design và token CSS; làm dashboard có một điểm nhìn chính thay vì chia đều tất cả card; tạo cảm giác phân biệt giữa lâm sàng, hành chính và cảnh báo; không đòi hỏi ảnh trang trí hoặc API mới; và có thể mở rộng nhất quán cho list page, record form, calendar và settings. Sau khi người dùng chọn hoặc phối hợp các hướng, prototype được chuyển thành token/component CSS trong CMS rồi kiểm tra build TypeScript.
