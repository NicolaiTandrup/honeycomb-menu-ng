// Development only: keep this resource URL stable. One refresh check/document;
// immutable build filenames keep both HA and proxy caches safe across reloads.
const key=Symbol.for('honeycombNG.developmentLoader');
if (!window[key]) {
    window[key]=(async()=>{
        if (window.honeycombNG || customElements.get('honeycomb-menu-ng'))
            throw new Error('Honeycomb NG is already loaded. Keep only one NG resource on this development HA instance, then reload.');
        const manifestURL=new URL('./manifest.json',import.meta.url);
        manifestURL.searchParams.set('_ng_dev',crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
        const controller=new AbortController();
        const timeout=setTimeout(()=>controller.abort(),8000);
        let manifest;
        try {
            const response=await fetch(manifestURL,{cache:'no-store',credentials:'same-origin',signal:controller.signal});
            if (!response.ok) throw new Error(`Development manifest HTTP ${response.status}`);
            manifest=await response.json();
        } finally {clearTimeout(timeout);}
        if (!manifest || manifest.schema!==1 || !/^[0-9a-f]{64}$/.test(manifest.sha256) ||
            manifest.file!==`honeycomb-build-${manifest.sha256}.js` ||
            !/^[0-9a-f]{40}$/.test(manifest.commit) ||
            !/^\d+\.\d+\.\d+-beta\.\d+-dev\+[0-9a-f]{12}$/.test(manifest.version) ||
            !Number.isSafeInteger(manifest.bytes) || manifest.bytes<10000)
            throw new Error('Invalid Honeycomb development manifest; deploy the complete verified development folder.');
        const moduleURL=new URL(`./${manifest.file}`,import.meta.url);
        moduleURL.search='';moduleURL.hash='';
        await import(moduleURL.href);
        if (!window.honeycombNG || window.honeycombNG.version!==manifest.version || window.honeycombNG.commit!==manifest.commit)
            throw new Error('Development manifest and executing bundle disagree. Redeploy the verified folder and reload.');
        return Object.freeze({...manifest});
    })();
    window[key].catch(error=>{
        console.error('Honeycomb development load failed:',error);
        const root=document.querySelector('home-assistant');
        if (root) root.dispatchEvent(new CustomEvent('hass-notification',{detail:{message:`Honeycomb development load failed: ${error.message}`},bubbles:true,composed:true}));
    });
}
await window[key];
