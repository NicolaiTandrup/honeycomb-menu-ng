'use strict';
// Static development assets only. No HA API/configuration, SSH, or live actions.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),vm=require('node:vm');
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
function readPackage(directory) {
    const manifestBytes=fs.readFileSync(path.join(directory,'manifest.json'));
    const m=JSON.parse(manifestBytes);
    if(m.schema!==1 || !/^[0-9a-f]{64}$/.test(m.sha256 || '') || m.file!==`honeycomb-build-${m.sha256}.js` ||
        !/^[0-9a-f]{40}$/.test(m.commit || '') || !Number.isSafeInteger(m.bytes) || m.bytes<10000 ||
        !/^\d+\.\d+\.\d+-beta\.\d+-dev\+[0-9a-f]{12}$/.test(m.version || '') ||
        !m.version.endsWith('+'+m.commit.slice(0,12)))throw new Error('Invalid development manifest.');
    const runtime=fs.readFileSync(path.join(directory,m.file));
    const loader=fs.readFileSync(path.join(directory,'honeycomb-menu-ng.js'));
    if(runtime.length!==m.bytes || digest(runtime)!==m.sha256)throw new Error('Development runtime checksum/size mismatch.');
    if(!/^[0-9a-f]{64}$/.test(m.loader_sha256 || '') || digest(loader)!==m.loader_sha256)
        throw new Error('Development loader checksum mismatch.');
    if(!runtime.includes(Buffer.from(m.version)) || !runtime.includes(Buffer.from(m.commit)))
        throw new Error('Runtime does not contain its declared build metadata.');
    new vm.Script(runtime.toString());
    return {manifest:m,manifestBytes,runtime,loader};
}
function install(directory,www) {
    const source=readPackage(path.resolve(directory));
    const root=fs.realpathSync(www),destination=path.join(root,'honeycomb-dev');
    if(fs.existsSync(destination) && fs.lstatSync(destination).isSymbolicLink())throw new Error('Development destination must not be a symlink.');
    fs.mkdirSync(destination,{recursive:true});
    const m=source.manifest,lock=path.join(destination,'.install.lock');
    for(const file of [m.file,'honeycomb-menu-ng.js','manifest.json','SHA256SUMS.txt']) {
        const target=path.join(destination,file);
        if(fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink())throw new Error('Managed development files must not be symlinks.');
    }
    try {fs.mkdirSync(lock);} catch(error) {
        if(error.code==='EEXIST')throw new Error('Another development install is active; inspect .install.lock before retrying.');
        throw error;
    }
    const staged=[];
    const replace=(file,bytes)=>{
        const temp=path.join(destination,`.${file}.${crypto.randomBytes(8).toString('hex')}.tmp`);
        staged.push(temp);fs.writeFileSync(temp,bytes,{flag:'wx'});fs.renameSync(temp,path.join(destination,file));
    };
    try {
        const runtimePath=path.join(destination,m.file);
        if(fs.existsSync(runtimePath)) {
            if(!fs.readFileSync(runtimePath).equals(source.runtime))throw new Error('Refusing to overwrite a different immutable runtime.');
        } else fs.writeFileSync(runtimePath,source.runtime,{flag:'wx'});
        replace('honeycomb-menu-ng.js',source.loader);
        replace('SHA256SUMS.txt',`${m.sha256}  ${m.file}\n`);
        // Last operation commits the deployment. Existing pages/imports keep
        // their old immutable file; no delete/rename of older runtimes occurs.
        replace('manifest.json',source.manifestBytes);
    } finally {
        for(const temp of staged)if(fs.existsSync(temp))fs.unlinkSync(temp);
        fs.rmdirSync(lock);
    }
    return {destination,version:m.version,commit:m.commit,sha256:m.sha256};
}
module.exports={readPackage,install};
if(require.main===module) {
    const args=process.argv.slice(2),options={};
    for(let i=0;i<args.length;i+=2) {
        if(!['--from','--www'].includes(args[i]) || !args[i+1] || options[args[i]])
            throw new Error('Usage: node install-dev.cjs [--from /tmp/honeycomb-dev] --www /config/www');
        options[args[i]]=args[i+1];
    }
    if(!options['--www'])throw new Error('Explicit development HA www directory required; no production destination is assumed.');
    console.log(JSON.stringify(install(options['--from'] || __dirname,options['--www']),null,2));
    console.log('Development files installed. Reload the dashboard normally; its resource URL is unchanged.');
}
