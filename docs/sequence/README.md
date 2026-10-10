# Sequence DENSO — luồng tối ưu đã chốt

File hiện hành: **`denso-maintenance-sequences.drawio`** ở thư mục gốc. File có **17 trang**: trang 00 điều hướng và SQ01–SQ16. Mỗi sequence đọc từ trên xuống; khung bên phải là đặc tả giao diện.

## Tài liệu dùng cùng sơ đồ

- [Luồng tối ưu, biểu mẫu, dữ liệu và trạng thái](optimized-flow-contract.md): quy tắc đã chốt sau Q&A nhà máy.
- [Toàn bộ thao tác, phản hồi và thông báo UI](prototype-spec.md): cùng nguồn dữ liệu với sequence; mã SQxx.nn để tra chéo.
- [Ánh xạ BPMN → sequence](source-map.json): ID nguồn, trang sử dụng và hash của bản BPMN.
- [Bản đồ SVG](00-map.svg): xem nhanh các tình huống.

## Các trang

| Trang | Nội dung |
| --- | --- |
| [SQ01](SQ01.svg) | Đăng nhập, quyền và dashboard theo vai trò |
| [SQ02](SQ02.svg) | Nhập/dán tri thức, AI cấu trúc, chuyên gia kiểm tra; biểu mẫu có điều kiện/model sản phẩm/5M1E |
| [SQ03](SQ03.svg) | Đối chiếu, chuyên gia nhấn hủy trùng, cập nhật hoặc tạo mới |
| [SQ04](SQ04.svg) | Gửi đề xuất kiểm duyệt, dùng chung hai luồng |
| [SQ05](SQ05.svg) | Chuyên gia trưởng đọc nguồn và ra quyết định độc lập |
| [SQ06](SQ06.svg) | Xử lý phản hồi, đối chiếu và gửi lại |
| [SQ07](SQ07.svg) | Xuất bản/duyệt liên kết; tách đã duyệt với sẵn sàng tra cứu |
| [SQ08](SQ08.svg) | Mở/tiếp tục hồ sơ, HozenDX, PM có lịch tích hợp hoặc checklist cấu hình |
| [SQ09](SQ09.svg) | RAG so hiện tượng, điều kiện, kiểm tra và điểm thay đổi; người dùng quyết định |
| [SQ10](SQ10.svg) | Yêu cầu chuyên gia; người bảo trì vẫn hỗ trợ, ghi nhận và phụ trách hồ sơ |
| [SQ11](SQ11.svg) | Nhiều đợt, checklist PM, kết quả thực tế, AI tóm tắt và bàn giao |
| [SQ12](SQ12.svg) | AI soạn báo cáo từ mọi đợt; xác nhận nhóm đóng góp; ba trạng thái riêng; đồng bộ có điều kiện |
| [SQ13](SQ13.svg) | Chọn bài học từ cả bước chưa hiệu quả; liên kết/cập nhật/mới đều giữ bằng chứng và đi duyệt |
| [SQ14](SQ14.svg) | Đọc nguồn đúng phiên bản; ghi phản hồi trong hồ sơ |
| [SQ15](SQ15.svg) | Lưu lỗi, phiên hết hạn, sửa đồng thời, AI đến muộn và chống gửi lặp |
| [SQ16](SQ16.svg) | Mẫu ghi nhanh theo mốc; người nhập khác người thực hiện; xác nhận nhóm đóng góp |

## Cách đọc và dựng prototype

- Ba vai trò chính: Người bảo trì, Chuyên gia, Chuyên gia trưởng. Các cột UI, dữ liệu, AI và HozenDX là thành phần logic, không phải vai trò người dùng mới.
- Người bảo trì có thể ghi hộ trong lúc phối hợp nhưng không xác nhận thay chuyên gia. Chuyên gia có thể bổ sung trực tiếp hoặc xác nhận theo nhóm khi thuận tiện.
- Xác nhận đóng góp/báo cáo khác với chuyên gia trưởng duyệt tri thức. Người duyệt phải đúng phạm vi và độc lập với người tạo/cùng xây dựng đề xuất.
- `UI-xx` là vùng hoặc trạng thái; không cần tạo 39 trang web. Hồ sơ giữ chung thẻ máy, đợt hiện tại, timeline và vùng ghi nhanh.
- Một `caseId`, nhiều `roundId`, các `eventId` và một `reportId` có revision. Kết thúc phiên/đợt không đồng nghĩa kết thúc công việc hoặc sửa thành công.
- `ref` có thể gọi phần được chỉ rõ của trang khác. Ví dụ SQ16 gọi SQ12 chỉ để xem nháp, rồi quay về cùng đợt; không chốt báo cáo.
- Nháp báo cáo giữ cả bước chưa hiệu quả; AI không tự kết luận nguyên nhân. Kết thúc chưa khắc phục theo quyết định đúng quyền phải ghi đúng kết quả.
- Hồ sơ chỉ còn báo cáo chờ xác nhận mở lại vào bước xác nhận; không yêu cầu làm công việc lại.
- HozenDX được mô tả theo dữ liệu Q&A xác nhận. API/lịch PM/phân công/quyền ghi/tức thời là điều kiện cần cấu hình; demo ghi rõ dữ liệu mô phỏng.

Ký hiệu theo phần Interactions của [UML 2.5.1 — OMG](https://www.omg.org/spec/UML/2.5.1/About-UML): lifeline, thông điệp, `alt`, `opt`, `loop`, `break`, `ref`. Nét liền đầu kín là yêu cầu, nét đứt đầu mở là phản hồi, nét liền đầu mở là sự kiện/thông báo. Trao đổi trực tiếp giữa chuyên gia và người bảo trì được vẽ giữa hai actor, không giả định ghi âm tự động.

## Tình huống demo cần chuẩn bị

1. Tri thức mới và tri thức trùng phải được chuyên gia chủ động hủy.
2. PM có công việc tích hợp và PM chỉ có mẫu cấu hình; kết quả thực tế chưa được điền trước.
3. PM phát hiện bất thường rồi điều tra với liên kết hạng mục gốc.
4. Nhiều đợt chưa khắc phục, bàn giao, tiếp tục đúng hồ sơ; vẫn giữ tất cả lần thử.
5. Chuyên gia thao tác, người bảo trì ghi nhanh; chuyên gia xác nhận theo nhóm ở cuối đợt.
6. Xem nháp AI trong lúc làm rồi trở lại cùng đợt; không tạo thêm báo cáo cuối.
7. Máy phục hồi nhưng báo cáo chờ xác nhận; tái dùng xác nhận phần không đổi.
8. Kết thúc chưa khắc phục có quyết định phù hợp và trường hợp không đủ quyền phải giữ mở.
9. Báo cáo đã lưu nhưng đồng bộ HozenDX lỗi; giữ hàng chờ thử lại và trạng thái thực tế.
10. Đề xuất từ bài học chưa hiệu quả bị trả bổ sung/từ chối; lịch sử công việc luôn còn.

Đây là tình huống để dựng demo, không phải kết quả kiểm thử ứng dụng hiện có.

## Nguồn và tạo lại

```sh
node scripts/build-optimized-workflows.cjs
node scripts/build-sequences.cjs
```

- `scripts/sequence-content.cjs`: các luồng dùng chung và nội dung nền.
- `scripts/sequence-optimized.cjs`: SQ08/SQ10/SQ11/SQ12 được viết lại và SQ16 được thêm cho luồng đã chốt.
- `scripts/build-sequences.cjs`: renderer, xuất draw.io/SVG/Markdown và ánh xạ BPMN.
- Các trang không đổi nghiệp vụ được giữ từ bản trước chỉnh sửa để bảo toàn chỉnh tay. Bản lưu nằm trong `docs/diagram-archive/2026-10-08-before-optimization/`.

Nếu thay đổi nội dung một trang đang được giữ nguyên, cập nhật nội dung nguồn và bỏ ID đó khỏi danh sách `preserve` của builder trước khi xuất lại. Nếu sửa tay layout, lưu thay đổi tương ứng trước khi chạy lại lệnh.
