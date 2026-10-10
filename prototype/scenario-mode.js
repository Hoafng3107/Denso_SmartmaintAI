(function () {
  'use strict';
  const S = window.SM;
  const roleIds = { maintenance: 'u-minh', expert: 'u-hai', lead: 'u-anh' };
  let run = null;
  const esc = S.e;
  const baseCommit = S.commit;
  const baseGo = S.go;

  function caseNow() { return run && S.db.cases.find(c => c.id === run.caseId); }
  function setRole(role) {
    S.session.userId = roleIds[role];
    try { sessionStorage.setItem('denso.smartmaint.session.v3', roleIds[role]); } catch (_) { /* memory session */ }
  }
  function goto(page, tab = null, role = null) {
    if (role) setRole(role);
    S.closeModal();
    S.ui = { page, id: run?.caseId || null, tab, menuOpen: false };
    try { history.replaceState(null, '', '#' + [page, run?.caseId || '', tab || ''].filter(Boolean).join('/')); } catch (_) {}
    S.render(); window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function syntheticCase(type) {
    const seedId = type === 'PM' ? 'PM-26012' : 'BM-26031';
    const seed = run.templates.cases.find(c => c.id === seedId) || run.templates.cases[0];
    if (!seed) return null;
    const c = S.clone(seed), now = S.now();
    c.id = S.uid(type); c.title = type === 'PM' ? 'Kiểm tra định kỳ · xác minh cảm biến' : 'Sự cố cảm biến · tín hiệu chập chờn';
    c.ownerId = roleIds.maintenance; c.expertId = null; c.participants = [roleIds.maintenance];
    c.createdAt = now; c.updatedAt = now; c.type = type; c.machineState = 'unverified'; c.workState = 'active'; c.reportState = 'draft';
    c.report = null; c.resultEvidence = ''; c.support = null; c.supportHistory = []; c.selectedSources = []; c.retrieval = null; c.confirmations = {};
    c.rounds = [{ id: S.uid('RD'), number: 1, state: 'active', startedAt: now, events: [] }];
    c.context = { ...(c.context || {}), symptom: type === 'PM' ? 'Kiểm tra định kỳ phát hiện cảm biến có tín hiệu không ổn định.' : 'Máy dừng ngắt quãng; tín hiệu cảm biến chập chờn.', alarm: type === 'PM' ? '' : 'ALM-SEN-04' };
    if (type === 'PM' && !c.pm?.length) {
      const asset = S.asset(c.assetId); c.pm = (asset?.pmTemplate?.items || []).map(x => ({ ...x, status: 'unperformed', value: '', abnormality: '' }));
    }
    if (type === 'PM') c.pm = (c.pm || []).map(x => ({ ...x, status: 'unperformed', value: '', abnormality: '' }));
    c.pmTemplate ||= type === 'PM' ? { id: 'PM-DEMO', version: 1 } : null;
    S.db.cases.unshift(c); run.caseId = c.id; run.workType = type;
    return c;
  }
  function patchRender() {
    const old = S.render;
    S.render = () => { old(); if (run) requestAnimationFrame(draw); };
  }
  function phaseText() {
    const stages = {
      choice: ['Chọn công việc', 'Bạn đang ở vai trò người bảo trì. Hãy chọn một ca mới để mở câu chuyện.'],
      case: ['Bắt đầu hồ sơ', 'Xác nhận thông tin máy và ghi bối cảnh. BM và PM dùng chung một hồ sơ; PM mở checklist đã cấu hình.'],
      pm: ['Thực hiện checklist PM', 'Người bảo trì ghi kết quả quan sát vào checklist. Nếu phát hiện bất thường, giữ nguyên kết quả Không đạt và mở nhánh điều tra trong cùng hồ sơ.'],
      sources: ['Đọc căn cứ', 'Tra cứu mô phỏng tìm tri thức đã duyệt cùng nhóm máy. Chọn tự xử lý hoặc mời chuyên gia; độ tương đồng không phải xác suất thành công.'],
      expert: ['Chuyên gia tham gia', 'Yêu cầu đã gắn với cùng hồ sơ. Chuyển vai trò để chuyên gia nhận và bắt đầu tham gia.'],
      unavailable: ['Chuyên gia chưa thể hỗ trợ', 'Phản hồi đã quay về người bảo trì. Hồ sơ vẫn thuộc người phụ trách; có thể tiếp tục ghi nhận hoặc tìm hỗ trợ khác.'],
      logging: ['Ghi nhận tại hiện trường', 'Chuyên gia đang thực hiện. Người bảo trì vẫn giữ hồ sơ và ghi lại theo mốc: ai làm, làm gì, kết quả ra sao.'],
      handoff: ['Chuyên gia bàn giao lại ca', 'Người bảo trì nhận thông báo, kiểm tra nhật ký chuyên gia và ghi kết quả kiểm chứng trước khi quyết định bước tiếp theo.'],
      waiting: ['Hồ sơ đang chờ', 'Đợt làm việc đã được lưu, nhưng ca vẫn mở. Khi có linh kiện hoặc điều kiện hỗ trợ, tiếp tục bằng đợt mới trong cùng hồ sơ.'],
      outcome: ['Chọn kết quả đợt', 'Kết quả chưa đạt vẫn được lưu thành một đợt riêng; có thể tiếp tục, chờ hỗ trợ hoặc kết thúc khi đủ điều kiện.'],
      report: ['Tổng kết hồ sơ', 'Đọc nhật ký, tạo báo cáo từ các dữ kiện đã ghi và chọn có đề xuất bài học để kiểm duyệt hay không.'],
      lead: ['Kiểm duyệt tri thức', 'Chuyên gia trưởng xem đề xuất tách biệt với lịch sử bảo trì, rồi phê duyệt, yêu cầu bổ sung hoặc từ chối có lý do.'],
      done: ['Kịch bản hoàn tất', 'Hồ sơ và lịch sử các đợt vẫn nằm trong dữ liệu mô phỏng của phiên trình bày. Bạn có thể chạy lại từ đầu hoặc tiếp tục khám phá màn hình.']
    };
    return stages[run.stage] || stages.choice;
  }
  function choices() {
    const c = caseNow();
    if (run.stage === 'choice') return `<div class="story-options"><button data-story="new" data-type="BM"><b>BM · Máy đang gặp sự cố</b><span>Máy dừng bất thường, có alarm hoặc dấu hiệu cần điều tra.</span></button><button data-story="new" data-type="PM"><b>PM · Kiểm tra định kỳ</b><span>Mở checklist theo máy; dấu hiệu bất thường chuyển sang ghi nhận và tra cứu.</span></button></div>`;
    if (run.stage === 'case') return `<div class="story-options"><button data-story="continue-context"><b>Tiếp tục với hồ sơ này</b><span>Mở bối cảnh máy và xác nhận thông tin công việc.</span></button><button data-story="sources"><b>Đã kiểm tra sơ bộ → tra cứu</b><span>Đi thẳng tới các nguồn liên quan trong dữ liệu demo.</span></button></div>`;
    if (run.stage === 'pm') return `<div class="story-options"><button data-story="pm-clear"><b>Checklist đạt, không có bất thường</b><span>Ghi kết quả PM và xem cách lưu một ca định kỳ bình thường.</span></button><button data-story="pm-abnormal"><b>Phát hiện bất thường</b><span>Đánh dấu Không đạt, ghi hiện tượng rồi chuyển sang tra cứu như ca BM.</span></button></div>`;
    if (run.stage === 'sources') return `<div class="story-options"><button data-story="self"><b>Tự xử lý theo căn cứ</b><span>Ghi nhận kiểm tra và kết quả trong hồ sơ.</span></button><button data-story="request-expert"><b>Yêu cầu chuyên gia</b><span>Khi thiếu căn cứ hoặc cần đánh giá tại hiện trường.</span></button></div>`;
    if (run.stage === 'expert') return `<div class="story-options"><button data-story="expert-accept"><b>Chuyên gia nhận và đến hiện trường</b><span>Chuyển sang tài khoản chuyên gia để ghi nhận tham gia.</span></button><button data-story="expert-unavailable"><b>Chuyên gia chưa thể hỗ trợ</b><span>Phản hồi được trả về người bảo trì để chọn phương án tiếp.</span></button></div>`;
    if (run.stage === 'unavailable') return `<div class="story-options"><button data-story="view-notice"><b>Mở thông báo & phản hồi</b><span>Xem lý do chuyên gia chưa thể hỗ trợ trên cùng hồ sơ.</span></button><button data-story="outcome"><b>Tiếp tục ghi nhận</b><span>Người bảo trì đánh giá bước tiếp theo; hồ sơ vẫn mở.</span></button></div>`;
    if (run.stage === 'logging') return `<label class="story-label" for="story-note">Ghi nhanh diễn biến của chuyên gia</label><textarea id="story-note" rows="3">Chuyên gia kiểm tra giắc nối cảm biến, đối chiếu tín hiệu đầu vào và đề nghị vệ sinh, cố định lại đầu nối.</textarea><div class="story-options"><button data-story="save-expert-note"><b>Lưu mốc vào nhật ký</b><span>Người nhập là Minh; người thực hiện là chuyên gia Hải.</span></button><button data-story="back-maintenance"><b>Trở lại người bảo trì</b><span>Tiếp tục ghi chép trước khi chọn kết quả đợt.</span></button></div>`;
    if (run.stage === 'handoff') return `<div class="story-options"><button data-story="view-notice"><b>Mở thông báo & nhật ký ca</b><span>Kiểm tra mốc do chuyên gia thực hiện và nội dung bàn giao.</span></button><button data-story="outcome"><b>Ghi kết quả kiểm chứng</b><span>Người bảo trì xác nhận kết quả máy và chọn bước tiếp theo.</span></button></div>`;
    if (run.stage === 'outcome') return `<div class="story-options"><button data-story="resolved"><b>Đã khắc phục và kiểm chứng</b><span>Kết thúc công việc, chuyển sang báo cáo.</span></button><button data-story="unresolved"><b>Chưa khắc phục · tiếp tục điều tra</b><span>Lưu kết quả này rồi mở đợt tiếp theo trong cùng hồ sơ.</span></button><button data-story="parts"><b>Chờ linh kiện / hỗ trợ</b><span>Kết thúc đợt nhưng giữ hồ sơ mở.</span></button></div>`;
    if (run.stage === 'waiting') return `<div class="story-options"><button data-story="resume-wait"><b>Đã sẵn sàng tiếp tục</b><span>Mở đợt tiếp theo trong cùng case ID và giữ lịch sử cũ.</span></button><button data-story="skip-review"><b>Tạm dừng demo tại đây</b><span>Hồ sơ vẫn ở trạng thái chờ, không tạo báo cáo kết thúc.</span></button></div>`;
    if (run.stage === 'report') return `<div class="story-options"><button data-story="make-report"><b>Tạo và rà báo cáo</b><span>Tổng hợp nhật ký để người phụ trách kiểm tra.</span></button><button data-story="propose"><b>Đề xuất bài học để duyệt</b><span>Chuyển dữ kiện đã xác nhận thành đề xuất riêng.</span></button><button data-story="skip-review"><b>Chỉ lưu lịch sử bảo trì</b><span>Không phải case nào cũng cần tạo tri thức tái sử dụng.</span></button></div>`;
    if (run.stage === 'lead') return `<div class="story-options"><button data-story="approve"><b>Phê duyệt</b><span>Xuất bản phiên bản tri thức đã duyệt.</span></button><button data-story="changes"><b>Yêu cầu bổ sung</b><span>Gửi phản hồi cho tác giả, giữ nguyên trạng thái chờ.</span></button><button data-story="reject"><b>Từ chối có lý do</b><span>Đề xuất không vào kho; hồ sơ nguồn vẫn giữ nguyên.</span></button></div>`;
    if (run.stage === 'done') return `<div class="story-options"><button data-story="restart"><b>Chạy kịch bản mới</b><span>Khôi phục dữ liệu mẫu ban đầu trong vùng trình bày.</span></button><button data-story="maintenance"><b>Mở lại hồ sơ với người bảo trì</b><span>Tiếp tục xem giao diện thật của cùng hồ sơ.</span></button></div>`;
    return '';
  }
  function draw() {
    if (!run || document.querySelector('#story-panel')) return;
    const [title, description] = phaseText();
    const role = S.user()?.role || 'maintenance';
    const labels = { maintenance: 'Người bảo trì', expert: 'Chuyên gia', lead: 'Chuyên gia trưởng' };
    const c = caseNow();
    const panel = document.createElement('aside'); panel.id = 'story-panel'; panel.className = 'story-panel';
    panel.tabIndex = -1; panel.setAttribute('role', run.stage === 'choice' ? 'dialog' : 'complementary');
    panel.setAttribute('aria-modal', String(run.stage === 'choice')); panel.setAttribute('aria-label', 'Kịch bản trình bày tương tác');
    panel.classList.toggle('story-panel--opening', run.stage === 'choice');
    document.body.classList.toggle('story-opening', run.stage === 'choice');
    const app = document.querySelector('#app'); if (app) app.inert = run.stage === 'choice';
    panel.innerHTML = `<div class="story-top"><span class="story-kicker">KỊCH BẢN TƯƠNG TÁC · ${esc(labels[role])}</span><button class="story-close" data-story="exit" aria-label="Thoát trình bày">×</button></div><div class="story-progress"><span style="width:${Math.min(100, run.visited.size * 14)}%"></span></div><h2>${esc(title)}</h2><p>${esc(description)}</p>${run.stage === 'choice' ? `<div class="story-roles"><article><b>01 · Người bảo trì</b><span>Mở hồ sơ, ghi nhận hiện trường và giữ trách nhiệm công việc.</span></article><article><b>02 · Chuyên gia</b><span>Hỗ trợ điều tra, ghi lại kinh nghiệm và xác nhận phần đóng góp.</span></article><article><b>03 · Chuyên gia trưởng</b><span>Kiểm duyệt bài học trước khi đưa vào kho dùng lại.</span></article></div><div class="notice notice-info story-assumption"><strong>Giả định demo</strong><span>Case, AI và HozenDX dùng dữ liệu mô phỏng. Hồ sơ mới sẽ đi xuyên suốt các vai trò; không ghi vào dữ liệu lưu của trình duyệt.</span></div>` : ''}${c ? `<div class="story-case"><span>HỒ SƠ ĐANG THEO DÕI</span><strong>${esc(c.id)} · ${esc(c.type)}</strong><small>${esc(c.title)} · ${c.rounds.length} đợt · ${c.rounds.reduce((n,r)=>n+r.events.length,0)} ghi nhận</small></div>` : ''}${choices()}<p class="story-note">Dữ liệu trình bày được cô lập khỏi hồ sơ lưu trên trình duyệt. Màn hình nghiệp vụ dùng chung một case ID khi đổi vai trò.</p>`;
    document.body.append(panel);
    panel.addEventListener('click', event => {
      const btn = event.target.closest('[data-story]'); if (!btn) return;
      handle(btn.dataset.story, btn.dataset.type);
    });
  }
  function clearPanel() { document.querySelector('#story-panel')?.remove(); document.body.classList.remove('story-opening'); }
  function stage(stage, page = 'case', tab = 'work', role = 'maintenance') {
    run.stage = stage; run.visited.add(stage); clearPanel(); goto(page, tab, role);
  }
  function addEvent(c, type, content, performer, result = '') {
    const round = c.rounds.find(r => r.state === 'active') || c.rounds[c.rounds.length - 1];
    const now = S.now(); round.events.push({ id: S.uid('EV'), type, content, performedBy: performer, enteredBy: roleIds.maintenance, performedAt: now, recordedAt: now, result, rationale: 'Kịch bản demo: ghi theo diễn biến tại hiện trường.' });
    c.updatedAt = now;
  }
  function handle(action, type) {
    const c = caseNow();
    if (action === 'exit') return finish();
    if (action === 'new') {
      const next = syntheticCase(type); if (!next) return S.toast('Không tạo được hồ sơ mẫu.');
      stage(type === 'PM' ? 'pm' : 'case', 'case', type === 'PM' ? 'work' : 'context'); return;
    }
    if (action === 'pm-clear' || action === 'pm-abnormal') { if (c) { c.pm = (c.pm || []).map((x, i) => ({ ...x, status: action === 'pm-abnormal' && i === 0 ? 'fail' : 'pass', abnormality: action === 'pm-abnormal' && i === 0 ? 'Tín hiệu cảm biến chập chờn khi kiểm tra.' : '', performedBy: roleIds.maintenance, performedAt: S.now() })); addEvent(c, action === 'pm-abnormal' ? 'check' : 'result', action === 'pm-abnormal' ? 'Checklist phát hiện cảm biến có tín hiệu không ổn định; mở điều tra bất thường.' : 'Hoàn tất checklist PM theo mẫu cấu hình; không ghi nhận bất thường.', roleIds.maintenance, action === 'pm-abnormal' ? 'Bất thường được chuyển sang nhánh tra cứu.' : 'Các mục đã kiểm tra đạt theo tiêu chí demo.'); if (action === 'pm-clear') { c.machineState = 'restored'; c.workState = 'ended'; c.rounds.forEach(r => { r.state = 'ended'; r.endedAt = S.now(); r.summary = 'Checklist PM hoàn tất; không ghi nhận bất thường.'; }); } } return stage(action === 'pm-abnormal' ? 'sources' : 'report', 'case', action === 'pm-abnormal' ? 'sources' : 'report'); }
    if (action === 'resume-wait') { if (c) { c.workState = 'active'; c.waitingReason = ''; c.rounds.push({ id: S.uid('RD'), number: c.rounds.length + 1, state: 'active', startedAt: S.now(), events: [] }); } return stage('outcome', 'case', 'work'); }
    if (action === 'continue-context') return stage('sources', 'case', 'context');
    if (action === 'sources') {
      if (c) { c.retrieval = { at: S.now(), stale: false, sources: S.db.knowledge.filter(k => k.status === 'published' && k.family === S.asset(c.assetId)?.family).map(k => ({ id: k.id, version: k.version })) }; }
      return stage('sources', 'case', 'sources');
    }
    if (action === 'self') { if (c) addEvent(c, 'check', 'Người bảo trì kiểm tra sơ bộ và đối chiếu nguồn tri thức liên quan.', roleIds.maintenance, 'Chưa đủ căn cứ xác định nguyên nhân.'); return stage('outcome', 'case', 'work'); }
    if (action === 'request-expert') {
      if (c) { c.support = { expertId: roleIds.expert, status: 'requested', reason: 'Căn cứ hiện có chưa đủ để xác định nguyên nhân; cần chuyên gia đánh giá tại hiện trường.', handover: c.context?.symptom || c.title, requestedAt: S.now() }; c.expertId = roleIds.expert; }
      return stage('expert', 'case', 'work');
    }
    if (action === 'expert-unavailable') { if (c?.support) { c.support.status = 'unavailable'; c.support.response = 'Chuyên gia đang xử lý công việc khác; tiếp tục ghi nhận và liên hệ đầu mối hỗ trợ.'; S.notice(roleIds.maintenance, 'Chuyên gia chưa thể hỗ trợ', c.support.response, { page: 'case', id: c.id, tab: 'work' }); } return stage('unavailable', 'case', 'work', 'maintenance'); }
    if (action === 'expert-accept') { if (c?.support) { c.support.status = 'joined'; c.support.joinedAt = S.now(); c.support.stage = 'Điều tra nguyên nhân và đánh giá hướng xử lý'; if (!c.participants.includes(roleIds.expert)) c.participants.push(roleIds.expert); addEvent(c, 'observation', 'Chuyên gia Hải bắt đầu tham gia điều tra tại hiện trường.', roleIds.expert); S.notice(roleIds.maintenance, 'Chuyên gia đã bắt đầu hỗ trợ', 'Ghi lại các mốc thao tác và kết quả trong hồ sơ ' + c.id + '.', { page: 'case', id: c.id, tab: 'work' }); } return stage('logging', 'case', 'work', 'expert'); }
    if (action === 'save-expert-note') { const note = document.querySelector('#story-note')?.value.trim(); if (note && c) { addEvent(c, 'action', note, roleIds.expert, 'Đang chờ người bảo trì ghi kết quả kiểm chứng.'); S.notice(roleIds.maintenance, 'Chuyên gia đã hoàn tất lượt hỗ trợ', 'Chuyên gia Hải đã ghi xong phần thao tác. Hãy kiểm tra kết quả và ghi bước tiếp theo trong hồ sơ ' + c.id + '.', { page: 'case', id: c.id, tab: 'work' }); } return stage('handoff', 'case', 'work', 'maintenance'); }
    if (action === 'back-maintenance') return stage('logging', 'case', 'work', 'maintenance');
    if (action === 'view-notice') return stage('handoff', 'notifications', null, 'maintenance');
    if (action === 'outcome') return stage('outcome', 'case', 'work', 'maintenance');
    if (action === 'resolved') { if (c) { addEvent(c, 'result', 'Chạy kiểm chứng theo điều kiện vận hành đã xác nhận.', roleIds.maintenance, 'Tín hiệu ổn định trong lần kiểm tra.'); c.machineState = 'restored'; c.workState = 'ended'; c.resultEvidence = 'Kiểm chứng sau xử lý: tín hiệu ổn định trong lần chạy thử.'; c.rounds.forEach(r => { if (r.state === 'active') { r.state = 'ended'; r.endedAt = S.now(); r.summary = 'Đã xử lý và kiểm chứng theo ghi nhận trong đợt.'; } }); } return stage('report', 'case', 'report'); }
    if (action === 'unresolved' || action === 'parts') { if (c) { addEvent(c, 'result', 'Kiểm tra lại sau bước xử lý.', roleIds.maintenance, action === 'parts' ? 'Chưa thể kết luận; chờ linh kiện phù hợp.' : 'Hiện tượng vẫn còn; cần tiếp tục điều tra.'); const r = c.rounds[c.rounds.length - 1]; r.state = 'ended'; r.endedAt = S.now(); r.summary = action === 'parts' ? 'Kết thúc đợt, chờ linh kiện.' : 'Đợt chưa khắc phục; giữ lại toàn bộ bước đã thử.'; r.nextSteps = action === 'parts' ? 'Tiếp tục khi có linh kiện và xác nhận tương thích.' : 'Mở đợt tiếp theo trong cùng hồ sơ.'; c.workState = action === 'parts' ? 'waiting' : 'active'; c.waitingReason = r.nextSteps; if (action !== 'parts') c.rounds.push({ id: S.uid('RD'), number: c.rounds.length + 1, state: 'active', startedAt: S.now(), events: [] }); } return stage(action === 'parts' ? 'waiting' : 'sources', 'case', 'work'); }
    if (action === 'make-report') { if (c) { c.report ||= { id: S.uid('RP'), revision: 1, summary: c.rounds.flatMap(r => r.events).map(e => e.content).join('\n'), cause: 'Chưa xác định; cần đánh giá thêm bằng chứng.', lessons: 'Ghi lại kết quả hiệu quả và chưa hiệu quả để tra cứu lần sau.', limits: 'Chỉ phản ánh điều kiện của hồ sơ demo.', sourceChanged: false, manualFields: {}, versions: [] }; } return stage('report', 'case', 'report'); }
    if (action === 'propose') { if (c) { c.workState = 'ended'; c.machineState = c.machineState === 'unverified' ? 'restored' : c.machineState; c.reportState = 'confirmed'; c.report ||= { id: S.uid('RP'), revision: 1, summary: c.rounds.flatMap(r => r.events).map(e => e.content).join('\n'), cause: 'Chưa xác định.', lessons: 'Bài học cần chuyên gia trưởng rà soát trước khi dùng lại.', limits: 'Dữ liệu mô phỏng, giới hạn theo bối cảnh hồ sơ.', sourceChanged: false, manualFields: {}, versions: [] }; c.report.confirmedAt = S.now(); c.report.confirmedBy = roleIds.maintenance; const template = run.templates.proposals.find(p => p.status === 'pending') || run.templates.proposals[0]; if (template) { const p = S.clone(template); p.id = S.uid('DP'); p.title = 'Bài học từ ' + c.id; p.authorId = roleIds.maintenance; p.contributors = [roleIds.expert]; p.origin = 'case'; p.caseId = c.id; p.status = 'pending'; p.mode = 'new'; p.history = []; S.db.proposals.unshift(p); run.proposalId = p.id; } } return stage('lead', 'review', null, 'lead'); }
    if (action === 'skip-review') return stage('done', 'case', 'report');
    if (['approve', 'changes', 'reject'].includes(action)) { const p = S.db.proposals.find(x => x.id === run.proposalId); if (p) { p.status = action === 'approve' ? 'published' : action === 'changes' ? 'changes' : 'rejected'; p.reviewerId = roleIds.lead; p.feedback = action === 'approve' ? 'Đã đối chiếu nguồn, bối cảnh và giới hạn áp dụng.' : action === 'changes' ? 'Bổ sung bằng chứng kiểm chứng và phạm vi áp dụng trước khi gửi lại.' : 'Chưa đủ bằng chứng để đưa vào kho tri thức.'; } return stage('done', 'review', null, 'lead'); }
    if (action === 'maintenance') return stage('done', 'case', 'work', 'maintenance');
    if (action === 'restart') { finish(true); begin(); }
  }
  function begin() {
    if (S.unsavedChanges) return S.toast('Lưu nội dung đang nhập trước khi mở kịch bản.', 'warning');
    run = { db: S.db, ui: { ...S.ui }, userId: S.session.userId, savedAt: S.savedAt, url: location.href, base: null, stage: 'choice', caseId: null, visited: new Set(['choice']) };
    const old = S.db; S.db = { schema: 3, revision: 0, users: [], assets: [], knowledge: [], cases: [], proposals: [], notifications: [], audit: [], drafts: {} }; S.seeders.forEach(fn => fn(S.db)); run.base = S.clone(S.db); S.db = old; S.db = S.clone(run.base);
    run.templates = { cases: S.clone(S.db.cases), proposals: S.clone(S.db.proposals) };
    S.db.cases = []; S.db.proposals = []; S.db.notifications = []; S.db.audit = []; S.db.drafts = {};
    S.commit = (fn, message = '', rerender = true) => { fn(S.db); if (rerender) S.render(); if (message) S.toast(message); return true; };
    S.go = (page, id = null, tab = null) => { S.closeModal(); S.ui = { ...S.ui, page, id, tab }; S.render(); };
    setRole('maintenance'); clearPanel(); goto('dashboard', null, 'maintenance'); draw();
  }
  function finish(keep = false) {
    if (!run) return;
    const old = run; run = null; clearPanel(); document.body.classList.remove('story-opening'); const app = document.querySelector('#app'); if (app) app.inert = false; S.commit = baseCommit; S.go = baseGo;
    if (!keep) { S.db = old.db; S.ui = old.ui; S.session.userId = old.userId; S.savedAt = old.savedAt; try { history.replaceState(null, '', old.url); } catch (_) {} }
    else { S.db = S.clone(old.base); S.ui = { page: 'dashboard', id: null, tab: null }; setRole('maintenance'); try { history.replaceState(null, '', '#dashboard'); } catch (_) {} }
    S.render();
  }
  S.actions['story-start'] = begin;
  patchRender();
  window.addEventListener('keydown', e => { if (e.key === 'Escape' && run) finish(); });
})();
