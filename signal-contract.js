(function(root){
  const SCHEMA_VERSION='2.0';
  const PROHIBITED_PATTERNS=[/\b(reshoot|re-shoot|retake|take another|new photo|new video)\b/i,/\b(different|another|better)\s+(angle|camera|lens|location|lighting|time of day)\b/i,/\b(shoot|film|capture)\s+(from|at|with)\b/i,/\bmove\s+(the\s+)?(subject|vehicle|product)\b/i,/\bmanually\s+(remove|edit|crop|adjust|brighten|fix)\b/i];
  const Scoring=root.SignalScoring||(typeof require!=='undefined'?require('./signal-scoring.js'):null);
  const SECRET_PATTERNS=[/sk-[a-z0-9_-]+/ig,/api[_-]?key\s*[:=]\s*[^\s,;]+/ig,/token\s*[:=]\s*[^\s,;]+/ig,/secret\s*[:=]\s*[^\s,;]+/ig];
  const RESPONSE_SHAPE={subject:{boundingBoxes:'array of objects: [{x:0.12,y:0.18,width:0.44,height:0.52,units:"normalized",label:"primary subject"}]. Signal also normalizes equivalent [x,y,width,height] arrays and {x,y,w,h} objects.'},options:{captions:'each option has an array of caption objects: [{text:"",tone:"platform-native",callToAction:null}]',hashtags:{recommended:'each option has an array of hashtag strings: ["#example"]',avoid:'array of hashtag strings'}}};

  function parseOptimizationResponse(rawText){
    const raw=String(rawText||'').trim();
    const unfenced=raw.replace(/^```(?:json)?\s*/i,'').replace(/```$/,'').trim();
    try{return JSON.parse(unfenced);}catch(firstError){
      const start=unfenced.indexOf('{'),end=unfenced.lastIndexOf('}');
      if(start>-1&&end>start)return JSON.parse(unfenced.slice(start,end+1));
      throw new Error('Result came back incomplete. Try again.');
    }
  }
  function normalizeContract(value,context){
    const ctx=context||{};
    if(!isPlainObject(value))return value;
    if(isLegacyResponse(value))return adaptLegacyToV2(value);
    if(value.schemaVersion!==SCHEMA_VERSION||!Array.isArray(value.options))return value;
    const v=JSON.parse(JSON.stringify(value));
    let touched=false;
    const topSubject=isPlainObject(v.subject)?v.subject:{};
    const ctxFormat=ctx.selectedFormat||ctx.format;
    if(!v.contentType&&((ctx.source&&ctx.source.mediaType)||ctx.mediaType)){v.contentType=(ctx.source&&ctx.source.mediaType)||ctx.mediaType;touched=true;}
    if(!v.platform&&(ctx.selectedPlatform||ctx.platform)){v.platform=ctx.selectedPlatform||ctx.platform;touched=true;}
    if(!v.format&&isPlainObject(ctxFormat)){v.format=ctxFormat;touched=true;}
    if(!isPlainObject(v.subject)){v.subject={};touched=true;}
    if(!Array.isArray(v.subject.boundingBoxes)){
      const boxes=[];
      v.options.forEach(o=>{if(isPlainObject(o.subject)&&Array.isArray(o.subject.boundingBoxes))boxes.push(...o.subject.boundingBoxes);});
      if(boxes.length){v.subject.boundingBoxes=boxes;touched=true;}
    }
    if(!cleanString(v.subject.description)){v.subject.description=cleanString(topSubject.description)||cleanString(ctx.subjectDescription)||'uploaded subject';touched=true;}
    if(!Array.isArray(v.subject.preserve)||!v.subject.preserve.length){
      const preserve=[];v.options.forEach(o=>{if(Array.isArray(o.preservationRules))preserve.push(...o.preservationRules);});
      const ctxPreserve=Array.isArray(ctx.preservationRules)?ctx.preservationRules:[];
      const merged=unique([...preserve,...ctxPreserve]);if(merged.length){v.subject.preserve=merged;touched=true;}
    }
    v.options=v.options.map((o,i)=>{if(!isPlainObject(o))return o;const n={...o};
      if(n.captions==null&&Array.isArray(v.captions)){n.captions=v.captions;touched=true;}
      if(n.hashtags==null&&isPlainObject(v.hashtags)){n.hashtags=v.hashtags;touched=true;}
      if(n.id==null&&n.optionId!=null){n.id=n.optionId;touched=true;}
      if(n.name==null&&(n.label!=null||n.title!=null)){n.name=n.label!=null?n.label:n.title;touched=true;}
      if(n.output==null&&n.outputDimensions!=null){n.output={...n.outputDimensions};delete n.output.units;touched=true;}
      if(n.localAdjustments==null&&n.adjustments!=null){n.localAdjustments=Object.entries(n.adjustments).map(([operation,value])=>({operation,value,target:'full media'}));touched=true;}
      if(n.preservationRules==null&&Array.isArray(v.subject.preserve)){n.preservationRules=v.subject.preserve;touched=true;}
      if(n.status==null){n.status=(Array.isArray(n.generativeOperations)&&n.generativeOperations.length)?'requiresChatGPT':'readyNow';touched=true;}
      if(n.risk==null){n.risk=(Array.isArray(n.generativeOperations)&&n.generativeOperations.length)?'medium':'low';touched=true;}
      if(n.description==null&&n.name!=null){n.description=cleanString(n.name)+' finished optimization.';touched=true;}
      return n;});
    return touched?v:value;
  }
  function validationCategory(value,validationErrors){
    if(!isPlainObject(value)||value.schemaVersion!==SCHEMA_VERSION||!Array.isArray(value.options))return'unsupported-schema';
    return'schema-validation';
  }
  function parseStrictNativeV2(rawText,context){
    const raw=String(rawText||'').trim();
    if(!raw||raw[0]!=='{'||raw[raw.length-1]!=='}'){const err=new Error('native V2 response must be a single JSON object without prose or fences');err.category='invalid-json';throw err;}
    let parsed;try{parsed=JSON.parse(raw);}catch(e){e.category='invalid-json';throw e;}
    const candidate=normalizeContract(parsed,context);
    if(!isNativeV2(candidate)){const err=new Error('response is not native V2');err.category='unsupported-schema';throw err;}
    const validation=validateV2(candidate);
    if(!validation.valid){const err=new Error('native V2 validation failed');err.validationErrors=validation.errors;err.category=validationCategory(candidate,validation.errors);throw err;}
    const diversity=validateSemanticDiversity(candidate);
    if(!diversity.valid){const err=new Error('native V2 diversity check failed');err.validationErrors=diversity.errors;throw err;}
    return normalizeV2(candidate);
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
  function normalizeBoundingBox(box){
    if(Array.isArray(box)){
      if(box.length!==4)return null;
      const [x,y,width,height]=box.map(Number);
      return{x,y,width,height,units:'normalized'};
    }
    if(!isPlainObject(box))return null;
    const x=Number(box.x),y=Number(box.y),width=Number(box.width!=null?box.width:box.w),height=Number(box.height!=null?box.height:box.h);
    return{x,y,width,height,units:box.units||'normalized',label:box.label==null?undefined:cleanString(box.label)};
  }
  function isValidBoundingBox(box){
    const b=normalizeBoundingBox(box);
    if(!b)return false;
    const nums=[b.x,b.y,b.width,b.height];
    if(nums.some(n=>!Number.isFinite(n))||b.x<0||b.y<0||b.width<=0||b.height<=0)return false;
    if(!['normalized','pixels'].includes(b.units))return false;
    if(b.units==='normalized'&&(b.x>1||b.y>1||b.width>1||b.height>1||b.x+b.width>1.001||b.y+b.height>1.001))return false;
    return true;
  }
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
    options.forEach(o=>{o.captions=captions;o.hashtags={recommended:unique((sourceTags||[]).map(normalizeHashtag)),avoid:['#fyp','#foryou','#viral']};});
    return{schemaVersion:SCHEMA_VERSION,promptVersion:'legacy-adapted',contentType,platform,format,subject:{type:'other',description:cleanString(legacy.category)||'uploaded subject',preserve,boundingBoxes:legacy.cropFocus?[{x:Math.max(0,Number(legacy.cropFocus.x)||.5),y:Math.max(0,Number(legacy.cropFocus.y)||.5),width:.1,height:.1,units:'normalized',label:'legacy crop focus'}]:[]},options,captions,hashtags:{recommended:unique((sourceTags||[]).map(normalizeHashtag)),avoid:['#fyp','#foryou','#viral']},security:{retainOriginal:true,stripMetadataOnExport:true,sendOnlyRequiredMedia:true,prohibitedData:['credentials','apiKeys','privateTokens','unrelatedFiles','hiddenUserData']},legacy:{source:'v1-analyzer',ui:legacy}};
  }
  function isLegacyResponse(value){return isPlainObject(value)&&['photo','video'].includes(value.contentType)&&('instagram'in value||'tiktok'in value)&&Array.isArray(value.topFixes);}
  function isNativeV2(value){return isPlainObject(value)&&value.schemaVersion===SCHEMA_VERSION&&Array.isArray(value.options);}
  function validateV2(value){
    const errors=[];
    if(!isPlainObject(value))return{valid:false,errors:['result must be an object']};
    if(value.schemaVersion!==SCHEMA_VERSION)errors.push('schemaVersion must be 2.0');
    if(!cleanString(value.promptVersion))errors.push('promptVersion is required');
    if(!['image','video'].includes(value.contentType))errors.push('contentType must be image or video');
    if(!['instagram','tiktok','facebook','youtube','linkedin','x','other'].includes(value.platform))errors.push('platform is invalid');
    const f=value.format;if(!isPlainObject(f))errors.push('format is required');else{if(!cleanString(f.name))errors.push('format.name is required');if(!/^\d+:\d+$/.test(String(f.aspectRatio||'')))errors.push('format.aspectRatio is invalid');if(!Number.isInteger(f.width)||f.width<1)errors.push('format.width must be a positive integer');if(!Number.isInteger(f.height)||f.height<1)errors.push('format.height must be a positive integer');}
    const s=value.subject;if(!isPlainObject(s))errors.push('subject is required');else{if(!cleanString(s.description))errors.push('subject.description is required');if(!Array.isArray(s.preserve)||!s.preserve.length)errors.push('subject.preserve is required');if(Array.isArray(s.boundingBoxes))s.boundingBoxes.forEach((b,i)=>{if(!isValidBoundingBox(b))errors.push(`subject.boundingBoxes[${i}] is invalid`);});}
    if(!Array.isArray(value.options)||value.options.length<2||value.options.length>4)errors.push('options must contain 2 to 4 items');
    else value.options.forEach((o,i)=>{if(!isPlainObject(o)){errors.push(`options[${i}] must be an object`);return;}['id','name','description','status','risk','output','localAdjustments','generativeOperations','preservationRules','score'].forEach(k=>{if(!(k in o))errors.push(`options[${i}].${k} is required`);});if(!o.output||!Number.isInteger(o.output.width)||!Number.isInteger(o.output.height)||o.output.width<1||o.output.height<1||!/^\d+:\d+$/.test(String(o.output.aspectRatio||'')))errors.push(`options[${i}].output dimensions/aspectRatio are invalid`);if(!Array.isArray(o.preservationRules)||!o.preservationRules.length)errors.push(`options[${i}].preservationRules is required`);const nativeKeys=['compositionScore','subjectPreservationScore','cleanupQualityScore','distractionRemovalScore','aestheticScore','platformSuitabilityScore','technicalConfidenceScore'];const legacyKeys=['overall','composition','platformFit','technicalQuality','subjectPreservation','generativeConfidence'];const hasNative=nativeKeys.every(k=>Number.isInteger(o.score&&o.score[k])&&o.score[k]>=0&&o.score[k]<=100);const hasLegacy=legacyKeys.every(k=>Number.isInteger(o.score&&o.score[k])&&o.score[k]>=0&&o.score[k]<=100);if(!hasNative&&!hasLegacy)errors.push(`options[${i}].score must include valid 0-100 Signal scoring keys`);});
    (value.options||[]).forEach((o,i)=>{if(!isPlainObject(o))return;if(!Array.isArray(o.captions))errors.push(`options[${i}].captions must be an array`);if(!isPlainObject(o.hashtags)||!Array.isArray(o.hashtags.recommended))errors.push(`options[${i}].hashtags.recommended must be an array`);});
    if(collectText(value).some(hasProhibitedLanguage))errors.push('result contains prohibited reshoot/camera/manual-edit language');
    return{valid:!errors.length,errors};
  }
  function signature(v){return JSON.stringify(v||null).toLowerCase().replace(/\s+/g,'');}
  function words(v){return cleanString(v).toLowerCase().replace(/[^a-z0-9 ]/g,' ').split(/\s+/).filter(w=>w.length>3);}
  function jaccard(a,b){const A=new Set(a),B=new Set(b);let inter=0;A.forEach(x=>{if(B.has(x))inter++;});const uni=new Set([...A,...B]).size||1;return inter/uni;}
  function validateSemanticDiversity(value){
    const errors=[], opts=Array.isArray(value&&value.options)?value.options:[];
    for(let i=0;i<opts.length;i++)for(let j=i+1;j<opts.length;j++){const a=opts[i],b=opts[j];
      if(cleanString(a.name).toLowerCase()===cleanString(b.name).toLowerCase())errors.push(`options[${i}] and options[${j}] names are duplicates`);
      if(signature(a.localAdjustments)===signature(b.localAdjustments))errors.push(`options[${i}] and options[${j}] local adjustments are duplicate`);
      if(signature(a.output)===signature(b.output)&&signature(a.localAdjustments)===signature(b.localAdjustments))errors.push(`options[${i}] and options[${j}] crops and dimensions are duplicate`);
      if(jaccard(words(a.description),words(b.description))>.72)errors.push(`options[${i}] and options[${j}] descriptions are too similar`);
      if(signature(a.generativeOperations)===signature(b.generativeOperations)&&signature(a.generativeOperations)!=='[]')errors.push(`options[${i}] and options[${j}] generative operations are duplicate`);
    }
    return{valid:!errors.length,errors};
  }
  function normalizeV2(value){
    const v=JSON.parse(JSON.stringify(value));
    if(v.subject&&Array.isArray(v.subject.boundingBoxes))v.subject.boundingBoxes=v.subject.boundingBoxes.map(normalizeBoundingBox).filter(Boolean).map(b=>{const out={x:b.x,y:b.y,width:b.width,height:b.height,units:b.units};if(b.label)out.label=b.label;return out;});
    v.options.forEach(o=>{o.captions=(o.captions||[]).filter(c=>cleanString(c.text)).map(c=>({text:cleanString(c.text),tone:c.tone||'platform-native',callToAction:c.callToAction==null?null:cleanString(c.callToAction)}));if(!o.captions.length)o.captions=[{text:'Ready to post.',tone:'clean',callToAction:null}];o.hashtags={recommended:unique(((o.hashtags&&o.hashtags.recommended)||[]).map(normalizeHashtag)),avoid:unique(((o.hashtags&&o.hashtags.avoid)||[]).map(normalizeHashtag))};});
    // Compatibility projection for existing renderers; option data remains canonical.
    v.captions=v.options[0].captions;v.hashtags=v.options[0].hashtags;
    const scoringContext={brandProfile:v.brandProfile,profileSnapshot:v.profileSnapshot,profileId:v.profileId};
    if(Scoring&&Scoring.normalizeOptionInPlace)(v.options||[]).forEach(o=>Scoring.normalizeOptionInPlace(o,scoringContext));
    v.diagnostics={...(v.diagnostics||{}),scoring:Scoring?{promptVersion:Scoring.PROMPT_VERSION,options:(v.options||[]).map(o=>({id:o.id,status:o.scoring&&o.scoring.status,source:o.scoring&&o.scoring.source,validationFailures:(o.scoring&&o.scoring.diagnostics)||[]}))}:null};
    v.legacy=v.legacy||{};v.legacy.ui=buildLegacyUi(v,v.legacy.ui);
    return v;
  }
  function parseValidateNormalizeOptimizationResult(rawText){
    const parsed=parseOptimizationResponse(rawText);
    const candidate=normalizeContract(parsed);
    const validation=validateV2(candidate);
    if(!validation.valid){console.error('Signal V2 validation failed',validation.errors,sanitizeForLog(candidate));throw new Error('Analyzer returned an unexpected result. Please try again.');}
    return normalizeV2(candidate);
  }
  function getLegacyView(result){return result&&result.legacy&&result.legacy.ui?result.legacy.ui:buildLegacyUi(result||{},null);}
  function getCropFocus(result){const ui=getLegacyView(result);return ui.cropFocus||{x:.5,y:.5};}
  const api={schemaVersion:SCHEMA_VERSION,responseShape:RESPONSE_SHAPE,parseOptimizationResponse,normalizeContract,parseStrictNativeV2,validateOptimizationResult:validateV2,validateSemanticDiversity,normalizeOptimizationResult:normalizeV2,adaptLegacyToV2,parseValidateNormalizeOptimizationResult,getLegacyView,getCropFocus};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.SignalContract=api;
})(typeof window!=='undefined'?window:globalThis);
