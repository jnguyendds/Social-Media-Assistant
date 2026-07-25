(function(root){
  function circularReplacer(){
    const ancestors=[];const seen=new WeakSet();
    return function(key,value){
      if(value&&typeof value==='object'){
        while(ancestors.length&&ancestors[ancestors.length-1]!==this){seen.delete(ancestors.pop());}
        if(seen.has(value))return '[Circular]';
        seen.add(value);
        ancestors.push(value);
      }
      return value;
    };
  }
  function safeStringify(value,replacer,space){
    const circular=circularReplacer();
    return JSON.stringify(value,function(key,item){
      const safe=circular.call(this,key,item);
      return replacer&&safe!=='[Circular]'?replacer(key,safe):safe;
    },space);
  }
  function clone(value){return JSON.parse(safeStringify(value));}
  const api={circularReplacer,safeStringify,clone};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.SignalSerialization=api;
})(typeof window!=='undefined'?window:globalThis);
