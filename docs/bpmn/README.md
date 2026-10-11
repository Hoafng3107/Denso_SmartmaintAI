# BPMN DENSO — luồng tối ưu đã chốt

File hiện hành: **`denso-maintenance-workflows-BPMN.drawio`** ở thư mục gốc. Mở bằng draw.io/diagrams.net. Luồng chính từ trái sang phải, phân lane theo ba vai trò và các hệ thống tham gia.

## Năm trang

| Trang | Nội dung | SVG |
| --- | --- | --- |
| 01 | Tri thức chuyên gia: nhập/dán, AI cấu trúc, đối chiếu, chuyên gia hủy trùng hoặc gửi mới/cập nhật, kiểm duyệt | [Xem](knowledge-flow.svg) |
| 02 | Tổng quan hồ sơ BM/PM: một hồ sơ nhiều đợt, ghi nhanh, báo cáo, tri thức tái dùng | [Xem](repair-flow.svg) |
| 03 | Mở/tiếp tục hồ sơ, điền sẵn HozenDX, PM có lịch tích hợp hoặc mẫu đã cấu hình | [Xem](work-entry.svg) |
| 04 | Phối hợp chuyên gia, người bảo trì ghi nhanh, kết quả từng đợt và bước tiếp theo | [Xem](work-round.svg) |
| 05 | AI tổng kết mọi đợt, xác nhận đóng góp, lưu báo cáo và đồng bộ có điều kiện | [Xem](work-report.svg) |

Tác vụ có dấu **[+]** là quy trình con thu gọn; bấm tác vụ để mở trang chi tiết. Kết thúc ở trang con trả kết quả cho trang 02, không mặc nhiên đóng hồ sơ. Trang 02 kiểm tra riêng kết quả đợt và trạng thái xác nhận báo cáo.

## Các thay đổi đã chốt ngày 08/10/2026

- Một `caseId` qua nhiều `roundId`; giữ từng ghi nhận và các lần thử chưa hiệu quả.
- Người bảo trì phụ trách hồ sơ, hỗ trợ và ghi nhanh trong lúc chuyên gia xử lý. Lưu riêng người ghi/người thực hiện; chuyên gia xác nhận nhóm đóng góp.
- Mẫu ngắn có loại/nội dung, người làm và các trường kết quả/lý do/số đo khi liên quan. Bổ sung model sản phẩm, điều kiện phát sinh và 5M1E.
- AI tạo tóm tắt đợt để bàn giao và nháp báo cáo tổng kết từ nhật ký; người dùng kiểm tra, không phải viết lại cuối ca.
- Tách tình trạng máy, tiến độ công việc, trạng thái báo cáo. Hồ sơ chỉ chờ xác nhận báo cáo mở lại thẳng bước đó.
- Chưa đủ điều kiện: chọn điều tra tiếp/gọi hỗ trợ hoặc bàn giao. Kết thúc chưa khắc phục cần quyết định đúng thẩm quyền và lý do; chờ linh kiện/hỗ trợ thông thường vẫn để mở.
- HozenDX điền những dữ liệu được cung cấp. Lịch PM/API/trạng thái tức thời/quyền ghi chưa được Q&A xác nhận, được thể hiện dưới dạng điều kiện tích hợp.
- Hai nguồn đóng góp vẫn là tri thức chuyên gia và case. Nhật ký lưu ngay; tri thức tái dùng phải kiểm duyệt độc lập.

Chi tiết trường biểu mẫu, dữ liệu và trạng thái: [Đặc tả luồng tối ưu](../sequence/optimized-flow-contract.md). Tương tác UI: [Đặc tả sequence](../sequence/prototype-spec.md).

## Ký hiệu

Ký hiệu cốt lõi của [BPMN 2.0 — OMG](https://www.omg.org/spec/BPMN/2.0/PDF): start/end, task, exclusive gateway (X), pool/lane, sequence flow và subprocess thu gọn (+). Giao nhau của đường nối không tạo nhánh; các gateway thể hiện lựa chọn. Đây là bản vẽ nghiệp vụ chỉnh sửa được, không phải file `.bpmn` để chạy engine.

## Xuất lại

```sh
node scripts/build-optimized-workflows.cjs
node scripts/build-sequences.cjs
```

Nguồn: `scripts/build-optimized-workflows.cjs` và renderer `scripts/bpmn-diagram.cjs`. Trang tri thức giữ nội dung, vị trí và thao tác hủy trùng từ bản BPMN người dùng hoàn thiện; các trang công việc được bố trí lại cho luồng tối ưu.

Bản trước chỉnh sửa nằm ở `docs/diagram-archive/2026-10-08-before-optimization/` và vẫn được giữ vì script tạo bản tối ưu dùng làm nguồn. Nếu chỉnh tay bản mới trong draw.io, cập nhật nguồn tương ứng trước khi chạy lệnh tạo lại để giữ thay đổi.
