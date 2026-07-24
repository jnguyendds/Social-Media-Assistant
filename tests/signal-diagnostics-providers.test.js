const assert=require('assert');
const Diagnostics=require('../signal-diagnostics.js');
const Providers=require('../signal-ai-providers-ui.js');
(async()=>{
  const red=Diagnostics.debugReport({apiKey:'sk-ant-secret1234',headers:{authorization:'Bearer abc'},rawResponse:'token=hidden sk-ant-secret1234'});
  assert.ok(!red.includes('sk-ant-secret1234')&&!red.includes('Bearer abc')&&!red.includes('hidden'),'debug report redacts sensitive values');
  assert.equal(Providers.maskKey('sk-ant-abcdef1234'),'••••••••••••1234');
  let r=await Providers.testAnthropicConnection({apiKey:'',fetchImpl:async()=>{throw new Error('should not call')}});assert.equal(r.status,'not-configured');
  r=await Providers.testAnthropicConnection({apiKey:'sk-ant-x',fetchImpl:async()=>({ok:false,status:401,json:async()=>({})})});assert.equal(r.status,'invalid');
  r=await Providers.testAnthropicConnection({apiKey:'sk-ant-x',fetchImpl:async()=>{throw new Error('offline')}});assert.equal(r.status,'network-error');
  r=await Providers.testAnthropicConnection({apiKey:'sk-ant-x',fetchImpl:async()=>({ok:false,status:503,json:async()=>({})})});assert.equal(r.status,'service-unavailable');
  r=await Providers.testAnthropicConnection({apiKey:'sk-ant-x',fetchImpl:async()=>({ok:true,status:200,json:async()=>({})})});assert.equal(r.status,'connected');
  console.log('signal-diagnostics-providers tests passed');
})().catch(e=>{console.error(e);process.exit(1);});
