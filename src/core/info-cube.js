'use strict';
// Read-only payload contract and analytic pointy-hex text layout. No DOM/HA calls.
const layout=require('./layout');
const {SUBMENU_FILL,SUBMENU_INNER,OUTER}=require('./submenu-theme');
const LIMITS=Object.freeze({blocks:128,characters:32768,pages:64});
const KEYS=['mode','title','text','blocks','spacing','padding','font_size','weight','align','colors','footprint'];
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
    if(config.footprint!==undefined&&!['slots-0-7','inner-ring'].includes(config.footprint))fail('footprint must be slots-0-7 or inner-ring.');
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
    const sources=[config.title,config.text,...(config.blocks||[]).map(b=>typeof b==='string'?b:b.text)];
    return [...new Set(sources.filter(object).map(s=>s.entity))];
}
function resolve(config,hass){
    validate(config);let remaining=LIMITS.characters;let truncated=false;
    const limited=source=>{let text=value(source,hass);if(text.length>remaining){text=text.slice(0,remaining)+'…';truncated=true;}remaining=Math.max(0,remaining-text.length);return text;};
    const blocks=[];
    if(config.title!==undefined)blocks.push({text:limited(config.title),font_size:20,weight:700,align:'center'});
    if((config.mode||'text')==='text')blocks.push({text:limited(config.text)});
    else for(const block of config.blocks)blocks.push(typeof block==='string'?{text:limited(block)}:{...block,text:limited(block.text)});
    if(!blocks.some(b=>b.text.trim()))blocks.push({text:'No information available'});
    return {blocks,truncated};
}
// Exact enclosing regular pointy hex for literal cells; slot 7 is outer LEFT.
function footprint(size=82,kind='slots-0-7'){
    const origin=layout.sceneCenter(2),points=[];
    for(let slot=0;slot<=(kind==='inner-ring'?6:7);slot++){
        const p=slot===0?origin:layout.buttonPosition(slot-1,{inner:true,outer:true,radius:2});
        for(const pair of layout.persistentHexPoints('cell').split(' ')){
            const [x,y]=pair.split(',').map(Number);
            points.push({x:(p.x-origin.x+(x-50)/100)*size,y:(p.y-origin.y+(y-57.735)/100)*size});
        }
    }
    const x=(Math.min(...points.map(p=>p.x))+Math.max(...points.map(p=>p.x)))/2;
    const y=(Math.min(...points.map(p=>p.y))+Math.max(...points.map(p=>p.y)))/2;
    const width=Math.max(...points.flatMap(p=>[2*Math.abs(p.x-x),Math.abs(p.x-x)+Math.sqrt(3)*Math.abs(p.y-y)]));
    return {x,y,width,height:width*1.1547,slots:kind==='inner-ring'?[0,1,2,3,4,5,6]:[0,1,2,3,4,5,6,7]};
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
        if(positioned&&!(config.title!==undefined&&index===0))y=height*block.y/100;
        let rest=block.text.replace(/\r\n?/g,'\n'),first=true;
        while(rest.length||first){
            first=false;
            if(y+lineHeight>height*.76){
                if(positioned){warnings.push('Positioned content truncated; use stack mode for pagination');break;}
                if(!next())break;
            }
            let limits=band(width,height,y,y+lineHeight,padding);
            if(limits.width<size*2){y+=lineHeight;if(y>=height*.76){if(positioned)break;if(!next())break;}continue;}
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
module.exports={LIMITS,validate,value,dependencies,resolve,footprint,band,layoutText,shell};
