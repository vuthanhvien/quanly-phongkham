# Customer app · Social care companion — design brief

## Mục tiêu

`customer_app` hiện là ứng dụng Flutter dành cho khách hàng của phòng khám: người dùng xác thực bằng số điện thoại, xem lịch hẹn, tạo lịch mới, trò chuyện với phòng khám, xem hóa đơn và hồ sơ cá nhân. Hướng thiết kế mới mở rộng sản phẩm thành một "social care companion" — một không gian đồng hành hằng ngày, nơi khách có thể đặt khám và theo dõi thông tin sức khỏe của chính mình, đồng thời tiếp cận tin chính thống, bài chia sẻ được kiểm duyệt và video ngắn có giá trị. Đây không phải mạng xã hội đại chúng. Độ tin cậy, riêng tư và sự êm dịu của trải nghiệm y tế phải luôn thắng việc tối đa hóa lượt xem hoặc tương tác.

## Người dùng và bối cảnh

Người dùng chính là khách hàng Việt Nam đang điều trị hoặc chủ động chăm sóc da/sức khỏe tại phòng khám. Họ thường mở app khi cần đặt hẹn nhanh, kiểm tra lịch, nhận hướng dẫn sau khám, đọc nội dung bác sĩ đăng hoặc tìm sự đồng cảm từ cộng đồng. Nhiều người chỉ có vài phút trên điện thoại và có thể không muốn công khai danh tính hay bệnh sử. Giao diện phải tạo cảm giác an toàn: các khu vực "Hồ sơ sức khỏe" và "Cộng đồng" phân biệt rành mạch; bài cộng đồng dùng avatar/biệt danh; nội dung chuyên môn được gắn nguồn bác sĩ hoặc nhãn đã kiểm duyệt. Các số đo y tế thật, chẩn đoán và thông tin nhận dạng không được giả lập như nội dung mạng xã hội.

## Các bề mặt bắt buộc

1. **Hôm nay / đặt khám**: cuộc hẹn sắp tới là trạng thái nổi bật; CTA đặt lịch luôn dễ chạm. Có lối tắt đến kết quả, toa/chăm sóc sau khám và nhắn phòng khám.
2. **News**: bài viết hoặc cập nhật từ phòng khám/bác sĩ, có nguồn, thời lượng đọc và chủ đề rõ ràng. Đây là nơi xây lòng tin, không phải feed quảng cáo.
3. **Cộng đồng**: bài đăng ngắn từ khách, có thao tác thích, bình luận, lưu, tạo bài; kèm cam kết cộng đồng và ranh giới "chia sẻ trải nghiệm, không thay tư vấn bác sĩ".
4. **Video ngắn**: thẻ video dọc, tiêu đề hữu ích, bác sĩ/chuyên gia xuất hiện hoặc được ghi nguồn. Tương tác hướng đến lưu/chia sẻ/đặt câu hỏi, không cần mô phỏng viral metrics.
5. **Cá nhân**: thông tin khách hàng, quyền riêng tư, lịch sử lịch hẹn/hóa đơn và tùy chọn nhận thông báo.

## Ngôn ngữ thị giác và ràng buộc

Kế thừa token hiện có: hồng phấn `#E889AE`, hồng đậm `#C2517D`, nền `#F5F6FA`, chữ than `#111827`. Ba phương án không được chỉ đổi màu: mỗi phương án phải có cấu trúc feed, hierarchy và nhịp đọc khác nhau. Body trên màn điện thoại tối thiểu 14px; metadata tối thiểu 12px; tương phản chữ đủ rõ. Không dùng emoji làm icon hệ thống, gradient neon hoặc các thẻ bento SaaS vô nghĩa. Ảnh/video thumbnail là nội dung, không phải hình trang trí; bản direction sẽ dùng khung media có nhãn nội dung minh bạch để chưa gán tài sản truyền thông chính thức của phòng khám.

## Kích thước và giao nộp

Đầu ra ở giai đoạn này là ba HTML prototype độc lập, cùng canvas desktop 1440×900, mỗi bản mô tả một bộ 4 màn hình iPhone 15 Pro (393×852): Hôm nay, News/Cộng đồng, Video, Hồ sơ. Các mẫu có các tương tác tối thiểu: chọn tab, nhấn nút đặt khám, mở khung tạo bài và đổi trạng thái yêu thích/lưu. Đây là hướng thiết kế, chưa đụng vào source Flutter. Sau khi người dùng chọn một hoặc phối hợp các hướng, bản được chọn sẽ được chuyển thành spec triển khai Flutter theo cấu trúc `customer_app/lib/`.

## Form / visual motif

Mẫu số chung là "lộ trình chăm sóc" — một đường dẫn mềm liên kết thời điểm đặt hẹn, nội dung tin cậy và nhịp chia sẻ của cộng đồng. Hướng 1 dùng hành trình dạng nhật ký; hướng 2 dùng tờ báo/board minh bạch; hướng 3 dùng một vòng tròn đồng hành sống động. Form đi ra từ việc chăm sóc diễn ra theo thời gian, không phải từ card UI trang trí.
