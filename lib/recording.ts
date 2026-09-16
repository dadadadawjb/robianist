export function recordingMime(supported:(mime:string)=>boolean) {
  const mime=['video/mp4;codecs=avc1.42001E,mp4a.40.2','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(supported);
  if(!mime)throw new Error('This browser has no supported video recording format. Try Chrome or Edge.');
  return mime;
}
