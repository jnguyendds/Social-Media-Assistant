(function(root){
  const KEY='signal_projects_v2';const ACTIVE='signal_active_project_v2';const VERSION=2;
  function now(){return new Date().toISOString();}
  function safeParse(text,fallback){try{return JSON.parse(text);}catch(e){return fallback;}}
  function adapter(storage){return storage||root.localStorage;}
  function empty(){return{version:VERSION,projects:{},updatedAt:now()};}
  function migrate(raw){if(!raw)return empty();if(raw.version===VERSION&&raw.projects)return raw;const out=empty();if(raw.projectId||raw.id){const id=raw.projectId||raw.id;out.projects[id]={...raw,projectId:id,storageVersion:VERSION,recovered:true};}else if(raw.projects){Object.keys(raw.projects).forEach(id=>{out.projects[id]={...raw.projects[id],projectId:id,storageVersion:VERSION};});}return out;}
  function loadAll(storage){const s=adapter(storage);return migrate(safeParse(s.getItem(KEY),null));}
  function saveAll(data,storage){const s=adapter(storage);s.setItem(KEY,JSON.stringify({...data,version:VERSION,updatedAt:now()}));}
  function saveProject(project,storage){const data=loadAll(storage);data.projects[project.projectId]=project;saveAll(data,storage);adapter(storage).setItem(ACTIVE,project.projectId);return project;}
  function loadProject(id,storage){return loadAll(storage).projects[id]||null;}
  function listProjects(storage){return Object.values(loadAll(storage).projects).sort((a,b)=>String(b.updatedAt||b.createdAt).localeCompare(String(a.updatedAt||a.createdAt)));}
  function setActiveProject(id,storage){adapter(storage).setItem(ACTIVE,id||'');}
  function getActiveProject(storage){const id=adapter(storage).getItem(ACTIVE);return id?loadProject(id,storage):null;}
  function recover(storage){try{return loadAll(storage);}catch(e){saveAll(empty(),storage);return empty();}}
  const api={KEY,ACTIVE,VERSION,loadAll,saveAll,saveProject,loadProject,listProjects,setActiveProject,getActiveProject,recover,_migrate:migrate};if(typeof module!=='undefined'&&module.exports)module.exports=api;root.SignalStorage=api;
})(typeof window!=='undefined'?window:globalThis);
