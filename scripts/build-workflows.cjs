/* Editable draw.io BPMN views and SVG previews generated from one scene model. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '&#xa;');
const colors = {
  worker: ['#edf5ff', '#2c6096'], expert: ['#eaf7f5', '#267567'],
  ai: ['#f2effb', '#7258a2'], reviewer: ['#fff5e6', '#a67426'],
};
class Diagram {
  constructor(id, name, width, lanes, subtitle) {
    Object.assign(this, {id, name, width, lanes, subtitle});
    this.nodes = []; this.edges = []; this.notes = [];
    let y = 180;
    for (const lane of lanes) { lane.y = y; y += lane.h; }
    this.height = y + 130;
  }
  node(id, lane, kind, x, y, label, w, h) {
    const l = this.lanes.find(l => l.id === lane);
    if (!l) throw Error(`Unknown lane ${lane}`);
    const size = kind === 'gateway' ? [54,54] : ['start','end'].includes(kind) ? [36,36] : [210,92];
    this.nodes.push({id, lane, kind, x, y:l.y+y, label, w:w||size[0], h:h||size[1]});
    return this;
  }
  task(id,l,x,y,label,w,h) { return this.node(id,l,'task',x,y,label,w,h); }
  gateway(id,l,x,y,label) { return this.node(id,l,'gateway',x,y,label); }
  event(id,l,kind,x,y,label) { return this.node(id,l,kind,x,y,label); }
  edge(from,to,label='',opts={}) {this.edges.push({from,to,label,...opts}); return this;}
  note(lane,x,y,w,h,text) {this.notes.push({lane,x,y:this.lanes.find(l=>l.id===lane).y+y,w,h,text});return this;}
  get(id) {return this.nodes.find(n=>n.id===id);}
  labelBox(n) {return {x:n.x+(n.w-190)/2+(n.labelOffset?.[0]||0),y:n.y+(n.kind==='gateway'?-58:n.h+9)+(n.labelOffset?.[1]||0),w:190,h:n.kind==='gateway'?52:64};}
  anchor(n,side) {return side==='left' ? [n.x,n.y+n.h/2] : side==='top' ? [n.x+n.w/2,n.y] : side==='bottom' ? [n.x+n.w/2,n.y+n.h] : [n.x+n.w,n.y+n.h/2];}
  points(e) {
    const a=this.anchor(this.get(e.from),e.out||'right'), b=this.anchor(this.get(e.to),e.in||'left');
    if(e.via) return [a,...e.via,b];
    if(a[1]===b[1]) return [a,b];
    const mid=e.bend||Math.round((a[0]+b[0])/2);
    return [a,[mid,a[1]],[mid,b[1]],b];
  }
  validate() {
    const ids = new Set();
    for(const n of this.nodes) {
      if(ids.has(n.id)) throw Error(`Duplicate ${n.id}`); ids.add(n.id);
      const l=this.lanes.find(l=>l.id===n.lane);
      if(n.x<220||n.x+n.w>this.width-40||n.y<l.y||n.y+n.h>l.y+l.h) throw Error(`Outside lane: ${n.id}`);
      if(n.kind!=='start'&&!this.edges.some(e=>e.to===n.id)) throw Error(`No incoming: ${n.id}`);
      if(n.kind!=='end'&&!this.edges.some(e=>e.from===n.id)) throw Error(`No outgoing: ${n.id}`);
    }
    for(const e of this.edges) if(!ids.has(e.from)||!ids.has(e.to)) throw Error(`Dangling edge ${e.from} ${e.to}`);
    for(let i=0;i<this.nodes.length;i++) for(let j=i+1;j<this.nodes.length;j++) {
      const a=this.nodes[i],b=this.nodes[j];
      if(a.x<b.x+b.w&&a.x+a.w>b.x&&a.y<b.y+b.h&&a.y+a.h>b.y) throw Error(`Overlap ${a.id} ${b.id}`);
    }
    const seen=new Set(this.nodes.filter(n=>n.kind==='start').map(n=>n.id));
    let changed=true;
    while(changed) {changed=false;for(const e of this.edges)if(seen.has(e.from)&&!seen.has(e.to)){seen.add(e.to);changed=true;}}
    for(const n of this.nodes)if(!seen.has(n.id))throw Error(`Unreachable ${n.id}`);
    const canEnd=new Set(this.nodes.filter(n=>n.kind==='end').map(n=>n.id));
    changed=true;
    while(changed){changed=false;for(const e of this.edges)if(canEnd.has(e.to)&&!canEnd.has(e.from)){canEnd.add(e.from);changed=true;}}
    for(const n of this.nodes)if(!canEnd.has(n.id))throw Error(`No end path ${n.id}`);
    return {page:this.name,nodes:this.nodes.length,flows:this.edges.length};
  }
  xml() {
    const cells=['<mxCell id="0"/>','<mxCell id="1" parent="0"/>'];
    const cell=(id,value,style,parent,geo,extra='')=>cells.push(`<mxCell id="${id}" value="${esc(value)}" style="${style}" parent="${parent}" ${extra}>${geo}</mxCell>`);
    const geom=(x,y,w,h)=>`<mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>`;
    const textStyle='text;html=0;whiteSpace=wrap;align=left;verticalAlign=middle;strokeColor=none;fillColor=none;fontFamily=Arial;';
    cell('title',this.name,textStyle+'fontSize=28;fontStyle=1;fontColor=#16324f;','1',geom(20,18,this.width-40,44),'vertex="1"');
    cell('subtitle',this.subtitle,textStyle+'fontSize=16;fontColor=#425466;','1',geom(20,64,this.width-40,42),'vertex="1"');
    cell('legend','BẮT ĐẦU: vòng tròn mảnh     KẾT THÚC: vòng tròn đậm     TÁC VỤ: hình chữ nhật bo góc     X: chọn một nhánh     MŨI TÊN LIỀN: luồng thực hiện',textStyle+'fontSize=14;fontColor=#526170;','1',geom(20,112,this.width-40,32),'vertex="1"');
    cell('pool','DENSO · QUẢN LÝ TRI THỨC BẢO TRÌ','swimlane;horizontal=1;startSize=30;fillColor=#16324f;swimlaneFillColor=#ffffff;strokeColor=#94a3b8;fontColor=#ffffff;fontSize=16;fontStyle=1;collapsible=0;','1',geom(20,150,this.width-40,this.height-280),'vertex="1"');
    for(const l of this.lanes){
      const [fill,stroke]=colors[l.id];
      cell(l.id,'',`swimlane;horizontal=0;startSize=180;fillColor=${fill};swimlaneFillColor=#ffffff;strokeColor=#cbd5e1;collapsible=0;`,'pool',geom(0,l.y-150,this.width-40,l.h),'vertex="1"');
      cell(l.id+'-label',l.label,textStyle+`align=center;fontSize=18;fontStyle=1;fontColor=${stroke};`,l.id,geom(10,20,160,100),'vertex="1"');
      if(l.hint)cell(l.id+'-hint',l.hint,textStyle+'align=center;fontSize=13;fontColor=#64748b;',l.id,geom(15,130,150,110),'vertex="1"');
    }
    for(const [i,n] of this.notes.entries()){
      const l=this.lanes.find(l=>l.id===n.lane);
      cell(`note-${i}`,n.text,'shape=note;whiteSpace=wrap;html=0;size=12;fillColor=#fffde9;strokeColor=#d4c77b;fontFamily=Arial;fontSize=14;align=left;spacing=12;',n.lane,geom(n.x-20,n.y-l.y,n.w,n.h),'vertex="1"');
    }
    for(const n of this.nodes){
      const l=this.lanes.find(l=>l.id===n.lane),[fill,stroke]=colors[n.lane];
      let style='whiteSpace=wrap;html=0;fontFamily=Arial;fontSize=16;fontColor=#172b43;';
      if(n.kind==='task')style+=`rounded=1;arcSize=12;fillColor=${fill};strokeColor=${stroke};strokeWidth=1.6;spacing=10;`;
      if(n.kind==='gateway')style+='rhombus;fillColor=#fff8df;strokeColor=#a57518;strokeWidth=1.6;fontSize=26;fontStyle=1;';
      if(n.kind==='start'||n.kind==='end')style+=`ellipse;aspect=fixed;fillColor=${n.kind==='end'?'#eef8ef':'#ffffff'};strokeColor=#28563d;strokeWidth=${n.kind==='end'?4:1.6};`;
      cell(n.id,n.kind==='task'?n.label:n.kind==='gateway'?'X':'',style,n.lane,geom(n.x-20,n.y-l.y,n.w,n.h),'vertex="1"');
      if(n.kind!=='task'){
        const box=this.labelBox(n);
        cell(n.id+'-label',n.label,textStyle+'align=center;fontSize=14;fontStyle=1;fontColor=#334155;',n.lane,geom(box.x-20,box.y-l.y,box.w,box.h),'vertex="1"');
      }
    }
    const sides={left:[0,.5],right:[1,.5],top:[.5,0],bottom:[.5,1]};
    for(const [i,e] of this.edges.entries()){
      const [ex,ey]=sides[e.out||'right'],[ix,iy]=sides[e.in||'left'];
      const pts=this.points(e).slice(1,-1).map(p=>`<mxPoint x="${p[0]-20}" y="${p[1]-150}"/>`).join('');
      const labelOffset=e.offset?`<mxPoint x="${e.offset[0]}" y="${e.offset[1]}" as="offset"/>`:'';
      const g=`<mxGeometry x="${e.pos||0}" y="-12" relative="1" as="geometry"><Array as="points">${pts}</Array>${labelOffset}</mxGeometry>`;
      cell(`flow-${i}`,e.label,`edgeStyle=none;rounded=0;html=0;jumpStyle=arc;jumpSize=8;endArrow=block;endFill=1;strokeColor=${e.color||'#526579'};strokeWidth=1.6;fontSize=14;fontFamily=Arial;fontColor=#334155;labelBackgroundColor=#ffffff;exitX=${ex};exitY=${ey};exitPerimeter=1;entryX=${ix};entryY=${iy};entryPerimeter=1;`,'pool',g,`edge="1" source="${e.from}" target="${e.to}"`);
    }
    cell('footer','Phạm vi: prototype nghiệp vụ. AI hỗ trợ; con người quyết định. Chỉ tri thức đã duyệt được dùng để đề xuất xử lý. Luồng quay lại thể hiện việc bổ sung / điều tra tiếp.',textStyle+'fontSize=15;fontColor=#526170;','1',geom(20,this.height-105,this.width-40,46),'vertex="1"');
    return `<diagram id="${this.id}" name="${esc(this.name)}"><mxGraphModel dx="1600" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="${this.width}" pageHeight="${this.height}" math="0" shadow="0"><root>${cells.join('\n')}</root></mxGraphModel></diagram>`;
  }
  svg(){
    const out=[`<svg xmlns="http://www.w3.org/2000/svg" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}" role="img" aria-label="${esc(this.name)}"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#526579"/></marker></defs><rect width="100%" height="100%" fill="white"/>`];
    const rect=(x,y,w,h,fill,stroke,rx=0,sw=1)=>out.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`);
    const text=(s,x,y,w,h,size=16,bold=false,align='middle',fill='#172b43')=>{
      const lines=s.split('\n'),leading=size*1.3;
      out.push(`<text font-family="Arial, sans-serif" font-size="${size}" font-weight="${bold?700:400}" fill="${fill}" text-anchor="${align}">`);
      lines.forEach((line,i)=>out.push(`<tspan x="${align==='start'?x:x+w/2}" y="${y+h/2-(lines.length-1)*leading/2+size*.34+i*leading}">${esc(line)}</tspan>`));out.push('</text>');
    };
    text(this.name,20,18,this.width-40,44,28,true,'start');text(this.subtitle,20,64,this.width-40,42,16,false,'start');
    text('○ Bắt đầu     ◉ Kết thúc     ▢ Tác vụ     ◇ X: chọn một nhánh     → Luồng thực hiện',20,112,this.width-40,32,14,false,'start');
    rect(20,150,this.width-40,30,'#16324f','#16324f');text('DENSO · QUẢN LÝ TRI THỨC BẢO TRÌ',32,150,this.width-64,30,16,true,'start','#ffffff');
    for(const l of this.lanes){const [fill,stroke]=colors[l.id];rect(20,l.y,this.width-40,l.h,'#ffffff','#cbd5e1');rect(20,l.y,180,l.h,fill,'#cbd5e1');text(l.label,30,l.y+20,160,100,18,true,'middle',stroke);if(l.hint)text(l.hint,35,l.y+130,150,110,13,false,'middle','#64748b');}
    for(const n of this.notes){rect(n.x,n.y,n.w,n.h,'#fffde9','#d4c77b',2);text(n.text,n.x+12,n.y,n.w-24,n.h,14,false,'start');}
    for(const e of this.edges){const p=this.points(e);out.push(`<path d="${p.map((p,i)=>(i?'L':'M')+p.join(' ')).join(' ')}" fill="none" stroke="${e.color||'#526579'}" stroke-width="1.6" marker-end="url(#arrow)"/>`);}
    for(const n of this.nodes){const [fill,stroke]=colors[n.lane];
      if(n.kind==='task'){rect(n.x,n.y,n.w,n.h,fill,stroke,10,1.6);text(n.label,n.x+8,n.y,n.w-16,n.h);}
      else if(n.kind==='gateway'){out.push(`<path d="M${n.x+n.w/2} ${n.y}L${n.x+n.w} ${n.y+n.h/2}L${n.x+n.w/2} ${n.y+n.h}L${n.x} ${n.y+n.h/2}Z" fill="#fff8df" stroke="#a57518" stroke-width="1.6"/>`);text('X',n.x,n.y,n.w,n.h,25,true);const b=this.labelBox(n);text(n.label,b.x,b.y,b.w,b.h,14,true);}
      else {out.push(`<circle cx="${n.x+n.w/2}" cy="${n.y+n.h/2}" r="${n.w/2}" fill="${n.kind==='end'?'#eef8ef':'white'}" stroke="#28563d" stroke-width="${n.kind==='end'?4:1.6}"/>`);const b=this.labelBox(n);text(n.label,b.x,b.y,b.w,b.h,14,true);}
    }
    for(const e of this.edges)if(e.label){const p=this.points(e);const idx=e.labelSegment??Math.max(0,Math.floor((p.length-2)/2));const a=p[idx],b=p[idx+1];const x=(a[0]+b[0])/2+(e.offset?.[0]||0),y=(a[1]+b[1])/2-13+(e.offset?.[1]||0);const w=Math.max(...e.label.split('\n').map(s=>s.length))*7.5+12,h=e.label.split('\n').length*18;rect(x-w/2,y-h/2,w,h,'#ffffff','none',3);text(e.label,x-w/2,y-h/2,w,h,14);}
    text('AI hỗ trợ; con người quyết định. Chỉ tri thức đã duyệt được dùng để đề xuất xử lý.',20,this.height-100,this.width-40,40,15,false,'start');
    out.push('</svg>');return out.join('\n');
  }
}

const k = new Diagram('knowledge-flow','01 · Ghi nhận tri thức chuyên gia',4320,[
  {id:'expert',label:'CHUYÊN GIA',h:430,hint:'Tác giả / người\nđề xuất tri thức'},
  {id:'ai',label:'HỆ THỐNG\n& AI',h:440,hint:'Lane tự động\nKhông phải một\nvai trò người dùng'},
  {id:'reviewer',label:'CHUYÊN GIA\nTRƯỞNG',h:420,hint:'Người được giao\nquyền duyệt theo\nphạm vi chuyên môn'},
], 'Sau đăng nhập · Một ô nhập để gõ hoặc dán nội dung · Đối chiếu kho trước khi gửi · Bản cập nhật luôn giữ lịch sử phiên bản');
k.event('k-start','expert','start',240,142,'Có tri thức\ncần ghi nhận')
 .task('k-input','expert',340,114,'Nhập hoặc dán\ntri thức / ghi chú /\nbiên bản cuộc họp')
 .task('k-structure','ai',620,98,'AI cấu trúc thành\nbiểu mẫu; đánh dấu\nthông tin còn thiếu')
 .task('k-check','expert',900,114,'Kiểm tra, sửa, bổ sung\nbiểu mẫu; xác nhận\nnội dung và tác giả')
 .gateway('k-ready','expert',1180,133,'Đủ thông tin\nđể gửi duyệt?')
 .task('k-compare','ai',1340,98,'AI đối chiếu kho\nđã duyệt; dẫn nguồn,\nchỉ rõ giống / khác')
 .task('k-read','expert',1610,114,'Đọc bản liên quan;\nđối chiếu điều kiện,\nphạm vi và khác biệt')
 .gateway('k-classify','expert',1900,133,'Chọn cách\nghi nhận?')
 .task('k-update','expert',2070,30,'Đề xuất cập nhật\nGắn ID, phiên bản gốc\nvà phần thay đổi')
 .task('k-new','expert',2070,230,'Đề xuất tri thức mới\nNêu khác biệt nếu\ncó nội dung gần trùng')
 .gateway('k-merge','expert',2390,133,'Hợp nhất\nnhánh gửi')
 .task('k-submit','expert',2510,114,'Xác nhận nội dung\nGửi kiểm duyệt')
 .task('k-archive','ai',2090,286,'Không tạo bản trùng\nGiữ / lưu trữ nháp;\nliên kết bản đã có')
 .event('k-covered','ai','end',2370,314,'Đã có tri thức\nphù hợp trong kho')
 .task('k-queue','ai',2790,98,'Lưu CHỜ DUYỆT\nGiao người duyệt\nkhác tác giả')
 .task('k-review','reviewer',3030,105,'Đánh giá nội dung,\nnguồn, an toàn, phạm vi\nvà trùng lặp')
 .gateway('k-decision','reviewer',3310,124,'Kết quả\nkiểm duyệt?')
 .task('k-feedback','reviewer',2980,292,'Yêu cầu bổ sung\nNêu rõ mục cần sửa\nvà lý do')
 .task('k-return','ai',2710,286,'Thông báo yêu cầu sửa\nGhi phản hồi và\nlịch sử xét duyệt')
 .task('k-revise','expert',2780,294,'Đọc phản hồi; sửa\nhoặc xác nhận thay đổi\ntrong bản đề xuất')
 .task('k-publish','ai',3670,98,'Xuất bản phiên bản\nđã duyệt; cập nhật RAG\nThông báo tác giả')
 .event('k-end','ai','end',4040,126,'Tri thức sẵn sàng\ncho tra cứu')
 .task('k-reject','reviewer',3550,292,'Từ chối đề xuất\nGhi lý do cụ thể')
 .task('k-reject-notify','ai',3850,286,'Thông báo từ chối\nGiữ đề xuất và\nlịch sử phản hồi')
 .event('k-rejected','ai','end',4150,314,'Đề xuất bị từ chối\nChưa vào kho sử dụng');
k.note('expert',340,6,530,102,'Tự động lưu nháp khi nhập và chỉnh sửa.\nMột nội dung họp có thể tạo nhiều đề xuất;\nchuyên gia kiểm tra từng đề xuất.\nVoice-to-text: hướng phát triển sau MVP.')
 .note('ai',620,286,650,110,'AI không tự điền dữ kiện chưa có. Mục bắt buộc phải được xác nhận;\n"không áp dụng / chưa xác định" cần lý do theo quy định biểu mẫu.\nĐối chiếu gồm triệu chứng, nguyên nhân, điều kiện áp dụng,\ngiới hạn và bước an toàn; không chỉ đếm từ khóa trùng.')
 .note('reviewer',2330,75,480,145,'Người duyệt có quyền theo loại máy / chuyên môn.\nKhông tự duyệt nội dung mình là tác giả hoặc\ncùng xây dựng; chuyển người duyệt phù hợp.\nSửa biên tập: lưu dấu vết. Sửa nội dung chuyên môn:\ntrả tác giả xác nhận trước khi phê duyệt.')
 .note('reviewer',3820,50,380,140,'Bản nháp ≠ bản chờ duyệt ≠ bản đã duyệt.\nGhi tác giả, người đóng góp, người duyệt.\nCập nhật tạo phiên bản mới;\nkhông ghi đè phiên bản trước.\nMọi kết quả đều thông báo cho tác giả.');
k.edge('k-start','k-input')
 .edge('k-input','k-structure','',{bend:580})
 .edge('k-structure','k-check','',{bend:860})
 .edge('k-check','k-ready')
 .edge('k-ready','k-check','Cần bổ sung',{out:'bottom',in:'bottom',via:[[1207,430],[1005,430]],color:'#a67426',labelSegment:1})
 .edge('k-ready','k-compare','Đủ',{bend:1290,labelSegment:0})
 .edge('k-compare','k-read','',{bend:1580})
 .edge('k-read','k-classify')
 .edge('k-classify','k-update','Bổ sung / sửa',{via:[[2010,340],[2010,256]],labelSegment:2})
 .edge('k-classify','k-new','Nội dung mới',{via:[[2010,340],[2010,456]],labelSegment:2})
 .edge('k-classify','k-archive','Trùng; không có điểm mới',{out:'bottom',via:[[1927,942]],in:'left',labelSegment:0})
 .edge('k-archive','k-covered')
 .edge('k-update','k-merge','',{via:[[2340,256],[2340,340]]})
 .edge('k-new','k-merge','',{via:[[2340,456],[2340,340]]})
 .edge('k-merge','k-submit')
 .edge('k-submit','k-queue','',{bend:2750})
 .edge('k-queue','k-review','',{bend:3020})
 .edge('k-review','k-decision')
 .edge('k-decision','k-feedback','Yêu cầu sửa',{out:'bottom',in:'right',via:[[3337,1388]],labelSegment:0,color:'#a67426'})
 .edge('k-feedback','k-return','',{out:'left',in:'bottom',via:[[2815,1388]],color:'#a67426'})
 .edge('k-return','k-revise','',{out:'left',in:'left',via:[[2660,942],[2660,520]],color:'#a67426'})
 .edge('k-revise','k-check','Kiểm tra lại và đối chiếu lại sau sửa',{out:'bottom',in:'bottom',via:[[2885,585],[1005,585]],color:'#a67426',labelSegment:1})
 .edge('k-decision','k-publish','Phê duyệt',{via:[[3460,1201],[3460,754]],labelSegment:0})
 .edge('k-publish','k-end')
 .edge('k-decision','k-reject','Từ chối',{via:[[3460,1201],[3460,1388]],labelSegment:2,color:'#a14c49'})
 .edge('k-reject','k-reject-notify','',{bend:3810,color:'#a14c49'})
 .edge('k-reject-notify','k-rejected');

const r=new Diagram('repair-flow','02 · Case sửa chữa và bảo trì / bảo dưỡng',7380,[
  {id:'worker',label:'NGƯỜI\nBẢO TRÌ',h:480,hint:'Phụ trách ca\nQuyết định thao tác\ntrong thẩm quyền'},
  {id:'expert',label:'CHUYÊN GIA',h:250,hint:'Tham gia khi\nđược yêu cầu'},
  {id:'ai',label:'HỆ THỐNG\n& AI',h:430,hint:'Tự động lưu ca\nTra cứu kho đã duyệt\nTheo dõi đóng góp'},
  {id:'reviewer',label:'CHUYÊN GIA\nTRƯỞNG',h:400,hint:'Duyệt tri thức\ntái sử dụng\nKhông duyệt thay\nbáo cáo thực tế'},
], 'Sau đăng nhập · Mọi ca đều được lưu lịch sử máy · RAG dùng cả tri thức chuyên gia và case đã duyệt · Xuất bản tri thức là bước riêng');
r.event('r-start','worker','start',240,142,'Máy báo lỗi hoặc\nđến lịch bảo trì')
 .task('r-open','worker',340,114,'Mở ca; quét / nhập\nmã máy; xác nhận máy,\nloại ca và người phụ trách')
 .task('r-inspect','worker',620,114,'Kiểm tra sơ bộ; nhập\ndấu hiệu, mã lỗi, số đo\nvà bối cảnh thực tế')
 .gateway('r-abnormal','worker',920,133,'Có bất thường\ncần chẩn đoán?')
 .task('r-routine','worker',1080,320,'Thực hiện bảo trì\nđịnh kỳ theo quy trình\nan toàn đã phê duyệt')
 .task('r-retrieve','ai',1110,85,'Truy xuất tri thức\nchuyên gia và case\nđã duyệt, có liên quan')
 .task('r-insight','ai',1380,85,'AI tóm tắt có nguồn\nGiống / khác, thiếu dữ kiện,\ngiới hạn và an toàn')
 .task('r-assess','worker',1640,114,'Đọc nguồn và phân tích\nĐánh giá khả năng áp dụng\nvà thẩm quyền xử lý')
 .gateway('r-route','worker',1940,133,'Chọn hướng\nxử lý?')
 .task('r-measure','worker',1670,320,'Bổ sung kiểm tra / số đo\nCập nhật bối cảnh\nvà tra cứu lại')
 .task('r-call','worker',2110,320,'Yêu cầu chuyên gia\nNêu lý do và thông tin\ncòn cần xác minh')
 .task('r-handover','ai',2370,85,'Tạo tóm tắt bàn giao\nBối cảnh, bước đã thử,\nkết quả và nguồn tham chiếu')
 .task('r-join','expert',2630,60,'Nhận ca; ghi thời điểm,\ncông đoạn tham gia\nvà vai trò chuyên gia')
 .task('r-investigate','expert',2910,60,'Điều tra theo quy trình\nGhi nhận định, hướng dẫn,\nviệc đã làm và kết quả')
 .gateway('r-action-merge','worker',3230,133,'Có phương án\nđủ điều kiện xử lý?')
 .task('r-plan','worker',3370,114,'Chốt hướng xử lý\nvà người thực hiện\nXác nhận đủ điều kiện')
 .task('r-act','worker',3640,114,'Thực hiện / phối hợp\nxử lý theo quy trình an toàn\nGhi ai làm, bước và kết quả')
 .task('r-verify','worker',3910,114,'Kiểm tra sau xử lý\nXác nhận tình trạng máy\ntheo tiêu chí công việc')
 .gateway('r-ok','worker',4200,133,'Đạt yêu cầu\nhoàn tất ca?')
 .gateway('r-next','worker',4200,338,'Nếu chưa đạt?')
 .task('r-open-save','ai',4440,270,'Lưu ca CHƯA HOÀN TẤT\nBàn giao người phụ trách,\nviệc còn lại và lịch sử')
 .event('r-wait','ai','end',4750,298,'Kết thúc phiên\nCa vẫn chờ xử lý')
 .task('r-report','worker',4440,114,'Hoàn thiện báo cáo\nThực tế đã làm, kết quả,\nnguyên nhân, khác biệt')
 .gateway('r-expert-used','ai',4740,104,'Ca có chuyên gia\ntham gia?')
 .task('r-confirm','expert',4910,60,'Kiểm tra và xác nhận\nphần đóng góp của mình\ntrong báo cáo')
 .gateway('r-confirm-merge','ai',5200,104,'Hợp nhất\nxác nhận')
 .task('r-history','ai',5320,85,'Lưu báo cáo hoàn tất\nvào lịch sử máy\nGiữ người làm và thời điểm')
 .task('r-diff','ai',5590,85,'AI đối chiếu báo cáo\nvới kho; gợi ý liên kết,\ncập nhật hoặc case mới')
 .task('r-proposal','worker',5860,114,'Xác nhận giá trị tái dùng\nChọn liên kết / cập nhật /\ncase mới và phần khác biệt')
 .gateway('r-useful','worker',6150,133,'Có đề xuất\ntri thức?')
 .task('r-only-history','ai',6150,270,'Chỉ lưu lịch sử ca\nGhi liên kết đã tham khảo\nKhông xuất bản tri thức')
 .event('r-history-end','ai','end',6440,298,'Đã lưu ca\nKhông có đề xuất')
 .task('r-submit','worker',6330,114,'Xác nhận và gửi\nđề xuất tri thức\nGắn báo cáo nguồn')
 .task('r-review','reviewer',6310,65,'Người duyệt độc lập\nĐánh giá bằng chứng,\nan toàn và giá trị tái dùng')
 .gateway('r-decision','reviewer',6600,84,'Kết quả\nkiểm duyệt?')
 .task('r-feedback','reviewer',5990,267,'Yêu cầu bổ sung\nNêu nội dung cần sửa\nThông báo người gửi')
 .task('r-revise','worker',5690,320,'Bổ sung đề xuất tri thức\nPhối hợp chuyên gia\nnếu cần')
 .task('r-publish','ai',6840,85,'Duyệt liên kết / xuất bản\ncase mới / phiên bản mới\nCập nhật RAG; thông báo')
 .event('r-published','ai','end',7180,113,'Tri thức sẵn sàng\ncho ca tiếp theo')
 .task('r-reject','reviewer',6830,267,'Từ chối kèm lý do\nThông báo người gửi\nGiữ lịch sử xét duyệt')
 .event('r-rejected','reviewer','end',7180,295,'Giữ lịch sử ca\nKhông xuất bản đề xuất');
r.note('worker',340,315,460,118,'An toàn được thực hiện từ khi tiếp cận máy.\nKhông đủ điều kiện an toàn / thẩm quyền: dừng,\nbáo phụ trách và bàn giao theo quy định nhà máy.\nCa được tự động lưu trong suốt quá trình.\nCa chờ xử lý được mở lại khi tiếp tục công việc.')
 .note('reviewer',340,55,1150,150,'Thông tin AI cung cấp: ưu tiên xử lý trước mắt; đề xuất trung hạn / dài hạn chỉ khi có nguồn và căn cứ.\nHiển thị nguồn, điều kiện phù hợp, điểm khác, thông tin chưa rõ và cảnh báo của quy trình đã duyệt.\nCó thể hiển thị 1–3 kết quả phù hợp trước, cho mở rộng; không giới hạn cứng nguồn được đối chiếu.\nKhông dùng tỷ lệ tương đồng làm xác suất sửa thành công hoặc mức bảo đảm an toàn.\nThiếu căn cứ / vượt thẩm quyền: cảnh báo và chuyển chuyên gia; chuyên gia vẫn có thể bàn giao ca chưa xử lý.')
 .note('expert',3350,40,900,145,'Báo cáo lưu: người phụ trách ca, từng người tham gia, thời điểm / công đoạn, thao tác và kết quả.\nChuyên gia xác nhận phần mình đóng góp; người bảo trì xác nhận báo cáo thực tế của ca.\nNguyên nhân chưa xác định phải ghi rõ; không biến giả thuyết của AI thành kết luận.\nViệc phát sinh sau này được ghi thành việc theo dõi; không coi đề xuất là đã thực hiện.\nXác nhận báo cáo thực tế không thay thế bước duyệt tri thức tái sử dụng.')
 .note('reviewer',4670,55,1160,140,'Mọi ca đều có lịch sử, kể cả ca định kỳ, ca lặp lại, ca chưa xử lý và đề xuất bị từ chối.\nBổ sung ở vòng kiểm duyệt là sửa đề xuất tri thức; sửa báo cáo thực tế phải có dấu vết và phiên bản.\nNgười duyệt khác người tạo / cùng xây dựng đề xuất, được phân công theo loại máy và chuyên môn.\nNếu nội dung đã có: liên kết sự kiện mới với bản gốc, không tạo case tri thức trùng lặp.\nNếu có khác biệt có giá trị: đề xuất phiên bản mới hoặc case mới, không ghi đè tự động.')
 .note('ai',2800,270,1030,120,'MVP dùng danh mục máy và kho tri thức mô phỏng; không giả định có kết nối sẵn với HozenDX.\nTích hợp HozenDX là điểm mở: lấy lý lịch máy và đồng bộ lịch sử ca khi có API / quyền truy cập.\nKho dùng cho RAG chỉ gồm phiên bản đã phê duyệt; nháp, chờ duyệt, bị từ chối không là hướng dẫn.\nLịch sử vận hành và kho tri thức tái sử dụng được quản lý riêng, liên kết bằng ID.');
r.edge('r-start','r-open').edge('r-open','r-inspect').edge('r-inspect','r-abnormal')
 .edge('r-abnormal','r-retrieve','Có',{bend:1030,labelSegment:0})
 .edge('r-abnormal','r-routine','Không; ca định kỳ',{out:'bottom',via:[[947,546]],labelSegment:1})
 .edge('r-routine','r-verify','Hoàn tất công việc định kỳ',{out:'bottom',in:'bottom',via:[[1185,635],[4015,635]],labelSegment:1})
 .edge('r-retrieve','r-insight')
 .edge('r-insight','r-assess','',{bend:1620})
 .edge('r-assess','r-route')
 .edge('r-route','r-measure','Cần thêm dữ kiện',{out:'bottom',in:'right',via:[[1967,546]],labelSegment:0,color:'#a67426'})
 .edge('r-measure','r-retrieve','Tra cứu lại',{out:'bottom',in:'bottom',via:[[1775,1270],[1215,1270]],labelSegment:1,color:'#a67426'})
 .edge('r-route','r-call','Cần chuyên gia',{via:[[2050,340],[2050,546]],labelSegment:2})
 .edge('r-call','r-handover','',{bend:2310})
 .edge('r-handover','r-join','',{bend:2610})
 .edge('r-join','r-investigate')
 .edge('r-investigate','r-action-merge','',{bend:3170})
 .edge('r-route','r-action-merge','Đủ căn cứ, đúng thẩm quyền',{out:'top',in:'top',via:[[1967,210],[3257,210]],labelSegment:1})
 .edge('r-action-merge','r-plan','Có')
 .edge('r-action-merge','r-open-save','Chưa có / không đủ điều kiện',{out:'bottom',in:'top',via:[[3257,610],[4400,610],[4400,1150],[4545,1150]],labelSegment:1})
 .edge('r-plan','r-act').edge('r-act','r-verify').edge('r-verify','r-ok')
 .edge('r-ok','r-report','Đạt')
 .edge('r-ok','r-next','Chưa đạt',{out:'bottom',in:'top',via:[[4227,450]],labelSegment:0})
 .edge('r-next','r-assess','Tiếp tục điều tra / gọi hỗ trợ',{out:'right',in:'top',via:[[4300,545],[4300,190],[1745,190]],labelSegment:2,color:'#a67426'})
 .edge('r-next','r-open-save','Dừng / bàn giao',{via:[[4330,545],[4330,1226]],labelSegment:0})
 .edge('r-open-save','r-wait')
 .edge('r-report','r-expert-used','',{bend:4690})
 .edge('r-expert-used','r-confirm','Có',{via:[[4840,1041],[4840,766]],labelSegment:2})
 .edge('r-expert-used','r-confirm-merge','Không',{out:'bottom',in:'bottom',via:[[4767,1130],[5227,1130]],labelSegment:1})
 .edge('r-confirm','r-confirm-merge','',{bend:5160})
 .edge('r-confirm-merge','r-history')
 .edge('r-history','r-diff')
 .edge('r-diff','r-proposal','',{in:'bottom',via:[[5920,1041],[5920,440],[5965,440]]})
 .edge('r-proposal','r-useful')
 .edge('r-useful','r-only-history','Không',{out:'bottom',in:'left',via:[[6177,470],[6090,470],[6090,1226]],labelSegment:2})
 .edge('r-only-history','r-history-end')
 .edge('r-useful','r-submit','Có')
 .edge('r-submit','r-review','',{out:'bottom',in:'top',via:[[6435,850],[6580,850],[6580,1360],[6415,1360]]})
 .edge('r-review','r-decision')
 .edge('r-decision','r-feedback','Yêu cầu sửa',{out:'bottom',in:'right',via:[[6627,1653]],labelSegment:1,color:'#a67426'})
 .edge('r-feedback','r-revise','',{out:'left',in:'bottom',via:[[5895,1653],[5895,610],[5795,610]],color:'#a67426'})
 .edge('r-revise','r-diff','Đối chiếu lại',{out:'left',in:'top',via:[[5560,546],[5560,945],[5695,945]],labelSegment:1,color:'#a67426'})
 .edge('r-decision','r-publish','Phê duyệt',{via:[[6740,1451],[6740,1041]],labelSegment:0})
 .edge('r-publish','r-published')
 .edge('r-decision','r-reject','Từ chối',{via:[[6740,1451],[6740,1653]],labelSegment:2,color:'#a14c49'})
 .edge('r-reject','r-rejected');

r.get('r-route').labelOffset=[-120,-20];
r.get('r-action-merge').labelOffset=[-100,0];
r.get('r-next').labelOffset=[-110,0];
const diagrams=[k,r];
const results=diagrams.map(d=>d.validate());
fs.mkdirSync(path.join(root,'docs','bpmn'),{recursive:true});
fs.writeFileSync(path.join(root,'denso-maintenance-workflows.drawio'),`<mxfile host="app.diagrams.net" agent="Codex" version="24.7.17" type="device">\n${diagrams.map(d=>d.xml()).join('\n')}\n</mxfile>\n`,'utf8');
for(const d of diagrams)fs.writeFileSync(path.join(root,'docs','bpmn',`${d.id}.svg`),d.svg(),'utf8');
console.log(JSON.stringify(results,null,2));
