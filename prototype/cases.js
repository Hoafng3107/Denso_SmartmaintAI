(function () {
  'use strict';
  const S = window.SM;
  const h = S.escape;
  const icon = S.icon;
  const roles = ['maintenance', 'expert'];
  const labels = {
    machine: { unverified: 'Chưa đủ kiểm chứng', restored: 'Đã phục hồi', unrestored: 'Chưa phục hồi' },
    work: { active: 'Đang xử lý', waiting: 'Đang chờ / bàn giao', ended: 'Đã kết thúc công việc' },
    report: { draft: 'Nháp', pending: 'Chờ xác nhận', changes: 'Cần cập nhật', confirmed: 'Đã xác nhận' },
    event: { observation: 'Quan sát', check: 'Kiểm tra', hypothesis: 'Nhận định', action: 'Thao tác', result: 'Kết quả' }
  };
  const mGroups = ['Con người', 'Máy', 'Vật liệu / sản phẩm', 'Phương pháp', 'Đo lường', 'Môi trường'];
  const suggestedReports = {};
  const current = () => S.db.cases.find(x => x.id === S.ui.id);
  const get = id => S.db.cases.find(x => x.id === id);
  const who = () => S.user();
  const owner = c => !!(who() && c.ownerId === who().id && who().role === 'maintenance');
  const invited = c => !!(who() && (c.expertId === who().id || (c.participants || []).includes(who().id) || c.support?.expertId === who().id));
  const viewable = c => !!(c && who() && (owner(c) || (who().role === 'expert' && invited(c))));
  const expertWorking = c => who()?.role === 'expert' && c.support?.expertId === who().id && c.support.status === 'joined';
  const editable = c => viewable(c) && c.workState === 'active' && (owner(c) || expertWorking(c));
  const correctable = c => viewable(c) && c.reportState !== 'confirmed' && (owner(c) || expertWorking(c));
  const activeRound = c => c.rounds.find(r => r.state === 'active');
  const events = c => c.rounds.flatMap(r => r.events.map(e => ({ ...e, roundId: r.id, roundNumber: r.number })));
  const stamp = () => S.now();
  const button = (text, action, cls = 'secondary', attrs = '') => S.button(text, action, cls, attrs);
  const cid = c => `data-case="${h(c.id)}"`;
  const badge = (text, tone) => S.badge(text, tone);
  const select = (label, name, value, options, attrs = '', hint = '') => `<label class="field"><span class="field-label">${h(label)}</span><select class="select" name="${h(name)}" ${attrs}>${options.map(([v,t]) => `<option value="${h(v)}" ${String(v) === String(value) ? 'selected' : ''}>${h(t)}</option>`).join('')}</select>${hint ? `<span class="field-hint">${h(hint)}</span>` : ''}</label>`;
  const area = (label, name, value, attrs = '', hint = '') => `<label class="field"><span class="field-label">${h(label)}</span><textarea class="textarea" name="${h(name)}" ${/\brows=/.test(attrs)?'':'rows="3"'} ${attrs}>${h(value || '')}</textarea>${hint ? `<span class="field-hint">${h(hint)}</span>` : ''}</label>`;
  const field = (label, name, value, attrs = '', type = 'text') => `<label class="field"><span class="field-label">${h(label)}</span><input class="input" name="${h(name)}" type="${type}" value="${h(value || '')}" ${attrs}></label>`;
  const saveLabel = () => '<span class="save-state" data-save-state>Được giữ trên trình duyệt này</span>';
  const errorBox = () => '<div class="error-summary" role="alert" tabindex="-1" hidden></div>';
  const sourceTime = a => S.fmtDate(a?.sourceAt || '2026-10-08T08:00:00+07:00');
  const canFail = (form, text) => { S.error(form, text); return false; };
  function protect(c, mode = 'owner') {
    const ok = c && (mode === 'edit' ? editable(c) : mode === 'correct' ? correctable(c) : mode === 'view' ? viewable(c) : owner(c));
    if (!ok) S.toast('Tài khoản hiện tại không có quyền thực hiện thao tác này.', 'danger');
    return ok;
  }
  function draftKey(c) { return `case-note:${c.id}:${who().id}`; }
  function updated(c, action, detail = '') { c.updatedAt = stamp(); S.log(action, c.id, detail); }
  function dirtyReport(c) { if (c.report) c.report.sourceChanged = true; if (c.reportState === 'pending') c.reportState = 'changes'; }
  function eventSignature(e) { return JSON.stringify([e.id,e.type,e.content,e.performedBy,e.performedAt,e.result,e.measurement,e.unit,e.rationale]); }
  function groupSignature(r, person) { return r.events.filter(e => e.performedBy === person).map(eventSignature).join('|'); }
  function expertGroups(c) {
    const experts = S.db.users.filter(u => u.role === 'expert').map(u => u.id);
    return c.rounds.flatMap(r => experts.filter(id => r.events.some(e => e.performedBy === id)).map(id => ({ round: r, person: id, signature: groupSignature(r,id), confirmation: (c.confirmations || {})[`${r.id}:${id}`] })));
  }
  function groupConfirmed(g) { return !!(g.confirmation && g.confirmation.signature === g.signature && g.confirmation.status === 'confirmed'); }
  function reportSignature(c) { const r = c.report; return JSON.stringify([r?.summary,r?.cause,r?.causeStatus,r?.lessons,r?.limits,expertGroups(c).map(g=>g.signature)]); }
  function reportPeople(c) { return [...new Set(expertGroups(c).map(g=>g.person))]; }
  function pendingReportPeople(c) {
    const manual = Object.values(c.report?.manualFields || {}).some(Boolean);
    return reportPeople(c).filter(id => expertGroups(c).filter(g=>g.person===id).some(g=>!groupConfirmed(g)) || (manual && c.report?.confirmations?.[id]?.signature !== reportSignature(c)));
  }
  function newEvent(c, values) {
    const r = activeRound(c);
    const e = { id: S.uid('EV'), type: 'observation', content: '', enteredBy: who().id, performedBy: who().id, recordedAt: stamp(), performedAt: stamp(), result: '', measurement: '', unit: '', rationale: '', history: [], ...values };
    r.events.push(e); dirtyReport(c); return e;
  }
  function sourceSnapshot(c) { return events(c).map(e=>eventSignature(e)).join('|') + JSON.stringify(c.pm || []) + JSON.stringify(c.context || {}); }
  function buildReport(c) {
    const a = S.asset(c.assetId);
    const lines = [`${c.type} — ${a?.name || c.assetId}. ${c.context?.symptom || c.title}`];
    c.rounds.forEach(r => {
      lines.push(`\nĐợt ${r.number} — ${r.state === 'active' ? 'đang thực hiện' : 'đã kết thúc đợt'}:`);
      r.events.forEach(e => lines.push(`• ${labels.event[e.type] || e.type}: ${e.content}${e.measurement ? ` (${e.measurement} ${e.unit || ''})` : ''}${e.result ? ` — Kết quả: ${e.result}` : ''}. Người thực hiện: ${S.person(e.performedBy)}.${e.rationale ? ` Lý do: ${e.rationale}` : ''}`));
      if (r.summary) lines.push(`Tổng kết đợt: ${r.summary}`);
      if (r.nextSteps) lines.push(`Việc tiếp theo: ${r.nextSteps}`);
    });
    if (c.pm?.length) lines.push('\nChecklist PM:\n' + c.pm.map(x=>`• ${x.label}: ${x.status==='pass'?'Đạt':x.status==='fail'?'Không đạt':'Chưa thực hiện'}${x.value ? `; ${x.value} ${x.unit||''}`:''}${x.abnormality ? `; ${x.abnormality}`:''}`).join('\n'));
    lines.push(`\nTình trạng quan sát: ${labels.machine[c.machineState]}. Căn cứ: ${c.resultEvidence || 'Chưa ghi đủ căn cứ kiểm chứng.'}`);
    return { summary: lines.join('\n'), cause: '', causeStatus: 'unknown', lessons: 'Giữ nguyên các kết quả đã quan sát ở từng đợt. Chưa có kết luận tự động về nguyên nhân hoặc hiệu quả ngoài bối cảnh này.', limits: 'Báo cáo chỉ phản ánh hồ sơ này. Cần người tham gia xác nhận; mọi tri thức sử dụng lại phải qua kiểm duyệt riêng.' };
  }
  function makeReport(c, values) { return { id: S.uid('RP'), revision: 1, ...values, manualFields: {}, confirmations: {}, versions: [], generatedAt: stamp(), snapshot: sourceSnapshot(c), sourceChanged: false }; }

  S.seed(() => {
    if (S.db.seededCases) return;
    const at = '2026-10-09T08:00:00+07:00';
    const context = { symptom: 'Camera không nhận sản phẩm, tỷ lệ NG tăng sau đổi mã sản phẩm.', alarm: 'VISION-NG', component: 'Cụm camera kiểm tra', mode: 'Tự động', productModel: 'SP-A21', speed: 'Theo thông số đang được xác minh', shift: 'Ca sáng', onset: 'Sau đổi mã sản phẩm', environment: 'Chưa ghi nhận thay đổi môi trường', changes: mGroups.map((x,i)=>({ group:x,status:i===2?'changed':'unchecked',detail:i===2?'Chuyển từ SP-A20 sang SP-A21.':'' })) };
    const ev = (id,type,content,performedBy,result='',rationale='',atTime=at) => ({id,type,content,enteredBy:'u-minh',performedBy,performedAt:atTime,recordedAt:atTime,result,rationale,measurement:'',unit:'',history:[]});
    const base = { ownerId:'u-minh', expertId:null, participants:['u-minh'], machineState:'unverified', workState:'active', reportState:'draft', updatedAt:at, createdAt:at, confirmations:{}, report:null, selectedSources:[], retrieval:null, support:null, syncState:'unconfigured', resultEvidence:'' };
    S.db.cases.push(
      { ...structuredClone(base), id:'BM-26031',assetId:'VIS-01',title:'Camera không nhận sản phẩm sau đổi mã',type:'BM',context:structuredClone(context),rounds:[{id:'RD-26031-1',number:1,state:'active',startedAt:at,events:[ev('EV-3101','observation','Tỷ lệ NG tăng sau chuyển SP-A21. Chưa xác minh thông số recipe hiện tại.','u-minh','Máy đang dừng để kiểm tra.'),ev('EV-3102','check','Đối chiếu vùng quan sát trên màn hình theo tài liệu tham chiếu của máy.','u-minh','Hiện tượng vẫn còn; chưa đủ căn cứ kết luận camera hỏng.','Kiểm tra hiện tượng trước khi quyết định thay linh kiện.')] }] },
      { ...structuredClone(base), id:'BM-26028',assetId:'CNC-04',title:'Rung tăng tại cụm trục chính — chờ linh kiện',type:'BM',machineState:'unrestored',workState:'waiting',expertId:'u-hai',participants:['u-minh','u-hai'],support:{expertId:'u-hai',status:'joined',reason:'Cần xác minh nguồn rung',requestedAt:'2026-10-08T09:00:00+07:00',acceptedAt:'2026-10-08T09:10:00+07:00',joinedAt:'2026-10-08T09:30:00+07:00'},context:{symptom:'Rung bất thường tại cụm trục chính.',alarm:'',component:'Trục chính',mode:'Gia công',productModel:'SP-C07',speed:'Chưa xác minh',shift:'Ca sáng',onset:'Trong ca ngày 08/10',environment:'Chưa kiểm tra',changes:mGroups.map(group=>({group,status:'unchecked',detail:''}))},rounds:[{id:'RD-26028-1',number:1,state:'ended',startedAt:'2026-10-08T08:40:00+07:00',endedAt:'2026-10-08T11:00:00+07:00',summary:'Đã ghi nhận rung, lần kiểm tra ban đầu chưa khắc phục. Bàn giao chuyên gia kiểm tra thêm.',nextSteps:'Xác minh cụm liên quan theo quy trình máy.',events:[ev('EV-2801','observation','Ghi nhận rung tại vùng trục chính.','u-minh','Chưa xác định nguyên nhân.'),ev('EV-2802','check','Kiểm tra điều kiện gá đặt theo quy trình tham chiếu.','u-hai','Hiện tượng vẫn còn; chưa loại trừ các nguyên nhân khác.','Đối chiếu điều kiện làm việc trước khi đánh giá linh kiện.')]},{id:'RD-26028-2',number:2,state:'ended',startedAt:at,endedAt:'2026-10-09T10:00:00+07:00',summary:'Chưa phục hồi. Giữ máy ở trạng thái chờ và chuyển yêu cầu linh kiện tới bộ phận phụ trách.',nextSteps:'Chờ linh kiện và kế hoạch xử lý được xác nhận.',events:[ev('EV-2803','hypothesis','Nghi ngờ vấn đề ở cụm truyền động; cần xác minh bằng kiểm tra phù hợp.','u-hai','Chưa có kết luận nguyên nhân gốc.'),ev('EV-2804','result','Kết thúc đợt để chờ linh kiện; hồ sơ tiếp tục mở.','u-minh','Chưa phục hồi.')] }],waitingReason:'Chờ linh kiện',resultEvidence:'Các kiểm tra trong hồ sơ chưa chứng minh máy đạt điều kiện vận hành.' },
      { ...structuredClone(base), id:'PM-26012',assetId:'PRESS-02',title:'Bảo dưỡng định kỳ máy ép — mẫu PM đã cấu hình',type:'PM',context:{symptom:'Bảo dưỡng theo mẫu định kỳ của máy.',alarm:'',component:'Máy ép',mode:'Dừng theo kế hoạch bảo dưỡng',productModel:'',speed:'',shift:'Ca sáng',onset:'',environment:'',changes:mGroups.map(group=>({group,status:'unchecked',detail:''}))},pm:(S.asset('PRESS-02')?.pmTemplate?.items || []).map(x=>({...x,status:'unperformed',value:'',abnormality:''})),pmTemplate:{id:S.asset('PRESS-02')?.pmTemplate?.id,version:S.asset('PRESS-02')?.pmTemplate?.version},rounds:[{id:'RD-26012-1',number:1,state:'active',startedAt:at,events:[]}] },
      { ...structuredClone(base), id:'BM-26021',assetId:'VIS-01',title:'Máy đã phục hồi — chờ xác nhận đóng góp',type:'BM',machineState:'restored',workState:'ended',reportState:'pending',expertId:'u-hai',participants:['u-minh','u-hai'],support:{expertId:'u-hai',status:'joined',reason:'Xác minh điều kiện sau đổi model sản phẩm',requestedAt:at,acceptedAt:at,joinedAt:at},context:structuredClone(context),resultEvidence:'Đã ghi kết quả kiểm chứng trong đợt xử lý; tình trạng phục hồi do người thực hiện xác nhận trong kịch bản demo.',rounds:[{id:'RD-26021-1',number:1,state:'ended',startedAt:'2026-10-08T13:00:00+07:00',endedAt:'2026-10-08T15:00:00+07:00',summary:'Máy đã phục hồi; cần chuyên gia xác nhận các ghi nhận được nhập hộ.',nextSteps:'Theo dõi tái phát trong điều kiện sản phẩm tương ứng.',events:[ev('EV-2101','check','Đối chiếu thông số đang dùng với hồ sơ recipe cho model sản phẩm.','u-hai','Ghi nhận khác biệt cần xác minh.','Dấu hiệu xuất hiện sau đổi model sản phẩm.'),ev('EV-2102','action','Thực hiện phương án được người phụ trách xác nhận theo quy trình của máy.','u-hai','Sau kiểm chứng, máy phục hồi. Không tự kết luận đây là nguyên nhân gốc.'),ev('EV-2103','result','Ghi nhận kết quả kiểm chứng sau xử lý và yêu cầu tiếp tục theo dõi.','u-minh','Máy phục hồi trong điều kiện được quan sát.')] }] }
    );
    S.db.cases.forEach(c => c.rounds.forEach(r => r.events.forEach((e,i) => {
      const time = new Date(new Date(r.startedAt).getTime()+(i+1)*5*60000).toISOString();
      e.performedAt=time;e.recordedAt=time;
    })));
    const pending = get('BM-26021'); pending.report = makeReport(pending,buildReport(pending));
    S.db.seededCases = true;
  });

  function caseCard(c) {
    const a = S.asset(c.assetId);
    const needsReport = c.workState === 'ended' && c.reportState !== 'confirmed';
    const action = c.workState === 'active' ? 'Tiếp tục xử lý' : c.workState === 'waiting' ? 'Mở ca đang chờ' : needsReport ? (c.report ? 'Hoàn thiện báo cáo' : 'Tạo báo cáo') : 'Xem lịch sử';

    // Contextual next action details
    let nextTitle = 'Bước tiếp theo';
    let nextIcon = 'wrench';
    let nextType = 'active';
    let next = 'Ghi nhật ký, tra cứu nguồn hoặc yêu cầu hỗ trợ.';

    if (c.workState === 'waiting') {
      nextTitle = 'Điểm nghẽn · Đang chờ';
      nextIcon = 'clock';
      nextType = 'waiting';
      next = c.waitingReason || 'Tiếp tục khi có điều kiện xử lý.';
    } else if (needsReport) {
      nextTitle = 'Cần hoàn tất báo cáo';
      nextIcon = 'file';
      nextType = 'report';
      next = 'Công việc đã kết thúc; hoàn tất báo cáo để lưu kết quả.';
    } else if (c.workState === 'ended') {
      nextTitle = 'Hồ sơ đã lưu';
      nextIcon = 'checkcircle';
      nextType = 'ended';
      next = 'Hồ sơ và các đợt kiểm chứng đã được lưu trữ.';
    }

    // Machine state indicator
    const machineMeta = {
      restored: { text: 'Đã phục hồi', cls: 'status-restored', dot: 'dot-restored' },
      unrestored: { text: 'Chưa phục hồi', cls: 'status-unrestored', dot: 'dot-unrestored' },
      unverified: { text: 'Chưa đủ kiểm chứng', cls: 'status-unverified', dot: 'dot-unverified' }
    }[c.machineState] || { text: labels.machine[c.machineState] || c.machineState, cls: 'status-unverified', dot: 'dot-unverified' };

    // Report state indicator
    const reportMeta = {
      draft: { text: 'Bản nháp', cls: 'report-draft', dot: 'dot-draft' },
      pending: { text: 'Chờ xác nhận', cls: 'report-pending', dot: 'dot-pending' },
      changes: { text: 'Cần cập nhật', cls: 'report-changes', dot: 'dot-changes' },
      confirmed: { text: 'Đã xác nhận', cls: 'report-confirmed', dot: 'dot-confirmed' }
    }[c.reportState] || { text: labels.report[c.reportState] || c.reportState, cls: 'report-draft', dot: 'dot-draft' };

    // Work state indicator
    const workMeta = {
      active: { text: 'Đang xử lý', tone: 'active', dot: 'dot-active' },
      waiting: { text: 'Đang chờ / bàn giao', tone: 'waiting', dot: 'dot-waiting' },
      ended: { text: 'Đã kết thúc', tone: 'ended', dot: 'dot-ended' }
    }[c.workState] || { text: labels.work[c.workState] || c.workState, tone: 'active', dot: 'dot-active' };

    const typeTone = c.type === 'PM' ? 'pm' : 'bm';
    const typeLabel = c.type === 'PM' ? 'PM · Định kỳ' : 'BM · Sự cố';
    const expertId = c.expertId || c.support?.expertId;

    return `
    <article class="case-card state-${c.workState} ${c.workState === 'waiting' ? 'is-waiting' : ''}" ${cid(c)}>
      <div class="case-card-body">
        
        <div class="case-card-head">
          <div class="case-card-badges">
            <span class="badge-case-id">${h(c.id)}</span>
            <span class="badge-case-type ${typeTone}">${h(typeLabel)}</span>
            <span class="badge-work-state ${workMeta.tone}">
              <span class="status-pulse-dot ${workMeta.dot}"></span>
              ${h(workMeta.text)}
            </span>
          </div>
          <div class="case-card-report-badge ${reportMeta.cls}" title="Trạng thái báo cáo">
            <span class="status-indicator-dot ${reportMeta.dot}"></span>
            <span>${h(reportMeta.text)}</span>
          </div>
        </div>

        <div class="case-card-main-info">
          <h3 class="case-card-title">
            <button type="button" class="case-card-title-btn" data-action="case-open" ${cid(c)}>
              ${h(c.title)}
            </button>
          </h3>
          <div class="case-asset-banner">
            <span class="badge-asset-id" title="Mã thiết bị">
              ${icon('machine')}
              ${h(a?.id || c.assetId)}
            </span>
            <span class="case-asset-name">${h(a?.name || '')}</span>
            <span class="case-asset-sep">·</span>
            <span class="case-asset-line">${h(a?.line || '')}</span>
          </div>
        </div>

        <div class="case-next-banner is-${nextType}">
          <div class="case-next-icon">
            ${icon(nextIcon)}
          </div>
          <div class="case-next-content">
            <span class="case-next-tag">${h(nextTitle)}</span>
            <p class="case-next-desc">${h(next)}</p>
          </div>
        </div>

        <div class="case-meta-chips">
          <span class="case-chip" title="Số đợt xử lý">
            ${icon('history')}
            <strong>${c.rounds.length}</strong> đợt
          </span>
          <span class="case-chip" title="Số lượt ghi nhận nhật ký">
            ${icon('file')}
            <strong>${events(c).length}</strong> ghi nhận
          </span>
          <span class="case-chip" title="Người phụ trách ca">
            ${icon('user')}
            <span>${h(S.person(c.ownerId))}</span>
          </span>
          ${expertId ? `
          <span class="case-chip case-chip-expert" title="Chuyên gia phối hợp">
            ${icon('users')}
            <span>CG: ${h(S.person(expertId))}</span>
          </span>
          ` : ''}
        </div>

        <div class="case-status-grid">
          <div class="case-status-col">
            <span class="status-col-label">Tình trạng máy</span>
            <div class="status-col-val ${machineMeta.cls}">
              <span class="status-indicator-dot ${machineMeta.dot}"></span>
              <strong>${h(machineMeta.text)}</strong>
            </div>
          </div>
          <div class="case-status-col">
            <span class="status-col-label">Hồ sơ báo cáo</span>
            <div class="status-col-val ${reportMeta.cls}">
              <span class="status-indicator-dot ${reportMeta.dot}"></span>
              <strong>${h(reportMeta.text)}</strong>
            </div>
          </div>
        </div>

        <div class="case-card-footer">
          <button type="button" class="btn btn-primary case-action-btn" data-action="case-open" ${cid(c)}>
            <span>${h(action)}</span>
            ${icon('arrow')}
          </button>
          <div class="case-updated-time">
            ${icon('clock')}
            <span>Cập nhật ${h(S.fmtDate(c.updatedAt))}</span>
          </div>
        </div>

      </div>
    </article>
    `;
  }
  S.caseCard = caseCard;
  S.caseStats = () => { const list = S.db.cases.filter(viewable); return {total:list.length,active:list.filter(c=>c.workState==='active').length,waiting:list.filter(c=>c.workState==='waiting').length,pending:list.filter(c=>c.workState==='ended'&&c.reportState!=='confirmed').length}; };
  S.pages.cases = { title:'Ca bảo trì',roles,render:() => {
    const priority={active:0,waiting:1,ended:2},list = S.db.cases.filter(viewable).sort((a,b)=>(priority[a.workState]??3)-(priority[b.workState]??3)||b.updatedAt.localeCompare(a.updatedAt));
    const filter = S.ui.tab || 'all';
    const needsReport=c=>c.workState==='ended'&&c.reportState!=='confirmed',visible = list.filter(c=>filter==='all'||(filter==='pending'?needsReport(c):c.workState===filter));
    const counts={all:list.length,active:list.filter(c=>c.workState==='active').length,waiting:list.filter(c=>c.workState==='waiting').length,pending:list.filter(needsReport).length,ended:list.filter(c=>c.workState==='ended').length};
    const filterOptions = [
      { id: 'all', label: 'Tất cả', count: counts.all, dot: 'dot-all' },
      { id: 'active', label: 'Đang xử lý', count: counts.active, dot: 'dot-active' },
      { id: 'waiting', label: 'Đang chờ', count: counts.waiting, dot: 'dot-waiting' },
      { id: 'pending', label: 'Cần hoàn tất báo cáo', count: counts.pending, dot: 'dot-pending' },
      { id: 'ended', label: 'Đã kết thúc', count: counts.ended, dot: 'dot-ended' }
    ];
    const filterInfo = {
      all: { title: 'Tất cả ca trong danh sách', sub: 'Các hồ sơ bạn phụ trách, sắp xếp theo độ ưu tiên xử lý.' },
      active: { title: 'Ca đang trực tiếp xử lý', sub: `Đang hiển thị ${counts.active} hồ sơ kỹ thuật viên đang tiến hành.` },
      waiting: { title: 'Ca đang chờ / bàn giao', sub: `Đang hiển thị ${counts.waiting} hồ sơ có điểm nghẽn hoặc chờ linh kiện.` },
      pending: { title: 'Báo cáo cần hoàn tất', sub: `Đang hiển thị ${counts.pending} hồ sơ đã hoàn thành thao tác, chờ chốt báo cáo.` },
      ended: { title: 'Ca đã kết thúc công việc', sub: `Đang hiển thị ${counts.ended} hồ sơ đã hoàn tất quy trình và lưu trữ.` }
    }[filter] || { title: 'Ca trong danh sách', sub: 'Các hồ sơ bạn phụ trách.' };
    const newCaseBtn = who().role === 'maintenance' ? `<button type="button" class="btn btn-primary case-new-btn" data-action="case-new">${icon('plus')}<span>Tạo ca mới</span></button>` : '';

    return `${S.head('Ca bảo trì', newCaseBtn)}<section class="case-list-toolbar" aria-label="Tóm tắt và phân loại ca"><div class="case-list-summary"><div class="case-list-stat-badge" title="Số lượng ca hiển thị"><span class="case-list-stat-icon">${icon('filter')}</span><span class="case-list-total">${visible.length}</span></div><div class="case-list-summary-text"><strong class="case-list-title">${h(filterInfo.title)}</strong><span class="case-list-desc">${h(filterInfo.sub)}</span></div></div><div class="case-filters-segmented" role="group" aria-label="Phân loại ca bảo trì">${filterOptions.map(opt => `<button type="button" class="case-filter-pill ${filter === opt.id ? 'is-active' : ''}" data-action="case-filter" data-filter="${opt.id}" aria-pressed="${filter === opt.id}"><span class="filter-dot ${opt.dot}"></span><span class="filter-name">${h(opt.label)}</span><span class="filter-count-pill">${opt.count}</span></button>`).join('')}</div></section><div class="grid-2 case-grid">${visible.map(caseCard).join('')}</div>${visible.length ? '' : S.empty('Không có ca trong trạng thái này', 'Các ca bạn phụ trách sẽ xuất hiện tại đây. Để bắt đầu việc mới, bấm Tạo ca mới.', newCaseBtn)}`;
  }};
  S.actions['case-filter'] = el => S.go('cases',null,el.dataset.filter);
  S.actions['case-new'] = () => S.go('new-case');
  S.actions['case-open'] = el => { const c=get(el.dataset.case); if (protect(c,'view')) S.go('case',c.id,c.workState==='ended'?'report':'work'); };

  function assetPanel(a) {
    if(!a) return '';
    return `<aside class="card"><div class="card-head"><h2>Thông tin máy</h2>${badge('HozenDX mô phỏng','blue')}</div><div class="card-body stack"><h3>${h(a.id)} · ${h(a.name)}</h3><dl class="kv-list"><dt>Hãng / model máy</dt><dd>${h(a.maker)} / ${h(a.model)}</dd><dt>Khu vực</dt><dd>${h(a.line)}</dd><dt>Năm lắp đặt</dt><dd>${h(a.year)}</dd><dt>Thông số</dt><dd>${h(a.specs)}</dd><dt>Dữ liệu tham chiếu</dt><dd>${h(a.sourceState || 'Chỉ là dữ liệu lưu trước')}</dd><dt>Lấy dữ liệu lúc</dt><dd>${h(sourceTime(a))}</dd></dl><p class="field-hint">Nguồn tham chiếu; tình trạng thực tế do người thực hiện xác nhận.</p>${button('Lịch sử và tài liệu máy','case-reference','secondary',`data-asset="${h(a.id)}"`)}</div></aside>`;
  }
  S.pages['new-case'] = { title:'Tạo ca mới',roles:['maintenance'],render:() => {
    const d = S.db.drafts[`new-case:${who().id}`] || {assetId:'VIS-01',type:'BM'};
    const a=S.asset(d.assetId); const open=S.db.cases.filter(c=>c.assetId===d.assetId && c.workState!=='ended');
    return `<div class="page-head"><h1 id="page-title">Tạo ca mới</h1><div class="actions">${button('Quay lại ca bảo trì','case-list','ghost')}</div></div><div class="split-layout"><form class="card" data-form="case-create"><div class="card-body stack">${errorBox()}<div class="form-grid">${select('Loại công việc','type',d.type,[['BM','BM · Xử lý sự cố'],['PM','PM · Bảo dưỡng định kỳ']],'data-input="new-case-draft" data-refresh="true"')}${select('Mã máy','assetId',d.assetId,S.db.assets.map(a=>[a.id,`${a.id} — ${a.name}`]),'data-input="new-case-draft" data-refresh="true"')}${field('Tên công việc','title',d.title||(d.type==='PM'?`Kiểm tra định kỳ · ${a?.name||d.assetId}`:''),'data-input="new-case-draft" placeholder="Mô tả ngắn công việc cần xử lý" required')}${field('Alarm / mã lỗi nếu có','alarm',d.alarm,'data-input="new-case-draft"')}</div>${open.length?`<div class="notice notice-warning"><strong>Máy đang có ${open.length} ca chưa kết thúc.</strong><p>Nếu cùng công việc, mở ca hiện có bên dưới để giữ liền mạch nhật ký. Chỉ tạo ca độc lập khi là công việc khác.</p><div class="actions">${open.map(c=>button(c.id,'case-open','secondary',cid(c))).join('')}</div></div>${field('Lý do tạo ca độc lập','newReason',d.newReason,'data-input="new-case-draft" required')}`:''}${d.type==='PM'?`<div class="notice notice-info"><strong>${h(a?.pmTemplate?.name || 'Chưa có mẫu PM')}</strong><p>Mẫu PM theo máy. Kết quả kiểm tra được ghi trong hồ sơ này.</p></div>`:area('Hiện tượng quan sát sơ bộ','symptom',d.symptom,'data-input="new-case-draft" required','Ghi dấu hiệu đang thấy; chưa cần kết luận nguyên nhân.')}<label class="check-line"><input type="checkbox" name="machineConfirmed" required> Tôi đã đối chiếu mã máy và vị trí thực tế.</label><div class="actions"><button class="btn btn-primary" type="submit">Tạo hồ sơ và bắt đầu</button>${saveLabel()}</div></div></form>${assetPanel(a)}</div>`;
  }};
  S.inputs['new-case-draft'] = (el,event) => { const key=`new-case:${who().id}`; if(S.db.drafts[key]?.[el.name]!==el.value) S.commit(()=>{S.db.drafts[key]={assetId:'VIS-01',type:'BM',...S.db.drafts[key],[el.name]:el.value};},null,false); if(el.dataset.refresh && event.type==='change') S.render(); };
  S.actions['case-list'] = () => S.go('cases');
  S.forms['case-create'] = form => {
    if(who()?.role!=='maintenance') return canFail(form,'Chỉ người bảo trì được mở công việc.');
    const f=new FormData(form), assetId=f.get('assetId'),type=f.get('type'),a=S.asset(assetId),title=String(f.get('title')||'').trim();
    if(!a||!['BM','PM'].includes(type)||!title||!f.has('machineConfirmed')) return canFail(form,'Kiểm tra tên công việc, mã máy và xác nhận đúng máy.');
    if(S.db.cases.some(c=>c.assetId===assetId&&c.workState!=='ended')&&!String(f.get('newReason')||'').trim()) return canFail(form,'Ghi lý do mở hồ sơ độc lập hoặc tiếp tục hồ sơ hiện có.');
    if(type==='BM'&&!String(f.get('symptom')||'').trim()) return canFail(form,'Cần ghi hiện tượng quan sát ban đầu.');
    if(type==='PM'&&!a.pmTemplate?.items?.length) return canFail(form,'Máy chưa có mẫu PM cấu hình phù hợp. Cần người phụ trách bổ sung mẫu trước.');
    const id=S.uid(type),time=stamp();
    if(S.commit(()=>{S.db.cases.unshift({id,assetId,title,type,ownerId:who().id,expertId:null,participants:[who().id],createdAt:time,updatedAt:time,machineState:'unverified',workState:'active',reportState:'draft',report:null,resultEvidence:'',newReason:String(f.get('newReason')||''),context:{symptom:type==='PM'?'Bảo dưỡng theo mẫu PM đã cấu hình.':String(f.get('symptom')),alarm:String(f.get('alarm')||''),component:'',mode:'',productModel:'',speed:'',shift:'',onset:'',environment:'',changes:mGroups.map(group=>({group,status:'unchecked',detail:''}))},pm:type==='PM'?a.pmTemplate.items.map(x=>({...x,status:'unperformed',value:'',abnormality:''})):[],pmTemplate:type==='PM'?{id:a.pmTemplate.id,version:a.pmTemplate.version}:null,rounds:[{id:S.uid('RD'),number:1,state:'active',startedAt:time,events:[]}],selectedSources:[],retrieval:null,support:null,confirmations:{},syncState:'unconfigured'});delete S.db.drafts[`new-case:${who().id}`];S.log('Mở hồ sơ công việc',id,`${type} · ${assetId}`);},'Đã tạo hồ sơ trên trình duyệt này.',false)) S.go('case',id,'context');
  };

  function header(c) {
    const a=S.asset(c.assetId),tab=S.ui.tab||(c.workState==='ended'?'report':'work');
    const linePart=a?.line ? ` · ${h(a.line).toUpperCase()}` : '';
    return `<div class="page-head"><div><div class="eyebrow">${h(c.id)} · ${h(c.type)}${linePart}</div><h1 id="page-title">${h(c.title)}</h1><p class="subtext">${h(c.assetId)} · ${h(a?.name || '')} · Phụ trách: ${h(S.person(c.ownerId))}${c.expertId?` · Chuyên gia: ${h(S.person(c.expertId))}`:''}</p></div><div class="actions">${button('Quay lại ca bảo trì','case-list','ghost')}</div></div><div class="status-strip case-status">${badge(`Máy: ${labels.machine[c.machineState]}`,c.machineState==='restored'?'green':c.machineState==='unrestored'?'amber':'neutral')}${badge(`Công việc: ${labels.work[c.workState]}`,c.workState==='ended'?'green':'blue')}${badge(`Báo cáo: ${labels.report[c.reportState]}`,c.reportState==='confirmed'?'green':'neutral')}<span class="muted">${c.rounds.length} đợt · ${events(c).length} ghi nhận</span></div><nav class="case-workflow" aria-label="Quy trình 4 bước của hồ sơ">${[['context','1','Bối cảnh & máy'],['sources','2','Tra cứu & căn cứ'],['work','3','Xử lý & nhật ký'],['report','4','Báo cáo tổng kết']].map(([k,n,t])=>`<button type="button" class="case-workflow-step ${tab===k?'is-current':''}" ${tab===k?'aria-current="step"':''} data-action="case-tab" ${cid(c)} data-tab="${k}"><span>${n}</span><strong>${t}</strong></button>`).join('')}</nav>`;
  }
  S.pages.case = {title:'Chi tiết ca bảo trì',roles,render:() => {const c=current();if(!viewable(c))return S.empty('Không thể mở ca','Ca không tồn tại hoặc bạn chưa được phân công tham gia.');const tab=S.ui.tab||(c.workState==='ended'?'report':'work');return header(c)+(tab==='context'?renderContext(c):tab==='sources'?renderSources(c):tab==='report'?renderReport(c):renderWork(c));}};
  S.actions['case-tab'] = el => {const c=get(el.dataset.case);if(protect(c,'view'))S.go('case',c.id,el.dataset.tab);};
  function renderContext(c) {
    const a=S.asset(c.assetId),x=c.context||{},disabled=owner(c)&&c.workState!=='ended'?'':'disabled';
    const attrs=`data-input="case-context" ${cid(c)} ${disabled}`;
    return `<div class="split-layout"><section class="card"><div class="card-head"><div><h2>Ghi bối cảnh hiện trường</h2><p class="subtext">Ghi điều đang quan sát được. Chưa rõ thì để trống; chưa cần đoán nguyên nhân.</p></div>${saveLabel()}</div><div class="card-body stack">${c.workState==='ended'?'<div class="notice notice-info">Công việc đã kết thúc. Bối cảnh được giữ trong lịch sử; thông tin bổ sung ghi ở báo cáo.</div>':''}<div class="context-primary-fields">${area('Dấu hiệu / hiện tượng đang thấy','symptom',x.symptom,attrs+' placeholder="Ví dụ: máy dừng ngắt quãng, tín hiệu cảm biến không ổn định"') }<div class="form-grid">${field('Alarm / mã lỗi (nếu có)','alarm',x.alarm,attrs+' placeholder="Không có thì để trống"')}${field('Bộ phận / vị trí liên quan (nếu biết)','component',x.component,attrs+' placeholder="Ví dụ: cảm biến đầu vào"')}</div></div><details class="context-details"><summary>Điều kiện vận hành và thời điểm <span>(không bắt buộc)</span></summary><div class="form-grid">${field('Chế độ vận hành','mode',x.mode,attrs)}${field('Model sản phẩm','productModel',x.productModel,attrs)}${field('Tốc độ / điều kiện chạy','speed',x.speed,attrs)}${field('Ca làm việc','shift',x.shift,attrs)}${field('Thời điểm / tần suất xuất hiện','onset',x.onset,attrs)}${field('Môi trường liên quan','environment',x.environment,attrs)}</div></details><details class="context-details"><summary>Điểm thay đổi trước khi phát sinh lỗi <span>(5M1E · nếu liên quan)</span></summary><p class="field-hint">Chọn “Chưa kiểm tra” nếu chưa xem; “Chưa ghi nhận thay đổi” nếu đã kiểm tra.</p><div class="grid-2">${(x.changes||[]).map((m,i)=>`<div class="stack">${select(m.group,`change_${i}`,m.status,[['unchecked','Chưa kiểm tra'],['none','Chưa ghi nhận thay đổi'],['changed','Có thay đổi']],attrs)}${field('Chi tiết nếu có',`detail_${i}`,m.detail,attrs)}</div>`).join('')}</div></details><div class="actions context-actions">${button('Tiếp tục: tra cứu nguồn','case-tab','primary',`${cid(c)} data-tab="sources"`)}<span class="field-hint">Nội dung được lưu tự động trên trình duyệt này.</span></div></div></section>${assetPanel(a)}</div>`;
  }
  S.inputs['case-context'] = el => {const c=get(el.dataset.case);if(!protect(c)||c.workState==='ended')return;const index=Number(el.name.split('_')[1]);const old=el.name.startsWith('change_')?c.context.changes[index].status:el.name.startsWith('detail_')?c.context.changes[index].detail:c.context[el.name];if(old===el.value)return;S.commit(()=>{if(el.name.startsWith('change_'))c.context.changes[index].status=el.value;else if(el.name.startsWith('detail_'))c.context.changes[index].detail=el.value;else c.context[el.name]=el.value;if(c.retrieval)c.retrieval.stale=true;dirtyReport(c);c.updatedAt=stamp();},null,false);};
  S.actions['case-reference'] = el => {
    const a=S.asset(el.dataset.asset);if(!a)return;
    S.modal(`Hồ sơ tham chiếu · ${a.id}`,`<div class="stack"><div class="notice notice-info">HozenDX mô phỏng · chỉ đọc · dữ liệu lấy lúc ${h(sourceTime(a))}. Chưa có kết nối tới nhà máy.</div><h3>Lịch sử BM / PM</h3>${(a.history||[]).map(x=>`<div class="source-card"><div class="source-meta">${badge(x.type,'neutral')}<span>${h(x.id)}</span><span>${h(S.fmtDate(x.date,false))}</span></div><p>${h(x.summary)}</p><span class="field-hint">Hồ sơ tham chiếu, chưa mặc nhiên là tri thức đã duyệt.</span></div>`).join('')||'<p class="muted">Chưa có lịch sử trong bộ dữ liệu mô phỏng.</p>'}<h3>Tài liệu / quy trình tham chiếu</h3>${(a.references||[]).map(x=>`<div class="source-card"><h4>${h(x.title)}</h4><div class="source-meta">${h(x.id)} · ${h(x.type)} · phiên bản ${h(x.version)}</div><p>${h(x.summary)}</p></div>`).join('')||'<p class="muted">Chưa có tài liệu phù hợp được cung cấp.</p>'}<p class="field-hint">Đối chiếu quy trình có hiệu lực và quyền thao tác trước khi áp dụng.</p></div>`);
  };

  function retrievalSources(c) {return (c.retrieval?.sources||[]).map(x=>S.getKnowledge(x.id,x.version)).filter(Boolean);}
  function renderSourceExtracts(c,list) {
    return `<div class="stack"><h3>Các kiểm tra được trích từ nguồn</h3>${list.slice(0,3).map(k=>`<div class="source-card stack"><div class="source-meta">${h(k.id)} · v${h(k.version)} · ${h(k.title)}</div><p>${h(k.content?.checks||'Nguồn chưa mô tả bước kiểm tra.')}</p><p class="field-hint"><strong>Bối cảnh nguồn:</strong> ${h(k.content?.context||'Chưa mô tả đủ.')}<br><strong>Hồ sơ hiện tại:</strong> ${h(c.context?.productModel||'Chưa rõ model sản phẩm')} · ${h(c.context?.mode||'Chưa rõ chế độ')}. Cần người thực hiện xác minh mức phù hợp trước khi chọn.</p>${button('Đọc căn cứ và giới hạn','case-source-read','secondary',`${cid(c)} data-source="${h(k.id)}" data-version="${h(k.version)}"`)}</div>`).join('')}</div>`;
  }
  function renderSources(c) {
    const a=S.asset(c.assetId),list=retrievalSources(c),can=editable(c);
    return `<div class="stack"><section class="card"><div class="card-body"><div class="page-head"><div><h2>Tra cứu theo hồ sơ</h2><p class="subtext">${h(c.context?.symptom || c.title)} · ${h(a?.family)} · ${h(c.context?.productModel || 'Chưa rõ model sản phẩm')}</p></div>${can?button(c.retrieval?'Tra cứu lại':'Tìm nguồn liên quan','case-search','primary',cid(c)):''}</div><p class="field-hint">Nguồn được lọc theo nhóm máy; mức phù hợp cần xác minh theo điều kiện thực tế.</p>${c.retrieval?.stale?'<div class="notice notice-warning">Bối cảnh đã thay đổi sau lần tra cứu. Hãy tra cứu lại trước khi chọn hướng.</div>':''}</div></section>${!c.retrieval?S.empty('Bắt đầu từ nguồn đã được duyệt','Tra cứu để đọc case và tri thức chuyên gia liên quan đến nhóm máy.'):!list.length?`<div class="notice notice-warning"><h3>Chưa có nguồn đã duyệt phù hợp nhóm máy</h3><p>Chưa đủ căn cứ để gợi ý hướng xử lý. Bổ sung dữ kiện và yêu cầu chuyên gia đánh giá tại hiện trường.</p>${owner(c)?button('Yêu cầu chuyên gia','case-support','primary',cid(c)):''}</div>`:`<div><div class="section-title"><h2>Nguồn tham khảo (${list.length})</h2><span class="muted">Lần tra cứu ${h(S.fmtDate(c.retrieval.at))}</span></div><div class="grid-3">${list.slice(0,c.retrieval.showAll?99:3).map(k=>`<article class="source-card stack"><div class="actions">${badge(k.kind==='case'?'Case đã duyệt':'Tri thức chuyên gia','blue')}${badge(`v${k.version}`,'neutral')}</div><h3>${h(k.title)}</h3><p class="source-meta">${h(k.id)} · ${h(S.person(k.authorId))}</p><p><strong>Dấu hiệu nguồn:</strong> ${h(k.content?.symptom||'Chưa có')}</p><p><strong>Phù hợp đã biết:</strong> cùng nhóm máy ${h(k.family)}.</p><p><strong>Cần đối chiếu:</strong> model sản phẩm, chế độ, bằng chứng kiểm tra và phạm vi áp dụng.</p><p class="field-hint">${h(k.content?.limits||'Cần đọc giới hạn trong nguồn trước khi tham khảo.')}</p><div class="actions">${button('Đọc nguồn','case-source-read','secondary',`${cid(c)} data-source="${h(k.id)}" data-version="${h(k.version)}"`)}${can&&c.workState==='active'?button((c.selectedSources||[]).some(x=>x.id===k.id&&x.version===k.version)?'Đã chọn tham khảo':'Chọn tham khảo','case-source-pick','ghost',`${cid(c)} data-source="${h(k.id)}" data-version="${h(k.version)}" ${c.retrieval.stale?'disabled':''}`):''}</div></article>`).join('')}</div>${list.length>3&&!c.retrieval.showAll?button('Xem thêm nguồn','case-more-sources','secondary',cid(c)):''}</div><section class="card"><div class="card-head"><h2>Tóm tắt hỗ trợ quyết định</h2>${badge('AI mô phỏng','purple')}</div><div class="card-body stack">${renderSourceExtracts(c,list)}<p><strong>Đã biết:</strong> ${h(c.context?.symptom||c.title)}. Có ${events(c).length} ghi nhận hiện trường trong ${c.rounds.length} đợt.</p><p><strong>Còn thiếu:</strong> cần xác minh mức phù hợp của từng nguồn với điều kiện và bằng chứng trong hồ sơ này. Cùng nhóm máy chưa chứng minh cùng nguyên nhân.</p><div class="grid-3"><div><h3>Trước mắt</h3><p>Đọc mục kiểm tra và giới hạn ở nguồn đã duyệt. Chọn bước kiểm tra phù hợp sau khi xác minh điều kiện an toàn.</p></div><div><h3>Theo dõi / trung hạn</h3><p>Ghi kết quả và tình huống tái phát. Chỉ đưa kế hoạch sửa chữa vào báo cáo khi có người phụ trách xác nhận.</p></div><div><h3>Cải tiến / dài hạn</h3><p>Chưa đủ căn cứ tự đề xuất thay thế thiết bị. Chuyên gia đánh giá từ lịch sử và bằng chứng tích lũy.</p></div></div><div class="notice notice-warning"><strong>An toàn trước thao tác</strong><p>${h(list[0]?.content?.safety||'Chưa có quy trình an toàn phù hợp được xác minh.')}</p><p>Mở quy trình theo máy và xác minh hiệu lực trước khi thực hiện. Chọn nguồn không đồng nghĩa được phép vận hành.</p>${button('Mở tham chiếu theo máy','case-reference','secondary',`data-asset="${h(c.assetId)}"`)}</div><div class="actions">${button('Ghi thêm kiểm tra','case-tab','primary',`${cid(c)} data-tab="work"`)}${owner(c)&&c.workState!=='ended'?button('Yêu cầu chuyên gia','case-support','secondary',cid(c)):''}</div></div></section>`}</div>`;
  }
  S.actions['case-search'] = el => {const c=get(el.dataset.case);if(!protect(c,'edit'))return;const family=S.asset(c.assetId)?.family;S.commit(()=>{c.retrieval={at:stamp(),stale:false,sources:S.db.knowledge.filter(k=>k.status==='published'&&k.family===family).map(k=>({id:k.id,version:k.version})),contextSnapshot:JSON.stringify(c.context)};updated(c,'Tra cứu nguồn đã duyệt',family);},'Đã lập kết quả tra cứu mô phỏng theo nhóm máy.');};
  S.actions['case-more-sources'] = el => {const c=get(el.dataset.case);if(protect(c,'view'))S.commit(()=>{c.retrieval.showAll=true;});};
  S.actions['case-source-read'] = el => {
    const c=get(el.dataset.case);if(!protect(c,'view'))return;const k=S.getKnowledge(el.dataset.source,Number(el.dataset.version));if(!k)return S.toast('Nguồn không còn sẵn sàng trong bộ dữ liệu.','warning');
    S.modal(`${k.id} · ${k.title}`,`<div class="stack"><div class="source-meta">${badge(k.kind==='case'?'Case đã duyệt':'Tri thức chuyên gia','blue')} Phiên bản ${h(k.version)} · Tác giả ${h(S.person(k.authorId))} · Người duyệt ${h(S.person(k.reviewerId))}</div>${[['symptom','Dấu hiệu'],['context','Bối cảnh'],['cause','Nguyên nhân / giả thuyết'],['evidence','Bằng chứng'],['checks','Kiểm tra'],['solution','Hướng xử lý'],['result','Kết quả'],['safety','An toàn'],['limits','Giới hạn']].map(([key,label])=>`<div><h3>${label}</h3><p style="white-space:pre-line">${h(k.content?.[key]||'Chưa có dữ liệu.')}</p></div>`).join('')}</div>`,editable(c)?button('Chọn làm hướng tham khảo','case-source-pick','primary',`${cid(c)} data-source="${h(k.id)}" data-version="${h(k.version)}"`):'');
  };
  S.actions['case-source-pick'] = el => {const c=get(el.dataset.case);if(!protect(c,'edit'))return;if(c.retrieval?.stale)return S.toast('Bối cảnh đã đổi. Hãy tra cứu lại trước khi chọn nguồn.','warning');const k=S.getKnowledge(el.dataset.source,Number(el.dataset.version));if(!k||k.status!=='published')return;if(S.getKnowledge(k.id)?.version!==k.version)return S.toast('Nguồn đã có phiên bản mới. Tra cứu lại và đối chiếu trước khi chọn hướng. Bản nguồn cũ vẫn giữ trong lịch sử.','warning');if(S.commit(()=>{c.selectedSources ||= [];if(!c.selectedSources.some(x=>x.id===k.id&&x.version===k.version))c.selectedSources.push({id:k.id,version:k.version,selectedBy:who().id,selectedAt:stamp(),feedback:''});updated(c,'Chọn nguồn tham khảo',`${k.id} v${k.version}`);},'Đã ghi nhận hướng tham khảo; chưa đánh dấu đã thực hiện.'))S.closeModal();};

  function supportPanel(c) {
    const x=c.support;
    if(!x)return `<div class="notice notice-info"><strong>Cần thêm kinh nghiệm tại hiện trường?</strong><p>Gửi bối cảnh và các bước đã thử cho chuyên gia. Bạn tiếp tục là người phụ trách hồ sơ.</p>${owner(c)&&c.workState!=='ended'?button('Yêu cầu chuyên gia','case-support','secondary',cid(c)):''}</div>`;
    const status={requested:'Chờ phản hồi',accepted:'Đã nhận hỗ trợ',joined:'Đang phối hợp',unavailable:'Chưa thể hỗ trợ'};
    return `<section class="card"><div class="card-head"><h2>Phối hợp chuyên gia</h2>${badge(status[x.status],x.status==='unavailable'?'amber':x.status==='joined'?'green':'blue')}</div><div class="card-body stack"><p><strong>${h(S.person(x.expertId))}</strong> · Yêu cầu lúc ${h(S.fmtDate(x.requestedAt))}</p><p>${h(x.reason)}</p>${x.response?`<p><strong>Phản hồi:</strong> ${h(x.response)}</p>`:''}${x.joinedAt?`<p class="source-meta">Tham gia từ ${h(S.fmtDate(x.joinedAt))} · Công đoạn: ${h(x.stage||'Điều tra / xử lý')}</p>`:''}${who().id===x.expertId&&x.status==='requested'?`<div class="actions">${button('Nhận hỗ trợ','case-support-accept','primary',cid(c))}${button('Chưa thể hỗ trợ','case-support-decline','secondary',cid(c))}</div>`:''}${who().id===x.expertId&&x.status==='accepted'?button('Bắt đầu tham gia tại hiện trường','case-support-join','primary',cid(c)):''}${owner(c)&&x.status==='unavailable'&&c.workState!=='ended'?button('Cập nhật yêu cầu hỗ trợ','case-support','secondary',cid(c)):''}<p class="field-hint">Người bảo trì hỗ trợ và ghi theo mốc. Chuyên gia xác nhận các nhóm nội dung của mình khi thuận tiện; không cần duyệt từng dòng.</p></div></section>`;
  }
  S.actions['case-support'] = el => {
    const c=get(el.dataset.case);if(!protect(c)||c.workState==='ended')return;
    if(c.support&&['requested','accepted','joined'].includes(c.support.status)){S.go('case',c.id,'work');S.toast('Hồ sơ đã có yêu cầu hỗ trợ đang hoạt động.','info');return;}
    const ex=S.db.users.filter(u=>u.role==='expert');
    const summary=events(c).map(e=>`${labels.event[e.type]}: ${e.content}${e.result?' — '+e.result:''}`).join('\n');
    S.modal('Yêu cầu chuyên gia hỗ trợ',`<form data-form="case-support-send" ${cid(c)} class="stack">${errorBox()}<div class="notice notice-info">Tóm tắt dưới đây được ghép từ bối cảnh và nhật ký đã lưu. Kiểm tra nội dung trước khi gửi.</div>${select('Chuyên gia','expertId',c.expertId||ex[0]?.id,ex.map(u=>[u.id,u.name]))}${area('Vấn đề cần chuyên gia làm rõ','reason',c.support?.reason||'', 'required')}${area('Bàn giao bối cảnh và các bước đã thử','handover',`${c.assetId} — ${c.context?.symptom||c.title}\n${summary}`,'rows="6"')}<button type="submit" class="btn btn-primary">Gửi yêu cầu trong ứng dụng</button></form>`);
  };
  S.forms['case-support-send'] = form => {
    const c=get(form.dataset.case);if(!protect(c)||c.workState==='ended')return;const f=new FormData(form),expertId=String(f.get('expertId')),reason=String(f.get('reason')||'').trim();
    if(!reason||!S.db.users.some(u=>u.id===expertId&&u.role==='expert'))return canFail(form,'Chọn chuyên gia và ghi vấn đề cần hỗ trợ.');
    if(c.support&&['requested','accepted','joined'].includes(c.support.status))return canFail(form,'Đã có yêu cầu hỗ trợ đang hoạt động trong hồ sơ.');
    if(S.commit(()=>{c.supportHistory ||= [];if(c.support)c.supportHistory.push(structuredClone(c.support));c.support={expertId,status:'requested',reason,handover:String(f.get('handover')||''),requestedAt:stamp()};c.expertId=expertId;S.notice(expertId,'Có hồ sơ cần hỗ trợ',`${c.id}: ${reason}`,{page:'case',id:c.id,tab:'work'});updated(c,'Yêu cầu chuyên gia',expertId);},'Đã gửi yêu cầu. Nhật ký vẫn có thể tiếp tục ghi.'))S.closeModal();
  };
  S.actions['case-support-accept'] = el => {const c=get(el.dataset.case);if(!c||c.support?.expertId!==who().id||c.support.status!=='requested')return;S.commit(()=>{c.support.status='accepted';c.support.acceptedAt=stamp();S.notice(c.ownerId,'Chuyên gia đã nhận hỗ trợ',`${S.person(who().id)} đã nhận ${c.id}.`,{page:'case',id:c.id,tab:'work'});updated(c,'Nhận hỗ trợ');},'Đã nhận hỗ trợ. Xác nhận bắt đầu khi thực sự tham gia.');};
  S.actions['case-support-decline'] = el => {const c=get(el.dataset.case);if(!c||c.support?.expertId!==who().id||c.support.status!=='requested')return;S.modal('Chưa thể hỗ trợ',`<form data-form="case-support-unavailable" ${cid(c)} class="stack">${errorBox()}${area('Lý do / thông tin bàn giao','response','','required')}<button class="btn btn-primary" type="submit">Gửi phản hồi</button></form>`);};
  S.forms['case-support-unavailable'] = form => {const c=get(form.dataset.case),f=new FormData(form),response=String(f.get('response')||'').trim();if(!c||c.support?.expertId!==who().id||c.support.status!=='requested')return;if(!response)return canFail(form,'Cần ghi lý do để người bảo trì chủ động tìm hỗ trợ.');if(S.commit(()=>{c.support.status='unavailable';c.support.response=response;S.notice(c.ownerId,'Chuyên gia chưa thể hỗ trợ',response,{page:'case',id:c.id,tab:'work'});updated(c,'Phản hồi chưa thể hỗ trợ');},'Đã gửi phản hồi.'))S.closeModal();};
  S.actions['case-support-join'] = el => {const c=get(el.dataset.case);if(!c||c.support?.expertId!==who().id||c.support.status!=='accepted')return;S.modal('Bắt đầu tham gia hồ sơ',`<form data-form="case-support-start" ${cid(c)} class="stack">${field('Công đoạn bắt đầu tham gia','stage','Điều tra nguyên nhân và đánh giá hướng xử lý','required')}<p class="subtext">Thời điểm bắt đầu được ghi vào lịch sử. Người bảo trì vẫn phụ trách hồ sơ.</p><button class="btn btn-primary" type="submit">Xác nhận tham gia</button></form>`);};
  S.forms['case-support-start'] = form => {const c=get(form.dataset.case);if(!c||c.support?.expertId!==who().id||c.support.status!=='accepted')return;const f=new FormData(form);if(S.commit(()=>{c.support.status='joined';c.support.joinedAt=stamp();c.support.stage=String(f.get('stage')||'Điều tra / xử lý');if(!c.participants.includes(who().id))c.participants.push(who().id);S.notice(c.ownerId,'Chuyên gia bắt đầu tham gia',`${S.person(who().id)}: ${c.support.stage}`,{page:'case',id:c.id,tab:'work'});updated(c,'Bắt đầu tham gia',c.support.stage);},'Đã ghi nhận thời điểm và công đoạn tham gia.'))S.closeModal();};

  S.pages.assignments={title:'Hỗ trợ & xác nhận',roles:['expert'],render:()=>{const list=S.db.cases.filter(invited);return `${S.head('Hỗ trợ & xác nhận')}<div class="grid-2">${list.map(c=>`<div class="stack">${caseCard(c)}${supportPanel(c)}${expertGroups(c).some(g=>g.person===who().id&&!groupConfirmed(g))?`<div class="notice notice-warning">Có ghi nhận đang chờ bạn xác nhận. ${button('Xem đóng góp của tôi','case-group-modal','secondary',cid(c))}</div>`:''}</div>`).join('')}</div>${list.length?'':S.empty('Chưa có yêu cầu hỗ trợ','Yêu cầu của người bảo trì sẽ xuất hiện tại đây.')}`;}};

  function noteForm(c) {
    const d=S.db.drafts[draftKey(c)]||{},people=(c.participants||[]).filter(id=>S.db.users.some(u=>u.id===id));
    return `<form class="card" data-form="case-note" ${cid(c)}><div class="card-head"><h2>Ghi nhận nhanh</h2>${saveLabel()}</div><div class="card-body stack">${errorBox()}<div class="form-grid">${select('Loại ghi nhận','type',d.type||'observation',Object.entries(labels.event),`data-input="case-note-draft" ${cid(c)}`)}${select('Người thực hiện / người đưa nhận định','performedBy',d.performedBy||who().id,people.map(id=>[id,S.person(id)]),`data-input="case-note-draft" ${cid(c)}`)}</div>${area('Nội dung ghi nhận','content',d.content,`data-input="case-note-draft" ${cid(c)} required placeholder="Ghi nhanh điều đã quan sát, kiểm tra hoặc thực hiện…"`,'Có thể gõ hoặc dán ghi chú. Ghi theo mốc, không cần ghi từng động tác.')}<div class="form-grid">${field('Kết quả nếu đã có','result',d.result,`data-input="case-note-draft" ${cid(c)}`)}${field('Lý do lựa chọn / đổi hướng nếu cần','rationale',d.rationale,`data-input="case-note-draft" ${cid(c)}`)}</div><details><summary>Thông tin bổ sung · số đo và thời điểm thực tế</summary><div class="form-grid">${field('Giá trị đo','measurement',d.measurement,`data-input="case-note-draft" ${cid(c)}`)}${field('Đơn vị','unit',d.unit,`data-input="case-note-draft" ${cid(c)}`)}${field('Thời điểm thực tế khi ghi bù','performedAt',d.performedAt,`data-input="case-note-draft" ${cid(c)}`,'datetime-local')}</div></details><p class="field-hint">Người nhập: ${h(S.person(who().id))}. Nội dung ghi hộ chuyên gia sẽ được gom để chuyên gia xác nhận.</p><div class="actions"><button class="btn btn-primary" type="submit">Lưu ghi nhận</button><span class="field-hint">Chưa biết nguyên nhân vẫn lưu được.</span></div></div></form>`;
  }
  S.inputs['case-note-draft']=el=>{const c=get(el.dataset.case);if(!protect(c,'edit'))return;const key=draftKey(c);if(S.db.drafts[key]?.[el.name]===el.value)return;S.commit(()=>{S.db.drafts[key]={...S.db.drafts[key],[el.name]:el.value};},null,false);};
  S.forms['case-note']=form=>{
    const c=get(form.dataset.case);if(!protect(c,'edit')||!activeRound(c))return;const f=new FormData(form),content=String(f.get('content')||'').trim(),performer=String(f.get('performedBy')),type=String(f.get('type'));
    if(!content||!labels.event[type]||!c.participants.includes(performer))return canFail(form,'Nhập nội dung và chọn đúng người thực hiện đang tham gia hồ sơ.');
    if(f.get('measurement')&&!String(f.get('unit')||'').trim())return canFail(form,'Ghi đơn vị cho giá trị đo.');
    const actual=f.get('performedAt')?new Date(String(f.get('performedAt'))):new Date();if(Number.isNaN(actual.getTime())||actual.getTime()>Date.now()+60000)return canFail(form,'Thời điểm thực tế phải hợp lệ và không nằm trong tương lai.');
    S.commit(()=>{newEvent(c,{type,content,performedBy:performer,performedAt:actual.toISOString(),result:String(f.get('result')||''),rationale:String(f.get('rationale')||''),measurement:String(f.get('measurement')||''),unit:String(f.get('unit')||'')});delete S.db.drafts[draftKey(c)];updated(c,'Lưu ghi nhận',`${labels.event[type]} · ${S.person(performer)}`);},'Đã lưu ghi nhận và giữ trong lịch sử hồ sơ.');
  };
  function timeline(c) {
    return `<section class="card"><div class="card-head"><h2>Nhật ký mọi đợt</h2><span class="muted">${events(c).length} ghi nhận</span></div><div class="card-body stack">${[...c.rounds].reverse().map(r=>`<section class="stack"><div class="section-title"><h3>Đợt ${r.number}</h3>${badge(r.state==='active'?'Đang thực hiện':'Đã kết thúc đợt',r.state==='active'?'blue':'neutral')}</div><p class="source-meta">Bắt đầu ${h(S.fmtDate(r.startedAt))}${r.endedAt?` · Kết thúc ${h(S.fmtDate(r.endedAt))}`:''}</p>${r.summary?`<div class="notice notice-info"><p>${h(r.summary)}</p>${r.nextSteps?`<p><strong>Tiếp theo:</strong> ${h(r.nextSteps)}</p>`:''}${r.recipient?`<p><strong>Bàn giao:</strong> ${h(r.recipient)}</p>`:''}</div>`:''}<div class="timeline">${[...r.events].reverse().map(e=>{const isExpert=S.db.users.find(u=>u.id===e.performedBy)?.role==='expert',g={signature:groupSignature(r,e.performedBy),confirmation:c.confirmations?.[`${r.id}:${e.performedBy}`]};return `<article class="timeline-item" id="event-${h(e.id)}"><span class="timeline-dot"></span><div class="timeline-content stack"><div class="actions">${badge(labels.event[e.type],'neutral')}${isExpert?badge(groupConfirmed(g)?'Đã xác nhận':'Chờ chuyên gia xác nhận',groupConfirmed(g)?'green':'amber'):''}<span class="source-meta">${h(S.fmtDate(e.performedAt))}</span></div><p style="white-space:pre-line">${h(e.content)}</p>${e.measurement?`<p><strong>Số đo:</strong> ${h(e.measurement)} ${h(e.unit)}</p>`:''}${e.result?`<p><strong>Kết quả:</strong> ${h(e.result)}</p>`:''}${e.rationale?`<p><strong>Lý do:</strong> ${h(e.rationale)}</p>`:''}<p class="source-meta">Thực hiện: ${h(S.person(e.performedBy))} · Nhập: ${h(S.person(e.enteredBy))} · Nhập lúc ${h(S.fmtDate(e.recordedAt))}</p>${e.history?.length?`<details><summary>${e.history.length} lần chỉnh sửa</summary>${e.history.map(v=>`<p class="field-hint">${h(S.fmtDate(v.changedAt))} · ${h(S.person(v.changedBy))}: ${h(v.content)}</p>`).join('')}</details>`:''}${correctable(c)&&(owner(c)||e.performedBy===who().id)?button('Sửa ghi nhận','case-note-edit','ghost',`${cid(c)} data-event="${h(e.id)}"`):''}</div></article>`;}).join('')||'<p class="muted">Đợt này chưa có ghi nhận. Bắt đầu bằng điều đã quan sát tại hiện trường.</p>'}</div></section>`).join('')}</div></section>`;
  }
  S.actions['case-note-edit']=el=>{const c=get(el.dataset.case);if(!protect(c,'correct'))return;const e=events(c).find(e=>e.id===el.dataset.event);if(!e||(!owner(c)&&e.performedBy!==who().id))return;S.modal('Chỉnh sửa ghi nhận',`<form class="stack" data-form="case-note-update" ${cid(c)} data-event="${h(e.id)}">${errorBox()}${area('Nội dung','content',e.content,'required')}${field('Kết quả','result',e.result)}${field('Lý do lựa chọn','rationale',e.rationale)}${field('Lý do chỉnh sửa','editReason','','required')}<p class="field-hint">Giữ bản trước trong lịch sử. Xác nhận của chuyên gia cho nhóm nội dung này sẽ cần được thực hiện lại.</p><button type="submit" class="btn btn-primary">Lưu phiên bản chỉnh sửa</button></form>`);};
  S.forms['case-note-update']=form=>{const c=get(form.dataset.case);if(!protect(c,'correct'))return;const r=c.rounds.find(r=>r.events.some(e=>e.id===form.dataset.event)),e=r?.events.find(e=>e.id===form.dataset.event);if(!e||(!owner(c)&&e.performedBy!==who().id))return;const f=new FormData(form),content=String(f.get('content')||'').trim(),reason=String(f.get('editReason')||'').trim();if(!content||!reason)return canFail(form,'Nội dung và lý do chỉnh sửa là bắt buộc.');if(S.commit(()=>{const old={...e};delete old.history;e.history ||= [];e.history.push({...old,changedBy:who().id,changedAt:stamp(),reason});e.content=content;e.result=String(f.get('result')||'');e.rationale=String(f.get('rationale')||'');dirtyReport(c);updated(c,'Chỉnh sửa ghi nhận',reason);},'Đã giữ bản trước và cập nhật ghi nhận.'))S.closeModal();};

  function groupPanel(c) {
    const groups=expertGroups(c);if(!groups.length)return '';
    return `<section class="card"><div class="card-head"><h2>Xác nhận đóng góp</h2><span class="muted">Theo chuyên gia / đợt</span></div><div class="card-body stack">${groups.map(g=>`<div class="list-item"><div><strong>${h(S.person(g.person))} · Đợt ${g.round.number}</strong><p class="field-hint">${g.round.events.filter(e=>e.performedBy===g.person).length} ghi nhận · ${groupConfirmed(g)?'Nội dung không đổi, giữ nguyên xác nhận.':g.confirmation?.status==='changes'?'Chuyên gia yêu cầu sửa: '+h(g.confirmation.feedback||''):'Đang chờ xác nhận nội dung.'}</p></div>${badge(groupConfirmed(g)?'Đã xác nhận':'Chờ xác nhận',groupConfirmed(g)?'green':'amber')}</div>`).join('')}<div class="actions">${who().role==='expert'?button('Xem & xác nhận phần của tôi','case-group-modal','primary',cid(c)):button('Gửi yêu cầu xác nhận','case-group-request','secondary',cid(c))}</div></div></section>`;
  }
  S.actions['case-group-request']=el=>{const c=get(el.dataset.case);if(!protect(c))return;const ids=[...new Set(expertGroups(c).filter(g=>!groupConfirmed(g)).map(g=>g.person))];if(!ids.length)return S.toast('Các đóng góp hiện tại đã được xác nhận.','info');S.commit(()=>{ids.forEach(id=>S.notice(id,'Cần xác nhận đóng góp',`${c.id}: kiểm tra các ghi nhận theo đợt.`,{page:'case',id:c.id,tab:'work'}));updated(c,'Gửi yêu cầu xác nhận đóng góp',ids.join(', '));},'Đã thông báo chuyên gia. Bạn có thể lưu chờ và tiếp tục sau.');};
  S.actions['case-group-modal']=el=>{const c=get(el.dataset.case);if(!protect(c,'view')||who().role!=='expert')return;const list=expertGroups(c).filter(g=>g.person===who().id);S.modal('Xác nhận đóng góp của tôi',`<div class="stack">${list.map(g=>`<section class="card"><div class="card-body stack"><h3>Đợt ${g.round.number}</h3>${g.round.events.filter(e=>e.performedBy===who().id).map(e=>`<div class="source-card"><strong>${h(labels.event[e.type])}</strong><p>${h(e.content)}</p>${e.result?`<p>Kết quả: ${h(e.result)}</p>`:''}${e.rationale?`<p>Lý do: ${h(e.rationale)}</p>`:''}<p class="field-hint">Người nhập: ${h(S.person(e.enteredBy))} · ${h(S.fmtDate(e.recordedAt))}</p></div>`).join('')}${groupConfirmed(g)?badge('Đã xác nhận đúng phiên bản hiện tại','green'):`<div class="actions">${button('Xác nhận đúng nhóm nội dung','case-group-confirm','primary',`${cid(c)} data-round="${h(g.round.id)}"`)}${button('Yêu cầu sửa','case-group-changes','secondary',`${cid(c)} data-round="${h(g.round.id)}"`)}</div>`}</div></section>`).join('')||'<p>Chưa có ghi nhận nào về phần đóng góp của bạn.</p>'}</div>`);};
  S.actions['case-group-confirm']=el=>{const c=get(el.dataset.case);if(!protect(c,'view')||who().role!=='expert')return;const g=expertGroups(c).find(g=>g.person===who().id&&g.round.id===el.dataset.round);if(!g)return;if(S.commit(()=>{c.confirmations ||= {};c.confirmations[`${g.round.id}:${who().id}`]={status:'confirmed',signature:g.signature,by:who().id,at:stamp()};S.notice(c.ownerId,'Đóng góp đã được xác nhận',`${S.person(who().id)} đã xác nhận đợt ${g.round.number} của ${c.id}.`,{page:'case',id:c.id,tab:c.workState==='ended'?'report':'work'});updated(c,'Xác nhận nhóm đóng góp',g.round.id);},'Đã xác nhận nhóm đóng góp của bạn.'))S.closeModal();};
  S.actions['case-group-changes']=el=>{const c=get(el.dataset.case);if(!protect(c,'view')||who().role!=='expert')return;S.modal('Yêu cầu sửa ghi nhận',`<form data-form="case-group-feedback" ${cid(c)} data-round="${h(el.dataset.round)}" class="stack">${errorBox()}${area('Nội dung cần sửa và lý do','feedback','','required')}<button class="btn btn-primary" type="submit">Gửi yêu cầu sửa</button></form>`);};
  S.forms['case-group-feedback']=form=>{const c=get(form.dataset.case);if(!protect(c,'view')||who().role!=='expert')return;const g=expertGroups(c).find(g=>g.person===who().id&&g.round.id===form.dataset.round),feedback=String(new FormData(form).get('feedback')||'').trim();if(!g)return;if(!feedback)return canFail(form,'Nêu rõ nội dung cần sửa.');if(S.commit(()=>{c.confirmations ||= {};c.confirmations[`${g.round.id}:${who().id}`]={status:'changes',signature:g.signature,by:who().id,at:stamp(),feedback};if(c.report)c.reportState='changes';S.notice(c.ownerId,'Chuyên gia yêu cầu sửa ghi nhận',feedback,{page:'case',id:c.id,tab:'work'});updated(c,'Yêu cầu sửa đóng góp',feedback);},'Đã gửi yêu cầu sửa.'))S.closeModal();};

  function pmPanel(c) {
    if(c.type!=='PM')return '';const disabled=editable(c)?'':'disabled';
    return `<section class="card"><div class="card-head"><div><h2>Checklist bảo dưỡng</h2><p class="subtext">Ghi kết quả thực tế cho từng hạng mục.</p></div>${badge('Mẫu PM nội bộ','blue')}</div><div class="card-body stack"><p class="source-meta">${h(c.pmTemplate?.id||'PM')} · phiên bản ${h(c.pmTemplate?.version||1)}. Mẫu được cấu hình theo máy; kết quả không tự lấy từ lịch.</p><div class="notice notice-info"><strong>Cách ghi:</strong> chọn Đạt, Không đạt hoặc Chưa thực hiện. Nếu Không đạt, ghi hiện tượng quan sát được rồi mở điều tra trong cùng hồ sơ.</div>${(c.pm||[]).map((x,i)=>`<div class="source-card stack"><h3>${i+1}. ${h(x.label)}</h3><p class="field-hint">Tiêu chí: ${h(x.criterion||'Đối chiếu mẫu có hiệu lực.')}</p><div class="form-grid">${select('Kết quả kiểm tra','status',x.status,[['unperformed','Chưa thực hiện'],['pass','Đạt'],['fail','Không đạt']],`data-input="case-pm" ${cid(c)} data-item="${h(x.id)}" ${disabled}`)}${field(`Giá trị đo${x.unit?' ('+x.unit+')':''}`,'value',x.value,`data-input="case-pm" ${cid(c)} data-item="${h(x.id)}" ${disabled}`)}</div>${field('Bất thường / ghi chú','abnormality',x.abnormality,`data-input="case-pm" ${cid(c)} data-item="${h(x.id)}" ${disabled}`)}${x.status==='fail'?`<div class="notice notice-warning">Bất thường cần được điều tra trong hồ sơ này.${editable(c)?button(x.investigationEventId?'Đã mở điều tra':'Mở điều tra bất thường','case-pm-investigate','secondary',`${cid(c)} data-item="${h(x.id)}" ${x.investigationEventId?'disabled':''}`):''}</div>`:''}${x.performedBy?`<p class="field-hint">Ghi nhận bởi ${h(S.person(x.performedBy))} lúc ${h(S.fmtDate(x.performedAt))}</p>`:''}</div>`).join('')}</div></section>`;
  }
  S.inputs['case-pm']=(el,event)=>{
    const c=get(el.dataset.case);if(!protect(c,'edit'))return;const item=c.pm?.find(x=>x.id===el.dataset.item);if(!item)return;
    if(el.tagName==='SELECT'&&event.type==='input')return;
    const changed=item[el.name]!==el.value;
    if(!changed&&event.type!=='change')return;
    const incoming={...item,[el.name]:el.value};
    const signature=JSON.stringify([incoming.status,incoming.value,incoming.abnormality,incoming.performedBy]);
    if(!changed&&item.recordedSignature===signature)return;
    S.commit(()=>{
      if(changed){item.history ||= [];item.history.push({field:el.name,before:item[el.name],after:el.value,by:who().id,at:stamp()});item[el.name]=el.value;}
      const round=activeRound(c),existing=round.events.find(x=>x.pmResult&&x.pmItemId===item.id);
      if(event.type==='change'&&(item.status!=='unperformed'||existing)){
        item.performedBy ||= who().id;item.performedAt=stamp();
        const values={type:'check',content:`PM — ${item.label}${item.abnormality?': '+item.abnormality:''}`,result:item.status==='pass'?'Đạt theo xác nhận của người thực hiện.':item.status==='fail'?'Không đạt; cần điều tra và ghi kết quả xử lý.':'Đã đính chính: hạng mục chưa thực hiện; kết quả trước chưa được xác nhận.',measurement:item.value||'',unit:item.unit||'',performedBy:item.performedBy,performedAt:item.performedAt,pmItemId:item.id,pmResult:true};
        if(existing){const old={...existing};delete old.history;existing.history ||= [];existing.history.push({...old,changedBy:who().id,changedAt:stamp(),reason:'Cập nhật kết quả checklist PM'});Object.assign(existing,values);}else newEvent(c,values);
        item.recordedSignature=JSON.stringify([item.status,item.value,item.abnormality,item.performedBy]);
      }
      dirtyReport(c);c.updatedAt=stamp();
    },null,false);
    if(event.type==='change'&&el.name==='status')S.render();
  };
  S.actions['case-pm-investigate']=el=>{const c=get(el.dataset.case);if(!protect(c,'edit'))return;const x=c.pm?.find(x=>x.id===el.dataset.item);if(!x||x.status!=='fail'||x.investigationEventId)return;if(!x.abnormality?.trim())return S.toast('Ghi hiện tượng bất thường trước khi mở điều tra.','warning');S.commit(()=>{const e=newEvent(c,{type:'observation',content:`Bất thường ở hạng mục PM “${x.label}”: ${x.abnormality}`,result:'Mở điều tra trong cùng hồ sơ PM.',pmItemId:x.id});x.investigationEventId=e.id;c.context.symptom=`Bất thường PM: ${x.abnormality}`;if(c.retrieval)c.retrieval.stale=true;updated(c,'Mở điều tra bất thường PM',x.id);},'Đã ghi bất thường. Checklist gốc vẫn được giữ trong hồ sơ.');};

  function renderWork(c) {
    const r=activeRound(c);
    return `<div class="split-layout"><div class="stack">${c.workState==='waiting'?`<div class="notice notice-warning"><h2>Ca đang chờ xử lý tiếp</h2><p>${h(c.waitingReason||'Xem tóm tắt bàn giao ở đợt gần nhất.')}</p><p>Hồ sơ ${h(c.id)} vẫn mở. Tiếp tục sẽ tạo đợt ${c.rounds.length+1} và giữ nguyên nhật ký cũ.</p>${owner(c)?button('Bắt đầu đợt tiếp theo','case-resume','primary',cid(c)):''}</div>`:''}${c.workState==='ended'?`<div class="notice notice-success"><strong>Công việc đã kết thúc.</strong><p>Tình trạng máy: ${h(labels.machine[c.machineState])}. Tiếp theo: hoàn tất báo cáo và xác nhận đóng góp nếu có.</p>${button('Mở báo cáo tổng kết','case-tab','primary',`${cid(c)} data-tab="report"`)}</div>`:''}${supportPanel(c)}${pmPanel(c)}${editable(c)&&r?noteForm(c):''}${timeline(c)}</div><aside class="stack"><section class="card"><div class="card-head"><h2>${r?`Đợt ${r.number} · ${r.state==='active'?'đang thực hiện':'đã kết thúc'}`:'Theo dõi công việc'}</h2></div><div class="card-body stack"><p>Người phụ trách hồ sơ: <strong>${h(S.person(c.ownerId))}</strong></p><p>Người tham gia: ${h((c.participants||[]).map(S.person).join(', '))}</p>${owner(c)&&r?button('Ghi kết quả & chọn bước tiếp','case-outcome','primary',cid(c)):''}<p class="field-hint">Kết quả được lưu thành mốc của đợt hiện tại. Chưa đạt hoặc chờ linh kiện không xóa các bước đã làm.</p></div></section>${groupPanel(c)}${c.selectedSources?.length?`<section class="card"><div class="card-head"><h2>Nguồn đã chọn tham khảo</h2></div><div class="card-body stack">${c.selectedSources.map(x=>`<div><p>${h(x.id)} · phiên bản ${h(x.version)}</p><div class="actions">${button('Đọc nguồn','case-source-read','ghost',`${cid(c)} data-source="${h(x.id)}" data-version="${h(x.version)}"`)}${editable(c)?button('Ghi kết quả áp dụng','case-source-feedback','ghost',`${cid(c)} data-source="${h(x.id)}" data-version="${h(x.version)}"`):''}</div>${x.feedback?`<p class="field-hint">${h(x.feedback)}</p>`:''}</div>`).join('')}</div></section>`:''}</aside></div>`;
  }
  S.actions['case-source-feedback']=el=>{const c=get(el.dataset.case);if(!protect(c,'edit'))return;S.modal('Ghi phản hồi trong hồ sơ',`<form data-form="case-source-feedback-save" ${cid(c)} data-source="${h(el.dataset.source)}" data-version="${h(el.dataset.version)}" class="stack">${errorBox()}${select('Mức áp dụng','application','reference',[['reference','Đang tham khảo, chưa thực hiện'],['partial','Đã áp dụng một phần'],['applied','Đã thực hiện theo hướng tham khảo'],['not-applicable','Không áp dụng được']])}${area('Điểm khác, phần đã làm và kết quả thực tế','feedback','','required')}<button type="submit" class="btn btn-primary">Lưu phản hồi vào nhật ký</button></form>`);};
  S.forms['case-source-feedback-save']=form=>{const c=get(form.dataset.case);if(!protect(c,'edit'))return;const x=c.selectedSources.find(x=>x.id===form.dataset.source&&String(x.version)===form.dataset.version),f=new FormData(form),feedback=String(f.get('feedback')||'').trim();if(!x)return;if(!feedback)return canFail(form,'Ghi rõ phần áp dụng, điểm khác hoặc kết quả thực tế.');if(S.commit(()=>{x.feedback=feedback;x.application=String(f.get('application'));newEvent(c,{type:x.application==='reference'?'observation':'result',content:`Phản hồi nguồn ${x.id} v${x.version}: ${feedback}`,sourceId:x.id,sourceVersion:x.version});updated(c,'Ghi phản hồi nguồn',x.id);},'Đã lưu phản hồi; không tự thay đổi tình trạng máy.'))S.closeModal();};
  S.actions['case-resume']=el=>{const c=get(el.dataset.case);if(!protect(c)||c.workState!=='waiting'||activeRound(c))return;S.commit(()=>{c.rounds.push({id:S.uid('RD'),number:c.rounds.length+1,state:'active',startedAt:stamp(),events:[]});c.workState='active';c.waitingReason='';dirtyReport(c);updated(c,'Tiếp tục đợt xử lý',`Đợt ${c.rounds.length}`);},'Đã mở đợt mới trong cùng hồ sơ.');};
  S.actions['case-outcome']=el=>{
    const c=get(el.dataset.case);if(!protect(c)||!activeRound(c))return;const r=activeRound(c);const summary=r.events.map(e=>`${labels.event[e.type]}: ${e.content}${e.result?' — '+e.result:''}`).join('\n');
    S.modal('Kết quả đợt & bước tiếp theo',`<form data-form="case-outcome-save" ${cid(c)} class="stack">${errorBox()}${select('Tình trạng máy quan sát được','machineState',c.machineState,Object.entries(labels.machine))}${area('Căn cứ kiểm chứng / kết quả thực tế','evidence',c.resultEvidence,'required')}${select('Tiến độ tiếp theo','next','continue',[['continue','Tiếp tục điều tra trong đợt này'],['parts','Kết thúc đợt — chờ linh kiện'],['support','Kết thúc đợt — chờ hỗ trợ'],['handover','Kết thúc đợt — bàn giao'],['finish','Kết thúc công việc — chuyển tổng kết']])}<div class="notice notice-info">Tóm tắt được ghép từ nhật ký. Kiểm tra và bổ sung trước khi lưu.</div>${area('Tóm tắt đợt','summary',summary,'required rows="5"')}${area('Việc cần làm tiếp / lý do dừng','nextSteps','')}${field('Người / đơn vị nhận bàn giao (nếu bàn giao)','recipient','')}<details><summary>Kết thúc khi máy chưa được phục hồi</summary><div class="stack"><p class="field-hint">Chỉ ghi nhận khi đã có quyết định kết thúc công việc từ người có thẩm quyền tại nhà máy. Tài khoản bảo trì không tự cấp quyền quyết định.</p>${field('Người có thẩm quyền / chức trách','decisionBy','')}${field('Mã biên bản / quyết định bên ngoài','decisionRef','')}${area('Lý do kết thúc chưa khắc phục','decisionReason','')}<label class="check-line"><input name="decisionChecked" type="checkbox"> Tôi đã đối chiếu quyết định bên ngoài và ghi đúng nội dung.</label></div></details><div class="notice notice-warning">Chờ linh kiện hoặc hỗ trợ vẫn giữ hồ sơ mở. Máy phục hồi không tự chứng minh nguyên nhân gốc.</div><button type="submit" class="btn btn-primary">Lưu kết quả & tiếp tục</button></form>`);
  };
  S.forms['case-outcome-save']=form=>{
    const c=get(form.dataset.case);if(!protect(c)||!activeRound(c))return;const f=new FormData(form),machine=String(f.get('machineState')),next=String(f.get('next')),evidence=String(f.get('evidence')||'').trim(),summary=String(f.get('summary')||'').trim(),nextSteps=String(f.get('nextSteps')||'').trim();
    if(!labels.machine[machine]||!['continue','parts','support','handover','finish'].includes(next)||!evidence||!summary)return canFail(form,'Cần tình trạng máy, căn cứ kiểm chứng và tóm tắt đợt.');
    if(['parts','support','handover'].includes(next)&&!nextSteps)return canFail(form,'Ghi việc còn lại hoặc lý do chờ để đợt sau có thể tiếp tục.');
    if(next==='handover'&&!String(f.get('recipient')||'').trim())return canFail(form,'Ghi người hoặc đơn vị nhận bàn giao.');
    if(next==='finish'&&machine!=='restored'&&(!f.has('decisionChecked')||!String(f.get('decisionBy')||'').trim()||!String(f.get('decisionRef')||'').trim()||!String(f.get('decisionReason')||'').trim()))return canFail(form,'Kết thúc khi chưa phục hồi cần quyết định bên ngoài, người có thẩm quyền, mã tham chiếu và lý do. Nếu đang chờ hỗ trợ hoặc linh kiện, hãy giữ hồ sơ mở.');
    if(next==='finish'&&c.type==='PM'&&c.pm?.some(x=>x.status==='unperformed')&&!nextSteps)return canFail(form,'Checklist PM còn mục chưa thực hiện. Ghi rõ việc còn lại và lý do trước khi tổng kết.');
    if(next==='finish'&&c.type==='PM'&&c.pm?.some(x=>x.status==='fail')&&!nextSteps)return canFail(form,'Checklist còn hạng mục không đạt. Ghi rõ việc cần xử lý tiếp và giới hạn trước khi tổng kết.');
    if(next==='finish'&&machine==='restored'&&c.type==='PM'&&c.pm?.some(x=>x.status==='fail'))return canFail(form,'Checklist PM vẫn có hạng mục không đạt. Ghi điều tra, xử lý và cập nhật kết quả kiểm tra thực tế trước khi chốt phục hồi; nếu chưa xong hãy giữ hồ sơ mở.');
    if(next==='finish'&&c.type==='PM'&&c.pm?.some(x=>x.status!=='unperformed'&&x.unit&&!String(x.value||'').trim()))return canFail(form,'Còn hạng mục PM yêu cầu số đo nhưng chưa có giá trị thực tế. Bổ sung số đo trước khi tổng kết.');
    if(S.commit(()=>{const r=activeRound(c);c.machineState=machine;c.resultEvidence=evidence;r.summary=summary;r.nextSteps=nextSteps;r.recipient=String(f.get('recipient')||'');newEvent(c,{type:'result',content:`Kết quả đợt: ${labels.machine[machine]}`,result:evidence});if(next!=='continue'){r.state='ended';r.endedAt=stamp();c.workState=next==='finish'?'ended':'waiting';c.waitingReason={parts:'Chờ linh kiện',support:'Chờ hỗ trợ',handover:'Đã bàn giao, chờ xử lý tiếp'}[next]||'';}if(next==='finish'&&machine!=='restored')c.externalClosureDecision={by:String(f.get('decisionBy')),reference:String(f.get('decisionRef')),reason:String(f.get('decisionReason')),recordedBy:who().id,recordedAt:stamp()};dirtyReport(c);updated(c,'Lưu kết quả đợt',`${labels.machine[machine]} · ${next}`);},next==='finish'?'Đã lưu kết thúc công việc. Báo cáo cần xác nhận riêng.':next==='continue'?'Đã lưu kết quả; tiếp tục cùng đợt.':'Đã lưu đợt. Hồ sơ vẫn mở để xử lý tiếp.',false)){S.closeModal();S.go('case',c.id,next==='finish'?'report':'work');}
  };

  function renderReport(c) {
    const r=c.report,people=pendingReportPeople(c),mayEdit=owner(c)&&c.reportState!=='confirmed';
    if(!r)return `<div class="stack"><section class="card"><div class="card-body stack"><h2>Soạn nháp từ nhật ký</h2><p>${events(c).length} ghi nhận trong ${c.rounds.length} đợt đã sẵn sàng. Bản nháp được tổng hợp từ dữ kiện đã ghi, giữ nguyên phần nguyên nhân chưa xác định.</p>${owner(c)?button('Tạo nháp tổng kết','case-report-generate','primary',cid(c)):'<p class="muted">Người phụ trách hồ sơ sẽ tạo nháp báo cáo.</p>'}</div></section>${groupPanel(c)}</div>`;
    const attrs=`data-input="case-report-input" ${cid(c)} ${mayEdit?'':'disabled'}`;
    return `<div class="split-layout"><div class="stack">${r.feedback?`<div class="notice notice-warning"><strong>Phản hồi từ ${h(S.person(r.feedback.by))}</strong><p>${h(r.feedback.text)}</p></div>`:''}${r.sourceChanged?'<div class="notice notice-warning">Nhật ký hoặc bối cảnh có thay đổi sau lần tổng hợp. Cập nhật nháp và đối chiếu trước khi chốt. Phần bạn đã sửa sẽ được giữ cho đến khi bạn chọn thay.</div>':''}<section class="card"><div class="card-head"><div><h2>Báo cáo tổng kết</h2><p class="source-meta">${h(r.id)} · revision ${r.revision} · ${h(labels.report[c.reportState])}</p></div>${saveLabel()}</div><div class="card-body stack">${area('Diễn biến và kết quả mọi đợt','summary',r.summary,`${attrs} rows="14"`)}${select('Trạng thái nguyên nhân','causeStatus',r.causeStatus,[['unknown','Chưa xác định'],['hypothesis','Còn là giả thuyết'],['confirmed','Đã có bằng chứng xác nhận']],attrs)}${area('Nguyên nhân / giả thuyết và bằng chứng liên quan','cause',r.cause,attrs,'Nếu đã xác nhận, ghi căn cứ kiểm tra. Máy phục hồi không tự chứng minh nguyên nhân.')}<div class="form-grid">${area('Bài học / điểm cần theo dõi','lessons',r.lessons,attrs)}${area('Giới hạn và việc còn lại','limits',r.limits,attrs)}</div>${r.correctionReason?`<p class="field-hint">Đính chính: ${h(r.correctionReason)}</p>`:''}${c.externalClosureDecision?`<div class="notice notice-warning"><strong>Kết thúc chưa khắc phục theo quyết định bên ngoài</strong><p>${h(c.externalClosureDecision.reference)} · ${h(c.externalClosureDecision.by)}</p><p>${h(c.externalClosureDecision.reason)}</p></div>`:''}${mayEdit?`<div class="actions">${button('Cập nhật nháp từ nhật ký','case-report-generate','secondary',cid(c))}${button('Gửi / nhắc xác nhận','case-report-request','secondary',cid(c))}</div>`:''}${r.versions?.length?`<details><summary>Lịch sử ${r.versions.length} phiên bản lưu trước</summary>${r.versions.map(v=>`<div class="source-card"><p>Revision ${h(v.revision)} · ${h(S.fmtDate(v.savedAt))} · ${h(S.person(v.savedBy))}</p><p style="white-space:pre-line">${h(v.summary)}</p></div>`).join('')}</details>`:''}</div></section><section class="card"><div class="card-head"><h2>Dữ kiện nguồn của báo cáo</h2></div><div class="card-body stack">${c.rounds.map(round=>`<details><summary>Đợt ${round.number} · ${round.events.length} ghi nhận</summary>${round.events.map(e=>`<div class="source-card"><p><strong>${h(e.id)} · ${h(labels.event[e.type])}</strong></p><p>${h(e.content)}</p>${e.result?`<p>Kết quả: ${h(e.result)}</p>`:''}<p class="field-hint">${h(S.person(e.performedBy))} · ${h(S.fmtDate(e.performedAt))}</p></div>`).join('')}</details>`).join('')}</div></section></div><aside class="stack"><section class="card"><div class="card-head"><h2>Điều kiện chốt báo cáo</h2></div><div class="card-body stack"><p>${c.workState==='ended'?'✓':'○'} Công việc đã kết thúc</p><p>${!r.sourceChanged?'✓':'○'} Nháp đã đối chiếu nhật ký hiện tại</p><p>${people.length?'○':'✓'} Xác nhận đóng góp ${people.length?`— còn ${people.map(S.person).join(', ')}`:'đã đủ'}</p><p>Máy: ${h(labels.machine[c.machineState])}</p><p class="field-hint">Báo cáo chờ xác nhận không làm thay đổi tình trạng máy đã được ghi nhận.</p>${owner(c)&&c.reportState!=='confirmed'?button('Kiểm tra & chốt báo cáo','case-report-finalize','primary',cid(c)):''}${owner(c)&&c.reportState==='confirmed'?`<div class="notice notice-success">Báo cáo đã xác nhận và giữ trong lịch sử máy.</div>${button('Đề xuất tri thức từ hồ sơ','case-propose','primary',cid(c))}${button('Đính chính báo cáo','case-report-correct','secondary',cid(c))}<p class="field-hint">Có thể chỉ lưu lịch sử. Đề xuất tri thức là bản riêng và cần kiểm duyệt.</p>`:''}${who().role==='expert'&&c.reportState!=='confirmed'&&reportPeople(c).includes(who().id)?button('Xác nhận phần của tôi trong báo cáo','case-report-confirm-open','primary',cid(c)):''}</div></section>${groupPanel(c)}<section class="card"><div class="card-head"><h2>Tích hợp HozenDX</h2></div><div class="card-body stack">${badge('Chiều ghi: chưa cấu hình','neutral')}<p>Báo cáo được lưu cục bộ; chưa đồng bộ tới HozenDX.</p><p class="field-hint">Dữ liệu máy hiện là nguồn tham chiếu mô phỏng.</p></div></section></aside></div>`;
  }
  S.inputs['case-report-input']=el=>{const c=get(el.dataset.case);if(!protect(c)||!c.report||c.reportState==='confirmed'||c.report[el.name]===el.value)return;S.commit(()=>{c.report[el.name]=el.value;c.report.manualFields ||= {};c.report.manualFields[el.name]=true;if(c.reportState==='pending')c.reportState='changes';c.updatedAt=stamp();},null,false);};
  S.actions['case-report-generate']=el=>{
    const c=get(el.dataset.case);if(!protect(c)||c.reportState==='confirmed')return;const suggestion=buildReport(c);suggestedReports[c.id]={fields:suggestion,snapshot:sourceSnapshot(c)};
    S.modal(c.report?'Đối chiếu nháp mới với phần đã sửa':'Nháp tổng kết từ nhật ký',`<form data-form="case-report-apply" ${cid(c)} class="stack">${errorBox()}<div class="notice notice-info">Bản nháp chỉ tổng hợp dữ kiện đã ghi. Chọn phần muốn áp dụng; nội dung đã sửa được giữ nguyên.</div>${[['summary','Diễn biến và kết quả'],['cause','Nguyên nhân'],['lessons','Bài học'],['limits','Giới hạn']].map(([k,label])=>`<section class="source-card stack"><label class="check-line"><input type="checkbox" name="apply" value="${k}" ${!c.report||!c.report.manualFields?.[k]?'checked':''}> Áp dụng: ${label}</label>${c.report?.manualFields?.[k]?`<div class="notice notice-warning">Phần này đã được người dùng chỉnh sửa. Mặc định giữ bản hiện tại.</div><details><summary>Xem bản đang sửa</summary><p style="white-space:pre-line">${h(c.report[k])}</p></details>`:''}<p style="white-space:pre-line">${h(suggestion[k]||'Chưa xác định; cần con người bổ sung căn cứ.')}</p></section>`).join('')}<label class="check-line"><input type="checkbox" name="reviewed" required> Tôi đã đối chiếu nháp với dữ kiện hiện tại; phần không chọn giữ nguyên.</label><button type="submit" class="btn btn-primary">Lưu nháp đã chọn</button></form>`);
  };
  S.forms['case-report-apply']=form=>{
    const c=get(form.dataset.case);if(!protect(c)||c.reportState==='confirmed')return;const suggestion=suggestedReports[c.id],f=new FormData(form);if(!suggestion||!f.has('reviewed'))return canFail(form,'Kiểm tra bản gợi ý và xác nhận đã đối chiếu.');if(suggestion.snapshot!==sourceSnapshot(c))return canFail(form,'Nhật ký đã thay đổi trong lúc xem nháp. Đóng hộp thoại và tạo nháp lại.');
    if(S.commit(()=>{if(!c.report)c.report=makeReport(c,{summary:'',cause:'',causeStatus:'unknown',lessons:'',limits:''});else{c.report.versions.push({revision:c.report.revision,summary:c.report.summary,cause:c.report.cause,causeStatus:c.report.causeStatus,lessons:c.report.lessons,limits:c.report.limits,savedBy:who().id,savedAt:stamp()});c.report.revision++;}f.getAll('apply').forEach(k=>{if(Object.hasOwn(suggestion.fields,k)){c.report[k]=suggestion.fields[k];c.report.manualFields[k]=false;if(k==='cause')c.report.causeStatus='unknown';}});c.report.snapshot=suggestion.snapshot;c.report.sourceChanged=false;c.report.generatedAt=stamp();c.reportState='draft';updated(c,'Lưu nháp báo cáo',`Revision ${c.report.revision}`);},'Đã lưu nháp. Chưa chốt công việc hoặc báo cáo.')){delete suggestedReports[c.id];S.closeModal();}
  };
  S.actions['case-report-request']=el=>{const c=get(el.dataset.case);if(!protect(c)||!c.report||c.reportState==='confirmed')return;const ids=pendingReportPeople(c);if(!ids.length)return S.toast('Không còn xác nhận chuyên gia cần bổ sung. Người phụ trách có thể kiểm tra điều kiện chốt.','info');S.commit(()=>{c.reportState='pending';ids.forEach(id=>S.notice(id,'Báo cáo chờ xác nhận đóng góp',`${c.id}: xem phần ghi nhận và nội dung báo cáo liên quan.`,{page:'case',id:c.id,tab:'report'}));updated(c,'Gửi xác nhận báo cáo');},'Đã gửi yêu cầu. Có thể rời hồ sơ và tiếp tục khi có phản hồi.');};
  S.actions['case-report-confirm-open']=el=>{const c=get(el.dataset.case);if(!protect(c,'view')||who().role!=='expert'||!reportPeople(c).includes(who().id)||!c.report||c.reportState==='confirmed')return;S.modal('Xác nhận đóng góp trong báo cáo',`<div class="stack"><p>Kiểm tra các ghi nhận của bạn và cách chúng được thể hiện trong báo cáo hiện tại.</p>${expertGroups(c).filter(g=>g.person===who().id).map(g=>`<section class="source-card"><h3>Đợt ${g.round.number}</h3>${g.round.events.filter(e=>e.performedBy===who().id).map(e=>`<p>${h(e.content)}${e.result?` — ${h(e.result)}`:''}</p>`).join('')}</section>`).join('')}<details open><summary>Bản báo cáo cần xác nhận · revision ${c.report.revision}</summary><p style="white-space:pre-line">${h(c.report.summary)}</p><p><strong>Nguyên nhân:</strong> ${h(c.report.cause||'Chưa xác định')}</p><p><strong>Bài học:</strong> ${h(c.report.lessons)}</p><p><strong>Giới hạn:</strong> ${h(c.report.limits)}</p></details><div class="actions">${button('Xác nhận đúng phần đóng góp của tôi','case-report-confirm','primary',cid(c))}${button('Yêu cầu sửa báo cáo','case-report-changes','secondary',cid(c))}</div></div>`);};
  S.actions['case-report-confirm']=el=>{const c=get(el.dataset.case);if(!protect(c,'view')||who().role!=='expert'||!reportPeople(c).includes(who().id)||!c.report||c.reportState==='confirmed')return;if(S.commit(()=>{c.confirmations ||= {};expertGroups(c).filter(g=>g.person===who().id).forEach(g=>{c.confirmations[`${g.round.id}:${who().id}`]={status:'confirmed',signature:g.signature,by:who().id,at:stamp()};});c.report.confirmations ||= {};c.report.confirmations[who().id]={signature:reportSignature(c),at:stamp(),revision:c.report.revision};S.notice(c.ownerId,'Chuyên gia đã xác nhận báo cáo',`${S.person(who().id)} đã xác nhận phần đóng góp trong ${c.id}.`,{page:'case',id:c.id,tab:'report'});updated(c,'Xác nhận đóng góp báo cáo');},'Đã xác nhận phần đóng góp. Người phụ trách sẽ chốt báo cáo.'))S.closeModal();};
  S.actions['case-report-changes']=el=>{const c=get(el.dataset.case);if(!protect(c,'view')||who().role!=='expert'||!reportPeople(c).includes(who().id)||c.reportState==='confirmed')return;S.modal('Yêu cầu sửa báo cáo',`<form data-form="case-report-feedback" ${cid(c)} class="stack">${errorBox()}${area('Phần cần sửa và lý do','feedback','','required')}<button class="btn btn-primary" type="submit">Gửi phản hồi</button></form>`);};
  S.forms['case-report-feedback']=form=>{const c=get(form.dataset.case);if(!protect(c,'view')||who().role!=='expert'||!reportPeople(c).includes(who().id)||c.reportState==='confirmed')return;const feedback=String(new FormData(form).get('feedback')||'').trim();if(!feedback)return canFail(form,'Ghi rõ phần cần sửa.');if(S.commit(()=>{c.reportState='changes';c.report.feedback={by:who().id,at:stamp(),text:feedback};delete c.report.confirmations[who().id];c.report.manualFields.reviewRequested=true;S.notice(c.ownerId,'Chuyên gia yêu cầu sửa báo cáo',feedback,{page:'case',id:c.id,tab:'report'});updated(c,'Yêu cầu sửa báo cáo',feedback);},'Đã gửi phản hồi cho người phụ trách.'))S.closeModal();};
  S.actions['case-report-finalize']=el=>{
    const c=get(el.dataset.case);if(!protect(c)||!c.report||c.reportState==='confirmed')return;const pending=pendingReportPeople(c);
    if(c.workState!=='ended')return S.toast('Công việc còn mở. Hãy lưu kết quả và kết thúc công việc trước khi chốt báo cáo.','warning');
    if(c.report.sourceChanged)return S.toast('Nhật ký đã thay đổi. Cần cập nhật và đối chiếu nháp báo cáo.','warning');
    if(!c.report.summary.trim())return S.toast('Báo cáo chưa có diễn biến và kết quả.','warning');
    if(c.report.causeStatus==='confirmed'&&!c.report.cause.trim())return S.toast('Nguyên nhân được xác nhận cần mô tả kèm căn cứ.','warning');
    if(pending.length){S.toast(`Chờ xác nhận của ${pending.map(S.person).join(', ')}. Bạn có thể gửi nhắc và lưu chờ.`,'warning');return;}
    S.modal('Xác nhận lưu báo cáo cuối',`<form data-form="case-report-close" ${cid(c)} class="stack">${errorBox()}<p><strong>${h(c.report.id)} · revision ${c.report.revision}</strong></p><p>Máy: ${h(labels.machine[c.machineState])}. Công việc: ${h(labels.work[c.workState])}.</p><p>Báo cáo được giữ trong lịch sử. Đề xuất tri thức là bước riêng và cần người duyệt độc lập.</p><label class="check-line"><input name="checked" type="checkbox" required> Tôi đã kiểm tra diễn biến, kết quả, căn cứ và các phần đóng góp.</label><button class="btn btn-primary" type="submit">Chốt báo cáo</button></form>`);
  };
  S.forms['case-report-close']=form=>{const c=get(form.dataset.case);if(!protect(c)||!c.report||c.reportState==='confirmed')return;if(c.workState!=='ended'||c.report.sourceChanged||pendingReportPeople(c).length)return canFail(form,'Điều kiện chốt đã thay đổi. Kiểm tra lại báo cáo và các xác nhận.');if(!new FormData(form).has('checked'))return canFail(form,'Cần xác nhận đã kiểm tra nội dung.');if(S.commit(()=>{c.reportState='confirmed';c.report.confirmedAt=stamp();c.report.confirmedBy=who().id;c.report.confirmedSnapshot=structuredClone({summary:c.report.summary,cause:c.report.cause,causeStatus:c.report.causeStatus,lessons:c.report.lessons,limits:c.report.limits});updated(c,'Chốt báo cáo',`${c.report.id} revision ${c.report.revision}`);},'Đã xác nhận báo cáo và giữ trong lịch sử máy.'))S.closeModal();};
  S.actions['case-report-correct']=el=>{const c=get(el.dataset.case);if(!protect(c)||c.reportState!=='confirmed')return;S.modal('Tạo bản đính chính báo cáo',`<form data-form="case-report-correction" ${cid(c)} class="stack">${errorBox()}${area('Lý do đính chính','reason','','required')}<p class="field-hint">Bản đã xác nhận sẽ được giữ lại. Bản sửa cần kiểm tra và xác nhận lại phần thay đổi.</p><button class="btn btn-primary" type="submit">Tạo bản đính chính</button></form>`);};
  S.forms['case-report-correction']=form=>{const c=get(form.dataset.case);if(!protect(c)||c.reportState!=='confirmed')return;const reason=String(new FormData(form).get('reason')||'').trim();if(!reason)return canFail(form,'Ghi lý do đính chính.');if(S.commit(()=>{c.report.versions.push({revision:c.report.revision,...c.report.confirmedSnapshot,savedAt:c.report.confirmedAt,savedBy:c.report.confirmedBy,confirmed:true});c.report.revision++;c.report.correctionReason=reason;c.reportState='draft';updated(c,'Mở bản đính chính báo cáo',reason);},'Đã giữ bản chính thức và mở bản đính chính.'))S.closeModal();};
  S.actions['case-propose']=el=>{const c=get(el.dataset.case);if(!protect(c)||c.reportState!=='confirmed')return;if(typeof S.createCaseProposal!=='function')return S.toast('Chức năng đề xuất tri thức chưa sẵn sàng. Báo cáo vẫn được giữ.','warning');S.createCaseProposal(c);};
})();
