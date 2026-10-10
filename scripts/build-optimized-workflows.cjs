// Optimized BPMN approved on 2026-10-08. Preserves the user's knowledge-flow layout.
const fs=require('node:fs');
const path=require('node:path');
const {Diagram}=require('./bpmn-diagram.cjs');
const root=path.resolve(__dirname,'..');
const decode=s=>String(s||'').replace(/&#xa;|&#10;/gi,'\n').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const plain=s=>decode(s).replace(/<[^>]*>/g,'');
const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],decode(m[2])]));
const lane=(id,h)=>({id,h,label:{worker:'NGƯỜI\nBẢO TRÌ',expert:'CHUYÊN GIA',ai:'HỆ THỐNG\n& AI',reviewer:'CHUYÊN GIA\nTRƯỞNG',hozen:'HOZENDX\nTÍCH HỢP'}[id],hint:{worker:'Phụ trách hồ sơ\nHỗ trợ và ghi nhanh',expert:'Điều tra / xử lý\nXác nhận đóng góp',ai:'Lưu liên tục\nHỗ trợ có căn cứ',reviewer:'Duyệt tri thức\nđúng phạm vi',hozen:'Dữ liệu có quyền\ntruy cập; API và lịch\nPM tùy khả năng'}[id]});
function fromKnowledgeBaseline(){
  const source=fs.readFileSync(path.join(root,'docs/diagram-archive/2026-10-08-before-optimization/denso-maintenance-workflows-BPMN.drawio'),'utf8');
  const fragment=[...source.matchAll(/<diagram\b([^>]*)>([\s\S]*?)<\/diagram>/g)].find(m=>attrs(m[1]).id==='knowledge-flow');
  const cells=[...fragment[2].matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)].map(m=>({...attrs(m[1]),inner:m[2]||'',g:attrs((m[2]||'').match(/<mxGeometry\b([^>]*)/)?.[1]||'')}));
  const map=new Map(cells.map(c=>[c.id,c]));
  const xy=c=>{if(!c||c.id==='1'||c.id==='0')return[0,0];const p=xy(map.get(c.parent));return[p[0]+Number(c.g.x||0),p[1]+Number(c.g.y||0)];};
  const ls=['expert','ai','reviewer'].map(id=>lane(id,Number(map.get(id).g.height)));
  const d=new Diagram('knowledge-flow','01 · Ghi nhận tri thức chuyên gia',4320,ls,'Một ô gõ/dán · So sánh điều kiện phát sinh và 5M1E · Hủy trùng do chuyên gia chọn · Duyệt độc lập trước khi dùng cho RAG');
  for(const c of cells){
    if(c.vertex!=='1')continue;
    const [x,y]=xy(c),l=d.lanes.find(l=>y>=l.y&&y<l.y+l.h);
    if(c.id.startsWith('note-')){if(l)d.note(l.id,x,y-l.y,Number(c.g.width),Number(c.g.height),plain(c.value));continue;}
    if(!l||/-(label|hint)$/.test(c.id)||c.style?.includes('edgeLabel')||['pool','worker','expert','ai','reviewer','title','subtitle','legend','footer'].includes(c.id))continue;
    const kind=c.style?.includes('rhombus')?'gateway':c.style?.includes('ellipse')?(c.style.includes('strokeWidth=4')?'end':'start'):'task';
    d.node(c.id,l.id,kind,x,y-l.y,kind==='task'?plain(c.value):plain(map.get(c.id+'-label')?.value),Number(c.g.width),Number(c.g.height));
    const label=map.get(c.id+'-label');if(label){const [lx,ly]=xy(label);d.get(c.id).labelOffset=[lx-(x+(Number(c.g.width)-190)/2),ly-(y+(kind==='gateway'?-58:Number(c.g.height)+9))];}
  }
  for(const c of cells.filter(c=>c.edge==='1')){
    if(!d.get(c.source)||!d.get(c.target))continue;
    const st=Object.fromEntries((c.style||'').split(';').filter(Boolean).map(p=>p.split('=')));
    const side=(a,b)=>a==='0'?'left':a==='1'?'right':b==='0'?'top':b==='1'?'bottom':'right';
    const p=xy(map.get(c.parent)),arr=c.inner.match(/<Array\b[^>]*as="points"[^>]*>([\s\S]*?)<\/Array>/)?.[1];
    const points=arr?[...arr.matchAll(/<mxPoint\b([^>]*)/g)].map(m=>{const a=attrs(m[1]);return[Number(a.x)+p[0],Number(a.y)+p[1]];}):undefined;
    const label=c.value||cells.filter(n=>n.parent===c.id).map(n=>plain(n.value)).join(' ');
    d.edge(c.source,c.target,plain(label),{out:side(st.exitX,st.exitY),in:st.entryX?side(st.entryX,st.entryY):'left',...(points?.length?{via:points}:{}),color:st.strokeColor||'#526579'});
  }
  d.note('reviewer',320,60,1250,145,'Biểu mẫu bổ sung: model MÁY và model SẢN PHẨM là hai trường riêng; chế độ/tốc độ vận hành, line, ca, điều kiện môi trường.\nGhi dấu hiệu quan sát được, giả thuyết, căn cứ kiểm tra, lý do đổi hướng, biện pháp và kết quả thực tế.\nĐiểm thay đổi 5M1E: Con người / Máy / Vật liệu-sản phẩm / Phương pháp / Đo lường / Môi trường.\nMỗi nhóm: Có thay đổi / Chưa ghi nhận / Chưa kiểm tra. Không ép điền mọi nhóm khi không liên quan.\nHozenDX cung cấp ngữ cảnh và hồ sơ tham chiếu; dữ liệu thô không tự trở thành know-how đã duyệt.');
  return d;
}
const k=fromKnowledgeBaseline();

// Page 02: orchestration. [+] tasks link to pages 03–05 without creating a new case.
const r=new Diagram('repair-flow','02 · Hồ sơ BM/PM — luồng tổng quan',6320,[lane('worker',450),lane('expert',260),lane('ai',460),lane('reviewer',410)],'Một hồ sơ → nhiều đợt → nhật ký → AI soạn báo cáo → xác nhận → tri thức được duyệt | [+] mở quy trình chi tiết');
r.event('r-start','worker','start',240,132,'Sự cố / PM /\ntiếp tục hồ sơ')
 .task('r-open','worker',340,104,'Mở / tiếp tục hồ sơ\nĐiền sẵn dữ liệu BM/PM\n[03 · HozenDX]')
 .gateway('r-entry-state','worker',580,123,'Hồ sơ chỉ còn\nchờ chốt báo cáo?')
 .task('r-inspect','worker',650,104,'Xác nhận dấu hiệu,\nđiều kiện và điểm thay đổi\nBổ sung phần chưa biết')
 .gateway('r-abnormal','worker',950,123,'Cần điều tra\nbất thường?')
 .task('r-retrieve','ai',1160,82,'RAG tìm case / tri thức\nđã duyệt theo bối cảnh\nNguồn khác được phân loại')
 .task('r-insight','ai',1430,82,'Nguồn + giống/khác\nDữ kiện thiếu; gợi ý\nkiểm tra tiếp theo')
 .task('r-assess','worker',1710,104,'Đọc nguồn và tự đánh giá\nChọn hướng tham khảo\ntrong thẩm quyền')
 .task('r-work-round','worker',2000,104,'Xử lý / phối hợp và\nghi nhận trong đợt\n[04 · Nhật ký]')
 .gateway('r-round-result','worker',2310,123,'Kết quả\ncủa đợt?')
 .task('r-round-summary','ai',2460,280,'AI tóm tắt đợt từ\nnhật ký: đã thử, kết quả,\ngiả thuyết và việc còn lại')
 .task('r-handover-check','worker',2470,300,'Kiểm tra tóm tắt đợt\nChọn tiếp tục điều tra\nhoặc lưu bàn giao')
 .gateway('r-next','worker',2790,319,'Bước tiếp theo\ncủa hồ sơ?')
 .task('r-open-save','ai',2980,280,'Lưu bàn giao và đợt\nGiữ caseId, lịch sử,\nngười nhận và việc còn lại')
 .event('r-wait','ai','end',3260,308,'Kết thúc phiên\nHồ sơ vẫn chờ')
 .task('r-report','worker',3020,104,'AI soạn tổng kết;\nngười tham gia xác nhận\n[05 · Báo cáo]')
 .gateway('r-report-ready','worker',3270,123,'Báo cáo đã\nxác nhận?')
 .event('r-doc-wait-end','ai','end',3510,308,'Giữ báo cáo chờ\nTiếp tục xác nhận sau')
 .task('r-diff','ai',3340,82,'Đối chiếu báo cáo đã\nxác nhận với kho; gợi ý\nliên kết / cập nhật / mới')
 .task('r-proposal','worker',3630,104,'Đọc bài học và khác biệt\nChọn giá trị tái dùng\nGiữ bằng chứng nguồn')
 .gateway('r-useful','worker',3930,123,'Có đề xuất\ntri thức?')
 .task('r-only-history','ai',4090,280,'Chỉ giữ lịch sử hồ sơ\nvà nguồn đã tham khảo\nKhông tạo bản trùng')
 .event('r-history-end','ai','end',4370,308,'Đã lưu toàn bộ\ncác đợt và kết quả')
 .task('r-submit','worker',4160,104,'Xác nhận và gửi\nMới / Cập nhật / Liên kết\nGắn báo cáo và tác giả')
 .task('r-review','reviewer',4450,80,'Người duyệt độc lập\nĐánh giá bằng chứng,\nphạm vi, an toàn, trùng')
 .gateway('r-decision','reviewer',4750,99,'Kết quả\nkiểm duyệt?')
 .task('r-feedback','reviewer',4420,275,'Yêu cầu bổ sung\nChỉ rõ mục và lý do\nThông báo người gửi')
 .task('r-revise','worker',4500,300,'Sửa đề xuất tri thức\nPhối hợp chuyên gia\nKhông sửa ngầm báo cáo')
 .task('r-publish','ai',5220,82,'Duyệt liên kết / xuất bản\nphiên bản; cập nhật RAG\nThông báo khi sẵn sàng')
 .event('r-published','ai','end',5520,110,'Tri thức có thể\nphục vụ hồ sơ sau')
 .task('r-reject','reviewer',5190,275,'Từ chối kèm lý do\nThông báo người gửi\nGiữ lịch sử hồ sơ')
 .event('r-rejected','reviewer','end',5500,303,'Không xuất bản\nđề xuất bị từ chối');
r.get('r-open').link='work-entry';r.get('r-work-round').link='work-round';r.get('r-report').link='work-report';
r.note('reviewer',320,30,1850,145,'Chuyên gia tham gia theo yêu cầu, nêu căn cứ điều tra, hướng dẫn hoặc trực tiếp xử lý; người bảo trì hỗ trợ và ghi nhanh theo mốc.\nGhi riêng người thực hiện và người ghi; chuyên gia có thể bổ sung trực tiếp, rồi xác nhận theo nhóm đóng góp của mình.\nNhật ký giữ cả bước chưa hiệu quả; AI không suy ra “nguyên nhân đã bị loại trừ” khi chưa có bằng chứng.\nTrang 04 mô tả phối hợp và ghi nhận; trang 05 mô tả AI tổng kết và xác nhận, không bắt viết lại cuối ca.')
 .note('reviewer',320,230,3850,145,'Ba trạng thái riêng: tình trạng máy / tiến độ công việc / xác nhận báo cáo. Máy phục hồi không tự chứng minh nguyên nhân gốc hoặc hoàn tất hồ sơ.\nKết thúc công việc: đạt tiêu chí sau xử lý HOẶC có quyết định được phép kết thúc với kết quả chưa khắc phục/chuyển đơn vị/thay thiết bị; phải ghi lý do.\nChờ linh kiện/chờ hỗ trợ/bàn giao thông thường vẫn giữ hồ sơ mở. Khi tiếp tục: cùng caseId, tạo đợt tiếp theo có roundId riêng.\nHozenDX cung cấp dữ liệu có sẵn; lịch PM/API/tình trạng tức thời chỉ dùng khi tích hợp thực sự cung cấp, không tự giả định.');
r.edge('r-start','r-open').edge('r-open','r-entry-state').edge('r-entry-state','r-inspect','Còn công việc')
 .edge('r-entry-state','r-report','Chỉ chờ báo cáo',{out:'bottom',in:'bottom',via:[[607,405],[3125,405]],labelSegment:1})
 .edge('r-inspect','r-abnormal')
 .edge('r-abnormal','r-retrieve','Có',{bend:1060,labelSegment:0}).edge('r-retrieve','r-insight').edge('r-insight','r-assess','',{bend:1670})
 .edge('r-assess','r-work-round').edge('r-abnormal','r-work-round','PM không bất thường',{out:'top',in:'top',via:[[977,205],[2105,205]],labelSegment:1})
 .edge('r-work-round','r-round-result')
 .edge('r-round-result','r-report','Đủ điều kiện kết thúc công việc',{via:[[2750,330]],labelSegment:0})
 .edge('r-round-result','r-round-summary','Còn việc / cần dừng đợt',{out:'bottom',via:[[2337,1216]],labelSegment:0})
 .edge('r-round-summary','r-handover-check','',{out:'top',in:'bottom',via:[[2565,1100],[2575,1100]]})
 .edge('r-handover-check','r-next')
 .edge('r-next','r-inspect','Tiếp tục điều tra; bắt đầu đợt kế tiếp',{out:'top',in:'bottom',via:[[2817,435],[755,435]],color:'#a67426',labelSegment:1})
 .edge('r-next','r-open-save','Bàn giao / chờ',{bend:2910,labelSegment:0}).edge('r-open-save','r-wait')
 .edge('r-report','r-report-ready').edge('r-report-ready','r-diff','Đã xác nhận',{bend:3330,labelSegment:0})
 .edge('r-report-ready','r-doc-wait-end','Còn chờ / cần sửa',{out:'bottom',via:[[3297,1240],[3528,1240]],in:'bottom',labelSegment:1})
 .edge('r-diff','r-proposal','',{bend:3590}).edge('r-proposal','r-useful')
 .edge('r-useful','r-only-history','Không',{out:'bottom',via:[[3957,1216]],labelSegment:0}).edge('r-only-history','r-history-end')
 .edge('r-useful','r-submit','Có').edge('r-submit','r-review','',{bend:4410}).edge('r-review','r-decision')
 .edge('r-decision','r-feedback','Cần bổ sung',{out:'bottom',in:'right',via:[[4777,1671]],labelSegment:0,color:'#a67426'})
 .edge('r-feedback','r-revise','',{out:'top',in:'bottom',via:[[4525,1310],[4605,1310]],color:'#a67426'})
 .edge('r-revise','r-diff','Đối chiếu lại đề xuất',{out:'bottom',in:'top',via:[[4605,615],[3500,615],[3500,925],[3445,925]],labelSegment:1,color:'#a67426'})
 .edge('r-decision','r-publish','Duyệt',{via:[[4990,1476],[4990,1018]],labelSegment:0}).edge('r-publish','r-published')
 .edge('r-decision','r-reject','Từ chối',{via:[[4990,1476],[4990,1671]],labelSegment:2}).edge('r-reject','r-rejected');

// Page 03: no invented HozenDX scheduling or real-time capability.
const e=new Diagram('work-entry','03 · Mở / tiếp tục hồ sơ và điền sẵn BM/PM',4920,[lane('worker',420),lane('ai',400),lane('hozen',300)],'Chi tiết r-open · Một mã máy, một hồ sơ xuyên suốt · Nguồn và thời điểm đồng bộ được hiển thị');
e.event('e-start','worker','start',240,132,'Mở từ trang 02')
 .task('e-select','worker',350,104,'Chọn sự cố / việc PM\nhoặc quét / nhập mã máy\nhoặc mở hồ sơ đang chờ')
 .task('e-fetch','ai',630,90,'Lấy thông tin theo quyền\nMáy, lịch sử BM/PM,\nhồ sơ thay đổi, tài liệu')
 .task('e-hozen','hozen',910,70,'Trả dữ liệu được cấp\nLý lịch, chế độ PM,\nSOP/DAS, linh kiện…')
 .gateway('e-source','ai',1200,109,'Có dữ liệu\nđủ dùng?')
 .task('e-fallback','ai',1320,260,'Hiện thiếu/lỗi/độ cũ\nDùng bản đã có nếu phù hợp\nhoặc yêu cầu xác minh')
 .gateway('e-fallback-valid','ai',1550,109,'Có thể xác minh\nbản dự phòng?')
 .task('e-confirm','worker',1550,104,'Xác nhận đúng máy\nNguồn/thời gian dữ liệu\nTách quan sát hiện trường')
 .gateway('e-existing','worker',1830,123,'Tiếp tục hồ sơ\nđang mở?')
 .task('e-resume','ai',1960,260,'Giữ caseId và lịch sử\nMở đúng bước đang chờ\nChỉ tạo đợt khi làm tiếp')
 .gateway('e-type','worker',2080,123,'Công việc mới\nlà BM hay PM?')
 .gateway('e-pm-plan','ai',2330,109,'Có công việc PM\ntừ tích hợp?')
 .task('e-pm-import','ai',2510,20,'Điền công việc, lịch,\nchecklist được cung cấp\nGiữ ID/phiên bản nguồn')
 .task('e-pm-template','ai',2510,260,'Chọn checklist đã cấu hình\ntừ chế độ/tiêu chuẩn PM\nKhông tự sinh việc đã làm')
 .task('e-bm','worker',2400,104,'Xác nhận sự cố\nDấu hiệu ban đầu; thời gian\nKhông ép kết luận nguyên nhân')
 .task('e-check-context','worker',2960,104,'Kiểm tra phần điền sẵn\nBổ sung model sản phẩm,\nđiều kiện và 5M1E liên quan')
 .task('e-persist','ai',3260,90,'Tạo / mở đúng hồ sơ\nGắn máy, loại việc, chủ ca\nLưu ảnh chụp nguồn')
 .event('e-end','worker','end',3580,132,'Trở về trang 02\nHồ sơ sẵn sàng ghi')
 .event('e-unavailable','worker','end',1550,312,'Chờ xác minh máy\nChưa bắt đầu công việc');
e.note('hozen',1550,65,3070,155,'Q&A xác nhận HozenDX/AIHO có lý lịch máy (maker/model/năm/thông số), cấu trúc/linh kiện, chế độ bảo dưỡng, BM, nội dung sửa chữa, kết quả PM, SOP/DAS, bản vẽ, hồ sơ cải tạo và tồn kho.\nQ&A chưa xác nhận API, lịch/phân công PM hay trạng thái máy tức thời. Prototype mô phỏng có ghi nguồn; chỉ điền phần tích hợp thực sự cung cấp.\nKhông tìm thấy máy / không có quyền / chưa xác minh dữ liệu: chưa cho bắt đầu. Bản lưu cũ được gắn thời điểm và người dùng xác nhận, không giả vờ đồng bộ thành công.\nNếu có hồ sơ đang mở: ưu tiên tiếp tục/tham gia; công việc khác phải có lý do, không gộp sự cố độc lập. PM phát hiện bất thường giữ liên kết hạng mục và hồ sơ gốc.\nDữ liệu tích hợp và dữ kiện hiện trường có nguồn riêng; khác nhau được hiển thị để xác minh, không âm thầm ghi đè.');
e.edge('e-start','e-select').edge('e-select','e-fetch','',{bend:590}).edge('e-fetch','e-hozen','',{bend:880}).edge('e-hozen','e-source','',{bend:1160})
 .edge('e-source','e-confirm','Có / xác minh được',{bend:1450,labelSegment:0})
 .edge('e-source','e-fallback','Thiếu / lỗi',{out:'bottom',via:[[1227,906]],labelSegment:0})
 .edge('e-fallback','e-fallback-valid','',{out:'top',in:'bottom',via:[[1425,815],[1577,815]]})
 .edge('e-fallback-valid','e-confirm','Có; người dùng xác nhận',{out:'right',in:'bottom',via:[[1655,736]],labelSegment:0})
 .edge('e-fallback-valid','e-unavailable','Chưa xác minh được',{out:'top',in:'bottom',via:[[1577,570],[1568,570]],labelSegment:0})
 .edge('e-confirm','e-existing').edge('e-existing','e-resume','Có',{out:'bottom',via:[[1857,906]],labelSegment:0})
 .edge('e-resume','e-check-context','',{out:'bottom',in:'bottom',via:[[2065,980],[3065,980]]})
 .edge('e-existing','e-type','Không').edge('e-type','e-bm','BM')
 .edge('e-type','e-pm-plan','PM',{out:'bottom',via:[[2107,736]],labelSegment:0})
 .edge('e-pm-plan','e-pm-import','Có',{via:[[2430,736],[2430,666]],labelSegment:2})
 .edge('e-pm-plan','e-pm-template','Không',{out:'bottom',via:[[2357,906]],labelSegment:1})
 .edge('e-pm-import','e-check-context','',{bend:2870}).edge('e-pm-template','e-check-context','',{bend:2900})
 .edge('e-bm','e-check-context').edge('e-check-context','e-persist','',{bend:3220}).edge('e-persist','e-end','',{bend:3530});

// Page 04: one round, repeated notes, expert + recorder and unsuccessful attempts retained.
const w=new Diagram('work-round','04 · Đợt xử lý, phối hợp chuyên gia và ghi nhanh',6740,[lane('worker',510),lane('expert',320),lane('ai',420)],'Chi tiết r-work-round · caseId cố định; roundId theo đợt; eventId theo ghi nhận · PM và BM dùng cùng nhật ký');
w.event('w-start','worker','start',240,132,'Bắt đầu / tiếp tục\nmột đợt')
 .task('w-open-round','ai',350,90,'Tạo / tiếp tục roundId\nĐọc bối cảnh, nguồn,\nchecklist và bàn giao')
 .gateway('r-route','worker',660,123,'Chọn hướng\ntrong đợt?')
 .task('r-measure','worker',830,330,'Bổ sung kiểm tra / số đo\nGhi dấu hiệu và 5M1E\nTra cứu lại khi bối cảnh đổi')
 .task('r-call','worker',870,104,'Yêu cầu chuyên gia\nNêu vấn đề cần xác minh\nKiểm tra bản bàn giao')
 .task('r-handover','ai',1160,90,'AI tóm tắt dữ kiện đã có\nNgười bảo trì xác nhận\nGửi yêu cầu trong web')
 .gateway('w-expert-available','ai',1430,109,'Có chuyên gia\nnhận hỗ trợ?')
 .task('r-join','expert',1450,65,'Nhận hỗ trợ; ghi lúc\nbắt đầu tham gia, công đoạn\nvà vai trò của chuyên gia')
 .task('r-investigate','expert',1750,65,'Điều tra / giải thích\nGiả thuyết, bằng chứng\nvà lý do đổi hướng')
 .gateway('r-action-merge','worker',2090,123,'Có phương án\nđủ điều kiện?')
 .task('r-plan','worker',2290,104,'Chốt phương án, người làm\nXác nhận an toàn theo\nquy trình đã phê duyệt')
 .task('r-act','worker',2580,104,'Thực hiện / hỗ trợ\nGhi theo các mốc quan trọng\nKhông phải ghi từng động tác')
 .task('w-note','worker',2870,104,'Ghi nhanh: loại + nội dung\nngười thực hiện + kết quả\nLý do quyết định khi cần')
 .task('w-save-event','ai',3160,90,'Lưu eventId, tác giả nhập,\nngười thực hiện, thời điểm\nvà revision; không ghi đè')
 .gateway('w-confirm-now','ai',3440,109,'Có phần chuyên gia\ncần xác nhận lúc này?')
 .task('w-expert-check','expert',3440,65,'Bổ sung / xác nhận theo\nnhóm đóng góp của mình\nCó thể xác nhận cuối đợt')
 .gateway('w-more','worker',3740,123,'Bước tiếp theo\ntrong đợt?')
 .task('r-verify','worker',3950,104,'Kiểm tra kết quả thực tế\nGhi đạt/chưa đạt/chưa rõ\nvà căn cứ kiểm tra')
 .gateway('w-outcome','worker',4250,123,'Kết quả /\nquyết định kết thúc?')
 .task('w-result','ai',4510,90,'Lưu kết quả đợt, máy\nvà tiến độ công việc riêng\nGiữ cả bước chưa hiệu quả')
 .event('w-end','worker','end',4810,132,'Trả kết quả về 02\nBáo cáo hoặc tóm tắt đợt')
 .gateway('w-stop','worker',2280,349,'Chưa đủ điều kiện:\ntiếp tục hay dừng đợt?')
 .task('w-exception','worker',4470,330,'Chỉ kết thúc chưa khắc phục\nkhi có quyết định đúng quyền\nGhi lý do và nơi tiếp nhận')
 .gateway('w-exception-approved','worker',4750,349,'Có quyết định\nđúng thẩm quyền?')
 .task('w-pm-abnormal','worker',3970,330,'PM phát hiện bất thường\nGắn hạng mục, giữ hồ sơ\nChuyển sang điều tra')
 .task('w-preview','ai',5350,90,'Khi người dùng chọn:\nAI cập nhật nháp tổng kết\ntừ nhật ký; chưa xác nhận');
w.note('ai',250,250,1650,150,'Người bảo trì: tiếp tục phụ trách hồ sơ, hỗ trợ theo phân công và ghi nhanh cho cả nhóm.\nChuyên gia: điều tra/xử lý, giải thích lựa chọn; có thể nhập trực tiếp khi thuận tiện.\nNgười ghi khác người thực hiện: luôn lưu riêng. Không xác nhận thay tài khoản chuyên gia.\nKhông ép xác nhận từng ghi chú; chỉ xác nhận lại phần bị sửa về ý nghĩa.\nChưa có chuyên gia nhận: giữ trạng thái chờ, cho điều tra trong điều kiện cho phép hoặc bàn giao.')
 .note('expert',5090,45,1450,235,'Ghi nhanh theo mẫu ngắn — phù hợp câu trả lời 1-B: Quan sát / Kiểm tra / Nhận định / Thao tác / Kết quả.\nNội dung là ô tự do; số đo kèm đơn vị, kết quả và lý do lựa chọn chỉ mở khi liên quan. Có thể ghi bù với thời điểm thực tế.\nPM: ghi từng hạng mục đạt/không đạt/chưa thực hiện, số đo và bất thường; không tự đánh dấu hoàn tất từ kế hoạch.\nAI chỉ gợi ý bổ sung khi thiếu căn cứ ở mốc quan trọng; không tự biến giả thuyết thành nguyên nhân gốc hoặc loại trừ nguyên nhân.\nNhật ký tự lưu cả khi chưa khắc phục. Nháp báo cáo dùng cùng reportId, chỉ đổi revision; xem trước không kết thúc đợt.');
w.get('w-preview').link='work-report';
w.edge('w-start','w-open-round','',{bend:310}).edge('w-open-round','r-route','',{bend:620})
 .edge('r-route','r-measure','Cần dữ kiện',{out:'bottom',via:[[687,556]],labelSegment:1})
 .edge('r-measure','r-route','Đã lưu và tra cứu lại',{out:'bottom',in:'bottom',via:[[935,650],[687,650]],color:'#a67426',labelSegment:1})
 .edge('r-route','r-call','Cần chuyên gia').edge('r-call','r-handover','',{bend:1120}).edge('r-handover','w-expert-available')
 .edge('w-expert-available','r-join','Có',{out:'top',in:'bottom',via:[[1457,925],[1555,925]],labelSegment:0})
 .edge('w-expert-available','w-stop','Chưa có; giữ yêu cầu chờ',{via:[[2040,1146],[2040,556]],labelSegment:0})
 .edge('r-join','r-investigate').edge('r-investigate','r-action-merge','',{bend:2020})
 .edge('r-route','r-action-merge','Tự xử lý / PM đủ điều kiện',{out:'top',in:'top',via:[[687,205],[2117,205]],labelSegment:1})
 .edge('r-action-merge','r-plan','Có').edge('r-plan','r-act').edge('r-act','w-note').edge('w-note','w-save-event','',{bend:3120})
 .edge('w-save-event','w-confirm-now')
 .edge('w-confirm-now','w-expert-check','Có',{out:'top',in:'bottom',via:[[3467,925],[3545,925]],labelSegment:0})
 .edge('w-expert-check','w-more','',{bend:3700})
 .edge('w-confirm-now','w-more','Không / để xác nhận cuối đợt',{out:'right',in:'bottom',via:[[3767,1146]],labelSegment:0})
 .edge('w-more','r-plan','Còn; chọn bước tiếp',{out:'top',in:'top',via:[[3767,215],[2395,215]],labelSegment:1,color:'#a67426'})
 .edge('w-more','r-verify','Kết thúc kiểm tra đợt').edge('r-verify','w-outcome')
 .edge('w-outcome','w-result','Đạt hoặc còn việc / cần chờ',{bend:4430,labelSegment:0})
 .edge('w-outcome','w-exception','Đề nghị kết thúc chưa khắc phục',{out:'bottom',via:[[4277,556]],labelSegment:1})
 .edge('w-exception','w-exception-approved')
 .edge('w-exception-approved','w-result','Được phép; ghi đúng kết quả',{out:'right',in:'right',via:[[4920,556],[4920,1146]],labelSegment:0})
 .edge('w-exception-approved','w-stop','Chưa được phép; giữ mở',{out:'bottom',in:'bottom',via:[[4777,665],[2307,665]],labelSegment:1,color:'#a67426'})
 .edge('r-action-merge','w-stop','Chưa đủ điều kiện',{out:'bottom',via:[[2117,556]],labelSegment:1})
 .edge('w-stop','r-route','Điều tra / gọi hỗ trợ',{out:'left',in:'bottom',via:[[2000,556],[2000,620],[687,620]],labelSegment:1,color:'#a67426'})
 .edge('w-stop','w-result','Dừng đợt; còn việc',{out:'bottom',in:'bottom',via:[[2307,1400],[4615,1400]],labelSegment:1})
 .edge('w-outcome','w-pm-abnormal','Phát hiện bất thường PM',{out:'bottom',in:'top',via:[[4277,470],[4075,470]],labelSegment:1})
 .edge('w-pm-abnormal','r-route','Bổ sung bối cảnh, tra cứu / gọi chuyên gia',{out:'bottom',in:'bottom',via:[[4075,680],[687,680]],labelSegment:1,color:'#a67426'})
 .edge('w-result','w-end','',{bend:4760})
 .edge('w-more','w-preview','Xem nháp trong lúc làm',{out:'right',in:'top',via:[[3860,330],[3860,1000],[5455,1000]],labelSegment:2})
 .edge('w-preview','w-more','Tiếp tục cùng đợt; không chốt báo cáo',{out:'bottom',in:'bottom',via:[[5455,1415],[3767,1415]],labelSegment:1,color:'#a67426'});

// Page 05: report from all rounds; restoration != report confirmation != knowledge approval.
const f=new Diagram('work-report','05 · AI tổng kết, xác nhận đóng góp và lưu báo cáo',6090,[lane('worker',450),lane('expert',340),lane('ai',450)],'Chi tiết r-report · Một reportId; revision theo lần cập nhật · Hồ sơ và máy không đổi trạng thái vì AI lỗi hoặc báo cáo chờ xác nhận');
f.event('f-start','worker','start',240,132,'Đủ điều kiện kết thúc\nhoặc xem nháp')
 .task('f-collect','ai',350,90,'Lấy mọi đợt, nhật ký,\nPM, nguồn, người tham gia\nvà quyết định kết thúc')
 .task('f-ai-draft','ai',650,90,'AI soạn nháp từ dữ kiện\nGắn căn cứ tới ghi nhận\nKhông tự điền dữ kiện thiếu')
 .gateway('f-ai-ok','ai',940,109,'Có nháp AI\nhợp lệ?')
 .task('f-fallback','ai',1110,280,'Giữ nhật ký và nháp cũ\nĐiền mẫu từ dữ kiện đã có\nCho sửa tay / thử lại')
 .task('f-review','worker',1370,104,'Người bảo trì đọc, sửa\nxác nhận tổng kết thực tế\nKết quả / nguyên nhân riêng')
 .gateway('f-purpose','worker',1670,123,'Chỉ xem nháp hay\nchốt báo cáo?')
 .event('f-preview-end','worker','end',1880,322,'Nháp được giữ\nTiếp tục hồ sơ')
 .gateway('f-contributions','ai',1950,109,'Còn phần chuyên gia\nchưa xác nhận?')
 .task('f-confirm','expert',2220,85,'Đọc nhóm đóng góp\nđúng phiên bản của mình\nXác nhận hoặc yêu cầu sửa')
 .gateway('f-confirm-result','expert',2510,104,'Kết quả\nxác nhận?')
 .task('f-edit','worker',2460,310,'Sửa phần có căn cứ\nGiữ trước/sau; chỉ yêu cầu\nxác nhận lại phần bị ảnh hưởng')
 .task('f-wait','ai',2660,280,'Giữ báo cáo Chờ xác nhận\nNhật ký đã lưu; máy và\ntiến độ công việc độc lập')
 .event('f-wait-end','ai','end',2950,308,'Kết thúc phiên\nTiếp tục xác nhận sau')
 .task('f-check','ai',3100,90,'Kiểm tra điều kiện chốt\nNguồn, revision, xác nhận\nvà kết quả thực tế')
 .gateway('f-valid','ai',3400,109,'Đủ điều kiện\nchốt báo cáo?')
 .task('f-history','ai',3660,90,'Lưu báo cáo đã xác nhận\nvào lịch sử máy; giữ\ncác đợt và đóng góp')
 .task('f-sync','ai',3960,90,'Nếu có API/quyền ghi:\nđồng bộ lịch sử sang HozenDX\nLỗi: giữ hàng chờ, thử lại')
 .event('f-end','worker','end',4280,132,'Trở về trang 02\nĐánh giá tri thức tái dùng');
f.note('worker',340,40,880,240,'Báo cáo gồm: bối cảnh, điều kiện/model sản phẩm/5M1E; giả thuyết và căn cứ; mọi bước đã thử và kết quả.\nNguyên nhân: Đã xác nhận / Còn giả thuyết / Chưa xác định. Máy phục hồi không tự xác nhận nguyên nhân.\nViệc tương lai được ghi thành việc theo dõi. Kết thúc chưa khắc phục cần lý do và quyết định phù hợp.\nNgười bảo trì xác nhận tổng hợp; chuyên gia xác nhận phần mình. Tái dùng xác nhận cuối đợt nếu nội dung không đổi.\nXem nháp giữ reportId, đổi reportRevision; có dữ kiện mới thì nháp cần cập nhật. Không ghi đè bản đã chốt.')
 .note('expert',4450,50,1450,240,'Nếu chuyên gia yêu cầu sửa: chỉ cập nhật/xác nhận lại phần bị ảnh hưởng. Chưa phản hồi: lưu chờ và kết thúc phiên, không phải đợi tại màn hình.\nBa trạng thái riêng: machineState (thực tế), workState (đang làm/chờ/kết thúc), reportState (nháp/chờ/đã xác nhận).\nĐồng bộ HozenDX theo API và quyền thực tế; lỗi đồng bộ không đảo ngược báo cáo đã lưu. Hiện nguồn và thời điểm.\nSau chốt, đính chính phải có lý do, trước/sau và xác nhận phần bị ảnh hưởng; tác động tri thức thì gửi đề xuất cập nhật.\nBài học mới vẫn qua chuyên gia trưởng. Lưu lịch sử công việc không chờ duyệt tri thức.');
f.edge('f-start','f-collect','',{bend:310}).edge('f-collect','f-ai-draft').edge('f-ai-draft','f-ai-ok')
 .edge('f-ai-ok','f-review','Có',{bend:1250,labelSegment:0}).edge('f-ai-ok','f-fallback','Lỗi / chưa đủ cấu trúc',{out:'bottom',via:[[967,1296]],labelSegment:1})
 .edge('f-fallback','f-review','Dùng mẫu từ dữ kiện',{bend:1340,labelSegment:0}).edge('f-review','f-purpose')
 .edge('f-purpose','f-preview-end','Xem nháp',{out:'bottom',via:[[1697,520],[1898,520]],in:'top',labelSegment:1})
 .edge('f-purpose','f-contributions','Chốt',{bend:1840,labelSegment:0})
 .edge('f-contributions','f-confirm','Còn',{bend:2140,labelSegment:0})
 .edge('f-contributions','f-check','Không / đã xác nhận đúng nội dung',{out:'bottom',in:'bottom',via:[[1977,1375],[3205,1375]],labelSegment:1})
 .edge('f-confirm','f-confirm-result')
 .edge('f-confirm-result','f-edit','Cần sửa',{out:'top',in:'bottom',via:[[2537,605],[2565,605]],labelSegment:0,color:'#a67426'})
 .edge('f-edit','f-review','Cập nhật bản tổng kết',{out:'bottom',in:'bottom',via:[[2565,615],[1475,615]],labelSegment:1,color:'#a67426'})
 .edge('f-confirm-result','f-wait','Chưa xác nhận / lưu chờ',{out:'bottom',via:[[2537,1296]],labelSegment:1}).edge('f-wait','f-wait-end')
 .edge('f-confirm-result','f-check','Xác nhận đúng',{bend:2880,labelSegment:0}).edge('f-check','f-valid')
 .edge('f-valid','f-review','Thiếu / bản đã đổi',{out:'top',in:'top',via:[[3427,205],[1475,205]],labelSegment:1,color:'#a67426'})
 .edge('f-valid','f-history','Đủ').edge('f-history','f-sync').edge('f-sync','f-end','',{bend:4230});

for(const d of [r,e,w,f])for(const n of d.nodes.filter(n=>n.kind==='gateway'))n.labelOffset=[d.edges.some(e=>(e.from===n.id&&e.out==='top')||(e.to===n.id&&e.in==='top'))?-100:0,-26];
const diagrams=[k,r,e,w,f];
const stats=diagrams.map(d=>d.validate());
const target=path.join(root,'denso-maintenance-workflows-BPMN.drawio');
fs.writeFileSync(target,`<mxfile host="app.diagrams.net" agent="Codex" type="device" pages="${diagrams.length}">\n${diagrams.map(d=>d.xml()).join('\n')}\n</mxfile>\n`);
fs.mkdirSync(path.join(root,'docs/bpmn'),{recursive:true});
for(const d of diagrams)fs.writeFileSync(path.join(root,'docs/bpmn',d.id+'.svg'),d.svg());
fs.writeFileSync(path.join(root,'docs/bpmn/optimized-nodes.json'),JSON.stringify(diagrams.map(d=>({id:d.id,name:d.name,nodes:d.nodes.map(n=>({id:n.id,label:n.label,link:n.link})),edges:d.edges.map(e=>({from:e.from,to:e.to,label:e.label}))})),null,2));
console.log(JSON.stringify(stats,null,2));
