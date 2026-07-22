(function(root){
  const PRESETS={
    'instagram-portrait':{id:'instagram-portrait',label:'Instagram portrait 4:5',width:1080,height:1350,aspectRatio:'4:5'},
    'instagram-square':{id:'instagram-square',label:'Instagram square 1:1',width:1080,height:1080,aspectRatio:'1:1'},
    'instagram-story':{id:'instagram-story',label:'Instagram story/reel 9:16',width:1080,height:1920,aspectRatio:'9:16'},
    'tiktok-vertical':{id:'tiktok-vertical',label:'TikTok 9:16',width:1080,height:1920,aspectRatio:'9:16'},
    original:{id:'original',label:'Original dimensions',width:null,height:null,aspectRatio:'original'}
  };
  const PRESERVATION_CHECKS=[
    {id:'subject',label:'Primary subject unchanged'},
    {id:'geometry',label:'Geometry/proportions unchanged'},
    {id:'colors',label:'Colors and branding preserved'},
    {id:'reflections',label:'Important reflections preserved'},
    {id:'requestedOnly',label:'Only requested objects changed'}
  ];
  const OPERATION_STATUSES=['confirmed applied','partially applied','not applied','unintended change','not reviewed'];
  function dims(m){return{width:Number(m&& (m.width||m.naturalWidth)||0),height:Number(m&&(m.height||m.naturalHeight)||0)};}
  function orientation(d){d=dims(d);return !d.width||!d.height?'unknown':d.width===d.height?'square':d.width>d.height?'landscape':'portrait';}
  function aspect(d){d=dims(d);return d.width&&d.height?d.width/d.height:0;}
  function ratioText(d){const a=aspect(d);return a?`${a.toFixed(3)}:1`:'unknown';}
  function parseType(t){return String(t||'').split(';')[0].toLowerCase();}
  function expectedFor(option,preset,original){const out=(option&&option.output)||{};const p=typeof preset==='string'?PRESETS[preset]:preset;if(p&&p.id==='original')return dims(original);return{width:(p&&p.width)||out.width||0,height:(p&&p.height)||out.height||0};}
  function issue(severity,code,message,meta){return{severity,code,message,meta:meta||{}};}
  function hasAlpha(actual){const t=parseType(actual&&actual.type||actual&&actual.mimeType);return !!(actual&&(actual.hasAlpha||actual.alpha))||t==='image/png'||t==='image/webp';}
  function verifyImportedImage({option,expected,actual,original,preset,limits}={}){
    limits={minWidth:720,minHeight:720,maxFileSize:12*1024*1024,dimensionTolerance:0.01,ratioTolerance:0.015,cropTolerance:0.08,...(limits||{})};
    const exp=expected?dims(expected):expectedFor(option,preset,original);const act=dims(actual);const issues=[];const expectedType=parseType(expected&&expected.type);const actualType=parseType(actual&&actual.type||actual&&actual.mimeType);
    if(!act.width||!act.height)issues.push(issue('error','missing_dimensions','Could not read output dimensions.'));
    if(exp.width&&act.width&&Math.abs(act.width-exp.width)/exp.width>limits.dimensionTolerance)issues.push(issue('error','dimensions',`Expected ${exp.width}×${exp.height}px, got ${act.width}×${act.height}px.`,{expected:exp,actual:act}));
    if(aspect(exp)&&aspect(act)&&Math.abs(aspect(act)-aspect(exp))>limits.ratioTolerance)issues.push(issue('error','aspect_ratio',`Expected aspect ratio ${ratioText(exp)}, got ${ratioText(act)}.`));
    if(orientation(exp)!=='unknown'&&orientation(act)!=='unknown'&&orientation(exp)!==orientation(act))issues.push(issue('error','orientation',`Expected ${orientation(exp)} orientation, got ${orientation(act)}.`));
    if(actualType&&!['image/jpeg','image/jpg','image/png','image/webp'].includes(actualType))issues.push(issue('error','file_type',`Unsupported imported file type: ${actualType}.`));
    if(expectedType&&actualType&&expectedType==='image/png'&&!hasAlpha(actual))issues.push(issue('warning','alpha_channel','PNG/transparency may be required for this output.'));
    if(act.width&&act.height&&(act.width<limits.minWidth||act.height<limits.minHeight))issues.push(issue('warning','minimum_resolution',`Resolution is low (${act.width}×${act.height}px).`));
    if(actual&&actual.size&&actual.size>limits.maxFileSize)issues.push(issue('warning','file_size',`File is large (${Math.round(actual.size/1024/1024)} MB).`));
    const orig=dims(original);if(orig.width&&orig.height&&act.width&&act.height){const originalVsActual=Math.abs(aspect(orig)-aspect(act));if(originalVsActual>limits.cropTolerance)issues.push(issue('warning','crop_change','Likely unintended crop change detected.'))}
    return{ok:!issues.some(i=>i.severity==='error'),blocked:issues.some(i=>i.severity==='error'),issues,warnings:issues.filter(i=>i.severity==='warning').map(i=>i.message),errors:issues.filter(i=>i.severity==='error').map(i=>i.message),expected:{...exp,aspectRatio:aspect(exp),orientation:orientation(exp)},actual:{...act,type:actualType,aspectRatio:aspect(act),orientation:orientation(act)},createdAt:new Date().toISOString()};
  }
  function createReview(option){const ops=(option&&option.generativeOperations)||[];return{preservation:Object.fromEntries(PRESERVATION_CHECKS.map(c=>[c.id,'not reviewed'])),operations:Object.fromEntries(ops.map((op,i)=>[op.id||`${op.operation||'operation'}-${i}`,'not reviewed']))};}
  function setOperationStatus(review,key,status){if(!OPERATION_STATUSES.includes(status))throw new Error('Invalid operation status');return{...(review||{}),operations:{...((review&&review.operations)||{}),[key]:status}};}
  function presetDimensions(presetId,original){const p=PRESETS[presetId]||PRESETS.original;return p.id==='original'?dims(original):{width:p.width,height:p.height};}
  function fileName({projectId,optionId,source,presetId,mimeType,versionId}={}){const ext=parseType(mimeType)==='image/png'?'png':'jpg';return ['signal',projectId||'project',optionId||'option',source||'preview',versionId||'current',presetId||'original'].map(s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')).filter(Boolean).join('-')+'.'+ext;}
  function chooseMime(meta,quality){return hasAlpha(meta)?{mimeType:'image/png'}:{mimeType:'image/jpeg',quality:quality==null?0.9:quality};}
  const api={PRESETS,PRESERVATION_CHECKS,OPERATION_STATUSES,verifyImportedImage,createReview,setOperationStatus,presetDimensions,fileName,chooseMime,orientation,aspect,expectedFor};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.SignalVerification=api;
})(typeof window!=='undefined'?window:globalThis);
