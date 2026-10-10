(function () {
  'use strict';
  const S=window.SM;
  let tour=null, timer=null;
  const step=(page,tab,selector,title,text,id)=>({page,tab,selector,title,text,id});
  const scripts={
    maintenance:[
      step('dashboard',null,'.stat-grid','Không gian người bảo trì','Các số liệu chỉ phản ánh hồ sơ bạn phụ trách. Máy, công việc và báo cáo được theo dõi riêng.'),
      step('new-case',null,'[name="type"]','Bắt đầu BM hoặc PM','Chọn xử lý sự cố hoặc bảo dưỡng định kỳ. Mỗi công việc có một hồ sơ xuyên suốt.'),
      step('new-case',null,'[name="assetId"]','Xác định đúng máy','Chọn mã máy để nhận lý lịch mô phỏng từ HozenDX. Người làm vẫn phải xác nhận đúng máy tại hiện trường.'),
      step('new-case',null,'.notice-warning','Tránh mở trùng công việc','Nếu máy có hồ sơ đang mở, tiếp tục hồ sơ đó. Chỉ tạo công việc độc lập khi có lý do.'),
      step('case','context','[name="symptom"]','Ghi hiện tượng thực tế','Dấu hiệu quan sát khác với nguyên nhân. Ghi Alarm và vị trí khi có, không kết luận hỏng bộ phận chỉ từ hiện tượng.','active'),
      step('case','context','[name="productModel"]','Bối cảnh và điểm thay đổi','Model sản phẩm khác model máy. Chế độ, tốc độ, ca làm việc và 5M1E giúp đối chiếu đúng tình huống.','active'),
      step('case','sources','[data-action="case-search"]','Tìm case và tri thức chuyên gia','Tra cứu ưu tiên các nguồn đã duyệt cùng nhóm máy. Không coi độ giống là xác suất sửa thành công.','active'),
      step('case','sources','.source-card','Đọc căn cứ trước khi quyết định','Nguồn có tác giả, phiên bản và giới hạn. Đọc bước kiểm tra, bối cảnh và an toàn; người bảo trì tự đánh giá khả năng áp dụng.','active'),
      step('case','work','[data-action="case-support"]','Yêu cầu chuyên gia khi cần','Gửi bối cảnh và những bước đã thử. Người bảo trì tiếp tục phụ trách hồ sơ, hỗ trợ và ghi nhận khi chuyên gia làm việc.','active'),
      step('case','work','[data-form="case-note"]','Ghi nhanh trong lúc xử lý','Chọn Quan sát, Kiểm tra, Nhận định, Thao tác hoặc Kết quả. Tách người nhập với người thực hiện, giữ cả kết quả chưa hiệu quả.','active'),
      step('case','work','[data-action="case-outcome"]','Kết thúc đợt, không mất lịch sử','Ghi kết quả kiểm chứng rồi chọn tiếp tục, chờ linh kiện, bàn giao hoặc kết thúc công việc. Chờ xử lý vẫn giữ hồ sơ mở.','active'),
      step('case','work','[data-action="case-resume"]','Tiếp tục qua nhiều đợt','Hồ sơ mẫu này đã có hai đợt và đang chờ linh kiện. Tiếp tục tạo đợt mới trong cùng mã hồ sơ.','waiting'),
      step('case','work','[name="status"]','PM dùng checklist có sẵn','Mẫu PM do hệ thống cấu hình theo máy. Ghi Đạt, Không đạt hoặc Chưa thực hiện; bất thường được điều tra trong cùng hồ sơ.','pm'),
      step('case','report','.status-strip','Máy phục hồi, báo cáo vẫn có thể chờ','Hồ sơ mẫu đã kết thúc công việc, nhưng còn chờ chuyên gia xác nhận. Mở lại đi thẳng báo cáo, không yêu cầu sửa máy lại.','report'),
      step('case','report','[name="summary"]','Rà báo cáo từ mọi đợt','AI mô phỏng ghép nhật ký thành bản nháp. Người phụ trách kiểm tra; phần sửa tay được giữ. Máy chạy lại không chứng minh nguyên nhân gốc.','report'),
      step('case','report','[data-action="case-report-finalize"]','Chốt báo cáo rồi đề xuất tri thức','Chỉ chốt khi công việc kết thúc và đủ xác nhận. Sau đó có thể giữ lịch sử hoặc tạo đề xuất tri thức riêng để chuyên gia trưởng duyệt.','report')
    ],
    expert:[
      step('dashboard',null,'.stat-grid','Hai nhiệm vụ của chuyên gia','Chia sẻ kinh nghiệm chủ động và hỗ trợ xử lý tại hiện trường. Mỗi đóng góp đều gắn người thực hiện.'),
      step('proposals',null,'[data-action="k-new"]','Ghi tri thức khi thuận tiện','Tạo bản nháp để ghi kinh nghiệm. Nháp chưa phải tri thức chính thức và được giữ để tiếp tục sau.'),
      step('proposal','raw','[name="rawText"]','Một ô để gõ hoặc dán','Nhập trực tiếp, dán note hoặc nội dung biên bản vào cùng ô. Ghi âm là hướng phát triển sau.','draft'),
      step('proposal','raw','[data-action="k-structure"]','AI sắp xếp, chuyên gia kiểm tra','Bản demo trích các dòng có nhãn vào biểu mẫu, giữ nội dung gốc và để trống phần thiếu. Không tự tạo dữ kiện.','draft'),
      step('proposal','form','[name="content.symptom"]','Rà biểu mẫu chuẩn','Kiểm tra dấu hiệu, điều kiện, bước kiểm tra, xử lý và kết quả. Mục chưa rõ cần ghi lý do.','draft'),
      step('proposal','form','[name="content.safety"]','Nêu an toàn và giới hạn','Ghi quy trình tham chiếu và phạm vi áp dụng. Kinh nghiệm của một máy không mặc nhiên đúng cho tất cả máy.','draft'),
      step('proposal','compare','.data-table','Đối chiếu trước khi gửi','So sánh từng mục với nguồn đã duyệt. Khác cách diễn đạt chưa chứng minh khác về chuyên môn; cần đọc nội dung hai phía.','draft'),
      step('proposal','compare','[name="mode"]','Chọn cách đưa vào kho','Tạo mới nếu có khác biệt có giá trị; bổ sung bằng phiên bản kế tiếp; lưu trữ nháp nếu hoàn toàn trùng. Không ghi đè lịch sử.','draft'),
      step('proposal','compare','[data-action="k-submit-preview"]','Gửi bản đã kiểm tra','Gửi kiểm duyệt khóa đúng bản nội dung. Theo dõi phản hồi và hoàn thiện nếu người duyệt yêu cầu bổ sung.','draft'),
      step('assignments',null,'.grid-2','Nhận hỗ trợ hiện trường','Chuyên gia nhận yêu cầu hoặc phản hồi chưa thể hỗ trợ. Khi bắt đầu tham gia, ghi thời điểm và công đoạn.'),
      step('case','work','.timeline','Giải thích quyết định, giữ dấu vết','Người bảo trì có thể ghi hộ trong quá trình xử lý. Nhật ký phân biệt ai nhập, ai làm, kết quả và lý do đổi hướng.','report'),
      step('case','work','[data-action="case-group-modal"]','Xác nhận theo nhóm đóng góp','Đọc và xác nhận phần của mình theo từng đợt. Không cần duyệt từng dòng; nội dung bị sửa sẽ cần xác nhận lại.','report'),
      step('case','report','[data-action="case-report-confirm-open"]','Xác nhận cách thể hiện trong báo cáo','Chỉ xác nhận phần đóng góp của mình hoặc yêu cầu sửa. Người bảo trì phụ trách chốt báo cáo; chuyên gia trưởng duyệt tri thức tái sử dụng.','report')
    ],
    lead:[
      step('dashboard',null,'.stat-grid','Không gian kiểm duyệt','Theo dõi hàng đợi và chất lượng tri thức. Vai trò này không thay người thực hiện xác nhận kết quả sửa chữa.'),
      step('review',null,'.data-table','Hàng đợi từ hai nguồn','Đề xuất đến từ chuyên gia hoặc báo cáo case đã xác nhận. Chỉ bản đã gửi mới vào hàng đợi.'),
      step('review-detail',null,'.split-layout .card','Đọc bản gửi duyệt','Kiểm tra tác giả, nội dung, bằng chứng, phạm vi và căn cứ gửi. Người có đóng góp không được tự duyệt nội dung của mình.','review'),
      step('review-detail',null,'details.card','Kiểm tra nội dung gốc','Đối chiếu tri thức đã cấu trúc với ghi chú gốc và phản hồi của tác giả để tránh mất ý hoặc diễn giải sai.','review'),
      step('review-detail',null,'.data-table','So sánh nguồn đã có','Xem bản gốc và đề xuất cạnh nhau. Khi bổ sung, kiểm tra phần thay đổi và nội dung cũ còn cần giữ.','review'),
      step('review-detail',null,'[name="decision"]','Ba quyết định rõ ràng','Phê duyệt, yêu cầu bổ sung hoặc từ chối. Quyết định chỉ tác động đề xuất tri thức, không xóa lịch sử công việc nguồn.','review'),
      step('review-detail',null,'[name="feedback"]','Mọi quyết định đều có phản hồi','Ghi lý do và căn cứ để tác giả biết nội dung nào phù hợp, còn thiếu hoặc chưa đủ bằng chứng.','review'),
      step('review-detail',null,'[name="suggestText"]','Sửa chuyên môn cần tác giả xác nhận','Có thể đề nghị nội dung thay thế, rồi trả về tác giả đọc và gửi lại. Chỉnh biên tập tiêu đề được lưu dấu vết.','review'),
      step('review-detail',null,'[name="reviewConfirmed"]','Xác nhận trước khi ra quyết định','Kiểm tra nguồn, an toàn và phạm vi chuyên môn. Hệ thống có bước xem lại trước khi lưu quyết định.','review'),
      step('library',null,'.grid-2','Tri thức chính thức sẵn sàng tra cứu','Chỉ nguồn đã xuất bản xuất hiện trong kho. Tác giả, người duyệt và phiên bản giúp truy vết trách nhiệm.'),
      step('knowledge-detail',null,'.page-head','Giữ phiên bản và ghi nhận đóng góp','Khi có bổ sung, lưu phiên bản mới và giữ bản trước. Kho này phục vụ lần tra cứu của người bảo trì và vòng tích lũy tiếp theo.','knowledge')
    ]
  };
  function prepare(role){
    const db=S.clone(S.db),user=S.user();
    const own=db.cases.filter(c=>role==='maintenance'?c.ownerId===user.id:c.expertId===user.id||c.participants?.includes(user.id));
    const pick=(id,predicate)=>own.find(c=>c.id===id)||own.find(predicate);
    const ids={active:pick('BM-26031',c=>c.workState==='active')?.id,waiting:pick('BM-26028',c=>c.workState==='waiting')?.id,pm:pick('PM-26012',c=>c.type==='PM')?.id,report:pick('BM-26021',c=>!!c.report)?.id,knowledge:db.knowledge.find(k=>k.status==='published')?.id};
    const p=db.proposals.find(p=>role==='lead'?p.status==='pending':p.authorId===user.id&&['draft','changes'].includes(p.status))||db.proposals.find(p=>role==='lead'?p.authorId!==user.id:p.authorId===user.id);
    if(p&&role==='lead')p.status='pending';
    if(p){ids.draft=p.id;ids.review=p.id;if(role==='expert'){p.status='draft';const k=db.knowledge.find(k=>k.family===(p.family||'Vision'));if(k){p.family=k.family;p.content={...S.clone(k.content),...p.content};}p.authorConfirmed=true;p.comparison={version:p.version,at:S.now(),sources:db.knowledge.filter(k=>k.status==='published'&&k.family===p.family).slice(0,3).map(k=>({id:k.id,version:k.version}))};}}
    const c=db.cases.find(c=>c.id===ids.active);if(c)c.retrieval={at:S.now(),stale:false,sources:db.knowledge.filter(k=>k.family===S.asset(c.assetId)?.family&&k.status==='published').map(k=>({id:k.id,version:k.version}))};
    return {db,ids};
  }
  function cleanup(){clearTimeout(timer);document.querySelectorAll('.tour-target').forEach(el=>el.classList.remove('tour-target'));document.getElementById('tour-layer')?.remove();document.body.classList.remove('tour-running');}
  function end(){if(!tour)return;const old=tour;tour=null;cleanup();S.db=old.db;S.commit=old.commit;S.ui=old.route;S.render();history.replaceState(null,'',old.hash);window.scrollTo(0,old.scroll);document.querySelector('[data-action="tour-start"]')?.focus();S.toast('Đã kết thúc trình bày. Dữ liệu làm việc được giữ nguyên.');}
  function position(){if(!tour)return;const target=document.querySelector('.tour-target'),ring=document.getElementById('tour-ring');if(!target||!ring)return;const r=target.getBoundingClientRect();Object.assign(ring.style,{left:Math.max(4,r.left-6)+'px',top:Math.max(4,r.top-6)+'px',width:Math.min(innerWidth-8,r.width+12)+'px',height:Math.min(innerHeight-12,r.height+12)+'px'});}
  function show(index){
    if(!tour)return;cleanup();tour.index=Math.max(0,Math.min(tour.steps.length-1,index));const st=tour.steps[tour.index],id=st.id?tour.ids[st.id]:null;
    S.closeModal();S.ui={...S.ui,page:st.page,id,tab:st.tab,menuOpen:false};S.render();document.body.classList.add('tour-running');
    let target=(!st.id||id)?document.querySelector('#main-content '+st.selector):null;
    const missing=!target;target ||=document.querySelector('#main-content .page-head')||document.getElementById('main-content');
    for(let node=target;node;node=node.parentElement)if(node.tagName==='DETAILS')node.open=true;
    target.classList.add('tour-target');
    const layer=document.createElement('div');layer.id='tour-layer';layer.innerHTML=`<div class="tour-screen" aria-hidden="true"></div><div id="tour-ring" aria-hidden="true"></div><section class="tour-panel" role="dialog" aria-modal="true" aria-labelledby="tour-title"><div class="tour-heading"><span class="eyebrow">${S.e(tour.label)} · ${tour.index+1}/${tour.steps.length}</span><button class="icon-btn" data-tour="exit" aria-label="Kết thúc trình bày">${S.icon('close')}</button></div><div class="tour-progress"><span style="width:${(tour.index+1)/tour.steps.length*100}%"></span></div><h2 id="tour-title" tabindex="-1">${S.e(st.title)}</h2><p>${S.e(st.text)}</p>${missing?'<p class="field-hint">Dữ liệu hiện tại chưa có trạng thái minh họa cho vùng này. Đang giới thiệu nguyên tắc tại màn hình liên quan.</p>':''}<div class="tour-controls"><button class="btn btn-secondary" data-tour="prev" ${tour.index===0?'disabled':''}>Quay lại</button><label class="sr-only" for="tour-step">Chuyển đến bước</label><select class="select" id="tour-step">${tour.steps.map((s,i)=>`<option value="${i}" ${i===tour.index?'selected':''}>${i+1}. ${S.e(s.title)}</option>`).join('')}</select><button class="btn btn-primary" data-tour="next">${tour.index===tour.steps.length-1?'Hoàn tất':'Tiếp theo'}</button></div><p class="tour-footnote">Bản trình bày riêng · không lưu thay đổi vào dữ liệu làm việc · ← → đổi bước · Esc thoát</p></section>`;
    document.body.append(layer);
    target.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    timer=setTimeout(()=>{if(!tour)return;const r=target.getBoundingClientRect(),panel=document.querySelector('.tour-panel'),height=panel.getBoundingClientRect().height;window.scrollBy({top:r.top+r.height/2-(innerHeight-height)/2,behavior:'instant'});position();document.getElementById('tour-title')?.focus({preventScroll:true});},350);
    position();layer.querySelectorAll('[data-tour]').forEach(b=>b.addEventListener('click',()=>b.dataset.tour==='exit'?end():b.dataset.tour==='prev'?show(tour.index-1):tour.index===tour.steps.length-1?end():show(tour.index+1)));
    layer.querySelector('select').addEventListener('change',ev=>show(Number(ev.target.value)));
  }
  S.actions['tour-start']=()=>{
    if(tour)return;if(!S.user())return;if(S.unsavedChanges)return S.toast('Hãy xử lý nội dung chưa lưu trước khi trình bày.','warning');
    const role=S.user().role,label={maintenance:'Người bảo trì',expert:'Chuyên gia',lead:'Chuyên gia trưởng'}[role],prepared=prepare(role);
    tour={label,steps:scripts[role],index:0,ids:prepared.ids,db:S.db,route:{...S.ui},hash:location.hash,scroll:scrollY,commit:S.commit};S.db=prepared.db;S.commit=()=>false;show(0);
  };
  window.addEventListener('resize',position);window.addEventListener('scroll',position,true);
  document.addEventListener('keydown',ev=>{if(!tour)return;if(ev.key==='Escape'){ev.preventDefault();end();return;}if(ev.target.tagName==='SELECT')return;if(ev.key==='ArrowRight'){ev.preventDefault();tour.index===tour.steps.length-1?end():show(tour.index+1);}if(ev.key==='ArrowLeft'){ev.preventDefault();show(tour.index-1);}if(ev.key==='Tab'){const els=[...document.querySelectorAll('.tour-panel button:not(:disabled),.tour-panel select')];const at=els.indexOf(document.activeElement);if(ev.shiftKey&&(at<=0)){ev.preventDefault();els.at(-1).focus();}else if(!ev.shiftKey&&(at===els.length-1||at<0)){ev.preventDefault();els[0].focus();}}},true);
  window.addEventListener('popstate',()=>{if(tour)end();});
})();
