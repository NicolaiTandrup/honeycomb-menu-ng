const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const layout=require('../../src/core/layout'),models=require('./slot-models.json');
for(const name of Object.keys(models))test(`${name}: exact seven physical slots in dark accessible design mock`,()=>{
 const svg=fs.readFileSync(path.join(__dirname,name+'.svg'),'utf8');assert.ok(svg.includes('aria-labelledby="title description"'));
 const cells=[...svg.matchAll(/data-slot="(\d+)" data-x="([\d.]+)" data-y="([\d.]+)"/g)];assert.equal(cells.length,7);
 for(const [i,c] of cells.entries()){assert.equal(+c[1],i);const p=i?layout.buttonPosition(i-1,{inner:true,outer:false,radius:1}):layout.sceneCenter(1);assert.equal(+c[2],p.x);assert.equal(+c[3],p.y);}
});
test('Car retains approved slots and relative point deltas, no Update/outer slot',()=>{
 assert.deepEqual(models.car.cells.map(x=>x[0]),['64%','100%','80%','At home','HVAC off','Connected','Limit 80%']);
 assert.deepEqual(models['car-limit'].cells.slice(1).map(x=>Number(x[0].replace('−','-').replace('%',''))),[-1,1,-5,5,-10,10]);
 assert.equal(models.car.cells.length,7);
});
