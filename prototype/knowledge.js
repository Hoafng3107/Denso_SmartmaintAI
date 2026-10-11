(function () {
  'use strict';
  const S = window.SM;
  const e = S.escape;
  const icon = S.icon;
  const clone = value => JSON.parse(JSON.stringify(value));
  const statuses = { draft: ['Nháp', 'neutral'], pending: ['Chờ kiểm duyệt', 'amber'], changes: ['Cần bổ sung', 'amber'], rejected: ['Đã từ chối', 'red'], published: ['Đã duyệt · Có thể tra cứu', 'green'], withdrawn: ['Đã lưu trữ do trùng', 'neutral'] };
  const modes = { new: 'Tri thức mới', update: 'Bổ sung phiên bản đã có', link: 'Liên kết case với tri thức đã có' };
  const fields = [
    ['symptom', 'Dấu hiệu / vấn đề', 'Hiện tượng quan sát được, Alarm, bộ phận và tần suất.'],
    ['context', 'Điều kiện phát sinh', 'Chế độ máy, model sản phẩm, line, tốc độ, ca và môi trường liên quan.'],
    ['checks', 'Kiểm tra và căn cứ lựa chọn', 'Đã kiểm tra gì, thấy gì, vì sao ưu tiên hoặc đổi hướng kiểm tra?'],
    ['solution', 'Cách xử lý / bài học', 'Việc đã thực hiện và trình tự; giữ cả hướng thử chưa hiệu quả nếu có.'],
    ['result', 'Kết quả và cách kiểm chứng', 'Kết quả quan sát, tiêu chí kiểm chứng, phần chưa đạt hoặc còn chờ.'],
    ['cause', 'Nguyên nhân / giả thuyết', 'Phân biệt điều đã xác nhận với nhận định chưa được kiểm chứng.'],
    ['evidence', 'Bằng chứng và nguồn', 'Mã hồ sơ, ghi nhận, kết quả đo hoặc tài liệu làm căn cứ.'],
    ['safety', 'An toàn và quy trình tham chiếu', 'Nêu mã/phiên bản quy trình phù hợp cần xác minh trước thao tác.'],
    ['limits', 'Điều kiện áp dụng và giới hạn', 'Áp dụng khi nào, khác biệt nào cần đánh giá, khi nào cần chuyên gia?']
  ];
  const fiveM = ['Con người', 'Máy', 'Vật liệu / sản phẩm', 'Phương pháp', 'Đo lường / kiểm tra', 'Môi trường'];
  const familyOptions = ['Vision', 'CNC', 'Máy ép'];
  const labelMap = { 'tiêu đề': 'title', 'loại máy': 'family', 'dấu hiệu': 'symptom', 'điều kiện': 'context', 'kiểm tra': 'checks', 'xử lý': 'solution', 'kết quả': 'result', 'nguyên nhân': 'cause', 'bằng chứng': 'evidence', 'an toàn': 'safety', 'giới hạn': 'limits' };
  const sample = 'Tiêu đề: Vision — giữ nguyên điều kiện khi so sánh ảnh NG\nLoại máy: Vision\nDấu hiệu: Camera không nhận sản phẩm; NG tăng ở model sản phẩm P-A (dữ liệu demo).\nĐiều kiện: Máy VIS-01, line L1; so sánh cùng model sản phẩm, chế độ và ánh sáng. Chưa kiểm tra ảnh hưởng của tốc độ.\nKiểm tra: Đối chiếu ảnh và điều kiện trước / sau khi thay model; ghi riêng chất lượng ảnh và tín hiệu nhận sản phẩm. Chọn kiểm tra này để phân biệt thay đổi sản phẩm với thay đổi cấu hình máy.\nXử lý: Lưu ảnh và thông số hiện trạng; đối chiếu hướng xử lý đã duyệt với người có thẩm quyền. Không suy ra cần thay camera chỉ từ hiện tượng NG.\nKết quả: Bài học kinh nghiệm, chưa có lần kiểm chứng mới; không ghi nhận máy đã phục hồi.\nNguyên nhân: Chưa xác định; cần kiểm chứng từng giả thuyết theo điều kiện thực tế.\nBằng chứng: Tình huống mô phỏng, không phải biên bản sửa chữa thực tế của DENSO.\nAn toàn: Xác minh SOP-VIS-01 và phiên bản đang có hiệu lực trước thao tác. Mã quy trình này chỉ dùng trong demo.\nGiới hạn: Chỉ tham khảo cho Vision với điều kiện phù hợp; thay model hoặc điều kiện ánh sáng cần đối chiếu lại. Chưa đủ bằng chứng để suy rộng sang mọi máy.';
  let libraryFilter = { query: '', family: 'all', kind: 'all' };
  let proposalFilter = 'all';
  let reviewFilter = 'pending';

  function current() { return S.db.proposals.find(p => p.id === S.ui.id); }
  function status(p) { const x = statuses[p.status] || statuses.draft; return S.badge(x[0], x[1]); }
  function editable(p) { return p && p.authorId === S.user().id && ['draft', 'changes'].includes(p.status); }
  function contributorIds(p) { return (p.contributors || []).map(x => typeof x === 'string' ? x : x.id || x.userId).filter(Boolean); }
  function independent(p) { return p.authorId !== S.user().id && !contributorIds(p).includes(S.user().id); }
  function accessible(p) { return p && (S.user().role === 'lead' || p.authorId === S.user().id || contributorIds(p).includes(S.user().id)); }
  function proposalVersion(p) { return Number(p.version || 1); }
  function addHistory(p, type, detail, snapshot) {
    p.history = p.history || [];
    p.history.push({ id: S.uid('PH'), type, detail, actorId: S.user().id, at: S.now(), version: p.version, ...(snapshot ? { snapshot: clone(snapshot) } : {}) });
  }
  function stamp(p, reason) {
    p.editRevision = Number(p.editRevision || 0) + 1;
    if (p.comparison) p.comparison.stale = true;
    p.updatedAt = S.now();
    p.authorConfirmed = false;
    p.updateCompleteConfirmed = false;
    if (reason) addHistory(p, 'edit', reason);
  }
  function inputAttrs(p, key) { return 'data-input="k-edit" data-id="' + e(p.id) + '" data-key="' + e(key) + '"'; }
  function area(label, key, value, p, hint, rows) { return S.area(label, key, value || '', { hint, rows: rows || 3, attrs: inputAttrs(p, key) }); }
  function field(label, key, value, p, hint) { return S.field(label, key, value || '', { hint, attrs: inputAttrs(p, key) }); }
  function select(label, key, value, options, p, hint) {
    return '<label class="field"><span class="field-label">' + e(label) + '</span><select class="select" name="' + e(key) + '" ' + inputAttrs(p, key) + '>' + options.map(o => '<option value="' + e(o[0]) + '"' + (value === o[0] ? ' selected' : '') + '>' + e(o[1]) + '</option>').join('') + '</select>' + (hint ? '<span class="field-hint">' + e(hint) + '</span>' : '') + '</label>';
  }
  function btn(text, action, style, attrs) { return S.button(text, action, style || 'secondary', attrs || ''); }
  function sourceButton(id, version, label) { return btn(label || 'Đọc nguồn', 'k-source', 'ghost', 'data-id="' + e(id) + '" data-version="' + e(version || '') + '"'); }
  function pageHead(eyebrow, title, description, action) {
    const heading = title || eyebrow;
    const act = action || (typeof description === 'string' && description.includes('<button') ? description : '') || '';
    return '<div class="page-head"><h1 id="page-title">' + e(heading) + '</h1>' + (act ? '<div class="actions">' + act + '</div>' : '') + '</div>';
  }
  function preserved(text) { return '<div style="white-space:pre-wrap;overflow-wrap:anywhere">' + e(text || 'Chưa có thông tin') + '</div>'; }
  function contentView(content) {
    const c = content || {};
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
    return `
      <div class="modal-content-view">
        ${fields.map(([key, label, desc]) => {
          const val = c[key];
          const tone = fieldTones[key] || '';
          const ic = fieldIcons[key] || 'file';
          return `
            <section class="modal-content-section ${tone}">
              <div class="modal-section-header">
                <span class="modal-section-icon">${icon(ic)}</span>
                <div class="modal-section-title-wrap">
                  <h3 class="modal-section-title">${e(label)}</h3>
                  <span class="modal-section-hint">${e(desc)}</span>
                </div>
              </div>
              <div class="modal-section-body">
                ${val ? `<div class="modal-section-text">${e(val)}</div>` : `<span class="empty-field-text">Chưa có thông tin ghi nhận.</span>`}
              </div>
            </section>
          `;
        }).join('')}
      </div>
    `;
  }
  function timeline(p) {
    const history = (p.history || []).slice().reverse();
    if (!history.length) {
      return '<div class="empty-timeline-hint">Chưa có lịch sử ghi nhận.</div>';
    }
    const typeTone = {
      draft: 'neutral',
      structure: 'blue',
      edit: 'slate',
      compare: 'purple',
      submit: 'amber',
      changes: 'orange',
      published: 'green',
      withdraw: 'red'
    };
    const typeLabels = {
      draft: 'Bản nháp ban đầu',
      structure: 'Trích xuất AI',
      edit: 'Cập nhật nội dung',
      compare: 'Đối chiếu tri thức',
      submit: 'Gửi kiểm duyệt',
      changes: 'Yêu cầu bổ sung',
      published: 'Đã phê duyệt',
      withdraw: 'Đã thu hồi'
    };
    return '<div class="proposal-timeline">' + history.map((h, idx) => {
      const isLast = idx === history.length - 1;
      const tone = typeTone[h.type] || 'blue';
      const label = typeLabels[h.type] || 'Ghi nhận';
      return `
        <div class="proposal-timeline-item ${isLast ? 'is-last' : ''}">
          <div class="proposal-timeline-rail">
            <span class="proposal-timeline-dot dot--${tone}"></span>
            ${!isLast ? '<span class="proposal-timeline-line"></span>' : ''}
          </div>
          <div class="proposal-timeline-card">
            <div class="proposal-timeline-header">
              <span class="proposal-timeline-badge badge--${tone}">${label}</span>
              <span class="proposal-timeline-version">Bản ${e(h.version || 1)}</span>
            </div>
            <p class="proposal-timeline-title">${e(h.detail || h.type)}</p>
            <div class="proposal-timeline-meta">
              <span class="meta-actor">${icon('user')} ${e(S.person(h.actorId))}</span>
              <span class="meta-sep">·</span>
              <span class="meta-time">${icon('clock')} ${e(S.fmtDate(h.at))}</span>
            </div>
          </div>
        </div>
      `;
    }).join('') + '</div>';
  }
  function parseRaw(raw) {
    const result = { content: {} };
    let activeKey = null;
    for (const line of String(raw || '').split(/\r?\n/)) {
      const i = line.indexOf(':');
      const key = i >= 0 ? labelMap[line.slice(0, i).trim().toLocaleLowerCase('vi')] : null;
      if (key) { activeKey = key; if (key === 'title' || key === 'family') result[key] = line.slice(i + 1).trim(); else result.content[key] = line.slice(i + 1).trim(); }
      else if (activeKey && line.trim()) { if (activeKey === 'title' || activeKey === 'family') result[activeKey] += '\n' + line; else result.content[activeKey] += '\n' + line; }
    }
    return result;
  }
  function baseProposal(authorId, origin) {
    return { id: S.uid('DP'), title: '', authorId, contributors: [], origin: origin || 'expert', caseId: null, status: 'draft', content: {}, family: '', mode: 'new', targetId: '', targetVersion: null, feedback: '', version: 1, rawText: '', rationale: '', response: '', causeStatus: 'unknown', authorConfirmed: false, comparison: null, contextDetails: {}, changes5m: {}, history: [], createdAt: S.now(), updatedAt: S.now() };
  }
  function issues(p) {
    const out = [];
    if (!p.title.trim()) out.push('Tiêu đề');
    if (!p.family) out.push('Loại máy');
    for (const [key, label] of fields) if (!String((p.content || {})[key] || '').trim()) out.push(label + ' (hoặc ghi lý do chưa rõ / không áp dụng)');
    if (p.causeStatus === 'confirmed' && !(p.content.evidence || '').trim()) out.push('Bằng chứng xác nhận nguyên nhân');
    return out;
  }
  function normalize(value) { return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/đ/g, 'd').replace(/\s+/g, ' ').trim(); }
  function tokens(value) { return new Set(normalize(value).split(/[^a-z0-9]+/).filter(x => x.length > 2)); }
  function candidates(p) {
    const pt = tokens([p.title, ...Object.values(p.content || {})].join(' '));
    return S.db.knowledge.filter(k => k.status === 'published').map(k => {
      const kt = tokens([k.title, ...Object.values(k.content || {})].join(' '));
      let shared = 0; pt.forEach(t => { if (kt.has(t)) shared++; });
      return { k, rank: (k.id === p.targetId ? 1000 : 0) + (normalize(k.family) === normalize(p.family) ? 100 : 0) + shared };
    }).filter(x => normalize(x.k.family) === normalize(p.family) || x.rank > 6).sort((a, b) => b.rank - a.rank).slice(0, 3).map(x => ({ id: x.k.id, version: x.k.version }));
  }
  function hasCurrentComparison(p) { return p.comparison && !p.comparison.stale && p.comparison.version === p.version && p.comparison.sources.every(s => { const k = S.db.knowledge.find(k => k.id === s.id); return k && k.status === 'published' && k.version === s.version; }); }
  function caseSourceCurrent(p) {
    if (p.origin !== 'case') return true;
    const c = S.db.cases.find(x => x.id === p.caseId);
    return !!(c && c.reportState === 'confirmed' && p.reportSnapshot && c.report?.id === p.reportSnapshot.id && c.report?.revision === p.reportSnapshot.revision && c.report?.confirmedAt === p.reportSnapshot.confirmedAt);
  }
  function compareView(p) {
    if (!p.comparison) {
      return `
        <div class="card compare-empty-card">
          <div class="card-body compare-empty-body">
            <div class="compare-empty-icon">${icon('spark')}</div>
            <h3>Chưa thực hiện đối chiếu kho tri thức</h3>
            <p>Hoàn thiện và xác nhận biểu mẫu ở Bước 2, sau đó đối chiếu với các nguồn đã duyệt để phát hiện điểm trùng hoặc bổ sung.</p>
            <button type="button" class="btn btn-primary" data-action="k-compare" data-id="${e(p.id)}">
              ${icon('spark')}
              <span>Đối chiếu kho tri thức</span>
            </button>
          </div>
        </div>
      `;
    }

    const hasCurrent = hasCurrentComparison(p);
    return `
      <div class="card proposal-step-card proposal-compare-card">
        <div class="card-head proposal-step-card-head">
          <div class="step-card-head-left">
            <span class="step-tag-pill">MỤC 3 · MA TRẬN ĐỐI CHIẾU TRI THỨC</span>
            <h2 class="step-card-title">Đối chiếu với tri thức đã xuất bản</h2>
            <p class="subtext">Đối chiếu theo nhóm máy <strong>${e(p.family || '')}</strong> và từ khóa kỹ thuật. Kết quả khác cách ghi cần được đọc trực tiếp trong nguồn gốc.</p>
          </div>
          <div class="step-card-head-right">
            <span class="badge ${hasCurrent ? 'badge-success' : 'badge-warning'}">
              ${hasCurrent ? 'Đã đối chiếu bản hiện tại' : 'Cần đối chiếu lại'}
            </span>
          </div>
        </div>

        <div class="card-body stack">
          ${!hasCurrent ? `
            <div class="notice notice-warning" role="status">
              <strong>Bản nháp hoặc nguồn tham khảo đã thay đổi.</strong>
              <p>Cần kiểm tra lại nội dung và đối chiếu lại trước khi gửi kiểm duyệt.</p>
            </div>
          ` : ''}

          ${p.comparison.sources.length ? p.comparison.sources.map(s => {
            const k = S.getKnowledge(s.id, s.version);
            if (!k) return `<div class="notice notice-warning">Nguồn ${e(s.id)} không còn khả dụng trong kho. Hãy đối chiếu lại.</div>`;
            return `
              <article class="compare-source-card">
                <div class="compare-source-head">
                  <div class="source-head-info">
                    <div class="source-head-badges">
                      <span class="source-id-badge mono">${e(k.id)} · v${e(k.version)}</span>
                      <span class="source-family-badge">${e(k.family)}</span>
                    </div>
                    <h3 class="source-card-title">${e(k.title)}</h3>
                    <div class="source-author-line">
                      <span>Tác giả: <strong>${e(S.person(k.authorId))}</strong></span>
                      <span class="separator">·</span>
                      <span>Duyệt: <strong>${e(S.person(k.reviewerId))}</strong></span>
                    </div>
                  </div>
                  <div class="source-head-action">
                    ${sourceButton(k.id, k.version, 'Đọc toàn văn')}
                  </div>
                </div>

                <div class="table-wrap compare-table-wrap">
                  <table class="data-table compare-table">
                    <thead>
                      <tr>
                        <th style="width: 190px;">Tiêu chí SOP</th>
                        <th>Đề xuất của bạn</th>
                        <th>Nguồn đã duyệt (${e(k.id)})</th>
                        <th style="width: 175px;">Đối chiếu AI</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${fields.map(([key, label]) => {
                        const a = (p.content || {})[key], b = (k.content || {})[key];
                        const unresolved = value => !value || /^(chua (xac dinh|biet|ro|co thong tin|du du kien)|khong co du lieu)/.test(normalize(value));
                        const kind = unresolved(a) || unresolved(b) ? ['Chưa đủ dữ liệu', 'amber'] : normalize(a) === normalize(b) ? ['Cùng nội dung ghi', 'green'] : ['Khác cách ghi · cần đọc', 'blue'];
                        const excerpt = value => value && value.length > 180 ? value.slice(0, 177) + '…' : value;
                        return `
                          <tr>
                            <th scope="row" class="compare-row-label">${e(label)}</th>
                            <td class="compare-cell cell-proposed">${preserved(excerpt(a))}</td>
                            <td class="compare-cell cell-source">${preserved(excerpt(b))}</td>
                            <td class="compare-cell cell-status">${S.badge(kind[0], kind[1])}</td>
                          </tr>
                        `;
                      }).join('')}
                    </tbody>
                  </table>
                </div>
              </article>
            `;
          }).join('') : `
            <div class="notice notice-warning">
              Chưa tìm thấy nguồn phù hợp trong kho hiện có. Kết quả này không chứng minh nội dung hoàn toàn mới.
            </div>
          `}
        </div>
      </div>
    `;
  }

  function metaCard(p) {
    const isCase = p.origin === 'case';
    return `
      <div class="card proposal-meta-card">
        <div class="card-head proposal-meta-head">
          <div class="meta-head-badge-row">
            <span class="meta-head-tag">AUDIT TRAIL · TRUY VẾT DỮ KIỆN</span>
          </div>
          <h3 class="section-title">Dấu vết đóng góp</h3>
        </div>
        <div class="card-body stack">
          <dl class="kv-list proposal-kv-list">
            <dt>Mã đề xuất</dt>
            <dd><span class="badge-proposal-id mono">${e(p.id)}</span></dd>
            <dt>Tác giả</dt>
            <dd>
              <span class="proposal-author-chip">
                ${icon('user')}
                <strong>${e(S.person(p.authorId))}</strong>
              </span>
            </dd>
            <dt>Nguồn</dt>
            <dd>
              <span class="proposal-source-chip ${isCase ? 'source-case' : 'source-expert'}">
                ${isCase ? icon('file') : icon('spark')}
                <span>${isCase ? `Báo cáo ca ${e(p.caseId)}` : 'Kinh nghiệm chuyên gia'}</span>
              </span>
            </dd>
            <dt>Bản đang xem</dt>
            <dd><span class="badge badge-version">Bản ${e(proposalVersion(p))}</span></dd>
            <dt>Cập nhật</dt>
            <dd><span class="proposal-date-chip">${e(S.fmtDate(p.updatedAt))}</span></dd>
            <dt>Người cùng đóng góp</dt>
            <dd>${e(contributorIds(p).map(S.person).join(', ') || 'Chưa có người khác')}</dd>
          </dl>
          ${p.caseId ? `
            <div class="meta-card-actions">
              <button type="button" class="btn btn-secondary btn-view-case-source" data-action="k-case-source" data-id="${e(p.id)}">
                ${icon('file')}
                <span>Xem báo cáo nguồn</span>
              </button>
            </div>
          ` : ''}
        </div>
      </div>

      <div class="card proposal-history-card">
        <div class="card-head proposal-meta-head">
          <div class="meta-head-badge-row">
            <span class="meta-head-tag">VÒNG ĐỜI & LỊCH SỬ</span>
          </div>
          <h3 class="section-title">Lịch sử đề xuất</h3>
        </div>
        <div class="card-body stack">
          ${timeline(p)}
          ${(p.submissions || []).length ? `
            <div class="submitted-versions-wrap">
              <h4 class="sub-section-title">Các bản đã gửi</h4>
              <div class="submission-btn-group">
                ${p.submissions.slice().reverse().map(sub => `
                  <button type="button" class="btn btn-secondary btn-submission-item" data-action="k-submission" data-id="${e(p.id)}" data-submission="${e(sub.id)}">
                    ${icon('clock')}
                    <span>Bản ${sub.version} · ${S.fmtDate(sub.at, false)}</span>
                  </button>
                `).join('')}
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  S.seed(function (db) {
    db.proposals = db.proposals || [];
    const source = parseRaw(sample);
    const p = baseProposal('u-hai', 'expert');
    Object.assign(p, { id: 'DP-026', title: source.title, family: 'Vision', rawText: sample, content: clone(source.content), status: 'pending', version: 3, mode: 'new', rationale: 'Bổ sung cách ghi điều kiện so sánh và giới hạn kết luận khi thay model sản phẩm.', authorConfirmed: true, createdAt: '2026-10-08T02:15:00+07:00', updatedAt: '2026-10-09T08:20:00+07:00', comparison: { version: 3, at: '2026-10-09T08:18:00+07:00', sources: db.knowledge.filter(k => k.family === 'Vision' && k.status === 'published').slice(0, 2).map(k => ({ id: k.id, version: k.version })) }, history: [{ id: 'PHS-1', type: 'submit', actorId: 'u-hai', at: '2026-10-09T08:20:00+07:00', version: 3, detail: 'Gửi tri thức mới để kiểm duyệt' }] });
    const p2 = baseProposal('u-hai', 'expert');
    Object.assign(p2, { id: 'DP-027', title: 'CNC — ghi nhận nhiệt độ trước khi kết luận nguyên nhân', family: 'CNC', rawText: 'Ghi chú demo: Khi nhiệt độ tăng, cần ghi lại điều kiện tải và thời điểm quan sát trước khi suy ra nguyên nhân.', content: { symptom: 'Nhiệt độ cụm trục tăng trong một giai đoạn làm việc (demo).', context: 'Máy CNC-04; chưa xác minh tải, tốc độ và thời gian kể từ khởi động.', checks: 'Đối chiếu số đo với trạng thái tải và điều kiện đo.', solution: 'Ghi đủ điều kiện trước khi trao đổi hướng kiểm tra với chuyên gia.', result: 'Chưa đủ dữ kiện để kết luận hoặc áp dụng hướng xử lý.', cause: 'Chưa xác định.', evidence: 'Ghi chú mô phỏng; chưa có số đo thực tế.', safety: 'Cần xác minh SOP CNC đang có hiệu lực. Không có hướng dẫn thao tác thực tế trong demo.', limits: 'Thiếu dữ liệu tải, thời gian và ngưỡng được phê duyệt; chưa dùng để quyết định sửa chữa.' }, status: 'changes', version: 2, feedback: 'Bổ sung điều kiện tải, nguồn ngưỡng đánh giá và nêu rõ giới hạn khi chưa có số đo. Không kết luận nguyên nhân chỉ từ nhiệt độ.', reviewerId: 'u-anh', createdAt: '2026-10-08T10:00:00+07:00', updatedAt: '2026-10-09T07:30:00+07:00', history: [{ id: 'PHS-2', type: 'changes', actorId: 'u-anh', at: '2026-10-09T07:30:00+07:00', version: 2, detail: 'Yêu cầu bổ sung điều kiện và bằng chứng' }] });
    const p3 = baseProposal('u-hai', 'expert');
    Object.assign(p3, { id: 'DP-028', title: 'Ghi chú buổi trao đổi về Vision', family: 'Vision', rawText: sample, createdAt: '2026-10-09T09:00:00+07:00', updatedAt: '2026-10-09T09:00:00+07:00', history: [{ id: 'PHS-3', type: 'draft', actorId: 'u-hai', at: '2026-10-09T09:00:00+07:00', version: 1, detail: 'Lưu nội dung gốc; chưa gửi kiểm duyệt' }] });
    
    const p4 = baseProposal('u-minh', 'case');
    Object.assign(p4, {
      id: 'DP-029',
      title: 'Vision — Kiểm tra đồng bộ tín hiệu và chiếu sáng sau đổi model',
      family: 'Vision',
      caseId: 'BM-26021',
      rawText: 'Bài học rút ra từ ca BM-26021: Đối chiếu chất lượng ảnh và tín hiệu nhận sản phẩm trước khi can thiệp phần cứng.',
      content: {
        symptom: 'Camera không nhận sản phẩm hoặc tỷ lệ NG tăng vọt ngay sau khi đổi model.',
        context: 'Máy VIS-01, Line A. Lỗi xuất hiện sau khi thay đổi sản phẩm từ model P-A sang P-B.',
        checks: 'Đối chiếu bộ mẫu tiêu chuẩn và kiểm tra cảm biến định vị trước camera.',
        solution: 'Căn chỉnh lại độ sáng đèn LED phụ trợ và nạp lại recipe cấu hình đã duyệt.',
        result: 'Máy đã phục hồi, tỷ lệ nhận diện đạt 100% trong 50 sản phẩm thử nghiệm.',
        cause: 'Sai lệch góc chiếu sáng LED phụ trợ khi chuyển đồ gá model mới.',
        evidence: 'Biên bản phục hồi máy ca BM-26021 ngày 09/10/2026.',
        safety: 'Tuân thủ quy trình an toàn SOP-VIS-01 ngắt nguồn phụ trợ trước khi chỉnh góc đèn.',
        limits: 'Chỉ áp dụng cho các dòng camera quang học tại Line A.'
      },
      status: 'published',
      version: 1,
      mode: 'new',
      feedback: 'Đề xuất rất thực tế và chi tiết. Đã phê duyệt đưa vào kho tri thức chuẩn hóa.',
      reviewerId: 'u-anh',
      publishedId: 'KN-024',
      publishedVersion: 1,
      authorConfirmed: true,
      createdAt: '2026-10-09T08:30:00+07:00',
      updatedAt: '2026-10-09T10:15:00+07:00',
      history: [
        { id: 'PHS-4A', type: 'submit', actorId: 'u-minh', at: '2026-10-09T08:30:00+07:00', version: 1, detail: 'Tạo đề xuất từ ca BM-26021' },
        { id: 'PHS-4B', type: 'approve', actorId: 'u-anh', at: '2026-10-09T10:15:00+07:00', version: 1, detail: 'Phê duyệt đưa vào kho tri thức' }
      ]
    });

    const p5 = baseProposal('u-minh', 'case');
    Object.assign(p5, {
      id: 'DP-030',
      title: 'Robot — Kiểm tra gập cáp encoder sau bảo dưỡng định kỳ trục J2',
      family: 'Robot',
      caseId: 'PM-26019',
      rawText: 'Bài học từ bảo dưỡng PM-26019: Cần cố định lại đai cáp theo vạch đánh dấu để tránh gập xoắn khi robot quay góc lớn.',
      content: {
        symptom: 'Báo lỗi lệch xung encoder trục J2 sau 3 ca chạy kể từ kỳ bảo dưỡng PM.',
        context: 'Robot hàn ROB-02, Line B.',
        checks: 'Kiểm tra đường đi của ruột gà cáp tín hiệu encoder và độ căng dây thít cáp.',
        solution: 'Thay đai kẹp cao su giảm chấn và chỉnh lại bán kính uốn cong theo tiêu chuẩn R >= 120mm.',
        result: 'Đã hoàn tất thử nghiệm 100 chu trình không còn phát sinh mã lỗi cảnh báo.',
        cause: 'Đai kẹp cáp cũ bị lão hóa dẫn đến cáp tín hiệu encoder bị vặn xoắn quá giới hạn uốn.',
        evidence: 'Biên bản kiểm tra và ảnh chụp cụm khớp J2 ngày 08/10/2026.',
        safety: 'Khóa nguồn năng lượng cơ cấu chấp hành LOTO trước khi can thiệp vào khoang cáp trục robot.',
        limits: 'Áp dụng cho robot khớp nối 6 bậc thuộc trạm hàn Line B.'
      },
      status: 'changes',
      version: 1,
      mode: 'new',
      feedback: 'Bổ sung ảnh chụp thực tế bán kính uốn cong R >= 120mm và phiếu kiểm tra dây thít trước khi gửi phê duyệt lại.',
      reviewerId: 'u-anh',
      authorConfirmed: true,
      createdAt: '2026-10-08T14:00:00+07:00',
      updatedAt: '2026-10-09T09:20:00+07:00',
      history: [
        { id: 'PHS-5A', type: 'submit', actorId: 'u-minh', at: '2026-10-08T14:00:00+07:00', version: 1, detail: 'Tạo đề xuất từ ca PM-26019' },
        { id: 'PHS-5B', type: 'changes', actorId: 'u-anh', at: '2026-10-09T09:20:00+07:00', version: 1, detail: 'Yêu cầu bổ sung ảnh chụp bán kính uốn cong' }
      ]
    });

    if (!db.proposals.some(x => x.id === 'DP-026')) db.proposals.push(p, p2, p3);
    if (!db.proposals.some(x => x.id === 'DP-029')) db.proposals.push(p4);
    if (!db.proposals.some(x => x.id === 'DP-030')) db.proposals.push(p5);
    db.seededProposals = true;
  });

  function renderLibraryCard(k) {
    const isCase = k.kind === 'case';
    const kindLabel = isCase ? 'Case đã duyệt' : 'Kinh nghiệm chuyên gia';
    const kindClass = isCase ? 'kind-case' : 'kind-expert';
    const symptom = (k.content?.symptom || '').trim();
    const excerpt = symptom.length > 220 ? symptom.slice(0, 217) + '…' : (symptom || 'Chưa có thông tin dấu hiệu tóm tắt.');
    const assetTag = (k.assetIds && k.assetIds.length) ? k.assetIds[0] : null;

    return `
      <article class="library-card ${kindClass}" data-id="${e(k.id)}">
        <div class="library-card-body">
          
          <div class="library-card-head">
            <div class="library-card-badges">
              <span class="badge-knowledge-id">${e(k.id)}</span>
              <span class="badge-knowledge-kind ${isCase ? 'case' : 'expert'}">
                <span class="kind-bullet"></span>
                <span>${e(kindLabel)}</span>
              </span>
              <span class="badge-knowledge-family">
                ${icon('machine')}
                <span>${e(k.family)}</span>
              </span>
              <span class="badge-knowledge-version">v${e(k.version)}</span>
            </div>
            <div class="library-card-status">
              <span class="badge-knowledge-status">
                ${icon('checkcircle')}
                <span>Đã kiểm duyệt</span>
              </span>
            </div>
          </div>

          <div class="library-card-main">
            <h3 class="library-card-title">${e(k.title)}</h3>
          </div>

          <div class="library-card-snippet">
            <div class="snippet-label">DẤU HIỆU / BỐI CẢNH</div>
            <p class="snippet-text">${e(excerpt)}</p>
          </div>

          ${k.tags && k.tags.length ? `
            <div class="library-card-tags">
              ${k.tags.map(t => `<span class="library-tag-chip">#${e(t)}</span>`).join('')}
            </div>
          ` : ''}

          <div class="library-card-meta">
            <div class="meta-item">
              ${icon('user')}
              <span>Tác giả: <strong>${e(S.person(k.authorId))}</strong></span>
            </div>
            <div class="meta-item">
              ${icon('clock')}
              <span>Duyệt: <strong>${e(S.fmtDate(k.updatedAt, false))}</strong></span>
            </div>
            ${assetTag ? `
              <div class="meta-item asset-tag">
                ${icon('machine')}
                <span>Máy: <strong>${e(assetTag)}</strong></span>
              </div>
            ` : ''}
          </div>

          <div class="library-card-footer">
            <button type="button" class="btn btn-secondary library-action-btn" data-action="k-open" data-id="${e(k.id)}">
              <span>Đọc tri thức</span>
              ${icon('arrow')}
            </button>
            <span class="library-footer-note">
              ${icon('shield')}
              <span>Đã chuẩn hóa SOP</span>
            </span>
          </div>

        </div>
      </article>
    `;
  }

  function getDynamicSuggestions() {
    // 1. Thu thập các tri thức đã duyệt phù hợp với phân loại máy đang xem
    const scope = S.db.knowledge.filter(k => k.status === 'published' && (libraryFilter.family === 'all' || k.family === libraryFilter.family));
    
    // 2. Thống kê tần suất các từ khóa/thẻ tag thực tế có trong kho
    const tagCounts = new Map();
    scope.forEach(k => {
      (k.tags || []).forEach(t => {
        const clean = String(t).trim();
        if (clean && !['Case đã duyệt', 'Kinh nghiệm chuyên gia', k.family].includes(clean)) {
          tagCounts.set(clean, (tagCounts.get(clean) || 0) + 1);
        }
      });
    });

    // 3. Xếp hạng theo độ phổ biến thực tế
    const sorted = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(entry => entry[0]);

    return sorted.length ? sorted.slice(0, 5) : ['Camera', 'Rung trục chính', 'Đổi model'];
  }

  S.pages.library = { title: 'Kho tri thức', roles: ['maintenance', 'expert', 'lead'], render: function () {
    const q = normalize(libraryFilter.query);
    const items = S.db.knowledge.filter(k => k.status === 'published' && (libraryFilter.family === 'all' || k.family === libraryFilter.family) && (libraryFilter.kind === 'all' || k.kind === libraryFilter.kind) && (!q || normalize([k.id, k.title, k.family, ...Object.values(k.content || {})].join(' ')).includes(q)));
    const hasFilter = Boolean(libraryFilter.query || libraryFilter.family !== 'all' || libraryFilter.kind !== 'all');
    const dynamicSuggestions = getDynamicSuggestions();

    const searchBarHtml = `
      <form data-form="k-search" class="card library-search-panel">
        <div class="library-search-inner">
          
          <div class="library-search-bar-row">
            <div class="library-search-input-box">
              <span class="search-box-icon" aria-hidden="true">${icon('search')}</span>
              <input class="search-main-input" 
                     name="query" 
                     type="text" 
                     value="${e(libraryFilter.query)}" 
                     placeholder="Nhập từ khóa tra cứu (ví dụ: camera, rung trục chính, model máy, mã lỗi...)" 
                     autocomplete="off"
                     aria-label="Từ khóa tìm kiếm">
              ${libraryFilter.query ? `
                <button type="button" class="search-clear-btn" data-action="k-clear-query" title="Xóa từ khóa">
                  ${icon('close')}
                </button>
              ` : ''}
            </div>
            <div class="library-search-actions">
              <button class="btn btn-primary search-submit-btn" type="submit">
                ${icon('search')}
                <span>Tìm trong kho</span>
              </button>
              ${hasFilter ? `
                <button type="button" class="btn btn-secondary search-reset-btn" data-action="k-reset-search" title="Đặt lại bộ lọc về mặc định">
                  ${icon('refresh')}
                  <span>Đặt lại</span>
                </button>
              ` : ''}
            </div>
          </div>

          <div class="library-search-meta-row">
            <div class="library-select-group">
              
              <div class="library-filter-item">
                <label class="library-filter-label" for="library-filter-family">
                  ${icon('machine')}
                  <span>Loại máy</span>
                </label>
                <div class="library-select-wrap">
                  <select id="library-filter-family" class="select library-select" name="family" data-input="k-filter-auto">
                    <option value="all">Tất cả loại máy</option>
                    ${familyOptions.map(f => `<option value="${e(f)}"${libraryFilter.family === f ? ' selected' : ''}>${e(f)}</option>`).join('')}
                  </select>
                </div>
              </div>

              <div class="library-filter-item">
                <label class="library-filter-label" for="library-filter-kind">
                  ${icon('book')}
                  <span>Loại nguồn</span>
                </label>
                <div class="library-select-wrap">
                  <select id="library-filter-kind" class="select library-select" name="kind" data-input="k-filter-auto">
                    ${[['all', 'Tất cả nguồn'], ['expert', 'Tri thức chuyên gia'], ['case', 'Case công việc']].map(([v, t]) => `<option value="${v}"${libraryFilter.kind === v ? ' selected' : ''}>${t}</option>`).join('')}
                  </select>
                </div>
              </div>

            </div>

            <div class="library-quick-tags-wrap">
              <span class="quick-tags-label">Gợi ý:</span>
              <div class="quick-tags-list">
                ${dynamicSuggestions.map(tag => `
                  <button type="button" 
                          class="quick-tag-chip ${libraryFilter.query === tag ? 'is-active' : ''}" 
                          data-action="k-quick-search" 
                          data-tag="${e(tag)}"
                          title="Lọc nhanh: ${e(tag)}">
                    ${e(tag)}
                  </button>
                `).join('')}
              </div>
            </div>

          </div>

        </div>
      </form>
    `;

    return S.head('Kho tri thức', S.user().role === 'expert' ? btn('Ghi tri thức mới', 'k-new', 'primary') : '') +
      searchBarHtml +
      '<section class="library-results" aria-live="polite"><div class="library-results-head"><div><h2>Nguồn có thể tham khảo</h2><p class="subtext">Nguồn đã qua kiểm duyệt, kèm điều kiện áp dụng và phiên bản.</p></div><span class="library-result-count">' + items.length + '<span>nguồn</span></span></div>' + (items.length ? '<div class="library-grid">' + items.map(renderLibraryCard).join('') + '</div>' : S.empty('Chưa có nguồn phù hợp', 'Thử từ khóa hoặc loại máy khác.')) + '</section>';
  } };
  function renderKnowledgeDetail(k, currentK, versions) {
    const isCurrent = k.version === currentK.version;
    const authorUser = S.db.users.find(u => u.id === k.authorId);
    const reviewerUser = S.db.users.find(u => u.id === k.reviewerId);
    const familyKey = (k.family || '').toLowerCase().replace(/\s+/g, '-');
    const content = k.content || {};

    const causeStatusText = {
      confirmed: 'Đã xác nhận theo bằng chứng nguồn',
      hypothesis: 'Giả thuyết kỹ thuật cần kiểm chứng',
      unknown: 'Chưa xác định nguyên nhân gốc'
    }[k.causeStatus] || 'Xem căn cứ trong nội dung';

    const causeStatusTone = {
      confirmed: 'green',
      hypothesis: 'amber',
      unknown: 'neutral'
    }[k.causeStatus] || 'neutral';

    return `
    <div class="knowledge-detail-container">
      <!-- Header with prominent Knowledge Code (DENSO Plant MES Grade) -->
      <header class="case-detail-header knowledge-detail-header page-head">
        <div class="knowledge-header-main">
          <div class="knowledge-header-breadcrumbs">
            <button type="button" class="breadcrumb-link" data-action="k-library">
              ${icon('book')} <span>Kho tri thức</span>
            </button>
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-item">${e(k.family || 'Thiết bị')}</span>
            <span class="breadcrumb-sep">/</span>
            <span class="breadcrumb-item mono">${e(k.id)}</span>
          </div>

          <div class="knowledge-header-eyebrow">
            <span class="badge badge-case-id mono knowledge-id-badge">${e(k.id)}</span>
            <span class="badge badge-version-pill">v${e(k.version)}</span>
            <span class="badge ${isCurrent ? 'badge-status-published' : 'badge-status-history'}">
              <span class="status-dot ${isCurrent ? 'dot-published' : 'dot-history'}"></span>
              <span>${isCurrent ? 'Đã duyệt · Có hiệu lực' : 'Bản lưu trữ'}</span>
            </span>
            <span class="badge badge-family badge-family--${e(familyKey)}">
              ${icon('machine')}
              <span>${e(k.family || 'Thiết bị')}</span>
            </span>
            <span class="badge ${k.kind === 'case' ? 'badge-purple' : 'badge-blue'}">
              ${k.kind === 'case' ? `${icon('wrench')} Từ ca bảo trì` : `${icon('users')} Kinh nghiệm chuyên gia`}
            </span>
            ${k.caseId ? `<span class="badge badge-neutral">Mã ca: ${e(k.caseId)}</span>` : ''}
          </div>

          <h1 id="page-title" class="knowledge-header-title">${e(k.title)}</h1>

          <div class="knowledge-header-meta">
            <div class="meta-item" title="Tác giả đóng góp">
              <span class="meta-avatar">${e(authorUser?.initials || 'TG')}</span>
              <span>Tác giả: <strong>${e(S.person(k.authorId))}</strong></span>
            </div>
            <span class="meta-sep">·</span>
            <div class="meta-item" title="Người phê duyệt">
              ${icon('shield')}
              <span>Phê duyệt: <strong>${e(S.person(k.reviewerId))}</strong></span>
            </div>
            <span class="meta-sep">·</span>
            <div class="meta-item" title="Thời gian xuất bản">
              ${icon('clock')}
              <span>Cập nhật: <strong>${e(S.fmtDate(k.updatedAt, false))}</strong></span>
            </div>
            ${k.assetIds?.length ? `
            <span class="meta-sep">·</span>
            <div class="meta-item" title="Thiết bị áp dụng">
              ${icon('machine')}
              <span>Thiết bị: <strong>${e(k.assetIds.join(', '))}</strong></span>
            </div>` : ''}
          </div>
        </div>

        <div class="knowledge-header-actions actions">
          <button type="button" class="btn btn-secondary knowledge-back-btn" data-action="k-library">
            ${icon('back')}
            <span>Về kho tri thức</span>
          </button>
          ${S.user().role === 'expert' ? `
          <button type="button" class="btn btn-primary" data-action="k-update-source" data-id="${e(currentK.id)}">
            ${icon('edit')}
            <span>Đề xuất bổ sung</span>
          </button>` : ''}
        </div>
      </header>

      <!-- Status / Verification Banner -->
      ${isCurrent ? `
      <div class="knowledge-status-banner verified">
        <div class="banner-icon-wrap">${icon('checkcircle')}</div>
        <div class="banner-body">
          <div class="banner-title">Phiên bản tri thức chuẩn hóa đang có hiệu lực (v${e(k.version)})</div>
          <p class="banner-desc">Đã qua quy trình kiểm duyệt chất lượng kỹ thuật của Chuyên gia trưởng. Sẵn sàng tra cứu và tham khảo trong phạm vi điều kiện và giới hạn của nguồn.</p>
        </div>
        <div class="banner-pills">
          <span class="badge badge-green">${icon('shield')} Đạt chuẩn MES</span>
          <span class="badge badge-neutral">${k.kind === 'case' ? 'Case thực tế' : 'Kinh nghiệm chuyên gia'}</span>
        </div>
      </div>` : `
      <div class="knowledge-status-banner historical">
        <div class="banner-icon-wrap warning">${icon('alert')}</div>
        <div class="banner-body">
          <div class="banner-title">Bạn đang xem phiên bản lịch sử v${e(k.version)}</div>
          <p class="banner-desc">Phiên bản hiện hành mới nhất là <strong>v${e(currentK.version)}</strong>. Các hồ sơ bảo trì trước đây từng tham khảo bản này vẫn lưu vết độc lập.</p>
        </div>
        <div class="banner-action">
          <button type="button" class="btn btn-secondary btn-small" data-action="k-version" data-id="${e(currentK.id)}" data-version="${currentK.version}">
            <span>Mở bản hiện hành v${currentK.version}</span> ${icon('arrow')}
          </button>
        </div>
      </div>`}

      <!-- Main Layout: 2 Columns -->
      <div class="split-layout knowledge-split-layout">
        
        <!-- Left Column: Structured Technical Knowledge Content -->
        <main class="knowledge-main-content stack">
          
          <!-- Section 1: Hiện tượng & Điều kiện phát sinh -->
          <section class="card kd-section-card">
            <div class="kd-section-head">
              <div class="kd-section-icon icon-alert">${icon('alert')}</div>
              <div>
                <h2 class="kd-section-title">1. Hiện tượng & Điều kiện phát sinh</h2>
                <p class="kd-section-subtitle">Dấu hiệu quan sát hiện trường, Alarm cảnh báo và bối cảnh vận hành thiết bị</p>
              </div>
            </div>
            <div class="kd-section-body">
              <div class="kd-field-box">
                <span class="kd-field-label">Dấu hiệu / Vấn đề</span>
                <div class="kd-field-content kd-highlight-box">${preserved(content.symptom)}</div>
              </div>
              <div class="kd-field-box">
                <span class="kd-field-label">Điều kiện phát sinh</span>
                <div class="kd-field-content">${preserved(content.context)}</div>
              </div>
            </div>
          </section>

          <!-- Section 2: Kiểm tra & Hướng xử lý đã chuẩn hóa -->
          <section class="card kd-section-card">
            <div class="kd-section-head">
              <div class="kd-section-icon icon-wrench">${icon('wrench')}</div>
              <div>
                <h2 class="kd-section-title">2. Kiểm tra & Hướng xử lý đã chuẩn hóa</h2>
                <p class="kd-section-subtitle">Trình tự kiểm tra thực tế, giải pháp kỹ thuật và tiêu chí kiểm chứng nghiệm thu</p>
              </div>
            </div>
            <div class="kd-section-body">
              <div class="kd-field-box">
                <span class="kd-field-label">Kiểm tra và căn cứ lựa chọn</span>
                <div class="kd-field-content">${preserved(content.checks)}</div>
              </div>
              
              <!-- Prominent Solution Callout -->
              <div class="kd-solution-callout">
                <div class="solution-callout-head">
                  <span class="solution-callout-icon">${icon('checkcircle')}</span>
                  <span class="solution-callout-title">Cách xử lý / Bài học kinh nghiệm trọng tâm</span>
                </div>
                <div class="solution-callout-body">
                  ${preserved(content.solution)}
                </div>
              </div>

              <div class="kd-field-box">
                <span class="kd-field-label">Kết quả và cách kiểm chứng</span>
                <div class="kd-field-content">${preserved(content.result)}</div>
              </div>
            </div>
          </section>

          <!-- Section 3: Nguyên nhân & Bằng chứng kỹ thuật -->
          <section class="card kd-section-card">
            <div class="kd-section-head">
              <div class="kd-section-icon icon-file">${icon('file')}</div>
              <div>
                <h2 class="kd-section-title">3. Nguyên nhân kỹ thuật & Bằng chứng</h2>
                <p class="kd-section-subtitle">Phân định giữa nhận định đã xác minh với giả thuyết, kèm mã hồ sơ căn cứ</p>
              </div>
            </div>
            <div class="kd-section-body">
              <div class="kd-field-box">
                <div class="row-between" style="margin-bottom: 6px;">
                  <span class="kd-field-label" style="margin: 0;">Nguyên nhân / Giả thuyết</span>
                  ${S.badge(causeStatusText, causeStatusTone)}
                </div>
                <div class="kd-field-content">${preserved(content.cause)}</div>
              </div>
              <div class="kd-field-box">
                <span class="kd-field-label">Bằng chứng và nguồn hồ sơ</span>
                <div class="kd-field-content kd-evidence-box">${preserved(content.evidence)}</div>
              </div>
            </div>
          </section>

          <!-- Section 4: Tuân thủ an toàn & Giới hạn áp dụng -->
          <section class="card kd-section-card kd-section-card--safety">
            <div class="kd-section-head">
              <div class="kd-section-icon icon-shield">${icon('shield')}</div>
              <div>
                <h2 class="kd-section-title">4. Tuân thủ an toàn & Giới hạn áp dụng (DENSO Standard)</h2>
                <p class="kd-section-subtitle">Quy trình SOP bắt buộc và giới hạn phạm vi trước khi kỹ thuật viên can thiệp</p>
              </div>
            </div>
            <div class="kd-section-body">
              <!-- Safety Notice -->
              <div class="kd-safety-callout">
                <div class="safety-callout-head">
                  <span class="safety-callout-icon">${icon('alert')}</span>
                  <span class="safety-callout-title">An toàn lao động và quy trình tham chiếu (SOP)</span>
                </div>
                <div class="safety-callout-body">
                  ${preserved(content.safety)}
                </div>
              </div>

              <!-- Limits Box -->
              <div class="kd-limits-callout">
                <div class="limits-callout-head">
                  <span class="limits-callout-icon">${icon('info')}</span>
                  <span class="limits-callout-title">Điều kiện áp dụng và giới hạn nguồn tri thức</span>
                </div>
                <div class="limits-callout-body">
                  ${preserved(content.limits)}
                </div>
              </div>
            </div>
          </section>

        </main>

        <!-- Right Column: Sidebar Specs, Version History & Quick Info -->
        <aside class="knowledge-sidebar stack">
          
          <!-- Card: Thông số nguồn & Phân loại -->
          <div class="card kd-sidebar-card">
            <div class="card-head">
              <h3>Thông số nguồn & Phân loại</h3>
            </div>
            <div class="card-body">
              <dl class="kv-list kd-kv-list">
                <div>
                  <dt>Mã tri thức</dt>
                  <dd><span class="badge badge-case-id mono font-bold">${e(k.id)}</span></dd>
                </div>
                <div>
                  <dt>Phiên bản</dt>
                  <dd><span class="badge badge-neutral">v${e(k.version)}</span></dd>
                </div>
                <div>
                  <dt>Loại máy</dt>
                  <dd><span class="badge badge-family badge-family--${e(familyKey)}">${e(k.family || 'Thiết bị')}</span></dd>
                </div>
                <div>
                  <dt>Thiết bị</dt>
                  <dd><strong>${e(k.assetIds?.join(', ') || 'Toàn line ' + (k.family || ''))}</strong></dd>
                </div>
                <div>
                  <dt>Nguồn gốc</dt>
                  <dd>${k.kind === 'case' ? 'Case công việc đã duyệt' : 'Kinh nghiệm chuyên gia'}</dd>
                </div>
                <div>
                  <dt>Đóng góp</dt>
                  <dd><strong>${e(contributorIds(k).map(S.person).join(', ') || S.person(k.authorId))}</strong></dd>
                </div>
                <div>
                  <dt>Phê duyệt</dt>
                  <dd><strong>${e(S.person(k.reviewerId))}</strong></dd>
                </div>
                <div>
                  <dt>Ngày xuất bản</dt>
                  <dd>${e(S.fmtDate(k.updatedAt))}</dd>
                </div>
                <div>
                  <dt>Nguyên nhân</dt>
                  <dd>${S.badge(causeStatusText, causeStatusTone)}</dd>
                </div>
              </dl>

              ${k.tags?.length ? `
              <div class="kd-tags-section">
                <span class="kd-tags-label">Từ khóa phân loại:</span>
                <div class="pill-list kd-pill-list">
                  ${k.tags.map(t => `<span class="context-tag">${e(t)}</span>`).join('')}
                </div>
              </div>` : ''}
            </div>
          </div>

          <!-- Card: Lịch sử phiên bản -->
          <div class="card kd-sidebar-card">
            <div class="card-head">
              <h3>Lịch sử phiên bản (${versions.length})</h3>
            </div>
            <div class="card-body stack">
              <div class="kd-version-list">
                ${versions.map(v => {
                  const isThis = v === k.version;
                  const isLatest = v === currentK.version;
                  return `
                  <button type="button" class="kd-version-item ${isThis ? 'active' : ''}" data-action="k-version" data-id="${e(currentK.id)}" data-version="${v}">
                    <div class="kd-version-meta">
                      <span class="kd-version-tag ${isThis ? 'tag-active' : ''}">v${v}</span>
                      <div class="kd-version-info">
                        <strong>${isLatest ? 'Phiên bản hiện hành' : 'Bản lưu trữ lịch sử'}</strong>
                        <small>${isThis ? 'Đang hiển thị trên màn hình' : 'Bấm để xem nội dung bản này'}</small>
                      </div>
                    </div>
                    <div class="kd-version-status">
                      ${isThis ? `<span class="badge badge-blue">Đang xem</span>` : `<span class="badge badge-neutral">${icon('arrow')}</span>`}
                    </div>
                  </button>`;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Card: Cam kết an toàn & Kaizen -->
          <div class="notice notice-info kd-safety-notice">
            ${icon('shield')}
            <div>
              <strong>Quy chuẩn an toàn DENSO</strong>
              <p>Luôn đối chiếu điều kiện thực tế hiện trường và bản quy trình SOP nhà máy đang có hiệu lực trước khi tiến hành thao tác.</p>
            </div>
          </div>

        </aside>
      </div>
    </div>`;
  }

  S.pages['knowledge-detail'] = {
    title: 'Chi tiết tri thức',
    roles: ['maintenance', 'expert', 'lead'],
    render: function () {
      const currentK = S.db.knowledge.find(k => k.id === S.ui.id && k.status === 'published');
      const version = S.ui.tab && /^v\d+$/.test(S.ui.tab) ? Number(S.ui.tab.slice(1)) : undefined;
      const k = currentK && S.getKnowledge(currentK.id, version);
      if (!k) return S.empty('Không tìm thấy tri thức', 'Nguồn hoặc phiên bản này không có trong kho đã duyệt.', btn('Về kho tri thức', 'k-library'));
      const snapshots = (currentK.history || []).map(h => h.snapshot || h).filter(h => h && h.version);
      const versions = [...new Set([currentK.version, ...snapshots.map(h => h.version)])].sort((a, b) => b - a);
      return renderKnowledgeDetail(k, currentK, versions);
    }
  };

  function renderProposalCard(p) {
    const isEdit = editable(p);
    const modeLabel = modes[p.mode] || 'Tri thức từ ca';
    const statusMeta = statuses[p.status] || statuses.draft;

    const feedbackIcon = p.status === 'published' ? icon('checkcircle') : p.status === 'rejected' ? icon('close') : p.status === 'changes' ? icon('clock') : icon('clock');
    const feedbackTitle = p.status === 'published' ? 'Ý kiến phê duyệt' : p.status === 'changes' ? 'Phản hồi cần bổ sung' : p.status === 'rejected' ? 'Lý do từ chối' : 'Phản hồi cần chú ý';

    return `
      <article class="proposal-card status-${p.status}" data-id="${e(p.id)}">
        <div class="proposal-card-body">
          
          <div class="proposal-card-head">
            <div class="proposal-card-badges">
              <span class="badge-proposal-id">${e(p.id)}</span>
              <span class="badge-proposal-status ${p.status}">
                <span class="proposal-status-dot dot-${p.status}"></span>
                <span>${e(statusMeta[0])}</span>
              </span>
              <span class="badge-proposal-family">
                ${icon('machine')}
                <span>${e(p.family || 'Chưa phân loại')}</span>
              </span>
              <span class="badge-proposal-version">v${e(p.version || 1)}</span>
            </div>
            <div class="proposal-card-mode">
              <span class="badge-proposal-mode">
                ${icon('spark')}
                <span>${e(modeLabel)}</span>
              </span>
            </div>
          </div>

          <div class="proposal-card-main">
            <h3 class="proposal-card-title">${e(p.title || 'Đề xuất tri thức từ ca')}</h3>
          </div>

          <div class="proposal-source-strip">
            <span class="source-strip-icon">${icon('file')}</span>
            <div class="source-strip-content">
              <span class="source-strip-label">HỒ SƠ NGUỒN:</span>
              <span class="source-strip-value">${p.caseId ? `Báo cáo ca <strong>${e(p.caseId)}</strong>` : 'Kinh nghiệm chuyên gia'} · ${e(modeLabel)}</span>
            </div>
          </div>

          ${p.feedback ? `
            <div class="proposal-feedback-box feedback-${p.status}">
              <div class="feedback-box-head">
                <span class="feedback-icon">${feedbackIcon}</span>
                <span class="feedback-label">${feedbackTitle}</span>
              </div>
              <p class="feedback-text">${e(p.feedback)}</p>
            </div>
          ` : ''}

          <div class="proposal-card-meta">
            <div class="meta-item">
              ${icon('clock')}
              <span>Cập nhật: <strong>${e(S.fmtDate(p.updatedAt, false))}</strong></span>
            </div>
            ${p.reviewerId ? `
              <div class="meta-item">
                ${icon('checkcircle')}
                <span>Người duyệt: <strong>${e(S.person(p.reviewerId))}</strong></span>
              </div>
            ` : `
              <div class="meta-item">
                ${icon('user')}
                <span>Tác giả: <strong>${e(S.person(p.authorId))}</strong></span>
              </div>
            `}
          </div>

          <div class="proposal-card-footer">
            ${isEdit ? `
              <button type="button" class="btn btn-primary proposal-action-btn edit-btn" data-action="k-open-proposal" data-id="${e(p.id)}">
                ${icon('edit')}
                <span>Tiếp tục hoàn thiện</span>
                ${icon('arrow')}
              </button>
            ` : `
              <button type="button" class="btn btn-secondary proposal-action-btn view-btn" data-action="k-open-proposal" data-id="${e(p.id)}">
                <span>Xem đề xuất</span>
                ${icon('arrow')}
              </button>
            `}
            <span class="proposal-footer-audit">
              ${icon('shield')}
              <span>${p.status === 'published' ? 'Đã lưu kho tri thức' : 'Dấu vết tự động'}</span>
            </span>
          </div>

        </div>
      </article>
    `;
  }

  S.pages.proposals = { get title() { return S.user()?.role === 'maintenance' ? 'Bài học từ ca' : 'Đề xuất của tôi'; }, roles: ['expert', 'maintenance'], render: function () {
    const items = S.db.proposals.filter(p => p.authorId === S.user().id && (proposalFilter === 'all' || p.status === proposalFilter)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const maintenance = S.user().role === 'maintenance';
    const states = [['all', 'Tất cả'], ['draft', 'Nháp'], ['pending', 'Chờ duyệt'], ['changes', 'Cần bổ sung'], ['published', 'Đã duyệt'], ['rejected', 'Từ chối'], ['withdrawn', 'Đã lưu trữ']];
    const counts = Object.fromEntries(states.map(([key]) => [key, key === 'all' ? S.db.proposals.filter(p => p.authorId === S.user().id).length : S.db.proposals.filter(p => p.authorId === S.user().id && p.status === key).length]));
    
    const list = maintenance ? (items.length ? '<div class="proposal-cards">' + items.map(renderProposalCard).join('') + '</div>' : S.empty('Chưa có đề xuất ở trạng thái này', 'Mở báo cáo của một ca đã xác nhận để xem có thể đề xuất tri thức hay không.', btn('Mở ca bảo trì', 'navigate', 'secondary', 'data-page="cases"'))) : (items.length ? '<div class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>Đề xuất</th><th>Nguồn / loại</th><th>Trạng thái</th><th>Cập nhật</th><th>Thao tác</th></tr></thead><tbody>' + items.map(p => '<tr><td><strong>' + e(p.title || 'Tri thức chưa đặt tên') + '</strong><div class="source-meta">' + e(p.id) + ' · bản ' + e(p.version) + ' · ' + e(p.family || 'Chưa chọn máy') + '</div></td><td>' + e(p.origin === 'case' ? 'Case ' + p.caseId : 'Chuyên gia') + '<div class="source-meta">' + e(modes[p.mode]) + '</div></td><td>' + status(p) + '</td><td>' + e(S.fmtDate(p.updatedAt)) + '</td><td>' + btn(editable(p) ? 'Tiếp tục soạn' : 'Xem đề xuất', 'k-open-proposal', 'secondary', 'data-id="' + e(p.id) + '"') + '</td></tr>').join('') + '</tbody></table></div></div>' : S.empty('Chưa có đề xuất', 'Tạo bản nháp đầu tiên hoặc chọn bộ lọc khác.'));

    const toolbarHtml = `
      <div class="case-list-toolbar proposal-list-toolbar">
        <div class="case-list-summary">
          <div class="case-list-badge">
            <span class="case-list-icon">${icon('file')}</span>
            <span class="case-list-count">${counts.all}</span>
          </div>
          <div class="case-list-summary-text">
            <span class="case-list-title">Đề xuất bài học từ ca</span>
            <span class="case-list-desc">${items.length} đề xuất theo bộ lọc hiện tại</span>
          </div>
        </div>

        <div class="case-filters-segmented proposal-filters-segmented" role="tablist" aria-label="Lọc trạng thái đề xuất">
          ${states.map(([v, t]) => `
            <button type="button" 
                    class="case-filter-pill ${proposalFilter === v ? 'is-active' : ''}" 
                    data-action="k-proposal-filter" 
                    data-value="${v}"
                    role="tab"
                    aria-selected="${proposalFilter === v}">
              <span class="filter-dot dot-proposal-${v}"></span>
              <span>${t}</span>
              <span class="filter-count-pill">${counts[v]}</span>
            </button>
          `).join('')}
        </div>
      </div>
    `;

    return S.head(maintenance ? 'Bài học từ ca' : 'Đề xuất của tôi', !maintenance ? btn('Ghi tri thức mới', 'k-new', 'primary') : '') +
      toolbarHtml + list;
  } };

  function runAiModal(opts) {
    const { title, subtitle, badgeText = 'DENSO AI · INDUSTRIAL MES ENGINE', steps = [], duration = 1400, onComplete } = opts;
    const oldModal = document.getElementById('proposal-ai-modal');
    if (oldModal) oldModal.remove();

    const overlay = document.createElement('div');
    overlay.id = 'proposal-ai-modal';
    overlay.className = 'proposal-ai-modal-overlay';
    overlay.innerHTML = `
      <div class="proposal-ai-modal-card">
        <div class="ai-modal-top">
          <div class="ai-modal-badge">
            <span class="ai-spark-pulse">${icon('spark')}</span>
            <span>${e(badgeText)}</span>
          </div>
          <div class="ai-modal-status-pill" id="ai-modal-pill">
            <span class="ai-live-dot"></span>
            <span id="ai-status-text">ĐANG XỬ LÝ</span>
          </div>
        </div>
        <h3 class="ai-modal-title">${e(title)}</h3>
        <p class="ai-modal-desc">${e(subtitle)}</p>

        <div class="ai-modal-progress-container">
          <div class="ai-modal-progress-bar">
            <div class="ai-modal-progress-fill" id="ai-progress-fill" style="width: 15%"></div>
          </div>
          <div class="ai-modal-progress-meta">
            <span id="ai-step-label" class="ai-step-label">${e(steps[0]?.label || 'Đang chuẩn bị...')}</span>
            <span id="ai-percent-label" class="ai-percent-label">15%</span>
          </div>
        </div>

        <div class="ai-modal-steps-list">
          ${steps.map((st, i) => `
            <div class="ai-modal-step-row ${i === 0 ? 'is-active' : 'is-pending'}" id="ai-step-row-${i}">
              <div class="ai-step-indicator">
                <span class="ai-step-num">${i + 1}</span>
                <span class="ai-step-check" style="display:none">${icon('check')}</span>
                <span class="ai-step-spinner"></span>
              </div>
              <div class="ai-step-content">
                <strong>${e(st.label)}</strong>
                <small>${e(st.desc)}</small>
              </div>
            </div>
          `).join('')}
        </div>

        <div class="ai-modal-footer">
          <div class="ai-modal-note">
            ${icon('alert')}
            <span>Bảo toàn 100% dữ kiện gốc. Bạn có thể kiểm tra và chỉnh sửa ở bước tiếp theo.</span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const fill = overlay.querySelector('#ai-progress-fill');
    const percentLabel = overlay.querySelector('#ai-percent-label');
    const stepLabel = overlay.querySelector('#ai-step-label');
    const pill = overlay.querySelector('#ai-modal-pill');
    const statusText = overlay.querySelector('#ai-status-text');

    function setStep(stepIndex, pct, label) {
      if (fill) fill.style.width = pct + '%';
      if (percentLabel) percentLabel.textContent = pct + '%';
      if (stepLabel && label) stepLabel.textContent = label;

      steps.forEach((_, i) => {
        const row = overlay.querySelector('#ai-step-row-' + i);
        if (!row) return;
        const numEl = row.querySelector('.ai-step-num');
        const checkEl = row.querySelector('.ai-step-check');
        const spinEl = row.querySelector('.ai-step-spinner');
        if (i < stepIndex) {
          row.className = 'ai-modal-step-row is-completed';
          if (numEl) numEl.style.display = 'none';
          if (spinEl) spinEl.style.display = 'none';
          if (checkEl) checkEl.style.display = 'inline-flex';
        } else if (i === stepIndex) {
          row.className = 'ai-modal-step-row is-active';
          if (numEl) numEl.style.display = 'none';
          if (spinEl) spinEl.style.display = 'inline-block';
          if (checkEl) checkEl.style.display = 'none';
        } else {
          row.className = 'ai-modal-step-row is-pending';
          if (numEl) numEl.style.display = 'inline-flex';
          if (spinEl) spinEl.style.display = 'none';
          if (checkEl) checkEl.style.display = 'none';
        }
      });
    }

    setTimeout(() => {
      setStep(1, 58, steps[1]?.label);
    }, 450);

    setTimeout(() => {
      setStep(2, 88, steps[2]?.label);
    }, 950);

    setTimeout(() => {
      setStep(3, 100, 'Hoàn tất xử lý!');
      if (pill) {
        pill.className = 'ai-modal-status-pill is-success';
        if (statusText) statusText.textContent = 'HOÀN TẤT';
      }
      setTimeout(() => {
        overlay.classList.add('is-fadeout');
        setTimeout(() => {
          overlay.remove();
          if (typeof onComplete === 'function') onComplete();
        }, 220);
      }, 350);
    }, duration);
  }

  function rawEditor(p) {
    const charCount = (p.rawText || '').length;
    const lineCount = (p.rawText || '').split(/\r?\n/).length;

    return `
      <div class="card proposal-step-card proposal-raw-card">
        <div class="card-head proposal-step-card-head">
          <div class="step-card-head-left">
            <span class="step-tag-pill">MỤC 1 · THU THẬP & GHI CHÉP GỐC</span>
            <h2 class="step-card-title">Nội dung gốc từ hiện trường</h2>
            <p class="subtext">Ghi chép chuyên gia, nội dung trao đổi hoặc biên bản liên quan. Dữ liệu gốc luôn được bảo toàn độc lập với biểu mẫu chuẩn hóa.</p>
          </div>
          <div class="step-card-head-right">
            <span class="char-counter-pill">${charCount} ký tự · ${lineCount} dòng</span>
          </div>
        </div>

        <div class="card-body stack">
          <div class="raw-textarea-wrap">
            <div class="textarea-header-strip">
              <label class="field-label" for="raw-text-editor">
                ${icon('edit')}
                <span>Ghi chép cần xử lý</span>
              </label>
              <span class="raw-format-hint">Hỗ trợ phân tách nhiều chủ đề bằng dòng <code>---</code></span>
            </div>
            ${area('', 'rawText', p.rawText, p, '', 14)}
          </div>

          <div class="raw-action-toolbar">
            <div class="action-buttons-left">
              <button type="button" class="btn btn-primary btn-ai-structure" data-action="k-structure" data-id="${e(p.id)}">
                ${icon('spark')}
                <span>AI sắp xếp nội dung</span>
              </button>
              <button type="button" class="btn btn-secondary btn-goto-form" data-action="k-tab" data-tab="form">
                ${icon('file')}
                <span>Điền biểu mẫu trực tiếp</span>
              </button>
            </div>
            ${!p.rawText?.trim() ? `
              <div class="action-buttons-right">
                <button type="button" class="btn btn-ghost btn-sample-note" data-action="k-sample" data-id="${e(p.id)}">
                  ${icon('book')}
                  <span>Dùng ghi chú mẫu</span>
                </button>
              </div>
            ` : ''}
          </div>

          <div class="raw-guide-footer">
            <div class="guide-box">
              <span class="guide-icon">${icon('shield')}</span>
              <div class="guide-text">
                <strong>Nguyên tắc bảo toàn dữ kiện Denso:</strong> AI chỉ đóng vai trò phân loại, cấu trúc và trích xuất thông tin. Mọi dữ liệu thiếu sẽ được giữ trống để con người xác nhận, tuyệt đối không tự tạo dữ kiện.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function proposalForm(p) {
    const missing = issues(p);

    return `
      <div class="card proposal-step-card proposal-form-card">
        <div class="card-head proposal-step-card-head">
          <div class="step-card-head-left">
            <span class="step-tag-pill">MỤC 2 · KIỂM TRA & CHUẨN HÓA BIỂU MẪU</span>
            <h2 class="step-card-title">Biểu mẫu tri thức chuẩn hóa (SOP Denso)</h2>
            <p class="subtext">Giữ dữ kiện gốc. Mục chưa rõ hoặc không áp dụng cần nêu lý do ngay trong ô.</p>
          </div>
          <div class="step-card-head-right">
            ${S.badge(missing.length ? missing.length + ' mục cần hoàn thiện' : 'Đã đủ các mục', missing.length ? 'amber' : 'green')}
          </div>
        </div>

        <div class="card-body stack">
          <!-- Phân nhóm 1: Định danh bài học & Máy -->
          <div class="proposal-form-section">
            <div class="form-section-title">
              <span class="section-num-badge">A</span>
              <div>
                <strong>Thông tin định danh bài học & Thiết bị</strong>
                <p class="subtext">Tiêu đề thể hiện rõ hiện tượng và điều kiện máy.</p>
              </div>
            </div>
            <div class="form-grid">
              ${field('Tiêu đề *', 'title', p.title, p)}
              ${select('Loại máy *', 'family', p.family, [['', 'Chọn loại máy'], ...familyOptions.map(f => [f, f])], p)}
            </div>
          </div>

          <!-- Phân nhóm 2: 9 tiêu chuẩn kỹ thuật -->
          <div class="proposal-form-section">
            <div class="form-section-title">
              <span class="section-num-badge">B</span>
              <div>
                <strong>Nội dung kỹ thuật cốt lõi (9 tiêu chuẩn SOP)</strong>
                <p class="subtext">Mỗi mục phản ánh chính xác dữ kiện hiện trường hoặc căn cứ kỹ thuật.</p>
              </div>
            </div>

            <div class="proposal-fields-list stack">
              <!-- Field 1: Dấu hiệu -->
              ${area('Dấu hiệu / vấn đề *', 'content.symptom', p.content.symptom, p, 'Hiện tượng quan sát được, Alarm, bộ phận và tần suất.')}
              
              <!-- Field 2: Bối cảnh -->
              ${area('Điều kiện phát sinh *', 'content.context', p.content.context, p, 'Chế độ máy, model sản phẩm, line, tốc độ, ca và môi trường liên quan.')}
              
              <!-- Field 3: Kiểm tra -->
              ${area('Kiểm tra và căn cứ lựa chọn *', 'content.checks', p.content.checks, p, 'Đã kiểm tra gì, thấy gì, vì sao ưu tiên hoặc đổi hướng kiểm tra?')}
              
              <!-- Field 4: Xử lý -->
              ${area('Cách xử lý / bài học *', 'content.solution', p.content.solution, p, 'Việc đã thực hiện và trình tự; giữ cả hướng thử chưa hiệu quả nếu có.')}
              
              <!-- Field 5: Kết quả -->
              ${area('Kết quả và cách kiểm chứng *', 'content.result', p.content.result, p, 'Kết quả quan sát, tiêu chí kiểm chứng, phần chưa đạt hoặc còn chờ.')}
              
              <!-- Field 6: Nguyên nhân & Trạng thái xác minh -->
              <div class="proposal-cause-box">
                <div class="cause-box-head">
                  <span class="cause-box-label">Phân tích nguyên nhân & Căn cứ kỹ thuật</span>
                </div>
                ${select('Trạng thái nhận định nguyên nhân', 'causeStatus', p.causeStatus || 'unknown', [['unknown', 'Chưa xác định'], ['hypothesis', 'Giả thuyết cần kiểm chứng'], ['confirmed', 'Đã xác nhận — có bằng chứng']], p, 'Máy hoạt động lại không tự chứng minh nguyên nhân gốc.')}
                ${area('Nguyên nhân / giả thuyết *', 'content.cause', p.content.cause, p, 'Phân biệt điều đã xác nhận với nhận định chưa được kiểm chứng.')}
              </div>

              <!-- Field 7: Bằng chứng -->
              ${area('Bằng chứng và nguồn *', 'content.evidence', p.content.evidence, p, 'Mã hồ sơ, ghi nhận, kết quả đo hoặc tài liệu làm căn cứ.')}

              <!-- Field 8: An toàn (Safety Gate) -->
              <div class="proposal-safety-box">
                <div class="safety-box-head">
                  <span class="safety-icon-halo">${icon('alert')}</span>
                  <div>
                    <strong>An toàn và quy trình tham chiếu (Bắt buộc tuân thủ)</strong>
                    <span class="safety-mini-badge">SOP MANDATORY</span>
                  </div>
                </div>
                ${area('', 'content.safety', p.content.safety, p, 'Nêu mã/phiên bản quy trình phù hợp cần xác minh trước thao tác.')}
              </div>

              <!-- Field 9: Giới hạn -->
              ${area('Điều kiện áp dụng và giới hạn *', 'content.limits', p.content.limits, p, 'Áp dụng khi nào, khác biệt nào cần đánh giá, khi nào cần chuyên gia?')}
            </div>
          </div>

          <!-- Phân nhóm 3: Chi tiết điều kiện & 5M1E -->
          <details class="proposal-5m1e-details">
            <summary>
              <div class="summary-left">
                <span class="summary-icon">${icon('machine')}</span>
                <span>Thông tin điều kiện chi tiết và điểm thay đổi 5M1E</span>
              </div>
              <span class="summary-pill">5M1E MATRIX</span>
            </summary>
            <div class="stack" style="padding-top: 14px;">
              <div class="form-grid">
                ${[['machineModel', 'Model máy'], ['productModel', 'Model sản phẩm'], ['mode', 'Chế độ vận hành'], ['speed', 'Tốc độ / tải và đơn vị'], ['line', 'Line / khu vực'], ['shift', 'Ca làm việc']].map(([key, label]) => field(label, 'contextDetails.' + key, (p.contextDetails || {})[key], p)).join('')}
              </div>
              ${fiveM.map((label, i) => `
                <div class="form-grid">
                  ${select(label, 'changes5m.m' + i, (p.changes5m || {})['m' + i] || 'unchecked', [['unchecked', 'Chưa kiểm tra'], ['none', 'Chưa ghi nhận thay đổi'], ['changed', 'Có thay đổi']], p)}
                  ${field('Chi tiết ' + label.toLowerCase(), 'changes5m.d' + i, (p.changes5m || {})['d' + i], p, 'Ghi mốc và nội dung nếu có thay đổi trước khi xuất hiện vấn đề.')}
                </div>
              `).join('')}
            </div>
          </details>

          <!-- Phân nhóm 4: Xác nhận và Chuyển bước -->
          <div class="proposal-author-confirmation-box">
            <label class="check-line">
              <input type="checkbox" data-input="k-author-check" data-id="${e(p.id)}" ${p.authorConfirmed ? ' checked' : ''}>
              <span>Tôi đã đọc, kiểm tra cách phân loại và xác nhận nội dung cùng các giới hạn của bản này.</span>
            </label>
          </div>

          <div class="error-summary" data-k-error tabindex="-1" hidden></div>

          <div class="proposal-form-actions">
            <button type="button" class="btn btn-primary btn-compare-knowledge" data-action="k-compare" data-id="${e(p.id)}">
              ${icon('spark')}
              <span>Đối chiếu kho tri thức</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  function decisionForm(p) {
    const sourceOptions = (p.comparison ? p.comparison.sources : []).map(s => { const k = S.getKnowledge(s.id, s.version); return k ? [k.id, k.id + ' · v' + k.version + ' — ' + k.title] : null; }).filter(Boolean);
    const hasCurrent = hasCurrentComparison(p);

    return `
      <div class="card proposal-step-card proposal-decision-card">
        <div class="card-head proposal-step-card-head">
          <div class="step-card-head-left">
            <span class="step-tag-pill">QUYẾT ĐỊNH XUẤT BẢN</span>
            <h2 class="step-card-title">Chọn hướng ghi nhận & Gửi kiểm duyệt</h2>
            <p class="subtext">Xác định cách thức tích hợp bài học này vào kho tri thức chuẩn hóa Denso.</p>
          </div>
        </div>

        <div class="card-body stack">
          <div class="decision-form-grid">
            ${select('Loại đề xuất *', 'mode', p.mode || 'new', [['new', 'Tạo tri thức mới'], ['update', 'Bổ sung tri thức đã có'], ...(p.origin === 'case' ? [['link', 'Chỉ liên kết case lặp lại']] : [])], p, 'Xác định quan hệ với các tri thức hiện hữu trong hệ thống.')}
            ${select('Nguồn đối chiếu / phiên bản gốc', 'targetId', p.targetId || '', [['', 'Chọn nếu cập nhật, liên kết hoặc hủy do trùng'], ...sourceOptions], p, 'Chỉ chọn khi thực hiện cập nhật hoặc liên kết với tri thức đã xuất bản.')}
          </div>

          ${area('Điểm mới, khác biệt hoặc lý do liên kết *', 'rationale', p.rationale, p, 'Ghi rõ điều kiện khác, nội dung bổ sung và lý do; việc cập nhật giữ nguyên phiên bản cũ.', 4)}

          <div class="update-confirmation-box">
            <label class="check-line">
              <input type="checkbox" data-input="k-update-complete" data-id="${e(p.id)}" ${p.updateCompleteConfirmed ? ' checked' : ''}>
              <span>Nếu chọn bổ sung: tôi đã rà toàn bộ bản kế tiếp, giữ phần tri thức gốc còn đúng và chỉ thay đổi phần có căn cứ. Phiên bản cũ được lưu trong lịch sử.</span>
            </label>
          </div>

          ${p.status === 'changes' ? area('Phản hồi của bạn với người duyệt *', 'response', p.response, p, 'Nêu đã bổ sung gì và phần nào còn chưa đủ căn cứ.', 4) : ''}

          <div class="comparison-status-notice ${hasCurrent ? 'is-valid' : 'is-pending'}" data-k-comparison-status>
            ${hasCurrent ? icon('check') : icon('alert')}
            <span>${hasCurrent ? 'Đối chiếu đang gắn với bản hiện tại.' : 'Cần đối chiếu lại bản hiện tại trước khi gửi.'}</span>
          </div>

          <div class="error-summary" data-k-error tabindex="-1" hidden></div>

          <div class="decision-action-toolbar">
            <div class="decision-actions-primary">
              <button type="button" class="btn btn-primary btn-submit-preview" data-action="k-submit-preview" data-id="${e(p.id)}">
                ${icon('check')}
                <span>Xem lại và gửi kiểm duyệt</span>
              </button>
              <button type="button" class="btn btn-secondary btn-recompare" data-action="k-compare" data-id="${e(p.id)}">
                ${icon('spark')}
                <span>Đối chiếu lại</span>
              </button>
            </div>
            <div class="decision-actions-secondary">
              <button type="button" class="btn btn-ghost btn-withdraw" data-action="k-withdraw" data-id="${e(p.id)}">
                ${icon('close')}
                <span>Lưu trữ đề xuất trùng</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  S.pages.proposal = { title: 'Soạn đề xuất', roles: ['expert', 'maintenance'], render: function () {
    const p = current();
    if (!accessible(p)) return S.empty('Không thể mở đề xuất', 'Bạn chỉ có quyền mở đề xuất của mình hoặc đề xuất có đóng góp của mình.', btn('Về đề xuất của tôi', 'k-proposals'));
    const canEdit = editable(p);
    const tab = ['raw', 'form', 'compare'].includes(S.ui.tab) ? S.ui.tab : 'form';
    const statusMeta = statuses[p.status] || statuses.draft;
    const isCase = p.origin === 'case';
    const hasCurrent = hasCurrentComparison(p);

    const headerHtml = `
      <header class="proposal-detail-header">
        <div class="proposal-header-top">
          <div class="proposal-header-tags">
            <span class="badge-proposal-origin">
              ${isCase ? icon('wrench') : icon('spark')}
              <span>${isCase ? 'ĐỀ XUẤT TRI THỨC TỪ CA' : 'TRI THỨC KINH NGHIỆM CHUYÊN GIA'}</span>
            </span>
            <span class="badge-proposal-id mono">${e(p.id)}</span>
            <span class="badge-proposal-version">Revision ${e(p.version || 1)}</span>
            <span class="badge-proposal-status ${p.status}">
              <span class="proposal-status-dot dot-${p.status}"></span>
              <span>${e(statusMeta[0])}</span>
            </span>
          </div>
          <div class="proposal-header-actions">
            <button type="button" class="btn btn-secondary btn-save-exit" data-action="k-proposals">
              ${icon('arrow')}
              <span>${canEdit ? 'Lưu và thoát' : 'Về danh sách'}</span>
            </button>
          </div>
        </div>

        <div class="proposal-header-main">
          <h1 class="proposal-title">${e(p.title || 'Đề xuất bài học tri thức')}</h1>
          <div class="proposal-header-meta">
            <span class="meta-item">
              ${icon('user')}
              <span>Tác giả: <strong>${e(S.person(p.authorId))}</strong></span>
            </span>
            ${isCase && p.caseId ? `
              <span class="meta-separator">·</span>
              <span class="meta-item meta-case-ref">
                ${icon('file')}
                <span>Hồ sơ nguồn: <strong>Ca ${e(p.caseId)}</strong></span>
              </span>
            ` : ''}
            ${p.family ? `
              <span class="meta-separator">·</span>
              <span class="meta-item">
                ${icon('machine')}
                <span>Loại máy: <strong>${e(p.family)}</strong></span>
              </span>
            ` : ''}
            <span class="meta-separator">·</span>
            <span class="meta-item">
              ${icon('clock')}
              <span>Cập nhật: ${e(S.fmtDate(p.updatedAt, false))}</span>
            </span>
          </div>
        </div>
      </header>
    `;

    const alertsHtml = `
      ${p.origin === 'case' && !caseSourceCurrent(p) && !['published','withdrawn','rejected'].includes(p.status) ? `
        <div class="notice notice-warning proposal-alert-banner">
          <div class="notice-head"><strong>Báo cáo nguồn đã thay đổi hoặc đang được đính chính.</strong></div>
          <p>Nội dung đề xuất vẫn giữ bản nguồn lúc tạo. Cần đối chiếu với báo cáo đã xác nhận mới trước khi gửi/duyệt.</p>
          ${canEdit ? btn('Đối chiếu lại báo cáo nguồn', 'k-refresh-report-preview', 'secondary', 'data-id="' + e(p.id) + '"') : ''}
        </div>
      ` : ''}
      ${p.feedback ? `
        <div class="notice ${p.status === 'rejected' ? 'notice-danger' : 'notice-warning'} proposal-alert-banner">
          <div class="notice-head"><strong>Phản hồi kiểm duyệt</strong></div>
          ${preserved(p.feedback)}
          ${p.suggestion ? `
            <p><strong>Đề nghị sửa ${e(fields.find(f => f[0] === p.suggestion.field)?.[1] || p.suggestion.field)}:</strong></p>
            ${preserved(p.suggestion.text)}
            ${canEdit ? btn('Áp dụng nội dung đề nghị', 'k-accept-suggestion', 'secondary', 'data-id="' + e(p.id) + '"') : ''}
          ` : ''}
        </div>
      ` : ''}
      ${p.publishedId ? `
        <div class="notice notice-success proposal-alert-banner">
          ${p.mode === 'link' ? 'Đã duyệt liên kết với ' : 'Đã xuất bản '} <strong>${e(p.publishedId)} · v${e(p.publishedVersion)}</strong>
          ${sourceButton(p.publishedId, p.publishedVersion, 'Mở tri thức')}
        </div>
      ` : ''}
    `;

    const stepperBarHtml = `
      <div class="proposal-stepper-bar">
        <div class="proposal-save-indicator">
          <span class="save-status-live">
            <span class="live-dot-pulse"></span>
            <span data-save-state>Đã lưu trên trình duyệt · ${e(S.fmtDate(p.updatedAt))}</span>
          </span>
          <span class="comparison-status-pill ${hasCurrent ? 'is-valid' : 'is-pending'}" data-k-comparison-status>
            ${hasCurrent ? icon('check') : icon('clock')}
            <span>${hasCurrent ? 'Đã đối chiếu bản hiện tại' : 'Nội dung cần đối chiếu trước khi gửi'}</span>
          </span>
        </div>

        <nav class="proposal-steps-nav" aria-label="Các bước ghi nhận tri thức">
          ${[
            ['raw', '1', 'Nội dung gốc', 'Dữ kiện ban đầu'],
            ['form', '2', 'Kiểm tra biểu mẫu', 'Chuẩn hóa SOP'],
            ['compare', '3', 'Đối chiếu & gửi', 'So sánh & quyết định']
          ].map(([v, num, label, sub]) => `
            <button type="button" 
                    class="proposal-step-tab ${tab === v ? 'is-active' : ''}" 
                    data-action="k-tab" 
                    data-tab="${v}"
                    role="tab"
                    aria-selected="${tab === v}">
              <span class="step-tab-num">${num}</span>
              <div class="step-tab-text">
                <span class="step-tab-label">${label}</span>
                <span class="step-tab-sub">${sub}</span>
              </div>
            </button>
          `).join('')}
        </nav>
      </div>
    `;

    return headerHtml + alertsHtml +
      '<div class="split-layout"><div class="stack">' +
      (canEdit ? stepperBarHtml + (tab === 'raw' ? rawEditor(p) : tab === 'form' ? proposalForm(p) : compareView(p) + decisionForm(p)) :
        '<div class="notice notice-info">' + (p.status === 'pending' ? 'Bản đã gửi được khóa để kiểm duyệt đúng nội dung. Kết quả sẽ có trong thông báo và đề xuất của bạn.' : p.status === 'withdrawn' ? 'Nháp được giữ trong lịch sử; không tạo bản mới trong kho.' : 'Nội dung và lịch sử được giữ để truy vết.') + '</div><div class="card"><div class="card-body">' + contentView(p.content) + '</div></div><details class="card"><summary class="card-head">Nội dung gốc</summary><div class="card-body">' + preserved(p.rawText) + '</div></details>') +
      '</div><aside class="stack proposal-sidebar-column">' + metaCard(p) + '</aside></div>';
  } };

  S.pages.review = { title: 'Kiểm duyệt tri thức', roles: ['lead'], render: function () {
    const items = S.db.proposals.filter(p => reviewFilter === 'all' ? ['pending', 'changes', 'published', 'rejected'].includes(p.status) : p.status === reviewFilter).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return S.head('Kiểm duyệt tri thức') + '<div class="tabs">' + [['pending', 'Chờ duyệt'], ['changes', 'Chờ tác giả bổ sung'], ['all', 'Lịch sử quyết định']].map(([v, t]) => '<button type="button" class="tab' + (reviewFilter === v ? ' active' : '') + '" data-action="k-review-filter" data-value="' + v + '">' + t + '</button>').join('') + '</div>' +
      (items.length ? '<div class="card"><div class="table-wrap"><table class="data-table"><thead><tr><th>Đề xuất</th><th>Tác giả / nguồn</th><th>Loại đề xuất</th><th>Trạng thái</th><th></th></tr></thead><tbody>' + items.map(p => '<tr><td><strong>' + e(p.title || 'Chưa đặt tên') + '</strong><div class="source-meta">' + e(p.id) + ' · bản ' + e(p.version) + ' · ' + e(p.family) + '</div></td><td>' + e(S.person(p.authorId)) + '<div class="source-meta">' + e(p.origin === 'case' ? p.caseId : 'Kinh nghiệm chuyên gia') + '</div></td><td>' + e(modes[p.mode]) + '</td><td>' + status(p) + (!independent(p) ? '<div class="field-hint">Cần người duyệt độc lập khác</div>' : '') + '</td><td>' + btn('Mở kiểm duyệt', 'k-open-review', 'secondary', 'data-id="' + e(p.id) + '"') + '</td></tr>').join('') + '</tbody></table></div></div>' : S.empty('Không có đề xuất ở nhóm này', 'Đề xuất từ chuyên gia và case đã xác nhận sẽ xuất hiện tại đây sau khi người gửi hoàn tất đối chiếu.'));
  } };
  S.pages['review-detail'] = { title: 'Xem đề xuất kiểm duyệt', roles: ['lead'], render: function () {
    const p = current();
    if (!p) return S.empty('Không tìm thấy đề xuất', 'Đề xuất này không có trong dữ liệu hiện tại.');
    const mayReview = p.status === 'pending' && independent(p);
    return pageHead('KIỂM DUYỆT / ' + p.id, p.title || 'Đề xuất tri thức', 'Tác giả: ' + S.person(p.authorId) + ' · ' + modes[p.mode] + ' · bản ' + p.version, status(p) + btn('Về hàng đợi', 'k-review')) +
      (!independent(p) ? '<div class="notice notice-danger">Bạn là tác giả hoặc người cùng đóng góp, nên không thể duyệt đề xuất này. Cần người duyệt độc lập khác.</div>' : '') +
      '<div class="split-layout"><main class="stack"><div class="card"><div class="card-body stack"><h2>Nội dung gửi duyệt</h2><div class="notice notice-info"><strong>Căn cứ gửi:</strong> ' + e(p.rationale || 'Chưa ghi') + (p.targetId ? '<br>Nguồn mục tiêu: ' + e(p.targetId) + ' · v' + e(p.targetVersion) : '') + '</div>' + contentView(p.content) + '</div></div><details class="card"><summary class="card-head">Nội dung gốc và phản hồi của tác giả</summary><div class="card-body stack">' + preserved(p.rawText) + '<h3>Phản hồi vòng bổ sung</h3>' + preserved(p.response) + '</div></details><details class="card"><summary class="card-head">Các nguồn được đối chiếu khi gửi</summary><div class="card-body stack">' + compareView(p) + '</div></details>' +
      (mayReview ? '<form data-form="k-decision" data-id="' + e(p.id) + '" data-version="' + p.version + '" class="card"><div class="card-body stack"><h2>Quyết định kiểm duyệt</h2><div class="notice notice-info">Sửa nội dung chuyên môn phải chuyển về tác giả xác nhận. Các ghi nhận và báo cáo công việc gốc luôn được giữ nguyên.</div><label class="field"><span class="field-label">Quyết định *</span><select class="select" name="decision" required><option value="">Chọn quyết định</option><option value="approve">Phê duyệt và xuất bản</option><option value="changes">Yêu cầu bổ sung / xác nhận thay đổi</option><option value="reject">Từ chối đề xuất</option></select></label>' + S.area('Nhận xét và căn cứ quyết định *', 'feedback', '', { rows: 4, required: true, hint: 'Phản hồi này được gửi lại tác giả cho mọi quyết định.' }) +
      '<details><summary>Đề nghị sửa một mục chuyên môn</summary><div class="stack"><label class="field"><span class="field-label">Mục cần sửa</span><select class="select" name="suggestField"><option value="">Không đề nghị bản thay thế</option>' + fields.map(([key, label]) => '<option value="' + key + '">' + e(label) + '</option>').join('') + '</select></label>' + S.area('Nội dung đề nghị', 'suggestText', '', { rows: 4, hint: 'Chọn “Yêu cầu bổ sung”; tác giả phải đọc, chỉnh hoặc chấp nhận và gửi lại.' }) + '</div></details><details><summary>Sửa biên tập tiêu đề</summary><div class="stack">' + S.field('Tiêu đề sau sửa', 'editorialTitle', p.title, { hint: 'Chỉ chính tả/diễn đạt; thay đổi chuyên môn cần trả về tác giả.' }) + S.area('Ghi chú chỉnh biên tập', 'editorialNote', '', { rows: 2 }) + '</div></details><label class="check-line"><input type="checkbox" name="reviewConfirmed" required> Tôi đã xem nguồn, điều kiện áp dụng và nội dung an toàn; quyết định đúng phạm vi chuyên môn được giao.</label><div class="error-summary" hidden tabindex="-1"></div><button type="submit" class="btn btn-primary">Xem lại quyết định</button></div></form>' : '<div class="notice notice-info">' + (p.status === 'changes' ? 'Đề xuất đang chờ tác giả bổ sung. Chỉ duyệt tiếp sau khi tác giả gửi lại.' : 'Đề xuất đã có quyết định hoặc chưa đủ quyền để duyệt.') + (p.feedback ? preserved(p.feedback) : '') + '</div>') + '</main><aside class="stack">' + metaCard(p) + '</aside></div>';
  } };

  function err(text) { const target = document.querySelector('[data-k-error]')?.parentElement || document.querySelector('.page-content') || document.body; S.error(target, text); S.toast(text, 'danger'); }
  function ownership(p) { if (!editable(p)) { S.toast('Bạn không có quyền sửa bản này hoặc bản đã được gửi.', 'error'); return false; } return true; }
  function updateSaveStatus(p, stale) {
    if (stale) {
      document.querySelectorAll('[data-k-comparison-status]').forEach(el => { el.textContent = 'Nội dung đã thay đổi. Hãy xác nhận biểu mẫu và đối chiếu lại.'; });
      document.querySelectorAll('[data-input="k-author-check"]').forEach(el => { el.checked = false; });
      document.querySelectorAll('[data-input="k-update-complete"]').forEach(el => { el.checked = false; });
    }
  }
  S.inputs['k-edit'] = function (el) {
    const p = S.db.proposals.find(x => x.id === el.dataset.id);
    if (!ownership(p)) return;
    const key = el.dataset.key;
    const safeKeys = ['title', 'family', 'rawText', 'mode', 'targetId', 'rationale', 'response', 'causeStatus'];
    if (!safeKeys.includes(key) && !/^(content\.(symptom|context|checks|solution|result|cause|evidence|safety|limits)|contextDetails\.(machineModel|productModel|mode|speed|line|shift)|changes5m\.[md][0-5])$/.test(key)) return;
    const path = key.split('.');
    const previous = path.length === 1 ? p[key] : (p[path[0]] || {})[path[1]];
    if ((previous || '') === el.value) return;
    const isContent = !['mode', 'targetId', 'rationale', 'response'].includes(key);
    const ok = S.commit(() => {
      if (path.length === 1) p[key] = el.value; else { p[path[0]] = p[path[0]] || {}; p[path[0]][path[1]] = el.value; }
      if (key === 'targetId') { const k = S.db.knowledge.find(k => k.id === p.targetId); p.targetVersion = k ? k.version : null; }
      if (['targetId', 'mode'].includes(key)) p.updateCompleteConfirmed = false;
      if (isContent) stamp(p); else p.updatedAt = S.now();
    }, null, false);
    if (ok) { updateSaveStatus(p, isContent); if (['mode','targetId'].includes(key)) document.querySelectorAll('[data-input="k-update-complete"]').forEach(el => { el.checked = false; }); }
  };
  S.inputs['k-author-check'] = function (el) {
    const p = S.db.proposals.find(x => x.id === el.dataset.id);
    if (ownership(p)) S.commit(() => { p.authorConfirmed = el.checked; p.updatedAt = S.now(); }, null, false);
  };
  S.inputs['k-update-complete'] = el => { const p = S.db.proposals.find(x => x.id === el.dataset.id); if (ownership(p) && p.updateCompleteConfirmed !== el.checked) S.commit(() => { p.updateCompleteConfirmed = el.checked; }, null, false); };
  S.forms['k-search'] = function (form) { const fd = new FormData(form); libraryFilter = { query: String(fd.get('query') || '').trim(), family: String(fd.get('family') || 'all'), kind: String(fd.get('kind') || 'all') }; S.render(); };
  S.actions['k-reset-search'] = () => { libraryFilter = { query: '', family: 'all', kind: 'all' }; S.render(); };
  S.actions['k-clear-query'] = () => { libraryFilter.query = ''; S.render(); };
  S.actions['k-quick-search'] = el => { libraryFilter.query = el.dataset.tag; S.render(); };
  S.inputs['k-filter-auto'] = el => { const form = el.closest('form'); if (form) S.forms['k-search'](form); };
  S.actions['k-library'] = () => S.go('library');
  S.actions['k-proposals'] = () => S.go('proposals');
  S.actions['k-review'] = () => S.go('review');
  S.actions['k-open'] = el => S.go('knowledge-detail', el.dataset.id);
  S.actions['k-version'] = el => S.go('knowledge-detail', el.dataset.id, 'v' + el.dataset.version);
  S.actions['k-open-proposal'] = el => S.go('proposal', el.dataset.id);
  S.actions['k-open-review'] = el => S.go('review-detail', el.dataset.id);
  S.actions['k-tab'] = el => S.go('proposal', S.ui.id, el.dataset.tab);
  S.actions['k-proposal-filter'] = el => { proposalFilter = el.dataset.value; S.render(); };
  S.actions['k-review-filter'] = el => { reviewFilter = el.dataset.value; S.render(); };
  S.actions['k-source'] = function (el) {
    const k = S.getKnowledge(el.dataset.id, Number(el.dataset.version) || undefined);
    if (!k || k.status !== 'published') return S.toast('Không tìm thấy nguồn đã duyệt.', 'error');
    const metaStrip = `
      <div class="modal-source-header-meta">
        <span class="badge ${k.kind==='case'?'badge-blue':'badge-purple'}">${k.kind==='case'?'Case đã duyệt':'Tri thức chuyên gia'}</span>
        <span class="meta-item">${icon('tag')} Dòng máy: <strong>${e(k.family || 'Chung')}</strong></span>
        <span class="meta-item">${icon('user')} Tác giả: <strong>${e(S.person(k.authorId))}</strong></span>
        <span class="meta-item">${icon('shield')} Người duyệt: <strong>${e(S.person(k.reviewerId))}</strong></span>
      </div>
    `;
    S.modal(k.id + ' · v' + k.version + ' — ' + k.title, metaStrip + contentView(k.content), btn('Đóng nguồn', 'k-close', 'primary'));
  };
  S.actions['k-close'] = () => S.closeModal();
  S.actions['k-refresh-report-preview'] = el => {
    const p = S.db.proposals.find(x => x.id === el.dataset.id); if (!ownership(p)) return;
    const c = S.db.cases.find(x => x.id === p.caseId);
    if (!c || c.reportState !== 'confirmed') return S.toast('Cần hoàn tất xác nhận bản đính chính báo cáo trước khi cập nhật nguồn cho đề xuất.', 'warning');
    const bodyHtml = `
      <div class="stack">
        <div class="notice notice-info">
          ${icon('info')}
          <div>Biểu mẫu tri thức bạn đã sửa sẽ được giữ nguyên. Sau khi đổi bản nguồn, bạn cần rà soát lại nội dung, xác nhận và đối chiếu kho trước khi gửi kiểm duyệt.</div>
        </div>
        <div class="modal-report-compare">
          <div class="compare-column">
            <div class="compare-col-header">
              <span class="badge badge-neutral">Bản nguồn trước</span>
              <strong>Revision ${e(p.reportSnapshot?.revision)}</strong>
            </div>
            <div class="compare-col-body">${preserved(p.reportSnapshot?.summary)}</div>
          </div>
          <div class="compare-column">
            <div class="compare-col-header">
              <span class="badge badge-blue">Báo cáo đã xác nhận mới</span>
              <strong>Revision ${e(c.report.revision)}</strong>
            </div>
            <div class="compare-col-body">${preserved(c.report.summary)}</div>
          </div>
        </div>
      </div>
    `;
    S.modal('Đối chiếu bản báo cáo nguồn', bodyHtml, btn('Giữ bản nguồn trước', 'k-close', 'secondary') + btn('Dùng bản nguồn mới & rà lại', 'k-refresh-report-apply', 'primary', 'data-id="' + e(p.id) + '" data-revision="' + e(c.report.revision) + '"'));
  };
  S.actions['k-refresh-report-apply'] = el => {
    const p = S.db.proposals.find(x => x.id === el.dataset.id); if (!ownership(p)) return;
    const c = S.db.cases.find(x => x.id === p.caseId);
    if (!c || c.reportState !== 'confirmed' || c.report.revision !== Number(el.dataset.revision)) return S.toast('Báo cáo nguồn đã đổi. Hãy mở đối chiếu lại.', 'warning');
    if (S.commit(() => {
      p.reportSourceHistory ||= []; p.reportSourceHistory.push({ report: clone(p.reportSnapshot), caseSource: clone(p.caseSourceSnapshot || {}), replacedAt: S.now() });
      p.reportSnapshot = clone(c.report); p.reportSourceAt = c.updatedAt;
      p.caseSourceSnapshot = clone({ id:c.id, title:c.title, assetId:c.assetId, ownerId:c.ownerId, machineState:c.machineState, workState:c.workState, context:c.context, resultEvidence:c.resultEvidence, rounds:c.rounds, pm:c.pm || [], participants:c.participants, reportState:c.reportState });
      p.contributors = [...new Set((c.rounds || []).flatMap(r => r.events || []).map(ev => ev.performedBy).filter(id => id && id !== p.authorId))];
      stamp(p, 'Tác giả cập nhật tham chiếu báo cáo revision ' + c.report.revision + '; giữ biểu mẫu để rà lại');
    }, 'Đã đổi bản nguồn. Rà lại toàn bộ biểu mẫu trước khi xác nhận.', false)) { S.closeModal(); S.go('proposal', p.id, 'form'); }
  };
  S.actions['k-new'] = function () {
    if (S.user().role !== 'expert') return S.toast('Người bảo trì tạo đề xuất từ báo cáo đã xác nhận.', 'error');
    const p = baseProposal(S.user().id, 'expert');
    if (S.commit(() => { S.db.proposals.push(p); addHistory(p, 'draft', 'Tạo bản nháp tri thức chuyên gia'); S.log('proposal.create', p.id); }, null, false)) S.go('proposal', p.id, 'raw');
  };
  S.actions['k-update-source'] = function (el) {
    if (S.user().role !== 'expert') return;
    const k = S.db.knowledge.find(x => x.id === el.dataset.id && x.status === 'published');
    if (!k) return;
    const p = baseProposal(S.user().id, 'expert');
    Object.assign(p, { title: k.title, family: k.family, content: clone(k.content), mode: 'update', targetId: k.id, targetVersion: k.version, causeStatus: k.causeStatus || 'unknown', rawText: 'Đề xuất bổ sung dựa trên ' + k.id + ' phiên bản ' + k.version + '. Tác giả nguồn: ' + S.person(k.authorId) + '.', contributors: [] });
    if (S.commit(() => { S.db.proposals.push(p); addHistory(p, 'draft', 'Tạo đề xuất cập nhật ' + k.id + ' v' + k.version); S.log('proposal.update-draft', p.id, k.id); }, null, false)) S.go('proposal', p.id, 'form');
  };
  S.actions['k-sample'] = function (el) {
    const p = S.db.proposals.find(x => x.id === el.dataset.id); if (!ownership(p)) return;
    S.modal('Dùng ghi chú mô phỏng', '<div class="notice notice-info">Mẫu mô phỏng cho luồng nhập liệu. Nếu đã có nội dung, mẫu được thêm vào cuối và ngăn cách thành chủ đề riêng.</div>' + preserved(sample), btn('Quay lại', 'k-close') + btn('Thêm mẫu vào nội dung', 'k-apply-sample', 'primary', 'data-id="' + e(p.id) + '"'));
  };
  S.actions['k-apply-sample'] = function (el) {
    const p = S.db.proposals.find(x => x.id === el.dataset.id); if (!ownership(p)) return;
    if (S.commit(() => { p.rawText = p.rawText.trim() ? p.rawText + '\n\n---\n\n' + sample : sample; stamp(p, 'Thêm nội dung mẫu có ghi rõ dữ liệu mô phỏng'); }, 'Đã thêm ghi chú mẫu.', false)) { S.closeModal(); S.render(); }
  };
  S.actions['k-structure'] = function (el) {
    const p = S.db.proposals.find(x => x.id === el.dataset.id); if (!ownership(p)) return;
    if (!p.rawText.trim()) return err('Nhập hoặc dán nội dung trước khi sắp xếp.');

    runAiModal({
      title: 'Đang cấu trúc hóa ghi chép hiện trường...',
      subtitle: 'Tự động bóc tách thực thể kỹ thuật & phân loại 5M1E từ nội dung gốc',
      badgeText: 'DENSO AI · KNOWLEDGE EXTRACTION',
      steps: [
        { label: 'Phân tách khối văn bản hiện trường', desc: 'Nhận diện các chủ đề và ranh giới ghi chép (---)' },
        { label: 'Nhận diện thực thể kỹ thuật & 5M1E', desc: 'Trích xuất triệu chứng, điều kiện và nguyên nhân máy' },
        { label: 'Chuẩn hóa cấu trúc SOP Denso 9 tiêu chuẩn', desc: 'Lập bản xem trước và phát hiện các mục còn thiếu' }
      ],
      duration: 1350,
      onComplete: () => {
        const blocks = p.rawText.split(/^\s*---\s*$/m).filter(t => t.trim());
        const parsed = blocks.map(parseRaw);
        const found = parsed.some(x => Object.keys(x.content).length || x.title);
        if (!found) {
          S.modal('Nội dung đã được giữ', '<div class="notice notice-warning">Chưa nhận diện được các mục trong văn bản này. Nội dung gốc vẫn được lưu; có thể điền biểu mẫu hoặc bổ sung nhãn cho từng mục.</div>' + preserved(p.rawText), btn('Giữ nội dung gốc', 'k-close') + btn('Điền biểu mẫu', 'k-manual-from-modal', 'primary'));
          return;
        }
        const body = '<div class="notice notice-info">Xem lại các mục được trích từ nội dung gốc. Các mục thiếu để trống; phần đã chỉnh sửa được giữ nguyên.</div><form data-form="k-apply-structure" data-id="' + e(p.id) + '" data-version="' + p.version + '"><div class="stack">' + parsed.map((x, i) => '<section class="card"><div class="card-body stack"><label class="check-line"><input type="checkbox" name="blocks" value="' + i + '" checked><strong>' + e(x.title || 'Chủ đề ' + (i + 1)) + '</strong></label><div class="source-meta">' + e(x.family || 'Chưa có loại máy') + ' · ' + Object.keys(x.content).length + '/' + fields.length + ' mục có nội dung</div>' + Object.entries(x.content).map(([key, value]) => '<div><strong>' + e(fields.find(f => f[0] === key)?.[1] || key) + '</strong>' + preserved(value) + '</div>').join('') + '<div class="field-hint">Mục thiếu: ' + e(fields.filter(([key]) => !x.content[key]).map(([, label]) => label).join(', ') || 'Không có') + '</div></div></section>').join('') + '<div class="error-summary" tabindex="-1" hidden></div><div class="actions">' + btn('Giữ biểu mẫu hiện tại', 'k-close') + '<button type="submit" class="btn btn-primary">Dùng các chủ đề đã chọn</button></div></div></form>';
        S.modal('Xem trước nội dung theo biểu mẫu', body);
      }
    });
  };
  S.actions['k-manual-from-modal'] = () => { S.closeModal(); S.go('proposal', S.ui.id, 'form'); };
  S.forms['k-apply-structure'] = function (form) {
    const p = S.db.proposals.find(x => x.id === form.dataset.id); if (!ownership(p)) return;
    if (p.version !== Number(form.dataset.version)) return S.error(form, 'Nội dung đã thay đổi. Đóng và sắp xếp lại bản hiện tại.');
    const selected = new FormData(form).getAll('blocks').map(Number);
    if (!selected.length) return S.error(form, 'Chọn ít nhất một chủ đề hoặc giữ biểu mẫu hiện tại.');
    const blocks = p.rawText.split(/^\s*---\s*$/m).filter(t => t.trim());

    // Đóng modal xem trước để hiển thị cửa sổ AI tiến trình
    S.closeModal();

    runAiModal({
      title: 'Đang điền dữ liệu vào biểu mẫu SOP...',
      subtitle: 'Tự động áp dụng dữ kiện vào 9 tiêu chuẩn SOP Denso và hoàn thiện bản nháp',
      badgeText: 'DENSO AI · AUTO-FILL SOP FORM',
      steps: [
        { label: 'Xác thực các chủ đề đã chọn', desc: 'Đồng bộ hóa ' + selected.length + ' khối dữ kiện hiện trường' },
        { label: 'Điền 9 trường kỹ thuật SOP', desc: 'Áp dụng vào Dấu hiệu, Điều kiện, Cách xử lý, An toàn...' },
        { label: 'Cập nhật bản nháp & chuyển trang', desc: 'Lưu thay đổi vào bộ nhớ cục bộ và mở biểu mẫu' }
      ],
      duration: 1300,
      onComplete: () => {
        const ok = S.commit(() => {
          selected.forEach((i, idx) => {
            const data = parseRaw(blocks[i]);
            const dest = idx === 0 ? p : baseProposal(p.authorId, p.origin);
            if (!dest.title && data.title) dest.title = data.title;
            if (!dest.family && familyOptions.includes(data.family)) dest.family = data.family;
            Object.entries(data.content).forEach(([key, value]) => { if (!dest.content[key]) dest.content[key] = value; });
            if (idx > 0) { dest.rawText = blocks[i]; dest.sourceProposalId = p.id; dest.sourceRawSnapshot = p.rawText; dest.caseId = p.caseId; dest.contributors = clone(p.contributors || []); S.db.proposals.push(dest); }
            stamp(dest, 'Áp dụng phần trích xuất có nhãn từ nội dung gốc; cần tác giả kiểm tra');
          });
          S.log('proposal.structure', p.id, selected.length + ' chủ đề được áp dụng');
        }, selected.length > 1 ? 'Đã tạo các nháp riêng. Mở từng nháp tại Đề xuất của tôi để hoàn thiện.' : 'Đã điền các mục vào biểu mẫu SOP; hãy kiểm tra trước khi đối chiếu.', false);

        if (ok) {
          S.go('proposal', p.id, 'form');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });
  };
  S.actions['k-compare'] = function (el) {
    const p = S.db.proposals.find(x => x.id === el.dataset.id); if (!ownership(p)) return;
    const missing = issues(p);
    if (missing.length || !p.authorConfirmed) {
      S.go('proposal', p.id, 'form');
      return err(missing.length ? 'Cần hoàn thiện: ' + missing.join('; ') + '.' : 'Xác nhận đã đọc và kiểm tra biểu mẫu trước khi đối chiếu.');
    }

    runAiModal({
      title: 'Đang đối chiếu tri thức tương đồng...',
      subtitle: 'So khớp vector ngữ nghĩa (Semantic Matching) với cơ sở tri thức đã ban hành',
      badgeText: 'DENSO AI · SEMANTIC VECTOR RETRIEVAL',
      steps: [
        { label: 'Trích xuất đặc trưng & từ khóa SOP', desc: 'Phân tích tiêu đề, triệu chứng và giải pháp kỹ thuật' },
        { label: 'Tìm kiếm nguồn bài học tương đồng', desc: 'Đối chiếu trong họ máy ' + (p.family || 'tương ứng') + ' đã được phê duyệt' },
        { label: 'Xây dựng ma trận sai khác & hoàn tất', desc: 'Đánh giá điểm tương đồng, bổ sung và lệch cách ghi' }
      ],
      duration: 1400,
      onComplete: () => {
        if (S.commit(() => {
          p.comparison = { version: p.version, at: S.now(), sources: candidates(p) };
          addHistory(p, 'compare', 'Đối chiếu kho đã duyệt theo loại máy và từ khóa (mô phỏng)');
          S.log('proposal.compare', p.id);
        }, 'Đã đối chiếu. Đọc nguồn và chọn hướng ghi nhận.', false)) {
          S.go('proposal', p.id, 'compare');
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }
    });
  };
  function submitIssues(p) {
    const list = issues(p);
    if (!p.authorConfirmed) list.push('xác nhận kiểm tra biểu mẫu');
    if (!hasCurrentComparison(p)) list.push('đối chiếu lại nội dung và phiên bản nguồn hiện tại');
    if (!caseSourceCurrent(p)) list.push('đối chiếu lại báo cáo nguồn đã xác nhận mới nhất');
    if (p.mode === 'update' && !p.updateCompleteConfirmed) list.push('xác nhận đã rà toàn bộ nội dung phiên bản kế tiếp');
    if (!(p.rationale || '').trim()) list.push('điểm mới / khác biệt / lý do liên kết');
    if (p.status === 'changes' && !(p.response || '').trim()) list.push('phản hồi với người duyệt');
    if (p.mode === 'link' && p.origin !== 'case') list.push('liên kết chỉ dành cho case công việc');
    if (['update', 'link'].includes(p.mode)) {
      const k = S.db.knowledge.find(k => k.id === p.targetId && k.status === 'published');
      if (!k || k.version !== p.targetVersion) list.push('chọn lại nguồn và phiên bản hiện hành');
      if (k && normalize(k.family) !== normalize(p.family)) list.push('phạm vi loại máy không khớp nguồn mục tiêu');
    }
    const sourceCase = p.origin === 'case' && S.db.cases.find(c => c.id === p.caseId);
    if (p.origin === 'case' && (!sourceCase || sourceCase.reportState !== 'confirmed')) list.push('báo cáo công việc nguồn phải được xác nhận');
    return list;
  }
  S.actions['k-submit-preview'] = function (el) {
    const p = S.db.proposals.find(x => x.id === el.dataset.id); if (!ownership(p)) return;
    const errors = submitIssues(p); if (errors.length) return err('Chưa thể gửi: ' + errors.join('; ') + '.');
    const bodyHtml = `
      <div class="stack">
        <div class="modal-confirm-card">
          <div class="confirm-card-badges">
            ${S.badge(modes[p.mode], 'blue')}
            <span class="badge badge-neutral">Bản đề xuất ${p.version}</span>
          </div>
          <h3 class="confirm-card-title">${e(p.title)}</h3>
          <p class="confirm-card-author">${icon('user')} Tác giả: <strong>${e(S.person(p.authorId))}</strong></p>
        </div>
        <dl class="kv-list">
          <dt>Nguồn gốc</dt><dd>${e(p.caseId || 'Kinh nghiệm chuyên gia')}</dd>
          <dt>Nguồn mục tiêu</dt><dd>${e(p.targetId ? p.targetId + ' · v' + p.targetVersion : 'Tạo tri thức mới')}</dd>
          <dt>Căn cứ đề xuất</dt><dd>${e(p.rationale || 'Chưa ghi')}</dd>
        </dl>
        <div class="notice notice-info">${icon('info')} Bản này sẽ chuyển sang trạng thái chờ duyệt. Chỉ tri thức được phê duyệt chính thức mới xuất hiện trong kho tham khảo.</div>
      </div>
    `;
    S.modal('Xác nhận gửi kiểm duyệt', bodyHtml, btn('Quay lại chỉnh sửa', 'k-close', 'secondary') + btn('Gửi kiểm duyệt', 'k-submit', 'primary', 'data-id="' + e(p.id) + '" data-version="' + p.version + '"'));
  };
  S.actions['k-submit'] = function (el) {
    const p = S.db.proposals.find(x => x.id === el.dataset.id); if (!ownership(p)) return;
    const errors = submitIssues(p); if (p.version !== Number(el.dataset.version)) errors.push('bản đề xuất đã thay đổi');
    if (errors.length) { S.closeModal(); return err('Chưa thể gửi: ' + errors.join('; ') + '.'); }
    const reviewer = S.db.users.find(u => u.role === 'lead' && u.id !== p.authorId && !contributorIds(p).includes(u.id));
    if (!reviewer) return S.toast('Chưa có người duyệt độc lập phù hợp. Bản nháp được giữ để chờ phân công.', 'warning');
    if (S.commit(() => {
      if (p.status === 'changes') { p.version = proposalVersion(p) + 1; if (p.comparison) p.comparison.version = p.version; }
      p.status = 'pending'; p.reviewerId = reviewer.id; p.submittedAt = S.now(); p.updatedAt = S.now(); p.submissions = p.submissions || [];
      p.submissions.push({ id: S.uid('SUB'), at: S.now(), version: p.version, snapshot: clone({ title: p.title, content: p.content, family: p.family, mode: p.mode, targetId: p.targetId, targetVersion: p.targetVersion, contributors: p.contributors, rationale: p.rationale, response: p.response }) });
      addHistory(p, 'submit', 'Gửi ' + modes[p.mode].toLowerCase() + ' đến ' + S.person(reviewer.id));
      S.notice(reviewer.id, 'Có đề xuất cần kiểm duyệt', p.id + ' — ' + p.title, { page: 'review-detail', id: p.id }); S.log('proposal.submit', p.id, 'v' + p.version);
    }, 'Đã gửi kiểm duyệt. Bạn có thể theo dõi phản hồi tại đề xuất này.', false)) { S.closeModal(); S.render(); }
  };
  S.actions['k-withdraw'] = function (el) {
    const p = S.db.proposals.find(x => x.id === el.dataset.id); if (!ownership(p)) return;
    if (!hasCurrentComparison(p) || !p.targetId || !(p.rationale || '').trim()) return err('Đối chiếu bản hiện tại, chọn nguồn đã có và ghi lý do trùng trước khi lưu trữ.');
    const bodyHtml = `
      <div class="stack">
        <div class="notice notice-warning">
          <strong>Lưu trữ đề xuất:</strong> Đề xuất <strong>${e(p.id)}</strong> sẽ được lưu trữ và liên kết tham chiếu tới tri thức đã có <strong>${e(p.targetId)} v${e(p.targetVersion)}</strong>.
        </div>
        <p>Nội dung nháp và lịch sử đóng góp của tác giả vẫn được bảo toàn nguyên trạng trong hệ thống.</p>
        <div class="suggest-box">
          <strong>Lý do lưu trữ / căn cứ trùng lặp:</strong>
          ${preserved(p.rationale)}
        </div>
      </div>
    `;
    S.modal('Lưu trữ đề xuất trùng lặp', bodyHtml, btn('Quay lại', 'k-close', 'secondary') + btn('Xác nhận lưu trữ', 'k-confirm-withdraw', 'primary', 'data-id="' + e(p.id) + '" data-version="' + p.version + '"'));
  };
  S.actions['k-confirm-withdraw'] = function (el) {
    const p = S.db.proposals.find(x => x.id === el.dataset.id); if (!ownership(p)) return;
    if (p.version !== Number(el.dataset.version) || !hasCurrentComparison(p)) return S.toast('Nội dung đã thay đổi; hãy mở lại bước đối chiếu.', 'error');
    if (S.commit(() => { p.status = 'withdrawn'; p.updatedAt = S.now(); addHistory(p, 'withdraw', 'Lưu trữ do trùng với ' + p.targetId + ' v' + p.targetVersion + ': ' + p.rationale); S.log('proposal.withdraw', p.id, p.targetId); }, 'Đã lưu trữ đề xuất trùng; nội dung cũ được giữ.', false)) { S.closeModal(); S.render(); }
  };
  S.actions['k-accept-suggestion'] = function (el) {
    const p = S.db.proposals.find(x => x.id === el.dataset.id); if (!ownership(p)) return;
    if (S.commit(() => { p.content[p.suggestion.field] = p.suggestion.text; p.response = 'Đã đọc và áp dụng nội dung người duyệt đề nghị; tiếp tục kiểm tra toàn bộ bản đề xuất.'; p.suggestion.acceptedAt = S.now(); stamp(p, 'Tác giả áp dụng đề nghị sửa; cần xác nhận và đối chiếu lại'); }, 'Đã áp dụng đề nghị. Kiểm tra và đối chiếu lại trước khi gửi.')) return;
  };

  let pendingDecision = null;
  S.forms['k-decision'] = function (form) {
    const p = S.db.proposals.find(x => x.id === form.dataset.id);
    if (!p || S.user().role !== 'lead' || !independent(p) || p.status !== 'pending') return S.error(form, 'Không đủ quyền hoặc đề xuất không còn chờ duyệt.');
    if (p.version !== Number(form.dataset.version)) return S.error(form, 'Bản đề xuất đã thay đổi. Mở lại trước khi quyết định.');
    const fd = new FormData(form);
    const decision = String(fd.get('decision') || '');
    const feedback = String(fd.get('feedback') || '').trim();
    const suggestField = String(fd.get('suggestField') || '');
    const suggestText = String(fd.get('suggestText') || '').trim();
    const editorialTitle = String(fd.get('editorialTitle') || '').trim();
    const editorialNote = String(fd.get('editorialNote') || '').trim();
    if (!['approve', 'changes', 'reject'].includes(decision) || !feedback || !fd.get('reviewConfirmed')) return S.error(form, 'Chọn quyết định, ghi phản hồi và xác nhận đã xem nguồn.');
    if ((suggestField || suggestText) && (!suggestField || !suggestText || decision !== 'changes')) return S.error(form, 'Đề nghị sửa chuyên môn cần có mục, nội dung và quyết định “Yêu cầu bổ sung”.');
    if (editorialTitle !== p.title && (!editorialTitle || !editorialNote)) return S.error(form, 'Chỉnh tiêu đề cần nội dung hợp lệ và ghi chú biên tập.');
    if (decision === 'approve' && issues(p).length) return S.error(form, 'Bản còn thiếu thông tin: ' + issues(p).join('; ') + '. Hãy yêu cầu bổ sung.');
    if (decision === 'approve' && !caseSourceCurrent(p)) return S.error(form, 'Báo cáo nguồn đã thay đổi. Yêu cầu tác giả đối chiếu với bản đã xác nhận mới trước khi duyệt.');
    const target = S.db.knowledge.find(k => k.id === p.targetId && k.status === 'published');
    if (decision === 'approve' && ['update', 'link'].includes(p.mode) && (!target || target.version !== p.targetVersion)) return S.error(form, 'Phiên bản nguồn đã thay đổi. Yêu cầu tác giả đối chiếu và gửi lại trước khi duyệt.');
    if (decision === 'approve' && p.origin === 'case' && !S.db.cases.some(c => c.id === p.caseId && c.reportState === 'confirmed')) return S.error(form, 'Báo cáo nguồn chưa còn ở trạng thái đã xác nhận. Cần đối chiếu lại với tác giả.');
    pendingDecision = { id: p.id, version: p.version, decision, feedback, suggestField, suggestText, editorialTitle, editorialNote };
    const decisionLabels = { approve: 'Phê duyệt và đưa vào kho', changes: 'Chuyển về tác giả bổ sung', reject: 'Từ chối đề xuất tri thức' };
    const decisionTones = { approve: 'green', changes: 'amber', reject: 'red' };
    const bodyHtml = `
      <div class="stack">
        <div class="modal-confirm-card">
          <div class="confirm-card-badges">
            ${S.badge(decisionLabels[decision], decisionTones[decision] || 'blue')}
            <span class="badge badge-neutral">Bản ${p.version}</span>
          </div>
          <h3 class="confirm-card-title">${e(p.title)}</h3>
        </div>
        <div class="notice notice-info">
          <strong>Ý kiến kiểm duyệt:</strong><br>${e(feedback)}
        </div>
        ${suggestText ? `
          <div class="suggest-box">
            <strong>Đề nghị sửa cụ thể:</strong>
            ${preserved(suggestText)}
          </div>
        ` : ''}
        <p class="field-hint">Quyết định chỉ áp dụng cho đề xuất tri thức; báo cáo và lịch sử công việc nguồn được giữ nguyên.</p>
      </div>
    `;
    S.modal('Xác nhận quyết định kiểm duyệt', bodyHtml, btn('Quay lại', 'k-close', 'secondary') + btn('Xác nhận quyết định', 'k-confirm-decision', 'primary'));
  };
  S.actions['k-confirm-decision'] = function () {
    const d = pendingDecision;
    const p = d && S.db.proposals.find(x => x.id === d.id);
    if (!p || S.user().role !== 'lead' || !independent(p) || p.status !== 'pending' || p.version !== d.version) return S.toast('Đề xuất hoặc quyền đã thay đổi. Mở lại hồ sơ kiểm duyệt.', 'error');
    if (d.decision === 'approve' && !caseSourceCurrent(p)) return S.toast('Báo cáo nguồn đã thay đổi. Cần tác giả đối chiếu và gửi lại.', 'warning');
    const target = S.db.knowledge.find(k => k.id === p.targetId && k.status === 'published');
    if (d.decision === 'approve' && ['update', 'link'].includes(p.mode) && (!target || target.version !== p.targetVersion)) return S.toast('Phiên bản nguồn đã thay đổi. Cần tác giả đối chiếu lại.', 'error');
    const ok = S.commit(() => {
      if (d.editorialTitle !== p.title) { addHistory(p, 'editorial', 'Sửa biên tập tiêu đề: ' + d.editorialNote, { before: p.title, after: d.editorialTitle }); p.title = d.editorialTitle; }
      p.feedback = d.feedback; p.reviewerId = S.user().id; p.reviewedAt = S.now(); p.updatedAt = S.now();
      if (d.decision === 'changes') {
        p.status = 'changes'; p.authorConfirmed = false; p.response = ''; p.suggestion = d.suggestText ? { field: d.suggestField, text: d.suggestText, authorId: S.user().id, at: S.now() } : null;
        addHistory(p, 'changes', 'Yêu cầu bổ sung: ' + d.feedback);
      } else if (d.decision === 'reject') {
        p.status = 'rejected'; addHistory(p, 'reject', 'Từ chối: ' + d.feedback);
      } else {
        const authorContributors = [...new Set([p.authorId, ...contributorIds(p)])];
        if (p.mode === 'link') {
          p.publishedId = target.id; p.publishedVersion = target.version;
          p.approvedLink = { caseId: p.caseId, knowledgeId: target.id, version: target.version, approvedBy: S.user().id, approvedAt: S.now() };
        } else if (p.mode === 'update') {
          const old = clone(target); delete old.history;
          target.history = target.history || []; target.history.push(old);
          Object.assign(target, { title: p.title, family: p.family, content: clone(p.content), causeStatus: p.causeStatus, contributors: [...new Set([target.authorId, ...contributorIds(target), ...authorContributors])], revisionAuthorId: p.authorId, reviewerId: S.user().id, version: Number(target.version) + 1, updatedAt: S.now(), proposalId: p.id, contextDetails: clone(p.contextDetails || {}), changes5m: clone(p.changes5m || {}) });
          p.publishedId = target.id; p.publishedVersion = target.version;
        } else {
          const id = S.uid(p.origin === 'case' ? 'CS' : 'KN');
          S.db.knowledge.push({ id, title: p.title, family: p.family, assetIds: p.caseId ? [S.db.cases.find(c => c.id === p.caseId)?.assetId].filter(Boolean) : [], kind: p.origin === 'case' ? 'case' : 'expert', authorId: p.authorId, reviewerId: S.user().id, contributors: authorContributors, version: 1, status: 'published', updatedAt: S.now(), tags: [], content: clone(p.content), history: [], causeStatus: p.causeStatus, proposalId: p.id, caseId: p.caseId || null, contextDetails: clone(p.contextDetails || {}), changes5m: clone(p.changes5m || {}) });
          p.publishedId = id; p.publishedVersion = 1;
        }
        p.status = 'published'; p.readyAt = S.now(); addHistory(p, 'approve', (p.mode === 'link' ? 'Duyệt liên kết ' : 'Duyệt và xuất bản ') + p.publishedId + ' v' + p.publishedVersion + ': ' + d.feedback);
      }
      S.notice(p.authorId, d.decision === 'approve' ? 'Đề xuất đã được duyệt' : d.decision === 'changes' ? 'Đề xuất cần bổ sung' : 'Đề xuất đã bị từ chối', p.id + ' — ' + d.feedback, { page: 'proposal', id: p.id });
      S.log('proposal.' + d.decision, p.id, d.feedback);
    }, d.decision === 'approve' ? 'Đã duyệt và cập nhật kho tri thức mô phỏng.' : 'Đã lưu quyết định và gửi phản hồi cho tác giả.', false);
    if (ok) { pendingDecision = null; S.closeModal(); S.render(); }
  };
  S.actions['k-case-source'] = function (el) {
    const p = S.db.proposals.find(x => x.id === el.dataset.id);
    if (!accessible(p)) return;
    const liveCase = S.db.cases.find(x => x.id === p.caseId);
    if (!liveCase && !p.caseSourceSnapshot) return S.toast('Không tìm thấy hồ sơ nguồn trong dữ liệu demo.', 'warning');
    const c = p.caseSourceSnapshot || liveCase;
    const report = p.reportSnapshot || c.report || {};
    const sourceNotice = '<div class="notice notice-info">Bản báo cáo nguồn tại thời điểm tạo đề xuất · ' + e(report.id || '') + ' · revision ' + e(report.revision || 1) + '. Kiểm duyệt tri thức không sửa báo cáo hay kết quả công việc này.</div>' + ((liveCase?.report?.revision !== report.revision || liveCase?.reportState !== 'confirmed') ? '<div class="notice notice-warning">Báo cáo hiện tại đang được đính chính hoặc đã có phiên bản khác. Bản nguồn đã chọn được giữ nguyên để đối chiếu; cần xác minh trước khi duyệt tri thức.</div>' : '');
    const raw = typeof report.summary === 'string' ? report.summary : JSON.stringify(report.summary || '', null, 2);
    S.modal(c.id + ' — Báo cáo kỹ thuật nguồn', '<div class="stack">' + sourceNotice + '<h3>' + e(c.title) + '</h3><dl class="kv-list"><dt>Máy</dt><dd>' + e(c.assetId) + '</dd><dt>Người phụ trách</dt><dd>' + e(S.person(c.ownerId)) + '</dd><dt>Trạng thái báo cáo</dt><dd>' + e(c.reportState === 'confirmed' ? 'Đã xác nhận' : c.reportState) + '</dd><dt>Số đợt xử lý</dt><dd>' + (c.rounds || []).length + '</dd></dl><h3>Tổng kết</h3>' + preserved(raw) + '<h3>Nguyên nhân / trạng thái xác minh</h3>' + preserved(report.cause) + '<h3>Bài học</h3>' + preserved(report.lessons) + '<h3>Giới hạn</h3>' + preserved(report.limits) + '<h3>Các đợt và ghi nhận</h3>' + (c.rounds || []).map((r, i) => '<section class="card"><div class="card-body"><h4>Đợt ' + (i + 1) + ' · ' + e(r.id || '') + '</h4>' + preserved(r.summary || r.result || '') + '<div class="stack">' + (r.events || r.entries || []).map(ev => '<div><strong>' + e(S.person(ev.performedBy || ev.performerId || c.ownerId)) + '</strong><span class="source-meta"> · người nhập ' + e(S.person(ev.enteredBy || ev.recordedBy || c.ownerId)) + '</span>' + preserved(ev.content || ev.text || ev.note) + '</div>').join('') + '</div></div></section>').join('') + '</div>', btn('Đóng báo cáo nguồn', 'k-close', 'primary'));
  };
  S.actions['k-submission'] = function (el) {
    const p = S.db.proposals.find(x => x.id === el.dataset.id);
    if (!accessible(p)) return;
    const sub = (p.submissions || []).find(x => x.id === el.dataset.submission);
    if (!sub) return S.toast('Không tìm thấy bản đã gửi.', 'warning');
    const snapshot = sub.snapshot;
    S.modal(p.id + ' · v' + sub.version + ' — Bản chụp lúc gửi', '<div class="stack"><div class="notice notice-info">Bản chụp lúc gửi ' + e(S.fmtDate(sub.at)) + '. Đây là nội dung lịch sử chỉ đọc.</div><h3>' + e(snapshot.title) + '</h3><p>' + e(modes[snapshot.mode]) + ' · ' + e(snapshot.family) + '</p><h3>Căn cứ và phản hồi của tác giả</h3>' + preserved(snapshot.rationale) + preserved(snapshot.response) + contentView(snapshot.content) + '</div>', btn('Đóng bản lịch sử', 'k-close', 'primary'));
  };
  S.createCaseProposal = function (caseRecord) {
    const c = caseRecord && S.db.cases.find(x => x.id === caseRecord.id);
    if (!c || c.reportState !== 'confirmed' || c.ownerId !== S.user().id || S.user().role !== 'maintenance') return S.toast('Chỉ người phụ trách có thể đề xuất từ báo cáo công việc đã xác nhận.', 'error');
    const existing = S.db.proposals.find(p => p.caseId === c.id && p.authorId === S.user().id && ['draft', 'changes', 'pending'].includes(p.status));
    if (existing) { S.toast('Đã có đề xuất cho hồ sơ này; mở bản hiện có để tiếp tục.', 'info'); S.go('proposal', existing.id); return existing.id; }
    const r = c.report || {};
    const asset = S.asset(c.assetId);
    const p = baseProposal(S.user().id, 'case');
    const allEvents = (c.rounds || []).flatMap(round => round.events || round.entries || []);
    const toText = value => typeof value === 'string' ? value : value ? JSON.stringify(value, null, 2) : '';
    const eventLine = ev => toText(ev.content || ev.text || ev.note) + (ev.result ? ' — Kết quả: ' + ev.result : '') + (ev.rationale ? ' — Lý do: ' + ev.rationale : '');
    const eventText = allEvents.filter(ev => ['observation', 'check', 'hypothesis'].includes(ev.type)).map(eventLine).filter(Boolean).join('\n');
    const actionText = allEvents.filter(ev => ev.type === 'action').map(eventLine).join('\n');
    const context = c.context || {};
    const contextText = [['Model máy', asset?.model], ['Model sản phẩm', context.productModel], ['Line', asset?.line], ['Chế độ', context.mode], ['Tốc độ', context.speed], ['Ca', context.shift], ['Môi trường', context.environment], ['Thời điểm', context.onset]].filter(([,value]) => value).map(([label,value]) => label + ': ' + value).join('\n');
    const changeText = (context.changes || []).map(x => x.group + ': ' + ({ changed: 'Có thay đổi', none: 'Chưa ghi nhận thay đổi', unchecked: 'Chưa kiểm tra' }[x.status] || x.status) + (x.detail ? ' — ' + x.detail : '')).join('\n');
    const machineLabel = { restored: 'Đã phục hồi', unrestored: 'Chưa phục hồi', unverified: 'Chưa đủ kiểm chứng' }[c.machineState] || c.machineState;
    const safetyText = (c.selectedSources || []).map(src => S.getKnowledge(src.id, src.version)?.content?.safety).filter(Boolean).join('\n');
    Object.assign(p, { title: c.title, family: asset?.family || '', caseId: c.id, reportSnapshot: clone(r), caseSourceSnapshot: clone(c), reportSourceAt: c.updatedAt, contributors: [...new Set([...(c.participants || []), ...allEvents.map(ev => ev.performedBy || ev.performerId)].filter(id => id && id !== c.ownerId))], rawText: toText(r.summary), content: { symptom: toText(context.symptom || c.symptom || r.symptom || c.title), context: contextText + (changeText ? '\nĐiểm thay đổi 5M1E:\n' + changeText : ''), checks: toText(r.checks || eventText), solution: toText(r.actions || r.solution || actionText), result: machineLabel + (c.resultEvidence ? '\nCăn cứ: ' + c.resultEvidence : ''), cause: toText(r.cause), evidence: 'Báo cáo đã xác nhận ' + c.id + ', ' + r.id + ' revision ' + r.revision + '; ' + (c.rounds || []).length + ' đợt xử lý. Xem bản nguồn để đối chiếu từng ghi nhận.', safety: toText(r.safety || safetyText), limits: toText(r.limits || '') }, contextDetails: { machineModel: asset?.model || '', productModel: context.productModel || '', mode: context.mode || '', speed: context.speed || '', line: asset?.line || '', shift: context.shift || '' }, changes5m: Object.fromEntries((context.changes || []).flatMap((x,i) => [['m'+i,x.status],['d'+i,x.detail||'']])), causeStatus: r.causeStatus || 'unknown', rationale: toText(r.lessons) });
    if (S.commit(() => { S.db.proposals.push(p); addHistory(p, 'draft', 'Tạo đề xuất từ báo cáo đã xác nhận ' + c.id + '; giữ bản chụp báo cáo nguồn'); S.log('proposal.from-case', p.id, c.id); }, 'Đã tạo nháp tri thức. Kiểm tra, bổ sung và đối chiếu trước khi gửi.', false)) { S.go('proposal', p.id, 'form'); return p.id; }
  };
})();
