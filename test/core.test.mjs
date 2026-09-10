import test from 'node:test';
import assert from 'node:assert/strict';
import {createTaskBridge,defaultPattern,validateRhythm,validateDemo,requireEmpty} from '../dist/core.js';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
test('rhythm validation copies all rows and rejects malformed or unexpected data',()=>{
  const p=defaultPattern();const copy=validateRhythm({pattern:p,bpm:100});copy.pattern[0][0]=0;assert.equal(p[0][0],1);
  for(const input of [{pattern:p,bpm:0},{pattern:p,bpm:100.5},{pattern:[...p,[]],bpm:100},{pattern:p.map(r=>r.slice(1)),bpm:100},{pattern:p.map(r=>r.map(()=>2)),bpm:100},{pattern:p,bpm:100,foo:true},null])assert.throws(()=>validateRhythm(input));
});
test('demo accepts only bounded simulated inputs; read actions reject extras',()=>{
  assert.deepEqual(validateDemo({scenario:'review',seconds:20}),{scenario:'review',seconds:20});
  for(const x of [{scenario:'review',seconds:1e9},{scenario:'real-api',seconds:20},{scenario:'review',seconds:20,url:'https://x'},null])assert.throws(()=>validateDemo(x));
  requireEmpty({});assert.throws(()=>requireEmpty({action:'start'}));assert.throws(()=>requireEmpty([]));
});
test('real asynchronous result moves from waiting to ready and clears deadline',async()=>{
  let timeout;let cleared=false;const seen=[];const job=deferred();const bridge=createTaskBridge(s=>seen.push(s),{setTimer:fn=>(timeout=fn,7),clearTimer:id=>{assert.equal(id,7);cleared=true;}});
  const result=bridge.start(()=>job.promise);assert.equal(bridge.getState().phase,'waiting');job.resolve('actual result');await result;
  assert.deepEqual(seen.map(x=>x.phase),['waiting','ready']);assert.equal(bridge.getState().value,'actual result');assert.equal(cleared,true);
});
test('rejection and synchronous exceptions surface a terminal failure',async()=>{
  const bridge=createTaskBridge(()=>{});await bridge.start(()=>{throw new Error('offline');});assert.deepEqual(bridge.getState(),{phase:'failed',error:'offline'});
  await bridge.start(()=>Promise.reject(new Error('denied')));assert.equal(bridge.getState().error,'denied');
});
test('a second start is blocked and a cancelled job cannot replace a later result',async()=>{
  const bridge=createTaskBridge(()=>{});const first=deferred();let signal;const a=bridge.start(s=>{signal=s;return first.promise;});await Promise.resolve();
  assert.throws(()=>bridge.start(()=>Promise.resolve('bad')),/already running/);assert.equal(bridge.cancel(),true);assert.equal(signal.aborted,true);
  assert.deepEqual(await a,{cancelled:true});const second=deferred();const b=bridge.start(()=>second.promise);second.resolve('new');await b;first.resolve('old');await Promise.resolve();await Promise.resolve();assert.equal(bridge.getState().value,'new');assert.equal(bridge.cancel(),false);
});
test('cancelling before a task microtask starts does not invoke the task',async()=>{
  let called=false;const bridge=createTaskBridge(()=>{});const p=bridge.start(()=>{called=true;return 'unexpected';});bridge.cancel();await p;assert.equal(called,false);assert.equal(bridge.getState().phase,'cancelled');
});
test('timeout aborts the work and ignores its late settlement',async()=>{
  let expire;let signal;const job=deferred();const bridge=createTaskBridge(()=>{},{setTimer:fn=>(expire=fn,1),clearTimer:()=>{}});
  const result=bridge.start(s=>{signal=s;return job.promise;},{timeoutMs:10});await Promise.resolve();expire();assert.equal(signal.aborted,true);assert.equal(bridge.getState().phase,'failed');assert.match((await result).error,/timed out/);job.resolve('too late');await Promise.resolve();await Promise.resolve();assert.match(bridge.getState().error,/timed out/);
});
