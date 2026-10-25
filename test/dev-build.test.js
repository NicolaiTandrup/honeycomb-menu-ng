const {test}=require('node:test');
const assert=require('node:assert/strict');
const {buildMetadata}=require('../scripts/build-version');
const commit='123456789abc123456789abc123456789abc1234';
test('release and beta metadata retain exact normal versions without Git dependency',()=>{
    for(const version of ['1.8.1','1.9.0-beta.5'])assert.deepEqual(buildMetadata(version),{version,commit:null});
});
test('dev metadata embeds actual source commit and distinguishes dirty builds',()=>{
    assert.deepEqual(buildMetadata('1.9.0-beta.6-dev',commit),{version:'1.9.0-beta.6-dev+123456789abc',commit});
    assert.equal(buildMetadata('1.9.0-beta.6-dev',commit,true).version,'1.9.0-beta.6-dev+123456789abc.dirty');
    assert.throws(()=>buildMetadata('1.9.0-beta.6-dev','missing'),/real Git/);
});
test('missing compiler metadata fails gracefully without inventing a release version',()=>{
    assert.deepEqual(require('../src/core/build-info'),{version:'Version unavailable',commit:null});
});
