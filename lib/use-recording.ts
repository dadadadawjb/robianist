'use client';
import { useEffect, useRef, useState } from 'react';
import type { usePlayer } from './player';
import type { Song } from './music';
import { recordingMime } from './recording';

export function useRecording(player:ReturnType<typeof usePlayer>,song:Song) {
  const [status,setStatus]=useState<'idle'|'preparing'|'recording'|'saving'>('idle');
  const [error,setError]=useState('');
  const [download,setDownload]=useState<{url:string;name:string}|null>(null);
  const session=useRef<{recorder:MediaRecorder;release:()=>void}|null>(null);
  const mounted=useRef(true),pending=useRef(false),latestPlayer=useRef(player);
  latestPlayer.current=player;
  function stop() {
    const current=session.current;
    if(current&&current.recorder.state!=='inactive'){setStatus('saving');current.recorder.stop();latestPlayer.current.pause();}
  }
  async function start() {
    if(pending.current||session.current)return;
    pending.current=true;setError('');setStatus('preparing');player.pause();
    let display:MediaStream|undefined,audio:Awaited<ReturnType<typeof player.recordingAudio>>|undefined;
    try {
      if(!navigator.mediaDevices?.getDisplayMedia||typeof MediaRecorder==='undefined')throw new Error('Video recording requires a supported desktop browser on HTTPS or localhost.');
      const mimeType=recordingMime(mime=>MediaRecorder.isTypeSupported(mime));
      // Only capture video from the selected tab; sound comes directly from our synthesizer.
      display=await navigator.mediaDevices.getDisplayMedia({video:{frameRate:30,displaySurface:'browser'},audio:false,preferCurrentTab:true,selfBrowserSurface:'include'} as DisplayMediaStreamOptions);
      if(!mounted.current){display.getTracks().forEach(track=>track.stop());return;}
      const video=display.getVideoTracks()[0];
      if(video.getSettings().displaySurface&&video.getSettings().displaySurface!=='browser')throw new Error('Choose the Robianist browser tab to record this performance.');
      audio=await player.recordingAudio();
      if(!mounted.current){audio.disconnect();display.getTracks().forEach(track=>track.stop());return;}
      if(video.readyState==='ended')throw new Error('Screen sharing ended before recording started.');
      const stream=new MediaStream([video,...audio.stream.getAudioTracks()]);
      const recorder=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:8_000_000});
      const chunks:Blob[]=[];
      const release=()=>{display!.getTracks().forEach(track=>track.stop());audio!.disconnect();};
      session.current={recorder,release};
      recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
      recorder.onerror=()=>{setError('Recording failed. Try a shorter recording or another browser.');stop();};
      recorder.onstop=()=>{
        release();session.current=null;
        if(!mounted.current)return;
        setStatus('idle');latestPlayer.current.pause();
        if(chunks.length){
          const url=URL.createObjectURL(new Blob(chunks,{type:recorder.mimeType}));
          const name=`${song.id.replace(/[^a-z0-9_-]/gi,'_')}.${recorder.mimeType.includes('mp4')?'mp4':'webm'}`;
          setDownload({url,name});
          const link=document.createElement('a');link.href=url;link.download=name;link.click();
        }
      };
      video.onended=stop;
      player.seek(0);recorder.start(1000);await player.play();
      if(mounted.current&&session.current?.recorder===recorder&&recorder.state==='recording')setStatus('recording');
      else player.pause();
    } catch(e) {
      if(session.current){session.current.recorder.onstop=null;if(session.current.recorder.state!=='inactive')session.current.recorder.stop();session.current.release();session.current=null;}
      else {display?.getTracks().forEach(track=>track.stop());audio?.disconnect();}
      if(mounted.current){player.pause();setStatus('idle');setError(e instanceof DOMException&&e.name==='NotAllowedError'?'Recording canceled or permission denied.':e instanceof Error?e.message:'Could not start recording.');}
    } finally {pending.current=false;}
  }
  useEffect(()=>{if(status==='recording'&&(!player.playing||player.time>=song.duration))stop();},[status,player.playing,player.time,song.duration]);
  useEffect(()=>()=>{if(download)URL.revokeObjectURL(download.url);},[download]);
  useEffect(()=>{mounted.current=true;return ()=>{mounted.current=false;const current=session.current;if(current){current.recorder.onstop=null;if(current.recorder.state!=='inactive')current.recorder.stop();current.release();session.current=null;}};},[]);
  return {status,error,download,start,stop,busy:status!=='idle'};
}
