export const TRACKS = [
  {name:'Kick',color:'#d5fc63',steps:[0,6,8,14]},
  {name:'Snare',color:'#ab94ff',steps:[4,12]},
  {name:'Hat',color:'#74ddd1',steps:[0,2,4,6,8,10,12,14]},
  {name:'Click',color:'#ffac85',steps:[3,11,15]},
];
export const SCENARIOS = ['review','trip','name'];
export const DELAYS = [20,45,90];
export function defaultPattern(){return TRACKS.map(t=>Array.from({length:16},(_,i)=>t.steps.includes(i)?1:0));}
export function validateRhythm(input){
  if(!input || typeof input!=='object' || Array.isArray(input) || Object.keys(input).some(k=>!['pattern','bpm'].includes(k))) throw new Error('Provide only pattern and bpm.');
  if(!Number.isInteger(input.bpm)||input.bpm<70||input.bpm>140) throw new Error('Tempo must be an integer from 70 to 140.');
  if(!Array.isArray(input.pattern)||input.pattern.length!==4||input.pattern.some(r=>!Array.isArray(r)||r.length!==16||r.some(x=>x!==0&&x!==1))) throw new Error('Pattern must have four rows of sixteen 0 or 1 values.');
  return {bpm:input.bpm,pattern:input.pattern.map(r=>[...r])};
}
export function validateDemo(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['scenario','seconds'].includes(k))||!SCENARIOS.includes(input.scenario)||!DELAYS.includes(input.seconds)) throw new Error('Choose review, trip or name, and a delay of 20, 45 or 90 seconds.');
  return {...input};
}
export function requireEmpty(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length) throw new Error('This action takes an empty object.');}
/** Attach the waiting UI to any asynchronous job. No dependency on an AI provider. */
export function createTaskBridge(onState,{setTimer=setTimeout,clearTimer=clearTimeout}={}){
  let active=null,state={phase:'idle'};
  const emit = s=>{state=s;onState({...s});};
  const cleanup=job=>{if(job.timer!==null)clearTimer(job.timer);job.timer=null;};
  function cancel(){if(!active)return false;const job=active;active=null;cleanup(job);job.controller.abort();emit({phase:'cancelled'});job.settle({cancelled:true});return true;}
  function start(factory,{timeoutMs=120000}={}){
    if(typeof factory!=='function'||!Number.isFinite(timeoutMs)||timeoutMs<=0) throw new Error('A task function and positive timeout are required.');
    if(active)throw new Error('A task is already running.');
    const job={controller:new AbortController(),timer:null,settle:null};const completion=new Promise(resolve=>{job.settle=resolve;});active=job;
    emit({phase:'waiting'});
    job.timer=setTimer(()=>{if(active!==job)return;active=null;cleanup(job);job.controller.abort();const error='The task timed out. You can start another wait.';emit({phase:'failed',error});job.settle({error});},timeoutMs);
    void Promise.resolve().then(()=>{if(active!==job)return;return factory(job.controller.signal);}).then(value=>{
      if(active!==job)return;active=null;cleanup(job);emit({phase:'ready',value});job.settle({value});
    },error=>{if(active!==job)return;active=null;cleanup(job);const message=error instanceof Error?error.message:'The task could not finish.';emit({phase:'failed',error:message});job.settle({error:message});});
    return completion;
  }
  return {start,cancel,getState:()=>({...state})};
}
