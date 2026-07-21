(function(global){
  const SCHEMA_VERSION='1.0.0';
  const SCORE_KEYS=['hook','pacing','completion','trendFit','audio','textOverlay','shareability','saveWorthiness','originality','caption'];

  function parseOptimizationResponse(rawText){
    const raw=String(rawText||'').trim();
    const clean=raw.replace(/```json/gi,'').replace(/```/g,'').trim();
    try{return JSON.parse(clean);}catch(e){
      const start=clean.indexOf('{'),end=clean.lastIndexOf('}');
      if(start>-1&&end>start)return JSON.parse(clean.slice(start,end+1));
      throw new Error('Result came back incomplete. Try again.');
    }
  }

  function isPlainObject(value){return value!==null&&typeof value==='object'&&!Array.isArray(value);}

  function validateScore(value,path,errors,nullable){
    if(value==null&&nullable)return;
    if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>5)errors.push(`${path} must be a number from 0 to 5${nullable?' or null':''}.`);
  }

  function validatePlatformResult(value,path,errors){
    if(value==null)return;
    if(!isPlainObject(value)){errors.push(`${path} must be an object or null.`);return;}
    validateScore(value.overall,`${path}.overall`,errors,false);
    if(!isPlainObject(value.scores)){errors.push(`${path}.scores must be an object.`);return;}
    SCORE_KEYS.forEach(key=>validateScore(value.scores[key],`${path}.scores.${key}`,errors,true));
  }

  function validateStringArray(value,path,errors){
    if(!Array.isArray(value)){errors.push(`${path} must be an array.`);return;}
    value.forEach((item,index)=>{if(typeof item!=='string')errors.push(`${path}[${index}] must be a string.`);});
  }

  function validateOptimizationResult(value){
    const errors=[];
    if(!isPlainObject(value))return{valid:false,errors:['Optimization result must be an object.']};
    if(typeof value.category!=='string')errors.push('category must be a string.');
    if(!['photo','video'].includes(value.contentType))errors.push('contentType must be photo or video.');
    if(!isPlainObject(value.cropFocus)){errors.push('cropFocus must be an object.');}
    else{
      if(typeof value.cropFocus.x!=='number'||value.cropFocus.x<0||value.cropFocus.x>1)errors.push('cropFocus.x must be a number from 0 to 1.');
      if(typeof value.cropFocus.y!=='number'||value.cropFocus.y<0||value.cropFocus.y>1)errors.push('cropFocus.y must be a number from 0 to 1.');
    }
    validatePlatformResult(value.instagram,'instagram',errors);
    validatePlatformResult(value.tiktok,'tiktok',errors);
    if(!Array.isArray(value.topFixes))errors.push('topFixes must be an array.');
    else value.topFixes.forEach((fix,index)=>{
      if(!isPlainObject(fix))errors.push(`topFixes[${index}] must be an object.`);
      else{
        if(typeof fix.fix!=='string')errors.push(`topFixes[${index}].fix must be a string.`);
        if(typeof fix.why!=='string')errors.push(`topFixes[${index}].why must be a string.`);
      }
    });
    if(typeof value.idealVersion!=='string')errors.push('idealVersion must be a string.');
    if(!isPlainObject(value.hashtags))errors.push('hashtags must be an object.');
    else{
      validateStringArray(value.hashtags.instagram,'hashtags.instagram',errors);
      validateStringArray(value.hashtags.tiktok,'hashtags.tiktok',errors);
    }
    validateStringArray(value.captions,'captions',errors);
    if(typeof value.cleanupInstructions!=='string')errors.push('cleanupInstructions must be a string.');
    if(typeof value.videoEdit!=='string')errors.push('videoEdit must be a string.');
    return{valid:errors.length===0,errors};
  }

  function normalizeScore(value){return value==null?null:Number(value);}

  function normalizePlatformResult(value){
    if(value==null)return null;
    const scores={};
    SCORE_KEYS.forEach(key=>{scores[key]=normalizeScore(value.scores[key]);});
    return{overall:normalizeScore(value.overall),scores};
  }

  function normalizeOptimizationResult(value){
    return{
      schemaVersion:SCHEMA_VERSION,
      category:value.category.trim(),
      contentType:value.contentType,
      cropFocus:{x:Number(value.cropFocus.x),y:Number(value.cropFocus.y)},
      instagram:normalizePlatformResult(value.instagram),
      tiktok:normalizePlatformResult(value.tiktok),
      topFixes:value.topFixes.map(fix=>({fix:fix.fix.trim(),why:fix.why.trim()})),
      idealVersion:value.idealVersion.trim(),
      hashtags:{
        instagram:value.hashtags.instagram.map(tag=>tag.trim()).filter(Boolean),
        tiktok:value.hashtags.tiktok.map(tag=>tag.trim()).filter(Boolean)
      },
      captions:value.captions.map(caption=>caption.trim()).filter(Boolean),
      cleanupInstructions:value.cleanupInstructions.trim(),
      videoEdit:value.videoEdit.trim()
    };
  }

  function parseValidateNormalizeOptimizationResult(rawText){
    const parsed=parseOptimizationResponse(rawText);
    const validation=validateOptimizationResult(parsed);
    if(!validation.valid){
      console.error('Signal optimization result validation failed',validation.errors,parsed);
      throw new Error('Analyzer returned an unexpected result. Please try again.');
    }
    return normalizeOptimizationResult(parsed);
  }

  global.SignalContract={
    schemaVersion:SCHEMA_VERSION,
    parseOptimizationResponse,
    validateOptimizationResult,
    normalizeOptimizationResult,
    parseValidateNormalizeOptimizationResult
  };
})(window);
