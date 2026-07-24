(function(root){
  function maskKey(k){k=String(k||'');return k?k.length<=4?'••••':'••••••••••••'+k.slice(-4):'';}
  async function testAnthropicConnection({apiKey,model,fetchImpl}){
    if(!apiKey)return{status:'not-configured',message:'Not Configured'};
    const fetcher=fetchImpl||root.fetch;const started=Date.now();
    try{const r=await fetcher('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'content-type':'application/json','x-api-key':apiKey,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:model||'claude-sonnet-5',max_tokens:8,messages:[{role:'user',content:'Reply OK.'}]})});
      if(r.status===401||r.status===403)return{status:'invalid',message:'Invalid API key',httpStatus:r.status,durationMs:Date.now()-started};
      if(r.status===429)return{status:'service-unavailable',message:'Anthropic reported rate or quota limiting.',httpStatus:r.status,durationMs:Date.now()-started};
      if(r.status>=500)return{status:'service-unavailable',message:'Anthropic service unavailable.',httpStatus:r.status,durationMs:Date.now()-started};
      if(!r.ok)return{status:'invalid',message:`Anthropic rejected the request (${r.status}).`,httpStatus:r.status,durationMs:Date.now()-started};
      return{status:'connected',message:'Connected',httpStatus:r.status,durationMs:Date.now()-started};
    }catch(e){return{status:'network-error',message:'Network error reaching Anthropic.',error:e.message,durationMs:Date.now()-started};}
  }
  const api={maskKey,testAnthropicConnection};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.SignalAIProvidersUI=api;
})(typeof window!=='undefined'?window:globalThis);
