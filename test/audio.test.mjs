import test from 'node:test';import assert from 'node:assert/strict';
import {DrumEngine} from '../dist/audio.js';import {defaultPattern} from '../dist/core.js';
function fakeContext(){
  const sources=[],gains=[];const param=()=>({value:0,events:[],setValueAtTime(v,t){this.value=v;this.events.push(['set',v,t]);},linearRampToValueAtTime(v,t){this.value=v;this.events.push(['linear',v,t]);},exponentialRampToValueAtTime(v,t){this.value=v;this.events.push(['exp',v,t]);},cancelScheduledValues(t){this.events.push(['cancel',t]);}});
  const source=()=>{const s={frequency:param(),stops:[],connect(){},disconnect(){},start(t){this.started=t;},stop(t){this.stops.push(t);}};sources.push(s);return s;};
  return {currentTime:0,state:'running',sampleRate:48000,destination:{},sources,gains,createGain(){const g={gain:param(),connect(){},disconnect(){}};gains.push(g);return g;},createBuffer(n,len){return {getChannelData:()=>new Float32Array(len)};},createOscillator:source,createBufferSource:source,createBiquadFilter(){return {frequency:param(),connect(){},disconnect(){}};},async close(){this.state='closed';},async resume(){this.state='running';}};
}
test('sound needs explicit enable; stop cancels timer and fades even queued notes',async()=>{
  const c=fakeContext();let scheduled=false,cleared=false;const steps=[];const engine=new DrumEngine(()=>({pattern:defaultPattern(),bpm:100}),s=>steps.push(s),{contextFactory:()=>c,interval:()=>(scheduled=true,99),clearIntervalFn:id=>{assert.equal(id,99);cleared=true;}});
  engine.start();assert.equal(engine.active,false);await engine.enable();engine.start();assert.equal(scheduled,true);assert.equal(engine.active,true);assert.ok(c.sources.length>=2);
  c.currentTime=.03;engine.stop();assert.equal(cleared,true);assert.equal(engine.active,false);assert.equal(steps.at(-1),-1);
  assert.ok(c.gains[0].gain.events.some(e=>e[0]==='linear'&&e[1]===0&&Math.abs(e[2]-.07)<1e-9));
  for(const s of c.sources)assert.ok(Math.abs(s.stops.at(-1)-.075)<1e-9);const count=c.sources.length;engine.tick();assert.equal(c.sources.length,count);
  await engine.dispose();assert.equal(c.state,'closed');
});
test('engine start is idempotent and completed nodes are released',async()=>{
  const c=fakeContext();let count=0;const engine=new DrumEngine(()=>({pattern:defaultPattern(),bpm:100}),()=>{},{contextFactory:()=>c,interval:()=>(++count),clearIntervalFn:()=>{}});await engine.enable();engine.start();engine.start();assert.equal(count,1);for(const s of [...engine.nodes])s.onended();assert.equal(engine.nodes.size,0);engine.stop();
});
test('explicit enable recovers after a closed audio context',async()=>{
  const contexts=[];const engine=new DrumEngine(()=>({pattern:defaultPattern(),bpm:100}),()=>{},{contextFactory:()=>{const c=fakeContext();contexts.push(c);return c;},interval:()=>1,clearIntervalFn:()=>{}});
  await engine.enable();engine.start();await engine.dispose();assert.equal(contexts[0].state,'closed');assert.equal(engine.active,false);
  await engine.enable();engine.start();assert.equal(contexts.length,2);assert.equal(engine.active,true);assert.ok(contexts[1].sources.length>0);await engine.dispose();
});
