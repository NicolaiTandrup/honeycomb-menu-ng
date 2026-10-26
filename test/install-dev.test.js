const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {install}=require('../scripts/install-dev');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
function fixture(t) {
    const root=fs.mkdtempSync(path.join(os.tmpdir(),'ng-installer-test-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
    const www=path.join(root,'www');fs.mkdirSync(www);fs.writeFileSync(path.join(www,'production.js'),'untouched');
    return {root,www};
}
function pack(root,id) {
    const source=path.join(root,'build-'+id);fs.mkdirSync(source);
    const commit=String(id).repeat(40),version=`1.9.0-beta.6-dev+${commit.slice(0,12)}`;
    const runtime=Buffer.from(`/* ${version} ${commit} ${'x'.repeat(12000)} */ window.testBuild=${id};`);
    const loader=Buffer.from('// synthetic dev loader\n'),sha256=digest(runtime),file=`honeycomb-build-${sha256}.js`;
    const manifest={schema:1,version,commit,sha256,file,bytes:runtime.length,loader_sha256:digest(loader)};
    fs.writeFileSync(path.join(source,file),runtime);fs.writeFileSync(path.join(source,'honeycomb-menu-ng.js'),loader);fs.writeFileSync(path.join(source,'manifest.json'),JSON.stringify(manifest));
    return {source,manifest,runtime};
}
test('one-command sequential installs change only dev files, retain old runtime and atomically commit manifest',t=>{
    const {root,www}=fixture(t),a=pack(root,1),b=pack(root,2);
    install(a.source,www);install(b.source,www);
    const target=path.join(www,'honeycomb-dev');assert.deepEqual(JSON.parse(fs.readFileSync(path.join(target,'manifest.json'))),b.manifest);
    assert.deepEqual(fs.readFileSync(path.join(target,a.manifest.file)),a.runtime);
    assert.deepEqual(fs.readFileSync(path.join(target,b.manifest.file)),b.runtime);
    assert.equal(fs.readFileSync(path.join(www,'production.js'),'utf8'),'untouched');
    assert.ok(!fs.readdirSync(target).some(file=>file.endsWith('.tmp') || file==='.install.lock'));
    install(b.source,www);assert.deepEqual(fs.readFileSync(path.join(target,b.manifest.file)),b.runtime);
});
test('bad runtime or loader checksum never changes the currently installed manifest',t=>{
    const {root,www}=fixture(t),a=pack(root,1),b=pack(root,2);install(a.source,www);
    const target=path.join(www,'honeycomb-dev','manifest.json'),before=fs.readFileSync(target);
    fs.appendFileSync(path.join(b.source,b.manifest.file),'tampered');assert.throws(()=>install(b.source,www),/checksum/);
    assert.deepEqual(fs.readFileSync(target),before);
    fs.writeFileSync(path.join(b.source,b.manifest.file),b.runtime);fs.appendFileSync(path.join(b.source,'honeycomb-menu-ng.js'),'tampered');assert.throws(()=>install(b.source,www),/loader checksum/);assert.deepEqual(fs.readFileSync(target),before);
});
test('reject traversal, incorrect source revision, conflicting immutable file and symlink destinations',t=>{
    const {root,www}=fixture(t),a=pack(root,1);const manifestPath=path.join(a.source,'manifest.json');
    fs.writeFileSync(manifestPath,JSON.stringify({...a.manifest,file:'../../production.js'}));assert.throws(()=>install(a.source,www),/manifest/);
    fs.writeFileSync(manifestPath,JSON.stringify({...a.manifest,commit:'2'.repeat(40)}));assert.throws(()=>install(a.source,www),/manifest/);
    fs.writeFileSync(manifestPath,JSON.stringify(a.manifest));install(a.source,www);
    fs.writeFileSync(path.join(www,'honeycomb-dev',a.manifest.file),'conflict');assert.throws(()=>install(a.source,www),/immutable/);
    const other=path.join(root,'other');fs.mkdirSync(other);fs.symlinkSync(other,path.join(root,'linked'));
    const www2=path.join(root,'www2');fs.mkdirSync(www2);fs.symlinkSync(other,path.join(www2,'honeycomb-dev'));assert.throws(()=>install(a.source,www2),/symlink/);
});
test('a concurrent install lock fails closed without touching a working deployment',t=>{
    const {root,www}=fixture(t),a=pack(root,1);install(a.source,www);
    const target=path.join(www,'honeycomb-dev'),before=fs.readFileSync(path.join(target,'manifest.json'));
    fs.mkdirSync(path.join(target,'.install.lock'));assert.throws(()=>install(a.source,www),/Another development install/);
    assert.deepEqual(fs.readFileSync(path.join(target,'manifest.json')),before);
});

const {execFileSync}=require('node:child_process');
function shellInstall(source,www){return execFileSync('sh',['scripts/install-dev.sh','--from',source,'--www',www],{encoding:'utf8',stdio:'pipe'});}
test('Terminal installer needs no Node on HA, retains successive runtimes and leaves production alone',t=>{
    const {root,www}=fixture(t),a=pack(root,1),b=pack(root,2);
    shellInstall(a.source,www);shellInstall(b.source,www);shellInstall(b.source,www);
    const destination=path.join(www,'honeycomb-dev');
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(destination,'manifest.json'))),b.manifest);
    assert.deepEqual(fs.readFileSync(path.join(destination,a.manifest.file)),a.runtime);
    assert.equal(fs.readFileSync(path.join(www,'production.js'),'utf8'),'untouched');
    assert.ok(!fs.existsSync(path.join(destination,'.install.lock')));
});
test('Terminal installer fails closed on tampering, path traversal and identity mismatch',t=>{
    const {root,www}=fixture(t),a=pack(root,1),b=pack(root,2);shellInstall(a.source,www);
    const installed=path.join(www,'honeycomb-dev','manifest.json'),before=fs.readFileSync(installed),manifest=path.join(b.source,'manifest.json');
    fs.appendFileSync(path.join(b.source,b.manifest.file),'tampered');assert.throws(()=>shellInstall(b.source,www));
    fs.writeFileSync(path.join(b.source,b.manifest.file),b.runtime);
    for(const bad of [{file:'../../production.js'},{commit:'3'.repeat(40)},{bytes:0},{loader_sha256:'bad'}]){
        fs.writeFileSync(manifest,JSON.stringify({...b.manifest,...bad}));assert.throws(()=>shellInstall(b.source,www));assert.deepEqual(fs.readFileSync(installed),before);
    }
});
test('Terminal installer refuses symlinks and active locks without overriding anything',t=>{
    const {root,www}=fixture(t),a=pack(root,1);shellInstall(a.source,www);
    const target=path.join(www,'honeycomb-dev');fs.mkdirSync(path.join(target,'.install.lock'));assert.throws(()=>shellInstall(a.source,www));fs.rmdirSync(path.join(target,'.install.lock'));
    const other=path.join(root,'other');fs.mkdirSync(other);const www2=path.join(root,'www2');fs.mkdirSync(www2);fs.symlinkSync(other,path.join(www2,'honeycomb-dev'));assert.throws(()=>shellInstall(a.source,www2));
});
test('Terminal installer downloads a complete checksum-verified package over HTTPS',async t=>{
    const {root,www}=fixture(t),a=pack(root,1),https=require('node:https');
    const key=path.join(root,'key.pem'),cert=path.join(root,'cert.pem');
    execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',cert,'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost'],{stdio:'pipe'});
    const requested=[];const server=https.createServer({key:fs.readFileSync(key),cert:fs.readFileSync(cert)},(req,res)=>{
        requested.push(req.url);const name=req.url.slice(1);
        if(!['manifest.json','honeycomb-menu-ng.js',a.manifest.file].includes(name)){res.writeHead(404);res.end();return;}
        res.end(fs.readFileSync(path.join(a.source,name)));
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));t.after(()=>new Promise(resolve=>server.close(resolve)));
    await require('node:util').promisify(require('node:child_process').execFile)('sh',['scripts/install-dev.sh','--url',`https://localhost:${server.address().port}`,'--www',www],{env:{...process.env,CURL_CA_BUNDLE:cert}});
    assert.deepEqual(requested,['/manifest.json','/'+a.manifest.file,'/honeycomb-menu-ng.js']);
    assert.deepEqual(fs.readFileSync(path.join(www,'honeycomb-dev',a.manifest.file)),a.runtime);
});
