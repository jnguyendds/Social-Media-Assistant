(function(root){
  const SECRET_PATTERNS=[/sk-ant-[a-z0-9_-]+/ig,/sk-[a-z0-9_-]+/ig,/(x-api-key|api[_-]?key|authorization|token|secret)\s*[:=]\s*[^\s,;"'}]+/ig,/Bearer\s+[A-Za-z0-9._-]+/g];
  function redact(value){
    return JSON.stringify(value,(k,v)=>{
      if(/apiKey|x-api-key|authorization|token|secret|mediaContent|data/i.test(k))return '[redacted]';
      return typeof v==='string'?SECRET_PATTERNS.reduce((s,re)=>s.replace(re,'[redacted]'),v):v;
    },2).slice(0,12000);
  }
  function create(base={}){return{appVersion:base.appVersion||'Signal static app',promptVersion:base.promptVersion||'',model:base.model||'',provider:base.provider||'anthropic',requestDurationMs:null,httpStatus:null,validationStatus:'pending',repairAttemptResult:'not attempted',rawResponse:'',parsedResponse:null,validationFailures:[],stages:[],errorCategory:null,userMessage:''};}
  function stage(d,name,status,extra){if(d)d.stages.push({name,status,at:new Date().toISOString(),...(extra||{})});return d;}
  function debugReport(d){return redact({diagnostics:d});}
  function summarizeFailures(f){return (f||[]).map(x=>String(x)).join('; ');}
  const api={redact,create,stage,debugReport,summarizeFailures};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;root.SignalDiagnostics=api;
})(typeof window!=='undefined'?window:globalThis);
