/* Session-only, role-based demo roadmaps. Uses the shared modal and observes real user actions. */
(function () {
  'use strict';
  const S = window.SM;
  const LEGACY_KEYS = ['denso.smartmaint.guide.v1', 'denso.smartmaint.guide.v2'];
  try { LEGACY_KEYS.forEach(key => localStorage.removeItem(key)); } catch (_) { /* Continue with in-memory progress. */ }
  const roleNames = { maintenance: 'Người bảo trì', expert: 'Chuyên gia', lead: 'Chuyên gia trưởng' };
  const step = (id, title, instruction, targetPage, complete, options = {}) => ({ id, title, instruction, targetPage, complete, ...options });
  const eventIs = (type, name) => ctx => ctx.type === type && ctx.name === name;
  const onPage = (page, tab) => ctx => ctx.type === 'route' && S.ui.page === page && (!tab || S.ui.tab === tab);
  const caseWith = predicate => () => S.db.cases.some(c => predicate(c));
  const proposalWith = predicate => () => S.db.proposals.some(p => predicate(p));
  const flowDefaults = {
    'maintenance-support': { caseId: 'BM-26031' },
    'maintenance-resume': { caseId: 'BM-26028' },
    'maintenance-lesson': { caseId: 'BM-26021' },
    'expert-support': { caseId: 'BM-26031' },
    'expert-revise': { proposalId: 'DP-027' },
    'lead-review': { proposalId: 'DP-026' },
    'lead-request-changes': { proposalId: 'DP-026' },
    'lead-publish': { proposalId: 'DP-026' }
  };

  const flows = [
    {
      id: 'maintenance-new-case', role: 'maintenance', title: 'Tạo và xử lý ca bảo trì', summary: 'Chọn BM hoặc PM, tra cứu kho tri thức, ghi nhận xử lý và hoàn tất báo cáo.', start: ['new-case'],
      steps: [
        step('open-new', 'Mở màn hình tạo ca', 'Từ Tổng quan hoặc Ca bảo trì, chọn “Tạo ca mới”.', 'new-case', onPage('new-case')),
        step('create-case', 'Tạo hồ sơ BM hoặc PM', 'Chọn loại ca muốn demo (BM hoặc PM), chọn máy, xác nhận đúng máy, điền đủ thông tin bắt buộc rồi chọn “Tạo hồ sơ”.', 'new-case', ctx => eventIs('form', 'case-create')(ctx) && S.ui.page === 'case'),
        step('review-context', 'Kiểm tra bối cảnh và máy', 'Ca mới mở tại Giai đoạn 1. Bổ sung bối cảnh cần thiết rồi chọn “Tiếp tục: tra cứu nguồn”.', 'case', onPage('case', 'context')),
        step('open-sources', 'Mở Tra cứu & căn cứ', 'Tại Giai đoạn 2, chọn “Tìm nguồn liên quan”.', 'case', onPage('case', 'sources')),
        step('search-sources', 'Tra cứu kho tri thức', 'Chọn “Tìm nguồn liên quan”, theo dõi tiến trình AI và xem các tri thức đã duyệt cùng lịch sử của máy.', 'case', eventIs('action', 'case-search')),
        step('open-work', 'Mở Xử lý & nhật ký', 'Chọn “Tiếp tục: Ghi kiểm tra & xử lý” để sang Giai đoạn 3.', 'case', onPage('case', 'work')),
        step('complete-pm', 'Hoàn thành checklist PM', 'Cập nhật toàn bộ hạng mục theo kết quả thực tế. Nếu có mục Không đạt, ghi hiện tượng và chọn “Mở điều tra bất thường” cho mục đó.', 'case', ctx => ((ctx.type === 'input' && ctx.name === 'case-pm') || eventIs('action', 'case-pm-investigate')(ctx)) && caseWith(c => c.id === S.ui.id && c.pm?.every(x => x.status !== 'unperformed' && (x.status !== 'fail' || (x.abnormality?.trim() && x.investigationEventId))))(), { when: run => run.workType === 'PM' }),
        step('save-note', 'Ghi kiểm tra ban đầu', 'Ghi một quan sát hoặc bước kiểm tra thực tế vào nhật ký.', 'case', ctx => eventIs('form', 'case-note')(ctx)),
        step('save-outcome', 'Cập nhật kết quả đợt', 'Chọn “Ghi kết quả & chọn bước tiếp”, ghi căn cứ thực tế và lưu.', 'case', ctx => eventIs('form', 'case-outcome-save')(ctx)),
        step('open-report', 'Mở Báo cáo tổng kết', 'Khi kết thúc công việc, hệ thống chuyển sang Giai đoạn 4.', 'case', onPage('case', 'report')),
        step('draft-report', 'Tạo và lưu nháp báo cáo', 'Tạo nháp từ nhật ký, đối chiếu rồi lưu phần phù hợp.', 'case', ctx => eventIs('form', 'case-report-apply')(ctx)),
        step('finish-report', 'Chốt báo cáo', 'Kiểm tra điều kiện và xác nhận báo cáo cuối.', 'case', ctx => eventIs('form', 'case-report-close')(ctx) && caseWith(c => c.reportState === 'confirmed')())
      ]
    },
    {
      id: 'maintenance-support', role: 'maintenance', title: 'Yêu cầu chuyên gia hỗ trợ', summary: 'Gửi yêu cầu, theo dõi phối hợp và tiếp nhận kết quả.', start: ['cases'],
      steps: [
        step('open-cases', 'Mở danh sách ca', 'Mở module Ca bảo trì.', 'cases', onPage('cases')),
        step('open-case', 'Mở hồ sơ BM-26031', 'Chọn “Camera không nhận sản phẩm sau đổi mã” trong danh sách ca đang xử lý.', 'cases', ctx => eventIs('action', 'case-open')(ctx) && (ctx.target?.dataset.id || ctx.target?.dataset.case) === 'BM-26031' && S.ui.page === 'case'),
        step('record-context', 'Ghi bước đã kiểm tra', 'Trong Giai đoạn 3 “Xử lý & nhật ký”, lưu một ghi nhận để chuyên gia có đủ bối cảnh.', 'case', eventIs('form', 'case-note')),
        step('open-support', 'Mở yêu cầu hỗ trợ', 'Chọn chức năng yêu cầu chuyên gia trong hồ sơ.', 'case', eventIs('action', 'case-support')),
        step('send-support', 'Gửi yêu cầu', 'Chọn chuyên gia, ghi vấn đề cần làm rõ và gửi.', 'case', ctx => eventIs('form', 'case-support-send')(ctx) && caseWith(c => c.support?.status === 'requested')()),
        step('wait-expert', 'Theo dõi trạng thái tiếp nhận', 'Đóng hướng dẫn nếu cần và chuyển sang tài khoản Chuyên gia để tiếp tục luồng nhận hỗ trợ.', 'case', caseWith(c => ['accepted', 'joined'].includes(c.support?.status))),
        step('review-result', 'Xem kết quả chuyên gia', 'Sau khi chuyên gia ghi nhận, mở lại hồ sơ và đọc nhật ký mới.', 'case', ctx => onPage('case', 'work')(ctx) && caseWith(c => c.support?.status === 'joined')()),
        step('record-outcome', 'Ghi kết quả phối hợp', 'Cập nhật kết quả đợt và bước tiếp theo.', 'case', eventIs('form', 'case-outcome-save'))
      ]
    },
    {
      id: 'maintenance-resume', role: 'maintenance', title: 'Tiếp tục ca đang chờ', summary: 'Mở đúng hồ sơ, tạo đợt mới và tiếp tục ghi nhận.', start: ['cases'],
      steps: [
        step('open-waiting', 'Mở danh sách ca chờ', 'Trong Ca bảo trì, chọn bộ lọc ca đang chờ.', 'cases', ctx => eventIs('action', 'case-filter')(ctx) || onPage('cases')(ctx)),
        step('open-case', 'Mở hồ sơ BM-26028', 'Chọn hồ sơ “Rung tăng tại cụm trục chính — chờ linh kiện”.', 'cases', ctx => eventIs('action', 'case-open')(ctx) && (ctx.target?.dataset.id || ctx.target?.dataset.case) === 'BM-26028'),
        step('resume', 'Mở đợt xử lý mới', 'Chọn “Tiếp tục xử lý” để giữ nguyên cùng một hồ sơ.', 'case', ctx => eventIs('action', 'case-resume')(ctx) && caseWith(c => c.workState === 'active')()),
        step('save-note', 'Ghi diễn biến mới', 'Ghi điều kiện đã được đáp ứng và công việc vừa thực hiện.', 'case', eventIs('form', 'case-note')),
        step('save-outcome', 'Cập nhật kết quả', 'Lưu kết quả của đợt mới và hướng tiếp theo.', 'case', eventIs('form', 'case-outcome-save'))
      ]
    },
    {
      id: 'maintenance-lesson', role: 'maintenance', title: 'Hoàn tất báo cáo và tạo bài học', summary: 'Chốt báo cáo rồi tạo đề xuất tri thức từ hồ sơ.', start: ['cases'],
      steps: [
        step('open-case', 'Mở hồ sơ BM-26021', 'Chọn hồ sơ “Máy đã phục hồi — chờ xác nhận đóng góp”.', 'cases', ctx => eventIs('action', 'case-open')(ctx) && (ctx.target?.dataset.id || ctx.target?.dataset.case) === 'BM-26021'),
        step('open-report', 'Mở tab Báo cáo', 'Kiểm tra toàn bộ diễn biến và đóng góp.', 'case', onPage('case', 'report')),
        step('generate', 'Tạo nháp tổng kết', 'Tạo nháp từ nhật ký và xem nội dung được đề xuất.', 'case', eventIs('action', 'case-report-generate')),
        step('apply', 'Lưu nháp đã kiểm tra', 'Chọn phần phù hợp và xác nhận đã đối chiếu.', 'case', eventIs('form', 'case-report-apply')),
        step('close-report', 'Chốt báo cáo', 'Xác nhận báo cáo cuối khi đủ điều kiện.', 'case', eventIs('form', 'case-report-close')),
        step('propose', 'Tạo bài học từ ca', 'Chọn tạo đề xuất tri thức từ báo cáo đã xác nhận.', 'case', eventIs('action', 'case-propose')),
        step('preview', 'Xem trước đề xuất', 'Kiểm tra nội dung, nguồn và giới hạn trước khi gửi.', 'proposal', eventIs('action', 'k-submit-preview')),
        step('submit', 'Gửi kiểm duyệt', 'Xác nhận gửi đề xuất cho Chuyên gia trưởng.', 'proposal', ctx => eventIs('action', 'k-submit')(ctx) && proposalWith(p => p.status === 'pending')())
      ]
    },
    {
      id: 'expert-support', role: 'expert', title: 'Nhận yêu cầu hỗ trợ', summary: 'Nhận ca, bắt đầu tham gia và xác nhận phần đóng góp.', start: ['assignments'],
      steps: [
        step('open-assignments', 'Mở yêu cầu hỗ trợ', 'Mở module Hỗ trợ & xác nhận.', 'assignments', onPage('assignments')),
        step('open-case', 'Mở hồ sơ BM-26031', 'Chọn yêu cầu BM-26031 và đọc nội dung bàn giao.', 'assignments', ctx => eventIs('action', 'case-open')(ctx) && (ctx.target?.dataset.id || ctx.target?.dataset.case) === 'BM-26031'),
        step('accept', 'Nhận hỗ trợ', 'Chọn nhận yêu cầu để phản hồi cho người bảo trì.', 'case', ctx => eventIs('action', 'case-support-accept')(ctx) && caseWith(c => c.support?.status === 'accepted')()),
        step('join', 'Bắt đầu tham gia', 'Xác nhận công đoạn và thời điểm bắt đầu tham gia.', 'case', ctx => eventIs('form', 'case-support-start')(ctx) && caseWith(c => c.support?.status === 'joined')()),
        step('record', 'Ghi đánh giá chuyên môn', 'Lưu kiểm tra, hành động hoặc kết quả do bạn thực hiện.', 'case', eventIs('form', 'case-note')),
        step('confirm', 'Xác nhận phần đóng góp', 'Mở nhóm ghi nhận của bạn và xác nhận nội dung chính xác.', 'case', eventIs('action', 'case-group-confirm'))
      ]
    },
    {
      id: 'expert-new-knowledge', role: 'expert', title: 'Ghi tri thức mới', summary: 'Tạo, chắt lọc, đối chiếu và gửi đề xuất.', start: ['proposals'],
      steps: [
        step('open-proposals', 'Mở Đề xuất tri thức', 'Mở module Đề xuất của tôi.', 'proposals', onPage('proposals')),
        step('new', 'Tạo bản nháp mới', 'Chọn “Ghi tri thức mới”.', 'proposals', eventIs('action', 'k-new')),
        step('structure', 'Chắt lọc ghi chú', 'Nhập ghi chú và chọn chức năng chắt lọc nội dung.', 'proposal', eventIs('action', 'k-structure')),
        step('apply', 'Áp dụng nội dung đã chọn', 'Chọn các khối phù hợp và đưa vào biểu mẫu.', 'proposal', eventIs('form', 'k-apply-structure')),
        step('compare', 'Đối chiếu kho tri thức', 'Chạy đối chiếu để xem nguồn tương tự đã được duyệt.', 'proposal', eventIs('action', 'k-compare')),
        step('preview', 'Xem trước đề xuất', 'Kiểm tra nguồn, giới hạn và nội dung trước khi gửi.', 'proposal', eventIs('action', 'k-submit-preview')),
        step('submit', 'Gửi kiểm duyệt', 'Xác nhận gửi bản đề xuất.', 'proposal', ctx => eventIs('action', 'k-submit')(ctx) && proposalWith(p => p.status === 'pending')())
      ]
    },
    {
      id: 'expert-revise', role: 'expert', title: 'Bổ sung đề xuất bị trả lại', summary: 'Đọc phản hồi, chỉnh sửa và gửi lại phiên bản mới.', start: ['proposals'],
      steps: [
        step('open-list', 'Mở danh sách đề xuất', 'Lọc các đề xuất cần bổ sung.', 'proposals', onPage('proposals')),
        step('open', 'Mở đề xuất DP-027', 'Chọn đề xuất CNC có trạng thái “Cần bổ sung”.', 'proposals', ctx => eventIs('action', 'k-open-proposal')(ctx) && ctx.target?.dataset.id === 'DP-027'),
        step('review-feedback', 'Đọc phản hồi kiểm duyệt', 'Đọc nhận xét và phần nội dung cần làm rõ.', 'proposal', onPage('proposal')),
        step('compare', 'Đối chiếu lại kho', 'Sau khi cập nhật nội dung, chạy đối chiếu lại.', 'proposal', eventIs('action', 'k-compare')),
        step('preview', 'Xem trước phiên bản mới', 'Kiểm tra đầy đủ nội dung và phản hồi.', 'proposal', eventIs('action', 'k-submit-preview')),
        step('submit', 'Gửi lại kiểm duyệt', 'Xác nhận gửi phiên bản mới.', 'proposal', eventIs('action', 'k-submit'))
      ]
    },
    {
      id: 'lead-review', role: 'lead', title: 'Kiểm duyệt tri thức mới', summary: 'Đọc nguồn, chọn quyết định và lưu kết quả kiểm duyệt.', start: ['review'],
      steps: [
        step('open-queue', 'Mở hàng đợi kiểm duyệt', 'Mở module Kiểm duyệt tri thức.', 'review', onPage('review')),
        step('open-review', 'Mở đề xuất DP-026', 'Chọn đề xuất Vision đang chờ duyệt.', 'review', ctx => eventIs('action', 'k-open-review')(ctx) && ctx.target?.dataset.id === 'DP-026'),
        step('source', 'Kiểm tra nguồn', 'Mở báo cáo nguồn hoặc tài liệu liên quan để đối chiếu.', 'review-detail', ctx => ['k-case-source', 'k-source'].includes(ctx.name) && ctx.type === 'action'),
        step('decision', 'Nhập quyết định và căn cứ', 'Chọn quyết định, ghi nhận xét rồi xem lại.', 'review-detail', eventIs('form', 'k-decision')),
        step('confirm', 'Xác nhận quyết định', 'Kiểm tra bản xem trước và xác nhận.', 'review-detail', eventIs('action', 'k-confirm-decision'))
      ]
    },
    {
      id: 'lead-request-changes', role: 'lead', title: 'Yêu cầu tác giả bổ sung', summary: 'Gửi phản hồi rõ ràng để tác giả tạo phiên bản mới.', start: ['review'],
      steps: [
        step('open-queue', 'Mở hàng đợi', 'Mở danh sách đề xuất đang chờ.', 'review', onPage('review')),
        step('open-review', 'Mở đề xuất DP-026', 'Chọn đề xuất Vision đang chờ duyệt để thử nhánh yêu cầu bổ sung.', 'review', ctx => eventIs('action', 'k-open-review')(ctx) && ctx.target?.dataset.id === 'DP-026'),
        step('source', 'Đối chiếu nguồn', 'Kiểm tra nguồn và dấu vết đóng góp.', 'review-detail', ctx => ['k-case-source', 'k-source'].includes(ctx.name) && ctx.type === 'action'),
        step('decision', 'Chọn yêu cầu bổ sung', 'Chọn “Yêu cầu bổ sung / xác nhận thay đổi”, ghi cụ thể nội dung cần sửa rồi xem lại quyết định.', 'review-detail', ctx => eventIs('form', 'k-decision')(ctx) && new FormData(ctx.form).get('decision') === 'changes'),
        step('confirm', 'Gửi phản hồi', 'Xác nhận quyết định để chuyển lại cho tác giả.', 'review-detail', ctx => eventIs('action', 'k-confirm-decision')(ctx) && proposalWith(p => p.status === 'changes')())
      ]
    },
    {
      id: 'lead-publish', role: 'lead', title: 'Phê duyệt và xuất bản', summary: 'Xác minh phiên bản nguồn và đưa tri thức vào kho.', start: ['review'],
      steps: [
        step('open-queue', 'Mở hàng đợi', 'Mở danh sách đề xuất đang chờ.', 'review', onPage('review')),
        step('open-review', 'Mở đề xuất DP-026', 'Chọn đề xuất Vision đang chờ duyệt để thử nhánh phê duyệt.', 'review', ctx => eventIs('action', 'k-open-review')(ctx) && ctx.target?.dataset.id === 'DP-026'),
        step('source', 'Kiểm tra phiên bản nguồn', 'Mở nguồn để kiểm tra bối cảnh và phiên bản.', 'review-detail', ctx => ['k-case-source', 'k-source'].includes(ctx.name) && ctx.type === 'action'),
        step('decision', 'Chọn phê duyệt', 'Chọn “Phê duyệt và xuất bản”, ghi căn cứ rồi xem lại quyết định.', 'review-detail', ctx => eventIs('form', 'k-decision')(ctx) && new FormData(ctx.form).get('decision') === 'approve'),
        step('confirm', 'Xác nhận xuất bản', 'Xác nhận quyết định kiểm duyệt.', 'review-detail', ctx => eventIs('action', 'k-confirm-decision')(ctx) && proposalWith(p => p.status === 'approved')()),
        step('library', 'Kiểm tra trong kho tri thức', 'Mở Kho tri thức và kiểm tra nội dung vừa xuất bản.', 'library', onPage('library'))
      ]
    }
  ];

  let state = { runs: {}, history: [] };
  let pendingFlow = null;
  function save() {
    updateBadge();
  }
  function flowById(id) { return flows.find(flow => flow.id === id); }
  function currentRun(role = S.user()?.role) { return role ? state.runs[role] || null : null; }
  function currentFlow() { const run = currentRun(); return run && flowById(run.flowId); }
  function activeSteps(run, flow) { return flow.steps.filter(item => !item.when || item.when(run)); }
  function completedCount(run, flow) { return activeSteps(run, flow).filter(item => run.completed.includes(item.id)).length; }
  function routeFor(item, run, flow) {
    const route = { page: item.targetPage, id: null, tab: null };
    const caseTabs = {
      'review-context': 'context', 'open-sources': 'sources', 'search-sources': 'sources',
      'open-work': 'work', 'complete-pm': 'work', 'save-note': 'work', 'record-context': 'work', 'open-support': 'work',
      'send-support': 'work', 'wait-expert': 'work', 'review-result': 'work', 'record-outcome': 'work',
      'resume': 'work', 'save-outcome': 'work', 'open-report': 'report', 'generate': 'report',
      'apply': flow.id === 'maintenance-lesson' ? 'report' : null, 'close-report': 'report',
      'finish-report': 'report', 'propose': 'report'
    };
    const proposalTabs = { 'new': 'raw', 'structure': 'raw', 'apply': 'form', 'review-feedback': 'form', 'compare': 'compare', 'preview': 'compare', 'submit': 'compare' };
    if (route.page === 'case') { route.id = run.caseId; route.tab = caseTabs[item.id] || 'work'; }
    if (route.page === 'proposal') { route.id = run.proposalId; route.tab = proposalTabs[item.id] || 'form'; }
    if (route.page === 'review-detail') route.id = run.proposalId;
    return route;
  }
  function routeAvailable(route) {
    if (!route.id) return !['case', 'proposal', 'review-detail'].includes(route.page);
    if (route.page === 'case') return S.db.cases.some(c => c.id === route.id);
    if (['proposal', 'review-detail'].includes(route.page)) return S.db.proposals.some(p => p.id === route.id);
    return true;
  }
  function contextElement(ctx) { return ctx.target || ctx.form || ctx.input || null; }
  function contextEntity(ctx) {
    const el = contextElement(ctx);
    return el?.dataset?.case || el?.dataset?.id || el?.closest?.('[data-case],[data-id]')?.dataset?.case || el?.closest?.('[data-case],[data-id]')?.dataset?.id || null;
  }
  function belongsToRun(ctx, run) {
    if (ctx.type === 'route') {
      if (S.ui.page === 'case' && run.caseId) return S.ui.id === run.caseId;
      if (['proposal', 'review-detail'].includes(S.ui.page) && run.proposalId) return S.ui.id === run.proposalId;
      return true;
    }
    const entity = contextEntity(ctx);
    if (!entity) return true;
    if (String(ctx.name || '').startsWith('case-') && run.caseId) return entity === run.caseId;
    if (String(ctx.name || '').startsWith('k-') && run.proposalId) return entity === run.proposalId;
    return true;
  }
  function updateBadge() {
    const badge = document.querySelector('[data-guide-progress]');
    if (!badge) return;
    const run = currentRun(), flow = currentFlow();
    if (!run || !flow) { badge.hidden = true; badge.textContent = ''; return; }
    const done = completedCount(run, flow);
    badge.hidden = false;
    const steps = activeSteps(run, flow);
    badge.textContent = run.status === 'complete' ? '✓' : `${done}/${steps.length}`;
    badge.closest('.guide-button')?.classList.toggle('guide-button-active', run.status === 'active');
  }
  function freshData() {
    const fresh = { schema: 3, revision: 0, users: [], assets: [], knowledge: [], cases: [], proposals: [], notifications: [], audit: [], drafts: {} };
    const live = S.db;
    S.db = fresh;
    S.seeders.forEach(seed => seed(S.db));
    S.db = live;
    return fresh;
  }
  function resetWorkData() {
    const clean = freshData();
    return S.commit(db => {
      const revision = db.revision;
      Object.keys(db).forEach(key => delete db[key]);
      Object.assign(db, S.clone(clean), { revision });
    }, '', false);
  }
  function configureFlowData(flow) {
    if (flow.id !== 'expert-support') return true;
    return S.commit(db => {
      const c = db.cases.find(item => item.id === 'BM-26031');
      if (!c) return;
      c.expertId = 'u-hai';
      c.support = {
        expertId: 'u-hai', status: 'requested',
        reason: 'Cần chuyên gia đối chiếu cấu hình và dữ liệu sau đổi model.',
        handover: 'Người bảo trì đã ghi nhận hiện tượng và bước kiểm tra ban đầu trong BM-26031.',
        requestedAt: S.now()
      };
      db.notifications.unshift({ id: S.uid('NT'), userId: 'u-hai', title: 'Có hồ sơ cần hỗ trợ', body: 'BM-26031: cần đối chiếu cấu hình sau đổi model.', route: { page: 'case', id: 'BM-26031', tab: 'work' }, createdAt: S.now(), read: false });
    }, '', false);
  }
  function renderCatalog() {
    const role = S.user().role, run = currentRun(role), list = flows.filter(flow => flow.role === role);
    const body = `<div class="guide-intro"><p>Chọn một luồng để hệ thống chuẩn bị dữ liệu demo sạch và theo dõi từng thao tác thực tế. Tiến trình được xóa khi tải lại trang.</p></div>
      ${run ? activeSummary(run, flowById(run.flowId)) : ''}
      <div class="guide-flow-list">${list.map((flow, index) => {
        const completed = state.history.some(item => item.role === role && item.flowId === flow.id);
        const requiredCount = flow.steps.filter(item => !item.when).length;
        const stepCount = requiredCount === flow.steps.length ? String(requiredCount) : `${requiredCount}–${flow.steps.length}`;
        return `<article class="guide-flow-card"><span class="guide-flow-number">${index + 1}</span><div class="guide-flow-copy"><span class="guide-flow-role">${S.e(roleNames[role])}</span><h3>${S.e(flow.title)}</h3><p>${S.e(flow.summary)}</p><span class="source-meta">${stepCount} bước · ${completed ? 'Đã hoàn thành trong phiên này' : 'Chưa hoàn thành'}</span></div><button type="button" class="btn btn-secondary" data-action="guide-prepare" data-flow="${S.e(flow.id)}">${run?.flowId === flow.id || completed ? 'Thực hiện lại' : 'Chọn luồng'}</button></article>`;
      }).join('')}</div>`;
    S.modal('Hướng dẫn demo', body, S.button('Đóng', 'close-modal', 'secondary'));
    document.getElementById('modal')?.classList.add('modal--large', 'modal--guide');
  }
  function activeSummary(run, flow) {
    if (!flow) return '';
    const done = completedCount(run, flow);
    const steps = activeSteps(run, flow);
    return `<section class="guide-active-summary"><div><span class="badge ${run.status === 'complete' ? 'badge-green' : 'badge-blue'}">${run.status === 'complete' ? 'Đã hoàn thành' : 'Đang thực hiện'}</span><h3>${S.e(flow.title)}</h3><p>${done}/${steps.length} bước đã hoàn thành</p></div><button type="button" class="btn btn-primary" data-action="guide-roadmap">Mở roadmap</button></section>`;
  }
  function renderRoadmap() {
    const run = currentRun(), flow = currentFlow();
    if (!run || !flow) return renderCatalog();
    const steps = activeSteps(run, flow), done = completedCount(run, flow), nextIndex = steps.findIndex(item => !run.completed.includes(item.id));
    const body = `<div class="guide-roadmap-head"><div><span class="guide-flow-role">${S.e(roleNames[flow.role])}</span><p>${S.e(flow.summary)}</p></div><strong>${done}/${steps.length}</strong></div>
      <div class="guide-progress" role="progressbar" aria-label="Tiến độ hướng dẫn" aria-valuemin="0" aria-valuemax="${steps.length}" aria-valuenow="${done}"><span style="width:${steps.length ? done / steps.length * 100 : 0}%"></span></div>
      <ol class="guide-checklist">${steps.map((item, index) => {
        const checked = run.completed.includes(item.id), current = !checked && index === nextIndex;
        const route = routeFor(item, run, flow), canGo = current && item.targetPage && routeAvailable(route);
        return `<li class="guide-check-item ${checked ? 'is-complete' : ''} ${current ? 'is-current' : ''}"><span class="guide-check-mark">${checked ? S.icon('check') : index + 1}</span><div><h3>${S.e(item.title)}</h3><p>${S.e(item.instruction)}</p>${canGo ? `<button type="button" class="btn btn-small btn-secondary" data-action="guide-go" data-page="${S.e(route.page)}" ${route.id ? `data-id="${S.e(route.id)}"` : ''} ${route.tab ? `data-tab="${S.e(route.tab)}"` : ''}>Đi đến màn hình</button>` : ''}</div></li>`;
      }).join('')}</ol>`;
    const footer = S.button('Danh sách luồng', 'guide-catalog', 'secondary') + S.button('Làm lại từ đầu', 'guide-restart', 'secondary') + (run.status === 'complete' ? S.button('Hoàn tất', 'guide-finish', 'primary') : S.button('Đóng và tiếp tục', 'close-modal', 'primary'));
    S.modal(flow.title, body, footer);
    document.getElementById('modal')?.classList.add('modal--large', 'modal--guide');
  }
  function prepare(flowId) {
    const flow = flowById(flowId);
    if (!flow || flow.role !== S.user()?.role) return;
    pendingFlow = flowId;
    S.modal('Bắt đầu luồng demo mới?', `<div class="stack"><div class="notice notice-warning">Dữ liệu ca, nhật ký, báo cáo, đề xuất và thông báo của lần demo hiện tại sẽ được khởi tạo lại.</div><p>Dữ liệu danh mục máy, tài khoản và tri thức mẫu vẫn được giữ để luồng hoạt động đầy đủ.</p><p><strong>Luồng đã chọn:</strong> ${S.e(flow.title)}</p></div>`, S.button('Hủy bỏ', 'close-modal', 'secondary') + S.button('Khởi tạo và bắt đầu', 'guide-start', 'primary'));
  }
  function start() {
    const flow = flowById(pendingFlow);
    if (!flow || !resetWorkData() || !configureFlowData(flow)) return;
    const run = { flowId: flow.id, status: 'active', completed: [], startedAt: S.now(), updatedAt: S.now(), ...(flowDefaults[flow.id] || {}) };
    state.runs[flow.role] = run;
    pendingFlow = null;
    save();
    S.closeModal();
    S.go(flow.start[0], flow.start[1] || null, flow.start[2] || null);
    setTimeout(renderRoadmap, 0);
  }
  function evaluate(ctx) {
    const run = currentRun(), flow = currentFlow();
    if (!run || !flow || run.status !== 'active') { updateBadge(); return; }
    const defaults = flowDefaults[flow.id] || {};
    if (!defaults.caseId && S.ui.page === 'case' && S.ui.id && S.db.cases.some(c => c.id === S.ui.id)) run.caseId = S.ui.id;
    if (!defaults.proposalId && S.ui.page === 'proposal' && S.ui.id && S.db.proposals.some(p => p.id === S.ui.id)) run.proposalId = S.ui.id;
    if (!defaults.proposalId && S.ui.page === 'review-detail' && S.ui.id && S.db.proposals.some(p => p.id === S.ui.id)) run.proposalId = S.ui.id;
    if (run.caseId && !run.workType) run.workType = S.db.cases.find(c => c.id === run.caseId)?.type || null;
    if (!belongsToRun(ctx, run)) { updateBadge(); return; }
    let changed = false;
    const steps = activeSteps(run, flow);
    for (const item of steps) {
      if (run.completed.includes(item.id)) continue;
      let passed = false;
      try { passed = Boolean(item.complete(ctx)); } catch (_) { passed = false; }
      if (passed) { run.completed.push(item.id); run.updatedAt = S.now(); changed = true; }
      break;
    }
    if (completedCount(run, flow) === steps.length) {
      run.status = 'complete';
      if (!state.history.some(item => item.role === flow.role && item.flowId === flow.id)) state.history.push({ role: flow.role, flowId: flow.id, completedAt: S.now() });
    }
    if (changed) {
      save();
      S.toast(run.status === 'complete' ? 'Đã hoàn thành luồng hướng dẫn.' : 'Đã hoàn thành bước hướng dẫn.');
      if (document.getElementById('modal')?.classList.contains('modal--guide')) renderRoadmap();
      if (run.status === 'active' && ctx.type !== 'route') setTimeout(() => evaluate({ type: 'route' }), 0);
    } else updateBadge();
  }

  S.actions['guide-open'] = () => currentRun() ? renderRoadmap() : renderCatalog();
  S.actions['guide-catalog'] = renderCatalog;
  S.actions['guide-roadmap'] = renderRoadmap;
  S.actions['guide-prepare'] = el => prepare(el.dataset.flow);
  S.actions['guide-start'] = start;
  S.actions['guide-restart'] = () => { const flow = currentFlow(); if (flow) prepare(flow.id); };
  S.actions['guide-go'] = el => {
    const page = el.dataset.page, id = el.dataset.id || null, tab = el.dataset.tab || null;
    const route = { page, id, tab };
    if (!routeAvailable(route)) {
      S.closeModal();
      S.go(page === 'case' ? 'cases' : page === 'review-detail' ? 'review' : page === 'proposal' ? 'proposals' : page);
      S.toast('Chưa có hồ sơ cho bước này. Hoàn thành bước trước để hệ thống tạo đúng dữ liệu.', 'warning');
      return;
    }
    S.closeModal();
    S.go(page, id, tab);
  };
  S.actions['guide-finish'] = () => { const role = S.user()?.role; if (role) delete state.runs[role]; save(); S.closeModal(); };

  document.addEventListener('click', event => {
    const target = event.target.closest('[data-action]');
    if (!target || target.dataset.action.startsWith('guide-')) return;
    const name = target.dataset.action;
    setTimeout(() => evaluate({ type: 'action', name, target }), 0);
  });
  document.addEventListener('submit', event => {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    const name = form.dataset.form;
    setTimeout(() => evaluate({ type: 'form', name, form }), 0);
  });
  for (const type of ['input', 'change']) document.addEventListener(type, event => {
    const input = event.target.closest('[data-input]');
    if (!input) return;
    setTimeout(() => evaluate({ type: 'input', name: input.dataset.input, input }), 0);
  });
  const baseRender = S.render;
  S.render = () => { baseRender(); requestAnimationFrame(() => { updateBadge(); evaluate({ type: 'route' }); }); };
  updateBadge();
  S.guide = { flows, evaluate, open: renderRoadmap };
})();
