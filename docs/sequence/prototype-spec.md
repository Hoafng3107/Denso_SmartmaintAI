# Đặc tả tương tác cho prototype DENSO

Luồng tối ưu đã chốt ngày 08/10/2026: một hồ sơ, nhiều đợt, mẫu ghi nhanh, AI tổng kết, xác nhận đóng góp và duyệt tri thức.

Nguồn: `denso-maintenance-workflows-BPMN.drawio`. SHA-256: `be7da2cd1c8ad6458d3603cb0fc68704c9c7483bb3a544bb10e6dc1eb044c3c4`. Q&A nhà máy bổ sung trường biểu mẫu, 5M1E và dữ liệu HozenDX; lịch PM/API/tức thời là điều kiện tích hợp, không phải khả năng đã xác nhận.

Nội dung được xuất cùng file `denso-maintenance-sequences.drawio`; mã thông điệp SQxx.nn dùng để đối chiếu với sơ đồ. Đây là thiết kế phục vụ prototype, chưa phải chức năng đã lập trình. Thành phần logic không quy định công nghệ hoặc tách microservice. Xem thêm [dữ liệu và trạng thái đã chốt](optimized-flow-contract.md).

<a id="sq01"></a>

## SQ01 — Đăng nhập và vào đúng không gian làm việc

- Đầu vào: Người dùng mở web trên laptop, tablet hoặc điện thoại; đây là phần mở rộng UI của điều kiện “sau đăng nhập” trong BPMN.
- Kết quả: Có phiên làm việc gắn nhân viên và quyền được cấp; hiển thị dashboard phù hợp.
- BPMN: Luồng hỗ trợ prototype.
- Xem [SVG](SQ01.svg).

### Màn hình và phản hồi

#### UI-01 · Cổng đăng nhập chung

- Hiện: mã nhân viên, mật khẩu, nút hiện/ẩn mật khẩu, nút “Đăng nhập”.
- Không cho chọn vai trò để tự cấp quyền.
- Khi gửi: hiện “Đang đăng nhập…”; khóa gửi lặp.
- Lỗi tại ô: “Nhập mã nhân viên”, “Nhập mật khẩu”.

#### UI-02 · Dashboard theo quyền

- Người bảo trì: Ca của tôi; mở ca; lịch sử máy; tra cứu tri thức; đề xuất của tôi.
- Chuyên gia: Tri thức của tôi; ghi tri thức; ca cần hỗ trợ/đang tham gia; tra cứu.
- Chuyên gia trưởng: Hàng đợi duyệt; việc đang xem; lịch sử quyết định; tra cứu.
- Hiện tên nhân viên, vai trò đang dùng, thông báo chưa đọc.
- Nếu có nhiều quyền đã cấp: cho đổi không gian làm việc; không tạo tài khoản mới.

### Thứ tự tương tác

| Bước | Từ → đến | Nội dung | Điều kiện / ngữ cảnh |
| --- | --- | --- | --- |
| **Giai đoạn** | — | **1. Đăng nhập bằng tài khoản cá nhân** | — |
| SQ01.01 | Người dùng → Giao diện web | Nhập mã nhân viên, mật khẩu; nhấn Đăng nhập | Luồng chung |
| SQ01.02 | Giao diện web → Giao diện web | Kiểm tra các ô bắt buộc | Luồng chung |
| SQ01.03 | Giao diện web → Người dùng | Hiện lỗi tại ô; giữ mã nhân viên; dừng lần đăng nhập | alt: Thiếu thông tin |
| Ghi chú | — | Ở lại cổng đăng nhập; lần thử tiếp theo bắt đầu lại SQ01. | alt: Thiếu thông tin / break: Dừng lần tương tác hiện tại |
| SQ01.04 | Giao diện web → Nghiệp vụ / phân quyền | Yêu cầu xác thực tài khoản | alt: Đã điền đủ |
| SQ01.05 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Tra tài khoản, trạng thái và quyền được cấp | alt: Đã điền đủ |
| SQ01.06 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Kết quả đối chiếu; danh sách quyền | alt: Đã điền đủ |
| SQ01.07 | Nghiệp vụ / phân quyền → Giao diện web | Từ chối đăng nhập | alt: Đã điền đủ / alt: Không xác thực được |
| SQ01.08 | Giao diện web → Người dùng | Mã nhân viên hoặc mật khẩu không đúng. Vui lòng thử lại. | alt: Đã điền đủ / alt: Không xác thực được |
| Ghi chú | — | Không mở dashboard khi xác thực thất bại. | alt: Đã điền đủ / alt: Không xác thực được / break: Dừng lần tương tác hiện tại |
| SQ01.09 | Nghiệp vụ / phân quyền → Giao diện web | Không tạo phiên | alt: Đã điền đủ / alt: Tài khoản không được phép truy cập |
| SQ01.10 | Giao diện web → Người dùng | Tài khoản chưa được cấp quyền truy cập. Liên hệ người phụ trách. | alt: Đã điền đủ / alt: Tài khoản không được phép truy cập |
| Ghi chú | — | Kết thúc lần đăng nhập; không truy cập dữ liệu nghiệp vụ. | alt: Đã điền đủ / alt: Tài khoản không được phép truy cập / break: Dừng lần tương tác hiện tại |
| SQ01.11 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Ghi phiên, employeeId, quyền và thời điểm | alt: Đã điền đủ / alt: Hợp lệ |
| SQ01.12 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Phiên đã tạo | alt: Đã điền đủ / alt: Hợp lệ |
| SQ01.13 | Nghiệp vụ / phân quyền → Giao diện web | Tên nhân viên, phạm vi máy, quyền, phiên | alt: Đã điền đủ / alt: Hợp lệ |
| SQ01.14 | Giao diện web → Người dùng | Mở dashboard và menu theo quyền | alt: Đã điền đủ / alt: Hợp lệ |
| **Giai đoạn** | — | **2. Điều hướng trong phiên hợp lệ** | — |
| SQ01.15 | Người dùng → Giao diện web | Mở một module hoặc liên kết từ thông báo | Luồng chung |
| SQ01.16 | Giao diện web → Nghiệp vụ / phân quyền | Yêu cầu nội dung kèm phiên và ID đối tượng | Luồng chung |
| SQ01.17 | Nghiệp vụ / phân quyền → Nghiệp vụ / phân quyền | Kiểm tra quyền vai trò, phạm vi và quyền trên đối tượng | Luồng chung |
| SQ01.18 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc dữ liệu trong phạm vi được phép | alt: Đủ quyền |
| SQ01.19 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Dữ liệu hiện tại | alt: Đủ quyền |
| SQ01.20 | Nghiệp vụ / phân quyền → Giao diện web | Nội dung và các hành động được phép | alt: Đủ quyền |
| SQ01.21 | Giao diện web → Người dùng | Hiện danh sách, bộ lọc, số việc chờ và nút phù hợp | alt: Đủ quyền |
| SQ01.22 | Nghiệp vụ / phân quyền → Giao diện web | Từ chối truy cập | alt: Không đủ quyền |
| SQ01.23 | Giao diện web → Người dùng | Bạn không có quyền thực hiện thao tác này. | alt: Không đủ quyền |
| ref | [SQ15](#sq15) | Khôi phục đăng nhập; giữ phần nhập chưa gửi; trở lại đúng màn hình | alt: Phiên hết hạn; quay lại khi có kết quả phù hợp. |
| Ghi chú | — | Đăng xuất khỏi thiết bị dùng chung kết thúc phiên và xóa dữ liệu tạm của phiên. Chỉ được đổi sang vai trò đã cấp; backend vẫn kiểm tra quyền, không chỉ ẩn menu. | — |

<a id="sq02"></a>

## SQ02 — Nhập tri thức, lưu nháp và AI cấu trúc

- Đầu vào: Chuyên gia đã đăng nhập và chọn Ghi tri thức hoặc mở bản nháp của mình.
- Kết quả: Có bản nháp đã kiểm tra, đủ điều kiện chuyển sang đối chiếu kho.
- BPMN: `k-start`, `k-input`, `k-structure`, `k-check`, `k-ready`
- Xem [SVG](SQ02.svg).

### Màn hình và phản hồi

#### UI-03 · Ghi tri thức

- Một textbox: “Nhập hoặc dán kinh nghiệm, ghi chú, nội dung cuộc họp…”.
- Hiện tác giả từ tài khoản, thời điểm sửa, trạng thái lưu.
- Thông tin ngữ cảnh: loại máy/cụm máy, chủ đề (nếu đã biết).
- Nút: “AI sắp xếp nội dung”, “Lưu và thoát”, “Mở nháp”.
- Không có import file hoặc ghi âm trong MVP.

#### UI-04 · AI đang xử lý / bản gợi ý

- Hiện “Đang sắp xếp nội dung…”; vẫn giữ nội dung gốc.
- Kết quả có liên kết về đoạn nguồn và ô chưa đủ dữ kiện.
- Nếu có nhiều chủ đề: hiện danh sách đề xuất để chọn; mỗi đề xuất có nháp riêng.
- Nút: “Dùng bản gợi ý”, “Giữ bản đang sửa”, “Thử lại”, “Tự hoàn thiện biểu mẫu”.

#### UI-05 · Biểu mẫu tri thức

- Trường: tiêu đề; loại/model máy; dấu hiệu; điều kiện phát sinh; model SẢN PHẨM riêng với model máy; chế độ/tốc độ/line/ca/môi trường liên quan.
- Điểm thay đổi 5M1E: Con người / Máy / Vật liệu-sản phẩm / Phương pháp / Đo lường / Môi trường. Mỗi nhóm có Có thay đổi / Chưa ghi nhận / Chưa kiểm tra.
- Ghi giả thuyết, bằng chứng kiểm tra, lý do chọn/đổi hướng, thao tác, kết quả, bài học, điều kiện áp dụng, giới hạn, an toàn và đóng góp.
- Phân biệt nguyên nhân đã xác nhận với giả thuyết/chưa xác định; máy phục hồi chưa tự xác nhận nguyên nhân.
- Chỉ mở trường theo nội dung liên quan; mục không áp dụng/chưa biết có lý do, không bắt viết mọi mục 5M1E.
- Nút: Đối chiếu kho tri thức, Quay lại nội dung gốc, Lưu và thoát.

### Thứ tự tương tác

| Bước | Từ → đến | Nội dung | Điều kiện / ngữ cảnh |
| --- | --- | --- | --- |
| **Giai đoạn** | — | **1. Nhập và giữ lại nội dung gốc** | — |
| SQ02.01 | Chuyên gia → Giao diện web | Chọn Ghi tri thức hoặc mở nháp | Luồng chung |
| SQ02.02 | Giao diện web → Nghiệp vụ / phân quyền | Tạo / lấy nháp thuộc người dùng | Luồng chung |
| SQ02.03 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu / đọc draftId, tác giả và phiên bản nháp | Luồng chung |
| SQ02.04 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Nội dung nháp; thời điểm lưu gần nhất | Luồng chung |
| SQ02.05 | Nghiệp vụ / phân quyền → Giao diện web | Bản nháp và trạng thái | Luồng chung |
| SQ02.06 | Chuyên gia → Giao diện web | Thay đổi nội dung hoặc ngữ cảnh máy | loop: Trong khi chuyên gia nhập hoặc dán nội dung |
| SQ02.07 | Giao diện web → Giao diện web | Hiện Chưa lưu → Đang lưu sau khoảng ngừng nhập | loop: Trong khi chuyên gia nhập hoặc dán nội dung |
| SQ02.08 | Giao diện web → Nghiệp vụ / phân quyền | Lưu rawText, ngữ cảnh, draftId, revision hiện tại | loop: Trong khi chuyên gia nhập hoặc dán nội dung |
| SQ02.09 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu thay đổi kèm người sửa và thời điểm | loop: Trong khi chuyên gia nhập hoặc dán nội dung |
| SQ02.10 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Đã lưu; revision mới | loop: Trong khi chuyên gia nhập hoặc dán nội dung |
| SQ02.11 | Nghiệp vụ / phân quyền → Giao diện web | Xác nhận lưu | loop: Trong khi chuyên gia nhập hoặc dán nội dung |
| SQ02.12 | Giao diện web → Chuyên gia | Hiện Đã lưu lúc…; có thể rời màn hình | loop: Trong khi chuyên gia nhập hoặc dán nội dung |
| Ghi chú | — | Nếu lưu lỗi: dùng SQ15. Không hiển thị “Đã lưu” khi chưa nhận xác nhận; không tự mất nội dung khi đổi màn hình. | — |
| **Giai đoạn** | — | **2. Chuyên gia chủ động yêu cầu AI cấu trúc** | — |
| SQ02.13 | Chuyên gia → Giao diện web | Nhấn AI sắp xếp nội dung | Luồng chung |
| SQ02.14 | Giao diện web → Nghiệp vụ / phân quyền | Yêu cầu cấu trúc bản nháp tại revision đã lưu | Luồng chung |
| SQ02.15 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc ảnh chụp nội dung và ngữ cảnh | Luồng chung |
| SQ02.16 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Nội dung nguồn | Luồng chung |
| SQ02.17 | Nghiệp vụ / phân quyền → AI / RAG | Trích xuất theo biểu mẫu; không suy đoán dữ kiện còn thiếu | Luồng chung |
| SQ02.18 | AI / RAG → Nghiệp vụ / phân quyền | Các trường gợi ý, đoạn nguồn, mục thiếu; có thể nhiều chủ đề | alt: AI trả được kết quả hợp lệ |
| SQ02.19 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu gợi ý AI gắn revision nguồn; chưa thay bản chuyên gia | alt: AI trả được kết quả hợp lệ |
| SQ02.20 | Nghiệp vụ / phân quyền → Giao diện web | Bản gợi ý để xem trước | alt: AI trả được kết quả hợp lệ |
| SQ02.21 | Chuyên gia → Giao diện web | Chọn các chủ đề muốn tách thành đề xuất | alt: AI trả được kết quả hợp lệ / opt: Biên bản chứa nhiều chủ đề độc lập |
| SQ02.22 | Giao diện web → Nghiệp vụ / phân quyền | Tạo nháp cho từng chủ đề, giữ liên kết nội dung gốc | alt: AI trả được kết quả hợp lệ / opt: Biên bản chứa nhiều chủ đề độc lập |
| SQ02.23 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu từng nháp và nguồn chung | alt: AI trả được kết quả hợp lệ / opt: Biên bản chứa nhiều chủ đề độc lập |
| SQ02.24 | Nghiệp vụ / phân quyền → Giao diện web | Danh sách nháp; mở từng nháp để kiểm tra | alt: AI trả được kết quả hợp lệ / opt: Biên bản chứa nhiều chủ đề độc lập |
| SQ02.25 | Chuyên gia → Giao diện web | Chọn dùng bản gợi ý hoặc giữ biểu mẫu hiện tại | alt: AI trả được kết quả hợp lệ |
| SQ02.26 | Giao diện web → Nghiệp vụ / phân quyền | Lưu lựa chọn; chỉ áp dụng khi revision phù hợp | alt: AI trả được kết quả hợp lệ |
| SQ02.27 | Nghiệp vụ / phân quyền → Giao diện web | Biểu mẫu đang sửa và nội dung gốc để đối chiếu | alt: AI trả được kết quả hợp lệ |
| SQ02.28 | AI / RAG → Nghiệp vụ / phân quyền | Không có kết quả hợp lệ | alt: AI lỗi / hết thời gian |
| SQ02.29 | Nghiệp vụ / phân quyền → Giao diện web | Giữ nháp; cho thử lại hoặc nhập các mục thủ công | alt: AI lỗi / hết thời gian |
| SQ02.30 | Giao diện web → Chuyên gia | Chưa thể sắp xếp nội dung. Bản nhập của bạn vẫn được giữ. | alt: AI lỗi / hết thời gian |
| **Giai đoạn** | — | **3. Xác nhận biểu mẫu trước khi đối chiếu kho** | — |
| SQ02.31 | Chuyên gia → Giao diện web | Đọc, sửa và bổ sung biểu mẫu; xác nhận phần AI phân loại | loop: Đến khi nội dung bắt buộc hợp lệ và chuyên gia xác nhận |
| SQ02.32 | Giao diện web → Nghiệp vụ / phân quyền | Lưu biểu mẫu và lý do các mục chưa có / không áp dụng | loop: Đến khi nội dung bắt buộc hợp lệ và chuyên gia xác nhận |
| SQ02.33 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu revision mới; giữ rawText và lịch sử sửa | loop: Đến khi nội dung bắt buộc hợp lệ và chuyên gia xác nhận |
| SQ02.34 | Nghiệp vụ / phân quyền → Giao diện web | Các ô hợp lệ / còn thiếu | loop: Đến khi nội dung bắt buộc hợp lệ và chuyên gia xác nhận |
| SQ02.35 | Giao diện web → Chuyên gia | Hiện lỗi tại từng ô và danh sách mục cần hoàn thiện | loop: Đến khi nội dung bắt buộc hợp lệ và chuyên gia xác nhận / alt: Còn thiếu mục bắt buộc |
| SQ02.36 | Giao diện web → Chuyên gia | Bật nút Đối chiếu kho tri thức | loop: Đến khi nội dung bắt buộc hợp lệ và chuyên gia xác nhận / alt: Đủ điều kiện |
| ref | [SQ03](#sq03) | Đối chiếu kho trên bản nháp đã được chuyên gia kiểm tra | Luồng chung; quay lại khi có kết quả phù hợp. |

<a id="sq03"></a>

## SQ03 — Đối chiếu tri thức và xử lý nội dung trùng

- Đầu vào: Biểu mẫu tri thức đã được chuyên gia kiểm tra và lưu.
- Kết quả: Hủy/lưu trữ bản trùng, hoặc có đề xuất tạo mới/cập nhật sẵn sàng gửi duyệt.
- BPMN: `k-compare`, `k-read`, `k-classify`, `k-update`, `k-new`, `k-merge`, `k-archive`, `k-covered`, `-SpsiOeKhrRzImmBTtOj-4`
- Xem [SVG](SQ03.svg).

### Màn hình và phản hồi

#### UI-06 · Đối chiếu kho

- Hiện bản đang viết và nguồn đã duyệt ở hai cột.
- Mỗi nguồn: ID/phiên bản, tên, máy/phạm vi, tác giả, người duyệt, ngày duyệt.
- Bảng giống/khác: triệu chứng, nguyên nhân, điều kiện áp dụng, bước xử lý, an toàn, kết quả.
- Tách rõ không có dữ liệu và có khác biệt; mở toàn văn nguồn.
- Không kết luận “trùng” chỉ bằng phần trăm tương đồng.

#### UI-07 · Chọn cách ghi nhận

- Ba lựa chọn: “Hủy đề xuất trùng”, “Bổ sung bản đã có”, “Tạo tri thức mới”.
- Hủy: hộp xác nhận nêu nháp được lưu trữ, bản gốc không đổi; có nút “Quay lại”.
- Bổ sung: chọn ID/phiên bản gốc; ghi phần mới, điều kiện khác và lý do sửa.
- Tạo mới gần nguồn cũ: giải thích khác biệt; không có kết quả thì vẫn cần xác nhận tạo mới.

### Thứ tự tương tác

| Bước | Từ → đến | Nội dung | Điều kiện / ngữ cảnh |
| --- | --- | --- | --- |
| **Giai đoạn** | — | **1. Tìm và đối chiếu các bản liên quan** | — |
| SQ03.01 | Chuyên gia → Giao diện web | Nhấn Đối chiếu kho tri thức | Luồng chung |
| SQ03.02 | Giao diện web → Nghiệp vụ / phân quyền | Gửi draftId và revision đã kiểm tra | Luồng chung |
| SQ03.03 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc biểu mẫu và phạm vi truy cập | Luồng chung |
| SQ03.04 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Ảnh chụp nội dung | Luồng chung |
| SQ03.05 | Nghiệp vụ / phân quyền → AI / RAG | Yêu cầu tìm và so sánh nguồn được phép sử dụng | Luồng chung |
| SQ03.06 | AI / RAG → Kho tri thức đã duyệt<br>& chỉ mục tra cứu | Tìm tri thức đã duyệt theo máy, ngữ cảnh và nội dung | Luồng chung |
| SQ03.07 | Kho tri thức đã duyệt<br>& chỉ mục tra cứu → AI / RAG | Các đoạn nguồn; ID và phiên bản; có thể rỗng | Luồng chung |
| SQ03.08 | AI / RAG → Nghiệp vụ / phân quyền | Bảng giống/khác, căn cứ, phần chưa rõ; không tự chọn hành động | Luồng chung |
| SQ03.09 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu lần đối chiếu gắn revision nguồn và nháp | Luồng chung |
| SQ03.10 | Nghiệp vụ / phân quyền → Giao diện web | Kết quả đối chiếu có dẫn nguồn | Luồng chung |
| SQ03.11 | Chuyên gia → Giao diện web | Mở các nguồn liên quan để đọc | Luồng chung |
| ref | [SQ14](#sq14) | Đọc nguồn đầy đủ và điều kiện áp dụng | Luồng chung; quay lại khi có kết quả phù hợp. |
| Ghi chú | — | Không tìm thấy bản liên quan khác với lỗi truy xuất. Nếu truy xuất lỗi: giữ nháp và thử lại; chưa đánh dấu đã đối chiếu để gửi. | — |
| **Giai đoạn** | — | **2. Quyết định của chuyên gia** | — |
| SQ03.12 | Chuyên gia → Giao diện web | Nhấn Hủy đề xuất trùng | alt: Nội dung trùng, không có điểm mới |
| SQ03.13 | Giao diện web → Chuyên gia | Xác nhận lưu trữ đề xuất và liên kết bản đã có? | alt: Nội dung trùng, không có điểm mới |
| SQ03.14 | Giao diện web → Chuyên gia | Giữ nguyên nháp; tiếp tục đọc hoặc sửa | alt: Nội dung trùng, không có điểm mới / alt: Chọn Quay lại |
| SQ03.15 | Giao diện web → Nghiệp vụ / phân quyền | Lưu trữ nháp trùng; gửi ID bản đã có và lý do | alt: Nội dung trùng, không có điểm mới / alt: Xác nhận hủy |
| SQ03.16 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Ghi trạng thái Đã hủy do trùng; giữ nháp, tác giả và liên kết | alt: Nội dung trùng, không có điểm mới / alt: Xác nhận hủy |
| SQ03.17 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Đã lưu | alt: Nội dung trùng, không có điểm mới / alt: Xác nhận hủy |
| SQ03.18 | Nghiệp vụ / phân quyền → Giao diện web | Không tạo đề xuất chờ duyệt | alt: Nội dung trùng, không có điểm mới / alt: Xác nhận hủy |
| SQ03.19 | Giao diện web → Chuyên gia | Đã lưu trữ đề xuất trùng. Bạn có thể mở tri thức đã có. | alt: Nội dung trùng, không có điểm mới / alt: Xác nhận hủy |
| SQ03.20 | Chuyên gia → Giao diện web | Chọn Bổ sung bản đã có; nhập phần thay đổi và lý do | alt: Có bổ sung hoặc cần sửa bản đã có |
| SQ03.21 | Giao diện web → Nghiệp vụ / phân quyền | Lưu loại Cập nhật, knowledgeId, baseVersion, phần đề xuất | alt: Có bổ sung hoặc cần sửa bản đã có |
| SQ03.22 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Giữ phiên bản gốc; tạo đề xuất cập nhật riêng | alt: Có bổ sung hoặc cần sửa bản đã có |
| SQ03.23 | Nghiệp vụ / phân quyền → Giao diện web | Bản gốc và bản đề xuất; phần thay đổi nổi bật | alt: Có bổ sung hoặc cần sửa bản đã có |
| ref | [SQ04](#sq04) | Gửi đề xuất cập nhật để kiểm duyệt | alt: Có bổ sung hoặc cần sửa bản đã có; quay lại khi có kết quả phù hợp. |
| SQ03.24 | Chuyên gia → Giao diện web | Chọn Tạo tri thức mới; ghi khác biệt nếu có nguồn gần giống | alt: Tri thức mới hoặc khác biệt có giá trị độc lập |
| SQ03.25 | Giao diện web → Nghiệp vụ / phân quyền | Lưu loại Tạo mới và căn cứ phân biệt | alt: Tri thức mới hoặc khác biệt có giá trị độc lập |
| SQ03.26 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Cập nhật nháp; giữ kết quả đối chiếu | alt: Tri thức mới hoặc khác biệt có giá trị độc lập |
| SQ03.27 | Nghiệp vụ / phân quyền → Giao diện web | Bản đề xuất mới sẵn sàng gửi | alt: Tri thức mới hoặc khác biệt có giá trị độc lập |
| ref | [SQ04](#sq04) | Gửi đề xuất mới để kiểm duyệt | alt: Tri thức mới hoặc khác biệt có giá trị độc lập; quay lại khi có kết quả phù hợp. |
| Ghi chú | — | Nếu sửa đáng kể nội dung sau khi đối chiếu, hiển thị “Nội dung đã thay đổi — cần đối chiếu lại”. Kết quả trên revision cũ không được dùng để xác nhận bản mới. | — |

<a id="sq04"></a>

## SQ04 — Xác nhận và gửi đề xuất kiểm duyệt

- Đầu vào: Có đề xuất đã hoàn thiện và đối chiếu: từ SQ03 hoặc SQ13/SQ06; người gửi có quyền.
- Kết quả: Đề xuất Chờ duyệt, có người duyệt phù hợp hoặc chờ phân công; bản đã duyệt và lịch sử ca không bị sửa.
- BPMN: `k-submit`, `k-queue`, `r-submit`
- Xem [SVG](SQ04.svg).

### Màn hình và phản hồi

#### UI-08 · Xác nhận gửi đề xuất

- Hiện tiêu đề, loại đề xuất, máy/phạm vi, tác giả/người đóng góp, kết quả đối chiếu, nguồn hoặc báo cáo ca.
- Cập nhật: hiện ID và phiên bản gốc. Liên kết case: hiện ca và tri thức đích.
- Xác nhận “Tôi đã kiểm tra nội dung và phạm vi áp dụng”.
- Nút “Gửi kiểm duyệt”; khi gửi hiện tiến trình và khóa gửi lặp.

#### UI-09 · Đề xuất của tôi

- Mỗi dòng: mã, tiêu đề, nguồn Chuyên gia/Case, loại Mới/Cập nhật/Liên kết, trạng thái, người duyệt, lần cập nhật.
- Chi tiết có timeline: nháp → gửi → phản hồi → gửi lại → quyết định.
- Chờ duyệt: xem bản đã gửi, chưa sửa trực tiếp ảnh chụp đó.
- Chưa có người duyệt phù hợp: “Đã gửi — chờ phân công người duyệt”; giữ trong hàng đợi đúng chuyên môn.

### Thứ tự tương tác

| Bước | Từ → đến | Nội dung | Điều kiện / ngữ cảnh |
| --- | --- | --- | --- |
| **Giai đoạn** | — | **1. Xem lại trước khi gửi** | — |
| SQ04.01 | Người gửi đề xuất → Giao diện web | Mở xem lại; xác nhận nội dung; nhấn Gửi kiểm duyệt | Luồng chung |
| SQ04.02 | Giao diện web → Nghiệp vụ / phân quyền | Gửi proposalId, revision, loại đề xuất, nguồn và mã lần gửi | Luồng chung |
| SQ04.03 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc bản hiện tại, quyền, người đóng góp và bản gốc | Luồng chung |
| SQ04.04 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Trạng thái, revision, phiên bản và phạm vi | Luồng chung |
| SQ04.05 | Nghiệp vụ / phân quyền → Giao diện web | Danh sách vấn đề; không chuyển trạng thái | alt: Thiếu trường, chưa xác nhận hoặc chưa đối chiếu bản hiện tại |
| SQ04.06 | Giao diện web → Người gửi đề xuất | Chưa thể gửi. Vui lòng hoàn thiện các mục được đánh dấu. | alt: Thiếu trường, chưa xác nhận hoặc chưa đối chiếu bản hiện tại |
| Ghi chú | — | Đề xuất chưa gửi; quay lại hoàn thiện nội dung. | alt: Thiếu trường, chưa xác nhận hoặc chưa đối chiếu bản hiện tại / break: Dừng lần tương tác hiện tại |
| SQ04.07 | Nghiệp vụ / phân quyền → Giao diện web | Trả phiên bản mới nhất; không ghi đè | alt: Bản gốc / đề xuất đã thay đổi bởi phiên khác |
| ref | [SQ15](#sq15) | Đọc khác biệt, cập nhật đề xuất và đối chiếu lại | alt: Bản gốc / đề xuất đã thay đổi bởi phiên khác; quay lại khi có kết quả phù hợp. |
| Ghi chú | — | Thực hiện một lần gửi mới sau khi đã xử lý xung đột. | alt: Bản gốc / đề xuất đã thay đổi bởi phiên khác / break: Dừng lần tương tác hiện tại |
| SQ04.08 | Nghiệp vụ / phân quyền → Nghiệp vụ / phân quyền | Chọn người duyệt đúng chuyên môn, khác tác giả/người cùng xây dựng | alt: Mọi điều kiện hợp lệ |
| SQ04.09 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu ảnh chụp đề xuất Chờ duyệt và lịch sử gửi trong một giao dịch | alt: Mọi điều kiện hợp lệ |
| SQ04.10 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | submissionId, thời gian và người duyệt / chưa phân công | alt: Mọi điều kiện hợp lệ |
| SQ04.11 | Nghiệp vụ / phân quyền → Thông báo trong web | Tạo thông báo trong web cho người duyệt phù hợp | alt: Mọi điều kiện hợp lệ |
| SQ04.12 | Nghiệp vụ / phân quyền → Giao diện web | Đã nhận đề xuất; trạng thái, mã đề xuất và người duyệt | alt: Mọi điều kiện hợp lệ |
| SQ04.13 | Giao diện web → Người gửi đề xuất | Đã gửi kiểm duyệt. Theo dõi tại Đề xuất của tôi. | alt: Mọi điều kiện hợp lệ |
| **Giai đoạn** | — | **2. Theo dõi trạng thái sau khi gửi thành công** | — |
| SQ04.14 | Người gửi đề xuất → Giao diện web | Mở Đề xuất của tôi | Luồng chung |
| SQ04.15 | Giao diện web → Nghiệp vụ / phân quyền | Lấy trạng thái và lịch sử các đề xuất được phép xem | Luồng chung |
| SQ04.16 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc trạng thái hiện tại, không dùng bản lưu tạm | Luồng chung |
| SQ04.17 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Danh sách và timeline | Luồng chung |
| SQ04.18 | Nghiệp vụ / phân quyền → Giao diện web | Trạng thái; khả năng chỉnh sửa theo trạng thái | Luồng chung |
| SQ04.19 | Giao diện web → Người gửi đề xuất | Hiện thông tin theo dõi và liên kết tới đề xuất | Luồng chung |
| Ghi chú | — | Không tự chọn tác giả làm người duyệt khi thiếu người phù hợp. Gửi lại cùng mã lần gửi chỉ trả kết quả đã có, không tạo hai đề xuất. | — |
| ref | [SQ05](#sq05) | Người duyệt mở hồ sơ và quyết định | Luồng chung; quay lại khi có kết quả phù hợp. |

<a id="sq05"></a>

## SQ05 — Chuyên gia trưởng xem và quyết định kiểm duyệt

- Đầu vào: Đề xuất đang Chờ duyệt; người duyệt được cấp quyền theo chuyên môn và độc lập với tác giả.
- Kết quả: Yêu cầu bổ sung, Từ chối, hoặc Đã duyệt để chuyển xuất bản; mọi kết quả có người quyết định, lý do và thời gian.
- BPMN: `k-review`, `k-decision`, `k-feedback`, `k-reject`, `r-review`, `r-decision`, `r-feedback`, `r-reject`
- Xem [SVG](SQ05.svg).

### Màn hình và phản hồi

#### UI-10 · Hàng đợi duyệt

- Bộ lọc: nguồn đề xuất, máy/phạm vi, loại đề xuất, trạng thái, người gửi, thời gian.
- Dòng hồ sơ: mã, tiêu đề, người gửi, số lần bổ sung, người đang phụ trách.
- Chi tiết: bản đề xuất; bản gốc nếu cập nhật; so sánh trước/sau; nguồn chuyên gia hoặc báo cáo ca; tác giả và mọi người đóng góp.
- Tiêu chí xem xét: bằng chứng, tính đúng, phạm vi, điều kiện áp dụng, an toàn, trùng lặp.

#### UI-11 · Hành động kiểm duyệt

- Nút: “Phê duyệt”, “Yêu cầu bổ sung”, “Từ chối”, “Lưu nhận xét”.
- Cả ba kết quả đều nhập phản hồi; yêu cầu bổ sung chỉ rõ trường/đoạn cần sửa.
- Sửa chính tả/bố cục: lưu người sửa và trước/sau.
- Sửa nội dung chuyên môn: gửi tác giả xác nhận qua yêu cầu bổ sung.
- Trước khi chốt: hiển thị hành động, phiên bản và hậu quả; cho quay lại.

### Thứ tự tương tác

| Bước | Từ → đến | Nội dung | Điều kiện / ngữ cảnh |
| --- | --- | --- | --- |
| **Giai đoạn** | — | **1. Mở hồ sơ đúng phạm vi và đủ ngữ cảnh** | — |
| SQ05.01 | Chuyên gia trưởng → Giao diện web | Mở Hàng đợi duyệt; chọn đề xuất | Luồng chung |
| SQ05.02 | Giao diện web → Nghiệp vụ / phân quyền | Đọc hồ sơ kiểm duyệt | Luồng chung |
| SQ05.03 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Kiểm tra quyền, phạm vi, người tham gia, trạng thái và revision | Luồng chung |
| SQ05.04 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Kết quả kiểm tra và hồ sơ | Luồng chung |
| SQ05.05 | Nghiệp vụ / phân quyền → Giao diện web | Không cho thực hiện quyết định trên hồ sơ này | alt: Tự duyệt / cùng xây dựng / ngoài phạm vi / đã có quyết định |
| SQ05.06 | Giao diện web → Chuyên gia trưởng | Hiện lý do; yêu cầu chuyển người duyệt phù hợp hoặc tải quyết định mới nhất | alt: Tự duyệt / cùng xây dựng / ngoài phạm vi / đã có quyết định |
| Ghi chú | — | Kết thúc lượt kiểm duyệt này; không mở phần ra quyết định. | alt: Tự duyệt / cùng xây dựng / ngoài phạm vi / đã có quyết định / break: Dừng lần tương tác hiện tại |
| SQ05.07 | Nghiệp vụ / phân quyền → Kho tri thức đã duyệt<br>& chỉ mục tra cứu | Đọc bản đã duyệt liên quan và phiên bản gốc | alt: Có quyền duyệt và hồ sơ còn chờ |
| SQ05.08 | Kho tri thức đã duyệt<br>& chỉ mục tra cứu → Nghiệp vụ / phân quyền | Nguồn đầy đủ và tình trạng phiên bản | alt: Có quyền duyệt và hồ sơ còn chờ |
| SQ05.09 | Nghiệp vụ / phân quyền → Giao diện web | Đề xuất, nguồn, so sánh và lịch sử | alt: Có quyền duyệt và hồ sơ còn chờ |
| SQ05.10 | Chuyên gia trưởng → Giao diện web | Đọc nguồn; kiểm tra các phần nội dung | alt: Có quyền duyệt và hồ sơ còn chờ |
| SQ05.11 | Giao diện web → Nghiệp vụ / phân quyền | Mở báo cáo ca và nhật ký người tham gia | alt: Có quyền duyệt và hồ sơ còn chờ / alt: Đề xuất từ ca sửa chữa |
| SQ05.12 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc sự kiện thực tế, kết quả, xác nhận chuyên gia và khác biệt | alt: Có quyền duyệt và hồ sơ còn chờ / alt: Đề xuất từ ca sửa chữa |
| SQ05.13 | Nghiệp vụ / phân quyền → Giao diện web | Báo cáo nguồn chỉ đọc; giả thuyết tách khỏi nguyên nhân xác nhận | alt: Có quyền duyệt và hồ sơ còn chờ / alt: Đề xuất từ ca sửa chữa |
| SQ05.14 | Giao diện web → Nghiệp vụ / phân quyền | Mở nội dung gốc và quá trình chuyên gia chỉnh sửa | alt: Có quyền duyệt và hồ sơ còn chờ / alt: Đề xuất tri thức chuyên gia |
| SQ05.15 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc rawText, biểu mẫu và đóng góp | alt: Có quyền duyệt và hồ sơ còn chờ / alt: Đề xuất tri thức chuyên gia |
| SQ05.16 | Nghiệp vụ / phân quyền → Giao diện web | Nguồn và lịch sử hình thành tri thức | alt: Có quyền duyệt và hồ sơ còn chờ / alt: Đề xuất tri thức chuyên gia |
| **Giai đoạn** | — | **2. Quyết định — chỉ thực hiện khi hồ sơ hợp lệ ở bước 1** | — |
| SQ05.17 | Chuyên gia trưởng → Giao diện web | Sửa diễn đạt/chính tả; ghi chú thay đổi | opt: Người duyệt sửa biên tập, không đổi ý nghĩa |
| SQ05.18 | Giao diện web → Nghiệp vụ / phân quyền | Lưu chỉnh biên tập với revision đang xem | opt: Người duyệt sửa biên tập, không đổi ý nghĩa |
| SQ05.19 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu trước/sau và người sửa; cập nhật revision | opt: Người duyệt sửa biên tập, không đổi ý nghĩa |
| SQ05.20 | Nghiệp vụ / phân quyền → Giao diện web | Đã lưu chỉnh sửa; hiện phần thay đổi | opt: Người duyệt sửa biên tập, không đổi ý nghĩa |
| SQ05.21 | Chuyên gia trưởng → Giao diện web | Chọn quyết định; nhập nhận xét; xác nhận | Luồng chung |
| SQ05.22 | Giao diện web → Nghiệp vụ / phân quyền | Gửi quyết định, nhận xét, revision và mã lần quyết định | Luồng chung |
| SQ05.23 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Kiểm tra lại quyền, trạng thái và phiên bản trước khi chốt | Luồng chung |
| SQ05.24 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Hồ sơ hiện tại | Luồng chung |
| SQ05.25 | Nghiệp vụ / phân quyền → Giao diện web | Không ghi quyết định; trả lỗi cụ thể hoặc trạng thái mới | alt: Thiếu phản hồi / phiên bản đã đổi / đã được người khác quyết định |
| SQ05.26 | Giao diện web → Chuyên gia trưởng | Bổ sung nhận xét hoặc tải lại hồ sơ trước khi quyết định | alt: Thiếu phản hồi / phiên bản đã đổi / đã được người khác quyết định |
| SQ05.27 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Chuyển Cần bổ sung; lưu nhận xét theo mục và bản đề nghị sửa | alt: Hợp lệ — Yêu cầu bổ sung hoặc sửa nội dung chuyên môn |
| SQ05.28 | Nghiệp vụ / phân quyền → Thông báo trong web | Thông báo người gửi kèm liên kết đến đúng phiên bản | alt: Hợp lệ — Yêu cầu bổ sung hoặc sửa nội dung chuyên môn |
| SQ05.29 | Nghiệp vụ / phân quyền → Giao diện web | Đã gửi yêu cầu bổ sung | alt: Hợp lệ — Yêu cầu bổ sung hoặc sửa nội dung chuyên môn |
| SQ05.30 | Giao diện web → Chuyên gia trưởng | Hồ sơ đã chuyển về người gửi; xem lịch sử phản hồi | alt: Hợp lệ — Yêu cầu bổ sung hoặc sửa nội dung chuyên môn |
| ref | [SQ06](#sq06) | Người gửi sửa / xác nhận thay đổi và gửi lại | alt: Hợp lệ — Yêu cầu bổ sung hoặc sửa nội dung chuyên môn; quay lại khi có kết quả phù hợp. |
| SQ05.31 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu Từ chối, lý do và lịch sử; giữ báo cáo ca nếu có | alt: Hợp lệ — Từ chối |
| SQ05.32 | Nghiệp vụ / phân quyền → Thông báo trong web | Thông báo kết quả từ chối cho người gửi | alt: Hợp lệ — Từ chối |
| SQ05.33 | Nghiệp vụ / phân quyền → Giao diện web | Đã từ chối; không đưa đề xuất vào kho dùng cho RAG | alt: Hợp lệ — Từ chối |
| SQ05.34 | Giao diện web → Chuyên gia trưởng | Đã từ chối đề xuất. Lịch sử nguồn được giữ. | alt: Hợp lệ — Từ chối |
| SQ05.35 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu quyết định Đã duyệt, người duyệt, phản hồi và revision | alt: Hợp lệ — Phê duyệt |
| SQ05.36 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Quyết định đã ghi; công việc xuất bản được tạo | alt: Hợp lệ — Phê duyệt |
| SQ05.37 | Nghiệp vụ / phân quyền → Giao diện web | Đã duyệt — đang cập nhật kho tra cứu | alt: Hợp lệ — Phê duyệt |
| ref | [SQ07](#sq07) | Xuất bản/duyệt liên kết và thông báo khi sẵn sàng | alt: Hợp lệ — Phê duyệt; quay lại khi có kết quả phù hợp. |
| Ghi chú | — | Chuyên gia trưởng xác nhận tri thức có thể tái sử dụng. Bước này không chứng nhận thay người thực hiện rằng các thao tác trong ca thực tế đã xảy ra. | — |

<a id="sq06"></a>

## SQ06 — Người gửi nhận phản hồi và hoàn thiện đề xuất

- Đầu vào: Đề xuất ở Cần bổ sung; người gửi mở thông báo hoặc Đề xuất của tôi.
- Kết quả: Có revision được người gửi xác nhận, đã đối chiếu lại và gửi duyệt; giữ mọi vòng phản hồi.
- BPMN: `k-return`, `k-revise`, `r-revise`
- Xem [SVG](SQ06.svg).

### Màn hình và phản hồi

#### UI-12 · Chi tiết yêu cầu bổ sung

- Hiện người nhận xét, ngày giờ, lần xét duyệt, từng mục cần sửa và lý do.
- Bên cạnh có bản đã gửi, bản đang sửa và phần người duyệt đề nghị thay đổi.
- Nút “Sửa đề xuất”, “Xem nguồn”, “Lưu và thoát”.
- Báo cáo ca gốc vẫn chỉ đọc; không thay đổi theo nội dung đề xuất.

#### UI-13 · Gửi lại sau bổ sung

- Hiện danh sách nhận xét đã xử lý/chưa xử lý và so sánh với lần gửi trước.
- Nút “Đối chiếu lại”, sau đó “Gửi lại kiểm duyệt”.
- Thông báo khi thiếu: “Còn mục cần bổ sung hoặc chưa có giải thích”.
- Tác giả phải xác nhận nội dung chuyên môn do người duyệt đề nghị; không tự xuất bản sau khi nhận sửa.

### Thứ tự tương tác

| Bước | Từ → đến | Nội dung | Điều kiện / ngữ cảnh |
| --- | --- | --- | --- |
| **Giai đoạn** | — | **1. Đọc phản hồi đúng phiên bản** | — |
| SQ06.01 | Thông báo trong web → Giao diện web | Hiện thông báo yêu cầu bổ sung trong phiên người gửi | Luồng chung |
| SQ06.02 | Người gửi đề xuất → Giao diện web | Mở phản hồi | Luồng chung |
| SQ06.03 | Giao diện web → Nghiệp vụ / phân quyền | Đọc đề xuất, revision mới nhất và lịch sử | Luồng chung |
| SQ06.04 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Kiểm tra quyền sửa và trạng thái Cần bổ sung | Luồng chung |
| SQ06.05 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Bản đã gửi, phản hồi và bản đang sửa nếu có | Luồng chung |
| SQ06.06 | Nghiệp vụ / phân quyền → Giao diện web | Các mục cần sửa và thay đổi được đề nghị | Luồng chung |
| SQ06.07 | Người gửi đề xuất → Giao diện web | Sửa mục liên quan; chấp nhận / chỉnh lại đề nghị; ghi giải thích | loop: Người gửi xử lý từng nhận xét |
| SQ06.08 | Giao diện web → Nghiệp vụ / phân quyền | Lưu nội dung và kết quả phản hồi từng mục | loop: Người gửi xử lý từng nhận xét |
| SQ06.09 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu revision; giữ tác giả và người đề nghị sửa | loop: Người gửi xử lý từng nhận xét |
| SQ06.10 | Nghiệp vụ / phân quyền → Giao diện web | Đã lưu; các nhận xét còn chưa giải quyết | loop: Người gửi xử lý từng nhận xét |
| SQ06.11 | Người gửi đề xuất → Giao diện web | Bổ sung nội dung chuyên gia cung cấp và khai báo đóng góp | opt: Đề xuất từ ca cần chuyên gia cùng hoàn thiện |
| SQ06.12 | Giao diện web → Nghiệp vụ / phân quyền | Lưu người đóng góp thực tế và người nhập nội dung | opt: Đề xuất từ ca cần chuyên gia cùng hoàn thiện |
| SQ06.13 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Bổ sung dấu vết; cập nhật điều kiện người duyệt độc lập | opt: Đề xuất từ ca cần chuyên gia cùng hoàn thiện |
| SQ06.14 | Nghiệp vụ / phân quyền → Giao diện web | Danh sách người đóng góp đã cập nhật | opt: Đề xuất từ ca cần chuyên gia cùng hoàn thiện |
| **Giai đoạn** | — | **2. Kiểm tra lại trước khi gửi lại** | — |
| SQ06.15 | Người gửi đề xuất → Giao diện web | Nhấn Đối chiếu lại | Luồng chung |
| SQ06.16 | Giao diện web → Nghiệp vụ / phân quyền | Kiểm tra trường bắt buộc và revision | Luồng chung |
| SQ06.17 | Nghiệp vụ / phân quyền → Giao diện web | Trả danh sách mục còn thiếu | alt: Nội dung chưa hoàn thiện |
| SQ06.18 | Giao diện web → Người gửi đề xuất | Giữ bản đang sửa; đi đến từng mục cần bổ sung | alt: Nội dung chưa hoàn thiện |
| ref | [SQ03](#sq03) | Đối chiếu lại và xác nhận tạo mới/cập nhật hoặc hủy nếu trùng | alt: Đã hoàn thiện / alt: Nguồn là tri thức chuyên gia; quay lại khi có kết quả phù hợp. |
| ref | [SQ13](#sq13) | Chỉ đối chiếu và sửa đề xuất tri thức; giữ báo cáo ca đã hoàn tất | alt: Đã hoàn thiện / alt: Nguồn là case sửa chữa; quay lại khi có kết quả phù hợp. |
| ref | [SQ04](#sq04) | Gửi revision mới, giữ proposalId và số vòng bổ sung | alt: Đã hoàn thiện / opt: Người gửi vẫn chọn gửi đề xuất sau đối chiếu; quay lại khi có kết quả phù hợp. |
| Ghi chú | — | Nếu phát hiện dữ kiện thực tế của báo cáo sai: tạo bản đính chính có lý do và người xác nhận theo SQ12; không âm thầm ghi nội dung đề xuất ngược vào báo cáo. | — |

<a id="sq07"></a>

## SQ07 — Xuất bản tri thức và theo dõi kết quả

- Đầu vào: SQ05 đã ghi quyết định phê duyệt, hoặc người gửi mở thông báo kết quả bất kỳ.
- Kết quả: Liên kết được duyệt hoặc phiên bản sẵn sàng cho RAG; người gửi thấy đúng trạng thái, nguồn và người duyệt.
- BPMN: `k-publish`, `k-end`, `k-reject-notify`, `k-rejected`, `r-publish`, `r-published`, `r-rejected`
- Xem [SVG](SQ07.svg).

### Màn hình và phản hồi

#### UI-14 · Trạng thái xuất bản

- Hiện hai thông tin: kết quả kiểm duyệt và khả năng tra cứu.
- Đã duyệt nhưng chưa xong: “Đã duyệt — đang cập nhật tra cứu”.
- Sẵn sàng: “Đã xuất bản”; mở ID/phiên bản chính thức.
- Lỗi cập nhật: “Đã duyệt, chưa sẵn sàng tra cứu”; không hiển thị thành công giả.
- Với liên kết case: “Đã duyệt liên kết”; không tạo thêm bản tri thức trùng.

#### UI-15 · Thông báo và kết quả

- Danh sách thông báo: loại sự kiện, mã đối tượng, tiêu đề, người xử lý, thời gian, đã đọc/chưa đọc.
- Bấm thông báo mở trạng thái hiện tại, đồng thời giữ sự kiện cũ trong timeline.
- Từ chối: hiện lý do, bản bị từ chối, người quyết định; lịch sử ca vẫn tồn tại.
- Đã xuất bản: hiện tác giả/người đóng góp/người duyệt và nguồn; có thể mở bản chính thức.
- Không gửi email/Slack hoặc thông báo ngoài ứng dụng trong prototype.

### Thứ tự tương tác

| Bước | Từ → đến | Nội dung | Điều kiện / ngữ cảnh |
| --- | --- | --- | --- |
| **Giai đoạn** | — | **1. Xuất bản từ quyết định đã ghi nhận** | — |
| SQ07.01 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc quyết định đã duyệt và ảnh chụp nội dung được duyệt | Luồng chung |
| SQ07.02 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Loại đề xuất, nguồn, revision, tác giả và người duyệt | Luồng chung |
| SQ07.03 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu liên kết được duyệt từ caseId đến knowledgeId/version | alt: Chỉ liên kết ca lặp lại với tri thức đã có |
| SQ07.04 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Liên kết có hiệu lực; không tạo nội dung tri thức mới | alt: Chỉ liên kết ca lặp lại với tri thức đã có |
| SQ07.05 | Nghiệp vụ / phân quyền → Thông báo trong web | Thông báo Đã duyệt liên kết cho người gửi | alt: Chỉ liên kết ca lặp lại với tri thức đã có |
| SQ07.06 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Chuẩn bị phiên bản bất biến gắn nguồn và quyết định; chưa đánh dấu sẵn sàng | alt: Tạo mới hoặc cập nhật nội dung tri thức |
| SQ07.07 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | knowledgeId/version cần xuất bản | alt: Tạo mới hoặc cập nhật nội dung tri thức |
| SQ07.08 | Nghiệp vụ / phân quyền → Kho tri thức đã duyệt<br>& chỉ mục tra cứu | Lập chỉ mục đúng phiên bản đã duyệt và phạm vi truy cập | alt: Tạo mới hoặc cập nhật nội dung tri thức |
| SQ07.09 | Kho tri thức đã duyệt<br>& chỉ mục tra cứu → Nghiệp vụ / phân quyền | Chỉ mục đã sẵn sàng cho phiên bản này | alt: Tạo mới hoặc cập nhật nội dung tri thức / alt: Xuất bản thành công |
| SQ07.10 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Ghi Sẵn sàng; kích hoạt phiên bản mới, giữ lịch sử phiên bản cũ | alt: Tạo mới hoặc cập nhật nội dung tri thức / alt: Xuất bản thành công |
| SQ07.11 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Đã cập nhật trạng thái | alt: Tạo mới hoặc cập nhật nội dung tri thức / alt: Xuất bản thành công |
| SQ07.12 | Nghiệp vụ / phân quyền → Thông báo trong web | Thông báo Đã xuất bản kèm ID/phiên bản | alt: Tạo mới hoặc cập nhật nội dung tri thức / alt: Xuất bản thành công |
| SQ07.13 | Kho tri thức đã duyệt<br>& chỉ mục tra cứu → Nghiệp vụ / phân quyền | Chưa sẵn sàng; không cung cấp bản dở dang cho RAG | alt: Tạo mới hoặc cập nhật nội dung tri thức / alt: Lỗi cập nhật kho tra cứu |
| SQ07.14 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Giữ Đã duyệt / Chưa sẵn sàng; ghi việc cần thử lại | alt: Tạo mới hoặc cập nhật nội dung tri thức / alt: Lỗi cập nhật kho tra cứu |
| SQ07.15 | Nghiệp vụ / phân quyền → Thông báo trong web | Hiện trạng thái đang chờ cập nhật; không yêu cầu người gửi gửi lại đề xuất | alt: Tạo mới hoặc cập nhật nội dung tri thức / alt: Lỗi cập nhật kho tra cứu |
| Ghi chú | — | Thử lại xuất bản dùng cùng ID/phiên bản, không tạo phiên bản trùng. Bản đã duyệt trước đó vẫn dùng được nếu còn hiệu lực. | alt: Tạo mới hoặc cập nhật nội dung tri thức / alt: Lỗi cập nhật kho tra cứu |
| **Giai đoạn** | — | **2. Người gửi xem kết quả và lịch sử** | — |
| SQ07.16 | Thông báo trong web → Giao diện web | Đưa sự kiện mới vào danh sách thông báo | Luồng chung |
| SQ07.17 | Người gửi đề xuất → Giao diện web | Mở một thông báo hoặc chi tiết đề xuất | Luồng chung |
| SQ07.18 | Giao diện web → Nghiệp vụ / phân quyền | Đọc trạng thái hiện tại; đánh dấu thông báo đã đọc | Luồng chung |
| SQ07.19 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc quyết định, phản hồi, phiên bản và lịch sử | Luồng chung |
| SQ07.20 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Thông tin có quyền truy cập | Luồng chung |
| SQ07.21 | Nghiệp vụ / phân quyền → Giao diện web | Trạng thái mới nhất và timeline | Luồng chung |
| SQ07.22 | Giao diện web → Người gửi đề xuất | Hiện kết quả, lời nhận xét, nguồn và nút Mở tri thức | alt: Đã xuất bản / đã duyệt liên kết |
| ref | [SQ14](#sq14) | Đọc phiên bản chính thức | alt: Đã xuất bản / đã duyệt liên kết; quay lại khi có kết quả phù hợp. |
| SQ07.23 | Giao diện web → Người gửi đề xuất | Hiện tiến trình và trạng thái; chưa báo sẵn sàng sử dụng | alt: Đã duyệt, còn chờ cập nhật |
| ref | [SQ06](#sq06) | Mở đúng phản hồi cần xử lý | alt: Cần bổ sung; quay lại khi có kết quả phù hợp. |
| SQ07.24 | Giao diện web → Người gửi đề xuất | Hiện lý do và lịch sử; đề xuất không vào kho RAG; ca vẫn được giữ | alt: Bị từ chối |

<a id="sq08"></a>

## SQ08 — Mở hồ sơ BM/PM và điền sẵn từ HozenDX

- Đầu vào: Người bảo trì mở sự cố, công việc PM, quét mã máy hoặc tiếp tục một hồ sơ được phép xem.
- Kết quả: Có hồ sơ đúng máy, bối cảnh được xác nhận và nguồn dữ liệu; hồ sơ chỉ chờ báo cáo mở thẳng bước xác nhận.
- BPMN: `r-start`, `r-open`, `r-entry-state`, `r-inspect`, `r-abnormal`, `e-start`, `e-select`, `e-fetch`, `e-hozen`, `e-source`, `e-fallback`, `e-fallback-valid`, `e-confirm`, `e-existing`, `e-resume`, `e-type`, `e-pm-plan`, `e-pm-import`, `e-pm-template`, `e-bm`, `e-check-context`, `e-persist`, `e-end`, `e-unavailable`
- Xem [SVG](SQ08.svg).

### Màn hình và phản hồi

#### UI-16 · Bắt đầu công việc

- Hai lối vào: Sự cố BM / Bảo trì định kỳ PM; có Mở hồ sơ đang chờ.
- Chọn công việc có sẵn hoặc quét/nhập mã máy. Camera không dùng được thì nhập mã.
- Hiện máy, maker/model máy, năm, thông số, line/khu vực và chủ hồ sơ.
- Gắn nhãn HozenDX / dữ liệu mô phỏng / dữ liệu lưu trước; hiện thời điểm lấy.
- Không tự coi thông tin hệ thống là tình trạng hiện trường mới nhất.

#### UI-17 · Bối cảnh và 5M1E

- Dấu hiệu: Alarm, hiện tượng, bộ phận, thời điểm/tần suất. Không ép nhập nguyên nhân.
- Điều kiện: chế độ vận hành, MODEL SẢN PHẨM (khác model máy), tốc độ, line, ca, môi trường liên quan.
- 5M1E: Con người / Máy / Vật liệu-sản phẩm / Phương pháp / Đo lường / Môi trường.
- Mỗi nhóm: Có thay đổi / Chưa ghi nhận / Chưa kiểm tra; chỉ mở ô chi tiết khi cần.
- Hiện hồ sơ thay đổi từ HozenDX để đối chiếu; chỉ nhập phần thiếu hoặc khác thực tế.

#### UI-39 · Dữ liệu nguồn và dữ kiện thực tế

- Panel tham chiếu: lịch sử BM, biện pháp cũ, kết quả PM, SOP/DAS, bản vẽ, cải tạo, linh kiện/tồn kho nếu được cung cấp.
- Nguồn hệ thống và quan sát hiện trường có nhãn, thời điểm riêng.
- Nếu khác nhau: hiện cả hai để xác minh; không tự ghi đè lịch sử hoặc dữ liệu HozenDX.
- Hồ sơ BM thô là dữ liệu tham chiếu; chưa tự trở thành tri thức đã duyệt cho AI hướng dẫn.

### Thứ tự tương tác

| Bước | Từ → đến | Nội dung | Điều kiện / ngữ cảnh |
| --- | --- | --- | --- |
| **Giai đoạn** | — | **1. Chọn công việc và lấy dữ liệu theo quyền** | — |
| SQ08.01 | Người bảo trì → Giao diện web | Mở sự cố/việc PM hoặc quét mã máy | Luồng chung |
| SQ08.02 | Giao diện web → Nghiệp vụ / phân quyền | Đọc công việc/máy theo tài khoản và phạm vi | Luồng chung |
| SQ08.03 | Nghiệp vụ / phân quyền → HozenDX tích hợp<br>(dữ liệu theo quyền) | Yêu cầu dữ liệu có quyền: máy, BM/PM, chế độ bảo dưỡng, hồ sơ thay đổi | Luồng chung |
| SQ08.04 | HozenDX tích hợp<br>(dữ liệu theo quyền) → Nghiệp vụ / phân quyền | Dữ liệu được cung cấp, ID nguồn, phiên bản và thời điểm | alt: Tích hợp trả dữ liệu hợp lệ |
| SQ08.05 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Giữ ảnh chụp dữ liệu nguồn, không thay nhật ký thực tế | alt: Tích hợp trả dữ liệu hợp lệ |
| SQ08.06 | Nghiệp vụ / phân quyền → Giao diện web | Điền sẵn thẻ máy và thông tin công việc | alt: Tích hợp trả dữ liệu hợp lệ |
| SQ08.07 | HozenDX tích hợp<br>(dữ liệu theo quyền) → Nghiệp vụ / phân quyền | Không có dữ liệu đủ dùng; không giả báo thành công | alt: Không có kết nối / lỗi / thiếu dữ liệu |
| SQ08.08 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc bản đã có hoặc cấu hình mô phỏng được ghi nhãn | alt: Không có kết nối / lỗi / thiếu dữ liệu |
| SQ08.09 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Dữ liệu có nguồn và thời điểm, hoặc chưa có | alt: Không có kết nối / lỗi / thiếu dữ liệu |
| SQ08.10 | Nghiệp vụ / phân quyền → Giao diện web | Hiện phần thiếu, độ cũ và lựa chọn xác minh | alt: Không có kết nối / lỗi / thiếu dữ liệu |
| SQ08.11 | Người bảo trì → Giao diện web | Xác nhận bản dự phòng; bổ sung dữ kiện hiện trường | alt: Không có kết nối / lỗi / thiếu dữ liệu / alt: Xác minh được đúng máy và thông tin cần dùng |
| SQ08.12 | Giao diện web → Nghiệp vụ / phân quyền | Ghi nguồn dữ liệu và người xác nhận | alt: Không có kết nối / lỗi / thiếu dữ liệu / alt: Xác minh được đúng máy và thông tin cần dùng |
| SQ08.13 | Giao diện web → Người bảo trì | Chưa thể mở công việc. Kiểm tra mã máy hoặc liên hệ người phụ trách. | alt: Không có kết nối / lỗi / thiếu dữ liệu / alt: Chưa xác minh được / ngoài quyền truy cập |
| Ghi chú | — | Không tạo hồ sơ gắn máy chưa xác minh; nội dung đang nhập vẫn được giữ. | alt: Không có kết nối / lỗi / thiếu dữ liệu / alt: Chưa xác minh được / ngoài quyền truy cập / break: Dừng lần tương tác hiện tại |
| **Giai đoạn** | — | **2. Tiếp tục hồ sơ hay tạo công việc mới** | — |
| SQ08.14 | Người bảo trì → Giao diện web | Xác nhận đúng máy | Luồng chung |
| SQ08.15 | Giao diện web → Nghiệp vụ / phân quyền | Tìm hồ sơ đang mở và công việc liên quan | Luồng chung |
| SQ08.16 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc caseId, tiến độ, trạng thái báo cáo, đợt và bàn giao | Luồng chung |
| SQ08.17 | Nghiệp vụ / phân quyền → Giao diện web | Các hồ sơ phù hợp để tránh tạo trùng | Luồng chung |
| SQ08.18 | Người bảo trì → Giao diện web | Chọn Tiếp tục / Tham gia hồ sơ | alt: Chọn tiếp tục hồ sơ hiện có |
| SQ08.19 | Giao diện web → Nghiệp vụ / phân quyền | Kiểm tra quyền và tải đúng bước đang chờ | alt: Chọn tiếp tục hồ sơ hiện có |
| SQ08.20 | Nghiệp vụ / phân quyền → Giao diện web | Giữ caseId, chủ hồ sơ, nhật ký các đợt và việc còn lại | alt: Chọn tiếp tục hồ sơ hiện có |
| ref | [SQ12](#sq12) | Mở bản báo cáo hiện tại để xác nhận; không tạo đợt xử lý hoặc sửa máy lại | alt: Chọn tiếp tục hồ sơ hiện có / opt: Công việc đã kết thúc, chỉ còn báo cáo chờ xác nhận; quay lại khi có kết quả phù hợp. |
| Ghi chú | — | Kết thúc thao tác mở công việc; tiếp tục ở luồng báo cáo. | alt: Chọn tiếp tục hồ sơ hiện có / opt: Công việc đã kết thúc, chỉ còn báo cáo chờ xác nhận / break: Dừng lần tương tác hiện tại |
| SQ08.21 | Người bảo trì → Giao diện web | Chọn BM hoặc PM; nêu lý do nếu đã có hồ sơ khác đang mở | alt: Tạo hồ sơ mới |
| SQ08.22 | Người bảo trì → Giao diện web | Xác nhận dấu hiệu ban đầu, thời điểm và nguồn báo sự cố | alt: Tạo hồ sơ mới / alt: BM |
| Ghi chú | — | Nếu tích hợp cung cấp mã sự cố thì điền trước. Q&A không xác nhận cảnh báo tức thời hoặc tự phát sinh công việc. | alt: Tạo hồ sơ mới / alt: BM |
| SQ08.23 | Nghiệp vụ / phân quyền → HozenDX tích hợp<br>(dữ liệu theo quyền) | Lấy công việc PM được cấp quyền và phiên bản checklist | alt: Tạo hồ sơ mới / alt: PM và tích hợp cung cấp công việc/lịch/checklist |
| SQ08.24 | HozenDX tích hợp<br>(dữ liệu theo quyền) → Nghiệp vụ / phân quyền | Dữ liệu thực sự có: mã việc, lịch, nội dung, tiêu chuẩn | alt: Tạo hồ sơ mới / alt: PM và tích hợp cung cấp công việc/lịch/checklist |
| SQ08.25 | Nghiệp vụ / phân quyền → Giao diện web | Điền công việc PM; các hạng mục chưa có kết quả thực hiện | alt: Tạo hồ sơ mới / alt: PM và tích hợp cung cấp công việc/lịch/checklist |
| SQ08.26 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lấy mẫu PM đã cấu hình phù hợp máy từ chế độ/tiêu chuẩn bảo dưỡng | alt: Tạo hồ sơ mới / alt: PM nhưng không có lịch/công việc từ tích hợp |
| SQ08.27 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Checklist có nguồn/phiên bản, chưa có kết quả | alt: Tạo hồ sơ mới / alt: PM nhưng không có lịch/công việc từ tích hợp |
| SQ08.28 | Nghiệp vụ / phân quyền → Giao diện web | Cho chọn công việc/mẫu; không bắt tự soạn checklist tại hiện trường | alt: Tạo hồ sơ mới / alt: PM nhưng không có lịch/công việc từ tích hợp |
| SQ08.29 | Người bảo trì → Giao diện web | Xác nhận công việc PM phù hợp | alt: Tạo hồ sơ mới / alt: PM nhưng không có lịch/công việc từ tích hợp |
| SQ08.30 | Giao diện web → Nghiệp vụ / phân quyền | Tạo hồ sơ bằng mã thao tác, gắn máy, loại việc, chủ hồ sơ và nguồn | alt: Tạo hồ sơ mới |
| SQ08.31 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu caseId mới và ảnh chụp đầu vào; chưa tự tạo thao tác đã làm | alt: Tạo hồ sơ mới |
| SQ08.32 | Nghiệp vụ / phân quyền → Giao diện web | Đã mở hồ sơ; có thể bắt đầu đợt làm việc | alt: Tạo hồ sơ mới |
| **Giai đoạn** | — | **3. Bổ sung phần chỉ hiện trường mới biết** | — |
| SQ08.33 | Người bảo trì → Giao diện web | Xác nhận bối cảnh; bổ sung thông tin còn thiếu và 5M1E liên quan | Luồng chung |
| SQ08.34 | Giao diện web → Nghiệp vụ / phân quyền | Lưu quan sát và nguồn riêng với dữ liệu điền sẵn | Luồng chung |
| SQ08.35 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu contextRevision và dấu vết người ghi | Luồng chung |
| SQ08.36 | Nghiệp vụ / phân quyền → Giao diện web | Đã lưu; mở hành động phù hợp BM/PM | Luồng chung |
| ref | [SQ09](#sq09) | Tra cứu bằng hiện tượng, điều kiện, kiểm tra và điểm thay đổi | alt: Có bất thường cần điều tra; quay lại khi có kết quả phù hợp. |
| ref | [SQ11](#sq11) | Bắt đầu đợt thực hiện checklist; chỉ nhập kết quả thực tế | alt: PM không có bất thường; quay lại khi có kết quả phù hợp. |
| ref | [SQ11](#sq11) | Chọn điều tra tiếp hoặc tóm tắt/bàn giao, giữ hồ sơ mở | alt: Chưa đủ điều kiện thực hiện; quay lại khi có kết quả phù hợp. |

<a id="sq09"></a>

## SQ09 — RAG tra cứu và hỗ trợ chọn hướng xử lý

- Đầu vào: Ca đang mở, đã lưu kiểm tra sơ bộ và có đủ thông tin tối thiểu để tra cứu.
- Kết quả: Người bảo trì chọn bổ sung kiểm tra, xin chuyên gia hoặc chuyển sang chốt phương án trong thẩm quyền.
- BPMN: `r-retrieve`, `r-insight`, `r-assess`, `r-route`, `r-measure`
- Xem [SVG](SQ09.svg).

### Màn hình và phản hồi

#### UI-18 · Kết quả tra cứu cho hồ sơ

- Đầu trang giữ máy, đợt, dấu hiệu và bối cảnh; hiển thị thời điểm và lần tra cứu.
- Đối chiếu 3 nhóm theo Q&A: hiện tượng; điều kiện phát sinh; kết quả kiểm tra hiện trường. Thêm điểm thay đổi 5M1E.
- Phân biệt model máy với model sản phẩm; tốc độ/chế độ/line/ca/môi trường chỉ dùng khi có dữ kiện.
- Các case và tri thức chuyên gia đã duyệt ở trên, ưu tiên 1–3 và có Xem thêm. Mỗi nguồn có phiên bản, giống/khác, điều kiện, giới hạn và kết quả trước.
- Hồ sơ thô từ HozenDX được ghi nhãn nguồn tham chiếu; chưa tự coi là know-how đã duyệt.
- Không gọi số tiêu chí trùng là xác suất thành công; thiếu dữ liệu không đồng nghĩa giống nhau.

#### UI-19 · Phân tích hỗ trợ quyết định

- Tóm tắt: đã biết gì, còn thiếu gì, giả thuyết và bằng chứng, các bước đã thử.
- Nhóm: xử lý trước mắt / theo dõi-sửa trung hạn / cải tiến-thay thế dài hạn; chỉ hiện đề xuất có căn cứ.
- An toàn: trích quy trình phù hợp máy và thao tác; thiếu quy trình thì nói rõ cần xác minh.
- Nút “Mở nguồn”, “Bổ sung kiểm tra”, “Chọn phương án”, “Yêu cầu chuyên gia”.
- “Chọn phương án” không mang nghĩa AI cho phép vận hành máy.

### Thứ tự tương tác

| Bước | Từ → đến | Nội dung | Điều kiện / ngữ cảnh |
| --- | --- | --- | --- |
| **Giai đoạn** | — | **1. Tra cứu trên đúng bối cảnh đã lưu** | — |
| SQ09.01 | Người bảo trì → Giao diện web | Nhấn Tra cứu hướng xử lý | Luồng chung |
| SQ09.02 | Giao diện web → Nghiệp vụ / phân quyền | Tra cứu với caseId, roundId, contextRevision và phạm vi máy | Luồng chung |
| SQ09.03 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc hiện tượng, điều kiện, kết quả kiểm tra, 5M1E và các lần thử trước | Luồng chung |
| SQ09.04 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Dữ kiện có nguồn/thời điểm và phần chưa biết | Luồng chung |
| SQ09.05 | Nghiệp vụ / phân quyền → AI / RAG | Tìm nguồn đã duyệt; so sánh theo bối cảnh, không chỉ tên lỗi | Luồng chung |
| SQ09.06 | AI / RAG → Kho tri thức đã duyệt<br>& chỉ mục tra cứu | Tìm cả kinh nghiệm chuyên gia và case đã duyệt theo quyền | Luồng chung |
| SQ09.07 | Kho tri thức đã duyệt<br>& chỉ mục tra cứu → AI / RAG | Nguồn, đoạn trích, phiên bản, giới hạn; có thể không có | Luồng chung |
| SQ09.08 | AI / RAG → AI / RAG | So sánh dữ kiện; lập phân tích từng ý có nguồn | alt: Có nguồn đủ để lập phân tích |
| SQ09.09 | AI / RAG → Nghiệp vụ / phân quyền | Nguồn, bảng phù hợp/khác biệt, thiếu dữ kiện và hướng tham khảo | alt: Có nguồn đủ để lập phân tích |
| SQ09.10 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu ảnh chụp kết quả, nguồn và revision bối cảnh | alt: Có nguồn đủ để lập phân tích |
| SQ09.11 | Nghiệp vụ / phân quyền → Giao diện web | Kết quả tra cứu đã kiểm tra cấu trúc và nguồn | alt: Có nguồn đủ để lập phân tích |
| SQ09.12 | Giao diện web → Người bảo trì | Hiện nguồn bên trên và phân tích AI bên dưới | alt: Có nguồn đủ để lập phân tích |
| SQ09.13 | AI / RAG → Nghiệp vụ / phân quyền | Nêu rõ giới hạn; không sinh hướng thao tác thiếu nguồn | alt: Không có nguồn hoặc thiếu căn cứ |
| SQ09.14 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu lần tra cứu thiếu căn cứ | alt: Không có nguồn hoặc thiếu căn cứ |
| SQ09.15 | Nghiệp vụ / phân quyền → Giao diện web | Cảnh báo và dữ kiện còn cần xác minh | alt: Không có nguồn hoặc thiếu căn cứ |
| SQ09.16 | Giao diện web → Người bảo trì | Chưa đủ căn cứ để đề xuất xử lý. Bổ sung dữ kiện hoặc yêu cầu chuyên gia. | alt: Không có nguồn hoặc thiếu căn cứ |
| SQ09.17 | AI / RAG → Nghiệp vụ / phân quyền | Nêu từng nguồn và phần mâu thuẫn; không tự gộp thành quy trình | alt: Nguồn mâu thuẫn hoặc khác điều kiện áp dụng |
| SQ09.18 | Nghiệp vụ / phân quyền → Giao diện web | Cảnh báo cần chuyên gia xác minh | alt: Nguồn mâu thuẫn hoặc khác điều kiện áp dụng |
| SQ09.19 | Giao diện web → Người bảo trì | Các nguồn chưa thống nhất cho bối cảnh này; chưa có hướng xử lý đủ căn cứ. | alt: Nguồn mâu thuẫn hoặc khác điều kiện áp dụng |
| Ghi chú | — | Lỗi truy xuất / lỗi AI được xử lý ở SQ15, không đổi thành “không có tri thức”. Nếu phần AI lỗi nhưng nguồn hợp lệ còn đọc được, cho mở nguồn và yêu cầu hỗ trợ; không hiện phân tích tự tạo. | — |
| **Giai đoạn** | — | **2. Đọc nguồn và lựa chọn hành động** | — |
| SQ09.20 | Người bảo trì → Giao diện web | Đọc phân tích; mở nguồn cần đối chiếu | Luồng chung |
| ref | [SQ14](#sq14) | Xem toàn văn và phiên bản; ghi nguồn đã tham khảo vào ca | Luồng chung; quay lại khi có kết quả phù hợp. |
| SQ09.21 | Người bảo trì → Giao diện web | Chọn Bổ sung kiểm tra; ghi số đo / kết quả mới | alt: Cần thêm dữ kiện có thể kiểm tra trong thẩm quyền |
| SQ09.22 | Giao diện web → Nghiệp vụ / phân quyền | Lưu dữ kiện mới và đánh dấu kết quả cũ cần cập nhật | alt: Cần thêm dữ kiện có thể kiểm tra trong thẩm quyền |
| SQ09.23 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Tăng revision; giữ lần tra cứu trước trong timeline | alt: Cần thêm dữ kiện có thể kiểm tra trong thẩm quyền |
| SQ09.24 | Nghiệp vụ / phân quyền → Giao diện web | Đã lưu. Tra cứu lại để cập nhật phân tích. | alt: Cần thêm dữ kiện có thể kiểm tra trong thẩm quyền |
| ref | [SQ09](#sq09) | Lặp tra cứu với revision mới; không xóa kết quả trước | alt: Cần thêm dữ kiện có thể kiểm tra trong thẩm quyền; quay lại khi có kết quả phù hợp. |
| SQ09.25 | Người bảo trì → Giao diện web | Chọn Yêu cầu chuyên gia; ghi câu hỏi cần làm rõ | alt: Thiếu căn cứ, vượt thẩm quyền hoặc người dùng muốn hỗ trợ |
| ref | [SQ10](#sq10) | Tóm tắt bàn giao và tiếp nhận chuyên gia | alt: Thiếu căn cứ, vượt thẩm quyền hoặc người dùng muốn hỗ trợ; quay lại khi có kết quả phù hợp. |
| SQ09.26 | Người bảo trì → Giao diện web | Chọn phương án tham khảo; ghi đánh giá riêng | alt: Có căn cứ và người bảo trì xác nhận trong thẩm quyền |
| SQ09.27 | Giao diện web → Nghiệp vụ / phân quyền | Lưu quyết định và nguồn được chọn; chưa coi đã thực hiện | alt: Có căn cứ và người bảo trì xác nhận trong thẩm quyền |
| SQ09.28 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Ghi người quyết định, lý do, hướng xử lý dự kiến | alt: Có căn cứ và người bảo trì xác nhận trong thẩm quyền |
| SQ09.29 | Nghiệp vụ / phân quyền → Giao diện web | Phương án đang chờ kiểm tra điều kiện thực hiện | alt: Có căn cứ và người bảo trì xác nhận trong thẩm quyền |
| ref | [SQ11](#sq11) | Xác nhận điều kiện, an toàn rồi thực hiện và kiểm tra kết quả | alt: Có căn cứ và người bảo trì xác nhận trong thẩm quyền; quay lại khi có kết quả phù hợp. |

<a id="sq10"></a>

## SQ10 — Gọi chuyên gia và phối hợp ghi nhận tại hiện trường

- Đầu vào: Hồ sơ và đợt đang mở; cần hỗ trợ hoặc vượt khả năng tự xử lý.
- Kết quả: Đã ghi chuyên gia tham gia, công đoạn và người hỗ trợ/ghi nhận; hoặc giữ yêu cầu chờ và có đường bàn giao.
- BPMN: `r-call`, `r-handover`, `w-expert-available`, `r-join`, `r-investigate`
- Xem [SVG](SQ10.svg).

### Màn hình và phản hồi

#### UI-20 · Gọi chuyên gia

- Lý do, câu hỏi cần làm rõ, vị trí máy, bối cảnh, các lần thử và kết quả chưa hiệu quả.
- AI soạn bàn giao từ nhật ký; người bảo trì đọc/sửa trước khi gửi.
- Có yêu cầu đang chờ thì mở/cập nhật yêu cầu đó, không tạo trùng.
- Chờ chuyên gia vẫn cho ghi thêm nhật ký và lưu bàn giao; không coi đã có người nhận.

#### UI-21 · Đang phối hợp với chuyên gia

- Hiện người phụ trách, chuyên gia, thời điểm nhận và thời điểm thực sự tham gia, công đoạn hiện tại.
- Chuyên gia: Nhận hỗ trợ / Chưa thể hỗ trợ kèm lý do.
- Người bảo trì: hỗ trợ theo phân công và mở vùng Ghi nhận nhanh ngay trong hồ sơ.
- Người thực hiện và người nhập là hai trường riêng. Không tự mặc định mọi việc đều do chuyên gia làm.
- Chuyên gia có thể nhập trực tiếp hoặc xác nhận nhóm ghi nhận sau.

### Thứ tự tương tác

| Bước | Từ → đến | Nội dung | Điều kiện / ngữ cảnh |
| --- | --- | --- | --- |
| **Giai đoạn** | — | **1. Gửi yêu cầu bằng dữ kiện đã ghi** | — |
| SQ10.01 | Người bảo trì → Giao diện web | Nhấn Yêu cầu chuyên gia; ghi điều cần hỗ trợ | Luồng chung |
| SQ10.02 | Giao diện web → Nghiệp vụ / phân quyền | Lập bàn giao từ caseId, roundId và nhật ký | Luồng chung |
| SQ10.03 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc toàn bộ đợt liên quan, dữ kiện, bước đã thử và nguồn | Luồng chung |
| SQ10.04 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Dữ kiện có người/thời điểm; giả thuyết tách khỏi kết luận | Luồng chung |
| SQ10.05 | Nghiệp vụ / phân quyền → AI / RAG | Tóm tắt bối cảnh và việc còn mở | Luồng chung |
| SQ10.06 | AI / RAG → Nghiệp vụ / phân quyền | Bản gợi ý có liên kết tới ghi nhận | alt: AI tạo được bản bàn giao |
| SQ10.07 | AI / RAG → Nghiệp vụ / phân quyền | Chưa có kết quả hợp lệ | alt: AI lỗi |
| SQ10.08 | Nghiệp vụ / phân quyền → Nghiệp vụ / phân quyền | Dùng mẫu có các dữ kiện đã lưu; không chặn yêu cầu hỗ trợ | alt: AI lỗi |
| SQ10.09 | Nghiệp vụ / phân quyền → Giao diện web | Bản bàn giao để xác nhận | Luồng chung |
| SQ10.10 | Người bảo trì → Giao diện web | Kiểm tra/sửa; nhấn Gửi yêu cầu | Luồng chung |
| SQ10.11 | Giao diện web → Nghiệp vụ / phân quyền | Gửi bản bàn giao đã xác nhận | Luồng chung |
| SQ10.12 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu yêu cầu hỗ trợ; giữ người bảo trì là chủ hồ sơ | Luồng chung |
| SQ10.13 | Nghiệp vụ / phân quyền → Web của chuyên gia | Thông báo yêu cầu trong ứng dụng | Luồng chung |
| SQ10.14 | Nghiệp vụ / phân quyền → Giao diện web | Đã gửi — chờ chuyên gia tiếp nhận | Luồng chung |
| **Giai đoạn** | — | **2. Ghi rõ thời điểm và công đoạn tham gia** | — |
| SQ10.15 | Chuyên gia → Web của chuyên gia | Mở bản bàn giao và dữ liệu hiện tại | Luồng chung |
| SQ10.16 | Web của chuyên gia → Nghiệp vụ / phân quyền | Lấy hồ sơ theo quyền | Luồng chung |
| SQ10.17 | Nghiệp vụ / phân quyền → Web của chuyên gia | Bối cảnh, nguồn, các lần thử và yêu cầu | Luồng chung |
| SQ10.18 | Web của chuyên gia → Nghiệp vụ / phân quyền | Ghi phản hồi nếu có; giữ yêu cầu đang chờ | alt: Chưa có người nhận / chuyên gia chưa thể hỗ trợ |
| SQ10.19 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu trạng thái và lý do | alt: Chưa có người nhận / chuyên gia chưa thể hỗ trợ |
| SQ10.20 | Nghiệp vụ / phân quyền → Giao diện web | Hiện chưa có chuyên gia tham gia | alt: Chưa có người nhận / chuyên gia chưa thể hỗ trợ |
| ref | [SQ11](#sq11) | Người phụ trách chọn điều tra trong điều kiện cho phép hoặc bàn giao | alt: Chưa có người nhận / chuyên gia chưa thể hỗ trợ; quay lại khi có kết quả phù hợp. |
| SQ10.21 | Chuyên gia → Web của chuyên gia | Nhận hỗ trợ; khi bắt đầu, xác nhận công đoạn và thời điểm | alt: Chuyên gia tiếp nhận |
| SQ10.22 | Web của chuyên gia → Nghiệp vụ / phân quyền | Ghi nhân sự tham gia, thời điểm thực tế và lúc ghi | alt: Chuyên gia tiếp nhận |
| SQ10.23 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu participantId theo caseId/roundId; không đổi chủ hồ sơ | alt: Chuyên gia tiếp nhận |
| SQ10.24 | Nghiệp vụ / phân quyền → Giao diện web | Mở trạng thái Đang phối hợp; giữ vùng ghi nhanh cho người bảo trì | alt: Chuyên gia tiếp nhận |
| SQ10.25 | Chuyên gia → Người bảo trì | Trao đổi nhận định, căn cứ và phân công hỗ trợ tại hiện trường | alt: Chuyên gia tiếp nhận / loop: Có phát hiện, quyết định hoặc kết quả mới trong lúc phối hợp |
| Ghi chú | — | Trao đổi trực tiếp giữa hai người; người bảo trì chủ động ghi vào web. MVP không có ghi âm hoặc chép lời tự động. | alt: Chuyên gia tiếp nhận / loop: Có phát hiện, quyết định hoặc kết quả mới trong lúc phối hợp |
| ref | [SQ16](#sq16) | Người bảo trì ghi nhanh, chuyên gia có thể bổ sung; xác nhận theo nhóm đóng góp | alt: Chuyên gia tiếp nhận / loop: Có phát hiện, quyết định hoặc kết quả mới trong lúc phối hợp; quay lại khi có kết quả phù hợp. |
| ref | [SQ11](#sq11) | Chốt phương án, kiểm tra kết quả; người bảo trì tiếp tục hỗ trợ và quản lý hồ sơ | alt: Chuyên gia tiếp nhận; quay lại khi có kết quả phù hợp. |
| Ghi chú | — | Không yêu cầu chuyên gia vừa thao tác vừa nhập từng bước. Người bảo trì có thể ghi bù theo mốc khi đang phải hỗ trợ; giữ performedAt khác recordedAt và nhãn chờ xác nhận khi cần. | — |

<a id="sq11"></a>

## SQ11 — Đợt xử lý, PM, tóm tắt bàn giao và tiếp tục hồ sơ

- Đầu vào: Có hồ sơ BM/PM đã xác minh; có thể bắt đầu đợt mới hoặc tiếp tục đợt đang làm.
- Kết quả: Kết quả thực tế và tóm tắt đợt được lưu; đi điều tra tiếp, chờ/bàn giao hoặc lập báo cáo tổng kết.
- BPMN: `r-work-round`, `r-round-result`, `r-round-summary`, `r-handover-check`, `r-next`, `r-open-save`, `r-wait`, `w-start`, `w-open-round`, `r-action-merge`, `r-plan`, `r-act`, `w-more`, `r-verify`, `w-outcome`, `w-result`, `w-end`, `w-stop`, `w-exception`, `w-exception-approved`, `w-pm-abnormal`
- Xem [SVG](SQ11.svg).

### Màn hình và phản hồi

#### UI-22 · Công việc trong đợt

- Đầu màn hình: mã hồ sơ, đợt hiện tại, máy, chủ hồ sơ, chuyên gia đang tham gia.
- Hiện phương án, nguồn, người dự kiến làm và điều kiện an toàn từ quy trình có hiệu lực.
- PM: checklist điền sẵn; mỗi mục có giá trị/đơn vị, đạt/không đạt/chưa làm và bất thường.
- Nút: Ghi nhận nhanh, Tra cứu lại, Yêu cầu chuyên gia, Xem nháp báo cáo, Kết thúc đợt.
- Ghi theo mốc, không yêu cầu nhập từng động tác; không coi hạng mục trong kế hoạch là đã thực hiện.

#### UI-23 · Kết quả khác với tiến độ

- Kết quả máy: đã phục hồi/chưa phục hồi/chưa đủ kiểm chứng; căn cứ theo kiểm tra thực tế.
- Tiến độ: đang làm/chờ linh kiện/chờ hỗ trợ/bàn giao/kết thúc công việc.
- Kết thúc khi chưa khắc phục: phải có quyết định đúng thẩm quyền, lý do và nơi tiếp nhận nếu có.
- Không có quyết định phù hợp thì giữ mở, không đánh dấu thành công.
- Nút: Tiếp tục điều tra, Gọi chuyên gia, Tóm tắt và bàn giao, Lập báo cáo tổng kết.

#### UI-37 · Tóm tắt đợt và bàn giao

- AI điền: đã quan sát/kiểm tra/làm gì, ai làm, kết quả, giả thuyết còn mở, việc cần làm tiếp.
- Người bảo trì kiểm tra; chuyên gia xác nhận phần liên quan khi có thể.
- Tóm tắt gắn roundId, không phải báo cáo cuối độc lập.
- Bàn giao nhập người/đơn vị nhận theo quyền, lý do dừng và lưu ý.
- Thông báo: Đã lưu đợt và bàn giao. Hồ sơ vẫn chờ xử lý.

### Thứ tự tương tác

| Bước | Từ → đến | Nội dung | Điều kiện / ngữ cảnh |
| --- | --- | --- | --- |
| **Giai đoạn** | — | **1. Bắt đầu đợt, chốt điều kiện thực hiện** | — |
| SQ11.01 | Người bảo trì → Giao diện web | Bắt đầu/tiếp tục công việc trong hồ sơ | Luồng chung |
| SQ11.02 | Giao diện web → Nghiệp vụ / phân quyền | Mở đợt theo caseId; không tạo đợt trùng khi tải lại | Luồng chung |
| SQ11.03 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Tạo roundId mới khi thực sự bắt đầu đợt; hoặc lấy đợt đang làm | Luồng chung |
| SQ11.04 | Nghiệp vụ / phân quyền → Kho tri thức đã duyệt<br>& chỉ mục tra cứu | Lấy quy trình/phạm vi có hiệu lực được tham chiếu | Luồng chung |
| SQ11.05 | Nghiệp vụ / phân quyền → Giao diện web | Bàn giao trước, checklist/phương án, nguồn và điều kiện | Luồng chung |
| SQ11.06 | Người bảo trì → Giao diện web | Xác nhận điều kiện thực tế và người thực hiện | Luồng chung |
| SQ11.07 | Giao diện web → Nghiệp vụ / phân quyền | Lưu lựa chọn cùng bối cảnh hiện tại | Luồng chung |
| SQ11.08 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu kế hoạch và người xác nhận; ghi tiến độ Đang xử lý | alt: Có phương án đủ điều kiện |
| SQ11.09 | Nghiệp vụ / phân quyền → Giao diện web | Mở nhật ký và checklist | alt: Có phương án đủ điều kiện |
| ref | [SQ16](#sq16) | Ghi loại/nội dung/người làm/kết quả; giữ cả lần thử chưa hiệu quả | alt: Có phương án đủ điều kiện / loop: Có mốc cần ghi trong đợt; quay lại khi có kết quả phù hợp. |
| SQ11.10 | Người bảo trì → Giao diện web | Chọn Mở xử lý bất thường từ hạng mục | alt: Có phương án đủ điều kiện / opt: PM phát hiện bất thường ở một hạng mục |
| SQ11.11 | Giao diện web → Nghiệp vụ / phân quyền | Gắn bất thường với caseId, roundId và checklistItemId | alt: Có phương án đủ điều kiện / opt: PM phát hiện bất thường ở một hạng mục |
| SQ11.12 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Giữ checklist PM và tạo mục xử lý liên quan, không mất nguồn | alt: Có phương án đủ điều kiện / opt: PM phát hiện bất thường ở một hạng mục |
| SQ11.13 | Nghiệp vụ / phân quyền → Giao diện web | Mở phần điều tra trong cùng hồ sơ; việc độc lập chỉ tách hồ sơ khi có lý do | alt: Có phương án đủ điều kiện / opt: PM phát hiện bất thường ở một hạng mục |
| ref | [SQ09](#sq09) | Bổ sung dấu hiệu/điều kiện/5M1E; tra cứu hoặc gọi chuyên gia | alt: Có phương án đủ điều kiện / opt: PM phát hiện bất thường ở một hạng mục; quay lại khi có kết quả phù hợp. |
| SQ11.14 | Người bảo trì → Giao diện web | Ghi kiểm tra kết quả theo tiêu chí công việc | alt: Có phương án đủ điều kiện |
| SQ11.15 | Giao diện web → Nghiệp vụ / phân quyền | Lưu số đo, kết quả và tình trạng máy quan sát được | alt: Có phương án đủ điều kiện |
| SQ11.16 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Ghi sự kiện kiểm tra; nguyên nhân và kết quả là hai trường riêng | alt: Có phương án đủ điều kiện |
| SQ11.17 | Nghiệp vụ / phân quyền → Giao diện web | Đã lưu kết quả thực tế; chưa tự chốt báo cáo | alt: Có phương án đủ điều kiện |
| SQ11.18 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Ghi điều kiện chưa đạt; giữ hồ sơ mở | alt: Chưa có phương án / không đủ điều kiện |
| SQ11.19 | Nghiệp vụ / phân quyền → Giao diện web | Chọn tiếp tục điều tra/gọi hỗ trợ hoặc kết thúc đợt để bàn giao | alt: Chưa có phương án / không đủ điều kiện |
| **Giai đoạn** | — | **2. Chọn kết quả công việc và bước tiếp theo** | — |
| SQ11.20 | Người bảo trì → Giao diện web | Chọn kết quả và bước tiếp theo | Luồng chung |
| SQ11.21 | Giao diện web → Nghiệp vụ / phân quyền | Ghi kết thúc công việc và kết quả kiểm tra, chưa chốt báo cáo | alt: Đạt tiêu chí sau xử lý hoặc hoàn tất PM |
| SQ11.22 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu workState riêng machineState; reportState vẫn Nháp | alt: Đạt tiêu chí sau xử lý hoặc hoàn tất PM |
| SQ11.23 | Nghiệp vụ / phân quyền → Giao diện web | Công việc đã kết thúc; chuyển kiểm tra báo cáo | alt: Đạt tiêu chí sau xử lý hoặc hoàn tất PM |
| ref | [SQ12](#sq12) | AI tổng kết tất cả đợt, kể cả các lần chưa hiệu quả | alt: Đạt tiêu chí sau xử lý hoặc hoàn tất PM; quay lại khi có kết quả phù hợp. |
| SQ11.24 | Người bảo trì → Giao diện web | Nhập lý do và quyết định/chấp thuận đúng thẩm quyền | alt: Muốn kết thúc công việc dù chưa khắc phục |
| SQ11.25 | Giao diện web → Nghiệp vụ / phân quyền | Kiểm tra quyền và bằng chứng quyết định kết thúc | alt: Muốn kết thúc công việc dù chưa khắc phục |
| SQ11.26 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu Kết thúc chưa khắc phục/chuyển đơn vị/thay thiết bị; không đổi thành sửa thành công | alt: Muốn kết thúc công việc dù chưa khắc phục / alt: Đủ điều kiện |
| SQ11.27 | Nghiệp vụ / phân quyền → Giao diện web | Kết quả được giữ đúng thực tế | alt: Muốn kết thúc công việc dù chưa khắc phục / alt: Đủ điều kiện |
| ref | [SQ12](#sq12) | Lập tổng kết gồm hạn chế, việc còn lại và quyết định kết thúc | alt: Muốn kết thúc công việc dù chưa khắc phục / alt: Đủ điều kiện; quay lại khi có kết quả phù hợp. |
| SQ11.28 | Nghiệp vụ / phân quyền → Giao diện web | Giữ hồ sơ mở; thiếu quyền hoặc quyết định phù hợp | alt: Muốn kết thúc công việc dù chưa khắc phục / alt: Chưa đủ điều kiện |
| Ghi chú | — | Đi tiếp khối tóm tắt đợt và chọn điều tra/bàn giao nếu cần dừng phiên. | alt: Muốn kết thúc công việc dù chưa khắc phục / alt: Chưa đủ điều kiện |
| Ghi chú | — | Đi tiếp khối 3; mọi ghi nhận vẫn nằm trong cùng hồ sơ, không tạo case mới. | alt: Còn việc / chờ / cần bàn giao |
| **Giai đoạn** | — | **3. AI tóm tắt đợt chưa kết thúc công việc** | — |
| SQ11.29 | Giao diện web → Nghiệp vụ / phân quyền | Yêu cầu tóm tắt đợt hiện tại | opt: Công việc vẫn mở và người dùng kết thúc/bàn giao đợt |
| SQ11.30 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc các ghi nhận và kết quả của đợt | opt: Công việc vẫn mở và người dùng kết thúc/bàn giao đợt |
| SQ11.31 | Nghiệp vụ / phân quyền → AI / RAG | Soạn tóm tắt từ sự kiện; không tự loại trừ nguyên nhân | opt: Công việc vẫn mở và người dùng kết thúc/bàn giao đợt |
| SQ11.32 | AI / RAG → Nghiệp vụ / phân quyền | Tóm tắt có căn cứ đến từng ghi nhận | opt: Công việc vẫn mở và người dùng kết thúc/bàn giao đợt / alt: AI thành công |
| SQ11.33 | AI / RAG → Nghiệp vụ / phân quyền | Chưa có kết quả | opt: Công việc vẫn mở và người dùng kết thúc/bàn giao đợt / alt: AI lỗi |
| SQ11.34 | Nghiệp vụ / phân quyền → Nghiệp vụ / phân quyền | Điền mẫu từ dữ kiện; cho người dùng sửa để bàn giao ngay | opt: Công việc vẫn mở và người dùng kết thúc/bàn giao đợt / alt: AI lỗi |
| SQ11.35 | Nghiệp vụ / phân quyền → Giao diện web | Tóm tắt để kiểm tra | opt: Công việc vẫn mở và người dùng kết thúc/bàn giao đợt |
| SQ11.36 | Người bảo trì → Giao diện web | Sửa/xác nhận tóm tắt; chọn điều tra tiếp hoặc bàn giao | opt: Công việc vẫn mở và người dùng kết thúc/bàn giao đợt |
| SQ11.37 | Giao diện web → Nghiệp vụ / phân quyền | Lưu summaryRevision và kết quả kết thúc đợt | opt: Công việc vẫn mở và người dùng kết thúc/bàn giao đợt |
| SQ11.38 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Giữ roundId, tất cả eventId, người nhận và việc còn lại | opt: Công việc vẫn mở và người dùng kết thúc/bàn giao đợt |
| SQ11.39 | Nghiệp vụ / phân quyền → Giao diện web | Đợt đã lưu; bắt đầu đợt kế tiếp trên cùng caseId | opt: Công việc vẫn mở và người dùng kết thúc/bàn giao đợt / alt: Tiếp tục điều tra / gọi hỗ trợ |
| ref | [SQ09](#sq09) | Cập nhật bối cảnh và tra cứu; có thể gọi SQ10 để hỗ trợ | opt: Công việc vẫn mở và người dùng kết thúc/bàn giao đợt / alt: Tiếp tục điều tra / gọi hỗ trợ; quay lại khi có kết quả phù hợp. |
| SQ11.40 | Nghiệp vụ / phân quyền → Giao diện web | Đã lưu bàn giao; hồ sơ còn mở, báo cáo tổng kết chưa chốt | opt: Công việc vẫn mở và người dùng kết thúc/bàn giao đợt / alt: Dừng phiên / bàn giao / chờ |
| SQ11.41 | Giao diện web → Người bảo trì | Hiện người phụ trách, việc còn lại và lý do chờ | opt: Công việc vẫn mở và người dùng kết thúc/bàn giao đợt / alt: Dừng phiên / bàn giao / chờ |
| ref | [SQ08](#sq08) | Mở cùng caseId; xem các đợt cũ và bàn giao, tạo đợt mới chỉ khi làm tiếp | opt: Ở phiên sau, tiếp tục hồ sơ đang chờ; quay lại khi có kết quả phù hợp. |

<a id="sq12"></a>

## SQ12 — AI soạn báo cáo từ mọi đợt và xác nhận đóng góp

- Đầu vào: Hồ sơ có nhật ký; người dùng muốn xem nháp hoặc công việc đủ điều kiện kết thúc để chốt báo cáo.
- Kết quả: Cùng reportId có revision mới, hoặc báo cáo đã xác nhận để trích xuất tri thức; chờ xác nhận không làm mất dữ kiện.
- BPMN: `r-report`, `r-report-ready`, `r-doc-wait-end`, `w-preview`, `f-start`, `f-collect`, `f-ai-draft`, `f-ai-ok`, `f-fallback`, `f-review`, `f-purpose`, `f-preview-end`, `f-contributions`, `f-confirm`, `f-confirm-result`, `f-edit`, `f-wait`, `f-wait-end`, `f-check`, `f-valid`, `f-history`, `f-sync`, `f-end`
- Xem [SVG](SQ12.svg).

### Màn hình và phản hồi

#### UI-24 · Báo cáo tổng kết do AI soạn

- Nút Xem nháp / Cập nhật từ nhật ký; dùng cùng reportId, tăng revision khi cập nhật.
- Nội dung: máy/công việc, điều kiện và 5M1E, các đợt, giả thuyết, căn cứ, bước đã thử, kết quả, người tham gia, nguyên nhân xác nhận/chưa xác định, việc còn lại.
- Hiển thị cả lần thử chưa hiệu quả; từng nhận định có liên kết về ghi nhận gốc.
- Phân biệt việc đã làm với đề xuất trung/dài hạn.
- AI không ghi đè phần người dùng đã sửa; cho xem thay đổi trước khi áp dụng.

#### UI-25 · Xác nhận chuyên gia

- Hiện phần đóng góp của từng người, bản đã xác nhận và phần bị đổi ý nghĩa.
- Phần đã được xác nhận cuối đợt và không đổi: giữ xác nhận, không bắt xác nhận lại.
- Phần mới/đổi ý nghĩa: gửi nhóm nội dung cần xác nhận cho đúng chuyên gia.
- Chuyên gia chọn Xác nhận đúng / Yêu cầu sửa. Người bảo trì không xác nhận thay.
- Nếu chuyên gia chưa phản hồi: Lưu chờ và thoát; trạng thái máy và kết thúc công việc không bị đảo ngược.

#### UI-38 · Ba trạng thái riêng

- Tình trạng máy: đã phục hồi/chưa phục hồi/chưa đủ kiểm chứng — từ dữ kiện thực tế.
- Tiến độ công việc: đang làm/chờ/bàn giao/kết thúc, kèm kết quả và lý do.
- Báo cáo: Nháp/Chờ xác nhận/Đã xác nhận; máy phục hồi vẫn có thể chờ xác nhận báo cáo.
- HozenDX: chưa đồng bộ/đang đồng bộ/đã đồng bộ lúc…/đồng bộ lỗi. Chỉ hiện thành công khi có xác nhận bên nhận.
- Sau chốt: đính chính có lý do và phiên bản, không sửa ngầm lịch sử.

### Thứ tự tương tác

| Bước | Từ → đến | Nội dung | Điều kiện / ngữ cảnh |
| --- | --- | --- | --- |
| **Giai đoạn** | — | **1. Soạn nháp từ dữ kiện đã ghi, không viết lại cuối ca** | — |
| SQ12.01 | Người bảo trì → Giao diện web | Chọn Xem nháp hoặc Lập báo cáo tổng kết | Luồng chung |
| SQ12.02 | Giao diện web → Nghiệp vụ / phân quyền | Lấy reportId hiện tại và snapshot nhật ký | Luồng chung |
| SQ12.03 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc mọi roundId/eventId, nguồn, PM, đóng góp và quyết định kết thúc | Luồng chung |
| SQ12.04 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Dữ kiện, phiên bản và phần người dùng đã sửa | Luồng chung |
| SQ12.05 | Nghiệp vụ / phân quyền → AI / RAG | Soạn/cập nhật nháp từ dữ kiện; đánh dấu thông tin còn thiếu | Luồng chung |
| SQ12.06 | AI / RAG → Nghiệp vụ / phân quyền | Bản gợi ý và liên kết đến sự kiện; không tự thêm nguyên nhân | alt: Nháp AI có cấu trúc và căn cứ hợp lệ |
| SQ12.07 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu bản gợi ý gắn snapshot nguồn trên cùng reportId | alt: Nháp AI có cấu trúc và căn cứ hợp lệ |
| SQ12.08 | Nghiệp vụ / phân quyền → Giao diện web | Hiện nháp và khác biệt với bản đang sửa | alt: Nháp AI có cấu trúc và căn cứ hợp lệ |
| SQ12.09 | AI / RAG → Nghiệp vụ / phân quyền | Không có bản gợi ý đủ điều kiện áp dụng | alt: AI lỗi / thiếu căn cứ / kết quả đến trên dữ liệu cũ |
| SQ12.10 | Nghiệp vụ / phân quyền → Giao diện web | Giữ nháp và nhật ký; dùng mẫu điền dữ kiện, sửa tay hoặc thử lại | alt: AI lỗi / thiếu căn cứ / kết quả đến trên dữ liệu cũ |
| SQ12.11 | Giao diện web → Người bảo trì | Chưa tổng hợp được bằng AI. Dữ liệu công việc vẫn được giữ. | alt: AI lỗi / thiếu căn cứ / kết quả đến trên dữ liệu cũ |
| SQ12.12 | Người bảo trì → Giao diện web | Đọc nguồn, sửa và xác nhận bản tổng hợp thực tế | Luồng chung |
| SQ12.13 | Giao diện web → Nghiệp vụ / phân quyền | Lưu phần được chọn và reportRevision | Luồng chung |
| SQ12.14 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu nháp; không đổi sự kiện gốc hoặc xác nhận chuyên gia thay họ | Luồng chung |
| SQ12.15 | Nghiệp vụ / phân quyền → Giao diện web | Đã lưu nháp báo cáo | Luồng chung |
| SQ12.16 | Giao diện web → Người bảo trì | Trở lại đợt đang làm; báo cáo vẫn Nháp, hồ sơ không bị kết thúc | alt: Chỉ xem trước trong lúc làm |
| Ghi chú | — | Kết thúc lần xem nháp. Dữ kiện mới phát sinh sẽ làm nháp cần cập nhật. | alt: Chỉ xem trước trong lúc làm / break: Dừng lần tương tác hiện tại |
| Ghi chú | — | Tiếp tục xác nhận; chỉ chốt khi có kết quả/ quyết định kết thúc phù hợp. | alt: Cần chốt báo cáo |
| **Giai đoạn** | — | **2. Xác nhận theo nhóm đóng góp, tái dùng xác nhận còn hiệu lực** | — |
| SQ12.17 | Giao diện web → Nghiệp vụ / phân quyền | Kiểm tra nhóm đóng góp và phạm vi nội dung đã xác nhận | Luồng chung |
| SQ12.18 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | So nội dung hiện tại với xác nhận theo contributionRevision | Luồng chung |
| SQ12.19 | Nghiệp vụ / phân quyền → Giao diện web | Phần còn hiệu lực và phần cần xác nhận | Luồng chung |
| SQ12.20 | Người bảo trì → Giao diện web | Gửi xác nhận cho các phần còn thiếu | opt: Có chuyên gia và còn nội dung cần xác nhận |
| SQ12.21 | Giao diện web → Nghiệp vụ / phân quyền | Tạo yêu cầu theo người và phiên bản nội dung | opt: Có chuyên gia và còn nội dung cần xác nhận |
| SQ12.22 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu báo cáo Chờ xác nhận | opt: Có chuyên gia và còn nội dung cần xác nhận |
| SQ12.23 | Nghiệp vụ / phân quyền → Web của chuyên gia | Thông báo nhóm đóng góp cần xác nhận | opt: Có chuyên gia và còn nội dung cần xác nhận |
| SQ12.24 | Chuyên gia → Web của chuyên gia | Đọc nhóm đóng góp và bối cảnh báo cáo | opt: Có chuyên gia và còn nội dung cần xác nhận / loop: Mỗi chuyên gia có phần chưa xác nhận |
| SQ12.25 | Web của chuyên gia → Nghiệp vụ / phân quyền | Lấy nội dung hiện tại, dữ kiện gốc và phiên bản | opt: Có chuyên gia và còn nội dung cần xác nhận / loop: Mỗi chuyên gia có phần chưa xác nhận |
| SQ12.26 | Nghiệp vụ / phân quyền → Web của chuyên gia | Phần cần xác nhận; nội dung đã xác nhận trước đó | opt: Có chuyên gia và còn nội dung cần xác nhận / loop: Mỗi chuyên gia có phần chưa xác nhận |
| SQ12.27 | Người bảo trì → Giao diện web | Chọn Lưu chờ và thoát | opt: Có chuyên gia và còn nội dung cần xác nhận / loop: Mỗi chuyên gia có phần chưa xác nhận / alt: Chưa phản hồi / lưu chờ |
| SQ12.28 | Giao diện web → Nghiệp vụ / phân quyền | Giữ báo cáo chờ; không chốt thay chuyên gia | opt: Có chuyên gia và còn nội dung cần xác nhận / loop: Mỗi chuyên gia có phần chưa xác nhận / alt: Chưa phản hồi / lưu chờ |
| SQ12.29 | Nghiệp vụ / phân quyền → Giao diện web | Đã lưu; mở lại hồ sơ sẽ vào bước xác nhận | opt: Có chuyên gia và còn nội dung cần xác nhận / loop: Mỗi chuyên gia có phần chưa xác nhận / alt: Chưa phản hồi / lưu chờ |
| Ghi chú | — | Kết thúc phiên báo cáo; máy và tiến độ công việc giữ trạng thái thực tế. | opt: Có chuyên gia và còn nội dung cần xác nhận / loop: Mỗi chuyên gia có phần chưa xác nhận / alt: Chưa phản hồi / lưu chờ / break: Dừng lần tương tác hiện tại |
| SQ12.30 | Chuyên gia → Web của chuyên gia | Ghi phần chưa đúng và căn cứ | opt: Có chuyên gia và còn nội dung cần xác nhận / loop: Mỗi chuyên gia có phần chưa xác nhận / alt: Yêu cầu sửa |
| SQ12.31 | Web của chuyên gia → Nghiệp vụ / phân quyền | Lưu phản hồi; chưa xác nhận phần này | opt: Có chuyên gia và còn nội dung cần xác nhận / loop: Mỗi chuyên gia có phần chưa xác nhận / alt: Yêu cầu sửa |
| SQ12.32 | Nghiệp vụ / phân quyền → Giao diện web | Hiện phần cần sửa | opt: Có chuyên gia và còn nội dung cần xác nhận / loop: Mỗi chuyên gia có phần chưa xác nhận / alt: Yêu cầu sửa |
| SQ12.33 | Người bảo trì → Giao diện web | Sửa phần có căn cứ; gửi lại nội dung liên quan | opt: Có chuyên gia và còn nội dung cần xác nhận / loop: Mỗi chuyên gia có phần chưa xác nhận / alt: Yêu cầu sửa |
| SQ12.34 | Giao diện web → Nghiệp vụ / phân quyền | Lưu revision; chỉ đặt lại xác nhận bị ảnh hưởng | opt: Có chuyên gia và còn nội dung cần xác nhận / loop: Mỗi chuyên gia có phần chưa xác nhận / alt: Yêu cầu sửa |
| SQ12.35 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Giữ trước/sau và lý do; tiếp tục vòng xác nhận | opt: Có chuyên gia và còn nội dung cần xác nhận / loop: Mỗi chuyên gia có phần chưa xác nhận / alt: Yêu cầu sửa |
| SQ12.36 | Chuyên gia → Web của chuyên gia | Nhấn Xác nhận đúng | opt: Có chuyên gia và còn nội dung cần xác nhận / loop: Mỗi chuyên gia có phần chưa xác nhận / alt: Xác nhận đúng |
| SQ12.37 | Web của chuyên gia → Nghiệp vụ / phân quyền | Xác nhận bằng tài khoản cá nhân, gắn đúng phần nội dung | opt: Có chuyên gia và còn nội dung cần xác nhận / loop: Mỗi chuyên gia có phần chưa xác nhận / alt: Xác nhận đúng |
| SQ12.38 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu xác nhận, thời điểm và phiên bản đóng góp | opt: Có chuyên gia và còn nội dung cần xác nhận / loop: Mỗi chuyên gia có phần chưa xác nhận / alt: Xác nhận đúng |
| SQ12.39 | Nghiệp vụ / phân quyền → Giao diện web | Cập nhật chuyên gia đã xác nhận | opt: Có chuyên gia và còn nội dung cần xác nhận / loop: Mỗi chuyên gia có phần chưa xác nhận / alt: Xác nhận đúng |
| **Giai đoạn** | — | **3. Chốt báo cáo và đồng bộ khi có khả năng tích hợp** | — |
| SQ12.40 | Người bảo trì → Giao diện web | Nhấn Chốt báo cáo | Luồng chung |
| SQ12.41 | Giao diện web → Nghiệp vụ / phân quyền | Kiểm tra dữ kiện, kết thúc công việc, revision và các xác nhận | Luồng chung |
| SQ12.42 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc trạng thái hiện tại | Luồng chung |
| SQ12.43 | Nghiệp vụ / phân quyền → Giao diện web | Trả mục cần hoàn thiện; giữ bản nháp và mọi dữ kiện | alt: Thiếu điều kiện hoặc nội dung vừa đổi |
| Ghi chú | — | Chưa chốt; người dùng hoàn thiện/xác nhận lại phần cần thiết. | alt: Thiếu điều kiện hoặc nội dung vừa đổi / break: Dừng lần tương tác hiện tại |
| SQ12.44 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu báo cáo Đã xác nhận và lịch sử máy; giữ các đợt, người làm và nguồn | alt: Đủ điều kiện |
| SQ12.45 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Báo cáo đã lưu bền vững | alt: Đủ điều kiện |
| SQ12.46 | Nghiệp vụ / phân quyền → Giao diện web | Đã chốt báo cáo; có thể đánh giá tri thức tái dùng | alt: Đủ điều kiện |
| SQ12.47 | Nghiệp vụ / phân quyền → HozenDX tích hợp<br>(dữ liệu theo quyền) | Đồng bộ lịch sử/báo cáo theo mã thao tác, không nhân đôi hồ sơ | opt: HozenDX có API/quyền ghi lịch sử đã được cấu hình |
| SQ12.48 | HozenDX tích hợp<br>(dữ liệu theo quyền) → Nghiệp vụ / phân quyền | ID nguồn nhận và thời điểm đồng bộ | opt: HozenDX có API/quyền ghi lịch sử đã được cấu hình / alt: Bên nhận xác nhận thành công |
| SQ12.49 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu trạng thái đồng bộ | opt: HozenDX có API/quyền ghi lịch sử đã được cấu hình / alt: Bên nhận xác nhận thành công |
| SQ12.50 | Nghiệp vụ / phân quyền → Giao diện web | Hiện Đã đồng bộ lúc… | opt: HozenDX có API/quyền ghi lịch sử đã được cấu hình / alt: Bên nhận xác nhận thành công |
| SQ12.51 | HozenDX tích hợp<br>(dữ liệu theo quyền) → Nghiệp vụ / phân quyền | Chưa hoàn tất đồng bộ | opt: HozenDX có API/quyền ghi lịch sử đã được cấu hình / alt: Lỗi / chưa xác nhận |
| SQ12.52 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Giữ hàng chờ thử lại; báo cáo cục bộ vẫn Đã xác nhận | opt: HozenDX có API/quyền ghi lịch sử đã được cấu hình / alt: Lỗi / chưa xác nhận |
| SQ12.53 | Nghiệp vụ / phân quyền → Giao diện web | Báo cáo đã lưu; chưa đồng bộ HozenDX | opt: HozenDX có API/quyền ghi lịch sử đã được cấu hình / alt: Lỗi / chưa xác nhận |
| ref | [SQ13](#sq13) | Đối chiếu bài học của toàn bộ hồ sơ; kết quả chưa khắc phục cũng được giữ đúng phạm vi bằng chứng | Luồng chung; quay lại khi có kết quả phù hợp. |

<a id="sq13"></a>

## SQ13 — Từ báo cáo ca thành đề xuất tri thức

- Đầu vào: Báo cáo toàn bộ hồ sơ đã xác nhận ở SQ12, kể cả kết thúc chưa khắc phục đúng thẩm quyền, hoặc đề xuất được trả bổ sung ở SQ06.
- Kết quả: Chỉ giữ lịch sử, hoặc có đề xuất Liên kết/Cập nhật/Case mới được gửi kiểm duyệt.
- BPMN: `r-diff`, `r-proposal`, `r-useful`, `r-only-history`, `r-history-end`
- Xem [SVG](SQ13.svg).

### Màn hình và phản hồi

#### UI-26 · Giá trị tái sử dụng của hồ sơ

- Hiện Báo cáo đã xác nhận và lưu vào lịch sử máy.
- Bên trái là dữ kiện của tất cả đợt, gồm các lần chưa hiệu quả; bên phải là nguồn tương tự và gợi ý AI.
- So hiện tượng, điều kiện/model sản phẩm/5M1E, kiểm tra, căn cứ, nguyên nhân, bước xử lý, kết quả, điều kiện áp dụng và an toàn.
- Bài học từ lần chưa hiệu quả giữ đúng phạm vi bằng chứng; không kết luận phương pháp luôn vô dụng hoặc nguyên nhân chắc chắn bị loại trừ.
- Phân biệt đã chứng minh và còn giả thuyết. Kết thúc chưa khắc phục không được ghi thành sửa thành công.
- Lỗi AI không làm mất lịch sử hoặc đổi kết quả thực tế.

#### UI-27 · Chọn đề xuất từ ca

- Lựa chọn “Chỉ lưu lịch sử” / “Liên kết case đã có” / “Bổ sung tri thức đã có” / “Tạo case tri thức mới”.
- Liên kết: chọn nguồn/phiên bản và lý do phù hợp.
- Cập nhật: ghi phần khác và phạm vi bổ sung.
- Case mới: tiêu đề, bối cảnh, nguyên nhân, kiểm tra/xử lý, kết quả, bài học, điều kiện và an toàn.
- Tác giả/người đóng góp lấy từ ca, có thể bổ sung đúng thực tế; người gửi không mặc nhiên là người làm mọi thao tác.

### Thứ tự tương tác

| Bước | Từ → đến | Nội dung | Điều kiện / ngữ cảnh |
| --- | --- | --- | --- |
| **Giai đoạn** | — | **1. Đối chiếu báo cáo với kho tri thức** | — |
| SQ13.01 | Giao diện web → Nghiệp vụ / phân quyền | Yêu cầu đối chiếu reportId/revision đã xác nhận và đề xuất đang sửa nếu có | Luồng chung |
| SQ13.02 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc báo cáo, các đợt/sự kiện được dẫn chứng và đề xuất hiện tại | Luồng chung |
| SQ13.03 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Báo cáo bất biến, bằng chứng thành công/chưa hiệu quả và giới hạn | Luồng chung |
| SQ13.04 | Nghiệp vụ / phân quyền → AI / RAG | Tìm nội dung tương tự và gợi ý giá trị tái dùng có căn cứ | Luồng chung |
| SQ13.05 | AI / RAG → Kho tri thức đã duyệt<br>& chỉ mục tra cứu | Tra tri thức chuyên gia và case đã duyệt liên quan | Luồng chung |
| SQ13.06 | Kho tri thức đã duyệt<br>& chỉ mục tra cứu → AI / RAG | Các nguồn và phiên bản | Luồng chung |
| SQ13.07 | AI / RAG → Nghiệp vụ / phân quyền | Gợi ý liên kết/cập nhật/mới hoặc không có giá trị mới; kèm căn cứ | Luồng chung |
| SQ13.08 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu lần đối chiếu; không ghi đè nguồn hoặc báo cáo | Luồng chung |
| SQ13.09 | Nghiệp vụ / phân quyền → Giao diện web | Kết quả để người bảo trì xác nhận | Luồng chung |
| **Giai đoạn** | — | **2. Người bảo trì chọn cách ghi nhận** | — |
| SQ13.10 | Người bảo trì → Giao diện web | Đọc báo cáo và đối chiếu; chọn cách ghi nhận | Luồng chung |
| SQ13.11 | Giao diện web → Nghiệp vụ / phân quyền | Ghi quyết định không tạo tri thức và lý do tùy trường hợp | alt: Chỉ lưu lịch sử; không có đề xuất |
| SQ13.12 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Giữ hồ sơ, kết quả thực tế và nguồn đã tham khảo; không tạo hồ sơ duyệt | alt: Chỉ lưu lịch sử; không có đề xuất |
| SQ13.13 | Nghiệp vụ / phân quyền → Giao diện web | Đã ghi nhận; lịch sử và kết quả chưa khắc phục nếu có vẫn được giữ | alt: Chỉ lưu lịch sử; không có đề xuất |
| SQ13.14 | Giao diện web → Người bảo trì | Báo cáo đã được xác nhận và lưu. Không có đề xuất tri thức mới. | alt: Chỉ lưu lịch sử; không có đề xuất |
| SQ13.15 | Người bảo trì → Giao diện web | Chọn nguồn/phiên bản đích; nêu lý do phù hợp | alt: Liên kết với case/tri thức đã có |
| SQ13.16 | Giao diện web → Nghiệp vụ / phân quyền | Tạo/đổi đề xuất Liên kết, gắn caseId và targetVersion | alt: Liên kết với case/tri thức đã có |
| SQ13.17 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu đề xuất liên kết chưa duyệt; giữ sự kiện ca độc lập | alt: Liên kết với case/tri thức đã có |
| SQ13.18 | Nghiệp vụ / phân quyền → Giao diện web | Đề xuất liên kết sẵn sàng xem lại | alt: Liên kết với case/tri thức đã có |
| SQ13.19 | Người bảo trì → Giao diện web | Chọn bản gốc; nhập khác biệt và bài học bổ sung | alt: Bổ sung nội dung có giá trị vào tri thức cũ |
| SQ13.20 | Giao diện web → Nghiệp vụ / phân quyền | Lưu đề xuất Cập nhật, baseVersion và phần mới | alt: Bổ sung nội dung có giá trị vào tri thức cũ |
| SQ13.21 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Giữ báo cáo nguồn, phiên bản gốc và đề xuất riêng | alt: Bổ sung nội dung có giá trị vào tri thức cũ |
| SQ13.22 | Nghiệp vụ / phân quyền → Giao diện web | Bảng gốc/đề xuất và người đóng góp | alt: Bổ sung nội dung có giá trị vào tri thức cũ |
| SQ13.23 | Người bảo trì → Giao diện web | Hoàn thiện biểu mẫu tái sử dụng từ báo cáo | alt: Tạo case tri thức mới |
| SQ13.24 | Giao diện web → Nghiệp vụ / phân quyền | Lưu đề xuất Mới với nguồn và phạm vi áp dụng | alt: Tạo case tri thức mới |
| SQ13.25 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu nháp; tách nội dung tri thức khỏi báo cáo thực tế | alt: Tạo case tri thức mới |
| SQ13.26 | Nghiệp vụ / phân quyền → Giao diện web | Biểu mẫu case mới và thông tin còn thiếu | alt: Tạo case tri thức mới |
| SQ13.27 | Người bảo trì → Giao diện web | Sửa/xác nhận nội dung; phối hợp chuyên gia nếu cần | opt: Có đề xuất tri thức cần gửi / loop: Cho đến khi các trường bắt buộc và khác biệt đã được xác nhận |
| SQ13.28 | Giao diện web → Nghiệp vụ / phân quyền | Lưu đề xuất, đóng góp và kiểm tra điều kiện | opt: Có đề xuất tri thức cần gửi / loop: Cho đến khi các trường bắt buộc và khác biệt đã được xác nhận |
| SQ13.29 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu revision đề xuất; không thay báo cáo hoàn tất | opt: Có đề xuất tri thức cần gửi / loop: Cho đến khi các trường bắt buộc và khác biệt đã được xác nhận |
| SQ13.30 | Nghiệp vụ / phân quyền → Giao diện web | Danh sách mục còn thiếu hoặc đủ điều kiện gửi | opt: Có đề xuất tri thức cần gửi / loop: Cho đến khi các trường bắt buộc và khác biệt đã được xác nhận |
| Ghi chú | — | Nếu nội dung đề xuất thay đổi đáng kể so với bản đã đối chiếu, chạy lại khối 1. Cập nhật giữ proposalId; không tạo thêm một đề xuất cho mỗi lần sửa. | opt: Có đề xuất tri thức cần gửi |
| ref | [SQ04](#sq04) | Người bảo trì xác nhận và gửi; các loại Liên kết/Cập nhật/Mới đều qua người duyệt | opt: Có đề xuất tri thức cần gửi; quay lại khi có kết quả phù hợp. |
| Ghi chú | — | Nếu AI đối chiếu lỗi: hiện “Lịch sử ca đã được lưu; chưa đối chiếu được tri thức”. Có thể lưu đề xuất đang soạn và thử lại sau; chưa coi đề xuất đã đủ bước gửi. | — |

<a id="sq14"></a>

## SQ14 — Mở nguồn tri thức và ghi nhận việc tham khảo

- Đầu vào: Người dùng mở nguồn từ đối chiếu, kết quả tra cứu hoặc thư viện; quyền truy cập đã được cấp.
- Kết quả: Đọc được đúng phiên bản; khi làm ca có dấu vết tham khảo và phản hồi gắn ca, không sửa trực tiếp kho.
- BPMN: `k-read`, `r-assess`
- Xem [SVG](SQ14.svg).

### Màn hình và phản hồi

#### UI-28 · Chi tiết tri thức / case đã duyệt

- Hiện tên, loại nội dung, máy/phạm vi, tác giả/người đóng góp, người duyệt, ngày và phiên bản.
- Nội dung: triệu chứng/bối cảnh, nguyên nhân và bằng chứng, kiểm tra, hướng xử lý, kết quả, điều kiện, giới hạn, an toàn và bài học.
- Có liên kết nguồn/báo cáo theo quyền; dữ liệu nhạy cảm không được mở chỉ vì biết ID.
- Nguồn đang được xem giữ đúng phiên bản đã trích dẫn; nếu có bản mới thì gắn nhãn và cho đối chiếu.
- Nút “Quay lại kết quả”, “Xem phiên bản hiện hành”, “Ghi nhận tham khảo” khi đang có ca.

#### UI-29 · Tham khảo / áp dụng trong ca

- Phân biệt: “Đã đọc” / “Chọn làm hướng tham khảo” / “Đã thực hiện” / “Kết quả sau áp dụng”.
- Phản hồi: phù hợp, áp dụng một phần, không áp dụng được; ghi điểm khác và lý do.
- Chọn nguồn không tự đánh dấu sửa xong; kết quả thực tế lấy từ nhật ký/báo cáo.
- Ngoài ca đang làm: chỉ tra cứu; không tạo case sửa chữa giả chỉ để lưu một lần đọc.

### Thứ tự tương tác

| Bước | Từ → đến | Nội dung | Điều kiện / ngữ cảnh |
| --- | --- | --- | --- |
| **Giai đoạn** | — | **1. Mở bản đầy đủ để tự đánh giá** | — |
| SQ14.01 | Người dùng → Giao diện web | Chọn Mở nguồn trên thẻ kết quả | Luồng chung |
| SQ14.02 | Giao diện web → Nghiệp vụ / phân quyền | Đọc knowledgeId/version kèm ngữ cảnh draftId hoặc caseId | Luồng chung |
| SQ14.03 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Kiểm tra quyền đối tượng, trạng thái duyệt và hiệu lực | Luồng chung |
| SQ14.04 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Quyền và phiên bản được phép xem | Luồng chung |
| SQ14.05 | Nghiệp vụ / phân quyền → Giao diện web | Không trả nội dung làm hướng dẫn | alt: Không có quyền hoặc nguồn không còn dùng được |
| SQ14.06 | Giao diện web → Người dùng | Nguồn này chưa thể dùng. Tải lại kết quả hoặc yêu cầu hỗ trợ. | alt: Không có quyền hoặc nguồn không còn dùng được |
| Ghi chú | — | Không cho đánh dấu nguồn không hợp lệ là hướng xử lý áp dụng. | alt: Không có quyền hoặc nguồn không còn dùng được / break: Dừng lần tương tác hiện tại |
| SQ14.07 | Nghiệp vụ / phân quyền → Kho tri thức đã duyệt<br>& chỉ mục tra cứu | Lấy toàn văn đúng phiên bản được trích | alt: Nguồn có thể xem |
| SQ14.08 | Kho tri thức đã duyệt<br>& chỉ mục tra cứu → Nghiệp vụ / phân quyền | Nội dung, tác giả, phê duyệt và phiên bản hiện hành nếu khác | alt: Nguồn có thể xem |
| SQ14.09 | Nghiệp vụ / phân quyền → Giao diện web | Chi tiết nguồn và nhãn phiên bản | alt: Nguồn có thể xem |
| SQ14.10 | Giao diện web → Người dùng | Mở panel/trang chi tiết; giữ vị trí và ngữ cảnh tra cứu trước | alt: Nguồn có thể xem |
| **Giai đoạn** | — | **2. Ghi phản hồi ngay trong ca đang làm** | — |
| SQ14.11 | Người dùng → Giao diện web | Chọn Ghi nhận tham khảo; đánh giá mức phù hợp và ghi lý do | opt: Người dùng đang làm một ca và muốn ghi nguồn tham khảo |
| SQ14.12 | Giao diện web → Nghiệp vụ / phân quyền | Ghi caseId, knowledgeId/version, loại sử dụng và nhận xét | opt: Người dùng đang làm một ca và muốn ghi nguồn tham khảo |
| SQ14.13 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu sự kiện tham khảo vào ca, gắn người và thời gian | opt: Người dùng đang làm một ca và muốn ghi nguồn tham khảo |
| SQ14.14 | Nghiệp vụ / phân quyền → Giao diện web | Đã ghi nguồn vào ca; chưa coi thao tác đã thực hiện | opt: Người dùng đang làm một ca và muốn ghi nguồn tham khảo |
| SQ14.15 | Giao diện web → Người dùng | Đã lưu nhận xét vào ca hiện tại. | opt: Người dùng đang làm một ca và muốn ghi nguồn tham khảo |
| SQ14.16 | Người dùng → Giao diện web | Ghi điểm khác hoặc vấn đề vào nhật ký ca | opt: Phát hiện kiến thức thiếu/sai trong khi thực hiện ca |
| SQ14.17 | Giao diện web → Nghiệp vụ / phân quyền | Lưu nhận xét và nguồn liên quan | opt: Phát hiện kiến thức thiếu/sai trong khi thực hiện ca |
| SQ14.18 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Giữ dữ kiện trong ca để đưa vào báo cáo/đề xuất | opt: Phát hiện kiến thức thiếu/sai trong khi thực hiện ca |
| SQ14.19 | Nghiệp vụ / phân quyền → Giao diện web | Đã ghi; có thể đề xuất cập nhật sau khi xác minh | opt: Phát hiện kiến thức thiếu/sai trong khi thực hiện ca |
| Ghi chú | — | Đọc nguồn là thao tác hỗ trợ, không phê duyệt thêm lần nữa. Phản hồi được giữ trong ca và chỉ trở thành tri thức xuất bản khi đi qua SQ13 → SQ04 → SQ05. | — |

<a id="sq15"></a>

## SQ15 — Ngoại lệ dùng chung và bảo toàn dữ liệu đang nhập

- Đầu vào: Một màn hình đang nhập, gửi hoặc xử lý AI; đây là các chi tiết tương tác bổ sung cho prototype.
- Kết quả: Người dùng biết dữ liệu đã được lưu hay chưa và có thao tác phục hồi; không ghi đè hoặc báo thành công sai.
- BPMN: Luồng hỗ trợ prototype.
- Xem [SVG](SQ15.svg).

### Màn hình và phản hồi

#### UI-30 · Trạng thái lưu và rời màn hình

- Nhãn rõ: Chưa lưu / Đang lưu / Đã lưu lúc… / Chưa lưu được.
- Lỗi: “Chưa lưu được thay đổi. Giữ màn hình và thử lại.”
- Nút “Thử lưu lại”; giữ nguyên nội dung đang nhập.
- Rời màn hình khi chưa lưu: “Lưu rồi rời”, “Ở lại”, “Rời và bỏ thay đổi” có xác nhận.
- Nếu có lưu tạm cục bộ, chỉ ghi “Đã giữ tạm trên thiết bị”; không gọi là đã lưu lên hệ thống.

#### UI-31 · Khôi phục phiên

- Hiện “Phiên làm việc đã hết hạn. Đăng nhập lại để tiếp tục.”
- Giữ dữ liệu chưa gửi trong ngữ cảnh tài khoản hiện tại; không tự bỏ biểu mẫu.
- Sau đăng nhập cùng tài khoản: trở về đúng đối tượng, kiểm tra quyền và phiên bản trước khi lưu.
- Đăng nhập bằng tài khoản khác: không tự gửi dữ liệu nháp của tài khoản trước.

#### UI-32 · Xung đột phiên bản

- Hiện “Nội dung đã được cập nhật ở phiên khác”.
- Cho xem bản trên hệ thống và thay đổi chưa lưu của mình.
- Nút “Tải bản mới”, “Giữ nội dung để đối chiếu”, “Áp dụng lại phần đã chọn”.
- Không có nút ghi đè im lặng; sau gộp phải kiểm tra/đối chiếu lại khi cần.

#### UI-33 · Trạng thái AI

- Đang xử lý: có mô tả tác vụ; không báo kết quả khi chưa có.
- Lỗi: “Chưa nhận được kết quả AI. Dữ liệu đã nhập vẫn được giữ.”
- Có thể thử lại, tự sửa biểu mẫu, đọc nguồn còn hợp lệ hoặc yêu cầu chuyên gia tùy tác vụ.
- Kết quả đến muộn trên dữ liệu cũ: “Kết quả dựa trên bản trước”; chọn chạy lại hoặc chỉ xem tham khảo.
- Không tự chèn đè lên nội dung người dùng vừa sửa.

#### UI-34 · Chống tạo trùng do thao tác

- Khi tạo ca/gửi đề xuất/ra quyết định: khóa nút trong lần gửi.
- Nếu mất phản hồi: cho “Kiểm tra kết quả” hoặc thử lại cùng thao tác.
- Máy chủ dùng mã lần thao tác để trả cùng kết quả; không tạo thêm ca, đề xuất, quyết định hoặc phiên bản.
- Chỉ hiển thị toast thành công khi biết kết quả đã được ghi.

### Thứ tự tương tác

| Bước | Từ → đến | Nội dung | Điều kiện / ngữ cảnh |
| --- | --- | --- | --- |
| Ghi chú | — | Các khối opt bên dưới là những tình huống độc lập, có thể xảy ra ở nhiều trang. Không yêu cầu chạy lần lượt tất cả các tình huống. Prototype có thể mô phỏng phản hồi lỗi; chưa yêu cầu triển khai đầy đủ chế độ làm việc offline. | — |
| **Giai đoạn** | — | **A. Lưu thất bại hoặc mất mạng** | — |
| SQ15.01 | Giao diện web → Nghiệp vụ / phân quyền | Gửi bản thay đổi đang nhập | opt: Lưu bị lỗi hoặc không nhận được xác nhận |
| SQ15.02 | Nghiệp vụ / phân quyền → Giao diện web | Lỗi lưu / hết thời gian; chưa xác nhận hoàn tất | opt: Lưu bị lỗi hoặc không nhận được xác nhận |
| SQ15.03 | Giao diện web → Người dùng | Chưa lưu được thay đổi; nội dung vẫn còn trên màn hình | opt: Lưu bị lỗi hoặc không nhận được xác nhận |
| SQ15.04 | Người dùng → Giao diện web | Nhấn Thử lưu lại | opt: Lưu bị lỗi hoặc không nhận được xác nhận |
| SQ15.05 | Giao diện web → Nghiệp vụ / phân quyền | Gửi lại cùng mã lần lưu hoặc kiểm tra kết quả lần trước | opt: Lưu bị lỗi hoặc không nhận được xác nhận |
| SQ15.06 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Kiểm tra đã ghi chưa; chỉ ghi thêm nếu chưa có | opt: Lưu bị lỗi hoặc không nhận được xác nhận |
| SQ15.07 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Kết quả thực tế đã lưu và revision | opt: Lưu bị lỗi hoặc không nhận được xác nhận |
| SQ15.08 | Nghiệp vụ / phân quyền → Giao diện web | Xác nhận đã lưu | opt: Lưu bị lỗi hoặc không nhận được xác nhận |
| SQ15.09 | Giao diện web → Người dùng | Hiện Đã lưu lúc… | opt: Lưu bị lỗi hoặc không nhận được xác nhận |
| **Giai đoạn** | — | **B. Phiên hết hạn trong lúc nhập** | — |
| SQ15.10 | Giao diện web → Nghiệp vụ / phân quyền | Yêu cầu lưu/đọc với phiên cũ | opt: Máy chủ báo phiên hết hạn |
| SQ15.11 | Nghiệp vụ / phân quyền → Giao diện web | Phiên không hợp lệ; không thực hiện thay đổi | opt: Máy chủ báo phiên hết hạn |
| SQ15.12 | Giao diện web → Người dùng | Hiện yêu cầu đăng nhập lại, giữ phần nhập hiện tại | opt: Máy chủ báo phiên hết hạn |
| ref | [SQ01](#sq01) | Đăng nhập lại; kiểm tra cùng người dùng và quyền trên đối tượng | opt: Máy chủ báo phiên hết hạn; quay lại khi có kết quả phù hợp. |
| SQ15.13 | Giao diện web → Nghiệp vụ / phân quyền | Lấy trạng thái và revision mới nhất | opt: Máy chủ báo phiên hết hạn |
| SQ15.14 | Nghiệp vụ / phân quyền → Giao diện web | Bản hiện tại; cho phục hồi nếu cùng người dùng và không xung đột | opt: Máy chủ báo phiên hết hạn |
| **Giai đoạn** | — | **C. Hai người hoặc hai phiên cùng sửa** | — |
| SQ15.15 | Giao diện web → Nghiệp vụ / phân quyền | Lưu thay đổi dựa trên revision cũ | opt: Revision gửi lên khác bản hiện tại |
| SQ15.16 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | So revision trước khi ghi | opt: Revision gửi lên khác bản hiện tại |
| SQ15.17 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Có revision mới hơn | opt: Revision gửi lên khác bản hiện tại |
| SQ15.18 | Nghiệp vụ / phân quyền → Giao diện web | Từ chối ghi đè; trả bản mới và thông tin khác biệt | opt: Revision gửi lên khác bản hiện tại |
| SQ15.19 | Người dùng → Giao diện web | Đọc khác biệt; chọn phần muốn áp dụng lại | opt: Revision gửi lên khác bản hiện tại |
| SQ15.20 | Giao diện web → Nghiệp vụ / phân quyền | Gửi bản đã hợp nhất theo revision mới | opt: Revision gửi lên khác bản hiện tại |
| SQ15.21 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu có kiểm tra phiên bản | opt: Revision gửi lên khác bản hiện tại |
| SQ15.22 | Nghiệp vụ / phân quyền → Giao diện web | Đã lưu; yêu cầu xác nhận/đối chiếu lại nếu nội dung thay đổi | opt: Revision gửi lên khác bản hiện tại |
| **Giai đoạn** | — | **D. AI chậm, lỗi hoặc kết quả không còn đúng bản đang nhập** | — |
| SQ15.23 | Nghiệp vụ / phân quyền → AI / RAG | Gửi yêu cầu gắn requestId và revision nguồn | opt: AI không trả kết quả dùng được |
| SQ15.24 | AI / RAG → Nghiệp vụ / phân quyền | Lỗi / thiếu cấu trúc / nguồn không hợp lệ | opt: AI không trả kết quả dùng được |
| SQ15.25 | Nghiệp vụ / phân quyền → Giao diện web | Không có kết quả hợp lệ; giữ dữ kiện và nguồn còn dùng được | opt: AI không trả kết quả dùng được |
| SQ15.26 | Giao diện web → Người dùng | Hiện lựa chọn phục hồi phù hợp; không tự sinh nội dung thay thế | opt: AI không trả kết quả dùng được |
| SQ15.27 | AI / RAG → Nghiệp vụ / phân quyền | Kết quả gắn revision trước | opt: AI trả kết quả sau khi người dùng đã sửa bản nguồn |
| SQ15.28 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | So revision nguồn với revision hiện tại | opt: AI trả kết quả sau khi người dùng đã sửa bản nguồn |
| SQ15.29 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Bản nguồn đã thay đổi | opt: AI trả kết quả sau khi người dùng đã sửa bản nguồn |
| SQ15.30 | Nghiệp vụ / phân quyền → Giao diện web | Kết quả cũ chỉ được xem tham khảo, chưa áp dụng | opt: AI trả kết quả sau khi người dùng đã sửa bản nguồn |
| SQ15.31 | Người dùng → Giao diện web | Chọn Chạy lại trên bản mới hoặc Giữ bản hiện tại | opt: AI trả kết quả sau khi người dùng đã sửa bản nguồn |
| **Giai đoạn** | — | **E. Nhấn gửi lặp hoặc không biết lần gửi trước đã thành công chưa** | — |
| SQ15.32 | Người dùng → Giao diện web | Nhấn lại hoặc kiểm tra kết quả sau mất phản hồi | opt: Lặp lại một thao tác đã gửi |
| SQ15.33 | Giao diện web → Nghiệp vụ / phân quyền | Gửi cùng mã thao tác và đối tượng | opt: Lặp lại một thao tác đã gửi |
| SQ15.34 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Đọc kết quả nếu thao tác đã được ghi | opt: Lặp lại một thao tác đã gửi |
| SQ15.35 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | ID/trạng thái đã có, hoặc xác nhận chưa thực hiện | opt: Lặp lại một thao tác đã gửi |
| SQ15.36 | Nghiệp vụ / phân quyền → Giao diện web | Trả kết quả đã có; chỉ thực hiện lần đầu nếu chưa ghi | opt: Lặp lại một thao tác đã gửi |
| SQ15.37 | Giao diện web → Người dùng | Mở đúng đối tượng và hiển thị trạng thái thực tế | opt: Lặp lại một thao tác đã gửi |

<a id="sq16"></a>

## SQ16 — Ghi nhanh theo mốc và xác nhận nhóm đóng góp

- Đầu vào: Hồ sơ và đợt đang mở; người bảo trì tự xử lý hoặc đang hỗ trợ chuyên gia.
- Kết quả: Có nhật ký truy vết; phần đóng góp có trạng thái xác nhận riêng; có thể yêu cầu xem nháp báo cáo bất kỳ lúc phù hợp.
- BPMN: `w-note`, `w-save-event`, `w-confirm-now`, `w-expert-check`
- Xem [SVG](SQ16.svg).

### Màn hình và phản hồi

#### UI-35 · Vùng Ghi nhận nhanh trong hồ sơ

- Loại: Quan sát / Kiểm tra / Nhận định / Thao tác / Kết quả.
- Ô nội dung vài dòng; gõ hoặc dán. Không có ghi âm trong MVP.
- Người nhập tự lấy từ tài khoản; người thực hiện/chuyên gia hướng dẫn hiển thị riêng, có thể chọn đúng người.
- Kết quả: chưa có/có kết quả; số đo kèm đơn vị khi liên quan.
- Lý do lựa chọn mở khi ghi quyết định quan trọng; AI chỉ nhắc nếu còn thiếu căn cứ.
- Thời điểm nhập tự ghi; cho bổ sung thời điểm thực tế khi ghi bù.
- Nút Lưu ghi nhận; nháp tự giữ, chỉ báo Đã lưu khi máy chủ xác nhận.

#### UI-36 · Đóng góp theo người / theo đợt

- Nhóm theo chuyên gia và đợt; hiện ai nhập, ai thực hiện, nội dung, thời điểm, trạng thái xác nhận.
- Người bảo trì có thể gửi xác nhận cuối đợt; không gửi cho từng dòng bắt buộc.
- Chuyên gia xác nhận đúng hoặc chỉ ra phần cần sửa.
- Nội dung sửa làm đổi ý nghĩa: xác nhận lại phần liên quan. Không đặt lại phần không đổi.
- Nhật ký đã lưu dù chưa xác nhận; báo cáo/tái sử dụng phải kiểm tra trạng thái này.

### Thứ tự tương tác

| Bước | Từ → đến | Nội dung | Điều kiện / ngữ cảnh |
| --- | --- | --- | --- |
| **Giai đoạn** | — | **1. Người bảo trì ghi nhanh trong lúc phối hợp** | — |
| SQ16.01 | Người bảo trì → Giao diện web | Chọn loại và ghi vài dòng tại mốc quan trọng | Luồng chung |
| SQ16.02 | Giao diện web → Giao diện web | Giữ nội dung đang gõ; mở trường theo loại ghi nhận | Luồng chung |
| SQ16.03 | Người bảo trì → Giao diện web | Xác nhận người thực hiện, thời điểm và kết quả nếu có | Luồng chung |
| SQ16.04 | Giao diện web → Nghiệp vụ / phân quyền | Lưu caseId, roundId, loại, nội dung, người ghi/người làm, kết quả và thời điểm | Luồng chung |
| SQ16.05 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Thêm eventId; lưu revision và trạng thái chưa/đã xác nhận theo quyền | Luồng chung |
| SQ16.06 | Dữ liệu nghiệp vụ<br>& nhật ký → Nghiệp vụ / phân quyền | Ghi nhận đã lưu | Luồng chung |
| SQ16.07 | Nghiệp vụ / phân quyền → Giao diện web | Dòng thời gian mới, người thực hiện và trạng thái | Luồng chung |
| SQ16.08 | Giao diện web → Người bảo trì | Đã lưu ghi nhận; mở ô trống cho lần ghi tiếp theo | Luồng chung |
| Ghi chú | — | Không ép ghi liên tục. Người dùng ghi bù sau mốc công việc, giữ rõ thời điểm thực tế khác thời điểm nhập. Không yêu cầu tách hồ sơ hoặc viết báo cáo mới. | opt: Người bảo trì đang phải hỗ trợ thao tác |
| SQ16.09 | Nghiệp vụ / phân quyền → AI / RAG | Đọc ghi nhận được phép; kiểm tra mục cần hỏi thêm | opt: AI phát hiện thiếu căn cứ ở một quyết định quan trọng |
| SQ16.10 | AI / RAG → Nghiệp vụ / phân quyền | Câu hỏi gợi ý, không bổ sung dữ kiện thay người dùng | opt: AI phát hiện thiếu căn cứ ở một quyết định quan trọng |
| SQ16.11 | Nghiệp vụ / phân quyền → Giao diện web | Gợi ý ngắn: Vì sao chọn bước này? Kết quả nào làm đổi hướng? | opt: AI phát hiện thiếu căn cứ ở một quyết định quan trọng |
| SQ16.12 | Người bảo trì → Giao diện web | Ghi giải thích được chuyên gia cung cấp | opt: AI phát hiện thiếu căn cứ ở một quyết định quan trọng / alt: Có thông tin để bổ sung |
| SQ16.13 | Giao diện web → Nghiệp vụ / phân quyền | Bổ sung ghi nhận, giữ nguồn và người phát biểu | opt: AI phát hiện thiếu căn cứ ở một quyết định quan trọng / alt: Có thông tin để bổ sung |
| SQ16.14 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu revision, không tự coi đã được chuyên gia xác nhận | opt: AI phát hiện thiếu căn cứ ở một quyết định quan trọng / alt: Có thông tin để bổ sung |
| SQ16.15 | Giao diện web → Người bảo trì | Cho bỏ qua / ghi chưa xác định; không chặn lưu sự kiện thực tế | opt: AI phát hiện thiếu căn cứ ở một quyết định quan trọng / alt: Chưa biết hoặc đang bận |
| SQ16.16 | Chuyên gia → Web của chuyên gia | Nhập nhận định hoặc bổ sung phần mình thực hiện | opt: Chuyên gia muốn ghi trực tiếp |
| SQ16.17 | Web của chuyên gia → Nghiệp vụ / phân quyền | Lưu ghi nhận bằng tài khoản chuyên gia | opt: Chuyên gia muốn ghi trực tiếp |
| SQ16.18 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu người ghi/thực hiện và revision | opt: Chuyên gia muốn ghi trực tiếp |
| SQ16.19 | Nghiệp vụ / phân quyền → Giao diện web | Người bảo trì thấy ghi nhận mới trong cùng dòng thời gian | opt: Chuyên gia muốn ghi trực tiếp |
| **Giai đoạn** | — | **2. Nhóm ghi nhận và xác nhận khi thuận tiện** | — |
| SQ16.20 | Giao diện web → Người bảo trì | Giữ phần ghi hộ ở Chờ xác nhận; tiếp tục công việc | alt: Chưa cần xác nhận trong lúc làm |
| SQ16.21 | Người bảo trì → Giao diện web | Chọn nhóm đóng góp trong đợt; nhấn Gửi xác nhận | alt: Gửi nhóm đóng góp để chuyên gia xác nhận |
| SQ16.22 | Giao diện web → Nghiệp vụ / phân quyền | Tạo yêu cầu gắn các eventId và revision | alt: Gửi nhóm đóng góp để chuyên gia xác nhận |
| SQ16.23 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu phạm vi xác nhận, người nhận và trạng thái | alt: Gửi nhóm đóng góp để chuyên gia xác nhận |
| SQ16.24 | Nghiệp vụ / phân quyền → Web của chuyên gia | Hiện nhóm đóng góp cần xác nhận | alt: Gửi nhóm đóng góp để chuyên gia xác nhận |
| SQ16.25 | Chuyên gia → Web của chuyên gia | Đọc ghi nhận và bối cảnh | alt: Gửi nhóm đóng góp để chuyên gia xác nhận |
| SQ16.26 | Chuyên gia → Web của chuyên gia | Nhấn Xác nhận nhóm | alt: Gửi nhóm đóng góp để chuyên gia xác nhận / alt: Nội dung đúng |
| SQ16.27 | Web của chuyên gia → Nghiệp vụ / phân quyền | Xác nhận đúng phiên bản nội dung | alt: Gửi nhóm đóng góp để chuyên gia xác nhận / alt: Nội dung đúng |
| SQ16.28 | Nghiệp vụ / phân quyền → Dữ liệu nghiệp vụ<br>& nhật ký | Lưu người xác nhận, nội dung và thời điểm | alt: Gửi nhóm đóng góp để chuyên gia xác nhận / alt: Nội dung đúng |
| SQ16.29 | Nghiệp vụ / phân quyền → Giao diện web | Hiện Đã xác nhận; có thể dùng lại ở báo cáo nếu nội dung không đổi | alt: Gửi nhóm đóng góp để chuyên gia xác nhận / alt: Nội dung đúng |
| SQ16.30 | Chuyên gia → Web của chuyên gia | Chỉ ra mục chưa đúng hoặc lưu để xem sau | alt: Gửi nhóm đóng góp để chuyên gia xác nhận / alt: Cần sửa / chưa xác nhận |
| SQ16.31 | Web của chuyên gia → Nghiệp vụ / phân quyền | Lưu phản hồi; chưa xác nhận phần còn vấn đề | alt: Gửi nhóm đóng góp để chuyên gia xác nhận / alt: Cần sửa / chưa xác nhận |
| SQ16.32 | Nghiệp vụ / phân quyền → Giao diện web | Hiện phần cần xem lại; giữ nguyên lịch sử đã ghi | alt: Gửi nhóm đóng góp để chuyên gia xác nhận / alt: Cần sửa / chưa xác nhận |
| ref | [SQ12](#sq12) | Chỉ chạy phần soạn/xem nháp; quay lại cùng đợt, chưa chốt báo cáo | opt: Muốn xem báo cáo khi công việc chưa kết thúc; quay lại khi có kết quả phù hợp. |
| Ghi chú | — | Nhật ký thất bại mô tả đúng điều đã quan sát: sau bước X hiện tượng vẫn còn. Không tự kết luận X vô dụng trong mọi bối cảnh hoặc nguyên nhân Y đã bị loại trừ. | — |

