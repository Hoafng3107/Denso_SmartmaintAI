/* Editable draw.io BPMN views and SVG previews generated from one scene model. */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '&#xa;');
const colors = {
  worker: ['#edf5ff', '#2c6096'], expert: ['#eaf7f5', '#267567'],
  ai: ['#f2effb', '#7258a2'], reviewer: ['#fff5e6', '#a67426'],
  hozen: ['#eaf2f4', '#467580'],
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
    const orthogonal=points=>{const result=[points[0]];for(const p of points.slice(1)){const prev=result[result.length-1];if(prev[0]!==p[0]&&prev[1]!==p[1])result.push([p[0],prev[1]]);if(prev[0]!==p[0]||prev[1]!==p[1])result.push(p);}return result;};
    if(e.via) return orthogonal([a,...e.via,b]);
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
      if(n.link)style+='spacingBottom=23;';
      cell(n.id,n.kind==='task'?n.label:n.kind==='gateway'?'X':'',style,n.lane,geom(n.x-20,n.y-l.y,n.w,n.h),`vertex="1"${n.link?` link="data:page/${n.link}"`:''}`);
      if(n.link)cell(n.id+'-hint','+','rounded=0;fillColor=#ffffff;strokeColor=#334155;fontSize=14;fontStyle=1;',n.lane,geom(n.x-20+n.w/2-7,n.y-l.y+n.h-18,14,14),'vertex="1"');
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
      const maxChars=Math.max(8,Math.floor(w/(size*.52)));
      const lines=String(s).split('\n').flatMap(line=>{const out=[];let row='';for(const word of line.split(/\s+/)){if(row&&(row+' '+word).length>maxChars){out.push(row);row=word;}else row+=(row?' ':'')+word;}out.push(row);return out;}),leading=size*1.3;
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
      if(n.kind==='task'){rect(n.x,n.y,n.w,n.h,fill,stroke,10,1.6);text(n.label,n.x+8,n.y,n.w-16,n.link?n.h-20:n.h);if(n.link){rect(n.x+n.w/2-7,n.y+n.h-18,14,14,'#ffffff','#334155');text('+',n.x+n.w/2-7,n.y+n.h-18,14,14,14,true);}}
      else if(n.kind==='gateway'){out.push(`<path d="M${n.x+n.w/2} ${n.y}L${n.x+n.w} ${n.y+n.h/2}L${n.x+n.w/2} ${n.y+n.h}L${n.x} ${n.y+n.h/2}Z" fill="#fff8df" stroke="#a57518" stroke-width="1.6"/>`);text('X',n.x,n.y,n.w,n.h,25,true);const b=this.labelBox(n);text(n.label,b.x,b.y,b.w,b.h,14,true);}
      else {out.push(`<circle cx="${n.x+n.w/2}" cy="${n.y+n.h/2}" r="${n.w/2}" fill="${n.kind==='end'?'#eef8ef':'white'}" stroke="#28563d" stroke-width="${n.kind==='end'?4:1.6}"/>`);const b=this.labelBox(n);text(n.label,b.x,b.y,b.w,b.h,14,true);}
    }
    for(const e of this.edges)if(e.label){const p=this.points(e);const idx=e.labelSegment??Math.max(0,Math.floor((p.length-2)/2));const a=p[idx],b=p[idx+1];const x=(a[0]+b[0])/2+(e.offset?.[0]||0),y=(a[1]+b[1])/2-13+(e.offset?.[1]||0);const w=Math.max(...e.label.split('\n').map(s=>s.length))*7.5+12,h=e.label.split('\n').length*18;rect(x-w/2,y-h/2,w,h,'#ffffff','none',3);text(e.label,x-w/2,y-h/2,w,h,14);}
    text('AI hỗ trợ; con người quyết định. Chỉ tri thức đã duyệt được dùng để đề xuất xử lý.',20,this.height-100,this.width-40,40,15,false,'start');
    out.push('</svg>');return out.join('\n');
  }
}


module.exports = { Diagram };
