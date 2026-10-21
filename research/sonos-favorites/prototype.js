'use strict';
// Read-only design proof. NOT imported by src/webpack or enabled in dashboards.
// A caller must provide the verified, online Sonos coordinator and official map.
const {validThumbnail}=require('../../src/modules/sonos/station');
function createBrowser({now=Date.now,ttl=300000,maxEntries=32}={}) {
    const connections=new WeakMap();
    return async function browse(connection,coordinator,favorites) {
        if(!connection || typeof connection.sendMessagePromise!=='function' || !/^media_player\.\w+$/.test(coordinator) ||
            !favorites || Array.isArray(favorites) || typeof favorites!=='object') throw new Error('Verified browse context required');
        const ids=Object.keys(favorites);
        if(ids.length>512 || ids.some(id=>!/^FV:[^\s]+$/.test(id) || typeof favorites[id]!=='string')) throw new Error('Invalid favorite map');
        let cache=connections.get(connection);if(!cache){cache=new Map();connections.set(connection,cache);}
        const key=JSON.stringify([coordinator,Object.entries(favorites)]),prior=cache.get(key);
        if(prior && (prior.pending || prior.expires>now()))return prior.promise;
        if(cache.size>=maxEntries){
            const removable=[...cache].find(([,entry])=>!entry.pending);
            if(!removable)throw new Error('Browse concurrency budget exhausted');
            cache.delete(removable[0]);
        }
        const entry={pending:true,expires:0};
        entry.promise=(async()=>{
            const request=(type,id)=>connection.sendMessagePromise({type:'media_player/browse_media',entity_id:coordinator,media_content_type:type,media_content_id:id});
            const root=await request('favorites','');
            if(!root || !Array.isArray(root.children) || root.children.length>8)throw new Error('Unexpected favorites root');
            const seen=new Set(),found=new Map();let count=0;
            for(const folder of root.children){
                if(!folder || folder.media_content_type!=='favorites_folder' || typeof folder.media_content_id!=='string' || !folder.media_content_id || seen.has(folder.media_content_id))throw new Error('Unexpected favorite folder');
                seen.add(folder.media_content_id);
                const result=await request('favorites_folder',folder.media_content_id);
                if(!result || !Array.isArray(result.children) || (count+=result.children.length)>512)throw new Error('Unexpected favorites payload');
                for(const item of result.children){
                    if(!item || item.media_content_type!=='favorite_item_id' || !Object.hasOwn(favorites,item.media_content_id))continue;
                    if(found.has(item.media_content_id))throw new Error('Ambiguous favorite ID');
                    found.set(item.media_content_id,Object.freeze({title:typeof item.title==='string'?item.title:favorites[item.media_content_id],
                        media_content_id:item.media_content_id,media_content_type:'favorite_item_id',
                        thumbnail:validThumbnail(item.thumbnail)?item.thumbnail:null}));
                }
            }
            // Official map is authoritative for display ordering. Never sort by title.
            return Object.freeze(ids.filter(id=>found.has(id)).map(id=>found.get(id)));
        })().then(items=>{entry.pending=false;entry.expires=now()+ttl;return items;},error=>{cache.delete(key);throw error;});
        cache.set(key,entry);return entry.promise;
    };
}
module.exports={createBrowser};
