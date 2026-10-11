# Shared implementation contract — 09/10/2026

Offline vanilla HTML/CSS/JS prototype. No third-party dependency. Root index.html loads prototype/core.js, prototype/data.js, prototype/knowledge.js, prototype/cases.js, app.js and prototype/demo-guide.js (in that order). app.js starts after all business registrations; the guide then wraps render to observe real navigation. No modules/import/fetch: works with file:// and local server. All AI, accounts and HozenDX data are explicitly simulated.

## Global API: window.SM

- `SM.db`: schema=3, revision, users, assets, knowledge, proposals, cases, notifications, audit, drafts. Shared arrays mutable only inside `SM.commit(fn, message?, rerender=true)`; fn synchronously mutates SM.db; commit returns boolean, saves localStorage with revision conflict checks, rollback on error; optional toast; rerender by default. No nested commit. `SM.seed(fn)` runs initialization before start; modules can seed their own arrays if `db.seededCases` etc absent.
- `SM.user()` → current `{id,name,role,initials}` (roles maintenance, expert, lead). IDs `u-minh`, `u-hai`, `u-anh`. Other maint `u-lan`, other expert `u-nam` may be seeded if needed.
- `SM.ui` route `{page,id,tab}`; `SM.go(page,id?,tab?)`; `SM.render()` shell render. `SM.pages[name] = {title,roles:[...],render:()=>html}`. No route allowed unless user role allowed.
- `SM.actions[name] = (element,event)=>{}` for `[data-action]`; `SM.forms[name] = (form,event)=>{}` for form `[data-form]`; `SM.inputs[name] = (element,event)=>{}` for `[data-input]` input/change events. Use event delegation, no inline JavaScript.
- `SM.escape(value)` HTML escapes; aliases `SM.e`; `SM.icon(name)` inline svg; `SM.badge(text,tone='neutral')`; `SM.empty(title,text,extraHtml='')`; `SM.button(label,action,style='secondary',attrs='')`. Buttons type=button except explicit submit.
- `SM.field(label,name,value='',options={})`: labeled text input, options type, placeholder, required, hint, disabled, attrs. `SM.area(...)` same textarea rows. Prefer explicit markup for select/radio when needed. `SM.field` HTML only, no persistence unless wired.
- `SM.fmtDate(iso,withTime=true)`; `SM.now()` ISO; `SM.uid(prefix)` unique; `SM.person(id)` display name; `SM.asset(id)`; `SM.byId(array,id)`.
- `SM.toast(text,tone='success')`; `SM.modal(title,bodyHtml,footerHtml='')`; `SM.closeModal()`; native `<dialog>` with focus restore, cancel support. `SM.error(formOrElement, text)` sets visible error summary and focuses it. `SM.notice(userId,title,body,route={page,id,tab})` pushes internal notification (inside commit only); `SM.log(action,entityId,detail='')` appends audit with current actor (inside commit).
- `SM.storageOK`, `SM.savedAt`. Draft persistence: use commit with rerender=false to avoid lost cursor. Inputs mark source comparisons stale after content change. Root core updates `[data-save-state]` after commit, pending/error states truthful.
- `SM.getKnowledge(id,version?)` returns a published current/historical snapshot; unpublished drafts never eligible for RAG.
- `SM.createCaseProposal(caseRecord)` exported by knowledge module: only confirmed reports; creates draft and navigates to proposal editor. Does not publish. Cases module invokes if available.

## Shared model

Users: `{id,name,role,initials}`. Assets: `{id,name,family,maker,model,year,line,specs,sourceAt,sourceState,pmTemplate:{id,version,name,items:[{id,label,unit,criterion}]},references:[{id,title,version,type,summary}],history:[{id,date,type,summary}]}`. Asset IDs: VIS-01 (Vision inspection), CNC-04 (CNC), PRESS-02 (press). Data fictional. Source state is historical; does not determine observed current state. No live alarm, PM schedule, sync success.

Knowledge: `{id,title,family,assetIds:[],kind:'expert'|'case',authorId,reviewerId,contributors:[],version,status:'published',updatedAt,tags:[],content:{symptom,context,checks,solution,result,safety,limits,cause,evidence},history:[]}`. Families `Vision`, `CNC`, `Máy ép`. Published examples `KN-024` Vision camera symptom, `CS-112` Vision past case, `KN-031` CNC. Safety example text always points to approved procedure verification and is demo data, not real operating instruction.

Cases modules own details, share header `{id,assetId,title,type:'BM'|'PM',ownerId,expertId,machineState:'unverified'|'restored'|'unrestored',workState:'active'|'waiting'|'ended',reportState:'draft'|'pending'|'changes'|'confirmed',updatedAt,rounds:[],report:{summary,cause,causeStatus,lessons,limits,...}}`.

Proposals modules own details, share header `{id,title,authorId,contributors:[],origin:'expert'|'case',caseId,status:'draft'|'pending'|'changes'|'rejected'|'published'|'withdrawn',content:{...knowledge content},family,mode:'new'|'update'|'link',targetId,targetVersion,feedback,version}`. For case proposals author=owner and contributors actual expert participants. Lead cannot self-review/coauthored proposals.

## Routes

Root: dashboard (all), notifications (all), integration (all), guide (all).
Cases module: cases (maintenance/expert), new-case (maintenance), case (maintenance/expert), assignments (expert). case tabs context, sources, work, report. Maintenance owns writes; experts only assigned participation/confirmation; others view appropriately. Finished work reopens report.
Knowledge module: library (all), knowledge-detail (all), proposals (expert/maintenance), proposal (expert/maintenance), review (lead), review-detail (lead). Maint can only create proposal from own confirmed case; expert create expertise. Use `SM.ui.id` for detail. Root nav only shows own role modules.

## UI class vocabulary (shared CSS)

`page-head`, `eyebrow`, `subtext`, `actions`, `btn`, `btn-primary`, `btn-secondary`, `btn-ghost`, `btn-danger`, `btn-small`, `icon-btn`, `badge`, `badge-neutral/blue/green/amber/red/purple`, `card`, `card-head`, `card-body`, `section-title`, `grid-2`, `grid-3`, `stack`, `split-layout` (main + aside), `field`, `field-label`, `field-hint`, `field-error`, `form-grid`, `span-2`, `input`, `textarea`, `select`, `check-line`, `radio-card`, `notice`, `notice-info/warning/success/danger`, `divider`, `list`, `list-item`, `table-wrap`, `data-table`, `empty-state`, `tabs`, `tab`, `active`, `stepper`, `step`, `timeline`, `timeline-item`, `timeline-dot`, `timeline-content`, `muted`, `mono`, `source-card`, `source-meta`, `stat-grid`, `stat-card`, `save-state`, `sticky-actions`, `error-summary`, `kv-list`, `status-strip`, `avatar`, `avatar-small`. Forms 16px, touch controls >=44px. Every interactive control has actual behavior or explanatory disabled state; no placeholder buttons.

## Product requirements

Follow docs/sequence/optimized-flow-contract.md. Single text box typing/paste; no meeting import or voice yet. AI simulated deterministic examples explicitly labeled, never claim semantic inference on arbitrary text. Human verifies. Expert pre-submit compare new/update/cancel. Review decisions require rationale; substantive edits go back to author; version lineage. Sources displayed before AI summary, applicability based on match/difference/unknown, no confidence percent. Work case one ID many rounds with failures. Worker records performer separately; expert confirms own grouped contributions; unchanged confirmation reusable; content changes invalidate affected confirmation. Machine/work/report states independent. Report preserves all rounds and unknown root cause. AI draft not auto overwrite manual report. Finish unresolved requires authorized responsible-person decision plus reason; wait parts remains open. Hozen simulated read only, stale/source visible, PM templates local configured, no writeback. Proposals distinct from historical work/report, only approved knowledge searchable.
