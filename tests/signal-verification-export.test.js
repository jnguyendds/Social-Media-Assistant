const assert=require('assert');
global.SignalVerification=require('../signal-verification.js');
const V=global.SignalVerification;
const Project=require('../signal-project.js');
const result={options:[{id:'op1',output:{width:1080,height:1350},generativeOperations:[{operation:'remove',instruction:'remove cone'}]}]};
for(const [id,dim] of Object.entries({'instagram-portrait':[1080,1350],'instagram-square':[1080,1080],'instagram-story':[1080,1920],'tiktok-vertical':[1080,1920],original:[3024,4032]})){
  assert.deepEqual(V.presetDimensions(id,{width:3024,height:4032}),{width:dim[0],height:dim[1]},`preset ${id} dimensions`);
}
let v=V.verifyImportedImage({expected:{width:1080,height:1350},actual:{width:1920,height:1080,type:'image/jpeg'}});
assert.ok(v.blocked&&v.errors.some(e=>/orientation/i.test(e)),'orientation mismatch blocks invalid technical output');
v=V.verifyImportedImage({expected:{width:1080,height:1350},actual:{width:600,height:750,type:'image/jpeg'},limits:{dimensionTolerance:1}});
assert.ok(!v.blocked&&v.warnings.some(w=>/low/i.test(w)),'low-resolution warning does not hard block');
v=V.verifyImportedImage({expected:{width:1080,height:1350},actual:{width:1080,height:1350,type:'image/jpeg'},original:{width:1920,height:1080}});
assert.ok(v.warnings.some(w=>/crop/i.test(w)),'crop warning flags likely unintended crop changes');
let p=Project.createProject({result,originalMedia:{name:'orig.jpg',width:3024,height:4032,dataUrl:'data:orig'}});
assert.equal(p.options.op1.preservationReview.subject,'not reviewed','preservation review checklist defaults are persisted per option');
p=Project.attachImportedImage(p,'op1',{name:'edit.png',type:'image/png',size:10,width:1080,height:1350,dataUrl:'data:edit',versionId:'v1'},v);
assert.equal(p.options.op1.verificationByVersion.v1,v,'verification persistence keyed by imported version');
p=Project.setOperationReview(p,'op1','remove-0','partially applied');
assert.equal(p.options.op1.operationReview['remove-0'],'partially applied','operation review state saved');
assert.equal(Project.exportSource(p,'op1','original').label,'Original','original source selection');
assert.equal(Project.exportSource(p,'op1','preview').label,'Local Preview','local preview source selection');
assert.equal(Project.exportSource(p,'op1','imported').label,'Imported AI Edit','imported source selection');
assert.match(V.fileName({projectId:'Proj 1',optionId:'Option A',source:'imported',presetId:'instagram-portrait',mimeType:'image/jpeg',versionId:'v1'}),/^signal-proj-1-option-a-imported-v1-instagram-portrait\.jpg$/,'predictable JPEG file naming');
assert.equal(V.chooseMime({type:'image/png',hasAlpha:true}).mimeType,'image/png','PNG selected when transparency is needed');
assert.equal(V.chooseMime({type:'image/jpeg'}).mimeType,'image/jpeg','JPEG selected by default');
const before=JSON.stringify(p.originalMedia);Project.attachImportedImage(p,'op1',{name:'new.jpg'},v);assert.equal(JSON.stringify(p.originalMedia),before,'original media remains untouched when importing edits');
console.log('signal verification export tests passed');
