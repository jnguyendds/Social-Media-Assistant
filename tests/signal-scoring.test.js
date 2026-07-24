const assert=require('assert');
global.SignalBrandProfiles=require('../signal-brand-profiles.js');
global.SignalScoring=require('../signal-scoring.js');
const Scoring=require('../signal-scoring.js');
const Project=require('../signal-project.js');
const Storage=require('../signal-storage.js');
const Carousel=require('../signal-carousel.js');
function memoryStorage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}}
const full={score:{compositionScore:80,subjectPreservationScore:95,cleanupQualityScore:85,distractionRemovalScore:75,aestheticScore:82,platformSuitabilityScore:88,brandConsistencyScore:90,technicalConfidenceScore:84,overallScore:86},optimizationReport:{removedItems:['clutter'],preservedItems:['face'],confidence:91,warnings:['directional only']}};
let n=Scoring.normalizeOption(full,{brandProfile:{id:'b'}});
assert.equal(n.score.overallScore,86,'valid score validates');
assert.equal(n.score.brandConsistencyScore,90,'brand score included with profile');
n=Scoring.normalizeOption({score:{compositionScore:120,subjectPreservationScore:-2,cleanupQualityScore:50,distractionRemovalScore:50,aestheticScore:50,platformSuitabilityScore:50,technicalConfidenceScore:50}},{})
assert.equal(n.score.compositionScore,100,'out-of-range high score clamps');
assert.equal(n.score.subjectPreservationScore,0,'out-of-range low score clamps');
assert.ok(n.scoring.diagnostics.length,'clamping records validation failure');
const computed=Scoring.normalizeOption({score:{compositionScore:80,subjectPreservationScore:90,cleanupQualityScore:70,distractionRemovalScore:60,aestheticScore:80,platformSuitabilityScore:90,technicalConfidenceScore:80}},{})
assert.equal(computed.scoring.source,'computed-fallback','missing overall uses fallback');
assert.equal(computed.score.overallScore,79,'overallScore computes weighted composite');
const legacy=Scoring.normalizeOption({id:'old'},{});
assert.equal(legacy.scoring.status,'not_scored','legacy option normalizes to not scored');
const report=Scoring.normalizeReport({removedItems:null,preservedItems:[' logo '],confidence:'bad'});
assert.deepEqual(report.removedItems,[],'missing removed items default to empty array');
assert.deepEqual(report.preservedItems,['logo'],'preserved items normalize');
assert.equal(report.confidence,null,'missing/invalid confidence defaults null');
let withoutBrand=Scoring.normalizeOption(full,{});assert.equal(withoutBrand.score.brandConsistencyScore,undefined,'brandConsistencyScore omitted without profile');
const project=Project.createProject({result:{options:[{id:'a',...full}]},brandProfile:{id:'b'}});const storage=memoryStorage();Storage.saveProject(project,storage);const reloaded=Storage.loadProject(project.projectId,storage);assert.equal(reloaded.optimizationResult.options[0].signalScore.overallScore,86,'scores persist round trip');assert.equal(reloaded.optimizationResult.options[0].optimizationReport.removedItems[0],'clutter','reports persist round trip');
const carousel=Carousel.createCarousel({slides:[{result:{options:[{id:'one',score:{...full.score,overallScore:70}}]}},{result:{options:[{id:'two',score:{...full.score,overallScore:90}}]}}]});const order=Carousel.suggestedSlideOrder(carousel);assert.equal(order[0].overallScore,90,'carousel suggested order derives from slide scores');assert.equal(Carousel.slideScoreSummary(carousel).length,2,'carousel per-slide aggregation works');
const redacted=Scoring.redactDiagnostics({prompt:'token=abc123 secret: shh apiKey=xyz'});assert.ok(redacted.includes('[redacted]')&&!redacted.includes('abc123')&&!redacted.includes('xyz'),'diagnostics redaction removes secrets');
console.log('signal-scoring tests passed');
