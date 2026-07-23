(function(root){
  const PROJECT_VERSION=4;
  const ASSET_VERSION=1;
  const MIGRATION_VERSION=1;
  function now(){return new Date().toISOString();}
  function isDataUrl(v){return typeof v==='string'&&/^data:[^;,]+(;base64)?,/i.test(v);}
  function parseDataUrl(dataUrl){
    if(!isDataUrl(dataUrl))throw new Error('Invalid data URL');
    const m=dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/i);if(!m)throw new Error('Invalid data URL');
    const mime=m[1]||'application/octet-stream', body=m[3]||'';
    if(m[2]){const bin=(typeof atob!=='undefined'?atob(body):Buffer.from(body,'base64').toString('binary'));const arr=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr],{type:mime});}
    return new Blob([decodeURIComponent(body)],{type:mime});
  }
  async function blobToDataUrl(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=()=>rej(new Error('Could not read asset blob.'));r.readAsDataURL(blob);});}
  function assetRef(id,role,extra){return Object.assign({assetId:id,role,assetVersion:ASSET_VERSION},extra||{});}
  function scrubDiagnostics(d){if(!d)return d;const s=JSON.parse(JSON.stringify(d));['apiKey','authorization','Authorization','headers','sourceImage','mediaContent'].forEach(k=>{if(s&&Object.prototype.hasOwnProperty.call(s,k))delete s[k];});return s;}
  function normalizeProject(p){return Object.assign({},p,{projectVersion:p.projectVersion||PROJECT_VERSION,assetVersion:p.assetVersion||ASSET_VERSION,migrationVersion:p.migrationVersion||0,diagnostics:scrubDiagnostics(p.diagnostics)});}
  async function importLegacyDataUrls(project,assetStore){
    let p=normalizeProject(project), changed=false; const projectId=p.projectId||p.id;
    async function one(container,key,role){if(!container||!isDataUrl(container[key]))return;const legacyKey=`${role}DataUrl`;if(container.assetId||container[role+'AssetId'])return;const blob=parseDataUrl(container[key]);const asset=await assetStore.putAsset({projectId,role,blob,mimeType:blob.type,name:container.name,width:container.width,height:container.height});container[legacyKey]=container[key];container[key]=undefined;delete container[key];container.assetId=asset.assetId;container[role+'AssetId']=asset.assetId;changed=true;}
    if(p.originalMedia){await one(p.originalMedia,'dataUrl','original');if(p.originalMedia.assetId)p.originalAssetId=p.originalMedia.assetId;}
    async function projectAssets(x){if(x.originalMedia){await one(x.originalMedia,'dataUrl','original');if(x.originalMedia.assetId)x.originalAssetId=x.originalMedia.assetId;}for(const id of Object.keys(x.options||{})){const o=x.options[id];await one(o.renderedLocalPreview,'dataUrl','preview');if(o.renderedLocalPreview&&o.renderedLocalPreview.assetId)o.previewAssetId=o.renderedLocalPreview.assetId;await one(o.importedEditedImage,'dataUrl','edited');if(o.importedEditedImage&&o.importedEditedImage.assetId)o.editedAssetId=o.importedEditedImage.assetId;}}
    await projectAssets(p);for(const s of p.slides||[])if(s.project)await projectAssets(s.project);
    p.migrationVersion=MIGRATION_VERSION;p.projectVersion=PROJECT_VERSION;p.assetVersion=ASSET_VERSION;p.updatedAt=changed?now():p.updatedAt;return p;
  }
  const api={PROJECT_VERSION,ASSET_VERSION,MIGRATION_VERSION,isDataUrl,parseDataUrl,blobToDataUrl,assetRef,scrubDiagnostics,normalizeProject,importLegacyDataUrls};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.SignalMigrations=api;
})(typeof window!=='undefined'?window:globalThis);
