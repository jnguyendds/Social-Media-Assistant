(function(root){
  const SCHEMA_VERSION='2.0';
  const PROHIBITED_PATTERNS=[/\b(reshoot|re-shoot|retake|take another|new photo|new video)\b/i,/\b(different|another|better)\s+(angle|camera|lens|location|lighting|time of day)\b/i,/\b(shoot|film|capture)\s+(from|at|with)\b/i,/\bmove\s+(the\s+)?(subject|vehicle|product)\b/i,/\bmanually\s+(remove|edit|crop|adjust|brighten|fix)\b/i];
  const SECRET_PATTERNS=[/sk-[a-z0-9_-]+/ig,/api[_-]?key\s*[:=]\s*[^\s,;]+/ig,/token\s*[:=]\s*[^\s,;]+/ig,/secret\s*[:=]\s*[^\s,;]+/ig];

  function parseOptimizationResponse(rawText){
    const raw=String(rawText||'').trim();
    const unfenced=raw.replace(/^```(?:json)?\s*/i,'').replace(/```$/,'').trim();
    try{return JSON.parse(unfenced);}catch(firstError){
      const start=unfenced.indexOf('{'),end=unfenced.lastIndexOf('}');
      if(start>-1&&end>start)return JSON.parse(unfenced.slice(start,end+1));
      throw new Error('Result came back incomplete. Try again.');
    }
  }
  function isPlainObject(v){return v!==null&&typeof v==='object'&&!Array.isArray(v);}
  function cleanString(v){return String(v==null?'':v).trim();}
  function clampInt(v,min,max,fallback){const n=Math.round(Number(v));return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
  function unique(arr){return Array.from(new Set((arr||[]).filter(Boolean)));}
  function sanitizeForLog(value){return JSON.stringify(value,(k,v)=>typeof v==='string'?SECRET_PATTERNS.reduce((s,re)=>s.replace(re,'[redacted]'),v):v).slice(0,2000);}
  function hasProhibitedLanguage(text){return PROHIBITED_PATTERNS.some(re=>re.test(String(text||'')));}
  function collectText(value,out=[]){
    if(typeof value==='string')out.push(value);
    else if(Array.isArray(value))value.forEach(v=>collectText(v,out));
    else if(isPlainObject(value))Object.values(value).forEach(v=>collectText(v,out));
    return out;
  }
  function platformFromLegacy(legacy){
    if(legacy.instagram&&!legacy.tiktok)return'instagram';
    if(legacy.tiktok&&!legacy.instagram)return'tiktok';
    return'instagram';
  }
  function formatFor(platform,contentType){
    if(platform==='tiktok')return{name:'TikTok 9:16',aspectRatio:'9:16',width:1080,height:1920};
    if(contentType==='video')return{name:'Reels 9:16',aspectRatio:'9:16',width:1080,height:1920};
    return{name:'Instagram Feed 4:5',aspectRatio:'4:5',width:1080,height:1350};
  }
  function defaultScore(base,offset){
    const n=clampInt((Number(base)||3.5)*20+offset,0,100,72);
    return{overall:n,composition:clampInt(n-2,0,100,70),platformFit:clampInt(n+offset/2,0,100,72),technicalQuality:clampInt(n-4,0,100,68),subjectPreservation:92,generativeConfidence:82,disclaimer:'Directional score comparing Signal options; not a promise of engagement or revenue.'};
  }
  function normalizeHashtag(tag){const t=cleanString(tag);return t?`#${t.replace(/^#+/,'').replace(/\s+/g,'')}`:'';}
  function makeHandoff(optionName,ops,format,preserve){
    if(!ops.length)return null;
    const opText=ops.map(op=>op.instruction).join(' ');
    return{editor:'chatgpt',prompt:`Create the ${optionName} finished version. ${opText} Preserve ${preserve.join(', ')}. Keep ${format.aspectRatio} and return one finished image, not advice.`,expectedOutput:'One finished media asset, not advice.'};
  }
  function legacyPlatformResult(legacy,platform){return platform==='tiktok'?legacy.tiktok||legacy.instagram:legacy.instagram||legacy.tiktok;}
  function buildLegacyUi(v2,legacy){
    if(legacy&&legacy.instagram!==undefined)return legacy;
    const first=v2.options[0]||{};
    const score=s=>s==null?null:Math.round(s/20*10)/10;
    const platform={overall:score(first.score&&first.score.overall),scores:{hook:score(first.score&&first.score.platformFit),pacing:v2.contentType==='video'?score(first.score&&first.score.platformFit):null,completion:v2.contentType==='video'?score(first.score&&first.score.overall):null,trendFit:score(first.score&&first.score.platformFit),audio:v2.contentType==='video'?3:null,textOverlay:score(first.score&&first.score.composition),shareability:score(first.score&&first.score.platformFit),saveWorthiness:score(first.score&&first.score.overall),originality:score(first.score&&first.score.composition),caption:3.8}};
    return{category:v2.subject.description,contentType:v2.contentType==='image'?'photo':'video',cropFocus:{x:.5,y:.5},instagram:v2.platform==='tiktok'?null:platform,tiktok:v2.platform==='instagram'?null:platform,topFixes:v2.options.slice(0,3).map(o=>({fix:o.name,why:o.description})),idealVersion:first.description||'',hashtags:{instagram:v2.hashtags.recommended||[],tiktok:v2.hashtags.recommended||[]},captions:(v2.captions||[]).map(c=>c.text),cleanupInstructions:(first.handoff&&first.handoff.prompt)||'',videoEdit:first.videoPlan?'Use the selected Signal option as the CapCut checklist.':''};
  }
  function adaptLegacyToV2(legacy){
    const platform=platformFromLegacy(legacy),contentType=legacy.contentType==='video'?'video':'image',format=formatFor(platform,contentType),preserve=['primary subject identity','geometry and proportions','colors and branding','position and important reflections'];
    const pr=legacyPlatformResult(legacy,platform)||{overall:3.5};
    const cleanup=cleanString(legacy.cleanupInstructions);
    const captions=(legacy.captions||[]).map(c=>({text:cleanString(c),tone:'platform-native',callToAction:null})).filter(c=>c.text);
    if(!captions.length)captions.push({text:'Finished and ready to post.',tone:'clean',callToAction:null});
    const sourceTags=platform==='tiktok'?(legacy.hashtags&&legacy.hashtags.tiktok):(legacy.hashtags&&legacy.hashtags.instagram);
    const generativeOps=cleanup?[{operation:'removeObject',instruction:cleanup,targets:['visible distractions identified by Signal'],reconstruction:'Fill removed areas to match surrounding texture, lighting, reflections, and depth.',preserve}]:[];
    const specs=[
      ['clean','Clean','Realistic correction and distraction removal while preserving the uploaded scene.','readyNow','low',['exposure','whiteBalance','contrast','sharpen'],generativeOps,0],
      ['premium','Premium','Refined color, controlled reflections, and stronger subject separation.','requiresChatGPT','medium',['exposure','contrast','vibrance','vignette'],generativeOps.length?generativeOps:[{operation:'reduceGlare',instruction:'Reduce distracting glare or harsh reflections only where it does not alter the subject.',targets:['background glare or distracting reflections'],reconstruction:'Blend corrected areas naturally with existing surfaces.',preserve}],5],
      ['bold','Bold','Higher-impact contrast and thumbnail clarity for fast platform scanning.','readyNow','medium',['contrast','saturation','sharpen','vignette'],[],8],
      ['platform-native','Platform Native',`Composed and exported for ${format.name} with platform-safe framing.`,'readyNow','low',['crop','resize','contrast'],[],3]
    ];
    const options=specs.slice(0,contentType==='video'?3:4).map(([id,name,description,status,risk,ops,gen,offset])=>({id,name,description,status:gen.length?status:'readyNow',risk,output:{width:format.width,height:format.height,aspectRatio:format.aspectRatio,mimeType:contentType==='video'?'video/mp4':'image/jpeg'},localAdjustments:ops.map(operation=>({operation,value:operation==='crop'?format.aspectRatio:operation==='resize'?{width:format.width,height:format.height}:true,target:'full media'})),generativeOperations:gen,preservationRules:preserve,approvalReason:risk==='high'?'Creative transformation requires approval.':null,handoff:makeHandoff(name,gen,format,preserve),score:defaultScore(pr.overall,offset),videoPlan:contentType==='video'?{captionsRequired:true,audio:{retainOriginal:true,musicSuggested:true,voicePriority:true}}:null}));
    return{schemaVersion:SCHEMA_VERSION,contentType,platform,format,subject:{type:'other',description:cleanString(legacy.category)||'uploaded subject',preserve,boundingBoxes:legacy.cropFocus?[{x:Math.max(0,Number(legacy.cropFocus.x)||.5),y:Math.max(0,Number(legacy.cropFocus.y)||.5),width:.1,height:.1,units:'normalized',label:'legacy crop focus'}]:[]},options,captions,hashtags:{recommended:unique((sourceTags||[]).map(normalizeHashtag)),avoid:['#fyp','#foryou','#viral']},security:{retainOriginal:true,stripMetadataOnExport:true,sendOnlyRequiredMedia:true,prohibitedData:['credentials','apiKeys','privateTokens','unrelatedFiles','hiddenUserData']},legacy:{source:'v1-analyzer',ui:legacy}};
  }
  function isLegacyResponse(value){return isPlainObject(value)&&['photo','video'].includes(value.contentType)&&('instagram'in value||'tiktok'in value)&&Array.isArray(value.topFixes);}
  function isNativeV2(value){return isPlainObject(value)&&value.schemaVersion===SCHEMA_VERSION&&Array.isArray(value.options);}
  function validateV2(value){
    const errors=[];
    if(!isPlainObject(value))return{valid:false,errors:['result must be an object']};
    if(value.schemaVersion!==SCHEMA_VERSION)errors.push('schemaVersion must be 2.0');
    if(!['image','video'].includes(value.contentType))errors.push('contentType must be image or video');
    if(!['instagram','tiktok','facebook','youtube','linkedin','x','other'].includes(value.platform))errors.push('platform is invalid');
    const f=value.format;if(!isPlainObject(f))errors.push('format is required');else{if(!cleanString(f.name))errors.push('format.name is required');if(!/^\d+:\d+$/.test(String(f.aspectRatio||'')))errors.push('format.aspectRatio is invalid');if(!Number.isInteger(f.width)||f.width<1)errors.push('format.width must be a positive integer');if(!Number.isInteger(f.height)||f.height<1)errors.push('format.height must be a positive integer');}
    const s=value.subject;if(!isPlainObject(s))errors.push('subject is required');else{if(!cleanString(s.description))errors.push('subject.description is required');if(!Array.isArray(s.preserve)||!s.preserve.length)errors.push('subject.preserve is required');if(Array.isArray(s.boundingBoxes))s.boundingBoxes.forEach((b,i)=>{if(!isPlainObject(b)||Number(b.x)<0||Number(b.y)<0||Number(b.width)<=0||Number(b.height)<=0||!['normalized','pixels'].includes(b.units))errors.push(`subject.boundingBoxes[${i}] is invalid`);});}
    if(!Array.isArray(value.options)||value.options.length<2||value.options.length>4)errors.push('options must contain 2 to 4 items');
    else value.options.forEach((o,i)=>{if(!isPlainObject(o)){errors.push(`options[${i}] must be an object`);return;}['id','name','description','status','risk','output','localAdjustments','generativeOperations','preservationRules','score'].forEach(k=>{if(!(k in o))errors.push(`options[${i}].${k} is required`);});if(!o.output||!Number.isInteger(o.output.width)||!Number.isInteger(o.output.height)||o.output.width<1||o.output.height<1||!/^\d+:\d+$/.test(String(o.output.aspectRatio||'')))errors.push(`options[${i}].output dimensions/aspectRatio are invalid`);if(!Array.isArray(o.preservationRules)||!o.preservationRules.length)errors.push(`options[${i}].preservationRules is required`);['overall','composition','platformFit','technicalQuality','subjectPreservation','generativeConfidence'].forEach(k=>{const n=o.score&&o.score[k];if(!Number.isInteger(n)||n<0||n>100)errors.push(`options[${i}].score.${k} must be 0-100`);});});
    if(!Array.isArray(value.captions))errors.push('captions must be an array');
    if(!isPlainObject(value.hashtags)||!Array.isArray(value.hashtags.recommended))errors.push('hashtags.recommended must be an array');
    if(collectText(value).some(hasProhibitedLanguage))errors.push('result contains prohibited reshoot/camera/manual-edit language');
    return{valid:!errors.length,errors};
  }
  function normalizeV2(value){
    const v=JSON.parse(JSON.stringify(value));
    v.captions=(v.captions||[]).filter(c=>cleanString(c.text)).map(c=>({text:cleanString(c.text),tone:c.tone||'platform-native',callToAction:c.callToAction==null?null:cleanString(c.callToAction)}));
    if(!v.captions.length)v.captions=[{text:'Ready to post.',tone:'clean',callToAction:null}];
    v.hashtags={recommended:unique(((v.hashtags&&v.hashtags.recommended)||[]).map(normalizeHashtag)),avoid:unique(((v.hashtags&&v.hashtags.avoid)||[]).map(normalizeHashtag))};
    v.legacy=v.legacy||{};v.legacy.ui=buildLegacyUi(v,v.legacy.ui);
    return v;
  }
  function parseValidateNormalizeOptimizationResult(rawText){
    const parsed=parseOptimizationResponse(rawText);
    const candidate=isNativeV2(parsed)?parsed:(isLegacyResponse(parsed)?adaptLegacyToV2(parsed):parsed);
    const validation=validateV2(candidate);
    if(!validation.valid){console.error('Signal V2 validation failed',validation.errors,sanitizeForLog(candidate));throw new Error('Analyzer returned an unexpected result. Please try again.');}
    return normalizeV2(candidate);
  }
  function getLegacyView(result){return result&&result.legacy&&result.legacy.ui?result.legacy.ui:buildLegacyUi(result||{},null);}
  function getCropFocus(result){const ui=getLegacyView(result);return ui.cropFocus||{x:.5,y:.5};}
  const api={schemaVersion:SCHEMA_VERSION,parseOptimizationResponse,validateOptimizationResult:validateV2,normalizeOptimizationResult:normalizeV2,adaptLegacyToV2,parseValidateNormalizeOptimizationResult,getLegacyView,getCropFocus};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.SignalContract=api;
})(typeof window!=='undefined'?window:globalThis);
