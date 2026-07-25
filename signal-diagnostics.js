(function(root){
  const Serialization=root.SignalSerialization||(typeof require!=='undefined'?require('./signal-serialization.js'):null);
  const SECRET_PATTERNS=[/sk-ant-[a-z0-9_-]+/ig,/sk-[a-z0-9_-]+/ig,/(x-api-key|api[_-]?key|authorization|token|secret)\s*[:=]\s*[^\s,;"'}]+/ig,/Bearer\s+[A-Za-z0-9._-]+/g];
  function redact(value){
    return Serialization.safeStringify(value,(k,v)=>{
      if(/apiKey|x-api-key|authorization|token|secret|mediaContent|data/i.test(k))return '[redacted]';
      return typeof v==='string'?SECRET_PATTERNS.reduce((s,re)=>s.replace(re,'[redacted]'),v):v;
    },2).slice(0,12000);
  }
  function create(base={}){return{appVersion:base.appVersion||'Signal static app',promptVersion:base.promptVersion||'',model:base.model||'',provider:base.provider||'anthropic',requestDurationMs:null,httpStatus:null,validationStatus:'pending',repairAttemptResult:'not attempted',rawResponse:'',parsedResponse:null,validationFailures:[],stages:[],errorCategory:null,userMessage:''};}
  function stage(d,name,status,extra){if(d)d.stages.push({name,status,at:new Date().toISOString(),...(extra||{})});return d;}
  function debugReport(d){return redact({diagnostics:d});}
  function normalizeError(error,fallbackCategory){
    if(error&&typeof error==='object'&&!Array.isArray(error))return{category:String(error.category||fallbackCategory||'unknown'),detail:typeof error.detail==='string'?error.detail:redact(error.detail===undefined?(error.message||error):error.detail)};
    return{category:String(fallbackCategory||'unknown'),detail:String(error==null?'Unknown error':error)};
  }
  function normalizeErrors(errors,fallbackCategory){return(errors||[]).map(e=>normalizeError(e,fallbackCategory));}
  function summarizeFailures(f){return normalizeErrors(f).map(x=>x.detail).join('; ');}
  const api={redact,create,stage,debugReport,normalizeError,normalizeErrors,summarizeFailures};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.SignalDiagnostics=api;
})(typeof window!=='undefined'?window:globalThis);
