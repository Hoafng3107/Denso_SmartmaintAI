# DENSO SmartMaint prototype

## Luồng người bảo trì

- Dashboard ưu tiên ca đang xử lý, ca đang chờ và báo cáo cần hoàn tất; có CTA riêng để tạo ca mới.
- Danh sách dùng tên **Ca bảo trì**, có bộ lọc kèm số lượng và hiển thị bước tiếp theo cho từng ca.
- BM/PM đi chung một luồng hồ sơ. BM bắt đầu từ hiện tượng; PM dùng checklist cấu hình theo máy và có nhánh bất thường.
- Hồ sơ có thanh 4 bước **Bối cảnh & máy → Tra cứu & căn cứ → Xử lý & nhật ký → Báo cáo tổng kết**. Biểu mẫu bối cảnh ưu tiên thông tin cơ bản; điều kiện vận hành và 5M1E nằm trong mục mở rộng.
- Tình trạng máy, tình trạng công việc và trạng thái báo cáo được hiển thị riêng. Chờ linh kiện/hỗ trợ giữ ca mở; đợt mới không xóa nhật ký cũ.

Mở `index.html` bằng Edge/Chrome hoặc Live Server. Không cần cài package hay kết nối API. Tài khoản, dữ liệu nhà máy, AI và HozenDX đều là mô phỏng.

## Bố cục giao diện nghiệp vụ

Ba vai trò dùng chung một cấu trúc: menu theo vai trò, thanh thông báo và trạng thái lưu, tiêu đề màn hình, khu vực công việc chính và thông tin liên quan. Menu có thể thu gọn thành cột biểu tượng; logo DENSO luôn giữ kích thước và đưa về Tổng quan khi bấm. Trang tổng quan ưu tiên các chỉ số có thể mở trực tiếp, danh sách cần xử lý và tri thức đã duyệt. Nút Hướng dẫn demo trên topbar mở roadmap riêng theo vai trò; người dùng có thể đóng cửa sổ và mở lại mà không mất tiến trình trong phiên trang hiện tại. Tiến trình và danh sách luồng đã hoàn thành được xóa khi tải lại trang; nút “Làm lại từ đầu” khởi tạo lại dữ liệu và roadmap của luồng đang chọn.

Các nhánh công việc vẫn được giữ trong hồ sơ và biểu mẫu:

| Lựa chọn | Diễn tiến |
| --- | --- |
| BM · máy gặp sự cố | Ghi bối cảnh → tra cứu nguồn đã duyệt → tự xử lý hoặc yêu cầu chuyên gia |
| PM · kiểm tra định kỳ | Xem checklist theo máy → đánh dấu hoàn tất hoặc ghi bất thường → bất thường chuyển sang tra cứu như BM |
| Tự xử lý | Ghi mốc kiểm tra → chọn kết quả: đã khắc phục, còn lỗi, hoặc chờ linh kiện/hỗ trợ |
| Yêu cầu chuyên gia | Chuyển sang tài khoản chuyên gia để nhận hỗ trợ; người bảo trì vẫn sở hữu hồ sơ |
| Chuyên gia chưa thể hỗ trợ | Phản hồi và thông báo quay lại người bảo trì |
| Chuyên gia tham gia | Người bảo trì ghi lại thao tác của chuyên gia; nhật ký phân biệt người nhập với người thực hiện |
| Kết quả chưa đạt | Giữ đợt cũ và mở đợt mới trong cùng hồ sơ; trường hợp chờ linh kiện giữ hồ sơ mở |
| Kết quả đạt | Chuyển qua báo cáo; có thể đề xuất bài học để chuyên gia trưởng kiểm duyệt hoặc chỉ lưu lịch sử bảo trì |
| Kiểm duyệt | Chuyên gia trưởng chọn phê duyệt, yêu cầu bổ sung hoặc từ chối; lịch sử ca nguồn vẫn được giữ |

Người dùng chuyển vai trò qua tài khoản ở cuối menu. Trạng thái máy, trạng thái công việc và trạng thái báo cáo được lưu trong cùng hồ sơ, kể cả khi có nhiều đợt xử lý.

## Giả định tích hợp

- HozenDX chỉ được mô phỏng theo hướng đọc lý lịch, lịch sử và mẫu kiểm tra theo máy. Không giả định nhận alarm trực tiếp, lập lịch PM hay ghi trả dữ liệu.
- Người bảo trì xác nhận tình trạng thực tế tại máy. Nội dung tri thức chỉ được tái sử dụng sau kiểm duyệt.
- AI, RAG, thông báo và kết quả demo là mô phỏng; chưa nối LLM, embeddings hay hệ thống nhà máy.
- Dữ liệu máy, người, alarm, hướng xử lý và checklist đều là dữ liệu giả lập. Không dùng nội dung này như quy trình vận hành hay chỉ dẫn an toàn thật.

## Tài khoản demo

| Vai trò | Tài khoản chính | Trách nhiệm trong luồng |
| --- | --- | --- |
| Người bảo trì | Nguyễn Minh | Tạo BM/PM, phụ trách hồ sơ, ghi diễn biến, kiểm tra kết quả và báo cáo |
| Chuyên gia | Trần Văn Hải | Nhận yêu cầu hiện trường, tham gia và xác nhận phần đóng góp; chủ động ghi tri thức |
| Chuyên gia trưởng | Lê Quốc Anh | Rà soát và quyết định tri thức được tái sử dụng |

## Tệp chính

| Tệp | Vai trò |
| --- | --- |
| `prototype/demo-guide.js` | Roadmap demo theo vai trò, dữ liệu khởi tạo và tiến trình checklist |
| `prototype/cases.js` | Màn hình và nghiệp vụ hồ sơ BM/PM |
| `prototype/knowledge.js` | Ghi tri thức, đối chiếu, kiểm duyệt và xuất bản |
| `app.js` | Trang đăng nhập, khung giao diện, tổng quan và menu |
| `styles.css` | Giao diện responsive và bố cục dùng chung ba vai trò |

## Kiểm tra kịch bản

Kiểm tra roadmap gồm: mở danh sách luồng của từng vai trò, bắt đầu với dữ liệu sạch, tự đánh dấu sau thao tác hợp lệ, đóng/mở lại cửa sổ, tải lại trang và đổi tài khoản. Các kiểm tra nghiệp vụ hiện có tiếp tục bao phủ nhánh BM qua chuyên gia và kiểm duyệt, nhánh PM có bất thường và trường hợp chờ rồi tiếp tục cùng hồ sơ.
