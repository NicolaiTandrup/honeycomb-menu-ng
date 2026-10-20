// Current-build measurements, not a claimed historical speedup. Run with Node.
const assert = require('node:assert/strict');
const {performance} = require('node:perf_hooks');
const {VisibilityIndex} = require('../../src/core/visibility');
const {allocateHubSlots} = require('../../src/core/hub-allocation');
const rows = [];
for (const count of [5,20,50]) {
    const entries = Array.from({length:count}, (_,i) => ({id:`items[${i}]`,mode:'soft',slot:0,
        visibility:[{condition:'state',entity:`binary_sensor.item_${i}`,state:'on'}]}));
    const hass = {states:Object.fromEntries(entries.map((_,i)=>[`binary_sensor.item_${i}`,{state:'on',attributes:{}}]))};
    const index = new VisibilityIndex(entries,hass);
    let previous = new Map(), allocations = 0;
    const allocate = () => {
        allocations++;
        previous = allocateHubSlots(entries.map(e=>({...e,visible:index.values.get(e.id)===true})),{previous}).placements;
    };
    allocate();
    const startEvaluations=index.metrics.evaluations, startAllocations=allocations;
    const beforeHeap=process.memoryUsage().heapUsed;
    let started=performance.now();
    for (let i=0;i<1000;i++) {
        hass.states['sensor.unrelated']={state:String(i)};
        if (index.update(hass)) allocate();
    }
    const unrelatedMs=performance.now()-started;
    assert.equal(index.metrics.evaluations-startEvaluations,0); assert.equal(allocations-startAllocations,0);
    const samples=[];
    for (let i=0;i<1000;i++) {
        hass.states['binary_sensor.item_0'].state=i%2 ? 'on' : 'off';
        started=performance.now(); if (index.update(hass)) allocate(); samples.push(performance.now()-started);
    }
    samples.sort((a,b)=>a-b);
    assert.equal(index.metrics.evaluations-startEvaluations,1000); assert.equal(allocations-startAllocations,1000);
    assert.equal(previous.size,count);
    rows.push({configured:count,visible:previous.size,updatesPerKind:1000,unrelated:{evaluations:0,allocations:0,totalMs:unrelatedMs},
        relevant:{evaluations:1000,allocations:1000,p50Ms:samples[500],p95Ms:samples[950]},
        dependencyReads:index.metrics.dependencyReads,heapUsedBefore:beforeHeap,heapUsedAfter:process.memoryUsage().heapUsed});
}
const report={scope:'Pure visibility/allocator, current build, Node '+process.version,
    caveat:'Heap snapshots include allocation and GC noise; no retained-memory or historical speedup claim.',rows};
const file=process.argv[process.argv.indexOf('--output')+1];
if (process.argv.includes('--output')) {
    const fs=require('fs'),path=require('path');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n');
}
console.log(JSON.stringify(report,null,2));
