/* Root.esp web offline cache. Published with Expo export; HTTPS/localhost only. */
const VERSION='rootesp-v2.0-professional';
const OFFLINE_CACHE=VERSION+'-assets';
function isStatic(url,mode){
  const path=new URL(url,self.location.origin).pathname;
  if(/^\/(api|users|auth|devices|plants|notifications|water|sensor|measurements)(\/|$)/.test(path))return false;
  return mode==='navigate'||path==='/'||/^\/(assets|static|_expo)\//.test(path)||/\.(js|css|png|jpe?g|webp|svg|gif|woff2?|ttf|wav|mp3|ico)$/.test(path);
}
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(OFFLINE_CACHE).then(c=>c.add('/')).then(()=>self.skipWaiting()).catch(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
  event.waitUntil(Promise.all([caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('rootesp-v')&&k!==OFFLINE_CACHE).map(k=>caches.delete(k)))),self.clients.claim()]));
});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||new URL(req.url).origin!==self.location.origin)return;
  // Never intercept API calls, authentication or live device routes. Only web app shell/assets.
  if(!isStatic(req.url,req.mode))return;
  event.respondWith((async()=>{
    const cache=await caches.open(OFFLINE_CACHE);
    try{
      const response=await fetch(req);
      if(response.ok&&response.type!=='opaque')cache.put(req,response.clone()).catch(()=>{});
      return response;
    }catch(e){
      const cached=await cache.match(req,{ignoreSearch:false});
      if(cached)return cached;
      if(req.mode==='navigate'){
        const shell=await cache.match('/');if(shell)return shell;
      }
      throw e;
    }
  })());
});

// First-load explicit precache: static assets and app JS are known only after Metro bundles execute.
self.addEventListener('message',event=>{
  if(event.data?.type!=='PRECACHE'||!Array.isArray(event.data.urls))return;
  const paths=event.data.urls.filter(u=>{try{const p=new URL(u,self.location.origin);return p.origin===self.location.origin&&p.protocol.startsWith('http')&&isStatic(u,'no-cors');}catch{return false;}}).slice(0,200);
  event.waitUntil(caches.open(OFFLINE_CACHE).then(cache=>Promise.all(paths.map(url=>cache.add(url).catch(()=>{})))));
});
