// Overrides affected sequences; all other interactions keep their established IDs.
module.exports=({Sequence})=>{
  const pages=require('./sequence-content.cjs')({Sequence});
  const page=(id,title,actors,meta)=>{const s=new Sequence(id,title,actors,meta);const at=pages.findIndex(p=>p.id===id);if(at<0)pages.push(s);else pages[at]=s;return s;};
  let s;
  s=page('SQ08','Mở hồ sơ BM/PM và điền sẵn từ HozenDX',['worker','ui','svc','db','hozen'],{
    short:'Mở mới/tiếp tục đúng hồ sơ; dùng dữ liệu có sẵn; PM có lịch tích hợp hoặc checklist cấu hình.',
    pre:'Người bảo trì mở sự cố, công việc PM, quét mã máy hoặc tiếp tục một hồ sơ được phép xem.',
    post:'Có hồ sơ đúng máy, bối cảnh được xác nhận và nguồn dữ liệu; hồ sơ chỉ chờ báo cáo mở thẳng bước xác nhận.',
    bpmn:['r-start','r-open','r-entry-state','r-inspect','r-abnormal','e-start','e-select','e-fetch','e-hozen','e-source','e-fallback','e-fallback-valid','e-confirm','e-existing','e-resume','e-type','e-pm-plan','e-pm-import','e-pm-template','e-bm','e-check-context','e-persist','e-end','e-unavailable'],
  });
  s.phase('1. Chọn công việc và lấy dữ liệu theo quyền');
  s.ui('UI-16 · Bắt đầu công việc','Hai lối vào: Sự cố BM / Bảo trì định kỳ PM; có Mở hồ sơ đang chờ.\nChọn công việc có sẵn hoặc quét/nhập mã máy. Camera không dùng được thì nhập mã.\nHiện máy, maker/model máy, năm, thông số, line/khu vực và chủ hồ sơ.\nGắn nhãn HozenDX / dữ liệu mô phỏng / dữ liệu lưu trước; hiện thời điểm lấy.\nKhông tự coi thông tin hệ thống là tình trạng hiện trường mới nhất.');
  s.m('worker','ui','Mở sự cố/việc PM hoặc quét mã máy');s.m('ui','svc','Đọc công việc/máy theo tài khoản và phạm vi');s.m('svc','hozen','Yêu cầu dữ liệu có quyền: máy, BM/PM, chế độ bảo dưỡng, hồ sơ thay đổi');
  s.alt([
    ['Tích hợp trả dữ liệu hợp lệ',s=>{s.r('hozen','svc','Dữ liệu được cung cấp, ID nguồn, phiên bản và thời điểm');s.m('svc','db','Giữ ảnh chụp dữ liệu nguồn, không thay nhật ký thực tế');s.r('svc','ui','Điền sẵn thẻ máy và thông tin công việc');}],
    ['Không có kết nối / lỗi / thiếu dữ liệu',s=>{s.r('hozen','svc','Không có dữ liệu đủ dùng; không giả báo thành công');s.m('svc','db','Đọc bản đã có hoặc cấu hình mô phỏng được ghi nhãn');s.r('db','svc','Dữ liệu có nguồn và thời điểm, hoặc chưa có');s.r('svc','ui','Hiện phần thiếu, độ cũ và lựa chọn xác minh');s.alt([
      ['Xác minh được đúng máy và thông tin cần dùng',s=>{s.m('worker','ui','Xác nhận bản dự phòng; bổ sung dữ kiện hiện trường');s.m('ui','svc','Ghi nguồn dữ liệu và người xác nhận');}],
      ['Chưa xác minh được / ngoài quyền truy cập',s=>{s.r('ui','worker','Chưa thể mở công việc. Kiểm tra mã máy hoặc liên hệ người phụ trách.');s.stop('Không tạo hồ sơ gắn máy chưa xác minh; nội dung đang nhập vẫn được giữ.');}],
    ]);}],
  ]);
  s.phase('2. Tiếp tục hồ sơ hay tạo công việc mới');
  s.m('worker','ui','Xác nhận đúng máy');s.m('ui','svc','Tìm hồ sơ đang mở và công việc liên quan');s.m('svc','db','Đọc caseId, tiến độ, trạng thái báo cáo, đợt và bàn giao');s.r('svc','ui','Các hồ sơ phù hợp để tránh tạo trùng');
  s.alt([
    ['Chọn tiếp tục hồ sơ hiện có',s=>{s.m('worker','ui','Chọn Tiếp tục / Tham gia hồ sơ');s.m('ui','svc','Kiểm tra quyền và tải đúng bước đang chờ');s.r('svc','ui','Giữ caseId, chủ hồ sơ, nhật ký các đợt và việc còn lại');s.opt('Công việc đã kết thúc, chỉ còn báo cáo chờ xác nhận',s=>{s.ref('SQ12','Mở bản báo cáo hiện tại để xác nhận; không tạo đợt xử lý hoặc sửa máy lại');s.stop('Kết thúc thao tác mở công việc; tiếp tục ở luồng báo cáo.');});}],
    ['Tạo hồ sơ mới',s=>{
      s.m('worker','ui','Chọn BM hoặc PM; nêu lý do nếu đã có hồ sơ khác đang mở');
      s.alt([
        ['BM',s=>{s.m('worker','ui','Xác nhận dấu hiệu ban đầu, thời điểm và nguồn báo sự cố');s.note('Nếu tích hợp cung cấp mã sự cố thì điền trước. Q&A không xác nhận cảnh báo tức thời hoặc tự phát sinh công việc.');}],
        ['PM và tích hợp cung cấp công việc/lịch/checklist',s=>{s.m('svc','hozen','Lấy công việc PM được cấp quyền và phiên bản checklist');s.r('hozen','svc','Dữ liệu thực sự có: mã việc, lịch, nội dung, tiêu chuẩn');s.r('svc','ui','Điền công việc PM; các hạng mục chưa có kết quả thực hiện');}],
        ['PM nhưng không có lịch/công việc từ tích hợp',s=>{s.m('svc','db','Lấy mẫu PM đã cấu hình phù hợp máy từ chế độ/tiêu chuẩn bảo dưỡng');s.r('db','svc','Checklist có nguồn/phiên bản, chưa có kết quả');s.r('svc','ui','Cho chọn công việc/mẫu; không bắt tự soạn checklist tại hiện trường');s.m('worker','ui','Xác nhận công việc PM phù hợp');}],
      ]);
      s.m('ui','svc','Tạo hồ sơ bằng mã thao tác, gắn máy, loại việc, chủ hồ sơ và nguồn');s.m('svc','db','Lưu caseId mới và ảnh chụp đầu vào; chưa tự tạo thao tác đã làm');s.r('svc','ui','Đã mở hồ sơ; có thể bắt đầu đợt làm việc');
    }],
  ]);
  s.phase('3. Bổ sung phần chỉ hiện trường mới biết');
  s.ui('UI-17 · Bối cảnh và 5M1E','Dấu hiệu: Alarm, hiện tượng, bộ phận, thời điểm/tần suất. Không ép nhập nguyên nhân.\nĐiều kiện: chế độ vận hành, MODEL SẢN PHẨM (khác model máy), tốc độ, line, ca, môi trường liên quan.\n5M1E: Con người / Máy / Vật liệu-sản phẩm / Phương pháp / Đo lường / Môi trường.\nMỗi nhóm: Có thay đổi / Chưa ghi nhận / Chưa kiểm tra; chỉ mở ô chi tiết khi cần.\nHiện hồ sơ thay đổi từ HozenDX để đối chiếu; chỉ nhập phần thiếu hoặc khác thực tế.');
  s.ui('UI-39 · Dữ liệu nguồn và dữ kiện thực tế','Panel tham chiếu: lịch sử BM, biện pháp cũ, kết quả PM, SOP/DAS, bản vẽ, cải tạo, linh kiện/tồn kho nếu được cung cấp.\nNguồn hệ thống và quan sát hiện trường có nhãn, thời điểm riêng.\nNếu khác nhau: hiện cả hai để xác minh; không tự ghi đè lịch sử hoặc dữ liệu HozenDX.\nHồ sơ BM thô là dữ liệu tham chiếu; chưa tự trở thành tri thức đã duyệt cho AI hướng dẫn.');
  s.m('worker','ui','Xác nhận bối cảnh; bổ sung thông tin còn thiếu và 5M1E liên quan');s.m('ui','svc','Lưu quan sát và nguồn riêng với dữ liệu điền sẵn');s.m('svc','db','Lưu contextRevision và dấu vết người ghi');s.r('svc','ui','Đã lưu; mở hành động phù hợp BM/PM');
  s.alt([
    ['Có bất thường cần điều tra',s=>s.ref('SQ09','Tra cứu bằng hiện tượng, điều kiện, kiểm tra và điểm thay đổi')],
    ['PM không có bất thường',s=>s.ref('SQ11','Bắt đầu đợt thực hiện checklist; chỉ nhập kết quả thực tế')],
    ['Chưa đủ điều kiện thực hiện',s=>s.ref('SQ11','Chọn điều tra tiếp hoặc tóm tắt/bàn giao, giữ hồ sơ mở')],
  ]);

  s=page('SQ10','Gọi chuyên gia và phối hợp ghi nhận tại hiện trường',['worker','ui','svc','db','ai','expertui','expert'],{
    short:'Chuyên gia xử lý; người bảo trì vẫn phụ trách, hỗ trợ và ghi nhanh, không đợi cuối ca mới viết.',
    pre:'Hồ sơ và đợt đang mở; cần hỗ trợ hoặc vượt khả năng tự xử lý.',
    post:'Đã ghi chuyên gia tham gia, công đoạn và người hỗ trợ/ghi nhận; hoặc giữ yêu cầu chờ và có đường bàn giao.',
    bpmn:['r-call','r-handover','w-expert-available','r-join','r-investigate'],
  });
  s.phase('1. Gửi yêu cầu bằng dữ kiện đã ghi');
  s.ui('UI-20 · Gọi chuyên gia','Lý do, câu hỏi cần làm rõ, vị trí máy, bối cảnh, các lần thử và kết quả chưa hiệu quả.\nAI soạn bàn giao từ nhật ký; người bảo trì đọc/sửa trước khi gửi.\nCó yêu cầu đang chờ thì mở/cập nhật yêu cầu đó, không tạo trùng.\nChờ chuyên gia vẫn cho ghi thêm nhật ký và lưu bàn giao; không coi đã có người nhận.');
  s.m('worker','ui','Nhấn Yêu cầu chuyên gia; ghi điều cần hỗ trợ');s.m('ui','svc','Lập bàn giao từ caseId, roundId và nhật ký');s.m('svc','db','Đọc toàn bộ đợt liên quan, dữ kiện, bước đã thử và nguồn');s.r('db','svc','Dữ kiện có người/thời điểm; giả thuyết tách khỏi kết luận');s.m('svc','ai','Tóm tắt bối cảnh và việc còn mở');
  s.alt([
    ['AI tạo được bản bàn giao',s=>s.r('ai','svc','Bản gợi ý có liên kết tới ghi nhận')],
    ['AI lỗi',s=>{s.r('ai','svc','Chưa có kết quả hợp lệ');s.m('svc','svc','Dùng mẫu có các dữ kiện đã lưu; không chặn yêu cầu hỗ trợ');}],
  ]);
  s.r('svc','ui','Bản bàn giao để xác nhận');s.m('worker','ui','Kiểm tra/sửa; nhấn Gửi yêu cầu');s.m('ui','svc','Gửi bản bàn giao đã xác nhận');s.m('svc','db','Lưu yêu cầu hỗ trợ; giữ người bảo trì là chủ hồ sơ');s.async('svc','expertui','Thông báo yêu cầu trong ứng dụng');s.r('svc','ui','Đã gửi — chờ chuyên gia tiếp nhận');
  s.phase('2. Ghi rõ thời điểm và công đoạn tham gia');
  s.ui('UI-21 · Đang phối hợp với chuyên gia','Hiện người phụ trách, chuyên gia, thời điểm nhận và thời điểm thực sự tham gia, công đoạn hiện tại.\nChuyên gia: Nhận hỗ trợ / Chưa thể hỗ trợ kèm lý do.\nNgười bảo trì: hỗ trợ theo phân công và mở vùng Ghi nhận nhanh ngay trong hồ sơ.\nNgười thực hiện và người nhập là hai trường riêng. Không tự mặc định mọi việc đều do chuyên gia làm.\nChuyên gia có thể nhập trực tiếp hoặc xác nhận nhóm ghi nhận sau.');
  s.m('expert','expertui','Mở bản bàn giao và dữ liệu hiện tại');s.m('expertui','svc','Lấy hồ sơ theo quyền');s.r('svc','expertui','Bối cảnh, nguồn, các lần thử và yêu cầu');
  s.alt([
    ['Chưa có người nhận / chuyên gia chưa thể hỗ trợ',s=>{s.m('expertui','svc','Ghi phản hồi nếu có; giữ yêu cầu đang chờ');s.m('svc','db','Lưu trạng thái và lý do');s.async('svc','ui','Hiện chưa có chuyên gia tham gia');s.ref('SQ11','Người phụ trách chọn điều tra trong điều kiện cho phép hoặc bàn giao');}],
    ['Chuyên gia tiếp nhận',s=>{
      s.m('expert','expertui','Nhận hỗ trợ; khi bắt đầu, xác nhận công đoạn và thời điểm');s.m('expertui','svc','Ghi nhân sự tham gia, thời điểm thực tế và lúc ghi');s.m('svc','db','Lưu participantId theo caseId/roundId; không đổi chủ hồ sơ');s.async('svc','ui','Mở trạng thái Đang phối hợp; giữ vùng ghi nhanh cho người bảo trì');
      s.loop('Có phát hiện, quyết định hoặc kết quả mới trong lúc phối hợp',s=>{
        s.m('expert','worker','Trao đổi nhận định, căn cứ và phân công hỗ trợ tại hiện trường','async');
        s.note('Trao đổi trực tiếp giữa hai người; người bảo trì chủ động ghi vào web. MVP không có ghi âm hoặc chép lời tự động.');
        s.ref('SQ16','Người bảo trì ghi nhanh, chuyên gia có thể bổ sung; xác nhận theo nhóm đóng góp');
      });
      s.ref('SQ11','Chốt phương án, kiểm tra kết quả; người bảo trì tiếp tục hỗ trợ và quản lý hồ sơ');
    }],
  ]);
  s.note('Không yêu cầu chuyên gia vừa thao tác vừa nhập từng bước. Người bảo trì có thể ghi bù theo mốc khi đang phải hỗ trợ; giữ performedAt khác recordedAt và nhãn chờ xác nhận khi cần.');

  s=page('SQ11','Đợt xử lý, PM, tóm tắt bàn giao và tiếp tục hồ sơ',['worker','ui','svc','db','ai','kb'],{
    short:'Một caseId, nhiều roundId; giữ cả bước chưa hiệu quả; chưa xong thì AI tóm tắt để bàn giao/điều tra tiếp.',
    pre:'Có hồ sơ BM/PM đã xác minh; có thể bắt đầu đợt mới hoặc tiếp tục đợt đang làm.',
    post:'Kết quả thực tế và tóm tắt đợt được lưu; đi điều tra tiếp, chờ/bàn giao hoặc lập báo cáo tổng kết.',
    bpmn:['r-work-round','r-round-result','r-round-summary','r-handover-check','r-next','r-open-save','r-wait','w-start','w-open-round','r-action-merge','r-plan','r-act','w-more','r-verify','w-outcome','w-result','w-end','w-stop','w-exception','w-exception-approved','w-pm-abnormal'],
  });
  s.phase('1. Bắt đầu đợt, chốt điều kiện thực hiện');
  s.ui('UI-22 · Công việc trong đợt','Đầu màn hình: mã hồ sơ, đợt hiện tại, máy, chủ hồ sơ, chuyên gia đang tham gia.\nHiện phương án, nguồn, người dự kiến làm và điều kiện an toàn từ quy trình có hiệu lực.\nPM: checklist điền sẵn; mỗi mục có giá trị/đơn vị, đạt/không đạt/chưa làm và bất thường.\nNút: Ghi nhận nhanh, Tra cứu lại, Yêu cầu chuyên gia, Xem nháp báo cáo, Kết thúc đợt.\nGhi theo mốc, không yêu cầu nhập từng động tác; không coi hạng mục trong kế hoạch là đã thực hiện.');
  s.m('worker','ui','Bắt đầu/tiếp tục công việc trong hồ sơ');s.m('ui','svc','Mở đợt theo caseId; không tạo đợt trùng khi tải lại');s.m('svc','db','Tạo roundId mới khi thực sự bắt đầu đợt; hoặc lấy đợt đang làm');s.m('svc','kb','Lấy quy trình/phạm vi có hiệu lực được tham chiếu');s.r('svc','ui','Bàn giao trước, checklist/phương án, nguồn và điều kiện');s.m('worker','ui','Xác nhận điều kiện thực tế và người thực hiện');s.m('ui','svc','Lưu lựa chọn cùng bối cảnh hiện tại');
  s.alt([
    ['Có phương án đủ điều kiện',s=>{
      s.m('svc','db','Lưu kế hoạch và người xác nhận; ghi tiến độ Đang xử lý');s.r('svc','ui','Mở nhật ký và checklist');
      s.loop('Có mốc cần ghi trong đợt',s=>s.ref('SQ16','Ghi loại/nội dung/người làm/kết quả; giữ cả lần thử chưa hiệu quả'));
      s.opt('PM phát hiện bất thường ở một hạng mục',s=>{s.m('worker','ui','Chọn Mở xử lý bất thường từ hạng mục');s.m('ui','svc','Gắn bất thường với caseId, roundId và checklistItemId');s.m('svc','db','Giữ checklist PM và tạo mục xử lý liên quan, không mất nguồn');s.r('svc','ui','Mở phần điều tra trong cùng hồ sơ; việc độc lập chỉ tách hồ sơ khi có lý do');s.ref('SQ09','Bổ sung dấu hiệu/điều kiện/5M1E; tra cứu hoặc gọi chuyên gia');});
      s.m('worker','ui','Ghi kiểm tra kết quả theo tiêu chí công việc');s.m('ui','svc','Lưu số đo, kết quả và tình trạng máy quan sát được');s.m('svc','db','Ghi sự kiện kiểm tra; nguyên nhân và kết quả là hai trường riêng');s.r('svc','ui','Đã lưu kết quả thực tế; chưa tự chốt báo cáo');
    }],
    ['Chưa có phương án / không đủ điều kiện',s=>{s.m('svc','db','Ghi điều kiện chưa đạt; giữ hồ sơ mở');s.r('svc','ui','Chọn tiếp tục điều tra/gọi hỗ trợ hoặc kết thúc đợt để bàn giao');}],
  ]);
  s.phase('2. Chọn kết quả công việc và bước tiếp theo');
  s.ui('UI-23 · Kết quả khác với tiến độ','Kết quả máy: đã phục hồi/chưa phục hồi/chưa đủ kiểm chứng; căn cứ theo kiểm tra thực tế.\nTiến độ: đang làm/chờ linh kiện/chờ hỗ trợ/bàn giao/kết thúc công việc.\nKết thúc khi chưa khắc phục: phải có quyết định đúng thẩm quyền, lý do và nơi tiếp nhận nếu có.\nKhông có quyết định phù hợp thì giữ mở, không đánh dấu thành công.\nNút: Tiếp tục điều tra, Gọi chuyên gia, Tóm tắt và bàn giao, Lập báo cáo tổng kết.');
  s.m('worker','ui','Chọn kết quả và bước tiếp theo');
  s.alt([
    ['Đạt tiêu chí sau xử lý hoặc hoàn tất PM',s=>{s.m('ui','svc','Ghi kết thúc công việc và kết quả kiểm tra, chưa chốt báo cáo');s.m('svc','db','Lưu workState riêng machineState; reportState vẫn Nháp');s.r('svc','ui','Công việc đã kết thúc; chuyển kiểm tra báo cáo');s.ref('SQ12','AI tổng kết tất cả đợt, kể cả các lần chưa hiệu quả');}],
    ['Muốn kết thúc công việc dù chưa khắc phục',s=>{s.m('worker','ui','Nhập lý do và quyết định/chấp thuận đúng thẩm quyền');s.m('ui','svc','Kiểm tra quyền và bằng chứng quyết định kết thúc');s.alt([
      ['Đủ điều kiện',s=>{s.m('svc','db','Lưu Kết thúc chưa khắc phục/chuyển đơn vị/thay thiết bị; không đổi thành sửa thành công');s.r('svc','ui','Kết quả được giữ đúng thực tế');s.ref('SQ12','Lập tổng kết gồm hạn chế, việc còn lại và quyết định kết thúc');}],
      ['Chưa đủ điều kiện',s=>{s.r('svc','ui','Giữ hồ sơ mở; thiếu quyền hoặc quyết định phù hợp');s.note('Đi tiếp khối tóm tắt đợt và chọn điều tra/bàn giao nếu cần dừng phiên.');}],
    ]);}],
    ['Còn việc / chờ / cần bàn giao',s=>s.note('Đi tiếp khối 3; mọi ghi nhận vẫn nằm trong cùng hồ sơ, không tạo case mới.')],
  ]);
  s.phase('3. AI tóm tắt đợt chưa kết thúc công việc');
  s.ui('UI-37 · Tóm tắt đợt và bàn giao','AI điền: đã quan sát/kiểm tra/làm gì, ai làm, kết quả, giả thuyết còn mở, việc cần làm tiếp.\nNgười bảo trì kiểm tra; chuyên gia xác nhận phần liên quan khi có thể.\nTóm tắt gắn roundId, không phải báo cáo cuối độc lập.\nBàn giao nhập người/đơn vị nhận theo quyền, lý do dừng và lưu ý.\nThông báo: Đã lưu đợt và bàn giao. Hồ sơ vẫn chờ xử lý.');
  s.opt('Công việc vẫn mở và người dùng kết thúc/bàn giao đợt',s=>{
    s.m('ui','svc','Yêu cầu tóm tắt đợt hiện tại');s.m('svc','db','Đọc các ghi nhận và kết quả của đợt');s.m('svc','ai','Soạn tóm tắt từ sự kiện; không tự loại trừ nguyên nhân');
    s.alt([
      ['AI thành công',s=>s.r('ai','svc','Tóm tắt có căn cứ đến từng ghi nhận')],
      ['AI lỗi',s=>{s.r('ai','svc','Chưa có kết quả');s.m('svc','svc','Điền mẫu từ dữ kiện; cho người dùng sửa để bàn giao ngay');}],
    ]);
    s.r('svc','ui','Tóm tắt để kiểm tra');s.m('worker','ui','Sửa/xác nhận tóm tắt; chọn điều tra tiếp hoặc bàn giao');s.m('ui','svc','Lưu summaryRevision và kết quả kết thúc đợt');s.m('svc','db','Giữ roundId, tất cả eventId, người nhận và việc còn lại');
    s.alt([
      ['Tiếp tục điều tra / gọi hỗ trợ',s=>{s.r('svc','ui','Đợt đã lưu; bắt đầu đợt kế tiếp trên cùng caseId');s.ref('SQ09','Cập nhật bối cảnh và tra cứu; có thể gọi SQ10 để hỗ trợ');}],
      ['Dừng phiên / bàn giao / chờ',s=>{s.r('svc','ui','Đã lưu bàn giao; hồ sơ còn mở, báo cáo tổng kết chưa chốt');s.r('ui','worker','Hiện người phụ trách, việc còn lại và lý do chờ');}],
    ]);
  });
  s.opt('Ở phiên sau, tiếp tục hồ sơ đang chờ',s=>s.ref('SQ08','Mở cùng caseId; xem các đợt cũ và bàn giao, tạo đợt mới chỉ khi làm tiếp'));

  s=page('SQ12','AI soạn báo cáo từ mọi đợt và xác nhận đóng góp',['worker','ui','svc','db','ai','expertui','expert','hozen'],{
    short:'Nháp báo cáo xuyên suốt, xem trước được; chốt sau xác nhận; máy/phần việc/báo cáo có trạng thái riêng.',
    pre:'Hồ sơ có nhật ký; người dùng muốn xem nháp hoặc công việc đủ điều kiện kết thúc để chốt báo cáo.',
    post:'Cùng reportId có revision mới, hoặc báo cáo đã xác nhận để trích xuất tri thức; chờ xác nhận không làm mất dữ kiện.',
    bpmn:['r-report','r-report-ready','r-doc-wait-end','w-preview','f-start','f-collect','f-ai-draft','f-ai-ok','f-fallback','f-review','f-purpose','f-preview-end','f-contributions','f-confirm','f-confirm-result','f-edit','f-wait','f-wait-end','f-check','f-valid','f-history','f-sync','f-end'],
  });
  s.phase('1. Soạn nháp từ dữ kiện đã ghi, không viết lại cuối ca');
  s.ui('UI-24 · Báo cáo tổng kết do AI soạn','Nút Xem nháp / Cập nhật từ nhật ký; dùng cùng reportId, tăng revision khi cập nhật.\nNội dung: máy/công việc, điều kiện và 5M1E, các đợt, giả thuyết, căn cứ, bước đã thử, kết quả, người tham gia, nguyên nhân xác nhận/chưa xác định, việc còn lại.\nHiển thị cả lần thử chưa hiệu quả; từng nhận định có liên kết về ghi nhận gốc.\nPhân biệt việc đã làm với đề xuất trung/dài hạn.\nAI không ghi đè phần người dùng đã sửa; cho xem thay đổi trước khi áp dụng.');
  s.m('worker','ui','Chọn Xem nháp hoặc Lập báo cáo tổng kết');s.m('ui','svc','Lấy reportId hiện tại và snapshot nhật ký');s.m('svc','db','Đọc mọi roundId/eventId, nguồn, PM, đóng góp và quyết định kết thúc');s.r('db','svc','Dữ kiện, phiên bản và phần người dùng đã sửa');s.m('svc','ai','Soạn/cập nhật nháp từ dữ kiện; đánh dấu thông tin còn thiếu');
  s.alt([
    ['Nháp AI có cấu trúc và căn cứ hợp lệ',s=>{s.r('ai','svc','Bản gợi ý và liên kết đến sự kiện; không tự thêm nguyên nhân');s.m('svc','db','Lưu bản gợi ý gắn snapshot nguồn trên cùng reportId');s.r('svc','ui','Hiện nháp và khác biệt với bản đang sửa');}],
    ['AI lỗi / thiếu căn cứ / kết quả đến trên dữ liệu cũ',s=>{s.r('ai','svc','Không có bản gợi ý đủ điều kiện áp dụng');s.r('svc','ui','Giữ nháp và nhật ký; dùng mẫu điền dữ kiện, sửa tay hoặc thử lại');s.r('ui','worker','Chưa tổng hợp được bằng AI. Dữ liệu công việc vẫn được giữ.');}],
  ]);
  s.m('worker','ui','Đọc nguồn, sửa và xác nhận bản tổng hợp thực tế');s.m('ui','svc','Lưu phần được chọn và reportRevision');s.m('svc','db','Lưu nháp; không đổi sự kiện gốc hoặc xác nhận chuyên gia thay họ');s.r('svc','ui','Đã lưu nháp báo cáo');
  s.alt([
    ['Chỉ xem trước trong lúc làm',s=>{s.r('ui','worker','Trở lại đợt đang làm; báo cáo vẫn Nháp, hồ sơ không bị kết thúc');s.stop('Kết thúc lần xem nháp. Dữ kiện mới phát sinh sẽ làm nháp cần cập nhật.');}],
    ['Cần chốt báo cáo',s=>s.note('Tiếp tục xác nhận; chỉ chốt khi có kết quả/ quyết định kết thúc phù hợp.')],
  ]);
  s.phase('2. Xác nhận theo nhóm đóng góp, tái dùng xác nhận còn hiệu lực');
  s.ui('UI-25 · Xác nhận chuyên gia','Hiện phần đóng góp của từng người, bản đã xác nhận và phần bị đổi ý nghĩa.\nPhần đã được xác nhận cuối đợt và không đổi: giữ xác nhận, không bắt xác nhận lại.\nPhần mới/đổi ý nghĩa: gửi nhóm nội dung cần xác nhận cho đúng chuyên gia.\nChuyên gia chọn Xác nhận đúng / Yêu cầu sửa. Người bảo trì không xác nhận thay.\nNếu chuyên gia chưa phản hồi: Lưu chờ và thoát; trạng thái máy và kết thúc công việc không bị đảo ngược.');
  s.m('ui','svc','Kiểm tra nhóm đóng góp và phạm vi nội dung đã xác nhận');s.m('svc','db','So nội dung hiện tại với xác nhận theo contributionRevision');s.r('svc','ui','Phần còn hiệu lực và phần cần xác nhận');
  s.opt('Có chuyên gia và còn nội dung cần xác nhận',s=>{
    s.m('worker','ui','Gửi xác nhận cho các phần còn thiếu');s.m('ui','svc','Tạo yêu cầu theo người và phiên bản nội dung');s.m('svc','db','Lưu báo cáo Chờ xác nhận');s.async('svc','expertui','Thông báo nhóm đóng góp cần xác nhận');
    s.loop('Mỗi chuyên gia có phần chưa xác nhận',s=>{
      s.m('expert','expertui','Đọc nhóm đóng góp và bối cảnh báo cáo');s.m('expertui','svc','Lấy nội dung hiện tại, dữ kiện gốc và phiên bản');s.r('svc','expertui','Phần cần xác nhận; nội dung đã xác nhận trước đó');
      s.alt([
        ['Chưa phản hồi / lưu chờ',s=>{s.m('worker','ui','Chọn Lưu chờ và thoát');s.m('ui','svc','Giữ báo cáo chờ; không chốt thay chuyên gia');s.r('svc','ui','Đã lưu; mở lại hồ sơ sẽ vào bước xác nhận');s.stop('Kết thúc phiên báo cáo; máy và tiến độ công việc giữ trạng thái thực tế.');}],
        ['Yêu cầu sửa',s=>{s.m('expert','expertui','Ghi phần chưa đúng và căn cứ');s.m('expertui','svc','Lưu phản hồi; chưa xác nhận phần này');s.async('svc','ui','Hiện phần cần sửa');s.m('worker','ui','Sửa phần có căn cứ; gửi lại nội dung liên quan');s.m('ui','svc','Lưu revision; chỉ đặt lại xác nhận bị ảnh hưởng');s.m('svc','db','Giữ trước/sau và lý do; tiếp tục vòng xác nhận');}],
        ['Xác nhận đúng',s=>{s.m('expert','expertui','Nhấn Xác nhận đúng');s.m('expertui','svc','Xác nhận bằng tài khoản cá nhân, gắn đúng phần nội dung');s.m('svc','db','Lưu xác nhận, thời điểm và phiên bản đóng góp');s.async('svc','ui','Cập nhật chuyên gia đã xác nhận');}],
      ]);
    });
  });
  s.phase('3. Chốt báo cáo và đồng bộ khi có khả năng tích hợp');
  s.ui('UI-38 · Ba trạng thái riêng','Tình trạng máy: đã phục hồi/chưa phục hồi/chưa đủ kiểm chứng — từ dữ kiện thực tế.\nTiến độ công việc: đang làm/chờ/bàn giao/kết thúc, kèm kết quả và lý do.\nBáo cáo: Nháp/Chờ xác nhận/Đã xác nhận; máy phục hồi vẫn có thể chờ xác nhận báo cáo.\nHozenDX: chưa đồng bộ/đang đồng bộ/đã đồng bộ lúc…/đồng bộ lỗi. Chỉ hiện thành công khi có xác nhận bên nhận.\nSau chốt: đính chính có lý do và phiên bản, không sửa ngầm lịch sử.');
  s.m('worker','ui','Nhấn Chốt báo cáo');s.m('ui','svc','Kiểm tra dữ kiện, kết thúc công việc, revision và các xác nhận');s.m('svc','db','Đọc trạng thái hiện tại');
  s.alt([
    ['Thiếu điều kiện hoặc nội dung vừa đổi',s=>{s.r('svc','ui','Trả mục cần hoàn thiện; giữ bản nháp và mọi dữ kiện');s.stop('Chưa chốt; người dùng hoàn thiện/xác nhận lại phần cần thiết.');}],
    ['Đủ điều kiện',s=>{s.m('svc','db','Lưu báo cáo Đã xác nhận và lịch sử máy; giữ các đợt, người làm và nguồn');s.r('db','svc','Báo cáo đã lưu bền vững');s.r('svc','ui','Đã chốt báo cáo; có thể đánh giá tri thức tái dùng');}],
  ]);
  s.opt('HozenDX có API/quyền ghi lịch sử đã được cấu hình',s=>{
    s.async('svc','hozen','Đồng bộ lịch sử/báo cáo theo mã thao tác, không nhân đôi hồ sơ');
    s.alt([
      ['Bên nhận xác nhận thành công',s=>{s.r('hozen','svc','ID nguồn nhận và thời điểm đồng bộ');s.m('svc','db','Lưu trạng thái đồng bộ');s.async('svc','ui','Hiện Đã đồng bộ lúc…');}],
      ['Lỗi / chưa xác nhận',s=>{s.r('hozen','svc','Chưa hoàn tất đồng bộ');s.m('svc','db','Giữ hàng chờ thử lại; báo cáo cục bộ vẫn Đã xác nhận');s.async('svc','ui','Báo cáo đã lưu; chưa đồng bộ HozenDX');}],
    ]);
  });
  s.ref('SQ13','Đối chiếu bài học của toàn bộ hồ sơ; kết quả chưa khắc phục cũng được giữ đúng phạm vi bằng chứng');

  s=page('SQ16','Ghi nhanh theo mốc và xác nhận nhóm đóng góp',['worker','ui','svc','db','ai','expertui','expert'],{
    short:'Mẫu ngắn và ô nội dung; ghi theo mốc; ai ghi khác ai làm; giữ lần thử chưa hiệu quả và căn cứ quyết định.',
    pre:'Hồ sơ và đợt đang mở; người bảo trì tự xử lý hoặc đang hỗ trợ chuyên gia.',
    post:'Có nhật ký truy vết; phần đóng góp có trạng thái xác nhận riêng; có thể yêu cầu xem nháp báo cáo bất kỳ lúc phù hợp.',
    bpmn:['w-note','w-save-event','w-confirm-now','w-expert-check'],
  });
  s.phase('1. Người bảo trì ghi nhanh trong lúc phối hợp');
  s.ui('UI-35 · Vùng Ghi nhận nhanh trong hồ sơ','Loại: Quan sát / Kiểm tra / Nhận định / Thao tác / Kết quả.\nÔ nội dung vài dòng; gõ hoặc dán. Không có ghi âm trong MVP.\nNgười nhập tự lấy từ tài khoản; người thực hiện/chuyên gia hướng dẫn hiển thị riêng, có thể chọn đúng người.\nKết quả: chưa có/có kết quả; số đo kèm đơn vị khi liên quan.\nLý do lựa chọn mở khi ghi quyết định quan trọng; AI chỉ nhắc nếu còn thiếu căn cứ.\nThời điểm nhập tự ghi; cho bổ sung thời điểm thực tế khi ghi bù.\nNút Lưu ghi nhận; nháp tự giữ, chỉ báo Đã lưu khi máy chủ xác nhận.');
  s.m('worker','ui','Chọn loại và ghi vài dòng tại mốc quan trọng');s.m('ui','ui','Giữ nội dung đang gõ; mở trường theo loại ghi nhận');s.m('worker','ui','Xác nhận người thực hiện, thời điểm và kết quả nếu có');s.m('ui','svc','Lưu caseId, roundId, loại, nội dung, người ghi/người làm, kết quả và thời điểm');s.m('svc','db','Thêm eventId; lưu revision và trạng thái chưa/đã xác nhận theo quyền');s.r('db','svc','Ghi nhận đã lưu');s.r('svc','ui','Dòng thời gian mới, người thực hiện và trạng thái');s.r('ui','worker','Đã lưu ghi nhận; mở ô trống cho lần ghi tiếp theo');
  s.opt('Người bảo trì đang phải hỗ trợ thao tác',s=>{s.note('Không ép ghi liên tục. Người dùng ghi bù sau mốc công việc, giữ rõ thời điểm thực tế khác thời điểm nhập. Không yêu cầu tách hồ sơ hoặc viết báo cáo mới.');});
  s.opt('AI phát hiện thiếu căn cứ ở một quyết định quan trọng',s=>{s.m('svc','ai','Đọc ghi nhận được phép; kiểm tra mục cần hỏi thêm');s.r('ai','svc','Câu hỏi gợi ý, không bổ sung dữ kiện thay người dùng');s.r('svc','ui','Gợi ý ngắn: Vì sao chọn bước này? Kết quả nào làm đổi hướng?');s.alt([
    ['Có thông tin để bổ sung',s=>{s.m('worker','ui','Ghi giải thích được chuyên gia cung cấp');s.m('ui','svc','Bổ sung ghi nhận, giữ nguồn và người phát biểu');s.m('svc','db','Lưu revision, không tự coi đã được chuyên gia xác nhận');}],
    ['Chưa biết hoặc đang bận',s=>s.r('ui','worker','Cho bỏ qua / ghi chưa xác định; không chặn lưu sự kiện thực tế')],
  ]);});
  s.opt('Chuyên gia muốn ghi trực tiếp',s=>{s.m('expert','expertui','Nhập nhận định hoặc bổ sung phần mình thực hiện');s.m('expertui','svc','Lưu ghi nhận bằng tài khoản chuyên gia');s.m('svc','db','Lưu người ghi/thực hiện và revision');s.async('svc','ui','Người bảo trì thấy ghi nhận mới trong cùng dòng thời gian');});
  s.phase('2. Nhóm ghi nhận và xác nhận khi thuận tiện');
  s.ui('UI-36 · Đóng góp theo người / theo đợt','Nhóm theo chuyên gia và đợt; hiện ai nhập, ai thực hiện, nội dung, thời điểm, trạng thái xác nhận.\nNgười bảo trì có thể gửi xác nhận cuối đợt; không gửi cho từng dòng bắt buộc.\nChuyên gia xác nhận đúng hoặc chỉ ra phần cần sửa.\nNội dung sửa làm đổi ý nghĩa: xác nhận lại phần liên quan. Không đặt lại phần không đổi.\nNhật ký đã lưu dù chưa xác nhận; báo cáo/tái sử dụng phải kiểm tra trạng thái này.');
  s.alt([
    ['Chưa cần xác nhận trong lúc làm',s=>s.r('ui','worker','Giữ phần ghi hộ ở Chờ xác nhận; tiếp tục công việc')],
    ['Gửi nhóm đóng góp để chuyên gia xác nhận',s=>{
      s.m('worker','ui','Chọn nhóm đóng góp trong đợt; nhấn Gửi xác nhận');s.m('ui','svc','Tạo yêu cầu gắn các eventId và revision');s.m('svc','db','Lưu phạm vi xác nhận, người nhận và trạng thái');s.async('svc','expertui','Hiện nhóm đóng góp cần xác nhận');s.m('expert','expertui','Đọc ghi nhận và bối cảnh');
      s.alt([
        ['Nội dung đúng',s=>{s.m('expert','expertui','Nhấn Xác nhận nhóm');s.m('expertui','svc','Xác nhận đúng phiên bản nội dung');s.m('svc','db','Lưu người xác nhận, nội dung và thời điểm');s.async('svc','ui','Hiện Đã xác nhận; có thể dùng lại ở báo cáo nếu nội dung không đổi');}],
        ['Cần sửa / chưa xác nhận',s=>{s.m('expert','expertui','Chỉ ra mục chưa đúng hoặc lưu để xem sau');s.m('expertui','svc','Lưu phản hồi; chưa xác nhận phần còn vấn đề');s.async('svc','ui','Hiện phần cần xem lại; giữ nguyên lịch sử đã ghi');}],
      ]);
    }],
  ]);
  s.opt('Muốn xem báo cáo khi công việc chưa kết thúc',s=>s.ref('SQ12','Chỉ chạy phần soạn/xem nháp; quay lại cùng đợt, chưa chốt báo cáo'));
  s.note('Nhật ký thất bại mô tả đúng điều đã quan sát: sau bước X hiện tượng vẫn còn. Không tự kết luận X vô dụng trong mọi bối cảnh hoặc nguyên nhân Y đã bị loại trừ.');
  return pages;
};
