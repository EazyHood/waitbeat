/** Small synthesized drum engine. Stops scheduled sound as well as the timer. */
export class DrumEngine {
  constructor(getRhythm,onStep,{contextFactory,interval=setInterval,clearIntervalFn=clearInterval}={}){
    this.getRhythm=getRhythm;this.onStep=onStep;this.contextFactory=contextFactory??(()=>{const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)throw new Error('Audio is unavailable in this browser.');return new C();});this.interval=interval;this.clearIntervalFn=clearIntervalFn;this.context=null;this.timer=null;this.nodes=new Set();this.active=false;
  }
  async enable(){
    if(!this.context||this.context.state==='closed'){this.context=this.contextFactory();this.bus=this.context.createGain();this.bus.gain.value=0;this.bus.connect(this.context.destination);const frames=this.context.sampleRate*.2;this.noise=this.context.createBuffer(1,frames,this.context.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;}
    if(this.context.state==='suspended')await this.context.resume();
    if(this.context.state!=='running')throw new Error('Sound could not start. Try the Sound button again.');
  }
  start(){if(!this.context||this.context.state!=='running'||this.active)return;this.active=true;this.step=0;this.next=this.context.currentTime+.03;this.bus.gain.cancelScheduledValues(this.context.currentTime);this.bus.gain.setValueAtTime(0,this.context.currentTime);this.bus.gain.linearRampToValueAtTime(.38,this.context.currentTime+.025);this.tick();this.timer=this.interval(()=>this.tick(),25);}
  tick(){if(!this.active)return;const now=this.context.currentTime;const rhythm=this.getRhythm();while(this.next<now+.08){for(let row=0;row<4;row++)if(rhythm.pattern[row][this.step])this.hit(row,this.next);this.onStep(this.step);this.step=(this.step+1)%16;this.next+=60/rhythm.bpm/4;}}
  hit(row,time){const c=this.context;const g=c.createGain();g.connect(this.bus);let source;
    if(row===0||row===3){source=c.createOscillator();source.type=row===0?'sine':'triangle';source.frequency.setValueAtTime(row===0?135:1100,time);source.frequency.exponentialRampToValueAtTime(row===0?42:550,time+.09);source.connect(g);}else{source=c.createBufferSource();source.buffer=this.noise;const f=c.createBiquadFilter();f.type='highpass';f.frequency.value=row===1?1300:6500;source.connect(f);f.connect(g);g.filter=f;}
    const duration=[.19,.13,.045,.055][row];g.gain.setValueAtTime([.8,.28,.15,.16][row],time);g.gain.exponentialRampToValueAtTime(.001,time+duration);this.nodes.add(source);source.onended=()=>{this.nodes.delete(source);source.disconnect();g.disconnect();g.filter?.disconnect();};source.start(time);source.stop(time+duration+.01);
  }
  stop(){this.active=false;if(this.timer!==null)this.clearIntervalFn(this.timer);this.timer=null;if(!this.context)return;const now=this.context.currentTime;this.bus.gain.cancelScheduledValues(now);this.bus.gain.setValueAtTime(this.bus.gain.value,now);this.bus.gain.linearRampToValueAtTime(0,now+.04);for(const source of this.nodes){try{source.stop(now+.045);}catch{}}this.onStep(-1);}
  async dispose(){this.stop();if(this.context&&this.context.state!=='closed')await this.context.close();}
}
