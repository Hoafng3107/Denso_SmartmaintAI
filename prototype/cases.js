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
    return `<aside class="asset-telemetry-panel">
      <div class="card asset-telemetry-card">
        <div class="card-head asset-telemetry-head">
          <div class="asset-telemetry-title">
            <span class="asset-head-icon">${icon('machine')}</span>
            <h2>Thông tin máy</h2>
          </div>
          <span class="badge badge-blue asset-system-tag">
            <span class="status-pulse-dot dot-blue"></span>
            HozenDX · Dữ liệu mô phỏng
          </span>
        </div>
        <div class="card-body stack asset-telemetry-body">
          <div class="asset-primary-identity">
            <div class="asset-code-badge">${h(a.id)}</div>
            <div class="asset-name-block">
              <h3 class="asset-machine-name">${h(a.name)}</h3>
              <div class="asset-line-chip">
                <span>${h(a.line)}</span>
                <span class="meta-sep">·</span>
                <span>Năm ${h(a.year)}</span>
              </div>
            </div>
          </div>

          <div class="asset-specs-grid">
            <div class="asset-spec-item">
              <span class="spec-label">Hãng & Model</span>
              <strong class="spec-val">${h(a.maker)} / ${h(a.model)}</strong>
            </div>
            <div class="asset-spec-item">
              <span class="spec-label">Trạng thái dữ liệu</span>
              <strong class="spec-val">${h(a.sourceState || 'Dữ liệu lưu trước')}</strong>
            </div>
            <div class="asset-spec-item span-2">
              <span class="spec-label">Thông số kỹ thuật</span>
              <p class="spec-desc">${h(a.specs)}</p>
            </div>
          </div>

          <div class="asset-sync-strip">
            <div class="sync-dot-label">
              <span class="status-indicator-dot dot-green"></span>
              <span>Lấy dữ liệu lúc: <strong>${h(sourceTime(a))}</strong></span>
            </div>
            <span class="sync-hint">Nguồn tham chiếu; tình trạng thực tế do người thực hiện xác nhận.</span>
          </div>

          <div class="asset-action-box">
            <button type="button" class="btn btn-secondary btn-block asset-doc-btn" data-action="case-reference" data-asset="${h(a.id)}">
              ${icon('book')}
              <span>Lịch sử và tài liệu máy</span>
            </button>
          </div>
        </div>
      </div>
    </aside>`;
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
    const a = S.asset(c.assetId), tab = S.ui.tab || (c.workState === 'ended' ? 'report' : 'work');
    const typeLabel = c.type === 'PM' ? 'PM · Định kỳ' : 'BM · Sự cố';
    const typeTone = c.type === 'PM' ? 'badge-pm' : 'badge-bm';

    const machineConfig = {
      restored: { text: labels.machine.restored, tone: 'tone-success', dot: 'dot-green' },
      unrestored: { text: labels.machine.unrestored, tone: 'tone-warning', dot: 'dot-amber' },
      unverified: { text: labels.machine.unverified, tone: 'tone-neutral', dot: 'dot-neutral' }
    }[c.machineState] || { text: labels.machine[c.machineState] || c.machineState, tone: 'tone-neutral', dot: 'dot-neutral' };

    const workConfig = {
      active: { text: labels.work.active, tone: 'tone-active', dot: 'dot-blue-pulse' },
      waiting: { text: labels.work.waiting, tone: 'tone-warning', dot: 'dot-amber-pulse' },
      ended: { text: labels.work.ended, tone: 'tone-success', dot: 'dot-green' }
    }[c.workState] || { text: labels.work[c.workState] || c.workState, tone: 'tone-neutral', dot: 'dot-neutral' };

    const reportConfig = {
      draft: { text: labels.report.draft, tone: 'tone-neutral', dot: 'dot-neutral' },
      pending: { text: labels.report.pending, tone: 'tone-warning', dot: 'dot-amber-pulse' },
      changes: { text: labels.report.changes, tone: 'tone-purple', dot: 'dot-purple' },
      confirmed: { text: labels.report.confirmed, tone: 'tone-success', dot: 'dot-green' }
    }[c.reportState] || { text: labels.report[c.reportState] || c.reportState, tone: 'tone-neutral', dot: 'dot-neutral' };

    const totalEvents = events(c).length;

    const steps = [
      { key: 'context', num: '1', title: 'Bối cảnh & máy', phase: 'GIAI ĐOẠN 1' },
      { key: 'sources', num: '2', title: 'Tra cứu & căn cứ', phase: 'GIAI ĐOẠN 2' },
      { key: 'work', num: '3', title: 'Xử lý & nhật ký', phase: 'GIAI ĐOẠN 3' },
      { key: 'report', num: '4', title: 'Báo cáo tổng kết', phase: 'GIAI ĐOẠN 4' }
    ];

    return `
    <header class="case-detail-header">
      <div class="case-header-main">
        <div class="case-header-eyebrow">
          <span class="badge-case-id">${h(c.id)}</span>
          <span class="badge-case-type ${typeTone}">${h(typeLabel)}</span>
          ${a?.line ? `<span class="badge-case-line">${h(a.line).toUpperCase()}</span>` : ''}
        </div>
        <h1 id="page-title" class="case-header-title">${h(c.title)}</h1>
        <div class="case-header-meta">
          <span class="meta-item meta-asset" title="Thiết bị liên quan">
            ${icon('machine')}
            <strong>${h(c.assetId)}</strong>
            <span>${h(a?.name || '')}</span>
          </span>
          <span class="meta-sep">·</span>
          <span class="meta-item meta-owner" title="Người phụ trách">
            ${icon('user')}
            <span>Phụ trách: <strong>${h(S.person(c.ownerId))}</strong></span>
          </span>
          ${c.expertId ? `
          <span class="meta-sep">·</span>
          <span class="meta-item meta-expert" title="Chuyên gia phối hợp">
            ${icon('users')}
            <span>Chuyên gia: <strong>${h(S.person(c.expertId))}</strong></span>
          </span>` : ''}
        </div>
      </div>
      <div class="case-header-actions">
        <button type="button" class="btn btn-ghost case-back-btn" data-action="case-list">
          ${icon('back')}
          <span>Quay lại ca bảo trì</span>
        </button>
      </div>
    </header>

    <div class="case-status-strip" role="region" aria-label="Thông số trạng thái ca bảo trì (chỉ đọc)">
      <div class="status-strip-cell">
        <div class="status-strip-label">Tình trạng máy</div>
        <div class="status-strip-value">
          <span class="status-pill status-pill--${machineConfig.tone}">
            <span class="status-pill-dot ${machineConfig.dot}"></span>
            <span>${h(machineConfig.text)}</span>
          </span>
        </div>
      </div>
      <div class="status-strip-cell">
        <div class="status-strip-label">Công việc hiện trường</div>
        <div class="status-strip-value">
          <span class="status-pill status-pill--${workConfig.tone}">
            <span class="status-pill-dot ${workConfig.dot}"></span>
            <span>${h(workConfig.text)}</span>
          </span>
        </div>
      </div>
      <div class="status-strip-cell">
        <div class="status-strip-label">Hồ sơ báo cáo</div>
        <div class="status-strip-value">
          <span class="status-pill status-pill--${reportConfig.tone}">
            <span class="status-pill-dot ${reportConfig.dot}"></span>
            <span>${h(reportConfig.text)}</span>
          </span>
        </div>
      </div>
      <div class="status-strip-cell">
        <div class="status-strip-label">Tiến trình nhật ký</div>
        <div class="status-strip-value">
          <span class="status-pill status-pill--progress">
            ${icon('clock')}
            <span><strong>${c.rounds.length}</strong> đợt <span class="pill-sep">·</span> <strong>${totalEvents}</strong> ghi nhận</span>
          </span>
        </div>
      </div>
    </div>

    <nav class="case-workflow-stepper" aria-label="Quy trình 4 giai đoạn ca bảo trì">
      ${steps.map(s => {
        const isCurrent = tab === s.key;
        return `
        <button type="button" class="case-workflow-step ${isCurrent ? 'is-current' : ''}" 
          ${isCurrent ? 'aria-current="step"' : ''} 
          data-action="case-tab" ${cid(c)} data-tab="${s.key}">
          <div class="step-num-pill">${s.num}</div>
          <div class="step-text-wrap">
            <span class="step-phase-label">${s.phase}</span>
            <strong class="step-title">${h(s.title)}</strong>
          </div>
        </button>
        `;
      }).join('')}
    </nav>
    `;
  }
  S.pages.case = {title:'Chi tiết ca bảo trì',roles,render:() => {const c=current();if(!viewable(c))return S.empty('Không thể mở ca','Ca không tồn tại hoặc bạn chưa được phân công tham gia.',button('Về danh sách ca','case-list','primary'));const tab=S.ui.tab||(c.workState==='ended'?'report':'work');return header(c)+(tab==='context'?renderContext(c):tab==='sources'?renderSources(c):tab==='report'?renderReport(c):renderWork(c));}};
  S.actions['case-tab'] = el => {const c=get(el.dataset.case);if(protect(c,'view'))S.go('case',c.id,el.dataset.tab);};
  function renderContext(c) {
    const a = S.asset(c.assetId), x = c.context || {}, disabled = owner(c) && c.workState !== 'ended' ? '' : 'disabled';
    const attrs = `data-input="case-context" ${cid(c)} ${disabled}`;
    return `
    <div class="split-layout">
      <section class="card context-form-card">
        <div class="card-head">
          <div>
            <h2>Ghi bối cảnh hiện trường</h2>
            <p class="subtext">Ghi điều đang quan sát được. Chưa rõ thì để trống; chưa cần đoán nguyên nhân.</p>
          </div>
          ${saveLabel()}
        </div>
        <div class="card-body stack">
          ${c.workState === 'ended' ? '<div class="notice notice-info">Công việc đã kết thúc. Bối cảnh được giữ trong lịch sử; thông tin bổ sung ghi ở báo cáo.</div>' : ''}
          <div class="context-primary-fields">
            ${area('Dấu hiệu / hiện tượng đang thấy', 'symptom', x.symptom, attrs + ' placeholder="Ví dụ: Máy có tiếng kêu rít bất thường, dừng ngắt quãng..."')}
            <div class="form-grid">
              ${field('Alarm / mã lỗi (nếu có)', 'alarm', x.alarm, attrs + ' placeholder="Không có thì để trống"')}
              ${field('Bộ phận / vị trí liên quan (nếu biết)', 'component', x.component, attrs + ' placeholder="Ví dụ: Cụm camera kiểm tra"')}
            </div>
          </div>
          <details class="context-details">
            <summary>Điều kiện vận hành và thời điểm <span>(không bắt buộc)</span></summary>
            <div class="form-grid" style="margin-top: 14px;">
              ${field('Chế độ vận hành', 'mode', x.mode, attrs)}
              ${field('Model sản phẩm', 'productModel', x.productModel, attrs)}
              ${field('Tốc độ / điều kiện chạy', 'speed', x.speed, attrs)}
              ${field('Ca làm việc', 'shift', x.shift, attrs)}
              ${field('Thời điểm / tần suất xuất hiện', 'onset', x.onset, attrs)}
              ${field('Môi trường liên quan', 'environment', x.environment, attrs)}
            </div>
          </details>
          <details class="context-details">
            <summary>Điểm thay đổi trước khi phát sinh lỗi <span>(5M1E · nếu liên quan)</span></summary>
            <p class="field-hint" style="margin: 10px 0 12px;">Chọn “Chưa kiểm tra” nếu chưa xem; “Chưa ghi nhận thay đổi” nếu đã kiểm tra.</p>
            <div class="context-5m1e-grid">
              ${(x.changes || []).map((m, i) => `
                <div class="m51e-item">
                  ${select(m.group, `change_${i}`, m.status, [['unchecked', 'Chưa kiểm tra'], ['none', 'Chưa ghi nhận thay đổi'], ['changed', 'Có thay đổi']], attrs)}
                  ${field('Chi tiết thay đổi nếu có', `detail_${i}`, m.detail, attrs + ' placeholder="Nêu nội dung thay đổi..."')}
                </div>
              `).join('')}
            </div>
          </details>
          <div class="actions context-actions">
            <button type="button" class="btn btn-primary" data-action="case-tab" ${cid(c)} data-tab="sources">
              <span>Tiếp tục: tra cứu nguồn</span>
              ${icon('arrow')}
            </button>
            <span class="field-hint">Nội dung được lưu tự động trên trình duyệt này.</span>
          </div>
        </div>
      </section>
      ${assetPanel(a)}
    </div>
    `;
  }
  S.inputs['case-context'] = el => {const c=get(el.dataset.case);if(!protect(c)||c.workState==='ended')return;const index=Number(el.name.split('_')[1]);const old=el.name.startsWith('change_')?c.context.changes[index].status:el.name.startsWith('detail_')?c.context.changes[index].detail:c.context[el.name];if(old===el.value)return;S.commit(()=>{if(el.name.startsWith('change_'))c.context.changes[index].status=el.value;else if(el.name.startsWith('detail_'))c.context.changes[index].detail=el.value;else c.context[el.name]=el.value;if(c.retrieval)c.retrieval.stale=true;dirtyReport(c);c.updatedAt=stamp();},null,false);};
  S.actions['case-reference'] = el => {
    const a=S.asset(el.dataset.asset);if(!a)return;
    const bodyHtml = `
      <div class="stack">
        <div class="notice notice-info">
          ${icon('info')}
          <div>HozenDX mô phỏng · Dữ liệu chỉ đọc trích xuất lúc <strong>${h(sourceTime(a))}</strong>. Chưa có kết nối PLC/SCADA trực tiếp tới nhà máy.</div>
        </div>
        <h3>Lịch sử bảo trì BM / PM thiết bị</h3>
        ${(a.history||[]).map(x=>`
          <div class="source-card">
            <div class="source-meta">
              ${badge(x.type,'neutral')}
              <strong>${h(x.id)}</strong>
              <span>${h(S.fmtDate(x.date,false))}</span>
            </div>
            <p>${h(x.summary)}</p>
            <span class="field-hint">Hồ sơ tham chiếu lịch sử; chưa mặc nhiên là tri thức đã ban hành.</span>
          </div>
        `).join('')||'<p class="muted">Chưa có lịch sử trong bộ dữ liệu mô phỏng.</p>'}
        <h3>Tài liệu & Tiêu chuẩn vận hành (SOP/WI)</h3>
        ${(a.references||[]).map(x=>`
          <div class="source-card">
            <h4>${h(x.title)}</h4>
            <div class="source-meta">
              <strong>${h(x.id)}</strong> · ${h(x.type)} · Phiên bản ${h(x.version)}
            </div>
            <p>${h(x.summary)}</p>
          </div>
        `).join('')||'<p class="muted">Chưa có tài liệu phù hợp được cung cấp.</p>'}
        <p class="field-hint">Luôn đối chiếu quy trình có hiệu lực và thẩm quyền thao tác trước khi can thiệp thiết bị.</p>
      </div>
    `;
    S.modal(`${a.id} — Hồ sơ tham chiếu thiết bị`, bodyHtml, button('Đóng hồ sơ', 'close-modal', 'primary'));
  };

  function retrievalSources(c) {return (c.retrieval?.sources||[]).map(x=>S.getKnowledge(x.id,x.version)).filter(Boolean);}
  function renderSourceExtracts(c,list) {
    return `
    <div class="extracts-container">
      <div class="extracts-header">
        <span class="extracts-title-badge">${icon('checkcircle')} Kiểm tra trọng tâm trích từ nguồn</span>
        <span class="field-hint">Trích xuất từ ${Math.min(list.length, 3)} nguồn có độ tương đồng cao nhất</span>
      </div>
      <div class="extracts-cards-stack">
        ${list.slice(0,3).map(k=>`
        <div class="extract-item-card">
          <div class="extract-item-head">
            <div class="extract-source-meta">
              <span class="badge ${k.kind==='case'?'badge-blue':'badge-purple'}">${k.kind==='case'?'Case đã duyệt':'Tri thức chuyên gia'}</span>
              <strong class="extract-source-code">${h(k.id)} · v${h(k.version)}</strong>
              <span class="extract-source-title">${h(k.title)}</span>
            </div>
            <button type="button" class="btn btn-ghost btn-xs btn-extract-read"
              data-action="case-source-read" ${cid(c)} data-source="${h(k.id)}" data-version="${h(k.version)}">
              ${icon('file')}
              <span>Đọc căn cứ & giới hạn</span>
            </button>
          </div>
          <div class="extract-checks-box">
            <span class="checks-label">HÀNH ĐỘNG KIỂM TRA ĐỀ XUẤT</span>
            <p class="checks-content">${h(k.content?.checks||'Nguồn chưa mô tả bước kiểm tra chi tiết.')}</p>
          </div>
          <div class="extract-context-compare">
            <div class="compare-item">
              <span class="compare-tag">Bối cảnh nguồn:</span>
              <span class="compare-text">${h(k.content?.context||'Chưa mô tả đủ.')}</span>
            </div>
            <div class="compare-item compare-current">
              <span class="compare-tag">Hồ sơ hiện tại:</span>
              <span class="compare-text">${h(c.context?.productModel||'Chưa rõ model')} · ${h(c.context?.mode||'Chưa rõ chế độ')}</span>
            </div>
          </div>
        </div>
        `).join('')}
      </div>
    </div>
    `;
  }

  function renderSources(c) {
    const a = S.asset(c.assetId), list = retrievalSources(c), can = editable(c);
    return `
    <div class="sources-workspace stack">
      <section class="card sources-hub-card">
        <div class="card-body">
          <div class="sources-hub-header">
            <div class="sources-hub-left">
              <div class="sources-badge-eyebrow">
                <span class="badge-ai-intel">${icon('spark')} Trợ lý tra cứu mô phỏng & căn cứ</span>
                <span class="hub-family-tag">Nhóm máy: <strong>${h(a?.family || 'Chung')}</strong></span>
              </div>
              <h2 class="sources-hub-title">Tra cứu căn cứ & tri thức đề xuất</h2>
              <div class="sources-query-context">
                <div class="query-symptom-box">
                  <span class="query-label">DẤU HIỆU HIỆN TRƯỜNG</span>
                  <p class="query-text">${h(c.context?.symptom || c.title)}</p>
                </div>
                <div class="query-meta-chips">
                  <span class="query-chip">
                    ${icon('machine')}
                    <span>Thiết bị: <strong>${h(c.assetId)}</strong> (${h(a?.name || '')})</span>
                  </span>
                  <span class="query-chip">
                    ${icon('file')}
                    <span>Model: <strong>${h(c.context?.productModel || 'Chưa rõ')}</strong></span>
                  </span>
                  ${c.retrieval ? `
                  <span class="query-chip chip-timestamp">
                    ${icon('clock')}
                    <span>Lần tra cứu: <strong>${h(S.fmtDate(c.retrieval.at))}</strong></span>
                  </span>` : ''}
                </div>
              </div>
            </div>
            <div class="sources-hub-actions">
              ${can ? `
              <button type="button" class="btn btn-primary btn-search-ai ${c._isSearching ? 'is-loading' : ''}" 
                data-action="case-search" ${cid(c)} ${c._isSearching ? 'disabled' : ''}>
                ${icon('spark')}
                <span>${c._isSearching ? 'Đang phân tích...' : c.retrieval ? 'Tra cứu lại' : 'Tìm nguồn liên quan'}</span>
              </button>
              ` : ''}
            </div>
          </div>
          ${c.retrieval?.stale ? `
          <div class="notice notice-warning sources-stale-alert">
            ${icon('alert')}
            <div class="stale-alert-content">
              <strong>Bối cảnh hiện trường đã thay đổi sau lần tra cứu</strong>
              <p>Dữ liệu bối cảnh hoặc điều kiện máy vừa được chỉnh sửa. Nhấn <strong>"Tra cứu lại"</strong> để cập nhật phân tích mới nhất.</p>
            </div>
          </div>` : ''}
        </div>
      </section>

      ${c._isSearching ? `
      <section class="card ai-search-loading-card" role="status" aria-live="polite">
        <div class="ai-loading-glow"></div>
        <div class="ai-loading-header">
          <div class="ai-radar-container">
            <div class="ai-radar-pulse"></div>
            <div class="ai-radar-core">
              ${icon('spark')}
            </div>
          </div>
          <div class="ai-loading-title-wrap">
            <div class="ai-chip-pill">
              <span class="ai-chip-dot"></span>
              <span>SMARTMAINT · TRA CỨU MÔ PHỎNG</span>
            </div>
            <h3 class="ai-loading-title">Đang đối chiếu dữ kiện & quét kho tri thức...</h3>
            <p class="ai-loading-subtitle">
              Phân tích bối cảnh máy <strong>${h(c.assetId)}</strong> (${h(a?.family || 'Nhóm máy')}), đối chiếu dấu hiệu lỗi và trích xuất các case tương đồng đã duyệt.
            </p>
          </div>
        </div>

        <div class="ai-progress-track">
          <div class="ai-progress-bar" style="width: ${c._searchProgress || 25}%;">
            <div class="ai-progress-shimmer"></div>
          </div>
        </div>

        <div class="ai-pipeline-steps">
          <div class="ai-pipeline-step ${(c._searchProgress || 0) >= 15 ? 'is-active' : ''} ${(c._searchProgress || 0) >= 60 ? 'is-done' : ''}">
            <div class="step-marker">${(c._searchProgress || 0) >= 60 ? icon('check') : '1'}</div>
            <div class="step-info">
              <strong>Phân tích bối cảnh & triệu chứng</strong>
              <span>Trích xuất alarm, model và hiện tượng quan sát</span>
            </div>
          </div>

          <div class="ai-pipeline-step ${(c._searchProgress || 0) >= 60 ? 'is-active' : ''} ${(c._searchProgress || 0) >= 90 ? 'is-done' : ''}">
            <div class="step-marker">${(c._searchProgress || 0) >= 90 ? icon('check') : '2'}</div>
            <div class="step-info">
              <strong>Quét tri thức & Case tương đồng</strong>
              <span>Đối chiếu nhóm máy ${h(a?.family || '')} với cẩm nang chuyên gia</span>
            </div>
          </div>

          <div class="ai-pipeline-step ${(c._searchProgress || 0) >= 90 ? 'is-active' : ''}">
            <div class="step-marker">3</div>
            <div class="step-info">
              <strong>Tổng hợp khuyến nghị & quy chuẩn an toàn</strong>
              <span>Lập lộ trình hành động 3 cấp độ và tài liệu an toàn tham chiếu</span>
            </div>
          </div>
        </div>
      </section>
      ` : ''}

      ${!c.retrieval && !c._isSearching ? '' : c.retrieval && !list.length && !c._isSearching ? `
      <div class="notice notice-warning sources-not-found-notice">
        <div class="notice-icon-wrap">${icon('alert')}</div>
        <div class="notice-body-wrap">
          <h3>Chưa tìm thấy nguồn đã duyệt phù hợp nhóm máy ${h(a?.family || '')}</h3>
          <p>Chưa đủ dữ liệu bài học đã duyệt để tự động gợi ý hướng xử lý. Cần bổ sung thêm thông số kiểm tra hiện trường hoặc mời chuyên gia hỗ trợ trực tiếp.</p>
          ${owner(c) ? `
          <div class="actions" style="margin-top: 12px;">
            <button type="button" class="btn btn-primary" data-action="case-support" ${cid(c)}>
              ${icon('users')}
              <span>Yêu cầu chuyên gia hỗ trợ</span>
            </button>
          </div>` : ''}
        </div>
      </div>
      ` : !c._isSearching ? `
      <div class="sources-results-block">
        <div class="sources-section-head">
          <div class="section-head-left">
            <h2 class="sources-section-title">
              Nguồn tham khảo đã duyệt
              <span class="sources-count-badge">${list.length}</span>
            </h2>
            <p class="subtext">Các case thực tế và bài học chuyên gia tương đồng cùng nhóm máy <strong>${h(a?.family || '')}</strong>.</p>
          </div>
        </div>

        <div class="sources-grid">
          ${list.slice(0, c.retrieval.showAll ? 99 : 3).map(k => {
            const isPicked = (c.selectedSources || []).some(x => x.id === k.id && x.version === k.version);
            const isExpert = k.kind !== 'case';
            return `
            <article class="source-item-card ${isPicked ? 'is-picked' : ''}">
              <div class="source-card-top">
                <div class="source-type-badges">
                  <span class="badge ${isExpert ? 'badge-expert-knowledge' : 'badge-case-approved'}">
                    ${isExpert ? icon('book') : icon('wrench')}
                    <span>${isExpert ? 'Tri thức chuyên gia' : 'Case đã duyệt'}</span>
                  </span>
                  <span class="badge badge-version">v${h(k.version)}</span>
                </div>
                <div class="source-author-meta">
                  <span class="source-id-pill">${h(k.id)}</span>
                  <span class="source-author-name">${h(S.person(k.authorId))}</span>
                </div>
              </div>

              <h3 class="source-item-title" title="${h(k.title)}">${h(k.title)}</h3>

              <div class="source-brief-block">
                <div class="brief-row">
                  <span class="brief-label">Dấu hiệu đã gặp:</span>
                  <p class="brief-val">${h(k.content?.symptom || 'Chưa ghi nhận')}</p>
                </div>
                <div class="brief-row brief-match">
                  <span class="brief-label">Căn cứ phù hợp:</span>
                  <span class="match-badge">${icon('check')} Cùng nhóm máy ${h(k.family)}</span>
                </div>
                <div class="brief-row brief-limits">
                  <span class="brief-label">Lưu ý đối chiếu:</span>
                  <p class="brief-hint">${h(k.content?.limits || 'Cần đọc kỹ giới hạn trước khi tham khảo.')}</p>
                </div>
              </div>

              <div class="source-card-footer">
                <button type="button" class="btn btn-ghost btn-sm btn-read-source" 
                  data-action="case-source-read" ${cid(c)} data-source="${h(k.id)}" data-version="${h(k.version)}">
                  ${icon('file')}
                  <span>Đọc chi tiết</span>
                </button>
                ${can && c.workState === 'active' ? `
                <button type="button" class="btn btn-sm ${isPicked ? 'btn-picked' : 'btn-secondary'} btn-pick-source"
                  data-action="case-source-pick" ${cid(c)} data-source="${h(k.id)}" data-version="${h(k.version)}" ${c.retrieval.stale ? 'disabled' : ''}>
                  ${isPicked ? icon('check') : icon('plus')}
                  <span>${isPicked ? 'Đã chọn tham khảo' : 'Chọn tham khảo'}</span>
                </button>
                ` : ''}
              </div>
            </article>
            `;
          }).join('')}
        </div>
        ${list.length > 3 && !c.retrieval.showAll ? `
        <div class="sources-show-more">
          <button type="button" class="btn btn-secondary" data-action="case-more-sources" ${cid(c)}>
            ${icon('chevrondown')}
            <span>Xem thêm ${list.length - 3} nguồn khác</span>
          </button>
        </div>` : ''}
      </div>

      <section class="card decision-support-card">
        <div class="card-head decision-head">
          <div class="decision-head-title-wrap">
            <span class="decision-badge-spark">${icon('spark')} Trợ lý tổng hợp mô phỏng</span>
            <h2>Tóm tắt hỗ trợ quyết định</h2>
            <p class="subtext">Phân tích đa chiều dựa trên các bài học tương đồng và dữ kiện hiện trường đã ghi nhận.</p>
          </div>
          <span class="badge badge-ai-mode">Phân tích mô phỏng</span>
        </div>
        <div class="card-body stack">
          ${renderSourceExtracts(c, list)}

          <div class="evidence-matrix-grid">
            <div class="evidence-box evidence-box--known">
              <div class="evidence-box-header">
                <span class="evidence-dot dot-green"></span>
                <strong>ĐÃ BIẾT (Dữ kiện hiện trường)</strong>
              </div>
              <p class="evidence-symptom-text">${h(c.context?.symptom || c.title)}</p>
              <div class="evidence-stats-pill">
                ${icon('clock')}
                <span>Có <strong>${events(c).length}</strong> ghi nhận hiện trường trong <strong>${c.rounds.length}</strong> đợt.</span>
              </div>
            </div>

            <div class="evidence-box evidence-box--missing">
              <div class="evidence-box-header">
                <span class="evidence-dot dot-amber"></span>
                <strong>CÒN THIẾU (Cần xác minh thêm)</strong>
              </div>
              <p class="evidence-missing-text">Cần xác minh mức phù hợp của từng nguồn với điều kiện và bằng chứng cụ thể. Cùng nhóm máy chưa chứng minh cùng nguyên nhân gốc rễ.</p>
              <div class="evidence-stats-pill pill-warning">
                ${icon('alert')}
                <span>Cần đối chiếu thêm thông số 5M1E trước khi kết luận.</span>
              </div>
            </div>
          </div>

          <div class="action-horizons-container">
            <div class="action-horizons-header">
              <h3>Định hướng hành động 3 cấp độ</h3>
              <span class="field-hint">Phân chia giải pháp từ xử lý cấp bách đến cải tiến chống tái diễn</span>
            </div>
            <div class="action-horizons-grid">
              <div class="horizon-card horizon--immediate">
                <div class="horizon-card-top">
                  <span class="horizon-tag tag-green">CẤP ĐỘ 1</span>
                  <h4>Trước mắt (Khắc phục ngay)</h4>
                </div>
                <p>Đọc mục kiểm tra và giới hạn ở nguồn đã duyệt. Chọn bước kiểm tra phù hợp sau khi xác minh điều kiện an toàn.</p>
              </div>

              <div class="horizon-card horizon--medium">
                <div class="horizon-card-top">
                  <span class="horizon-tag tag-amber">CẤP ĐỘ 2</span>
                  <h4>Theo dõi / Trung hạn</h4>
                </div>
                <p>Ghi kết quả và tình huống tái phát. Chỉ đưa kế hoạch sửa chữa vào báo cáo khi có người phụ trách xác nhận.</p>
              </div>

              <div class="horizon-card horizon--long">
                <div class="horizon-card-top">
                  <span class="horizon-tag tag-purple">CẤP ĐỘ 3</span>
                  <h4>Cải tiến / Dài hạn</h4>
                </div>
                <p>Chưa đủ căn cứ tự đề xuất thay thế thiết bị. Chuyên gia đánh giá từ lịch sử và bằng chứng tích lũy.</p>
              </div>
            </div>
          </div>

          <div class="safety-gate-card">
            <div class="safety-gate-icon">
              ${icon('alert')}
            </div>
            <div class="safety-gate-content">
              <div class="safety-gate-title">
                <strong>An toàn trước thao tác (Bắt buộc tuân thủ)</strong>
                <span class="safety-badge">CẦN XÁC MINH QUY TRÌNH</span>
              </div>
              <p class="safety-text">${h(list[0]?.content?.safety || 'Chưa có quy trình an toàn phù hợp được xác minh.')}</p>
              <p class="safety-subtext">Mở quy trình theo máy và xác minh hiệu lực trước khi thực hiện. Chọn nguồn không đồng nghĩa được phép vận hành.</p>
            </div>
            <div class="safety-gate-action">
              <button type="button" class="btn btn-secondary btn-safety-ref" data-action="case-reference" data-asset="${h(c.assetId)}">
                ${icon('shield')}
                <span>Mở tham chiếu theo máy</span>
              </button>
            </div>
          </div>

          <div class="decision-footer-actions">
            <button type="button" class="btn btn-primary btn-proceed-work" data-action="case-tab" ${cid(c)} data-tab="work">
              <span>Tiếp tục: Ghi kiểm tra & xử lý</span>
              ${icon('arrow')}
            </button>
            ${owner(c) && c.workState !== 'ended' ? `
            <button type="button" class="btn btn-secondary btn-ask-expert" data-action="case-support" ${cid(c)}>
              ${icon('users')}
              <span>Yêu cầu chuyên gia hỗ trợ</span>
            </button>` : ''}
          </div>
        </div>
      </section>
      ` : ''}
    </div>
    `;
  }

  S.actions['case-search'] = el => {
    const c = get(el.dataset.case);
    if (!protect(c, 'edit')) return;
    const family = S.asset(c.assetId)?.family;
    
    // Bắt đầu animation AI quét phân tích trong 1.5s
    c._isSearching = true;
    c._searchProgress = 20;
    S.render();

    const updateSearchProgress = progress => {
      if (!c._isSearching) return;
      c._searchProgress = progress;
      const card = document.querySelector('.ai-search-loading-card');
      if (!card) return;
      const bar = card.querySelector('.ai-progress-bar');
      if (bar) bar.style.width = `${progress}%`;
      card.querySelectorAll('.ai-pipeline-step').forEach((item, index) => {
        const activeAt = [15, 60, 90][index], doneAt = [60, 90, 101][index];
        item.classList.toggle('is-active', progress >= activeAt);
        item.classList.toggle('is-done', progress >= doneAt);
        const marker = item.querySelector('.step-marker');
        if (marker && progress >= doneAt) marker.innerHTML = icon('check');
      });
    };

    setTimeout(() => {
      updateSearchProgress(65);
    }, 450);

    setTimeout(() => {
      updateSearchProgress(90);
    }, 950);

    setTimeout(() => {
      const scrollTop = document.querySelector('.content')?.scrollTop || 0;
      c._isSearching = false;
      delete c._searchProgress;
      S.commit(() => {
        c.retrieval = {
          at: stamp(),
          stale: false,
          sources: S.db.knowledge.filter(k => k.status === 'published' && k.family === family).map(k => ({ id: k.id, version: k.version })),
          contextSnapshot: JSON.stringify(c.context)
        };
        updated(c, 'Tra cứu nguồn đã duyệt', family);
      }, 'Đã cập nhật kết quả tra cứu mô phỏng theo nhóm máy.');
      requestAnimationFrame(() => {
        const content = document.querySelector('.content');
        if (content) content.scrollTop = scrollTop;
      });
    }, 1500);
  };
  S.actions['case-more-sources'] = el => {const c=get(el.dataset.case);if(protect(c,'view'))S.commit(()=>{c.retrieval.showAll=true;});};
  S.actions['case-source-read'] = el => {
    const c=get(el.dataset.case);if(!protect(c,'view'))return;const k=S.getKnowledge(el.dataset.source,Number(el.dataset.version));if(!k)return S.toast('Nguồn không còn sẵn sàng trong bộ dữ liệu.','warning');
    const fieldIcons = {
      symptom: 'alert',
      context: 'history',
      checks: 'search',
      solution: 'tool',
      result: 'checkcircle',
      cause: 'help',
      evidence: 'file',
      safety: 'shield',
      limits: 'info'
    };
    const fieldTones = {
      symptom: 'tone-blue',
      solution: 'tone-teal',
      safety: 'tone-amber',
      cause: 'tone-purple'
    };
    const sections = [
      ['symptom','Dấu hiệu / vấn đề'],
      ['context','Điều kiện phát sinh'],
      ['checks','Kiểm tra và căn cứ'],
      ['solution','Hướng xử lý / bài học'],
      ['result','Kết quả và kiểm chứng'],
      ['cause','Nguyên nhân / giả thuyết'],
      ['evidence','Bằng chứng và nguồn'],
      ['safety','An toàn & quy trình tham chiếu'],
      ['limits','Điều kiện áp dụng & giới hạn']
    ];
    const metaStrip = `
      <div class="modal-source-header-meta">
        <span class="badge ${k.kind==='case'?'badge-blue':'badge-purple'}">${k.kind==='case'?'Case đã duyệt':'Tri thức chuyên gia'}</span>
        <span class="meta-item">${icon('tag')} Dòng máy: <strong>${h(k.family || 'Chung')}</strong></span>
        <span class="meta-item">${icon('user')} Tác giả: <strong>${h(S.person(k.authorId))}</strong></span>
        <span class="meta-item">${icon('shield')} Người duyệt: <strong>${h(S.person(k.reviewerId))}</strong></span>
      </div>
    `;
    const bodyHtml = metaStrip + `
      <div class="modal-content-view">
        ${sections.map(([key, label]) => {
          const val = k.content?.[key];
          const tone = fieldTones[key] || '';
          const ic = fieldIcons[key] || 'file';
          return `
            <section class="modal-content-section ${tone}">
              <div class="modal-section-header">
                <span class="modal-section-icon">${icon(ic)}</span>
                <div class="modal-section-title-wrap">
                  <h3 class="modal-section-title">${label}</h3>
                </div>
              </div>
              <div class="modal-section-body">
                ${val ? `<div class="modal-section-text">${h(val)}</div>` : `<span class="empty-field-text">Chưa có thông tin ghi nhận.</span>`}
              </div>
            </section>
          `;
        }).join('')}
      </div>
    `;
    const footerHtml = button('Đóng nguồn', 'close-modal', 'secondary') + (editable(c) ? button('Chọn làm hướng tham khảo', 'case-source-pick', 'primary', `${cid(c)} data-source="${h(k.id)}" data-version="${h(k.version)}"`) : '');
    S.modal(`${k.id} · v${k.version} — ${k.title}`, bodyHtml, footerHtml);
  };
  S.actions['case-source-pick'] = el => {const c=get(el.dataset.case);if(!protect(c,'edit'))return;if(c.retrieval?.stale)return S.toast('Bối cảnh đã đổi. Hãy tra cứu lại trước khi chọn nguồn.','warning');const k=S.getKnowledge(el.dataset.source,Number(el.dataset.version));if(!k||k.status!=='published')return;if(S.getKnowledge(k.id)?.version!==k.version)return S.toast('Nguồn đã có phiên bản mới. Tra cứu lại và đối chiếu trước khi chọn hướng. Bản nguồn cũ vẫn giữ trong lịch sử.','warning');if(S.commit(()=>{c.selectedSources ||= [];if(!c.selectedSources.some(x=>x.id===k.id&&x.version===k.version))c.selectedSources.push({id:k.id,version:k.version,selectedBy:who().id,selectedAt:stamp(),feedback:''});updated(c,'Chọn nguồn tham khảo',`${k.id} v${k.version}`);},'Đã ghi nhận hướng tham khảo; chưa đánh dấu đã thực hiện.'))S.closeModal();};

  function supportPanel(c) {
    const x = c.support;
    if (!x) {
      return `
      <div class="expert-assist-banner">
        <div class="expert-assist-icon-wrap">
          ${icon('users')}
        </div>
        <div class="expert-assist-content">
          <strong>Cần thêm kinh nghiệm từ chuyên gia?</strong>
          <p>Gửi bối cảnh và các bước đã thử cho chuyên gia để được định hướng từ xa hoặc phối hợp tại hiện trường. Bạn tiếp tục là người phụ trách hồ sơ.</p>
        </div>
        ${owner(c) && c.workState !== 'ended' ? `
        <div class="expert-assist-action">
          <button type="button" class="btn btn-secondary btn-expert-call" data-action="case-support" ${cid(c)}>
            ${icon('users')}
            <span>Yêu cầu chuyên gia</span>
          </button>
        </div>` : ''}
      </div>
      `;
    }
    const status = { requested: 'Chờ phản hồi', accepted: 'Đã nhận hỗ trợ', joined: 'Đang phối hợp', unavailable: 'Chưa thể hỗ trợ' };
    const statusTone = { requested: 'amber', accepted: 'blue', joined: 'green', unavailable: 'neutral' };
    return `
    <section class="card expert-collab-card">
      <div class="card-head expert-collab-head">
        <div class="expert-collab-head-left">
          <span class="badge-collab-tag">${icon('users')} Phối hợp chuyên gia</span>
          <h3>Hỗ trợ kỹ thuật chuyên gia</h3>
        </div>
        ${badge(status[x.status], statusTone[x.status] || 'blue')}
      </div>
      <div class="card-body stack">
        <div class="expert-info-strip">
          <div class="expert-avatar-chip">
            ${icon('user')}
            <span>Chuyên gia: <strong>${h(S.person(x.expertId))}</strong></span>
          </div>
          <span class="collab-meta-sep">·</span>
          <span class="collab-timestamp">Yêu cầu lúc: ${h(S.fmtDate(x.requestedAt))}</span>
        </div>
        <div class="expert-reason-box">
          <span class="box-label">VẤN ĐỀ CẦN HỖ TRỢ</span>
          <p>${h(x.reason)}</p>
        </div>
        ${x.response ? `
        <div class="expert-response-box">
          <span class="box-label">PHẢN HỒI TỪ CHUYÊN GIA</span>
          <p>${h(x.response)}</p>
        </div>` : ''}
        ${x.joinedAt ? `
        <div class="expert-joined-meta">
          ${icon('checkcircle')}
          <span>Tham gia từ <strong>${h(S.fmtDate(x.joinedAt))}</strong> · Công đoạn: <strong>${h(x.stage || 'Điều tra / xử lý')}</strong></span>
        </div>` : ''}
        ${who().id === x.expertId && x.status === 'requested' ? `
        <div class="actions">
          ${button('Nhận hỗ trợ', 'case-support-accept', 'primary', cid(c))}
          ${button('Chưa thể hỗ trợ', 'case-support-decline', 'secondary', cid(c))}
        </div>` : ''}
        ${who().id === x.expertId && x.status === 'accepted' ? button('Bắt đầu tham gia tại hiện trường', 'case-support-join', 'primary', cid(c)) : ''}
        ${owner(c) && x.status === 'unavailable' && c.workState !== 'ended' ? button('Cập nhật yêu cầu hỗ trợ', 'case-support', 'secondary', cid(c)) : ''}
        <p class="field-hint">Người bảo trì hỗ trợ và ghi theo mốc. Chuyên gia xác nhận các nhóm nội dung của mình khi thuận tiện; không cần duyệt từng dòng.</p>
      </div>
    </section>
    `;
  }
  S.actions['case-support'] = el => {
    const c=get(el.dataset.case);if(!protect(c)||c.workState==='ended')return;
    if(c.support&&['requested','accepted','joined'].includes(c.support.status)){S.go('case',c.id,'work');S.toast('Hồ sơ đã có yêu cầu hỗ trợ đang hoạt động.','info');return;}
    const ex=S.db.users.filter(u=>u.role==='expert');
    const summary=events(c).map(e=>`${labels.event[e.type]}: ${e.content}${e.result?' — '+e.result:''}`).join('\n');
    S.modal('Yêu cầu chuyên gia hỗ trợ',`<form data-form="case-support-send" ${cid(c)} class="stack">${errorBox()}<div class="notice notice-info">Tóm tắt dưới đây được ghép từ bối cảnh và nhật ký đã lưu. Kiểm tra nội dung trước khi gửi.</div>${select('Chuyên gia','expertId',c.expertId||ex[0]?.id,ex.map(u=>[u.id,u.name]))}${area('Vấn đề cần chuyên gia làm rõ','reason',c.support?.reason||'', 'required')}${area('Bàn giao bối cảnh và các bước đã thử','handover',`${c.assetId} — ${c.context?.symptom||c.title}\n${summary}`,'rows="6"')}<div class="modal-form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Hủy bỏ</button><button type="submit" class="btn btn-primary">Gửi yêu cầu trong ứng dụng</button></div></form>`);
  };
  S.forms['case-support-send'] = form => {
    const c=get(form.dataset.case);if(!protect(c)||c.workState==='ended')return;const f=new FormData(form),expertId=String(f.get('expertId')),reason=String(f.get('reason')||'').trim();
    if(!reason||!S.db.users.some(u=>u.id===expertId&&u.role==='expert'))return canFail(form,'Chọn chuyên gia và ghi vấn đề cần hỗ trợ.');
    if(c.support&&['requested','accepted','joined'].includes(c.support.status))return canFail(form,'Đã có yêu cầu hỗ trợ đang hoạt động trong hồ sơ.');
    if(S.commit(()=>{c.supportHistory ||= [];if(c.support)c.supportHistory.push(structuredClone(c.support));c.support={expertId,status:'requested',reason,handover:String(f.get('handover')||''),requestedAt:stamp()};c.expertId=expertId;S.notice(expertId,'Có hồ sơ cần hỗ trợ',`${c.id}: ${reason}`,{page:'case',id:c.id,tab:'work'});updated(c,'Yêu cầu chuyên gia',expertId);},'Đã gửi yêu cầu. Nhật ký vẫn có thể tiếp tục ghi.'))S.closeModal();
  };
  S.actions['case-support-accept'] = el => {const c=get(el.dataset.case);if(!c||c.support?.expertId!==who().id||c.support.status!=='requested')return;S.commit(()=>{c.support.status='accepted';c.support.acceptedAt=stamp();S.notice(c.ownerId,'Chuyên gia đã nhận hỗ trợ',`${S.person(who().id)} đã nhận ${c.id}.`,{page:'case',id:c.id,tab:'work'});updated(c,'Nhận hỗ trợ');},'Đã nhận hỗ trợ. Xác nhận bắt đầu khi thực sự tham gia.');};
  S.actions['case-support-decline'] = el => {const c=get(el.dataset.case);if(!c||c.support?.expertId!==who().id||c.support.status!=='requested')return;S.modal('Chưa thể hỗ trợ',`<form data-form="case-support-unavailable" ${cid(c)} class="stack">${errorBox()}${area('Lý do / thông tin bàn giao','response','','required')}<div class="modal-form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Hủy bỏ</button><button class="btn btn-primary" type="submit">Gửi phản hồi</button></div></form>`);};
  S.forms['case-support-unavailable'] = form => {const c=get(form.dataset.case),f=new FormData(form),response=String(f.get('response')||'').trim();if(!c||c.support?.expertId!==who().id||c.support.status!=='requested')return;if(!response)return canFail(form,'Cần ghi lý do để người bảo trì chủ động tìm hỗ trợ.');if(S.commit(()=>{c.support.status='unavailable';c.support.response=response;S.notice(c.ownerId,'Chuyên gia chưa thể hỗ trợ',response,{page:'case',id:c.id,tab:'work'});updated(c,'Phản hồi chưa thể hỗ trợ');},'Đã gửi phản hồi.'))S.closeModal();};
  S.actions['case-support-join'] = el => {const c=get(el.dataset.case);if(!c||c.support?.expertId!==who().id||c.support.status!=='accepted')return;S.modal('Bắt đầu tham gia hồ sơ',`<form data-form="case-support-start" ${cid(c)} class="stack">${field('Công đoạn bắt đầu tham gia','stage','Điều tra nguyên nhân và đánh giá hướng xử lý','required')}<p class="subtext">Thời điểm bắt đầu được ghi vào lịch sử. Người bảo trì vẫn phụ trách hồ sơ.</p><div class="modal-form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Hủy bỏ</button><button class="btn btn-primary" type="submit">Xác nhận tham gia</button></div></form>`);};
  S.forms['case-support-start'] = form => {const c=get(form.dataset.case);if(!c||c.support?.expertId!==who().id||c.support.status!=='accepted')return;const f=new FormData(form);if(S.commit(()=>{c.support.status='joined';c.support.joinedAt=stamp();c.support.stage=String(f.get('stage')||'Điều tra / xử lý');if(!c.participants.includes(who().id))c.participants.push(who().id);S.notice(c.ownerId,'Chuyên gia bắt đầu tham gia',`${S.person(who().id)}: ${c.support.stage}`,{page:'case',id:c.id,tab:'work'});updated(c,'Bắt đầu tham gia',c.support.stage);},'Đã ghi nhận thời điểm và công đoạn tham gia.'))S.closeModal();};

  S.pages.assignments={title:'Hỗ trợ & xác nhận',roles:['expert'],render:()=>{const list=S.db.cases.filter(invited);return `${S.head('Hỗ trợ & xác nhận')}<div class="grid-2">${list.map(c=>`<div class="stack">${caseCard(c)}${supportPanel(c)}${expertGroups(c).some(g=>g.person===who().id&&!groupConfirmed(g))?`<div class="notice notice-warning">Có ghi nhận đang chờ bạn xác nhận. ${button('Xem đóng góp của tôi','case-group-modal','secondary',cid(c))}</div>`:''}</div>`).join('')}</div>${list.length?'':S.empty('Chưa có yêu cầu hỗ trợ','Yêu cầu của người bảo trì sẽ xuất hiện tại đây.')}`;}};

  function noteForm(c) {
    const d = S.db.drafts[draftKey(c)] || {}, people = (c.participants || []).filter(id => S.db.users.some(u => u.id === id));
    return `
    <form class="card work-note-card" data-form="case-note" ${cid(c)}>
      <div class="card-head work-note-head">
        <div class="work-note-head-title">
          <div class="work-note-badge-eyebrow">
            <span class="badge-log-tag">${icon('edit')} Nhật ký hiện trường</span>
          </div>
          <h2>Ghi nhận tiến trình xử lý</h2>
          <p class="subtext">Ghi chú nhanh theo từng mốc hành động. Chưa rõ nguyên nhân vẫn lưu được mốc điều tra.</p>
        </div>
        ${saveLabel()}
      </div>
      <div class="card-body stack">
        ${errorBox()}
        <div class="form-grid">
          ${select('Loại ghi nhận', 'type', d.type || 'observation', Object.entries(labels.event), `data-input="case-note-draft" ${cid(c)}`)}
          ${select('Người thực hiện / đưa nhận định', 'performedBy', d.performedBy || who().id, people.map(id => [id, S.person(id)]), `data-input="case-note-draft" ${cid(c)}`)}
        </div>
        ${area('Nội dung ghi nhận', 'content', d.content, `data-input="case-note-draft" ${cid(c)} required placeholder="Mô tả cụ thể điều vừa quan sát, kiểm tra hoặc thao tác trên máy…"`,'Có thể gõ hoặc dán ghi chú. Ghi theo mốc hành động, không cần ghi từng thao tác li ti.')}
        <div class="form-grid">
          ${field('Kết quả nếu đã có', 'result', d.result, `data-input="case-note-draft" ${cid(c)} placeholder="Ví dụ: Đạt / Không đạt, lỗi không tái diễn..."`)}
          ${field('Lý do lựa chọn / đổi hướng (nếu cần)', 'rationale', d.rationale, `data-input="case-note-draft" ${cid(c)} placeholder="Căn cứ đưa ra bước kiểm tra này"`)}
        </div>
        <details class="context-details work-details-accordion">
          <summary>Thông tin bổ sung · Số đo & Thời điểm thực tế <span>(tuỳ chọn)</span></summary>
          <div class="form-grid" style="margin-top: 14px;">
            ${field('Giá trị đo', 'measurement', d.measurement, `data-input="case-note-draft" ${cid(c)} placeholder="Ví dụ: 24.5"`)}
            ${field('Đơn vị', 'unit', d.unit, `data-input="case-note-draft" ${cid(c)} placeholder="V, bar, mm, °C..."`)}
            ${field('Thời điểm thực tế khi ghi bù', 'performedAt', d.performedAt, `data-input="case-note-draft" ${cid(c)}`, 'datetime-local')}
          </div>
        </details>
        <div class="work-note-footer">
          <div class="note-footer-actions">
            <button class="btn btn-primary btn-save-note" type="submit">
              ${icon('check')}
              <span>Lưu ghi nhận vào nhật ký</span>
            </button>
            <span class="field-hint">Người nhập: <strong>${h(S.person(who().id))}</strong>. Ghi hộ chuyên gia sẽ gom để chuyên gia xác nhận sau.</span>
          </div>
        </div>
      </div>
    </form>
    `;
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
    const totalCount = events(c).length;
    return `
    <section class="card work-timeline-card">
      <div class="card-head timeline-main-head">
        <div class="timeline-head-left">
          <span class="badge-timeline-tag">${icon('clock')} Dòng thời gian</span>
          <h2>Nhật ký tiến trình mọi đợt</h2>
        </div>
        <span class="badge badge-counter-total">${totalCount} ghi nhận</span>
      </div>
      <div class="card-body stack">
        ${[...c.rounds].reverse().map(r => `
        <section class="round-timeline-block stack">
          <div class="round-block-header">
            <div class="round-title-wrap">
              <span class="round-badge-num">ĐỢT ${r.number}</span>
              <h3 class="round-title">${r.state === 'active' ? 'Đợt đang thực hiện' : 'Đợt đã kết thúc'}</h3>
            </div>
            ${badge(r.state === 'active' ? 'Đang thực hiện' : 'Đã kết thúc đợt', r.state === 'active' ? 'blue' : 'neutral')}
          </div>
          <div class="round-meta-strip">
            <span class="round-time-item">Bắt đầu: <strong>${h(S.fmtDate(r.startedAt))}</strong></span>
            ${r.endedAt ? `<span class="meta-sep">·</span><span class="round-time-item">Kết thúc: <strong>${h(S.fmtDate(r.endedAt))}</strong></span>` : ''}
          </div>
          ${r.summary ? `
          <div class="round-handover-card">
            <div class="handover-title">
              ${icon('file')}
              <strong>Tóm tắt kết quả đợt:</strong>
            </div>
            <p class="handover-summary-text">${h(r.summary)}</p>
            ${r.nextSteps ? `<p class="handover-next"><strong>Việc tiếp theo:</strong> ${h(r.nextSteps)}</p>` : ''}
            ${r.recipient ? `<p class="handover-recipient"><strong>Bàn giao cho:</strong> ${h(r.recipient)}</p>` : ''}
          </div>` : ''}

          <div class="timeline work-timeline-stream">
            ${[...r.events].reverse().map(e => {
              const isExpert = S.db.users.find(u => u.id === e.performedBy)?.role === 'expert';
              const g = { signature: groupSignature(r, e.performedBy), confirmation: c.confirmations?.[`${r.id}:${e.performedBy}`] };
              const eventTone = {
                observation: 'blue',
                check: 'green',
                hypothesis: 'purple',
                action: 'amber',
                result: 'emerald'
              }[e.type] || 'neutral';
              return `
              <article class="work-event-item event-type--${e.type}" id="event-${h(e.id)}">
                <span class="timeline-dot dot--${eventTone}"></span>
                <div class="timeline-content work-event-card stack">
                  <div class="work-event-header">
                    <div class="event-tags-wrap">
                      <span class="badge badge-event-type badge-${eventTone}">${labels.event[e.type] || e.type}</span>
                      ${isExpert ? badge(groupConfirmed(g) ? 'Đã xác nhận' : 'Chờ chuyên gia xác nhận', groupConfirmed(g) ? 'green' : 'amber') : ''}
                    </div>
                    <span class="event-timestamp">${icon('clock')} ${h(S.fmtDate(e.performedAt))}</span>
                  </div>

                  <p class="event-body-text" style="white-space:pre-line">${h(e.content)}</p>

                  ${e.measurement ? `
                  <div class="event-metric-chip">
                    <span class="metric-label">Số đo kỹ thuật:</span>
                    <strong>${h(e.measurement)} ${h(e.unit)}</strong>
                  </div>` : ''}

                  ${e.result ? `
                  <div class="event-result-box">
                    <span class="result-label">Kết quả:</span>
                    <p>${h(e.result)}</p>
                  </div>` : ''}

                  ${e.rationale ? `
                  <div class="event-rationale-box">
                    <span class="rationale-label">Căn cứ / Lý do:</span>
                    <p>${h(e.rationale)}</p>
                  </div>` : ''}

                  <div class="work-event-footer">
                    <div class="event-author-info">
                      <span>Thực hiện: <strong>${h(S.person(e.performedBy))}</strong></span>
                      <span class="meta-sep">·</span>
                      <span>Nhập bởi: <strong>${h(S.person(e.enteredBy))}</strong> (${h(S.fmtDate(e.recordedAt))})</span>
                    </div>
                    ${correctable(c) && (owner(c) || e.performedBy === who().id) ? `
                    <button type="button" class="btn btn-ghost btn-xs btn-edit-event" data-action="case-note-edit" ${cid(c)} data-event="${h(e.id)}">
                      ${icon('edit')}
                      <span>Sửa ghi nhận</span>
                    </button>` : ''}
                  </div>

                  ${e.history?.length ? `
                  <details class="event-history-details">
                    <summary>${e.history.length} lần chỉnh sửa</summary>
                    <div class="history-list">
                      ${e.history.map(v => `
                      <p class="field-hint">${h(S.fmtDate(v.changedAt))} · ${h(S.person(v.changedBy))}: ${h(v.content)} (Lý do: ${h(v.reason || 'Cập nhật')})</p>
                      `).join('')}
                    </div>
                  </details>` : ''}
                </div>
              </article>
              `;
            }).join('') || '<div class="empty-round-hint"><p class="muted">Đợt này chưa có ghi nhận. Bắt đầu bằng việc ghi lại điều vừa quan sát hoặc kiểm tra tại hiện trường.</p></div>'}
          </div>
        </section>
        `).join('')}
      </div>
    </section>
    `;
  }
  S.actions['case-note-edit']=el=>{const c=get(el.dataset.case);if(!protect(c,'correct'))return;const e=events(c).find(e=>e.id===el.dataset.event);if(!e||(!owner(c)&&e.performedBy!==who().id))return;S.modal('Chỉnh sửa ghi nhận',`<form class="stack" data-form="case-note-update" ${cid(c)} data-event="${h(e.id)}">${errorBox()}${area('Nội dung','content',e.content,'required')}${field('Kết quả','result',e.result)}${field('Lý do lựa chọn','rationale',e.rationale)}${field('Lý do chỉnh sửa','editReason','','required')}<p class="field-hint">Giữ bản trước trong lịch sử. Xác nhận của chuyên gia cho nhóm nội dung này sẽ cần được thực hiện lại.</p><div class="modal-form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Hủy bỏ</button><button type="submit" class="btn btn-primary">Lưu phiên bản chỉnh sửa</button></div></form>`);};
  S.forms['case-note-update']=form=>{const c=get(form.dataset.case);if(!protect(c,'correct'))return;const r=c.rounds.find(r=>r.events.some(e=>e.id===form.dataset.event)),e=r?.events.find(e=>e.id===form.dataset.event);if(!e||(!owner(c)&&e.performedBy!==who().id))return;const f=new FormData(form),content=String(f.get('content')||'').trim(),reason=String(f.get('editReason')||'').trim();if(!content||!reason)return canFail(form,'Nội dung và lý do chỉnh sửa là bắt buộc.');if(S.commit(()=>{const old={...e};delete old.history;e.history ||= [];e.history.push({...old,changedBy:who().id,changedAt:stamp(),reason});e.content=content;e.result=String(f.get('result')||'');e.rationale=String(f.get('rationale')||'');dirtyReport(c);updated(c,'Chỉnh sửa ghi nhận',reason);},'Đã giữ bản trước và cập nhật ghi nhận.'))S.closeModal();};

  function groupPanel(c) {
    const groups = expertGroups(c);
    if (!groups.length) return '';
    return `
    <section class="card expert-groups-card">
      <div class="card-head expert-groups-head">
        <div class="groups-head-left">
          <span class="badge-groups-icon">${icon('users')}</span>
          <h2>Xác nhận đóng góp</h2>
        </div>
        <span class="muted">Theo chuyên gia / đợt</span>
      </div>
      <div class="card-body stack">
        <div class="groups-list">
          ${groups.map(g => `
          <div class="group-contribution-item">
            <div class="contribution-info">
              <strong>${h(S.person(g.person))} · Đợt ${g.round.number}</strong>
              <p class="field-hint">
                ${g.round.events.filter(e => e.performedBy === g.person).length} ghi nhận · 
                ${groupConfirmed(g) ? 'Nội dung không đổi, giữ nguyên xác nhận.' : g.confirmation?.status === 'changes' ? 'Chuyên gia yêu cầu sửa: ' + h(g.confirmation.feedback || '') : 'Đang chờ xác nhận nội dung.'}
              </p>
            </div>
            ${badge(groupConfirmed(g) ? 'Đã xác nhận' : 'Chờ xác nhận', groupConfirmed(g) ? 'green' : 'amber')}
          </div>
          `).join('')}
        </div>
        <div class="actions">
          ${who().role === 'expert' ? button('Xem & xác nhận phần của tôi', 'case-group-modal', 'primary', cid(c)) : button('Gửi yêu cầu xác nhận', 'case-group-request', 'secondary', cid(c))}
        </div>
      </div>
    </section>
    `;
  }
  S.actions['case-group-request']=el=>{const c=get(el.dataset.case);if(!protect(c))return;const ids=[...new Set(expertGroups(c).filter(g=>!groupConfirmed(g)).map(g=>g.person))];if(!ids.length)return S.toast('Các đóng góp hiện tại đã được xác nhận.','info');S.commit(()=>{ids.forEach(id=>S.notice(id,'Cần xác nhận đóng góp',`${c.id}: kiểm tra các ghi nhận theo đợt.`,{page:'case',id:c.id,tab:'work'}));updated(c,'Gửi yêu cầu xác nhận đóng góp',ids.join(', '));},'Đã thông báo chuyên gia. Bạn có thể lưu chờ và tiếp tục sau.');};
  S.actions['case-group-modal']=el=>{const c=get(el.dataset.case);if(!protect(c,'view')||who().role!=='expert')return;const list=expertGroups(c).filter(g=>g.person===who().id);S.modal('Xác nhận đóng góp của tôi',`<div class="stack">${list.map(g=>`<section class="card"><div class="card-body stack"><h3>Đợt ${g.round.number}</h3>${g.round.events.filter(e=>e.performedBy===who().id).map(e=>`<div class="source-card"><strong>${h(labels.event[e.type])}</strong><p>${h(e.content)}</p>${e.result?`<p>Kết quả: ${h(e.result)}</p>`:''}${e.rationale?`<p>Lý do: ${h(e.rationale)}</p>`:''}<p class="field-hint">Người nhập: ${h(S.person(e.enteredBy))} · ${h(S.fmtDate(e.recordedAt))}</p></div>`).join('')}${groupConfirmed(g)?badge('Đã xác nhận đúng phiên bản hiện tại','green'):`<div class="actions">${button('Xác nhận đúng nhóm nội dung','case-group-confirm','primary',`${cid(c)} data-round="${h(g.round.id)}"`)}${button('Yêu cầu sửa','case-group-changes','secondary',`${cid(c)} data-round="${h(g.round.id)}"`)}</div>`}</div></section>`).join('')||'<p>Chưa có ghi nhận nào về phần đóng góp của bạn.</p>'}</div>`,button('Đóng','close-modal','secondary'));};
  S.actions['case-group-confirm']=el=>{const c=get(el.dataset.case);if(!protect(c,'view')||who().role!=='expert')return;const g=expertGroups(c).find(g=>g.person===who().id&&g.round.id===el.dataset.round);if(!g)return;if(S.commit(()=>{c.confirmations ||= {};c.confirmations[`${g.round.id}:${who().id}`]={status:'confirmed',signature:g.signature,by:who().id,at:stamp()};S.notice(c.ownerId,'Đóng góp đã được xác nhận',`${S.person(who().id)} đã xác nhận đợt ${g.round.number} của ${c.id}.`,{page:'case',id:c.id,tab:c.workState==='ended'?'report':'work'});updated(c,'Xác nhận nhóm đóng góp',g.round.id);},'Đã xác nhận nhóm đóng góp của bạn.'))S.closeModal();};
  S.actions['case-group-changes']=el=>{const c=get(el.dataset.case);if(!protect(c,'view')||who().role!=='expert')return;S.modal('Yêu cầu sửa ghi nhận',`<form data-form="case-group-feedback" ${cid(c)} data-round="${h(el.dataset.round)}" class="stack">${errorBox()}${area('Nội dung cần sửa và lý do','feedback','','required')}<div class="modal-form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Hủy bỏ</button><button class="btn btn-primary" type="submit">Gửi yêu cầu sửa</button></div></form>`);};
  S.forms['case-group-feedback']=form=>{const c=get(form.dataset.case);if(!protect(c,'view')||who().role!=='expert')return;const g=expertGroups(c).find(g=>g.person===who().id&&g.round.id===form.dataset.round),feedback=String(new FormData(form).get('feedback')||'').trim();if(!g)return;if(!feedback)return canFail(form,'Nêu rõ nội dung cần sửa.');if(S.commit(()=>{c.confirmations ||= {};c.confirmations[`${g.round.id}:${who().id}`]={status:'changes',signature:g.signature,by:who().id,at:stamp(),feedback};if(c.report)c.reportState='changes';S.notice(c.ownerId,'Chuyên gia yêu cầu sửa ghi nhận',feedback,{page:'case',id:c.id,tab:'work'});updated(c,'Yêu cầu sửa đóng góp',feedback);},'Đã gửi yêu cầu sửa.'))S.closeModal();};

  function pmPanel(c) {
    if(c.type!=='PM')return '';const disabled=editable(c)?'':'disabled';
    return `<section class="card pm-checklist-card"><div class="card-head pm-checklist-head"><div><span class="badge-pm-tag">${icon('wrench')} BẢO DƯỠNG ĐỊNH KỲ</span><h2>Checklist bảo dưỡng</h2><p class="subtext">Ghi kết quả thực tế cho từng hạng mục theo mẫu chuẩn.</p></div>${badge('Mẫu PM nội bộ','blue')}</div><div class="card-body stack"><p class="source-meta">${h(c.pmTemplate?.id||'PM')} · phiên bản ${h(c.pmTemplate?.version||1)}. Mẫu được cấu hình theo máy; kết quả không tự lấy từ lịch.</p><div class="notice notice-info"><strong>Cách ghi:</strong> chọn Đạt, Không đạt hoặc Chưa thực hiện. Nếu Không đạt, ghi hiện tượng quan sát được rồi mở điều tra trong cùng hồ sơ.</div>${(c.pm||[]).map((x,i)=>`<div class="pm-item-card stack"><h3>${i+1}. ${h(x.label)}</h3><p class="field-hint">Tiêu chí: ${h(x.criterion||'Đối chiếu mẫu có hiệu lực.')}</p><div class="form-grid">${select('Kết quả kiểm tra','status',x.status,[['unperformed','Chưa thực hiện'],['pass','Đạt'],['fail','Không đạt']],`data-input="case-pm" ${cid(c)} data-item="${h(x.id)}" ${disabled}`)}${field(`Giá trị đo${x.unit?' ('+x.unit+')':''}`,'value',x.value,`data-input="case-pm" ${cid(c)} data-item="${h(x.id)}" ${disabled}`)}</div>${field('Bất thường / ghi chú','abnormality',x.abnormality,`data-input="case-pm" ${cid(c)} data-item="${h(x.id)}" ${disabled}`)}${x.status==='fail'?`<div class="notice notice-warning">Bất thường cần được điều tra trong hồ sơ này.${editable(c)?button(x.investigationEventId?'Đã mở điều tra':'Mở điều tra bất thường','case-pm-investigate','secondary',`${cid(c)} data-item="${h(x.id)}" ${x.investigationEventId?'disabled':''}`):''}</div>`:''}${x.performedBy?`<p class="field-hint">Ghi nhận bởi ${h(S.person(x.performedBy))} lúc ${h(S.fmtDate(x.performedAt))}</p>`:''}</div>`).join('')}</div></section>`;
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
    const r = activeRound(c);
    return `
    <div class="split-layout work-stage-layout">
      <div class="stack work-primary-column">
        ${c.workState === 'waiting' ? `
        <div class="notice notice-warning work-state-waiting-banner">
          <div class="notice-icon-wrap">${icon('alert')}</div>
          <div class="notice-content-wrap">
            <h2>Ca đang tạm dừng chờ xử lý tiếp</h2>
            <p>${h(c.waitingReason || 'Xem tóm tắt bàn giao ở đợt gần nhất.')}</p>
            <p class="subtext">Hồ sơ <strong>${h(c.id)}</strong> vẫn mở. Tiếp tục sẽ tạo đợt ${c.rounds.length + 1} và giữ nguyên nhật ký cũ.</p>
            ${owner(c) ? `
            <div class="actions" style="margin-top: 10px;">
              <button type="button" class="btn btn-primary" data-action="case-resume" ${cid(c)}>
                ${icon('refresh')}
                <span>Bắt đầu đợt tiếp theo</span>
              </button>
            </div>` : ''}
          </div>
        </div>` : ''}

        ${c.workState === 'ended' ? `
        <div class="notice notice-success work-state-ended-banner">
          <div class="notice-icon-wrap">${icon('checkcircle')}</div>
          <div class="notice-content-wrap">
            <strong>Công việc hiện trường đã kết thúc.</strong>
            <p>Tình trạng máy hiện tại: <strong>${h(labels.machine[c.machineState])}</strong>. Bước tiếp theo: hoàn tất hồ sơ báo cáo và xác nhận đóng góp của chuyên gia.</p>
            <div class="actions" style="margin-top: 10px;">
              <button type="button" class="btn btn-primary" data-action="case-tab" ${cid(c)} data-tab="report">
                <span>Chuyển sang Báo cáo tổng kết</span>
                ${icon('arrow')}
              </button>
            </div>
          </div>
        </div>` : ''}

        ${supportPanel(c)}
        ${pmPanel(c)}
        ${editable(c) && r ? noteForm(c) : ''}
        ${timeline(c)}
      </div>

      <aside class="stack work-sidebar-column">
        <section class="card round-status-card">
          <div class="card-head round-status-head">
            <div class="round-status-title-wrap">
              <span class="badge-round-indicator">${icon('clock')} THEO DÕI ĐỢT</span>
              <h2>${r ? `Đợt ${r.number}` : 'Theo dõi công việc'}</h2>
            </div>
            ${r ? badge(r.state === 'active' ? 'Đang thực hiện' : 'Đã kết thúc', r.state === 'active' ? 'blue' : 'neutral') : ''}
          </div>
          <div class="card-body stack">
            <div class="round-people-box">
              <div class="people-row">
                <span class="people-label">Phụ trách hồ sơ:</span>
                <span class="people-val person-owner">
                  ${icon('user')}
                  <strong>${h(S.person(c.ownerId))}</strong>
                </span>
              </div>
              <div class="people-row">
                <span class="people-label">Tham gia hiện trường:</span>
                <div class="participants-tags">
                  ${(c.participants || []).map(id => `
                  <span class="participant-tag">
                    ${icon('user')}
                    <span>${h(S.person(id))}</span>
                  </span>
                  `).join('')}
                </div>
              </div>
            </div>

            ${owner(c) && r ? `
            <div class="round-action-cta">
              <button type="button" class="btn btn-primary btn-round-outcome" data-action="case-outcome" ${cid(c)}>
                ${icon('check')}
                <span>Ghi kết quả & chọn bước tiếp</span>
              </button>
              <p class="field-hint">Kết quả được lưu thành mốc của đợt hiện tại. Chờ linh kiện hoặc chuyển giao không xóa các bước đã thực hiện.</p>
            </div>` : ''}
          </div>
        </section>

        ${groupPanel(c)}

        ${c.selectedSources?.length ? `
        <section class="card selected-sources-sidebar-card">
          <div class="card-head selected-sources-head">
            <div class="sources-head-left">
              <span class="badge-sources-icon">${icon('book')}</span>
              <h2>Căn cứ đã chọn tham khảo</h2>
            </div>
            <span class="badge badge-neutral">${c.selectedSources.length}</span>
          </div>
          <div class="card-body stack">
            ${c.selectedSources.map(x => {
              const k = S.getKnowledge(x.id, Number(x.version)) || (S.db.knowledge || []).find(item => item.id === x.id) || (S.db.cases || []).find(item => item.id === x.id);
              const title = k?.title || '';
              return `
            <div class="selected-source-item">
              <div class="source-item-header">
                <div class="source-title-line">
                  <span class="source-code-pill">${h(x.id)}</span>
                  ${title ? `<span class="source-sep">·</span><span class="source-title-text">${h(title)}</span>` : ''}
                </div>
                <span class="source-ver-tag">v${h(x.version)}</span>
              </div>
              <div class="actions source-item-actions">
                <button type="button" class="btn btn-ghost btn-xs" data-action="case-source-read" ${cid(c)} data-source="${h(x.id)}" data-version="${h(x.version)}">
                  ${icon('file')}
                  <span>Đọc nguồn</span>
                </button>
                ${editable(c) ? `
                <button type="button" class="btn btn-ghost btn-xs" data-action="case-source-feedback" ${cid(c)} data-source="${h(x.id)}" data-version="${h(x.version)}">
                  ${icon('edit')}
                  <span>Ghi kết quả áp dụng</span>
                </button>` : ''}
              </div>
              ${x.feedback ? `
              <div class="source-feedback-note">
                <span class="feedback-label">Phản hồi áp dụng:</span>
                <p>${h(x.feedback)}</p>
              </div>` : ''}
            </div>
            `;
            }).join('')}
          </div>
        </section>` : ''}
      </aside>
    </div>
    `;
  }
  S.actions['case-source-feedback']=el=>{const c=get(el.dataset.case);if(!protect(c,'edit'))return;S.modal('Ghi phản hồi trong hồ sơ',`<form data-form="case-source-feedback-save" ${cid(c)} data-source="${h(el.dataset.source)}" data-version="${h(el.dataset.version)}" class="stack">${errorBox()}${select('Mức áp dụng','application','reference',[['reference','Đang tham khảo, chưa thực hiện'],['partial','Đã áp dụng một phần'],['applied','Đã thực hiện theo hướng tham khảo'],['not-applicable','Không áp dụng được']])}${area('Điểm khác, phần đã làm và kết quả thực tế','feedback','','required')}<div class="modal-form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Hủy bỏ</button><button type="submit" class="btn btn-primary">Lưu phản hồi vào nhật ký</button></div></form>`);};
  S.forms['case-source-feedback-save']=form=>{const c=get(form.dataset.case);if(!protect(c,'edit'))return;const x=c.selectedSources.find(x=>x.id===form.dataset.source&&String(x.version)===form.dataset.version),f=new FormData(form),feedback=String(f.get('feedback')||'').trim();if(!x)return;if(!feedback)return canFail(form,'Ghi rõ phần áp dụng, điểm khác hoặc kết quả thực tế.');if(S.commit(()=>{x.feedback=feedback;x.application=String(f.get('application'));newEvent(c,{type:x.application==='reference'?'observation':'result',content:`Phản hồi nguồn ${x.id} v${x.version}: ${feedback}`,sourceId:x.id,sourceVersion:x.version});updated(c,'Ghi phản hồi nguồn',x.id);},'Đã lưu phản hồi; không tự thay đổi tình trạng máy.'))S.closeModal();};
  S.actions['case-resume']=el=>{const c=get(el.dataset.case);if(!protect(c)||c.workState!=='waiting'||activeRound(c))return;S.commit(()=>{c.rounds.push({id:S.uid('RD'),number:c.rounds.length+1,state:'active',startedAt:stamp(),events:[]});c.workState='active';c.waitingReason='';dirtyReport(c);updated(c,'Tiếp tục đợt xử lý',`Đợt ${c.rounds.length}`);},'Đã mở đợt mới trong cùng hồ sơ.');};
  S.actions['case-outcome']=el=>{
    const c=get(el.dataset.case);if(!protect(c)||!activeRound(c))return;const r=activeRound(c);const summary=r.events.map(e=>`${labels.event[e.type]}: ${e.content}${e.result?' — '+e.result:''}`).join('\n');
    S.modal('Kết quả đợt & bước tiếp theo',`<form data-form="case-outcome-save" ${cid(c)} class="stack">${errorBox()}${select('Tình trạng máy quan sát được','machineState',c.machineState,Object.entries(labels.machine))}${area('Căn cứ kiểm chứng / kết quả thực tế','evidence',c.resultEvidence,'required')}${select('Tiến độ tiếp theo','next','continue',[['continue','Tiếp tục điều tra trong đợt này'],['parts','Kết thúc đợt — chờ linh kiện'],['support','Kết thúc đợt — chờ hỗ trợ'],['handover','Kết thúc đợt — bàn giao'],['finish','Kết thúc công việc — chuyển tổng kết']])}<div class="notice notice-info">Tóm tắt được ghép từ nhật ký. Kiểm tra và bổ sung trước khi lưu.</div>${area('Tóm tắt đợt','summary',summary,'required rows="5"')}${area('Việc cần làm tiếp / lý do dừng','nextSteps','')}${field('Người / đơn vị nhận bàn giao (nếu bàn giao)','recipient','')}<details><summary>Kết thúc khi máy chưa được phục hồi</summary><div class="stack"><p class="field-hint">Chỉ ghi nhận khi đã có quyết định kết thúc công việc từ người có thẩm quyền tại nhà máy. Tài khoản bảo trì không tự cấp quyền quyết định.</p>${field('Người có thẩm quyền / chức trách','decisionBy','')}${field('Mã biên bản / quyết định bên ngoài','decisionRef','')}${area('Lý do kết thúc chưa khắc phục','decisionReason','')}<label class="check-line"><input name="decisionChecked" type="checkbox"> Tôi đã đối chiếu quyết định bên ngoài và ghi đúng nội dung.</label></div></details><div class="notice notice-warning">Chờ linh kiện hoặc hỗ trợ vẫn giữ hồ sơ mở. Máy phục hồi không tự chứng minh nguyên nhân gốc.</div><div class="modal-form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Hủy bỏ</button><button type="submit" class="btn btn-primary">Lưu kết quả & tiếp tục</button></div></form>`);
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
    const r = c.report, people = pendingReportPeople(c), mayEdit = owner(c) && c.reportState !== 'confirmed';
    if (!r) {
      return `
      <div class="report-init-hero card">
        <div class="card-body stack">
          <div class="report-init-badge-eyebrow">
            <span class="badge-report-tag">${icon('file')} GIAI ĐOẠN 4 · BÁO CÁO TỔNG KẾT</span>
          </div>
          <div class="report-init-header">
            <h2>Sẵn sàng tổng hợp báo cáo kỹ thuật ca</h2>
            <p class="subtext">Bản nháp được tổng hợp tự động từ diễn biến thực tế qua các đợt xử lý tại hiện trường. Toàn bộ mốc quan sát, số đo và kết quả kiểm chứng sẽ được bảo toàn nguyên trạng.</p>
          </div>
          <div class="report-init-metrics-strip">
            <div class="metric-pill">
              ${icon('clock')}
              <span>Tổng số đợt: <strong>${c.rounds.length} đợt</strong></span>
            </div>
            <div class="metric-pill">
              ${icon('check')}
              <span>Mốc ghi nhận: <strong>${events(c).length} mốc</strong></span>
            </div>
            <div class="metric-pill">
              <span>Tình trạng máy: <strong>${h(labels.machine[c.machineState])}</strong></span>
            </div>
          </div>
          <div class="report-init-action">
            ${owner(c) ? `
            <button type="button" class="btn btn-primary btn-generate-report" data-action="case-report-generate" ${cid(c)}>
              ${icon('file')}
              <span>Tạo nháp tổng kết từ nhật ký</span>
            </button>
            ` : `<p class="muted">Chỉ người phụ trách hồ sơ (<strong>${h(S.person(c.ownerId))}</strong>) có quyền tạo nháp báo cáo tổng kết.</p>`}
          </div>
        </div>
      </div>
      ${groupPanel(c)}
      `;
    }

    const attrs = `data-input="case-report-input" ${cid(c)} ${mayEdit ? '' : 'disabled'}`;
    const reportTone = { draft: 'amber', pending: 'blue', changes: 'red', confirmed: 'green' }[c.reportState] || 'neutral';

    return `
    <div class="split-layout report-stage-layout">
      <div class="stack report-primary-column">
        ${r.feedback ? `
        <div class="notice notice-warning report-alert-banner">
          <div class="alert-icon-wrap">${icon('alert')}</div>
          <div class="alert-content-wrap">
            <strong>Yêu cầu chỉnh sửa từ chuyên gia ${h(S.person(r.feedback.by))}</strong>
            <p>${h(r.feedback.text)}</p>
          </div>
        </div>` : ''}

        ${r.sourceChanged ? `
        <div class="notice notice-warning report-alert-banner">
          <div class="alert-icon-wrap">${icon('refresh')}</div>
          <div class="alert-content-wrap">
            <strong>Nhật ký hiện trường có thay đổi sau lần tổng hợp</strong>
            <p>Bối cảnh hoặc các mốc xử lý vừa được cập nhật thêm. Hãy bấm <em>“Cập nhật nháp từ nhật ký”</em> để đối chiếu và đồng bộ dữ liệu mới nhất trước khi chốt hồ sơ.</p>
          </div>
        </div>` : ''}

        <section class="card report-editor-card">
          <div class="card-head report-editor-head">
            <div class="report-head-title-wrap">
              <div class="report-badge-eyebrow">
                <span class="badge-report-tag">${icon('file')} BÁO CÁO TỔNG KẾT</span>
              </div>
              <h2>Hồ sơ kỹ thuật ca bảo trì</h2>
              <div class="report-meta-chips">
                <span class="badge-report-id">${h(r.id)}</span>
                <span class="badge-report-revision">Revision ${h(r.revision)}</span>
                <span class="badge badge-report-state badge-${reportTone}">${h(labels.report[c.reportState])}</span>
              </div>
            </div>
            ${saveLabel()}
          </div>

          <div class="card-body stack">
            <div class="report-form-section">
              <div class="section-title-line">
                <span class="section-num-badge">1</span>
                <h3>Diễn biến & Kết quả các đợt xử lý</h3>
              </div>
              <p class="field-hint">Mô tả đầy đủ quá trình điều tra, phương án can thiệp và tình trạng thực tế qua các đợt.</p>
              ${area('Diễn biến và kết quả mọi đợt', 'summary', r.summary, `${attrs} rows="8" placeholder="Nhập tóm tắt diễn biến xử lý..."`)}
            </div>

            <div class="report-form-section report-cause-section">
              <div class="section-title-line">
                <span class="section-num-badge">2</span>
                <h3>Phân tích nguyên nhân & Căn cứ kỹ thuật</h3>
              </div>
              <div class="report-cause-grid">
                ${select('Trạng thái nguyên nhân', 'causeStatus', r.causeStatus, [['unknown', 'Chưa xác định'], ['hypothesis', 'Còn là giả thuyết'], ['confirmed', 'Đã có bằng chứng xác nhận']], attrs)}
                ${area('Nguyên nhân / giả thuyết và bằng chứng liên quan', 'cause', r.cause, `${attrs} rows="3" placeholder="Ghi nhận định nguyên nhân và bằng chứng cụ thể..."`, 'Nếu đã xác nhận, ghi căn cứ kiểm tra. Máy phục hồi không tự chứng minh nguyên nhân.')}
              </div>
            </div>

            <div class="report-form-section">
              <div class="section-title-line">
                <span class="section-num-badge">3</span>
                <h3>Bài học kinh nghiệm & Giới hạn kỹ thuật</h3>
              </div>
              <div class="form-grid">
                ${area('Bài học / điểm cần theo dõi', 'lessons', r.lessons, `${attrs} rows="3" placeholder="Đúc kết kinh nghiệm cho các ca tương tự..."`)}
                ${area('Giới hạn và việc còn lại', 'limits', r.limits, `${attrs} rows="3" placeholder="Các việc cần theo dõi thêm hoặc chưa xử lý triệt để..."`)}
              </div>
            </div>

            ${r.correctionReason ? `
            <div class="report-correction-box">
              <div class="correction-head">
                ${icon('edit')}
                <strong>Lý do đính chính báo cáo:</strong>
              </div>
              <p>${h(r.correctionReason)}</p>
            </div>` : ''}

            ${c.externalClosureDecision ? `
            <div class="notice notice-warning report-closure-box">
              <div class="closure-head">
                ${icon('alert')}
                <strong>Kết thúc chưa khắc phục theo quyết định bên ngoài</strong>
              </div>
              <p class="closure-ref">Biên bản / Quyết định: <strong>${h(c.externalClosureDecision.reference)}</strong> · Người duyệt: <strong>${h(c.externalClosureDecision.by)}</strong></p>
              <p class="closure-reason">Lý do: ${h(c.externalClosureDecision.reason)}</p>
            </div>` : ''}

            ${mayEdit ? `
            <div class="report-editor-toolbar">
              <button type="button" class="btn btn-secondary btn-refresh-draft" data-action="case-report-generate" ${cid(c)}>
                ${icon('refresh')}
                <span>Cập nhật nháp từ nhật ký</span>
              </button>
              <button type="button" class="btn btn-secondary btn-request-confirm" data-action="case-report-request" ${cid(c)}>
                ${icon('users')}
                <span>Gửi / nhắc chuyên gia xác nhận</span>
              </button>
            </div>` : ''}

            ${r.versions?.length ? `
            <details class="context-details report-versions-accordion">
              <summary>Lịch sử ${r.versions.length} phiên bản đã lưu trước <span>(đối chiếu revision)</span></summary>
              <div class="versions-history-stack stack" style="margin-top: 14px;">
                ${r.versions.map(v => `
                <div class="source-card version-item-card">
                  <div class="version-item-header">
                    <span class="version-badge">Revision ${h(v.revision)}</span>
                    <span class="version-meta">${icon('clock')} ${h(S.fmtDate(v.savedAt))} · Lưu bởi <strong>${h(S.person(v.savedBy))}</strong></span>
                  </div>
                  <p class="version-summary-preview" style="white-space:pre-line">${h(v.summary)}</p>
                </div>
                `).join('')}
              </div>
            </details>` : ''}
          </div>
        </section>

        <!-- Dữ kiện nguồn của báo cáo -->
        <section class="card report-sources-card">
          <div class="card-head report-sources-head">
            <div class="sources-head-title-wrap">
              <span class="badge-sources-tag">${icon('book')} DỮ LIỆU GỐC HIỆN TRƯỜNG</span>
              <h2>Dữ kiện nguồn của báo cáo</h2>
            </div>
            <span class="badge badge-neutral">${c.rounds.length} đợt ghi nhận</span>
          </div>
          <div class="card-body stack">
            ${c.rounds.map(round => `
            <details class="context-details round-source-accordion" ${round.state === 'active' ? 'open' : ''}>
              <summary>
                <span>Đợt ${round.number} · <strong>${round.events.length} mốc ghi nhận</strong> (${round.state === 'active' ? 'Đang thực hiện' : 'Đã kết thúc'})</span>
              </summary>
              <div class="round-source-events-list stack" style="margin-top: 12px;">
                ${round.events.map(e => `
                <div class="source-event-mini-card">
                  <div class="source-event-mini-head">
                    <span class="badge badge-event-type badge-${{ observation: 'blue', check: 'green', hypothesis: 'purple', action: 'amber', result: 'emerald' }[e.type] || 'neutral'}">${labels.event[e.type] || e.type}</span>
                    <span class="source-event-id">${h(e.id)}</span>
                    <span class="source-event-time">${icon('clock')} ${h(S.fmtDate(e.performedAt))}</span>
                  </div>
                  <p class="source-event-content">${h(e.content)}</p>
                  ${e.result ? `<div class="source-event-res"><strong>Kết quả:</strong> ${h(e.result)}</div>` : ''}
                  <div class="source-event-author">Thực hiện: <strong>${h(S.person(e.performedBy))}</strong></div>
                </div>
                `).join('') || '<p class="muted">Chưa có ghi nhận trong đợt này.</p>'}
              </div>
            </details>
            `).join('')}
          </div>
        </section>
      </div>

      <!-- Cột phải (Sidebar 350px) -->
      <aside class="stack report-sidebar-column">
        <section class="card report-criteria-card">
          <div class="card-head report-criteria-head">
            <div class="criteria-head-title-wrap">
              <span class="badge-criteria-tag">${icon('checkcircle')} TIÊU CHUẨN ĐÓNG CA</span>
              <h2>Điều kiện chốt báo cáo</h2>
            </div>
          </div>
          <div class="card-body stack">
            <div class="report-criteria-list">
              <div class="criteria-item ${c.workState === 'ended' ? 'is-pass' : 'is-pending'}">
                <span class="criteria-icon">${c.workState === 'ended' ? icon('check') : icon('clock')}</span>
                <div class="criteria-info">
                  <strong>Công việc hiện trường</strong>
                  <span>${c.workState === 'ended' ? 'Đã kết thúc công việc' : 'Hiện trường còn đang mở'}</span>
                </div>
              </div>

              <div class="criteria-item ${!r.sourceChanged ? 'is-pass' : 'is-warning'}">
                <span class="criteria-icon">${!r.sourceChanged ? icon('check') : icon('alert')}</span>
                <div class="criteria-info">
                  <strong>Đối chiếu nhật ký</strong>
                  <span>${!r.sourceChanged ? 'Nháp đã khớp dữ kiện mới nhất' : 'Nhật ký đã đổi — cần cập nhật nháp'}</span>
                </div>
              </div>

              <div class="criteria-item ${!people.length ? 'is-pass' : 'is-pending'}">
                <span class="criteria-icon">${!people.length ? icon('check') : icon('users')}</span>
                <div class="criteria-info">
                  <strong>Xác nhận đóng góp</strong>
                  <span>${!people.length ? 'Đã đủ xác nhận từ các bên' : 'Chờ xác nhận: ' + people.map(S.person).join(', ')}</span>
                </div>
              </div>

              <div class="criteria-machine-status">
                <span class="criteria-machine-label">Tình trạng máy hiện tại:</span>
                <div class="criteria-machine-value">
                  <span class="status-indicator-dot ${c.machineState === 'restored' ? 'dot-restored' : c.machineState === 'unrestored' ? 'dot-unrestored' : 'dot-unverified'}"></span>
                  <strong>${h(labels.machine[c.machineState])}</strong>
                </div>
              </div>
            </div>

            <p class="field-hint criteria-legal-hint">Báo cáo chờ xác nhận không làm thay đổi tình trạng máy đã được ghi nhận.</p>

            <div class="report-sidebar-actions">
              ${owner(c) && c.reportState !== 'confirmed' ? `
              <button type="button" class="btn btn-primary btn-finalize-report" data-action="case-report-finalize" ${cid(c)}>
                ${icon('check')}
                <span>Kiểm tra & chốt báo cáo</span>
              </button>
              ` : ''}

              ${owner(c) && c.reportState === 'confirmed' ? `
              <div class="notice notice-success report-confirmed-success-notice">
                <div class="notice-icon-wrap">${icon('checkcircle')}</div>
                <div>
                  <strong>Báo cáo đã xác nhận chính thức</strong>
                  <p>Được lưu trữ vào lý lịch máy và sẵn sàng trích xuất tri thức.</p>
                </div>
              </div>
              <button type="button" class="btn btn-primary btn-propose-knowledge" data-action="case-propose" ${cid(c)}>
                ${icon('sparkles')}
                <span>Đề xuất tri thức từ hồ sơ</span>
              </button>
              <button type="button" class="btn btn-secondary btn-correct-report" data-action="case-report-correct" ${cid(c)}>
                ${icon('edit')}
                <span>Đính chính báo cáo</span>
              </button>
              <p class="field-hint">Đề xuất tri thức là bản lưu độc lập và cần kiểm duyệt theo quy chuẩn nhà máy.</p>
              ` : ''}

              ${who().role === 'expert' && c.reportState !== 'confirmed' && reportPeople(c).includes(who().id) ? `
              <button type="button" class="btn btn-primary btn-expert-confirm-report" data-action="case-report-confirm-open" ${cid(c)}>
                ${icon('check')}
                <span>Xác nhận phần của tôi trong báo cáo</span>
              </button>
              ` : ''}
            </div>
          </div>
        </section>

        ${groupPanel(c)}

        <section class="card hozendx-tile-card">
          <div class="card-head hozendx-head">
            <div class="hozendx-head-left">
              <span class="badge-hozendx-logo">MES</span>
              <h2>Tích hợp HozenDX</h2>
            </div>
            <span class="badge badge-neutral">Chưa đồng bộ</span>
          </div>
          <div class="card-body stack">
            <p class="hozendx-desc">Báo cáo được lưu cục bộ trên SmartMaint. Bản prototype chưa có kết nối hoặc quyền ghi thực tế lên HozenDX.</p>
            <p class="field-hint">Hồ sơ thiết bị hiện là nguồn tham chiếu chuẩn mô phỏng DENSO Manufacturing.</p>
          </div>
        </section>
      </aside>
    </div>
    `;
  }
  S.inputs['case-report-input']=el=>{const c=get(el.dataset.case);if(!protect(c)||!c.report||c.reportState==='confirmed'||c.report[el.name]===el.value)return;S.commit(()=>{c.report[el.name]=el.value;c.report.manualFields ||= {};c.report.manualFields[el.name]=true;if(c.reportState==='pending')c.reportState='changes';c.updatedAt=stamp();},null,false);};
  S.actions['case-report-generate']=el=>{
    const c=get(el.dataset.case);if(!protect(c)||c.reportState==='confirmed')return;const suggestion=buildReport(c);suggestedReports[c.id]={fields:suggestion,snapshot:sourceSnapshot(c)};
    S.modal(c.report?'Đối chiếu nháp mới với phần đã sửa':'Nháp tổng kết từ nhật ký',`<form data-form="case-report-apply" ${cid(c)} class="stack">${errorBox()}<div class="notice notice-info">Bản nháp chỉ tổng hợp dữ kiện đã ghi. Chọn phần muốn áp dụng; nội dung đã sửa được giữ nguyên.</div>${[['summary','Diễn biến và kết quả'],['cause','Nguyên nhân'],['lessons','Bài học'],['limits','Giới hạn']].map(([k,label])=>`<section class="source-card stack"><label class="check-line"><input type="checkbox" name="apply" value="${k}" ${!c.report||!c.report.manualFields?.[k]?'checked':''}> Áp dụng: ${label}</label>${c.report?.manualFields?.[k]?`<div class="notice notice-warning">Phần này đã được người dùng chỉnh sửa. Mặc định giữ bản hiện tại.</div><details><summary>Xem bản đang sửa</summary><p style="white-space:pre-line">${h(c.report[k])}</p></details>`:''}<p style="white-space:pre-line">${h(suggestion[k]||'Chưa xác định; cần con người bổ sung căn cứ.')}</p></section>`).join('')}<label class="check-line"><input type="checkbox" name="reviewed" required> Tôi đã đối chiếu nháp với dữ kiện hiện tại; phần không chọn giữ nguyên.</label><div class="modal-form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Hủy bỏ</button><button type="submit" class="btn btn-primary">Lưu nháp đã chọn</button></div></form>`);
  };
  S.forms['case-report-apply']=form=>{
    const c=get(form.dataset.case);if(!protect(c)||c.reportState==='confirmed')return;const suggestion=suggestedReports[c.id],f=new FormData(form);if(!suggestion||!f.has('reviewed'))return canFail(form,'Kiểm tra bản gợi ý và xác nhận đã đối chiếu.');if(suggestion.snapshot!==sourceSnapshot(c))return canFail(form,'Nhật ký đã thay đổi trong lúc xem nháp. Đóng hộp thoại và tạo nháp lại.');
    if(S.commit(()=>{if(!c.report)c.report=makeReport(c,{summary:'',cause:'',causeStatus:'unknown',lessons:'',limits:''});else{c.report.versions.push({revision:c.report.revision,summary:c.report.summary,cause:c.report.cause,causeStatus:c.report.causeStatus,lessons:c.report.lessons,limits:c.report.limits,savedBy:who().id,savedAt:stamp()});c.report.revision++;}f.getAll('apply').forEach(k=>{if(Object.hasOwn(suggestion.fields,k)){c.report[k]=suggestion.fields[k];c.report.manualFields[k]=false;if(k==='cause')c.report.causeStatus='unknown';}});c.report.snapshot=suggestion.snapshot;c.report.sourceChanged=false;c.report.generatedAt=stamp();c.reportState='draft';updated(c,'Lưu nháp báo cáo',`Revision ${c.report.revision}`);},'Đã lưu nháp. Chưa chốt công việc hoặc báo cáo.')){delete suggestedReports[c.id];S.closeModal();}
  };
  S.actions['case-report-request']=el=>{const c=get(el.dataset.case);if(!protect(c)||!c.report||c.reportState==='confirmed')return;const ids=pendingReportPeople(c);if(!ids.length)return S.toast('Không còn xác nhận chuyên gia cần bổ sung. Người phụ trách có thể kiểm tra điều kiện chốt.','info');S.commit(()=>{c.reportState='pending';ids.forEach(id=>S.notice(id,'Báo cáo chờ xác nhận đóng góp',`${c.id}: xem phần ghi nhận và nội dung báo cáo liên quan.`,{page:'case',id:c.id,tab:'report'}));updated(c,'Gửi xác nhận báo cáo');},'Đã gửi yêu cầu. Có thể rời hồ sơ và tiếp tục khi có phản hồi.');};
  S.actions['case-report-confirm-open']=el=>{const c=get(el.dataset.case);if(!protect(c,'view')||who().role!=='expert'||!reportPeople(c).includes(who().id)||!c.report||c.reportState==='confirmed')return;S.modal('Xác nhận đóng góp trong báo cáo',`<div class="stack"><p>Kiểm tra các ghi nhận của bạn và cách chúng được thể hiện trong báo cáo hiện tại.</p>${expertGroups(c).filter(g=>g.person===who().id).map(g=>`<section class="source-card"><h3>Đợt ${g.round.number}</h3>${g.round.events.filter(e=>e.performedBy===who().id).map(e=>`<p>${h(e.content)}${e.result?` — ${h(e.result)}`:''}</p>`).join('')}</section>`).join('')}<details open><summary>Bản báo cáo cần xác nhận · revision ${c.report.revision}</summary><p style="white-space:pre-line">${h(c.report.summary)}</p><p><strong>Nguyên nhân:</strong> ${h(c.report.cause||'Chưa xác định')}</p><p><strong>Bài học:</strong> ${h(c.report.lessons)}</p><p><strong>Giới hạn:</strong> ${h(c.report.limits)}</p></details><div class="actions">${button('Xác nhận đúng phần đóng góp của tôi','case-report-confirm','primary',cid(c))}${button('Yêu cầu sửa báo cáo','case-report-changes','secondary',cid(c))}</div></div>`,button('Đóng','close-modal','secondary'));};
  S.actions['case-report-confirm']=el=>{const c=get(el.dataset.case);if(!protect(c,'view')||who().role!=='expert'||!reportPeople(c).includes(who().id)||!c.report||c.reportState==='confirmed')return;if(S.commit(()=>{c.confirmations ||= {};expertGroups(c).filter(g=>g.person===who().id).forEach(g=>{c.confirmations[`${g.round.id}:${who().id}`]={status:'confirmed',signature:g.signature,by:who().id,at:stamp()};});c.report.confirmations ||= {};c.report.confirmations[who().id]={signature:reportSignature(c),at:stamp(),revision:c.report.revision};S.notice(c.ownerId,'Chuyên gia đã xác nhận báo cáo',`${S.person(who().id)} đã xác nhận phần đóng góp trong ${c.id}.`,{page:'case',id:c.id,tab:'report'});updated(c,'Xác nhận đóng góp báo cáo');},'Đã xác nhận phần đóng góp. Người phụ trách sẽ chốt báo cáo.'))S.closeModal();};
  S.actions['case-report-changes']=el=>{const c=get(el.dataset.case);if(!protect(c,'view')||who().role!=='expert'||!reportPeople(c).includes(who().id)||c.reportState==='confirmed')return;S.modal('Yêu cầu sửa báo cáo',`<form data-form="case-report-feedback" ${cid(c)} class="stack">${errorBox()}${area('Phần cần sửa và lý do','feedback','','required')}<div class="modal-form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Hủy bỏ</button><button class="btn btn-primary" type="submit">Gửi phản hồi</button></div></form>`);};
  S.forms['case-report-feedback']=form=>{const c=get(form.dataset.case);if(!protect(c,'view')||who().role!=='expert'||!reportPeople(c).includes(who().id)||c.reportState==='confirmed')return;const feedback=String(new FormData(form).get('feedback')||'').trim();if(!feedback)return canFail(form,'Ghi rõ phần cần sửa.');if(S.commit(()=>{c.reportState='changes';c.report.feedback={by:who().id,at:stamp(),text:feedback};delete c.report.confirmations[who().id];c.report.manualFields.reviewRequested=true;S.notice(c.ownerId,'Chuyên gia yêu cầu sửa báo cáo',feedback,{page:'case',id:c.id,tab:'report'});updated(c,'Yêu cầu sửa báo cáo',feedback);},'Đã gửi phản hồi cho người phụ trách.'))S.closeModal();};
  S.actions['case-report-finalize']=el=>{
    const c=get(el.dataset.case);if(!protect(c)||!c.report||c.reportState==='confirmed')return;const pending=pendingReportPeople(c);
    if(c.workState!=='ended')return S.toast('Công việc còn mở. Hãy lưu kết quả và kết thúc công việc trước khi chốt báo cáo.','warning');
    if(c.report.sourceChanged)return S.toast('Nhật ký đã thay đổi. Cần cập nhật và đối chiếu nháp báo cáo.','warning');
    if(!c.report.summary.trim())return S.toast('Báo cáo chưa có diễn biến và kết quả.','warning');
    if(c.report.causeStatus==='confirmed'&&!c.report.cause.trim())return S.toast('Nguyên nhân được xác nhận cần mô tả kèm căn cứ.','warning');
    if(pending.length){S.toast(`Chờ xác nhận của ${pending.map(S.person).join(', ')}. Bạn có thể gửi nhắc và lưu chờ.`,'warning');return;}
    S.modal('Xác nhận lưu báo cáo cuối',`<form data-form="case-report-close" ${cid(c)} class="stack">${errorBox()}<p><strong>${h(c.report.id)} · revision ${c.report.revision}</strong></p><p>Máy: ${h(labels.machine[c.machineState])}. Công việc: ${h(labels.work[c.workState])}.</p><p>Báo cáo được giữ trong lịch sử. Đề xuất tri thức là bước riêng và cần người duyệt độc lập.</p><label class="check-line"><input name="checked" type="checkbox" required> Tôi đã kiểm tra diễn biến, kết quả, căn cứ và các phần đóng góp.</label><div class="modal-form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Hủy bỏ</button><button class="btn btn-primary" type="submit">Chốt báo cáo</button></div></form>`);
  };
  S.forms['case-report-close']=form=>{const c=get(form.dataset.case);if(!protect(c)||!c.report||c.reportState==='confirmed')return;if(c.workState!=='ended'||c.report.sourceChanged||pendingReportPeople(c).length)return canFail(form,'Điều kiện chốt đã thay đổi. Kiểm tra lại báo cáo và các xác nhận.');if(!new FormData(form).has('checked'))return canFail(form,'Cần xác nhận đã kiểm tra nội dung.');if(S.commit(()=>{c.reportState='confirmed';c.report.confirmedAt=stamp();c.report.confirmedBy=who().id;c.report.confirmedSnapshot=structuredClone({summary:c.report.summary,cause:c.report.cause,causeStatus:c.report.causeStatus,lessons:c.report.lessons,limits:c.report.limits});updated(c,'Chốt báo cáo',`${c.report.id} revision ${c.report.revision}`);},'Đã xác nhận báo cáo và giữ trong lịch sử máy.'))S.closeModal();};
  S.actions['case-report-correct']=el=>{const c=get(el.dataset.case);if(!protect(c)||c.reportState!=='confirmed')return;S.modal('Tạo bản đính chính báo cáo',`<form data-form="case-report-correction" ${cid(c)} class="stack">${errorBox()}${area('Lý do đính chính','reason','','required')}<p class="field-hint">Bản đã xác nhận sẽ được giữ lại. Bản sửa cần kiểm tra và xác nhận lại phần thay đổi.</p><div class="modal-form-actions"><button type="button" class="btn btn-secondary" data-action="close-modal">Hủy bỏ</button><button class="btn btn-primary" type="submit">Tạo bản đính chính</button></div></form>`);};
  S.forms['case-report-correction']=form=>{const c=get(form.dataset.case);if(!protect(c)||c.reportState!=='confirmed')return;const reason=String(new FormData(form).get('reason')||'').trim();if(!reason)return canFail(form,'Ghi lý do đính chính.');if(S.commit(()=>{c.report.versions.push({revision:c.report.revision,...c.report.confirmedSnapshot,savedAt:c.report.confirmedAt,savedBy:c.report.confirmedBy,confirmed:true});c.report.revision++;c.report.correctionReason=reason;c.reportState='draft';updated(c,'Mở bản đính chính báo cáo',reason);},'Đã giữ bản chính thức và mở bản đính chính.'))S.closeModal();};
  S.actions['case-propose']=el=>{const c=get(el.dataset.case);if(!protect(c)||c.reportState!=='confirmed')return;if(typeof S.createCaseProposal!=='function')return S.toast('Chức năng đề xuất tri thức chưa sẵn sàng. Báo cáo vẫn được giữ.','warning');S.createCaseProposal(c);};
})();
