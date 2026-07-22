(function(root){
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function selectedOption(result,selectedId){
    const options=Array.isArray(result&&result.options)?result.options:[];
    return options.find(o=>o.id===selectedId)||options[0]||null;
  }
  function outputLabel(option){const o=option&&option.output||{};return `${o.width||'—'}×${o.height||'—'} · ${esc(o.aspectRatio||'—')}`;}
  function optionStatus(option,state){return state.statusForOption?state.statusForOption(option.id):(option.status==='requiresChatGPT'?'AI Package Ready':'Preview Ready');}
  function scoreLabel(option){const n=option&&option.score&&option.score.overall;return Number.isFinite(n)?`${n}/100`:'—';}
  function formatAdjustment(adj){return [adj.operation,adj.target?`(${adj.target})`:''].filter(Boolean).join(' ');}
  function formatGenerativeOperation(op){return `${op.operation}: ${op.instruction}`;}
  function videoInstructions(option){
    if(!option||!option.videoPlan)return'';
    const out=option.output||{};
    const parts=[`Set the project to ${out.aspectRatio||'the selected'} format (${out.width||'target'}×${out.height||'target'}).`];
    if(Array.isArray(option.videoPlan.trim)&&option.videoPlan.trim.length){
      const t=option.videoPlan.trim[0];parts.push(`Trim from ${t.start}s to ${t.end}s.`);
    }
    if(option.videoPlan.captionsRequired)parts.push('Add platform-safe captions in the upper third.');
    if(option.videoPlan.audio&&option.videoPlan.audio.musicSuggested)parts.push('Add a fitting trending sound while keeping voice or important original audio clear.');
    return parts.join(' ');
  }
  function previewBlock(option,state){
    const p=state.previews&&state.previews[option.id];
    if(!p)return '<span class="option-preview pending">Preview preparing…</span>';
    if(p.error)return `<span class="option-preview failed">Preview unavailable</span>`;
    return `<span class="option-preview"><img src="${esc(p.rendered)}" alt="${esc(option.name)} preview"></span>`;
  }
  function renderOptionCard(option,isSelected,result,state){
    const hasAI=Array.isArray(option.generativeOperations)&&option.generativeOperations.length>0;
    return `<button class="option-card ${isSelected?'selected':''}" data-option-id="${esc(option.id)}">
      ${previewBlock(option,state)}
      <span class="option-card-top"><b>${esc(option.name)}</b><span>${scoreLabel(option)}</span></span>
      <span class="option-desc">${esc(option.description)}</span>
      <span class="option-meta"><span>${esc(result.platform)}</span><span>${outputLabel(option)}</span><span>Risk: ${esc(option.risk)}</span></span>
      <span class="option-meta"><span>${(option.localAdjustments||[]).length} local edits</span><span>${hasAI?'AI enhancement required':'Instant preview ready'}</span></span>
      <span class="option-meta"><span>Status: ${esc(optionStatus(option,state))}</span></span>
    </button>`;
  }
  function renderList(items,formatter,empty){return items&&items.length?`<ul class="option-list">${items.map(item=>`<li>${esc(formatter(item))}</li>`).join('')}</ul>`:`<p class="note">${esc(empty)}</p>`;}
  function render(result,state={}){
    const options=Array.isArray(result&&result.options)?result.options:[];
    if(!options.length)return `<div class="card"><div class="sect-t">Optimization options</div><p class="ideal">Signal couldn't confidently generate optimization options from this result.</p><button class="again" id="rescore">Retry optimization ↻</button></div>`;
    const option=selectedOption(result,state.selectedOptionId);
    const captions=(result.captions||[]).map(c=>c.text).filter(Boolean);
    const tags=(result.hashtags&&result.hashtags.recommended)||[];
    const genOps=option.generativeOperations||[];
    const handoff=(option.handoff&&option.handoff.prompt)||'';
    return `<div class="card options-hero"><span class="chip ok">Optimized options ready</span><h2>Choose a finished version</h2><p class="note">Signal designed ${options.length} finished ${esc(result.contentType)} options for ${esc(result.platform)}. Scores compare these options directionally.</p></div>
    <div class="option-grid">${options.map(o=>renderOptionCard(o,o.id===option.id,result,state)).join('')}</div>
    <div class="card option-detail"><div class="row" style="align-items:flex-start;gap:12px"><div><div class="sect-t">Selected option</div><h2>${esc(option.name)}</h2></div><span class="score-pill">${scoreLabel(option)}</span></div>
      <p class="ideal">${esc(option.description)}</p><div class="seg"><button data-export-source="original">Original</button><button data-export-source="preview">Local Preview</button><button data-export-source="imported">Imported AI Edit</button></div><button class="cta" id="shareEnh">Export ${esc(state.exportLabel||'selected option')} ↗</button><label class="btn2" for="cleanfile" style="display:block;text-align:center">Import Edited Image ↩</label>${state.importWarning?`<div class="err">${esc(state.importWarning)}</div>`:''}${state.selectedPreview&&state.selectedPreview.rendered?`<div class="selected-preview"><img src="${esc(state.showOriginal&&state.originalSource?state.originalSource:state.selectedPreview.rendered)}" alt="Selected preview"><button class="btn2" id="toggleOriginal">${state.showOriginal?'Show optimized':'Show original'}</button></div>`:''}
      ${state.comparisonHtml||''}<div class="option-split"><div><div class="sect-t">Instant Preview <span>(Local Canvas edits)</span></div>${renderList(option.localAdjustments||[],formatAdjustment,'No local edits listed.')}</div><div><div class="sect-t">AI Enhancement <span>(ChatGPT handoff)</span></div>${genOps.length?renderList(genOps,formatGenerativeOperation,''): '<p class="note">No AI handoff required for this option.</p>'}${handoff?`<div class="instr">${esc(handoff)}</div><button class="btn2" data-copy="${esc(handoff)}">Copy ChatGPT prompt</button><button class="btn2" id="sendClean">Send image to ChatGPT ↗</button>`:''}</div></div>
      <div class="sect-t">Preservation rules</div>${renderList(option.preservationRules||[],x=>x,'No preservation rules listed.')}
      ${option.videoPlan?`<div class="sect-t">CapCut instructions</div><div class="instr">${esc(videoInstructions(option))}</div><button class="btn2" data-copy="${esc(videoInstructions(option))}">Copy CapCut instructions</button><button class="btn2" id="sendCapcut">Send to CapCut ↗</button>`:''}
      ${captions.length?`<div class="sect-t">Captions</div>${captions.map(c=>`<button class="capt" data-copy="${esc(c)}">${esc(c)}<small>Tap to copy</small></button>`).join('')}`:''}
      ${tags.length?`<div class="tagwrap"><div class="row"><span class="lab">Hashtags</span><button class="copyall" data-copy="${esc(tags.join(' '))}">Copy all</button></div><div class="tags">${tags.map(t=>`<span class="tag">${esc(t)}</span>`).join('')}</div></div>`:''}
      <details><summary>Details</summary><p class="note">Risk: ${esc(option.risk)} · Output: ${outputLabel(option)} · Status: ${esc(option.status)}</p><pre class="details-json">${esc(JSON.stringify({format:result.format,subject:result.subject,score:option.score},null,2))}</pre></details>
    </div>`;
  }
  function progressLabel(status){
    if(status==='reading')return'Analyzing composition…';
    if(status==='analyzing')return'Building optimization options…';
    if(status==='preparing')return'Preparing previews…';
    if(status==='finalizing')return'Finalizing results…';
    return'Optimize';
  }
  const api={render,selectedOption,videoInstructions,progressLabel};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  root.SignalOptionsUI=api;
})(typeof window!=='undefined'?window:globalThis);
