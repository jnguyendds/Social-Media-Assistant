const assert=require('assert');
const SignalContract=require('../signal-contract.js');
const baseOption={id:'clean',name:'Clean',description:'Finished clean correction.',status:'readyNow',risk:'low',output:{width:1080,height:1350,aspectRatio:'4:5'},localAdjustments:[{operation:'crop',value:'4:5'}],generativeOperations:[],preservationRules:['vehicle geometry','branding'],score:{overall:80,composition:80,platformFit:80,technicalQuality:80,subjectPreservation:95,generativeConfidence:90}};
const native={schemaVersion:'2.0',promptVersion:'signal-v2.1-photo',contentType:'image',platform:'instagram',format:{name:'Instagram Feed',aspectRatio:'4:5',width:1080,height:1350},subject:{type:'vehicle',description:'red coupe',preserve:['paint','badges','reflections']},options:[baseOption,{...baseOption,id:'premium',name:'Premium',description:'Luxury finish.',score:{...baseOption.score,overall:84}}],captions:[{text:'Ready to drive.',tone:'premium',callToAction:null}],hashtags:{recommended:['#cars'],avoid:['#fyp']}};
function legacy(){return{category:'vehicle',contentType:'photo',cropFocus:{x:.4,y:.5},instagram:{overall:4,scores:{hook:4,pacing:null,completion:null,trendFit:4,audio:null,textOverlay:3,shareability:4,saveWorthiness:4,originality:3,caption:4}},tiktok:null,topFixes:[{fix:'Clean distractions',why:'Background clutter competes.'}],idealVersion:'A finished clean image.',hashtags:{instagram:['#cars'],tiktok:[]},captions:['Polished and ready.'],cleanupInstructions:'Remove background clutter while preserving the car, paint, badges, and reflections.',videoEdit:''};}

const fs=require('fs');
const path=require('path');
const schemaDriftRaw=fs.readFileSync(path.join(__dirname,'fixtures','anthropic-schema-drift-response.json'),'utf8');
const driftContext={selectedPlatform:'instagram',selectedFormat:{name:'Instagram Feed',aspectRatio:'4:5',width:1080,height:1350},source:{mediaType:'image'},preservationRules:['primary subject identity','geometry and proportions','source colors','branding']};
const driftParsed=SignalContract.parseOptimizationResponse(schemaDriftRaw);
assert.ok(!SignalContract.validateOptimizationResult(driftParsed).valid,'schema-drift fixture reproduces current-main validator failure before normalization');
const driftNorm=SignalContract.parseStrictNativeV2(schemaDriftRaw,driftContext);
assert.equal(driftNorm.options[0].id,'opt-1');
assert.equal(driftNorm.options[0].name,'Clean Balanced Enhancement');
assert.equal(driftNorm.options[0].output.width,1080);
assert.equal(driftNorm.subject.boundingBoxes[0].label,'primary subject');
assert.equal(driftNorm.contentType,'image');
assert.equal(driftNorm.platform,'instagram');

function mustThrow(fn,msg){let ok=false;const old=console.error;console.error=()=>{};try{fn();}catch(e){ok=true;}finally{console.error=old;}assert.ok(ok,msg);}
assert.equal(SignalContract.parseValidateNormalizeOptimizationResult(JSON.stringify(native)).schemaVersion,'2.0');
assert.equal(SignalContract.parseValidateNormalizeOptimizationResult('```json\n'+JSON.stringify(native)+'\n```').options.length,2);
const adapted=SignalContract.parseValidateNormalizeOptimizationResult(JSON.stringify(legacy()));assert.equal(adapted.schemaVersion,'2.0');assert.ok(adapted.options.length>=2);assert.equal(adapted.options[0].name,'Clean');
mustThrow(()=>SignalContract.parseValidateNormalizeOptimizationResult('{bad json'),'invalid JSON throws');
const missing=JSON.parse(JSON.stringify(native));delete missing.options[0].score;mustThrow(()=>SignalContract.parseValidateNormalizeOptimizationResult(JSON.stringify(missing)),'missing required option fields throws');
const badScore=JSON.parse(JSON.stringify(native));badScore.options[0].score.overall=101;mustThrow(()=>SignalContract.parseValidateNormalizeOptimizationResult(JSON.stringify(badScore)),'invalid score range throws');
const badDim=JSON.parse(JSON.stringify(native));badDim.format.width=0;mustThrow(()=>SignalContract.parseValidateNormalizeOptimizationResult(JSON.stringify(badDim)),'invalid dimensions throws');const badCrop=JSON.parse(JSON.stringify(native));badCrop.subject.boundingBoxes=[{x:-1,y:0,width:0,height:1,units:'normalized'}];mustThrow(()=>SignalContract.parseValidateNormalizeOptimizationResult(JSON.stringify(badCrop)),'invalid crop throws');

const bboxArray=JSON.parse(JSON.stringify(native));bboxArray.subject.boundingBoxes=[[0.1,0.2,0.3,0.4],{x:120,y:80,w:320,h:240,units:'pixels',label:'car'}];const bboxNorm=SignalContract.parseValidateNormalizeOptimizationResult(JSON.stringify(bboxArray));assert.deepEqual(bboxNorm.subject.boundingBoxes[0],{x:0.1,y:0.2,width:0.3,height:0.4,units:'normalized'});assert.equal(bboxNorm.subject.boundingBoxes[1].width,320);
const badBboxes=[['x',0,1,1],[0.8,0.8,0.5,0.5],{x:0,y:0,w:0,h:1,units:'normalized'},{x:0,y:0,width:1,height:1,units:'percent'}];badBboxes.forEach((box,i)=>{const bad=JSON.parse(JSON.stringify(native));bad.subject.boundingBoxes=[box];assert.ok(!SignalContract.validateOptimizationResult(bad).valid,`invalid bounding box ${i} rejected`);});
const captionString=JSON.parse(JSON.stringify(native));captionString.captions='One caption';assert.ok(!SignalContract.validateOptimizationResult(captionString).valid,'single caption string rejected');
const captionObject=JSON.parse(JSON.stringify(native));captionObject.captions={text:'One caption'};assert.ok(!SignalContract.validateOptimizationResult(captionObject).valid,'single caption object rejected');
const tagsString=JSON.parse(JSON.stringify(native));tagsString.hashtags.recommended='#cars #detailing';assert.ok(!SignalContract.validateOptimizationResult(tagsString).valid,'hashtag string rejected');
const tagsMap=JSON.parse(JSON.stringify(native));tagsMap.hashtags.recommended={instagram:['#cars']};assert.ok(!SignalContract.validateOptimizationResult(tagsMap).valid,'hashtag object rejected');
const prohibited=JSON.parse(JSON.stringify(native));prohibited.options[0].description='Take another photo from a better angle.';mustThrow(()=>SignalContract.parseValidateNormalizeOptimizationResult(JSON.stringify(prohibited)),'prohibited language throws');
const preserved=SignalContract.parseValidateNormalizeOptimizationResult(JSON.stringify(native));assert.deepEqual(preserved.subject.preserve,['paint','badges','reflections']);
const nullPlatform=legacy();nullPlatform.instagram=null;nullPlatform.tiktok=null;assert.equal(SignalContract.parseValidateNormalizeOptimizationResult(JSON.stringify(nullPlatform)).schemaVersion,'2.0');
const empty=JSON.parse(JSON.stringify(native));empty.captions=[];empty.hashtags.recommended=[];const norm=SignalContract.parseValidateNormalizeOptimizationResult(JSON.stringify(empty));assert.equal(norm.captions.length,1);assert.deepEqual(norm.hashtags.recommended,[]);
let logs=[];const old=console.error;console.error=(...a)=>logs.push(a.join(' '));let threw=false;try{SignalContract.parseValidateNormalizeOptimizationResult(JSON.stringify({...native,options:[{...baseOption,description:'sk-ant-12345 take another photo'}]}));}catch(e){threw=true;}console.error=old;assert.ok(threw,'sensitive invalid throws');assert.ok(!logs.join('\n').includes('sk-ant-12345'),'logs redact API keys');
console.log('signal-contract tests passed');
