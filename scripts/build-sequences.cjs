// Native, editable draw.io sequence diagrams. Uses Node built-ins only.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ROOT = path.resolve(__dirname, '..');
const SOURCE = 'denso-maintenance-workflows-BPMN.drawio';
const OUT = 'denso-maintenance-sequences.drawio';
const OUTDIR = path.join(ROOT, 'docs', 'sequence');
const xml = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '&#xa;');
const decode = s => String(s || '').replace(/&#xa;|&#10;/gi,'\n').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
const plain = s => decode(s).replace(/<br\s*\/?\s*>|<\/div>|<\/p>/gi,'\n').replace(/<[^>]*>/g,'').trim();
function wrap(s, chars=38) {
  return String(s).split('\n').flatMap(line=>{
    const lines=[]; let current='';
    for(const word of line.split(/\s+/)) {if(current && (current+' '+word).length>chars){lines.push(current);current=word;}else current+=(current?' ':'')+word;}
    lines.push(current);return lines;
  });
}
const ACTORS = {
  user: ['Người dùng','actor','#eaf1fb'], worker: ['Người bảo trì','actor','#eaf1fb'],
  expert: ['Chuyên gia','actor','#e8f5f0'], reviewer: ['Chuyên gia trưởng','actor','#fff2dc'],
  author: ['Người gửi đề xuất','actor','#e8f5f0'], ui: ['Giao diện web','boundary','#eaf1fb'],
  expertui: ['Web của chuyên gia','boundary','#e8f5f0'], authorui: ['Web của người gửi','boundary','#e8f5f0'],
  svc: ['Nghiệp vụ / phân quyền','control','#f1f3f6'], db: ['Dữ liệu nghiệp vụ\n& nhật ký','entity','#f1f3f6'],
  ai: ['AI / RAG','control','#f2edfa'], kb: ['Kho tri thức đã duyệt\n& chỉ mục tra cứu','entity','#f2edfa'],
  notice: ['Thông báo trong web','control','#f1f3f6'],
  hozen: ['HozenDX tích hợp\n(dữ liệu theo quyền)','entity','#eaf2f4'],
};
class Sequence {
  constructor(id,title,actors,meta) {
    Object.assign(this,{id,title,actors,meta});this.items=[];this.cards=[];this.frames=[];
    this.y=350;this.sideY=350;this.counter=0;this.stack=[];
    this.chartRight=120+(actors.length-1)*285+125;
    this.sideX=this.chartRight+40;this.width=this.sideX+570;
  }
  x(id){const i=this.actors.indexOf(id);if(i<0)throw Error(`${this.id}: unknown participant ${id}`);return 120+i*285;}
  m(from,to,text,kind='call') {
    this.x(from);this.x(to);
    const available=from===to?220:Math.abs(this.x(from)-this.x(to))-32;
    const lines=wrap(`${this.id}.${String(++this.counter).padStart(2,'0')}  ${text}`,Math.max(25,Math.floor(available/7.7)));
    const height=Math.max(68,lines.length*19+28)+(from===to?20:0);
    this.items.push({type:'message',from,to,text,kind,lines,y:this.y,height,number:`${this.id}.${String(this.counter).padStart(2,'0')}`,context:this.stack.map(f=>`${f.kind}: ${f.guard}`).join(' / ')});
    this.y+=height;return this;
  }
  r(from,to,text){return this.m(from,to,text,'reply');}
  async(from,to,text){return this.m(from,to,text,'async');}
  phase(title){this.y=Math.max(this.y,this.sideY)+24;this.items.push({type:'phase',title,y:this.y});this.y+=58;return this;}
  ui(title,text) {
    const lines=wrap(text,65),h=56+lines.length*20;
    const y=Math.max(this.y,this.sideY);
    this.cards.push({title,text,lines,y,h});this.sideY=y+h+18;return this;
  }
  note(text) {const lines=wrap(text,Math.floor((this.chartRight-80)/7.8));const h=lines.length*20+28;this.items.push({type:'note',text,lines,y:this.y,h,context:this.stack.map(f=>`${f.kind}: ${f.guard}`).join(' / ')});this.y+=h+20;return this;}
  ref(target,text){this.items.push({type:'ref',target,text,y:this.y,context:this.stack.map(f=>`${f.kind}: ${f.guard}`).join(' / ')});this.y+=86;return this;}
  fragment(kind,branches){
    const f={kind,start:this.y,depth:this.stack.length,branches:[]};this.frames.push(f);
    for(const [guard,fn] of branches){f.branches.push({guard,y:this.y});this.stack.push({kind,guard});this.y+=57;fn(this);this.stack.pop();this.y+=14;}
    f.end=this.y;this.y+=22;return this;
  }
  alt(branches){return this.fragment('alt',branches);}
  opt(guard,fn){return this.fragment('opt',[[guard,fn]]);}
  loop(guard,fn){return this.fragment('loop',[[guard,fn]]);}
  stop(text){return this.fragment('break',[['Dừng lần tương tác hiện tại',s=>s.note(text)]]);}
  finish(){if(this.stack.length)throw Error('Unclosed fragment');this.height=Math.max(this.y,this.sideY)+140;return this;}
}
const sequences = require('./sequence-optimized.cjs')({Sequence});
sequences.forEach(s=>s.finish());

const bpmn = fs.readFileSync(path.join(ROOT,SOURCE),'utf8');
const sourceHash=crypto.createHash('sha256').update(bpmn).digest('hex');
const sourcePages=[];
for(const d of bpmn.matchAll(/<diagram\b([^>]*)>([\s\S]*?)<\/diagram>/g)) {
  const attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(a=>[a[1],decode(a[2])]));
  const p={...attrs(d[1]),nodes:[],edges:[]};
  const cells=[...d[2].matchAll(/<mxCell\b([^>]*?)(?:\/>|>([\s\S]*?)<\/mxCell>)/g)].map(m=>attrs(m[1]));
  for(const c of cells){
    if(c.edge==='1')p.edges.push({id:c.id,from:c.source,to:c.target,label:plain(c.value||cells.filter(x=>x.parent===c.id).map(x=>x.value).join(' '))});
    else if(c.vertex==='1')p.nodes.push({id:c.id,parent:c.parent,label:plain(c.value),style:c.style});
  }
  sourcePages.push(p);
}
const sourceIds=new Set(sourcePages.flatMap(p=>p.nodes.map(n=>n.id)));
const sequenceIds=new Set(sequences.map(s=>s.id));
for(const s of sequences){
  for(const id of s.meta.bpmn||[])if(!sourceIds.has(id))throw Error(`Source node missing ${s.id}: ${id}`);
  for(const i of s.items)if(i.type==='ref'&&!sequenceIds.has(i.target))throw Error(`Missing sequence ${i.target}`);
}

class Canvas {
  constructor(w,h){this.w=w;this.h=h;this.cells=['<mxCell id="0"/>','<mxCell id="1" parent="0"/>'];this.parts=[];this.serial=0;}
  id(){return `v${++this.serial}`;}
  rect(id,x,y,w,h,text='',style='',parent='1',link){
    this.cells.push(`<mxCell id="${id}" value="${xml(text)}" style="${style}" vertex="1" parent="${parent}"${link?` link="data:page/${link}"`:''}><mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/></mxCell>`);
  }
  box(x,y,w,h,fill,stroke,rx=0){this.parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`);}
  text(x,y,w,h,lines,size=15,align='middle',bold=false,color='#24364b'){
    if(!Array.isArray(lines))lines=String(lines).split('\n');
    const lineH=size*1.3;
    this.parts.push(`<text font-family="Arial,sans-serif" font-size="${size}" font-weight="${bold?700:400}" fill="${color}" text-anchor="${align}">${lines.map((s,i)=>`<tspan x="${align==='start'?x:x+w/2}" y="${y+h/2-(lines.length-1)*lineH/2+size*.34+i*lineH}">${xml(s)}</tspan>`).join('')}</text>`);
  }
  line(x1,y1,x2,y2,dashed=false,arrow){this.parts.push(`<path d="M${x1} ${y1}L${x2} ${y2}" stroke="#526579" stroke-width="1.4" fill="none"${dashed?' stroke-dasharray="6 5"':''}${arrow?` marker-end="url(#${arrow})"`:''}/>`);}
  edge(id,source,target,label,y,kind,points,style=''){
    const dashed=kind==='reply',arrow=kind==='call'?'block':'open';
    const geometry=points.map(([x,py],i)=>`<mxPoint x="${x}" y="${py}" as="${i===0?'sourcePoint':'targetPoint'}"/>`).join('');
    this.cells.push(`<mxCell id="${id}" value="${xml(label)}" style="edgeStyle=none;html=0;rounded=0;endArrow=${arrow};endFill=${kind==='call'?1:0};dashed=${dashed?1:0};strokeColor=#526579;strokeWidth=1.4;fontFamily=Arial;fontSize=15;${style}" edge="1" parent="1"${source?` source="${source}" target="${target}"`:''}><mxGeometry relative="1" as="geometry">${geometry}</mxGeometry></mxCell>`);
  }
  model(id,name){return `<diagram id="${id}" name="${xml(name)}"><mxGraphModel grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${this.w}" pageHeight="${this.h}"><root>${this.cells.join('\n')}</root></mxGraphModel></diagram>`;}
  svg(title){return `<svg xmlns="http://www.w3.org/2000/svg" width="${this.w}" height="${this.h}" viewBox="0 0 ${this.w} ${this.h}" role="img" aria-label="${xml(title)}"><defs><marker id="block" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#526579"/></marker><marker id="open" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10" fill="none" stroke="#526579" stroke-width="1.4"/></marker></defs><rect width="100%" height="100%" fill="white"/>${this.parts.join('\n')}</svg>`;}
}
const TXT='text;html=0;whiteSpace=wrap;fontFamily=Arial;fontSize=15;fontColor=#24364b;strokeColor=none;fillColor=none;';
function label(c,x,y,w,h,text,size=15,bold=false,align='left',fill='none'){
  c.rect(c.id(),x,y,w,h,text,TXT+`fontSize=${size};fontStyle=${bold?1:0};align=${align};verticalAlign=middle;fillColor=${fill};`);
  if(fill!=='none')c.box(x,y,w,h,fill,'none');c.text(x,y,w,h,text,size,align==='left'?'start':'middle',bold);
}
function render(s){
  const c=new Canvas(s.width,s.height);
  label(c,28,18,s.width-60,48,`${s.id} · ${s.title}`,28,true);
  label(c,28,70,s.width-60,44,wrap(`Đầu vào: ${s.meta.pre}`,145).join('\n'),16);
  label(c,28,121,s.width-60,44,wrap(`Kết quả: ${s.meta.post}`,145).join('\n'),16);
  label(c,28,171,s.width-60,26,'Thời gian: trên → dưới  |  Liền: yêu cầu/thao tác  |  Đứt: trả kết quả  |  alt: chọn nhánh  ·  opt: tùy điều kiện  ·  loop: lặp  ·  break: dừng  ·  ref: xem trang liên quan',14);
  label(c,s.sideX,222,540,66,'ĐẶC TẢ GIAO DIỆN\nThông tin hiển thị · nút bấm · thông báo',18,true);
  // Combined-fragment frames are behind messages and lifelines.
  const guards=[];
  for(const f of s.frames){
    const x=24+f.depth*9,w=s.chartRight-x+8;
    c.rect(c.id(),x,f.start,w,f.end-f.start,'','rounded=0;fillColor=none;strokeColor=#8d9aa9;strokeWidth=1;');
    c.box(x,f.start,w,f.end-f.start,'none','#8d9aa9');
    f.branches.forEach((b,j)=>{
      if(j){c.edge(c.id(),null,null,'',b.y,'reply',[[x,b.y],[x+w,b.y]],'endArrow=none;');c.line(x,b.y,x+w,b.y,true);}
      guards.push({x,y:b.y,w,kind:j?'else':f.kind,guard:b.guard});
    });
  }
  for(const a of s.actors){
    const [name,type,fill]=ACTORS[a],x=s.x(a),h=s.height-270;
    c.rect(`participant-${a}`,x-105,220,210,h,'','group;fillColor=none;strokeColor=none;connectable=0;');
    c.rect(`head-${a}`,0,0,210,102,`${type==='actor'?'«actor»':`«${type}»`}\n${name}`,`rounded=0;html=0;whiteSpace=wrap;fontFamily=Arial;fontSize=16;fontStyle=1;fillColor=${fill};strokeColor=#687d94;` ,`participant-${a}`);
    c.box(x-105,220,210,102,fill,'#687d94');c.text(x-100,220,200,102,[`«${type}»`,...name.split('\n')],16,'middle',true);
    c.cells.push(`<mxCell id="life-${a}" style="endArrow=none;dashed=1;dashPattern=6 5;strokeColor=#a0adba;" edge="1" parent="participant-${a}"><mxGeometry relative="1" as="geometry"><mxPoint x="105" y="102" as="sourcePoint"/><mxPoint x="105" y="${h-15}" as="targetPoint"/></mxGeometry></mxCell>`);
    c.line(x,322,x,s.height-65,true);
  }
  for(const g of guards){
    label(c,g.x+7,g.y+5,64,32,g.kind,15,true,'center','#eef2f6');
    label(c,g.x+85,g.y+4,g.w-95,42,wrap(`[${g.guard}]`,Math.floor((g.w-100)/8)).join('\n'),15,true,'left','#ffffff');
  }
  for(const item of s.items){
    if(item.type==='phase'){
      c.rect(c.id(),24,item.y,s.chartRight-16,42,item.title,'rounded=0;html=0;whiteSpace=wrap;align=left;spacingLeft=12;fontFamily=Arial;fontSize=17;fontStyle=1;fillColor=#eaf1f8;strokeColor=#ccd8e5;');
      c.box(24,item.y,s.chartRight-16,42,'#eaf1f8','#ccd8e5');c.text(36,item.y,s.chartRight-40,42,item.title,17,'start',true);
    } else if(item.type==='note'||item.type==='ref'){
      const ref=item.type==='ref',h=ref?66:item.h,fill=ref?'#edf5f0':'#fffbe8';
      const t=ref?`ref ${item.target} · ${item.text}`:item.lines.join('\n');
      c.rect(c.id(),45,item.y,s.chartRight-60,h,t,`rounded=0;html=0;whiteSpace=wrap;align=left;spacing=12;fontFamily=Arial;fontSize=15;fillColor=${fill};strokeColor=${ref?'#719485':'#d4c77b'};`,'1',ref?item.target:undefined);
      c.box(45,item.y,s.chartRight-60,h,fill,ref?'#719485':'#d4c77b');c.text(57,item.y,s.chartRight-84,h,wrap(t,Math.floor((s.chartRight-100)/8)),15,'start');
    } else {
      const {from,to,lines,y,kind}=item;const fromX=s.x(from),toX=s.x(to),arrowY=y+lines.length*19+9;
      const point=(actor,py,suffix)=>{const id=`${item.number}-${suffix}`;c.rect(id,104.5,py-220-.5,1,1,'','opacity=0;strokeColor=none;fillColor=none;',`participant-${actor}`);return id;};
      const source=point(from,arrowY,'s'),target=point(to,from===to?arrowY+20:arrowY,'t');
      if(from!==to){
        c.edge(c.id(),source,target,'',arrowY,kind,[[fromX,arrowY],[toX,arrowY]]);
        c.line(fromX,arrowY,toX,arrowY,kind==='reply',kind==='call'?'block':'open');
        label(c,Math.min(fromX,toX)+12,y,Math.abs(fromX-toX)-24,lines.length*19,lines.join('\n'),15,false,'center','#ffffff');
      }else{
        c.cells.push(`<mxCell id="${c.id()}" style="edgeStyle=none;endArrow=block;strokeColor=#526579;" edge="1" parent="1" source="${source}" target="${target}"><mxGeometry relative="1" as="geometry"><Array as="points"><mxPoint x="${fromX+65}" y="${arrowY}"/><mxPoint x="${fromX+65}" y="${arrowY+20}"/></Array></mxGeometry></mxCell>`);
        c.parts.push(`<path d="M${fromX} ${arrowY}H${fromX+65}V${arrowY+20}H${fromX}" fill="none" stroke="#526579" marker-end="url(#block)"/>`);
        label(c,fromX+12,y,248,lines.length*19,lines.join('\n'),15,false,'left','#ffffff');
      }
    }
  }
  for(const card of s.cards){
    c.rect(c.id(),s.sideX,card.y,540,card.h,'','rounded=1;arcSize=6;fillColor=#f7f9fc;strokeColor=#cbd5e1;');
    c.box(s.sideX,card.y,540,card.h,'#f7f9fc','#cbd5e1',7);
    label(c,s.sideX+15,card.y+10,510,32,card.title,17,true);
    label(c,s.sideX+15,card.y+49,510,card.h-60,card.lines.join('\n'),15);
  }
  label(c,28,s.height-43,s.width-60,30,`Nguồn: ${SOURCE}  |  BPMN: ${(s.meta.bpmn||[]).join(', ')||'Luồng hỗ trợ prototype'}  |  Xem 00 · Bản đồ để chọn tình huống.`,12);
  return c;
}
function overview(){
  const overviewRows=Math.ceil(sequences.length/3),notesTop=270+overviewRows*225;
  const c=new Canvas(2260,notesTop+490);
  label(c,40,25,2170,56,'DENSO · BIỂU ĐỒ TUẦN TỰ CHO PROTOTYPE',30,true);
  label(c,40,90,2170,60,`${sequences.length} sequence chi tiết · 3 vai trò người dùng · Hồ sơ → các đợt → ghi nhanh → AI báo cáo → xác nhận → tri thức\nĐọc các trang theo thứ tự hoặc bấm vào thẻ để mở tình huống tương ứng.`,18);
  label(c,40,164,2170,46,`Nguồn đã đọc: ${SOURCE} · SHA-256 ${sourceHash.slice(0,16)}…`,15);
  sequences.forEach((s,i)=>{
    const col=i%3,row=Math.floor(i/3),x=40+col*740,y=240+row*225;
    c.rect(c.id(),x,y,710,199,`${s.id} · ${s.title}\n\n${s.meta.short}\n\nBấm để mở sequence`, 'rounded=1;arcSize=8;html=0;whiteSpace=wrap;align=left;spacing=18;fontFamily=Arial;fontSize=18;fillColor=#eef4fa;strokeColor=#94abc3;','1',s.id);
    c.box(x,y,710,199,'#eef4fa','#94abc3',10);c.text(x+20,y+12,670,175,wrap(`${s.id} · ${s.title}\n\n${s.meta.short}\nBấm tên trang trong draw.io để mở.`,66),17,'start');
  });
  const texts=[
    'Cách đọc: thời gian từ trên xuống; các cột là đối tượng tham gia. Mũi tên là yêu cầu và phản hồi. alt chọn một nhánh; opt tùy điều kiện; loop lặp; break dừng lần tương tác; ref gọi sequence khác.',
    'Luồng đã chốt: cùng caseId qua nhiều roundId; giữ ghi nhận chưa hiệu quả. Người bảo trì hỗ trợ và ghi nhanh khi chuyên gia xử lý; chuyên gia xác nhận theo nhóm. SQ16 mô tả mẫu ghi nhanh.',
    'Khung bên phải là đặc tả giao diện: dữ liệu cần hiện, nút bấm, kiểm tra đầu vào và câu thông báo mẫu. Chi tiết về đăng nhập, lỗi lưu, phiên hết hạn và xung đột là đề xuất bổ sung cho prototype.',
    'HozenDX điền dữ liệu BM/PM nếu được cung cấp; lịch/API/trạng thái tức thời chưa được Q&A xác nhận. Ba trạng thái riêng: máy, công việc, báo cáo. AI soạn nháp từ dữ kiện, người dùng xác nhận. Giọng nói là hướng mở rộng.',
    'Dùng thêm docs/sequence/prototype-spec.md để đọc đầy đủ từng thông điệp, màn hình và nhánh; docs/sequence/README.md có bảng phân quyền, trạng thái và ánh xạ BPMN.',
  ];
  texts.forEach((t,i)=>label(c,45,notesTop+i*86,2160,74,wrap(t,170).join('\n'),16));
  return c;
}
const covered = new Set(sequences.flatMap(s=>s.meta.bpmn||[]));
const sourceMap=sourcePages.map(p=>({id:p.id,name:p.name,nodes:p.nodes.filter(n=>!n.id.endsWith('-label')&&!n.id.endsWith('-hint')&&!/^note-|^(title|subtitle|legend|footer|pool|ai|expert|worker|reviewer|hozen)$/.test(n.id)&&!n.style?.includes('edgeLabel')).map(n=>({id:n.id,label:n.label,sequences:sequences.filter(s=>(s.meta.bpmn||[]).includes(n.id)).map(s=>s.id)})),edges:p.edges}));
const uncovered=sourceMap.flatMap(p=>p.nodes.filter(n=>!covered.has(n.id)));
if(uncovered.length)throw Error(`Unmapped BPMN nodes: ${uncovered.map(n=>n.id).join(', ')}`);
fs.mkdirSync(OUTDIR,{recursive:true});
const archive=fs.readFileSync(path.join(ROOT,'docs/diagram-archive/2026-10-08-before-optimization',OUT),'utf8');
const preservedPages=new Map([...archive.matchAll(/<diagram\b([^>]*)>[\s\S]*?<\/diagram>/g)].map(m=>[m[1].match(/\bid="([^"]*)"/)?.[1],m[0]]));
const preserve=new Set(['SQ01','SQ03','SQ04','SQ05','SQ06','SQ07','SQ14','SQ15']);
const cover=overview();const pages=[cover.model('sequence-map','00 · Bản đồ sequence')];
fs.writeFileSync(path.join(OUTDIR,'00-map.svg'),cover.svg('Bản đồ sequence'));
for(const s of sequences){const c=render(s);pages.push(preserve.has(s.id)&&preservedPages.has(s.id)?preservedPages.get(s.id):c.model(s.id,`${s.id.slice(2)} · ${s.title}`));fs.writeFileSync(path.join(OUTDIR,`${s.id}.svg`),c.svg(s.title));}
fs.writeFileSync(path.join(ROOT,OUT),`<mxfile host="app.diagrams.net" agent="Codex" type="device" pages="${pages.length}">\n${pages.join('\n')}\n</mxfile>\n`,'utf8');
fs.writeFileSync(path.join(OUTDIR,'source-map.json'),JSON.stringify({source:SOURCE,sha256:sourceHash,pages:sourceMap},null,2));
let md=`# Đặc tả tương tác cho prototype DENSO\n\nLuồng tối ưu đã chốt ngày 08/10/2026: một hồ sơ, nhiều đợt, mẫu ghi nhanh, AI tổng kết, xác nhận đóng góp và duyệt tri thức.\n\nNguồn: \`${SOURCE}\`. SHA-256: \`${sourceHash}\`. Q&A nhà máy bổ sung trường biểu mẫu, 5M1E và dữ liệu HozenDX; lịch PM/API/tức thời là điều kiện tích hợp, không phải khả năng đã xác nhận.\n\nNội dung được xuất cùng file \`${OUT}\`; mã thông điệp SQxx.nn dùng để đối chiếu với sơ đồ. Đây là thiết kế phục vụ prototype, chưa phải chức năng đã lập trình. Thành phần logic không quy định công nghệ hoặc tách microservice. Xem thêm [dữ liệu và trạng thái đã chốt](optimized-flow-contract.md).\n\n`;
for(const s of sequences){
  md+=`<a id="${s.id.toLowerCase()}"></a>\n\n## ${s.id} — ${s.title}\n\n- Đầu vào: ${s.meta.pre}\n- Kết quả: ${s.meta.post}\n- BPMN: ${(s.meta.bpmn||[]).map(x=>'`'+x+'`').join(', ')||'Luồng hỗ trợ prototype.'}\n- Xem [SVG](${s.id}.svg).\n\n### Màn hình và phản hồi\n\n`;
  for(const card of s.cards)md+=`#### ${card.title}\n\n${card.text.split('\n').map(x=>'- '+x).join('\n')}\n\n`;
  md+='### Thứ tự tương tác\n\n| Bước | Từ → đến | Nội dung | Điều kiện / ngữ cảnh |\n| --- | --- | --- | --- |\n';
  for(const i of s.items){
    const safe=t=>String(t||'').replace(/\|/g,'/').replace(/\n/g,'<br>');
    if(i.type==='message')md+=`| ${i.number} | ${safe(ACTORS[i.from][0])} → ${safe(ACTORS[i.to][0])} | ${safe(i.text)} | ${safe(i.context)||'Luồng chung'} |\n`;
    else if(i.type==='ref')md+=`| ref | [${i.target}](#${i.target.toLowerCase()}) | ${safe(i.text)} | ${safe(i.context)||'Luồng chung'}; quay lại khi có kết quả phù hợp. |\n`;
    else if(i.type==='note')md+=`| Ghi chú | — | ${safe(i.text)} | ${safe(i.context)||'—'} |\n`;
    else if(i.type==='phase')md+=`| **Giai đoạn** | — | **${safe(i.title)}** | — |\n`;
  }
  md+='\n';
}
fs.writeFileSync(path.join(OUTDIR,'prototype-spec.md'),md,'utf8');
console.log(JSON.stringify({file:OUT,pages:pages.length,messages:sequences.reduce((n,s)=>n+s.counter,0),uiCards:sequences.reduce((n,s)=>n+s.cards.length,0),mappedBpmnNodes:covered.size,sourceSha256:sourceHash,dimensions:sequences.map(s=>({id:s.id,width:s.width,height:s.height}))},null,2));
