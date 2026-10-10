// Interaction design derived from the user's final BPMN. UI details are proposals.
module.exports = ({Sequence}) => {
  const pages=[];
  const page=(id,title,actors,meta)=>{const s=new Sequence(id,title,actors,meta);pages.push(s);return s;};
  let s;

  s=page('SQ01','Đăng nhập và vào đúng không gian làm việc',['user','ui','svc','db'],{
    short:'Cổng chung, tài khoản cá nhân, quyền theo vai trò và phục hồi phiên.',
    pre:'Người dùng mở web trên laptop, tablet hoặc điện thoại; đây là phần mở rộng UI của điều kiện “sau đăng nhập” trong BPMN.',
    post:'Có phiên làm việc gắn nhân viên và quyền được cấp; hiển thị dashboard phù hợp.',bpmn:[],
  });
  s.phase('1. Đăng nhập bằng tài khoản cá nhân');
  s.ui('UI-01 · Cổng đăng nhập chung','Hiện: mã nhân viên, mật khẩu, nút hiện/ẩn mật khẩu, nút “Đăng nhập”.\nKhông cho chọn vai trò để tự cấp quyền.\nKhi gửi: hiện “Đang đăng nhập…”; khóa gửi lặp.\nLỗi tại ô: “Nhập mã nhân viên”, “Nhập mật khẩu”.');
  s.m('user','ui','Nhập mã nhân viên, mật khẩu; nhấn Đăng nhập');
  s.m('ui','ui','Kiểm tra các ô bắt buộc');
  s.alt([
    ['Thiếu thông tin',s=>{s.r('ui','user','Hiện lỗi tại ô; giữ mã nhân viên; dừng lần đăng nhập');s.stop('Ở lại cổng đăng nhập; lần thử tiếp theo bắt đầu lại SQ01.');}],
    ['Đã điền đủ',s=>{
      s.m('ui','svc','Yêu cầu xác thực tài khoản');s.m('svc','db','Tra tài khoản, trạng thái và quyền được cấp');s.r('db','svc','Kết quả đối chiếu; danh sách quyền');
      s.alt([
        ['Không xác thực được',s=>{s.r('svc','ui','Từ chối đăng nhập');s.r('ui','user','Mã nhân viên hoặc mật khẩu không đúng. Vui lòng thử lại.');s.stop('Không mở dashboard khi xác thực thất bại.');}],
        ['Tài khoản không được phép truy cập',s=>{s.r('svc','ui','Không tạo phiên');s.r('ui','user','Tài khoản chưa được cấp quyền truy cập. Liên hệ người phụ trách.');s.stop('Kết thúc lần đăng nhập; không truy cập dữ liệu nghiệp vụ.');}],
        ['Hợp lệ',s=>{s.m('svc','db','Ghi phiên, employeeId, quyền và thời điểm');s.r('db','svc','Phiên đã tạo');s.r('svc','ui','Tên nhân viên, phạm vi máy, quyền, phiên');s.r('ui','user','Mở dashboard và menu theo quyền');}],
      ]);
    }],
  ]);
  s.phase('2. Điều hướng trong phiên hợp lệ');
  s.ui('UI-02 · Dashboard theo quyền','Người bảo trì: Ca của tôi; mở ca; lịch sử máy; tra cứu tri thức; đề xuất của tôi.\nChuyên gia: Tri thức của tôi; ghi tri thức; ca cần hỗ trợ/đang tham gia; tra cứu.\nChuyên gia trưởng: Hàng đợi duyệt; việc đang xem; lịch sử quyết định; tra cứu.\nHiện tên nhân viên, vai trò đang dùng, thông báo chưa đọc.\nNếu có nhiều quyền đã cấp: cho đổi không gian làm việc; không tạo tài khoản mới.');
  s.m('user','ui','Mở một module hoặc liên kết từ thông báo');s.m('ui','svc','Yêu cầu nội dung kèm phiên và ID đối tượng');
  s.m('svc','svc','Kiểm tra quyền vai trò, phạm vi và quyền trên đối tượng');
  s.alt([
    ['Đủ quyền',s=>{s.m('svc','db','Đọc dữ liệu trong phạm vi được phép');s.r('db','svc','Dữ liệu hiện tại');s.r('svc','ui','Nội dung và các hành động được phép');s.r('ui','user','Hiện danh sách, bộ lọc, số việc chờ và nút phù hợp');}],
    ['Không đủ quyền',s=>{s.r('svc','ui','Từ chối truy cập');s.r('ui','user','Bạn không có quyền thực hiện thao tác này.');}],
    ['Phiên hết hạn',s=>s.ref('SQ15','Khôi phục đăng nhập; giữ phần nhập chưa gửi; trở lại đúng màn hình')],
  ]);
  s.note('Đăng xuất khỏi thiết bị dùng chung kết thúc phiên và xóa dữ liệu tạm của phiên. Chỉ được đổi sang vai trò đã cấp; backend vẫn kiểm tra quyền, không chỉ ẩn menu.');

  s=page('SQ02','Nhập tri thức, lưu nháp và AI cấu trúc',['expert','ui','svc','db','ai'],{
    short:'Một ô gõ/dán; tự lưu; tách đề xuất từ ghi chú họp; chuyên gia kiểm tra biểu mẫu.',
    pre:'Chuyên gia đã đăng nhập và chọn Ghi tri thức hoặc mở bản nháp của mình.',
    post:'Có bản nháp đã kiểm tra, đủ điều kiện chuyển sang đối chiếu kho.',
    bpmn:['k-start','k-input','k-structure','k-check','k-ready'],
  });
  s.phase('1. Nhập và giữ lại nội dung gốc');
  s.ui('UI-03 · Ghi tri thức','Một textbox: “Nhập hoặc dán kinh nghiệm, ghi chú, nội dung cuộc họp…”.\nHiện tác giả từ tài khoản, thời điểm sửa, trạng thái lưu.\nThông tin ngữ cảnh: loại máy/cụm máy, chủ đề (nếu đã biết).\nNút: “AI sắp xếp nội dung”, “Lưu và thoát”, “Mở nháp”.\nKhông có import file hoặc ghi âm trong MVP.');
  s.m('expert','ui','Chọn Ghi tri thức hoặc mở nháp');s.m('ui','svc','Tạo / lấy nháp thuộc người dùng');s.m('svc','db','Lưu / đọc draftId, tác giả và phiên bản nháp');s.r('db','svc','Nội dung nháp; thời điểm lưu gần nhất');s.r('svc','ui','Bản nháp và trạng thái');
  s.loop('Trong khi chuyên gia nhập hoặc dán nội dung',s=>{
    s.m('expert','ui','Thay đổi nội dung hoặc ngữ cảnh máy');s.m('ui','ui','Hiện Chưa lưu → Đang lưu sau khoảng ngừng nhập');
    s.m('ui','svc','Lưu rawText, ngữ cảnh, draftId, revision hiện tại');s.m('svc','db','Lưu thay đổi kèm người sửa và thời điểm');s.r('db','svc','Đã lưu; revision mới');s.r('svc','ui','Xác nhận lưu');s.r('ui','expert','Hiện Đã lưu lúc…; có thể rời màn hình');
  });
  s.note('Nếu lưu lỗi: dùng SQ15. Không hiển thị “Đã lưu” khi chưa nhận xác nhận; không tự mất nội dung khi đổi màn hình.');
  s.phase('2. Chuyên gia chủ động yêu cầu AI cấu trúc');
  s.ui('UI-04 · AI đang xử lý / bản gợi ý','Hiện “Đang sắp xếp nội dung…”; vẫn giữ nội dung gốc.\nKết quả có liên kết về đoạn nguồn và ô chưa đủ dữ kiện.\nNếu có nhiều chủ đề: hiện danh sách đề xuất để chọn; mỗi đề xuất có nháp riêng.\nNút: “Dùng bản gợi ý”, “Giữ bản đang sửa”, “Thử lại”, “Tự hoàn thiện biểu mẫu”.');
  s.m('expert','ui','Nhấn AI sắp xếp nội dung');s.m('ui','svc','Yêu cầu cấu trúc bản nháp tại revision đã lưu');s.m('svc','db','Đọc ảnh chụp nội dung và ngữ cảnh');s.r('db','svc','Nội dung nguồn');
  s.m('svc','ai','Trích xuất theo biểu mẫu; không suy đoán dữ kiện còn thiếu');
  s.alt([
    ['AI trả được kết quả hợp lệ',s=>{
      s.r('ai','svc','Các trường gợi ý, đoạn nguồn, mục thiếu; có thể nhiều chủ đề');s.m('svc','db','Lưu gợi ý AI gắn revision nguồn; chưa thay bản chuyên gia');s.r('svc','ui','Bản gợi ý để xem trước');
      s.opt('Biên bản chứa nhiều chủ đề độc lập',s=>{s.m('expert','ui','Chọn các chủ đề muốn tách thành đề xuất');s.m('ui','svc','Tạo nháp cho từng chủ đề, giữ liên kết nội dung gốc');s.m('svc','db','Lưu từng nháp và nguồn chung');s.r('svc','ui','Danh sách nháp; mở từng nháp để kiểm tra');});
      s.m('expert','ui','Chọn dùng bản gợi ý hoặc giữ biểu mẫu hiện tại');s.m('ui','svc','Lưu lựa chọn; chỉ áp dụng khi revision phù hợp');s.r('svc','ui','Biểu mẫu đang sửa và nội dung gốc để đối chiếu');
    }],
    ['AI lỗi / hết thời gian',s=>{s.r('ai','svc','Không có kết quả hợp lệ');s.r('svc','ui','Giữ nháp; cho thử lại hoặc nhập các mục thủ công');s.r('ui','expert','Chưa thể sắp xếp nội dung. Bản nhập của bạn vẫn được giữ.');}],
  ]);
  s.phase('3. Xác nhận biểu mẫu trước khi đối chiếu kho');
  s.ui('UI-05 · Biểu mẫu tri thức','Trường: tiêu đề; loại/model máy; dấu hiệu; điều kiện phát sinh; model SẢN PHẨM riêng với model máy; chế độ/tốc độ/line/ca/môi trường liên quan.\nĐiểm thay đổi 5M1E: Con người / Máy / Vật liệu-sản phẩm / Phương pháp / Đo lường / Môi trường. Mỗi nhóm có Có thay đổi / Chưa ghi nhận / Chưa kiểm tra.\nGhi giả thuyết, bằng chứng kiểm tra, lý do chọn/đổi hướng, thao tác, kết quả, bài học, điều kiện áp dụng, giới hạn, an toàn và đóng góp.\nPhân biệt nguyên nhân đã xác nhận với giả thuyết/chưa xác định; máy phục hồi chưa tự xác nhận nguyên nhân.\nChỉ mở trường theo nội dung liên quan; mục không áp dụng/chưa biết có lý do, không bắt viết mọi mục 5M1E.\nNút: Đối chiếu kho tri thức, Quay lại nội dung gốc, Lưu và thoát.');
  s.loop('Đến khi nội dung bắt buộc hợp lệ và chuyên gia xác nhận',s=>{
    s.m('expert','ui','Đọc, sửa và bổ sung biểu mẫu; xác nhận phần AI phân loại');s.m('ui','svc','Lưu biểu mẫu và lý do các mục chưa có / không áp dụng');s.m('svc','db','Lưu revision mới; giữ rawText và lịch sử sửa');s.r('svc','ui','Các ô hợp lệ / còn thiếu');
    s.alt([
      ['Còn thiếu mục bắt buộc',s=>s.r('ui','expert','Hiện lỗi tại từng ô và danh sách mục cần hoàn thiện')],
      ['Đủ điều kiện',s=>s.r('ui','expert','Bật nút Đối chiếu kho tri thức')],
    ]);
  });
  s.ref('SQ03','Đối chiếu kho trên bản nháp đã được chuyên gia kiểm tra');

  s=page('SQ03','Đối chiếu tri thức và xử lý nội dung trùng',['expert','ui','svc','db','ai','kb'],{
    short:'Đọc giống/khác; hủy đề xuất trùng; tạo mới hoặc bổ sung phiên bản cũ.',
    pre:'Biểu mẫu tri thức đã được chuyên gia kiểm tra và lưu.',
    post:'Hủy/lưu trữ bản trùng, hoặc có đề xuất tạo mới/cập nhật sẵn sàng gửi duyệt.',
    bpmn:['k-compare','k-read','k-classify','k-update','k-new','k-merge','k-archive','k-covered','-SpsiOeKhrRzImmBTtOj-4'],
  });
  s.phase('1. Tìm và đối chiếu các bản liên quan');
  s.ui('UI-06 · Đối chiếu kho','Hiện bản đang viết và nguồn đã duyệt ở hai cột.\nMỗi nguồn: ID/phiên bản, tên, máy/phạm vi, tác giả, người duyệt, ngày duyệt.\nBảng giống/khác: triệu chứng, nguyên nhân, điều kiện áp dụng, bước xử lý, an toàn, kết quả.\nTách rõ không có dữ liệu và có khác biệt; mở toàn văn nguồn.\nKhông kết luận “trùng” chỉ bằng phần trăm tương đồng.');
  s.m('expert','ui','Nhấn Đối chiếu kho tri thức');s.m('ui','svc','Gửi draftId và revision đã kiểm tra');s.m('svc','db','Đọc biểu mẫu và phạm vi truy cập');s.r('db','svc','Ảnh chụp nội dung');s.m('svc','ai','Yêu cầu tìm và so sánh nguồn được phép sử dụng');s.m('ai','kb','Tìm tri thức đã duyệt theo máy, ngữ cảnh và nội dung');s.r('kb','ai','Các đoạn nguồn; ID và phiên bản; có thể rỗng');s.r('ai','svc','Bảng giống/khác, căn cứ, phần chưa rõ; không tự chọn hành động');s.m('svc','db','Lưu lần đối chiếu gắn revision nguồn và nháp');s.r('svc','ui','Kết quả đối chiếu có dẫn nguồn');s.m('expert','ui','Mở các nguồn liên quan để đọc');s.ref('SQ14','Đọc nguồn đầy đủ và điều kiện áp dụng');
  s.note('Không tìm thấy bản liên quan khác với lỗi truy xuất. Nếu truy xuất lỗi: giữ nháp và thử lại; chưa đánh dấu đã đối chiếu để gửi.');
  s.phase('2. Quyết định của chuyên gia');
  s.ui('UI-07 · Chọn cách ghi nhận','Ba lựa chọn: “Hủy đề xuất trùng”, “Bổ sung bản đã có”, “Tạo tri thức mới”.\nHủy: hộp xác nhận nêu nháp được lưu trữ, bản gốc không đổi; có nút “Quay lại”.\nBổ sung: chọn ID/phiên bản gốc; ghi phần mới, điều kiện khác và lý do sửa.\nTạo mới gần nguồn cũ: giải thích khác biệt; không có kết quả thì vẫn cần xác nhận tạo mới.');
  s.alt([
    ['Nội dung trùng, không có điểm mới',s=>{
      s.m('expert','ui','Nhấn Hủy đề xuất trùng');s.r('ui','expert','Xác nhận lưu trữ đề xuất và liên kết bản đã có?');
      s.alt([
        ['Chọn Quay lại',s=>s.r('ui','expert','Giữ nguyên nháp; tiếp tục đọc hoặc sửa')],
        ['Xác nhận hủy',s=>{s.m('ui','svc','Lưu trữ nháp trùng; gửi ID bản đã có và lý do');s.m('svc','db','Ghi trạng thái Đã hủy do trùng; giữ nháp, tác giả và liên kết');s.r('db','svc','Đã lưu');s.r('svc','ui','Không tạo đề xuất chờ duyệt');s.r('ui','expert','Đã lưu trữ đề xuất trùng. Bạn có thể mở tri thức đã có.');}],
      ]);
    }],
    ['Có bổ sung hoặc cần sửa bản đã có',s=>{
      s.m('expert','ui','Chọn Bổ sung bản đã có; nhập phần thay đổi và lý do');s.m('ui','svc','Lưu loại Cập nhật, knowledgeId, baseVersion, phần đề xuất');s.m('svc','db','Giữ phiên bản gốc; tạo đề xuất cập nhật riêng');s.r('svc','ui','Bản gốc và bản đề xuất; phần thay đổi nổi bật');s.ref('SQ04','Gửi đề xuất cập nhật để kiểm duyệt');
    }],
    ['Tri thức mới hoặc khác biệt có giá trị độc lập',s=>{
      s.m('expert','ui','Chọn Tạo tri thức mới; ghi khác biệt nếu có nguồn gần giống');s.m('ui','svc','Lưu loại Tạo mới và căn cứ phân biệt');s.m('svc','db','Cập nhật nháp; giữ kết quả đối chiếu');s.r('svc','ui','Bản đề xuất mới sẵn sàng gửi');s.ref('SQ04','Gửi đề xuất mới để kiểm duyệt');
    }],
  ]);
  s.note('Nếu sửa đáng kể nội dung sau khi đối chiếu, hiển thị “Nội dung đã thay đổi — cần đối chiếu lại”. Kết quả trên revision cũ không được dùng để xác nhận bản mới.');

  s=page('SQ04','Xác nhận và gửi đề xuất kiểm duyệt',['author','ui','svc','db','notice'],{
    short:'Dùng chung cho chuyên gia và đề xuất từ ca; kiểm tra lần cuối, ghi chờ duyệt và thông báo.',
    pre:'Có đề xuất đã hoàn thiện và đối chiếu: từ SQ03 hoặc SQ13/SQ06; người gửi có quyền.',
    post:'Đề xuất Chờ duyệt, có người duyệt phù hợp hoặc chờ phân công; bản đã duyệt và lịch sử ca không bị sửa.',
    bpmn:['k-submit','k-queue','r-submit'],
  });
  s.phase('1. Xem lại trước khi gửi');
  s.ui('UI-08 · Xác nhận gửi đề xuất','Hiện tiêu đề, loại đề xuất, máy/phạm vi, tác giả/người đóng góp, kết quả đối chiếu, nguồn hoặc báo cáo ca.\nCập nhật: hiện ID và phiên bản gốc. Liên kết case: hiện ca và tri thức đích.\nXác nhận “Tôi đã kiểm tra nội dung và phạm vi áp dụng”.\nNút “Gửi kiểm duyệt”; khi gửi hiện tiến trình và khóa gửi lặp.');
  s.m('author','ui','Mở xem lại; xác nhận nội dung; nhấn Gửi kiểm duyệt');s.m('ui','svc','Gửi proposalId, revision, loại đề xuất, nguồn và mã lần gửi');s.m('svc','db','Đọc bản hiện tại, quyền, người đóng góp và bản gốc');s.r('db','svc','Trạng thái, revision, phiên bản và phạm vi');
  s.alt([
    ['Thiếu trường, chưa xác nhận hoặc chưa đối chiếu bản hiện tại',s=>{s.r('svc','ui','Danh sách vấn đề; không chuyển trạng thái');s.r('ui','author','Chưa thể gửi. Vui lòng hoàn thiện các mục được đánh dấu.');s.stop('Đề xuất chưa gửi; quay lại hoàn thiện nội dung.');}],
    ['Bản gốc / đề xuất đã thay đổi bởi phiên khác',s=>{s.r('svc','ui','Trả phiên bản mới nhất; không ghi đè');s.ref('SQ15','Đọc khác biệt, cập nhật đề xuất và đối chiếu lại');s.stop('Thực hiện một lần gửi mới sau khi đã xử lý xung đột.');}],
    ['Mọi điều kiện hợp lệ',s=>{
      s.m('svc','svc','Chọn người duyệt đúng chuyên môn, khác tác giả/người cùng xây dựng');
      s.m('svc','db','Lưu ảnh chụp đề xuất Chờ duyệt và lịch sử gửi trong một giao dịch');s.r('db','svc','submissionId, thời gian và người duyệt / chưa phân công');
      s.async('svc','notice','Tạo thông báo trong web cho người duyệt phù hợp');s.r('svc','ui','Đã nhận đề xuất; trạng thái, mã đề xuất và người duyệt');s.r('ui','author','Đã gửi kiểm duyệt. Theo dõi tại Đề xuất của tôi.');
    }],
  ]);
  s.phase('2. Theo dõi trạng thái sau khi gửi thành công');
  s.ui('UI-09 · Đề xuất của tôi','Mỗi dòng: mã, tiêu đề, nguồn Chuyên gia/Case, loại Mới/Cập nhật/Liên kết, trạng thái, người duyệt, lần cập nhật.\nChi tiết có timeline: nháp → gửi → phản hồi → gửi lại → quyết định.\nChờ duyệt: xem bản đã gửi, chưa sửa trực tiếp ảnh chụp đó.\nChưa có người duyệt phù hợp: “Đã gửi — chờ phân công người duyệt”; giữ trong hàng đợi đúng chuyên môn.');
  s.m('author','ui','Mở Đề xuất của tôi');s.m('ui','svc','Lấy trạng thái và lịch sử các đề xuất được phép xem');s.m('svc','db','Đọc trạng thái hiện tại, không dùng bản lưu tạm');s.r('db','svc','Danh sách và timeline');s.r('svc','ui','Trạng thái; khả năng chỉnh sửa theo trạng thái');s.r('ui','author','Hiện thông tin theo dõi và liên kết tới đề xuất');
  s.note('Không tự chọn tác giả làm người duyệt khi thiếu người phù hợp. Gửi lại cùng mã lần gửi chỉ trả kết quả đã có, không tạo hai đề xuất.');
  s.ref('SQ05','Người duyệt mở hồ sơ và quyết định');

  s=page('SQ05','Chuyên gia trưởng xem và quyết định kiểm duyệt',['reviewer','ui','svc','db','kb','notice'],{
    short:'Hàng đợi, hồ sơ nguồn, chỉnh biên tập và ba kết quả có phản hồi.',
    pre:'Đề xuất đang Chờ duyệt; người duyệt được cấp quyền theo chuyên môn và độc lập với tác giả.',
    post:'Yêu cầu bổ sung, Từ chối, hoặc Đã duyệt để chuyển xuất bản; mọi kết quả có người quyết định, lý do và thời gian.',
    bpmn:['k-review','k-decision','k-feedback','k-reject','r-review','r-decision','r-feedback','r-reject'],
  });
  s.phase('1. Mở hồ sơ đúng phạm vi và đủ ngữ cảnh');
  s.ui('UI-10 · Hàng đợi duyệt','Bộ lọc: nguồn đề xuất, máy/phạm vi, loại đề xuất, trạng thái, người gửi, thời gian.\nDòng hồ sơ: mã, tiêu đề, người gửi, số lần bổ sung, người đang phụ trách.\nChi tiết: bản đề xuất; bản gốc nếu cập nhật; so sánh trước/sau; nguồn chuyên gia hoặc báo cáo ca; tác giả và mọi người đóng góp.\nTiêu chí xem xét: bằng chứng, tính đúng, phạm vi, điều kiện áp dụng, an toàn, trùng lặp.');
  s.m('reviewer','ui','Mở Hàng đợi duyệt; chọn đề xuất');s.m('ui','svc','Đọc hồ sơ kiểm duyệt');s.m('svc','db','Kiểm tra quyền, phạm vi, người tham gia, trạng thái và revision');s.r('db','svc','Kết quả kiểm tra và hồ sơ');
  s.alt([
    ['Tự duyệt / cùng xây dựng / ngoài phạm vi / đã có quyết định',s=>{s.r('svc','ui','Không cho thực hiện quyết định trên hồ sơ này');s.r('ui','reviewer','Hiện lý do; yêu cầu chuyển người duyệt phù hợp hoặc tải quyết định mới nhất');s.stop('Kết thúc lượt kiểm duyệt này; không mở phần ra quyết định.');}],
    ['Có quyền duyệt và hồ sơ còn chờ',s=>{
      s.m('svc','kb','Đọc bản đã duyệt liên quan và phiên bản gốc');s.r('kb','svc','Nguồn đầy đủ và tình trạng phiên bản');s.r('svc','ui','Đề xuất, nguồn, so sánh và lịch sử');s.m('reviewer','ui','Đọc nguồn; kiểm tra các phần nội dung');
      s.alt([
        ['Đề xuất từ ca sửa chữa',s=>{s.m('ui','svc','Mở báo cáo ca và nhật ký người tham gia');s.m('svc','db','Đọc sự kiện thực tế, kết quả, xác nhận chuyên gia và khác biệt');s.r('svc','ui','Báo cáo nguồn chỉ đọc; giả thuyết tách khỏi nguyên nhân xác nhận');}],
        ['Đề xuất tri thức chuyên gia',s=>{s.m('ui','svc','Mở nội dung gốc và quá trình chuyên gia chỉnh sửa');s.m('svc','db','Đọc rawText, biểu mẫu và đóng góp');s.r('svc','ui','Nguồn và lịch sử hình thành tri thức');}],
      ]);
    }],
  ]);
  s.phase('2. Quyết định — chỉ thực hiện khi hồ sơ hợp lệ ở bước 1');
  s.ui('UI-11 · Hành động kiểm duyệt','Nút: “Phê duyệt”, “Yêu cầu bổ sung”, “Từ chối”, “Lưu nhận xét”.\nCả ba kết quả đều nhập phản hồi; yêu cầu bổ sung chỉ rõ trường/đoạn cần sửa.\nSửa chính tả/bố cục: lưu người sửa và trước/sau.\nSửa nội dung chuyên môn: gửi tác giả xác nhận qua yêu cầu bổ sung.\nTrước khi chốt: hiển thị hành động, phiên bản và hậu quả; cho quay lại.');
  s.opt('Người duyệt sửa biên tập, không đổi ý nghĩa',s=>{s.m('reviewer','ui','Sửa diễn đạt/chính tả; ghi chú thay đổi');s.m('ui','svc','Lưu chỉnh biên tập với revision đang xem');s.m('svc','db','Lưu trước/sau và người sửa; cập nhật revision');s.r('svc','ui','Đã lưu chỉnh sửa; hiện phần thay đổi');});
  s.m('reviewer','ui','Chọn quyết định; nhập nhận xét; xác nhận');s.m('ui','svc','Gửi quyết định, nhận xét, revision và mã lần quyết định');s.m('svc','db','Kiểm tra lại quyền, trạng thái và phiên bản trước khi chốt');s.r('db','svc','Hồ sơ hiện tại');
  s.alt([
    ['Thiếu phản hồi / phiên bản đã đổi / đã được người khác quyết định',s=>{s.r('svc','ui','Không ghi quyết định; trả lỗi cụ thể hoặc trạng thái mới');s.r('ui','reviewer','Bổ sung nhận xét hoặc tải lại hồ sơ trước khi quyết định');}],
    ['Hợp lệ — Yêu cầu bổ sung hoặc sửa nội dung chuyên môn',s=>{
      s.m('svc','db','Chuyển Cần bổ sung; lưu nhận xét theo mục và bản đề nghị sửa');s.async('svc','notice','Thông báo người gửi kèm liên kết đến đúng phiên bản');s.r('svc','ui','Đã gửi yêu cầu bổ sung');s.r('ui','reviewer','Hồ sơ đã chuyển về người gửi; xem lịch sử phản hồi');s.ref('SQ06','Người gửi sửa / xác nhận thay đổi và gửi lại');
    }],
    ['Hợp lệ — Từ chối',s=>{
      s.m('svc','db','Lưu Từ chối, lý do và lịch sử; giữ báo cáo ca nếu có');s.async('svc','notice','Thông báo kết quả từ chối cho người gửi');s.r('svc','ui','Đã từ chối; không đưa đề xuất vào kho dùng cho RAG');s.r('ui','reviewer','Đã từ chối đề xuất. Lịch sử nguồn được giữ.');
    }],
    ['Hợp lệ — Phê duyệt',s=>{
      s.m('svc','db','Lưu quyết định Đã duyệt, người duyệt, phản hồi và revision');s.r('db','svc','Quyết định đã ghi; công việc xuất bản được tạo');s.r('svc','ui','Đã duyệt — đang cập nhật kho tra cứu');s.ref('SQ07','Xuất bản/duyệt liên kết và thông báo khi sẵn sàng');
    }],
  ]);
  s.note('Chuyên gia trưởng xác nhận tri thức có thể tái sử dụng. Bước này không chứng nhận thay người thực hiện rằng các thao tác trong ca thực tế đã xảy ra.');

  s=page('SQ06','Người gửi nhận phản hồi và hoàn thiện đề xuất',['author','ui','svc','db','notice'],{
    short:'Sửa theo từng nhận xét; xác nhận phần chuyên gia trưởng đề nghị; đối chiếu lại và gửi lại.',
    pre:'Đề xuất ở Cần bổ sung; người gửi mở thông báo hoặc Đề xuất của tôi.',
    post:'Có revision được người gửi xác nhận, đã đối chiếu lại và gửi duyệt; giữ mọi vòng phản hồi.',
    bpmn:['k-return','k-revise','r-revise'],
  });
  s.phase('1. Đọc phản hồi đúng phiên bản');
  s.ui('UI-12 · Chi tiết yêu cầu bổ sung','Hiện người nhận xét, ngày giờ, lần xét duyệt, từng mục cần sửa và lý do.\nBên cạnh có bản đã gửi, bản đang sửa và phần người duyệt đề nghị thay đổi.\nNút “Sửa đề xuất”, “Xem nguồn”, “Lưu và thoát”.\nBáo cáo ca gốc vẫn chỉ đọc; không thay đổi theo nội dung đề xuất.');
  s.async('notice','ui','Hiện thông báo yêu cầu bổ sung trong phiên người gửi');s.m('author','ui','Mở phản hồi');s.m('ui','svc','Đọc đề xuất, revision mới nhất và lịch sử');s.m('svc','db','Kiểm tra quyền sửa và trạng thái Cần bổ sung');s.r('db','svc','Bản đã gửi, phản hồi và bản đang sửa nếu có');s.r('svc','ui','Các mục cần sửa và thay đổi được đề nghị');
  s.loop('Người gửi xử lý từng nhận xét',s=>{
    s.m('author','ui','Sửa mục liên quan; chấp nhận / chỉnh lại đề nghị; ghi giải thích');s.m('ui','svc','Lưu nội dung và kết quả phản hồi từng mục');s.m('svc','db','Lưu revision; giữ tác giả và người đề nghị sửa');s.r('svc','ui','Đã lưu; các nhận xét còn chưa giải quyết');
  });
  s.opt('Đề xuất từ ca cần chuyên gia cùng hoàn thiện',s=>{s.m('author','ui','Bổ sung nội dung chuyên gia cung cấp và khai báo đóng góp');s.m('ui','svc','Lưu người đóng góp thực tế và người nhập nội dung');s.m('svc','db','Bổ sung dấu vết; cập nhật điều kiện người duyệt độc lập');s.r('svc','ui','Danh sách người đóng góp đã cập nhật');});
  s.phase('2. Kiểm tra lại trước khi gửi lại');
  s.ui('UI-13 · Gửi lại sau bổ sung','Hiện danh sách nhận xét đã xử lý/chưa xử lý và so sánh với lần gửi trước.\nNút “Đối chiếu lại”, sau đó “Gửi lại kiểm duyệt”.\nThông báo khi thiếu: “Còn mục cần bổ sung hoặc chưa có giải thích”.\nTác giả phải xác nhận nội dung chuyên môn do người duyệt đề nghị; không tự xuất bản sau khi nhận sửa.');
  s.m('author','ui','Nhấn Đối chiếu lại');s.m('ui','svc','Kiểm tra trường bắt buộc và revision');
  s.alt([
    ['Nội dung chưa hoàn thiện',s=>{s.r('svc','ui','Trả danh sách mục còn thiếu');s.r('ui','author','Giữ bản đang sửa; đi đến từng mục cần bổ sung');}],
    ['Đã hoàn thiện',s=>{
      s.alt([
        ['Nguồn là tri thức chuyên gia',s=>s.ref('SQ03','Đối chiếu lại và xác nhận tạo mới/cập nhật hoặc hủy nếu trùng')],
        ['Nguồn là case sửa chữa',s=>s.ref('SQ13','Chỉ đối chiếu và sửa đề xuất tri thức; giữ báo cáo ca đã hoàn tất')],
      ]);
      s.opt('Người gửi vẫn chọn gửi đề xuất sau đối chiếu',s=>s.ref('SQ04','Gửi revision mới, giữ proposalId và số vòng bổ sung'));
    }],
  ]);
  s.note('Nếu phát hiện dữ kiện thực tế của báo cáo sai: tạo bản đính chính có lý do và người xác nhận theo SQ12; không âm thầm ghi nội dung đề xuất ngược vào báo cáo.');

  s=page('SQ07','Xuất bản tri thức và theo dõi kết quả',['author','ui','svc','db','kb','notice'],{
    short:'Tách đã duyệt khỏi sẵn sàng tra cứu; giữ phiên bản và thông báo mọi kết quả.',
    pre:'SQ05 đã ghi quyết định phê duyệt, hoặc người gửi mở thông báo kết quả bất kỳ.',
    post:'Liên kết được duyệt hoặc phiên bản sẵn sàng cho RAG; người gửi thấy đúng trạng thái, nguồn và người duyệt.',
    bpmn:['k-publish','k-end','k-reject-notify','k-rejected','r-publish','r-published','r-rejected'],
  });
  s.phase('1. Xuất bản từ quyết định đã ghi nhận');
  s.ui('UI-14 · Trạng thái xuất bản','Hiện hai thông tin: kết quả kiểm duyệt và khả năng tra cứu.\nĐã duyệt nhưng chưa xong: “Đã duyệt — đang cập nhật tra cứu”.\nSẵn sàng: “Đã xuất bản”; mở ID/phiên bản chính thức.\nLỗi cập nhật: “Đã duyệt, chưa sẵn sàng tra cứu”; không hiển thị thành công giả.\nVới liên kết case: “Đã duyệt liên kết”; không tạo thêm bản tri thức trùng.');
  s.m('svc','db','Đọc quyết định đã duyệt và ảnh chụp nội dung được duyệt');s.r('db','svc','Loại đề xuất, nguồn, revision, tác giả và người duyệt');
  s.alt([
    ['Chỉ liên kết ca lặp lại với tri thức đã có',s=>{s.m('svc','db','Lưu liên kết được duyệt từ caseId đến knowledgeId/version');s.r('db','svc','Liên kết có hiệu lực; không tạo nội dung tri thức mới');s.async('svc','notice','Thông báo Đã duyệt liên kết cho người gửi');}],
    ['Tạo mới hoặc cập nhật nội dung tri thức',s=>{
      s.m('svc','db','Chuẩn bị phiên bản bất biến gắn nguồn và quyết định; chưa đánh dấu sẵn sàng');s.r('db','svc','knowledgeId/version cần xuất bản');s.m('svc','kb','Lập chỉ mục đúng phiên bản đã duyệt và phạm vi truy cập');
      s.alt([
        ['Xuất bản thành công',s=>{s.r('kb','svc','Chỉ mục đã sẵn sàng cho phiên bản này');s.m('svc','db','Ghi Sẵn sàng; kích hoạt phiên bản mới, giữ lịch sử phiên bản cũ');s.r('db','svc','Đã cập nhật trạng thái');s.async('svc','notice','Thông báo Đã xuất bản kèm ID/phiên bản');}],
        ['Lỗi cập nhật kho tra cứu',s=>{s.r('kb','svc','Chưa sẵn sàng; không cung cấp bản dở dang cho RAG');s.m('svc','db','Giữ Đã duyệt / Chưa sẵn sàng; ghi việc cần thử lại');s.async('svc','notice','Hiện trạng thái đang chờ cập nhật; không yêu cầu người gửi gửi lại đề xuất');s.note('Thử lại xuất bản dùng cùng ID/phiên bản, không tạo phiên bản trùng. Bản đã duyệt trước đó vẫn dùng được nếu còn hiệu lực.');}],
      ]);
    }],
  ]);
  s.phase('2. Người gửi xem kết quả và lịch sử');
  s.ui('UI-15 · Thông báo và kết quả','Danh sách thông báo: loại sự kiện, mã đối tượng, tiêu đề, người xử lý, thời gian, đã đọc/chưa đọc.\nBấm thông báo mở trạng thái hiện tại, đồng thời giữ sự kiện cũ trong timeline.\nTừ chối: hiện lý do, bản bị từ chối, người quyết định; lịch sử ca vẫn tồn tại.\nĐã xuất bản: hiện tác giả/người đóng góp/người duyệt và nguồn; có thể mở bản chính thức.\nKhông gửi email/Slack hoặc thông báo ngoài ứng dụng trong prototype.');
  s.async('notice','ui','Đưa sự kiện mới vào danh sách thông báo');s.m('author','ui','Mở một thông báo hoặc chi tiết đề xuất');s.m('ui','svc','Đọc trạng thái hiện tại; đánh dấu thông báo đã đọc');s.m('svc','db','Đọc quyết định, phản hồi, phiên bản và lịch sử');s.r('db','svc','Thông tin có quyền truy cập');s.r('svc','ui','Trạng thái mới nhất và timeline');
  s.alt([
    ['Đã xuất bản / đã duyệt liên kết',s=>{s.r('ui','author','Hiện kết quả, lời nhận xét, nguồn và nút Mở tri thức');s.ref('SQ14','Đọc phiên bản chính thức');}],
    ['Đã duyệt, còn chờ cập nhật',s=>s.r('ui','author','Hiện tiến trình và trạng thái; chưa báo sẵn sàng sử dụng')],
    ['Cần bổ sung',s=>s.ref('SQ06','Mở đúng phản hồi cần xử lý')],
    ['Bị từ chối',s=>s.r('ui','author','Hiện lý do và lịch sử; đề xuất không vào kho RAG; ca vẫn được giữ')],
  ]);

  s=page('SQ08','Mở ca và ghi nhận kiểm tra sơ bộ',['worker','ui','svc','db'],{
    short:'Xác định máy, ca mới/đang có, lý lịch, dấu hiệu và nhánh bảo trì định kỳ.',
    pre:'Có máy báo lỗi hoặc đến lịch bảo trì; người bảo trì đăng nhập trên thiết bị tại hiện trường.',
    post:'Ca có ID, máy, chủ ca, loại công việc, lịch sử ban đầu và thông tin kiểm tra sơ bộ.',
    bpmn:['r-start','r-open','r-inspect','r-abnormal'],
  });
  s.phase('1. Xác định đúng máy và ca làm việc');
  s.ui('UI-16 · Mở ca làm việc','Nút “Quét mã máy” hoặc ô “Nhập mã máy”; nếu không dùng camera thì nhập tay.\nHiện thẻ máy: mã, tên, loại/model, dây chuyền/khu vực, lịch sử gần nhất.\nChọn loại ca: Sửa chữa do bất thường / Bảo trì, bảo dưỡng định kỳ.\nNgười phụ trách lấy từ tài khoản; có trường thời điểm phát hiện và mô tả ban đầu.\nCảnh báo nhầm máy: yêu cầu xác nhận thẻ máy trước khi tạo ca.');
  s.m('worker','ui','Chọn Mở ca; quét hoặc nhập mã máy');s.m('ui','svc','Tra máy theo mã và phạm vi được phép');s.m('svc','db','Đọc danh mục máy, lịch sử gần nhất và ca đang mở');s.r('db','svc','Kết quả máy và các ca liên quan');
  s.alt([
    ['Không tìm thấy / ngoài phạm vi',s=>{s.r('svc','ui','Không có máy hợp lệ để gắn ca');s.r('ui','worker','Kiểm tra lại mã máy hoặc liên hệ người phụ trách; chưa tạo ca');s.stop('Ở lại bước xác định máy; chưa có ca để ghi nhận công việc.');}],
    ['Tìm thấy máy',s=>{
      s.r('svc','ui','Thẻ máy và ca đang mở nếu có');s.m('worker','ui','Xác nhận đúng máy; chọn loại ca');
      s.alt([
        ['Có ca phù hợp đang mở và chọn tiếp tục/tham gia',s=>{s.m('ui','svc','Yêu cầu mở ca hiện có theo quyền');s.m('svc','db','Ghi tham gia / mở lại phiên với đúng vai trò');s.r('svc','ui','Mở ca hiện tại, chủ ca và các việc đang chờ');}],
        ['Tạo ca mới, hoặc công việc khác có lý do',s=>{s.m('worker','ui','Nhấn Bắt đầu ca; ghi lý do nếu có ca khác đang mở');s.m('ui','svc','Tạo ca kèm mã lần tạo, máy, loại, thời điểm và mô tả');s.m('svc','db','Lưu caseId, chủ ca, trạng thái Đang ghi nhận và sự kiện mở ca');s.r('db','svc','caseId và thời gian đã lưu');s.r('svc','ui','Đã tạo ca; chuyển màn hình ca hiện trường');}],
      ]);
    }],
  ]);
  s.phase('2. Ghi nhận ban đầu — khi đã mở được ca hợp lệ');
  s.ui('UI-17 · Ca hiện trường / Kiểm tra sơ bộ','Đầu màn hình luôn có: mã ca, mã máy, khu vực, người phụ trách, trạng thái lưu.\nNhập: dấu hiệu, mã lỗi nếu có, vị trí/cụm máy, số đo kèm đơn vị, điều kiện xuất hiện, thay đổi gần đây, đã kiểm tra gì và kết quả.\nCho ghi “chưa xác định”; không ép nhập nguyên nhân khi chưa biết.\nNút: “Tra cứu hướng xử lý”, “Thực hiện bảo trì định kỳ”, “Yêu cầu chuyên gia”, “Lưu và bàn giao”.\nHiện cảnh báo an toàn của máy từ quy trình đã duyệt.');
  s.m('worker','ui','Nhập kết quả kiểm tra sơ bộ tại hiện trường');s.m('ui','svc','Lưu ghi nhận ban đầu và revision của ca');s.m('svc','db','Ghi lịch sử, người ghi, thời điểm và dữ kiện');s.r('svc','ui','Đã lưu; chỉ rõ ô còn thiếu thông tin tối thiểu');
  s.alt([
    ['Có bất thường cần chẩn đoán',s=>{s.m('worker','ui','Nhấn Tra cứu hướng xử lý');s.ref('SQ09','Tra cứu bằng bối cảnh mới nhất của ca');}],
    ['Bảo trì định kỳ, không phát hiện bất thường',s=>{s.m('worker','ui','Chọn Thực hiện bảo trì định kỳ');s.ref('SQ11','Thực hiện quy trình định kỳ được duyệt, ghi kết quả và kiểm tra hoàn tất');}],
    ['Không đủ điều kiện an toàn để kiểm tra tiếp',s=>s.ref('SQ11','Dừng/bàn giao theo quy định, giữ ca chưa hoàn tất')],
  ]);
  s.note('Demo dùng danh mục máy mô phỏng. Hiện nguồn dữ liệu của thẻ máy; không hiển thị “đã đồng bộ HozenDX” nếu chưa có tích hợp. Mọi thao tác quan trọng phải gắn đúng caseId.');

  s=page('SQ09','RAG tra cứu và hỗ trợ chọn hướng xử lý',['worker','ui','svc','db','ai','kb'],{
    short:'Nguồn trước, phân tích sau; phân biệt giống/khác/thiếu dữ kiện; người bảo trì quyết định.',
    pre:'Ca đang mở, đã lưu kiểm tra sơ bộ và có đủ thông tin tối thiểu để tra cứu.',
    post:'Người bảo trì chọn bổ sung kiểm tra, xin chuyên gia hoặc chuyển sang chốt phương án trong thẩm quyền.',
    bpmn:['r-retrieve','r-insight','r-assess','r-route','r-measure'],
  });
  s.phase('1. Tra cứu trên đúng bối cảnh đã lưu');
  s.ui('UI-18 · Kết quả tra cứu cho hồ sơ','Đầu trang giữ máy, đợt, dấu hiệu và bối cảnh; hiển thị thời điểm và lần tra cứu.\nĐối chiếu 3 nhóm theo Q&A: hiện tượng; điều kiện phát sinh; kết quả kiểm tra hiện trường. Thêm điểm thay đổi 5M1E.\nPhân biệt model máy với model sản phẩm; tốc độ/chế độ/line/ca/môi trường chỉ dùng khi có dữ kiện.\nCác case và tri thức chuyên gia đã duyệt ở trên, ưu tiên 1–3 và có Xem thêm. Mỗi nguồn có phiên bản, giống/khác, điều kiện, giới hạn và kết quả trước.\nHồ sơ thô từ HozenDX được ghi nhãn nguồn tham chiếu; chưa tự coi là know-how đã duyệt.\nKhông gọi số tiêu chí trùng là xác suất thành công; thiếu dữ liệu không đồng nghĩa giống nhau.');
  s.m('worker','ui','Nhấn Tra cứu hướng xử lý');s.m('ui','svc','Tra cứu với caseId, roundId, contextRevision và phạm vi máy');s.m('svc','db','Đọc hiện tượng, điều kiện, kết quả kiểm tra, 5M1E và các lần thử trước');s.r('db','svc','Dữ kiện có nguồn/thời điểm và phần chưa biết');s.m('svc','ai','Tìm nguồn đã duyệt; so sánh theo bối cảnh, không chỉ tên lỗi');s.m('ai','kb','Tìm cả kinh nghiệm chuyên gia và case đã duyệt theo quyền');s.r('kb','ai','Nguồn, đoạn trích, phiên bản, giới hạn; có thể không có');
  s.alt([
    ['Có nguồn đủ để lập phân tích',s=>{s.m('ai','ai','So sánh dữ kiện; lập phân tích từng ý có nguồn');s.r('ai','svc','Nguồn, bảng phù hợp/khác biệt, thiếu dữ kiện và hướng tham khảo');s.m('svc','db','Lưu ảnh chụp kết quả, nguồn và revision bối cảnh');s.r('svc','ui','Kết quả tra cứu đã kiểm tra cấu trúc và nguồn');s.r('ui','worker','Hiện nguồn bên trên và phân tích AI bên dưới');}],
    ['Không có nguồn hoặc thiếu căn cứ',s=>{s.r('ai','svc','Nêu rõ giới hạn; không sinh hướng thao tác thiếu nguồn');s.m('svc','db','Lưu lần tra cứu thiếu căn cứ');s.r('svc','ui','Cảnh báo và dữ kiện còn cần xác minh');s.r('ui','worker','Chưa đủ căn cứ để đề xuất xử lý. Bổ sung dữ kiện hoặc yêu cầu chuyên gia.');}],
    ['Nguồn mâu thuẫn hoặc khác điều kiện áp dụng',s=>{s.r('ai','svc','Nêu từng nguồn và phần mâu thuẫn; không tự gộp thành quy trình');s.r('svc','ui','Cảnh báo cần chuyên gia xác minh');s.r('ui','worker','Các nguồn chưa thống nhất cho bối cảnh này; chưa có hướng xử lý đủ căn cứ.');}],
  ]);
  s.note('Lỗi truy xuất / lỗi AI được xử lý ở SQ15, không đổi thành “không có tri thức”. Nếu phần AI lỗi nhưng nguồn hợp lệ còn đọc được, cho mở nguồn và yêu cầu hỗ trợ; không hiện phân tích tự tạo.');
  s.phase('2. Đọc nguồn và lựa chọn hành động');
  s.ui('UI-19 · Phân tích hỗ trợ quyết định','Tóm tắt: đã biết gì, còn thiếu gì, giả thuyết và bằng chứng, các bước đã thử.\nNhóm: xử lý trước mắt / theo dõi-sửa trung hạn / cải tiến-thay thế dài hạn; chỉ hiện đề xuất có căn cứ.\nAn toàn: trích quy trình phù hợp máy và thao tác; thiếu quy trình thì nói rõ cần xác minh.\nNút “Mở nguồn”, “Bổ sung kiểm tra”, “Chọn phương án”, “Yêu cầu chuyên gia”.\n“Chọn phương án” không mang nghĩa AI cho phép vận hành máy.');
  s.m('worker','ui','Đọc phân tích; mở nguồn cần đối chiếu');s.ref('SQ14','Xem toàn văn và phiên bản; ghi nguồn đã tham khảo vào ca');
  s.alt([
    ['Cần thêm dữ kiện có thể kiểm tra trong thẩm quyền',s=>{s.m('worker','ui','Chọn Bổ sung kiểm tra; ghi số đo / kết quả mới');s.m('ui','svc','Lưu dữ kiện mới và đánh dấu kết quả cũ cần cập nhật');s.m('svc','db','Tăng revision; giữ lần tra cứu trước trong timeline');s.r('svc','ui','Đã lưu. Tra cứu lại để cập nhật phân tích.');s.ref('SQ09','Lặp tra cứu với revision mới; không xóa kết quả trước');}],
    ['Thiếu căn cứ, vượt thẩm quyền hoặc người dùng muốn hỗ trợ',s=>{s.m('worker','ui','Chọn Yêu cầu chuyên gia; ghi câu hỏi cần làm rõ');s.ref('SQ10','Tóm tắt bàn giao và tiếp nhận chuyên gia');}],
    ['Có căn cứ và người bảo trì xác nhận trong thẩm quyền',s=>{s.m('worker','ui','Chọn phương án tham khảo; ghi đánh giá riêng');s.m('ui','svc','Lưu quyết định và nguồn được chọn; chưa coi đã thực hiện');s.m('svc','db','Ghi người quyết định, lý do, hướng xử lý dự kiến');s.r('svc','ui','Phương án đang chờ kiểm tra điều kiện thực hiện');s.ref('SQ11','Xác nhận điều kiện, an toàn rồi thực hiện và kiểm tra kết quả');}],
  ]);

  s=page('SQ10','Yêu cầu và ghi nhận chuyên gia tham gia ca',['worker','ui','svc','db','ai','expertui','expert'],{
    short:'Bàn giao, chờ tiếp nhận, công đoạn tham gia, đóng góp có tên và thời gian.',
    pre:'Ca đang mở; người bảo trì yêu cầu hỗ trợ và ghi lý do.',
    post:'Chuyên gia tham gia với dấu vết đóng góp, hoặc yêu cầu vẫn chờ để người phụ trách tiếp tục/bàn giao.',
    bpmn:['r-call','r-handover','r-join','r-investigate'],
  });
  s.phase('1. Chuẩn bị và xác nhận bàn giao');
  s.ui('UI-20 · Yêu cầu chuyên gia','Nhập lý do, việc cần xác minh và mức khẩn theo quy định nhà máy.\nHiện tóm tắt: máy, dấu hiệu, dữ kiện, bước đã làm, kết quả, nguồn tham khảo, điểm chưa rõ.\nNgười bảo trì đọc/sửa tóm tắt trước khi gửi.\nNút “Gửi yêu cầu”, “Quay lại ca”. Nếu có yêu cầu đang chờ: mở/cập nhật yêu cầu đó.');
  s.m('worker','ui','Nhấn Yêu cầu chuyên gia; nhập lý do');s.m('ui','svc','Lấy dữ liệu ca để lập bàn giao');s.m('svc','db','Đọc ca, timeline, các bước đã thử và yêu cầu đang mở');s.r('db','svc','Dữ liệu thực tế đã lưu');s.m('svc','ai','Tóm tắt dữ kiện và câu hỏi còn mở, không thêm kết luận');
  s.alt([
    ['Tóm tắt AI thành công',s=>s.r('ai','svc','Bản tóm tắt gắn nguồn trong ca')],
    ['AI không sẵn sàng',s=>{s.r('ai','svc','Không có bản tóm tắt');s.m('svc','svc','Dùng mẫu bàn giao từ dữ kiện đã lưu; không chặn gọi chuyên gia');}],
  ]);
  s.r('svc','ui','Bản bàn giao để người bảo trì kiểm tra');s.m('worker','ui','Sửa/xác nhận tóm tắt; nhấn Gửi yêu cầu');s.m('ui','svc','Gửi yêu cầu hỗ trợ gắn caseId và người phụ trách');s.m('svc','db','Tạo/cập nhật yêu cầu Chờ chuyên gia, lưu bản bàn giao');s.r('svc','ui','Đã gửi yêu cầu; người phụ trách ca không đổi');s.async('svc','expertui','Hiện yêu cầu cho chuyên gia phù hợp trong ứng dụng');
  s.phase('2. Chuyên gia đọc và tiếp nhận');
  s.ui('UI-21 · Chờ chuyên gia / tiếp nhận','Người bảo trì thấy trạng thái: đã gửi, đã tiếp nhận, đang tham gia; không giả định chuyên gia đã có mặt.\nChuyên gia thấy máy/khu vực, người gọi, lý do, bản bàn giao và timeline.\nNút chuyên gia: “Nhận hỗ trợ”, “Chưa thể hỗ trợ” kèm lý do.\nNhận hỗ trợ khác thời điểm bắt đầu tham gia; ghi cả hai khi cần.\nNếu chưa có người nhận: tiếp tục theo dõi hoặc bàn giao theo quy định.');
  s.m('expert','expertui','Mở yêu cầu hỗ trợ');s.m('expertui','svc','Đọc yêu cầu và ca theo quyền');s.m('svc','db','Lấy bản bàn giao và dữ liệu mới nhất');s.r('svc','expertui','Nội dung ca, phạm vi, thời gian và người phụ trách');
  s.alt([
    ['Chưa thể tiếp nhận',s=>{s.m('expert','expertui','Chọn Chưa thể hỗ trợ; ghi lý do');s.m('expertui','svc','Lưu phản hồi chưa tiếp nhận');s.m('svc','db','Giữ yêu cầu chờ người phù hợp; lưu phản hồi');s.async('svc','ui','Thông báo chưa có chuyên gia nhận; vẫn giữ ca');s.ref('SQ11','Người bảo trì chọn tiếp tục điều tra trong điều kiện cho phép hoặc bàn giao');}],
    ['Chuyên gia nhận hỗ trợ',s=>{
      s.m('expert','expertui','Nhấn Nhận hỗ trợ');s.m('expertui','svc','Xác nhận tiếp nhận bằng tài khoản chuyên gia');s.m('svc','db','Gắn chuyên gia vào ca và thời điểm nhận; giữ chủ ca');s.async('svc','ui','Thông báo chuyên gia đã nhận hỗ trợ');
      s.m('expert','expertui','Bắt đầu tham gia; chọn công đoạn và thời điểm thực tế');s.m('expertui','svc','Ghi thời điểm tham gia, vai trò và công đoạn');s.m('svc','db','Lưu participantId, performedAt và recordedAt');s.r('svc','expertui','Đã ghi tham gia; mở phần ghi nhận chuyên gia');
      s.loop('Trong khi chuyên gia điều tra / hướng dẫn / trực tiếp thao tác',s=>{
        s.m('expert','expertui','Nhập nhận định, bước kiểm tra/hướng dẫn/việc đã làm và kết quả');s.m('expertui','svc','Lưu sự kiện theo caseId và tài khoản đang thực hiện');s.m('svc','db','Lưu ai làm gì, lúc nào, ở công đoạn nào và căn cứ');s.r('svc','expertui','Đã lưu đóng góp');s.async('svc','ui','Cập nhật timeline để người bảo trì cùng theo dõi');
      });
      s.ref('SQ11','Đánh giá phương án, phối hợp xử lý hoặc chọn điều tra tiếp/bàn giao');
    }],
  ]);
  s.note('Nếu người bảo trì nhập hộ thông tin chuyên gia, lưu riêng người nhập và người thực hiện; để trạng thái chờ chuyên gia xác nhận. Không dùng tài khoản người bảo trì để xác nhận thay chuyên gia.');

  s=page('SQ11','Thực hiện, kiểm tra kết quả và bàn giao ca',['worker','ui','svc','db','kb'],{
    short:'Chốt người làm, an toàn, nhật ký, đạt/chưa đạt; ca chờ được tiếp tục đúng ID.',
    pre:'Có phương án tham khảo từ SQ09/SQ10, hoặc công việc định kỳ từ SQ08; ca chưa hoàn tất.',
    post:'Ca đủ điều kiện sang báo cáo, hoặc giữ Chưa hoàn tất để điều tra tiếp/bàn giao.',
    bpmn:['r-action-merge','r-plan','r-act','r-verify','r-ok','r-next','r-open-save','r-wait','r-routine'],
  });
  s.phase('1. Chốt phương án và điều kiện thực hiện');
  s.ui('UI-22 · Phương án và điều kiện an toàn','Hiện hướng đã chọn, nguồn/phiên bản, điều kiện áp dụng, người dự kiến làm và giới hạn thẩm quyền.\nCông việc định kỳ dùng quy trình đã phê duyệt của máy; không bắt buộc AI chẩn đoán khi không có bất thường.\nHiện nội dung an toàn tương ứng và người xác nhận điều kiện; không chỉ đánh dấu chung “AI đã kiểm tra”.\nNút “Xác nhận phương án”, “Tiếp tục điều tra”, “Yêu cầu chuyên gia”, “Dừng và bàn giao”.\nThiếu căn cứ/quy trình/phê chuẩn cần thiết: chưa cho ghi nhận bắt đầu theo hướng đề xuất.');
  s.m('worker','ui','Mở phương án hoặc công việc định kỳ');s.m('ui','svc','Lấy bối cảnh, phương án và quy trình tương ứng');s.m('svc','db','Đọc ca và các quyết định trước');s.m('svc','kb','Lấy nguồn và quy trình đang có hiệu lực');s.r('kb','svc','Bản được duyệt hoặc thông tin chưa có');s.r('svc','ui','Điều kiện cần xác nhận và dữ liệu hiện tại');s.m('worker','ui','Đánh giá điều kiện, chọn người làm và xác nhận');s.m('ui','svc','Gửi lựa chọn, xác nhận thực tế và revision của ca');
  s.alt([
    ['Có phương án đủ điều kiện và đúng thẩm quyền',s=>{
      s.m('svc','db','Lưu kế hoạch và người xác nhận; chuyển Đang xử lý');s.r('svc','ui','Đã ghi phương án; mở nhật ký thực hiện');
      s.loop('Mỗi bước công việc thực tế',s=>{
        s.m('worker','ui','Ghi thao tác đã làm, người thực hiện, thời điểm và kết quả');s.m('ui','svc','Lưu sự kiện; phân biệt đã làm và dự kiến');s.m('svc','db','Ghi nhật ký; giữ nguồn được áp dụng và các sai khác');s.r('svc','ui','Đã lưu bước; cập nhật timeline và người tham gia');
      });
      s.opt('Chuyên gia trực tiếp thực hiện hoặc hướng dẫn',s=>s.ref('SQ10','Phần ghi đóng góp; chuyên gia dùng tài khoản của mình, không tạo lại yêu cầu hỗ trợ'));
      s.m('worker','ui','Nhập kiểm tra sau xử lý / sau bảo trì; xác nhận đạt hay chưa');s.m('ui','svc','Lưu số đo, tiêu chí kiểm tra và kết quả thực tế');s.m('svc','db','Lưu sự kiện kiểm tra; chưa tự đóng ca');
      s.alt([
        ['Đạt tiêu chí hoàn tất công việc',s=>{s.r('svc','ui','Có thể hoàn thiện báo cáo');s.r('ui','worker','Kết quả đã lưu. Hoàn thiện báo cáo để kết thúc ca.');s.ref('SQ12','Báo cáo và xác nhận đóng góp');}],
        ['Chưa đạt / phát hiện bất thường khi bảo trì định kỳ',s=>{s.r('svc','ui','Giữ ca chưa hoàn tất; hiện lựa chọn tiếp theo');s.note('Đi tới khối 2 bên dưới: tiếp tục điều tra/gọi hỗ trợ hoặc dừng/bàn giao.');}],
      ]);
    }],
    ['Chưa có phương án hoặc không đủ điều kiện xử lý',s=>{s.m('svc','db','Ghi điều kiện chưa đạt và lý do chưa thao tác');s.r('svc','ui','Chưa đủ điều kiện xử lý; cần chọn điều tra tiếp hoặc bàn giao');s.note('Bám nhánh BPMN mới: r-action-merge → r-next, không tự ép chuyển sang bàn giao.');}],
  ]);
  s.phase('2. Chỉ khi chưa đủ điều kiện hoặc kiểm tra chưa đạt');
  s.ui('UI-23 · Chưa hoàn tất / bàn giao','Chọn “Tiếp tục điều tra”, “Yêu cầu chuyên gia” hoặc “Dừng và bàn giao”.\nBàn giao nhập: lý do dừng, tình trạng máy thực tế, việc đã làm, việc còn lại, người/đơn vị nhận theo quyền, lưu ý và thời điểm.\nThông báo “Đã lưu bàn giao. Ca chưa hoàn tất.”\nKết thúc phiên không đồng nghĩa sửa xong hoặc máy được phép chạy.\nMở lại ca dùng cùng caseId và toàn bộ lịch sử, không tạo ca trùng.');
  s.opt('Ca vẫn chưa hoàn tất và chưa chuyển sang báo cáo',s=>{
    s.m('worker','ui','Chọn bước tiếp theo');
    s.alt([
      ['Tiếp tục điều tra trong điều kiện cho phép',s=>{s.m('ui','svc','Ghi quyết định tiếp tục và câu hỏi cần làm rõ');s.m('svc','db','Cập nhật ca Đang điều tra');s.ref('SQ09','Bổ sung dữ kiện, tra cứu lại và chọn hướng');}],
      ['Gọi chuyên gia',s=>s.ref('SQ10','Tạo hoặc cập nhật yêu cầu hỗ trợ trên ca hiện tại')],
      ['Dừng và bàn giao',s=>{
        s.m('worker','ui','Nhập thông tin bàn giao; nhấn Lưu và kết thúc phiên');s.m('ui','svc','Lưu bàn giao; yêu cầu giữ ca chưa hoàn tất');s.m('svc','db','Ghi Chờ xử lý/bàn giao, người phụ trách và việc còn lại');s.r('db','svc','Bản bàn giao đã lưu');s.r('svc','ui','Đã lưu; ca vẫn mở trong lịch sử máy');s.r('ui','worker','Đã lưu bàn giao. Ca chưa hoàn tất.');
      }],
    ]);
  });
  s.phase('3. Tiếp tục ca đã bàn giao — ở phiên làm việc sau');
  s.opt('Có ca chờ và người tiếp tục được phép truy cập',s=>{
    s.m('worker','ui','Mở ca từ Ca của tôi / lịch sử máy; nhấn Tiếp tục');s.m('ui','svc','Đọc dữ kiện mới nhất và quyền tiếp nhận');s.m('svc','db','Ghi sự kiện tiếp tục; đổi người phụ trách chỉ khi được phép');s.r('svc','ui','Bản bàn giao, việc còn lại và timeline đầy đủ');s.ref('SQ09','Xác nhận lại bối cảnh rồi điều tra/xử lý tiếp');
  });

  s=page('SQ12','Báo cáo kết quả và xác nhận đóng góp',['worker','ui','svc','db','expertui','expert'],{
    short:'Kết quả thực tế, chuyên gia xác nhận phần mình, hoàn tất ca và đính chính có dấu vết.',
    pre:'Kết quả kiểm tra cho phép hoàn tất công việc; nhật ký trong ca đã được lưu liên tục.',
    post:'Có báo cáo hoàn tất trong lịch sử máy; nếu chưa đủ xác nhận thì giữ báo cáo chờ xác nhận và mọi nhật ký.',
    bpmn:['r-report','r-expert-used','r-confirm','r-confirm-merge','r-history'],
  });
  s.phase('1. Tổng hợp và xác nhận báo cáo thực tế');
  s.ui('UI-24 · Hoàn thiện báo cáo ca','Điền sẵn từ nhật ký, người bảo trì phải kiểm tra.\nHiện: máy/ca; thời gian; dấu hiệu ban đầu; nguyên nhân đã xác nhận hoặc chưa xác định; hướng đã chọn; thao tác thực tế; kết quả và kiểm tra sau xử lý.\nGhi khác biệt với nguồn/đề xuất AI; bước không áp dụng và lý do; việc còn theo dõi trung/dài hạn.\nDanh sách người làm: ai, vai trò, từ công đoạn/thời điểm nào, việc làm và trạng thái xác nhận.\nNút “Lưu báo cáo”, “Gửi xác nhận chuyên gia”, “Hoàn tất ca” theo điều kiện.');
  s.m('worker','ui','Mở Hoàn thiện báo cáo');s.m('ui','svc','Lấy nhật ký và báo cáo đang soạn');s.m('svc','db','Đọc sự kiện, người tham gia, nguồn tham khảo và kết quả');s.r('svc','ui','Bản tổng hợp từ dữ kiện đã ghi');s.m('worker','ui','Kiểm tra, bổ sung kết quả và nguyên nhân; xác nhận phần mình');s.m('ui','svc','Lưu báo cáo cùng revision và xác nhận người phụ trách');s.m('svc','db','Lưu báo cáo nháp và phần xác nhận; không xóa lịch sử');s.r('svc','ui','Đã lưu; danh sách mục/đóng góp cần xác nhận');
  s.phase('2. Kiểm tra trường hợp có chuyên gia tham gia');
  s.ui('UI-25 · Xác nhận đóng góp chuyên gia','Nếu có chuyên gia: người bảo trì gửi xác nhận cho từng người tham gia.\nChuyên gia thấy riêng phần mình và bối cảnh báo cáo, có “Xác nhận đúng” / “Yêu cầu sửa” kèm nội dung.\nHiện trạng thái từng người; chưa đủ xác nhận thì “Báo cáo chờ xác nhận”, không báo đã hoàn tất.\nSửa phần đã xác nhận làm thay đổi ý nghĩa: yêu cầu xác nhận lại phần bị ảnh hưởng.');
  s.alt([
    ['Không có chuyên gia tham gia',s=>{s.m('svc','svc','Không yêu cầu bước xác nhận chuyên gia');s.r('svc','ui','Có thể hoàn tất nếu dữ liệu báo cáo hợp lệ');}],
    ['Có chuyên gia tham gia',s=>{
      s.m('worker','ui','Nhấn Gửi xác nhận chuyên gia');s.m('ui','svc','Yêu cầu xác nhận phần đóng góp theo reportRevision');s.m('svc','db','Ghi Chờ xác nhận cho từng chuyên gia');s.async('svc','expertui','Thông báo cần xác nhận đóng góp');
      s.loop('Mỗi chuyên gia xác nhận phần của mình',s=>{
        s.m('expert','expertui','Mở yêu cầu và đọc phần đóng góp');s.m('expertui','svc','Đọc báo cáo hiện tại và đúng phần chuyên gia');s.r('svc','expertui','Nội dung, revision và các sự kiện liên quan');
        s.alt([
          ['Cần sửa',s=>{s.m('expert','expertui','Ghi phần chưa đúng và yêu cầu sửa');s.m('expertui','svc','Lưu phản hồi; chưa xác nhận');s.m('svc','db','Giữ bản báo cáo và yêu cầu sửa có người nhận xét');s.async('svc','ui','Hiện mục cần sửa cho người bảo trì');s.m('worker','ui','Sửa dữ kiện có căn cứ; gửi lại phần cần xác nhận');s.m('ui','svc','Lưu revision mới; yêu cầu xác nhận phần bị ảnh hưởng');s.m('svc','db','Lưu thay đổi và đặt lại xác nhận cần thiết');}],
          ['Nội dung đúng',s=>{s.m('expert','expertui','Nhấn Xác nhận đúng');s.m('expertui','svc','Xác nhận phần đóng góp gắn tài khoản và revision');s.m('svc','db','Lưu người xác nhận, thời gian và nội dung được xác nhận');s.r('svc','expertui','Đã xác nhận phần đóng góp');s.async('svc','ui','Cập nhật trạng thái chuyên gia đã xác nhận');}],
        ]);
      });
    }],
  ]);
  s.phase('3. Lưu báo cáo hoàn tất và lịch sử máy');
  s.m('worker','ui','Nhấn Hoàn tất ca; xác nhận nội dung báo cáo cuối');s.m('ui','svc','Yêu cầu hoàn tất với reportRevision đang xem');s.m('svc','db','Kiểm tra dữ kiện bắt buộc, kết quả và các xác nhận đúng revision');
  s.alt([
    ['Thiếu dữ kiện / còn chờ xác nhận / báo cáo vừa thay đổi',s=>{s.r('svc','ui','Không hoàn tất; trả mục còn thiếu hoặc cần xác nhận lại');s.r('ui','worker','Báo cáo đã được lưu; còn việc cần hoàn thiện trước khi kết thúc ca.');}],
    ['Hợp lệ',s=>{s.m('svc','db','Lưu báo cáo hoàn tất, thời điểm, người thực hiện và lịch sử máy');s.r('db','svc','Đã lưu bền vững; ca Hoàn tất');s.r('svc','ui','Đã hoàn tất ca; mở báo cáo và bước đề xuất tri thức');s.r('ui','worker','Đã lưu báo cáo vào lịch sử máy.');s.ref('SQ13','Đánh giá giá trị tái dùng; không chặn việc lưu lịch sử đã xong');}],
  ]);
  s.note('Sau hoàn tất, muốn sửa dữ kiện thực tế phải tạo đính chính có lý do, trước/sau, người sửa và các xác nhận bị ảnh hưởng. Giữ bản cũ. Nếu đã có tri thức xuất bản dựa trên dữ kiện đó, tạo đề xuất cập nhật để người duyệt xem lại; không tự thay kho đã duyệt.');

  s=page('SQ13','Từ báo cáo ca thành đề xuất tri thức',['worker','ui','svc','db','ai','kb'],{
    short:'Giữ mọi lịch sử ca; AI đề xuất liên kết/cập nhật/tạo mới; người bảo trì xác nhận.',
    pre:'Báo cáo toàn bộ hồ sơ đã xác nhận ở SQ12, kể cả kết thúc chưa khắc phục đúng thẩm quyền, hoặc đề xuất được trả bổ sung ở SQ06.',
    post:'Chỉ giữ lịch sử, hoặc có đề xuất Liên kết/Cập nhật/Case mới được gửi kiểm duyệt.',
    bpmn:['r-diff','r-proposal','r-useful','r-only-history','r-history-end'],
  });
  s.phase('1. Đối chiếu báo cáo với kho tri thức');
  s.ui('UI-26 · Giá trị tái sử dụng của hồ sơ','Hiện Báo cáo đã xác nhận và lưu vào lịch sử máy.\nBên trái là dữ kiện của tất cả đợt, gồm các lần chưa hiệu quả; bên phải là nguồn tương tự và gợi ý AI.\nSo hiện tượng, điều kiện/model sản phẩm/5M1E, kiểm tra, căn cứ, nguyên nhân, bước xử lý, kết quả, điều kiện áp dụng và an toàn.\nBài học từ lần chưa hiệu quả giữ đúng phạm vi bằng chứng; không kết luận phương pháp luôn vô dụng hoặc nguyên nhân chắc chắn bị loại trừ.\nPhân biệt đã chứng minh và còn giả thuyết. Kết thúc chưa khắc phục không được ghi thành sửa thành công.\nLỗi AI không làm mất lịch sử hoặc đổi kết quả thực tế.');
  s.m('ui','svc','Yêu cầu đối chiếu reportId/revision đã xác nhận và đề xuất đang sửa nếu có');s.m('svc','db','Đọc báo cáo, các đợt/sự kiện được dẫn chứng và đề xuất hiện tại');s.r('db','svc','Báo cáo bất biến, bằng chứng thành công/chưa hiệu quả và giới hạn');s.m('svc','ai','Tìm nội dung tương tự và gợi ý giá trị tái dùng có căn cứ');s.m('ai','kb','Tra tri thức chuyên gia và case đã duyệt liên quan');s.r('kb','ai','Các nguồn và phiên bản');s.r('ai','svc','Gợi ý liên kết/cập nhật/mới hoặc không có giá trị mới; kèm căn cứ');s.m('svc','db','Lưu lần đối chiếu; không ghi đè nguồn hoặc báo cáo');s.r('svc','ui','Kết quả để người bảo trì xác nhận');
  s.phase('2. Người bảo trì chọn cách ghi nhận');
  s.ui('UI-27 · Chọn đề xuất từ ca','Lựa chọn “Chỉ lưu lịch sử” / “Liên kết case đã có” / “Bổ sung tri thức đã có” / “Tạo case tri thức mới”.\nLiên kết: chọn nguồn/phiên bản và lý do phù hợp.\nCập nhật: ghi phần khác và phạm vi bổ sung.\nCase mới: tiêu đề, bối cảnh, nguyên nhân, kiểm tra/xử lý, kết quả, bài học, điều kiện và an toàn.\nTác giả/người đóng góp lấy từ ca, có thể bổ sung đúng thực tế; người gửi không mặc nhiên là người làm mọi thao tác.');
  s.m('worker','ui','Đọc báo cáo và đối chiếu; chọn cách ghi nhận');
  s.alt([
    ['Chỉ lưu lịch sử; không có đề xuất',s=>{s.m('ui','svc','Ghi quyết định không tạo tri thức và lý do tùy trường hợp');s.m('svc','db','Giữ hồ sơ, kết quả thực tế và nguồn đã tham khảo; không tạo hồ sơ duyệt');s.r('svc','ui','Đã ghi nhận; lịch sử và kết quả chưa khắc phục nếu có vẫn được giữ');s.r('ui','worker','Báo cáo đã được xác nhận và lưu. Không có đề xuất tri thức mới.');}],
    ['Liên kết với case/tri thức đã có',s=>{s.m('worker','ui','Chọn nguồn/phiên bản đích; nêu lý do phù hợp');s.m('ui','svc','Tạo/đổi đề xuất Liên kết, gắn caseId và targetVersion');s.m('svc','db','Lưu đề xuất liên kết chưa duyệt; giữ sự kiện ca độc lập');s.r('svc','ui','Đề xuất liên kết sẵn sàng xem lại');}],
    ['Bổ sung nội dung có giá trị vào tri thức cũ',s=>{s.m('worker','ui','Chọn bản gốc; nhập khác biệt và bài học bổ sung');s.m('ui','svc','Lưu đề xuất Cập nhật, baseVersion và phần mới');s.m('svc','db','Giữ báo cáo nguồn, phiên bản gốc và đề xuất riêng');s.r('svc','ui','Bảng gốc/đề xuất và người đóng góp');}],
    ['Tạo case tri thức mới',s=>{s.m('worker','ui','Hoàn thiện biểu mẫu tái sử dụng từ báo cáo');s.m('ui','svc','Lưu đề xuất Mới với nguồn và phạm vi áp dụng');s.m('svc','db','Lưu nháp; tách nội dung tri thức khỏi báo cáo thực tế');s.r('svc','ui','Biểu mẫu case mới và thông tin còn thiếu');}],
  ]);
  s.opt('Có đề xuất tri thức cần gửi',s=>{
    s.loop('Cho đến khi các trường bắt buộc và khác biệt đã được xác nhận',s=>{s.m('worker','ui','Sửa/xác nhận nội dung; phối hợp chuyên gia nếu cần');s.m('ui','svc','Lưu đề xuất, đóng góp và kiểm tra điều kiện');s.m('svc','db','Lưu revision đề xuất; không thay báo cáo hoàn tất');s.r('svc','ui','Danh sách mục còn thiếu hoặc đủ điều kiện gửi');});
    s.note('Nếu nội dung đề xuất thay đổi đáng kể so với bản đã đối chiếu, chạy lại khối 1. Cập nhật giữ proposalId; không tạo thêm một đề xuất cho mỗi lần sửa.');
    s.ref('SQ04','Người bảo trì xác nhận và gửi; các loại Liên kết/Cập nhật/Mới đều qua người duyệt');
  });
  s.note('Nếu AI đối chiếu lỗi: hiện “Lịch sử ca đã được lưu; chưa đối chiếu được tri thức”. Có thể lưu đề xuất đang soạn và thử lại sau; chưa coi đề xuất đã đủ bước gửi.');

  s=page('SQ14','Mở nguồn tri thức và ghi nhận việc tham khảo',['user','ui','svc','db','kb'],{
    short:'Đọc bản đã duyệt, xem điều kiện, giữ ngữ cảnh ca và phản hồi gắn đúng phiên bản.',
    pre:'Người dùng mở nguồn từ đối chiếu, kết quả tra cứu hoặc thư viện; quyền truy cập đã được cấp.',
    post:'Đọc được đúng phiên bản; khi làm ca có dấu vết tham khảo và phản hồi gắn ca, không sửa trực tiếp kho.',
    bpmn:['k-read','r-assess'],
  });
  s.phase('1. Mở bản đầy đủ để tự đánh giá');
  s.ui('UI-28 · Chi tiết tri thức / case đã duyệt','Hiện tên, loại nội dung, máy/phạm vi, tác giả/người đóng góp, người duyệt, ngày và phiên bản.\nNội dung: triệu chứng/bối cảnh, nguyên nhân và bằng chứng, kiểm tra, hướng xử lý, kết quả, điều kiện, giới hạn, an toàn và bài học.\nCó liên kết nguồn/báo cáo theo quyền; dữ liệu nhạy cảm không được mở chỉ vì biết ID.\nNguồn đang được xem giữ đúng phiên bản đã trích dẫn; nếu có bản mới thì gắn nhãn và cho đối chiếu.\nNút “Quay lại kết quả”, “Xem phiên bản hiện hành”, “Ghi nhận tham khảo” khi đang có ca.');
  s.m('user','ui','Chọn Mở nguồn trên thẻ kết quả');s.m('ui','svc','Đọc knowledgeId/version kèm ngữ cảnh draftId hoặc caseId');s.m('svc','db','Kiểm tra quyền đối tượng, trạng thái duyệt và hiệu lực');s.r('db','svc','Quyền và phiên bản được phép xem');
  s.alt([
    ['Không có quyền hoặc nguồn không còn dùng được',s=>{s.r('svc','ui','Không trả nội dung làm hướng dẫn');s.r('ui','user','Nguồn này chưa thể dùng. Tải lại kết quả hoặc yêu cầu hỗ trợ.');s.stop('Không cho đánh dấu nguồn không hợp lệ là hướng xử lý áp dụng.');}],
    ['Nguồn có thể xem',s=>{s.m('svc','kb','Lấy toàn văn đúng phiên bản được trích');s.r('kb','svc','Nội dung, tác giả, phê duyệt và phiên bản hiện hành nếu khác');s.r('svc','ui','Chi tiết nguồn và nhãn phiên bản');s.r('ui','user','Mở panel/trang chi tiết; giữ vị trí và ngữ cảnh tra cứu trước');}],
  ]);
  s.phase('2. Ghi phản hồi ngay trong ca đang làm');
  s.ui('UI-29 · Tham khảo / áp dụng trong ca','Phân biệt: “Đã đọc” / “Chọn làm hướng tham khảo” / “Đã thực hiện” / “Kết quả sau áp dụng”.\nPhản hồi: phù hợp, áp dụng một phần, không áp dụng được; ghi điểm khác và lý do.\nChọn nguồn không tự đánh dấu sửa xong; kết quả thực tế lấy từ nhật ký/báo cáo.\nNgoài ca đang làm: chỉ tra cứu; không tạo case sửa chữa giả chỉ để lưu một lần đọc.');
  s.opt('Người dùng đang làm một ca và muốn ghi nguồn tham khảo',s=>{
    s.m('user','ui','Chọn Ghi nhận tham khảo; đánh giá mức phù hợp và ghi lý do');s.m('ui','svc','Ghi caseId, knowledgeId/version, loại sử dụng và nhận xét');s.m('svc','db','Lưu sự kiện tham khảo vào ca, gắn người và thời gian');s.r('svc','ui','Đã ghi nguồn vào ca; chưa coi thao tác đã thực hiện');s.r('ui','user','Đã lưu nhận xét vào ca hiện tại.');
  });
  s.opt('Phát hiện kiến thức thiếu/sai trong khi thực hiện ca',s=>{s.m('user','ui','Ghi điểm khác hoặc vấn đề vào nhật ký ca');s.m('ui','svc','Lưu nhận xét và nguồn liên quan');s.m('svc','db','Giữ dữ kiện trong ca để đưa vào báo cáo/đề xuất');s.r('svc','ui','Đã ghi; có thể đề xuất cập nhật sau khi xác minh');});
  s.note('Đọc nguồn là thao tác hỗ trợ, không phê duyệt thêm lần nữa. Phản hồi được giữ trong ca và chỉ trở thành tri thức xuất bản khi đi qua SQ13 → SQ04 → SQ05.');

  s=page('SQ15','Ngoại lệ dùng chung và bảo toàn dữ liệu đang nhập',['user','ui','svc','db','ai'],{
    short:'Lỗi lưu, phiên hết hạn, xung đột sửa, AI lỗi/kết quả cũ và chống gửi lặp.',
    pre:'Một màn hình đang nhập, gửi hoặc xử lý AI; đây là các chi tiết tương tác bổ sung cho prototype.',
    post:'Người dùng biết dữ liệu đã được lưu hay chưa và có thao tác phục hồi; không ghi đè hoặc báo thành công sai.',
    bpmn:[],
  });
  s.note('Các khối opt bên dưới là những tình huống độc lập, có thể xảy ra ở nhiều trang. Không yêu cầu chạy lần lượt tất cả các tình huống. Prototype có thể mô phỏng phản hồi lỗi; chưa yêu cầu triển khai đầy đủ chế độ làm việc offline.');
  s.phase('A. Lưu thất bại hoặc mất mạng');
  s.ui('UI-30 · Trạng thái lưu và rời màn hình','Nhãn rõ: Chưa lưu / Đang lưu / Đã lưu lúc… / Chưa lưu được.\nLỗi: “Chưa lưu được thay đổi. Giữ màn hình và thử lại.”\nNút “Thử lưu lại”; giữ nguyên nội dung đang nhập.\nRời màn hình khi chưa lưu: “Lưu rồi rời”, “Ở lại”, “Rời và bỏ thay đổi” có xác nhận.\nNếu có lưu tạm cục bộ, chỉ ghi “Đã giữ tạm trên thiết bị”; không gọi là đã lưu lên hệ thống.');
  s.opt('Lưu bị lỗi hoặc không nhận được xác nhận',s=>{
    s.m('ui','svc','Gửi bản thay đổi đang nhập');s.r('svc','ui','Lỗi lưu / hết thời gian; chưa xác nhận hoàn tất');s.r('ui','user','Chưa lưu được thay đổi; nội dung vẫn còn trên màn hình');s.m('user','ui','Nhấn Thử lưu lại');s.m('ui','svc','Gửi lại cùng mã lần lưu hoặc kiểm tra kết quả lần trước');s.m('svc','db','Kiểm tra đã ghi chưa; chỉ ghi thêm nếu chưa có');s.r('db','svc','Kết quả thực tế đã lưu và revision');s.r('svc','ui','Xác nhận đã lưu');s.r('ui','user','Hiện Đã lưu lúc…');
  });
  s.phase('B. Phiên hết hạn trong lúc nhập');
  s.ui('UI-31 · Khôi phục phiên','Hiện “Phiên làm việc đã hết hạn. Đăng nhập lại để tiếp tục.”\nGiữ dữ liệu chưa gửi trong ngữ cảnh tài khoản hiện tại; không tự bỏ biểu mẫu.\nSau đăng nhập cùng tài khoản: trở về đúng đối tượng, kiểm tra quyền và phiên bản trước khi lưu.\nĐăng nhập bằng tài khoản khác: không tự gửi dữ liệu nháp của tài khoản trước.');
  s.opt('Máy chủ báo phiên hết hạn',s=>{s.m('ui','svc','Yêu cầu lưu/đọc với phiên cũ');s.r('svc','ui','Phiên không hợp lệ; không thực hiện thay đổi');s.r('ui','user','Hiện yêu cầu đăng nhập lại, giữ phần nhập hiện tại');s.ref('SQ01','Đăng nhập lại; kiểm tra cùng người dùng và quyền trên đối tượng');s.m('ui','svc','Lấy trạng thái và revision mới nhất');s.r('svc','ui','Bản hiện tại; cho phục hồi nếu cùng người dùng và không xung đột');});
  s.phase('C. Hai người hoặc hai phiên cùng sửa');
  s.ui('UI-32 · Xung đột phiên bản','Hiện “Nội dung đã được cập nhật ở phiên khác”.\nCho xem bản trên hệ thống và thay đổi chưa lưu của mình.\nNút “Tải bản mới”, “Giữ nội dung để đối chiếu”, “Áp dụng lại phần đã chọn”.\nKhông có nút ghi đè im lặng; sau gộp phải kiểm tra/đối chiếu lại khi cần.');
  s.opt('Revision gửi lên khác bản hiện tại',s=>{s.m('ui','svc','Lưu thay đổi dựa trên revision cũ');s.m('svc','db','So revision trước khi ghi');s.r('db','svc','Có revision mới hơn');s.r('svc','ui','Từ chối ghi đè; trả bản mới và thông tin khác biệt');s.m('user','ui','Đọc khác biệt; chọn phần muốn áp dụng lại');s.m('ui','svc','Gửi bản đã hợp nhất theo revision mới');s.m('svc','db','Lưu có kiểm tra phiên bản');s.r('svc','ui','Đã lưu; yêu cầu xác nhận/đối chiếu lại nếu nội dung thay đổi');});
  s.phase('D. AI chậm, lỗi hoặc kết quả không còn đúng bản đang nhập');
  s.ui('UI-33 · Trạng thái AI','Đang xử lý: có mô tả tác vụ; không báo kết quả khi chưa có.\nLỗi: “Chưa nhận được kết quả AI. Dữ liệu đã nhập vẫn được giữ.”\nCó thể thử lại, tự sửa biểu mẫu, đọc nguồn còn hợp lệ hoặc yêu cầu chuyên gia tùy tác vụ.\nKết quả đến muộn trên dữ liệu cũ: “Kết quả dựa trên bản trước”; chọn chạy lại hoặc chỉ xem tham khảo.\nKhông tự chèn đè lên nội dung người dùng vừa sửa.');
  s.opt('AI không trả kết quả dùng được',s=>{s.m('svc','ai','Gửi yêu cầu gắn requestId và revision nguồn');s.r('ai','svc','Lỗi / thiếu cấu trúc / nguồn không hợp lệ');s.r('svc','ui','Không có kết quả hợp lệ; giữ dữ kiện và nguồn còn dùng được');s.r('ui','user','Hiện lựa chọn phục hồi phù hợp; không tự sinh nội dung thay thế');});
  s.opt('AI trả kết quả sau khi người dùng đã sửa bản nguồn',s=>{s.r('ai','svc','Kết quả gắn revision trước');s.m('svc','db','So revision nguồn với revision hiện tại');s.r('db','svc','Bản nguồn đã thay đổi');s.r('svc','ui','Kết quả cũ chỉ được xem tham khảo, chưa áp dụng');s.m('user','ui','Chọn Chạy lại trên bản mới hoặc Giữ bản hiện tại');});
  s.phase('E. Nhấn gửi lặp hoặc không biết lần gửi trước đã thành công chưa');
  s.ui('UI-34 · Chống tạo trùng do thao tác','Khi tạo ca/gửi đề xuất/ra quyết định: khóa nút trong lần gửi.\nNếu mất phản hồi: cho “Kiểm tra kết quả” hoặc thử lại cùng thao tác.\nMáy chủ dùng mã lần thao tác để trả cùng kết quả; không tạo thêm ca, đề xuất, quyết định hoặc phiên bản.\nChỉ hiển thị toast thành công khi biết kết quả đã được ghi.');
  s.opt('Lặp lại một thao tác đã gửi',s=>{s.m('user','ui','Nhấn lại hoặc kiểm tra kết quả sau mất phản hồi');s.m('ui','svc','Gửi cùng mã thao tác và đối tượng');s.m('svc','db','Đọc kết quả nếu thao tác đã được ghi');s.r('db','svc','ID/trạng thái đã có, hoặc xác nhận chưa thực hiện');s.r('svc','ui','Trả kết quả đã có; chỉ thực hiện lần đầu nếu chưa ghi');s.r('ui','user','Mở đúng đối tượng và hiển thị trạng thái thực tế');});

  return pages;
};
