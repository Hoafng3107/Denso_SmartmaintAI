# Luồng tối ưu đã chốt — 08/10/2026

Tài liệu này cùng BPMN và sequence là cơ sở dựng prototype. Người dùng đã chấp nhận đề xuất sau khi bổ sung **Hỏi đáp với nhà máy denso.docx**. Đây là thiết kế nghiệp vụ; chưa phải chức năng đã triển khai hay API HozenDX đã được xác minh.

## 1. Căn cứ từ nhà máy

| Phản hồi | Áp dụng vào thiết kế |
| --- | --- |
| HozenDX/AIHO có lý lịch, cấu trúc/linh kiện, chế độ bảo dưỡng, BM, nội dung sửa chữa, kết quả PM, SOP/DAS, bản vẽ, cải tạo và tồn kho | Điền dữ liệu nền có sẵn và cung cấp hồ sơ tham chiếu; ghi nguồn và thời điểm |
| Ghi nhận trong quá trình xử lý: chọn 1-B | Mẫu ngắn kết hợp ô nội dung; trường mở theo loại ghi nhận, không ép nhập tất cả |
| AI hỗ trợ: chọn 2-E, kết hợp A/B/C | Tìm nguồn, tổng hợp và gợi ý kiểm tra tiếp theo; con người xác nhận quyết định |
| Tri thức sau xử lý: chọn 3-B | Nhật ký lưu ngay, tri thức hướng dẫn chính thức cần xác nhận/kiểm duyệt |
| Ưu tiên knowledge đã tích lũy, huấn luyện thêm là hướng mở | Prototype dùng RAG/kết quả mô phỏng có nguồn; không tự huấn luyện từ ghi chú chưa duyệt |

Q&A chưa xác nhận API, lịch/phân công PM, quyền ghi lịch sử hoặc trạng thái máy tức thời. Các nhánh tích hợp có điều kiện tương ứng. Q&A cũng chưa xác định chức danh người duyệt; ba vai trò và quy tắc duyệt độc lập là thiết kế đã được người dùng chốt.

## 2. Một hồ sơ, nhiều đợt, một báo cáo tổng kết có phiên bản

```text
Máy (assetId)
└─ Hồ sơ công việc BM hoặc PM (caseId)
   ├─ Đợt 1 (roundId): các ghi nhận, kết quả, tóm tắt đợt
   ├─ Đợt 2 (roundId): các ghi nhận, người tham gia, việc chờ
   ├─ Đợt tiếp theo: tiếp tục cùng hồ sơ và giữ lịch sử
   └─ Báo cáo tổng kết (reportId)
      ├─ Nháp/revision dựa trên ảnh chụp nhật ký
      └─ Bản đã xác nhận + các bản đính chính nếu có
```

- **Hồ sơ** là công việc/sự cố xuyên suốt, có thể kéo dài qua nhiều ca làm việc. Thuật ngữ “ca” trong những trang cũ được hiểu là hồ sơ này khi có `caseId`.
- **Đợt xử lý** là một giai đoạn làm việc có bắt đầu và kết quả/bàn giao. Gọi chuyên gia, thêm ghi chú hoặc tải lại trang không mặc nhiên tạo đợt mới.
- **Ghi nhận** có `eventId`, loại, nội dung, người nhập, người thực hiện, thời điểm thực tế và thời điểm nhập. Sửa phải giữ dấu vết.
- **Tóm tắt đợt** gắn với `roundId`, phục vụ tiếp tục/bàn giao. Không biến mỗi lần thử chưa hiệu quả thành một case hay báo cáo cuối độc lập.
- **Báo cáo tổng kết** dùng cùng `reportId`. AI tạo gợi ý theo snapshot nguồn; người dùng lựa chọn phần áp dụng. Không ghi đè bản sửa của con người hoặc bản đã xác nhận.

## 3. Hai lối vào BM/PM

### BM

Mở thông tin sự cố được tích hợp, hoặc chọn/quét mã máy → lấy dữ liệu nền → xác nhận đúng máy → ghi dấu hiệu/điều kiện/5M1E → điều tra. Chỉ dùng mã Alarm, mã sự cố hoặc tình trạng tự động khi nguồn thật sự cung cấp.

### PM

- Có công việc/lịch/checklist từ tích hợp: mở việc đã có, giữ ID/phiên bản nguồn và chỉ nhập kết quả thực tế.
- Chỉ có chế độ/tiêu chuẩn bảo dưỡng: chọn mẫu PM đã cấu hình phù hợp máy. Người bảo trì không tự soạn checklist tại hiện trường.
- Mỗi hạng mục: số đo + đơn vị khi cần, Đạt/Không đạt/Chưa thực hiện, bất thường và người/thời gian thực hiện.
- Phát hiện bất thường: mở mục điều tra gắn hạng mục PM trong cùng hồ sơ. Nếu là công việc độc lập cần tách, ghi lý do và liên kết hai hồ sơ; không bỏ checklist gốc.

Mở lại hồ sơ có công việc đã kết thúc và chỉ chờ báo cáo thì vào thẳng bước xác nhận, không tạo thêm đợt hay yêu cầu sửa máy lại.

## 4. Biểu mẫu theo giai đoạn

| Giai đoạn | Trường cần có | Nguồn / điều kiện |
| --- | --- | --- |
| Nhận diện máy | Mã/tên, maker, model máy, năm, thông số, line/khu vực | Điền trước từ dữ liệu được cấp; người dùng xác nhận máy |
| Công việc | BM/PM, mã việc ngoài nếu có, nội dung, người phụ trách, thời gian, lý do mở mới khi đã có hồ sơ | Từ tích hợp hoặc chọn theo quyền |
| Dấu hiệu | Hiện tượng, Alarm, bộ phận/vị trí, thời điểm/tần suất | Từ nguồn nếu có; xác nhận quan sát thực tế |
| Điều kiện | Chế độ, model sản phẩm, tốc độ, line, ca, nhiệt độ/độ ẩm/nguồn điện/khí nén liên quan | Chỉ nhập/xác minh phần cần cho bối cảnh; model sản phẩm khác model máy |
| Điểm thay đổi 5M1E | Con người, Máy, Vật liệu/sản phẩm, Phương pháp, Đo lường/kiểm tra, Môi trường | Mỗi nhóm: Có thay đổi / Chưa ghi nhận / Chưa kiểm tra; chi tiết chỉ khi liên quan |
| Ghi nhận nhanh | Loại + nội dung + người làm; số đo/kết quả/lý do quyết định tùy loại | Người nhập tự lấy từ tài khoản; người thực hiện hiển thị riêng |
| Nhận định chuyên gia | Giả thuyết, căn cứ, lý do kiểm tra trước/đổi hướng, điều chưa rõ | Người bảo trì ghi hoặc chuyên gia bổ sung; cần xác nhận đúng nội dung |
| Kết quả công việc | Đạt/chưa đạt/chưa đủ kiểm chứng, tiêu chí/số đo, tình trạng máy, việc còn lại | Từ kiểm tra thực tế, không suy ra từ kế hoạch |
| Báo cáo | Mọi đợt và lần thử, kết quả, nguyên nhân xác nhận/chưa xác định, bài học, giới hạn, đóng góp | AI điền từ dữ kiện; người tham gia xác nhận |
| Tri thức tái dùng | Bối cảnh, bằng chứng, cách kiểm tra/xử lý, kết quả, điều kiện/giới hạn/an toàn, tác giả, nguồn | Đối chiếu, xác nhận đề xuất rồi kiểm duyệt độc lập |

Lý lịch máy và tài liệu tham chiếu hiển thị ở panel, không chiếm toàn bộ biểu mẫu phải nhập. Dữ liệu gốc và quan sát hiện trường được lưu riêng; khác nhau phải hiện để xác minh.

## 5. Khi chuyên gia đang xử lý

Người bảo trì vẫn là chủ hồ sơ: bàn giao dữ kiện, hỗ trợ theo phân công, ghi theo mốc và kiểm tra báo cáo. Chuyên gia điều tra/xử lý, giải thích quyết định và xác nhận phần mình.

Ghi ở các mốc phát hiện, quyết định, kiểm tra có kết quả, kết thúc/bàn giao. Có thể ghi bù sau khi hỗ trợ thao tác; giữ `performedAt` khác `recordedAt`. Người dùng gõ/dán, MVP không có ghi âm/chép lời tự động.

Mẫu ngắn có 5 loại: Quan sát / Kiểm tra / Nhận định / Thao tác / Kết quả. Mọi loại đều có nội dung và người thực hiện phù hợp; chỉ mở số đo, kết quả hay câu hỏi “vì sao” khi liên quan. AI hỏi bổ sung có chọn lọc, không chặn lưu vì chưa biết nguyên nhân.

Xác nhận theo nhóm đóng góp của một người/đợt; không bắt chuyên gia duyệt từng dòng. Bản ghi hộ chưa được xác nhận phải có nhãn. Xác nhận còn hiệu lực được dùng lại trong báo cáo; chỉ nội dung bị thay đổi về ý nghĩa mới cần xác nhận lại. Người bảo trì không xác nhận thay tài khoản chuyên gia.

## 6. Kết quả đợt và các trạng thái độc lập

| Đối tượng | Trạng thái / dữ liệu |
| --- | --- |
| Máy — `machineState` | Đã phục hồi / chưa phục hồi / chưa đủ kiểm chứng, căn cứ và thời điểm quan sát; không đồng nhất với dữ liệu HozenDX cũ |
| Công việc — `workState` | Đang điều tra/xử lý; chờ linh kiện/hỗ trợ/bàn giao; kết thúc công việc kèm kết quả |
| Đợt — `roundState` | Đang làm / đã kết thúc đợt; kết quả, tóm tắt và việc tiếp theo |
| Báo cáo — `reportState` | Nháp / Chờ xác nhận / Cần sửa / Đã xác nhận |
| Đồng bộ — `syncState` | Chưa cấu hình / chờ / đang đồng bộ / đã đồng bộ / lỗi chờ thử lại |
| Tri thức | Nháp đề xuất / chờ duyệt / cần bổ sung / từ chối / đã duyệt, tách trạng thái sẵn sàng tra cứu |

Ví dụ hợp lệ: máy đã phục hồi, công việc đã kết thúc, báo cáo chờ chuyên gia xác nhận. Việc xác nhận chưa xong không đổi máy trở lại trạng thái hỏng và không yêu cầu thao tác sửa chữa lại.

- Chưa xong: AI tóm tắt đợt, người bảo trì kiểm tra rồi điều tra tiếp hoặc bàn giao. Khi tiếp tục: cùng `caseId`, `roundId` mới nếu bắt đầu đợt mới.
- Đạt tiêu chí: ghi kết thúc công việc và chuyển báo cáo.
- Chưa khắc phục nhưng có quyết định kết thúc/chuyển đơn vị/thay thiết bị phù hợp quyền nhà máy: được tổng kết với đúng kết quả và lý do. Không gán kết quả “sửa thành công”.
- Chỉ chờ linh kiện hoặc hỗ trợ: giữ hồ sơ mở, không đóng để làm đẹp trạng thái.

## 7. AI tổng hợp và tích lũy tri thức

AI dùng toàn bộ nhật ký, checklist, đóng góp và nguồn đã lưu. Nháp phải giữ cả các lần thử chưa hiệu quả, phần còn giả thuyết và việc tương lai. Máy chạy lại không chứng minh nguyên nhân gốc; “sau bước X lỗi vẫn còn” không chứng minh X luôn vô dụng hoặc nguyên nhân Y đã bị loại trừ.

Có thể xem nháp trong lúc làm, không đóng đợt. Chốt báo cáo cần kết quả công việc phù hợp, dữ kiện bắt buộc và các xác nhận đúng phiên bản. Nếu chưa phản hồi, lưu chờ và thoát; mở lại vào đúng bước xác nhận.

Sau báo cáo đã xác nhận: chọn chỉ lưu lịch sử, liên kết, cập nhật hoặc case tri thức mới. Bài học từ các lần chưa hiệu quả phải giữ phạm vi bằng chứng và được duyệt trước khi trở thành hướng dẫn. RAG hiện tại ưu tiên nguồn đã duyệt; hồ sơ thô từ HozenDX chưa mặc nhiên là know-how đã duyệt.

## 8. HozenDX và đồng bộ

Đọc: chỉ lấy những trường được API/quyền thực sự cung cấp; hiện nguồn, phiên bản và thời điểm. Lỗi đọc: dùng bản đã có nếu đủ để xác minh, hoặc dừng xác minh máy; không báo giả đồng bộ thành công.

Ghi: chỉ thực hiện khi có API/quyền ghi được cấu hình. Đồng bộ dùng ID nguồn và mã thao tác để tránh nhân đôi. Lỗi đồng bộ giữ hàng chờ thử lại; báo cáo đã lưu tại hệ thống vẫn còn và trạng thái thực tế không bị đảo ngược.

Trong demo, các nhánh này dùng dữ liệu mô phỏng được ghi nhãn. Hai nguồn đóng góp của người dùng vẫn là tri thức chuyên gia và case công việc; tích hợp cung cấp ngữ cảnh và hồ sơ tham chiếu.

## 9. Các trang cần dùng khi dựng prototype

| Công việc | BPMN | Sequence / UI |
| --- | --- | --- |
| Nhập tri thức chủ động | 01 | SQ02–SQ07; UI-05 có điều kiện và 5M1E |
| Theo dõi toàn bộ hồ sơ | 02 | SQ08–SQ13 |
| HozenDX và lối vào BM/PM | 03 | SQ08; UI-16, UI-17, UI-39 |
| RAG và lựa chọn | 02/04 | SQ09; UI-18, UI-19 |
| Chuyên gia tham gia | 04 | SQ10; UI-20, UI-21 |
| Ghi nhanh và xác nhận nhóm | 04 | SQ16; UI-35, UI-36 |
| Đợt, PM, kết quả và bàn giao | 02/04 | SQ11; UI-22, UI-23, UI-37 |
| Nháp/báo cáo và đồng bộ | 05 | SQ12; UI-24, UI-25, UI-38 |
| Bài học từ toàn bộ các đợt | 02 | SQ13; UI-26, UI-27 |

`UI-xx` là vùng hoặc trạng thái giao diện, không bắt buộc tương ứng một trang web riêng. Hồ sơ nên giữ chung thẻ máy, đợt hiện tại, timeline và vùng ghi nhanh để giảm chuyển màn hình.
