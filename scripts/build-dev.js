'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {localMetadata}=require('./build-version');
function build(outDir) {
    const root=path.resolve(__dirname,'..');
    if(process.cwd()!==root)throw new Error('Run build:dev from the repository root.');
    const pkg=require('../package.json');
    if(!/^\d+\.\d+\.\d+-beta\.\d+-dev$/.test(pkg.version))throw new Error('build:dev accepts private beta.N-dev versions only.');
    if(execFileSync('git',['status','--porcelain','--untracked-files=normal'],{encoding:'utf8'}).trim())
        throw new Error('Commit source changes before build:dev so the embedded source commit is exact.');
    const metadata=localMetadata(pkg.version),destination=path.resolve(outDir);
    if(destination===root || destination.startsWith(root+path.sep))throw new Error('Use an output directory outside the Git worktree.');
    const temp=fs.mkdtempSync(path.join(os.tmpdir(),'honeycomb-dev-build-'));
    try {
        execFileSync(process.execPath,[path.join(__dirname,'generate-bee-asset.js')],{stdio:'inherit'});
        execFileSync(process.execPath,['--openssl-legacy-provider',require.resolve('webpack/bin/webpack.js'),'--output-path',temp],{stdio:'inherit'});
        const bytes=fs.readFileSync(path.join(temp,'honeycomb-menu-ng.js'));
        const sha256=crypto.createHash('sha256').update(bytes).digest('hex');
        const file=`honeycomb-build-${sha256}.js`;
        const manifest={schema:1,version:metadata.version,commit:metadata.commit,file,sha256,bytes:bytes.length};
        fs.mkdirSync(destination,{recursive:true});
        const bundlePath=path.join(destination,file);
        if(fs.existsSync(bundlePath)) {
            if(!fs.readFileSync(bundlePath).equals(bytes))throw new Error('Refusing to overwrite a different immutable development bundle.');
        } else fs.writeFileSync(bundlePath,bytes,{flag:'wx'});
        fs.copyFileSync(path.join(__dirname,'dev-loader.js'),path.join(destination,'honeycomb-menu-ng.js'));
        fs.writeFileSync(path.join(destination,'SHA256SUMS.txt'),`${sha256}  ${file}\n`);
        fs.copyFileSync(path.join(root,'docs/DEVELOPMENT_BUILDS.md'),path.join(destination,'INSTALL.md'));
        // Deployment copies immutable bundle first and atomically replaces the
        // manifest last. Never advertise a new build before its bytes exist.
        const staged=path.join(destination,'manifest.json.tmp');
        fs.writeFileSync(staged,JSON.stringify(manifest,null,2)+'\n');
        fs.renameSync(staged,path.join(destination,'manifest.json'));
        console.log(JSON.stringify(manifest));
        return manifest;
    } finally {fs.rmSync(temp,{recursive:true,force:true});}
}
module.exports={build};
if(require.main===module) {
    const args=process.argv.slice(2);
    if(args.length!==2 || args[0]!=='--out-dir')throw new Error('Usage: npm run build:dev -- --out-dir /tmp/honeycomb-dev');
    build(args[1]);
}
