# Kịch bản trình bày tương tác

## Mở đầu

Người dẫn giới thiệu: “Prototype mô phỏng cách đội bảo trì lưu lại kinh nghiệm trong chính lúc xử lý công việc. Ta sẽ bắt đầu ở vai trò người bảo trì. Người xem chọn loại công việc và quyết định xử lý; hồ sơ, người tham gia và các mốc thực hiện được giữ xuyên suốt khi chuyển vai trò.”

Giới hạn demo: HozenDX chỉ là nguồn đọc mô phỏng. AI chưa kết nối mô hình; nội dung hiển thị là dữ liệu dựng sẵn. Hướng dẫn an toàn thực tế phải đến từ quy trình nhà máy đã được phê duyệt.

## Luồng lựa chọn

```text
Người bảo trì bắt đầu hồ sơ
├─ BM · sự cố
│  └─ Bối cảnh → tra cứu case/tri thức đã duyệt
│     ├─ Tự xử lý ──────────────────────────────┐
│     └─ Gọi chuyên gia                        │
│        ├─ Chưa thể hỗ trợ → thông báo BT     │
│        └─ Nhận ca → chuyên gia đến hiện trường│
│           └─ BT ghi nhanh thao tác chuyên gia │
└─ PM · định kỳ                                  │
   └─ Checklist theo máy                         │
      ├─ Đạt → lưu kết quả PM                    │
      └─ Bất thường → tra cứu như ca BM ─────────┘
                                                 ↓
                                   BT kiểm tra kết quả đợt
                                   ├─ Đạt → tổng kết
                                   ├─ Chưa đạt → đợt mới cùng hồ sơ
                                   └─ Chờ linh kiện → hồ sơ vẫn mở
                                                 ↓
                                Báo cáo → đề xuất bài học (tuỳ chọn)
                                                 ↓
                                 Chuyên gia trưởng kiểm duyệt
                           ├─ Phê duyệt ├─ Bổ sung └─ Từ chối
```

## Nhịp demo theo màn hình

1. **Chọn công việc:** chọn BM hoặc PM. Kịch bản tạo hồ sơ mới trong bộ dữ liệu cô lập và hiển thị case ID.
2. **BM:** xem bối cảnh và thông tin máy; có thể mở tab bối cảnh hoặc sang tra cứu theo case.
3. **PM:** mở checklist theo máy. Người xem chọn không có bất thường hoặc phát hiện bất thường. Nhánh bất thường giữ checklist và đi tiếp qua luồng tra cứu BM.
4. **Tra cứu:** hiển thị các nguồn mô phỏng đã duyệt và phần tóm tắt hỗ trợ quyết định. Giải thích rằng mức phù hợp không phải phần trăm chắc chắn thành công.
5. **Tự xử lý hoặc yêu cầu chuyên gia:** nếu gọi chuyên gia, cùng một case chuyển sang tài khoản chuyên gia. Chuyên gia bắt đầu tham gia và hệ thống giữ người phụ trách là người bảo trì.
6. **Ghi trong lúc làm:** nhập ghi chú trực tiếp trong bảng kịch bản. Khi lưu, nhật ký ghi người nhập là người bảo trì, người thực hiện là chuyên gia. Chuyển về người bảo trì sẽ tạo thông báo bàn giao.
7. **Chọn kết quả:** có thể đã khắc phục, chưa khắc phục hoặc chờ linh kiện. Nhánh chưa khắc phục giữ nguyên đợt cũ rồi tạo đợt mới; nhánh chờ linh kiện giữ hồ sơ mở và cho phép tiếp tục.
8. **Báo cáo và tri thức:** người phụ trách có thể xem trang báo cáo, chọn đề xuất bài học hoặc chỉ giữ lịch sử công việc.
9. **Chuyên gia trưởng:** xem hàng đợi đề xuất. Phê duyệt, yêu cầu bổ sung hoặc từ chối đều lưu quyết định; không xóa hồ sơ bảo trì gốc.

## Kịch bản mẫu gợi ý

### Nhánh A · BM, gọi chuyên gia, khắc phục

Chọn BM → tra cứu → yêu cầu chuyên gia → chuyên gia nhận và tham gia → người bảo trì ghi nhật ký chuyên gia → mở thông báo bàn giao → ghi kết quả đã khắc phục → xem báo cáo → đề xuất bài học → chuyên gia trưởng phê duyệt.

### Nhánh B · PM có bất thường, xử lý nhiều đợt

Chọn PM → xem checklist → đánh dấu một bất thường → tra cứu → tự kiểm tra → chọn chờ linh kiện → xem hồ sơ vẫn mở → tiếp tục đợt mới cùng case ID.

### Nhánh C · BM, chuyên gia chưa thể hỗ trợ

Chọn BM → tra cứu → yêu cầu chuyên gia → chọn chưa thể hỗ trợ → đăng nhập lại như người bảo trì để xem thông báo và chọn phương án tiếp theo.

## Trạng thái dữ liệu

Kịch bản dùng bản sao dữ liệu seed trong bộ nhớ. Các nhánh cập nhật đối tượng case, rounds, events, support, notifications và proposals để giao diện nghiệp vụ đọc được. Khi thoát, prototype trả lại database, tài khoản, route và URL ban đầu; không ghi dữ liệu nhánh vào trình duyệt.
