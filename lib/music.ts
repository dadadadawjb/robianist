export type Note = { midi: number; start: number; duration: number; hand: 'left' | 'right' };
export type Song = { id: string; title: string; subtitle: string; bpm: number; notes: Note[]; duration: number };
function song(id: string, title: string, subtitle: string, melody: number[][]): Song {
  const beat = 60 / 100; let cursor = 0;
  const notes: Note[] = melody.map(([midi, beats]) => { const note: Note = { midi, start: cursor, duration: beats * beat * .86, hand: 'right' }; cursor += beats * beat; return note; });
  for (let i = 0; i < cursor - .01; i += beat * 4) notes.push({ midi: [48, 53, 55, 48][Math.round(i / (beat * 4)) % 4], start: i, duration: beat * 1.7, hand: 'left' });
  return { id, title, subtitle, bpm: 100, notes: notes.sort((a,b) => a.start - b.start), duration: Number((cursor + .8).toFixed(3)) };
}
export const songs: Song[] = [
  song('tigers', 'Frère Jacques', 'Traditional nursery rhyme', [[60,1],[62,1],[64,1],[60,1],[60,1],[62,1],[64,1],[60,1],[64,1],[65,1],[67,2],[64,1],[65,1],[67,2],[67,.5],[69,.5],[67,.5],[65,.5],[64,1],[60,1],[67,.5],[69,.5],[67,.5],[65,.5],[64,1],[60,1],[60,1],[55,1],[60,2],[60,1],[55,1],[60,2]]),
  song('star', 'Twinkle, Twinkle, Little Star', 'Twinkle, Twinkle, Little Star', [[60,1],[60,1],[67,1],[67,1],[69,1],[69,1],[67,2],[65,1],[65,1],[64,1],[64,1],[62,1],[62,1],[60,2],[67,1],[67,1],[65,1],[65,1],[64,1],[64,1],[62,2],[67,1],[67,1],[65,1],[65,1],[64,1],[64,1],[62,2],[60,1],[60,1],[67,1],[67,1],[69,1],[69,1],[67,2],[65,1],[65,1],[64,1],[64,1],[62,1],[62,1],[60,2]])
];
export const frequency = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
export const noteName = (midi: number) => ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'][midi % 12] + (Math.floor(midi / 12) - 1);
export const isBlack = (midi: number) => [1,3,6,8,10].includes(midi % 12);
const whites = Array.from({length: 88}, (_,i) => i + 21).filter(m => !isBlack(m));
export const keyX = (midi: number) => { const index = whites.filter(m => m < midi).length; return (index - (isBlack(midi) ? .5 : 0) - 25.5) * .1; };


const chords: Note[] = [0,5,7,0].flatMap((root,i)=>[48,52,55,60,64,67].map((midi,j)=>({midi:midi+root,start:i*2.4,duration:1.9,hand:j<3?'left' as const:'right' as const})));
songs.push({id:'chords',title:'Chord Study',subtitle:'Original six-note study',bpm:100,notes:chords,duration:10.4});
