'use strict';
// Read-only payload contract and analytic pointy-hex text layout. No DOM/HA calls.
const layout=require('./layout');
const {SUBMENU_FILL,SUBMENU_INNER,OUTER}=require('./submenu-theme');
const LIMITS=Object.freeze({blocks:128,characters:32768,pages:64});
const KEYS=['mode','title','footer','text','blocks','spacing','padding','font_size','weight','align','colors','scale','connector'];
const BLOCK_KEYS=['text','font_size','weight','align','color','background','x','y','z'];
function fail(message){throw new Error('Info Cube: '+message);}
function object(value){return value && typeof value==='object' && !Array.isArray(value);}
function number(value,min,max,label){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max)fail(`${label} must be ${min}–${max}.`);}
function textSource(value){
    if(typeof value==='string')return;
    if(!object(value)||Object.keys(value).some(k=>!['entity','attribute','fallback','prefix','suffix','format','time_zone','max_age','stale_text'].includes(k))||
        !/^[a-z_]+\.[a-z0-9_]+$/.test(value.entity||''))fail('text must be plain text or an entity binding.');
    for(const key of ['attribute','fallback','prefix','suffix','time_zone','stale_text'])if(value[key]!==undefined&&typeof value[key]!=='string')fail(`${key} must be text.`);
    if(value.max_age!==undefined)number(value.max_age,1,86400,'max_age (seconds)');
    if(value.format!==undefined&&!['value','datetime'].includes(value.format))fail('format must be value or datetime.');
    if(value.time_zone){try{new Intl.DateTimeFormat('en-GB',{timeZone:value.time_zone});}catch(_){fail('invalid time_zone.');}}
}
function validate(config){
    if(!object(config)||Object.keys(config).some(k=>!KEYS.includes(k)))fail('expected info with mode, title, text/blocks and documented style options.');
    const mode=config.mode||'text';if(!['text','stack','positioned'].includes(mode))fail('mode must be text, stack or positioned.');
    if(config.title!==undefined)textSource(config.title);
    if(config.footer!==undefined)textSource(config.footer);
    if(config.scale!==undefined)number(config.scale,.5,1,'scale');
    if(config.connector!==undefined&&config.connector!==true&&config.connector!==false){
        if(!object(config.connector)||Object.keys(config.connector).some(k=>k!=='color'))fail('connector must be true, false or {color: CSS color}.');
        if(config.connector.color!==undefined)color(config.connector.color);
    }
    if(mode==='text'){textSource(config.text);if(config.blocks!==undefined)fail('text mode uses text, not blocks.');}
    else{
        if(config.text!==undefined||!Array.isArray(config.blocks)||config.blocks.length>LIMITS.blocks)fail(`use up to ${LIMITS.blocks} blocks in ${mode} mode.`);
        config.blocks.forEach(block=>{
            if(typeof block==='string'){if(mode==='positioned')fail('positioned blocks require x and y.');return;}
            if(!object(block)||Object.keys(block).some(k=>!BLOCK_KEYS.includes(k)))fail('invalid block options.');
            textSource(block.text);styles(block);
            if(mode==='positioned'){number(block.x,0,100,'x');number(block.y,0,100,'y');if(block.z!==undefined)number(block.z,-1000,1000,'z');}
            else if(['x','y','z'].some(k=>block[k]!==undefined))fail('x/y/z require positioned mode.');
        });
    }
    styles(config);
    if(config.spacing!==undefined)number(config.spacing,0,40,'spacing');
    if(config.padding!==undefined)number(config.padding,8,40,'padding');
    if(config.colors!==undefined){
        if(!object(config.colors)||Object.keys(config.colors).some(k=>!['inner_border','outer_border','center','foreground'].includes(k)))fail('invalid colors.');
        Object.values(config.colors).forEach(color);
    }
    const raw=JSON.stringify(config);if(raw.length>LIMITS.characters*2)fail('payload is too large.');
    return config;
}
function color(value){if(typeof value!=='string'||value.length>100||!value.trim()||/[;{}<>]/.test(value)||/url\s*\(/i.test(value))fail('use a plain CSS color.');}
function styles(config){
    if(config.font_size!==undefined)number(config.font_size,12,32,'font_size (CSS px)');
    if(config.weight!==undefined&&![400,500,600,650,700,800].includes(config.weight))fail('unsupported font weight.');
    if(config.align!==undefined&&!['left','center','right'].includes(config.align))fail('align must be left, center or right.');
    for(const key of ['color','background'])if(config[key]!==undefined)color(config[key]);
}
function value(source,hass){
    if(typeof source==='string')return source;
    if(!source)return '';
    const state=hass&&hass.states&&hass.states[source.entity];
    let result=state&&(source.attribute?state.attributes&&state.attributes[source.attribute]:state.state);
    if(!state||['unknown','unavailable'].includes(state.state)||result===null||result===undefined||typeof result==='object')result=source.fallback||'Unavailable';
    else if(source.max_age && (!Number.isFinite(Date.parse(state.last_updated)) || Date.now()-Date.parse(state.last_updated)>source.max_age*1000))result=source.stale_text||'Stale';
    else if(source.format==='datetime'){
        const date=new Date(result);
        result=Number.isFinite(date.getTime())?new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short',timeZone:source.time_zone||'UTC',timeZoneName:undefined}).format(date):source.fallback||'Unavailable';
    }
    return (source.prefix||'')+String(result)+(source.suffix||'');
}
function dependencies(config){
    const sources=[config.title,config.footer,config.text,...(config.blocks||[]).map(b=>typeof b==='string'?b:b.text)];
    return [...new Set(sources.filter(object).map(s=>s.entity))];
}
function resolve(config,hass){
    validate(config);let remaining=LIMITS.characters;let truncated=false;
    const limited=source=>{let text=value(source,hass);if(text.length>remaining){text=text.slice(0,remaining)+'…';truncated=true;}remaining=Math.max(0,remaining-text.length);return text;};
    const blocks=[];
    if(config.title!==undefined)blocks.push({text:limited(config.title),font_size:20,weight:700,align:'center'});
    if((config.mode||'text')==='text')blocks.push({text:limited(config.text)});
    else for(const block of config.blocks)blocks.push(typeof block==='string'?{text:limited(block)}:{...block,text:limited(block.text)});
    if(config.footer!==undefined)blocks.push({text:limited(config.footer),font_size:12,align:'center'});
    if(!blocks.some(b=>b.text.trim()))blocks.splice(0,blocks.length,{text:'No information available'});
    return {blocks,truncated};
}
// Adjacent first-ring polygons meet at an inward V on the cluster perimeter.
// Find their actual intersections (including the layout table's small overlap),
// choosing the outward endpoint rather than the junction beside the center cell.
function intersections(a,b){
    const found=[],cross=(u,v)=>u.x*v.y-u.y*v.x,sub=(u,v)=>({x:u.x-v.x,y:u.y-v.y});
    for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++){
        const p=a[i],q=b[j],r=sub(a[(i+1)%a.length],p),s=sub(b[(j+1)%b.length],q),d=cross(r,s),v=sub(q,p);
        if(Math.abs(d)>1e-9){const t=cross(v,s)/d,u=cross(v,r)/d;if(t>=-1e-9&&t<=1+1e-9&&u>=-1e-9&&u<=1+1e-9)found.push({x:p.x+t*r.x,y:p.y+t*r.y});}
        else if(Math.abs(cross(v,r))<1e-9){
            for(const point of [p,a[(i+1)%a.length],q,b[(j+1)%b.length]]){
                const on=(x,y)=>point.x>=Math.min(x.x,y.x)-1e-9&&point.x<=Math.max(x.x,y.x)+1e-9&&point.y>=Math.min(x.y,y.y)-1e-9&&point.y<=Math.max(x.y,y.y)+1e-9;
                if(on(p,a[(i+1)%a.length])&&on(q,b[(j+1)%b.length]))found.push(point);
            }
        }
    }
    return found;
}
let unitFootprint;
function footprint(size=82){
    if(unitFootprint)return {...unitFootprint,width:unitFootprint.width*size,height:unitFootprint.height*size,notches:unitFootprint.notches.map(p=>({x:p.x*size,y:p.y*size}))};
    const origin=layout.sceneCenter(1),cell=layout.persistentHexPoints('cell').split(' ').map(pair=>{const [x,y]=pair.split(',').map(Number);return {x:(x-50)/100,y:(y-57.735)/100};});
    const ring=Array.from({length:6},(_,i)=>{const p=layout.buttonPosition(i,{inner:true});return cell.map(v=>({x:p.x-origin.x+v.x,y:p.y-origin.y+v.y}));});
    const notches=ring.map((p,i)=>intersections(p,ring[(i+1)%6]).sort((a,b)=>b.x*b.x+b.y*b.y-a.x*a.x-a.y*a.y)[0]);
    // Largest centered regular hex contained in ALL six notch half-planes.
    // Never translate the Info independently from its calling cluster.
    let width=Infinity;
    for(let i=0;i<6;i++){
        const a=notches[i],b=notches[(i+1)%6],nx=b.y-a.y,ny=a.x-b.x,limit=nx*a.x+ny*a.y;
        for(const v of cell){const projection=nx*v.x+ny*v.y;if(projection>0)width=Math.min(width,limit/projection);}
    }
    unitFootprint={x:0,y:0,width,height:width*1.1547,notches};
    return footprint(size);
}
// A source-facing edge in the shell's border gutter. Its direction is physical,
// not a slot-index assumption, so promoted/nested and outer slots work alike.
function connector(config,source,geometry){
    if(config.connector===false||!source)return null;
    let dx=source.x-(geometry.left+geometry.width/2),dy=source.y-(geometry.top+geometry.height/2);
    if(Math.hypot(dx,dy)<1){dx=0;dy=-1;} // center-origin: top edge marker
    const w=geometry.width,h=geometry.height;
    const vertices=[[0,-h/2],[w/2,-h/4],[w/2,h/4],[0,h/2],[-w/2,h/4],[-w/2,-h/4]];
    let chosen=0,best=-Infinity;
    vertices.forEach(([x,y],i)=>{const next=vertices[(i+1)%6],nx=next[1]-y,ny=x-next[0],score=(nx*dx+ny*dy)/Math.hypot(nx,ny);if(score>best){best=score;chosen=i;}});
    const shrink=Math.max(0,1-4/w),a=vertices[chosen],b=vertices[(chosen+1)%6];
    return {x1:w/2+a[0]*shrink,y1:h/2+a[1]*shrink,x2:w/2+b[0]*shrink,y2:h/2+b[1]*shrink,color:config.connector&&config.connector.color||source.inner||SUBMENU_INNER,slot:source.slot,edge:chosen};
}
// Conservative Minkowski inset: slope factor makes padding normal to all sides.
function band(width,height,top,bottom,padding=12){
    const edge=y=>Math.max(0,(Math.abs(y-height/2)-height/4)*width/(height/2));
    const left=Math.max(edge(top),edge(bottom))+padding*1.16;
    return {left,right:width-left,width:Math.max(0,width-2*left)};
}
function layoutText(config,hass,width,measure){
    const height=width*1.1547,padding=(config.padding||12)+5,spacing=config.spacing===undefined?6:config.spacing;
    const resolved=resolve(config,hass),pages=[[]],warnings=[];let page=pages[0],y=padding;
    const positioned=config.mode==='positioned';
    function next(){if(pages.length>=LIMITS.pages){warnings.push('Content truncated at page limit');return false;}page=[];pages.push(page);y=padding;return true;}
    for(const [index,block] of resolved.blocks.entries()){
        const size=block.font_size||config.font_size||14,lineHeight=size*1.35,weight=block.weight||config.weight||400,align=block.align||config.align||'left';
        const font=`${weight} ${size}px sans-serif`;
        if(positioned&&block.y!==undefined)y=height*block.y/100;
        let rest=block.text.replace(/\r\n?/g,'\n'),first=true;
        while(rest.length||first){
            first=false;
            if(y+lineHeight>height*.70){
                if(positioned){warnings.push('Positioned content truncated; use stack mode for pagination');break;}
                if(!page.length){warnings.push('Text cannot fit at this size');y=padding-spacing;break;}
                if(!next())break;
            }
            let limits=band(width,height,y,y+lineHeight,padding);
            if(limits.width<size*2){y+=lineHeight;continue;}
            let anchor=align==='center'?width/2:align==='right'?limits.right:limits.left;
            if(positioned&&block.x!==undefined){
                const requested=width*block.x/100;
                anchor=Math.max(limits.left+size,Math.min(limits.right-size,requested));
                if(anchor!==requested&&!warnings.includes('Position clamped inside safe hexagon'))warnings.push('Position clamped inside safe hexagon');
                limits.width=align==='center'?2*Math.min(anchor-limits.left,limits.right-anchor):align==='right'?anchor-limits.left:limits.right-anchor;
            }
            const newline=rest.indexOf('\n'),segment=newline<0?rest:rest.slice(0,newline),chars=Array.from(segment);
            let count=0,line='';
            for(const ch of chars){if(measure(line+ch,font)>limits.width)break;line+=ch;count++;}
            if(count<chars.length){
                const space=line.lastIndexOf(' ');if(space>0){line=line.slice(0,space);count=Array.from(line).length;}
            }
            if(!count&&segment){warnings.push('Text cannot fit at this size');break;}
            let consumed=line.length;if(count===chars.length&&newline>=0)consumed++;
            page.push({text:line,x:anchor,y:y+size,size,weight,align,color:block.color||config.colors&&config.colors.foreground||'#f6f7f9',background:block.background,z:block.z||0,width:measure(line,font),top:y,bottom:y+lineHeight});
            rest=rest.slice(consumed).replace(/^ +/,'');y+=lineHeight;
            if(!rest)break;
        }
        if(warnings.includes('Content truncated at page limit'))break;
        y+=spacing;
    }
    if(resolved.truncated)warnings.push('Content truncated at character limit');
    if(pages.length>1&&pages[pages.length-1].length===0)pages.pop();
    return {pages:pages.map(p=>p.sort((a,b)=>a.z-b.z)),height,warnings:[...new Set(warnings)],text:resolved.blocks.map(b=>b.text).join('\n')||'No information available'};
}
function shell(config){return {mode:'generic',icon:false,name:'',label:'',show_name:false,show_label:false,interactive:false,face_mode:'cell',colors:{center:SUBMENU_FILL,inner_border:SUBMENU_INNER,outer_border:OUTER,...config.colors},border:{outer_width:3,inner_width:2}};}
module.exports={LIMITS,validate,value,dependencies,resolve,footprint,connector,band,layoutText,shell};
