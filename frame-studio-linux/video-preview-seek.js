(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.FrameVideoSeek=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  function finite(value,fallback=NaN){const n=Number(value);return Number.isFinite(n)?n:fallback}
  function frameTolerance(fps,precise=false){const rate=Math.max(1,Math.min(120,finite(fps,30)));return precise?Math.max(.001,.1/rate):Math.max(.01,.35/rate)}
  function planSeek(state={}){
    const target=finite(state.target),currentTime=finite(state.currentTime,0),now=finite(state.now,0),lastRequestAt=finite(state.lastRequestAt),lastRequestTime=finite(state.lastRequestTime),fps=finite(state.fps,30),precise=!!state.precise,scrubbing=!!state.scrubbing,seeking=!!state.seeking,readyState=finite(state.readyState,0);
    if(!Number.isFinite(target)||target<0)return{shouldSeek:false,reason:'invalid-target'};
    const tol=frameTolerance(fps,precise),gap=Math.abs(currentTime-target),requestGap=Number.isFinite(lastRequestTime)?Math.abs(lastRequestTime-target):Infinity;
    if(seeking&&Number.isFinite(lastRequestTime)&&requestGap<=tol)return{shouldSeek:false,reason:'already-seeking-target',target,tolerance:tol};
    if(!seeking&&readyState>=2&&gap<=tol)return{shouldSeek:false,reason:'already-at-target',target,tolerance:tol};
    const minInterval=scrubbing&&!precise?28:0;
    const minTargetDelta=Math.max(.012,.45/Math.max(1,finite(fps,30)));
    if(minInterval&&Number.isFinite(lastRequestAt)&&now-lastRequestAt<minInterval&&Number.isFinite(lastRequestTime)&&requestGap<minTargetDelta){
      return{shouldSeek:false,reason:'coalesced-small-move',target,tolerance:tol};
    }
    return{shouldSeek:true,reason:precise?'precise-target':'latest-playhead-target',target,tolerance:tol,method:'currentTime'};
  }
  function requestSeek(element,target,options={}){
    if(!element||typeof element!=='object')return{issued:false,reason:'missing-element'};
    const now=finite(options.now,typeof performance!=='undefined'?performance.now():Date.now()),wanted=finite(target);
    const plan=planSeek({target:wanted,currentTime:finite(element.currentTime,0),seeking:!!element.seeking,readyState:finite(element.readyState,0),scrubbing:!!options.scrubbing,precise:!!options.precise,fps:options.fps,now,lastRequestAt:finite(element.__frameLastSeekRequestAt),lastRequestTime:finite(element.__frameLastSeekRequestTime)});
    element.__framePendingSeek=wanted;
    if(!plan.shouldSeek){if(plan.reason==='already-at-target')delete element.__framePendingSeek;return{...plan,issued:false}}
    try{
      // Use currentTime for timeline scrubbing. fastSeek() may land on a distant keyframe,
      // making the preview look frozen while the playhead continues to move.
      element.currentTime=wanted;
      element.__frameLastSeekRequestAt=now;
      element.__frameLastSeekRequestTime=wanted;
      element.__frameSeekSequence=(finite(element.__frameSeekSequence,0)||0)+1;
      return{...plan,issued:true,sequence:element.__frameSeekSequence};
    }catch(error){return{...plan,issued:false,error}}
  }
  return{frameTolerance,planSeek,requestSeek};
});
