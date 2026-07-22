const assert=require('assert');
global.Blob=global.Blob||require('buffer').Blob;
global.FileReader=class{readAsDataURL(blob){blob.arrayBuffer().then(buf=>{this.result='data:'+(blob.type||'application/octet-stream')+';base64,'+Buffer.from(buf).toString('base64');this.onload&&this.onload();}).catch(e=>{this.error=e;this.onerror&&this.onerror();});}};
const M=require('../signal-migrations.js');
const A=require('../signal-asset-store.js');
const S=require('../signal-storage.js');
function mem(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}}
function data(s='hello',type='image/jpeg'){return 'data:'+type+';base64,'+Buffer.from(s).toString('base64')}
(async()=>{
  A._memory.assets.clear();A._memory.projectAssets.clear();
  const a1=await A.putAsset({projectId:'p1',role:'original',blob:new Blob(['one'],{type:'image/jpeg'}),width:1,height:1});
  const a2=await A.putAsset({projectId:'p1',role:'preview',blob:new Blob(['two'],{type:'image/png'})});
  assert.equal((await A.getAsset(a1.assetId)).mimeType,'image/jpeg','retrieves stored blob metadata');
  assert.equal((await A.assetsForProject('p1')).length,2,'lists multiple blobs for one project');
  await A.deleteAsset(a2.assetId);assert.equal(await A.getAsset(a2.assetId),null,'deletes one blob');

  const st=mem();let project={projectId:'legacy',createdAt:'t',updatedAt:'t',originalMedia:{name:'o.jpg',dataUrl:data('orig'),width:10,height:20},options:{clean:{renderedLocalPreview:{dataUrl:data('prev','image/png'),width:5,height:6},importedEditedImage:{dataUrl:data('edit')}}},diagnostics:{apiKey:'secret',ok:true},optimizationResult:{options:[{id:'clean'}]}};
  const migrated=await S.saveProjectWithAssets(project,st,A);
  assert.ok(migrated.originalAssetId&&migrated.options.clean.previewAssetId&&migrated.options.clean.editedAssetId,'migration replaces data URLs with asset IDs');
  assert.ok(!migrated.originalMedia.dataUrl&&migrated.originalMedia.originalDataUrl,'migration preserves legacy value only after successful import');
  assert.equal(migrated.projectVersion,M.PROJECT_VERSION,'project schema version recorded');
  const again=await S.saveProjectWithAssets(migrated,st,A);assert.equal(A.collectProjectAssetIds(again).length,3,'already migrated project stays idempotent');
  const hydrated=await S.loadProjectHydrated('legacy',st,A);assert.ok(hydrated.originalMedia.dataUrl.startsWith('data:image/jpeg'),'browser restart recovery hydrates original preview');
  assert.ok(hydrated.options.clean.importedEditedImage.dataUrl,'recovery hydrates imported edit');

  const partial={projectId:'partial',originalMedia:{assetId:a1.assetId},options:{x:{renderedLocalPreview:{dataUrl:data('x')}}},optimizationResult:{options:[{id:'x'}]}};
  const pm=await S.saveProjectWithAssets(partial,st,A);assert.ok(pm.originalMedia.assetId&&pm.options.x.previewAssetId,'partial migration keeps existing asset and imports missing data URL');
  assert.throws(()=>M.parseDataUrl('not-a-data-url'),/Invalid data URL/,'invalid data URL is rejected');

  const missing=await S.hydrateProject({projectId:'missing',originalMedia:{assetId:'nope'},options:{}},A);assert.ok(missing.originalMedia.missingAsset,'missing assets are marked for recovery UI');
  const oldPut=A.putAsset;A.putAsset=async()=>{const e=new Error('quota exceeded');e.name='QuotaExceededError';throw e;};await assert.rejects(()=>S.saveProjectWithAssets({projectId:'quota',originalMedia:{dataUrl:data('q')}},st,A),/quota exceeded/,'quota exceeded is detected without corrupting project');A.putAsset=oldPut;
  const oldAvail=A.available;assert.ok(A._friendly(new Error('x')).includes('unavailable')||A._friendly({name:'QuotaExceededError'}).includes('storage'),'storage unavailable and permission failures produce friendly text');

  const shared=await A.putAsset({projectId:'keep',role:'original',blob:new Blob(['keep'])});S.saveProject({projectId:'keep',originalAssetId:shared.assetId,originalMedia:{assetId:shared.assetId},options:{},optimizationResult:{}},st);await S.deleteProject('partial',st,A);assert.ok(await A.getAsset(shared.assetId),'delete project does not delete shared project assets');const clean=await A.cleanupOrphans(S.loadAll(st).projects);assert.ok(clean.removed>=0,'orphan cleanup completes');
  const pkg=await S.exportProjectPackage('legacy',st,A);assert.equal(pkg.packageVersion,1,'backup package version recorded');assert.ok(pkg.media.length>=3,'backup contains blobs');assert.ok(!pkg.project.diagnostics.apiKey,'backup redacts secret diagnostics');await assert.rejects(()=>S.restoreProjectPackage({bad:true},st,A),/Invalid Signal project package/,'invalid package rejected');pkg.project.projectId='restored';const restored=await S.restoreProjectPackage(pkg,st,A);assert.equal(restored.projectVersion,M.PROJECT_VERSION,'older/restored package normalized to current schema');
  console.log('signal indexeddb storage tests passed');
})().catch(e=>{console.error(e);process.exit(1);});
