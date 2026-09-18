import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScore, readScore, secondsAt, beatAt } from '../lib/score.ts';
import { builtinScores } from '../lib/builtin-scores.ts';
import { zipSync, strToU8 } from 'fflate';
import { readFileSync } from 'node:fs';
const wrap = (body: string) =>
  `<score-partwise><part-list><score-part id="P1"><part-name>Piano</part-name></score-part></part-list><part id="P1">${body}</part></score-partwise>`;
const note = (pitch = 'C', extra = '', duration = 4) =>
  `<note><pitch><step>${pitch}</step><octave>4</octave></pitch><duration>${duration}</duration>${extra}</note>`;
test('the two compressed presets load with complete timelines', () => {
  assert.deepEqual(
    builtinScores.map((s) => s.title),
    ['Human Light', 'If Only...'],
  );
  for (const [i, preset] of builtinScores.entries()) {
    const song = readScore(
      readFileSync(new URL(`../public/scores/${preset.file}`, import.meta.url)),
      preset.file,
      preset.id,
    );
    assert.equal(song.notes.length, [801, 2039][i]);
    assert.deepEqual(
      song.tempos,
      i === 0
        ? [
            { beat: 0, bpm: 80 },
            { beat: 136, bpm: 78 },
          ]
        : [{ beat: 0, bpm: 80 }],
    );
    // Human Light: 136 beats at 80 BPM, then 148 at 78; If Only: 376 at 80.
    const expectedDuration = [(136 * 60) / 80 + (148 * 60) / 78 + 0.8, (376 * 60) / 80 + 0.8][i];
    assert.ok(
      Math.abs(song.duration - expectedDuration) < 1e-9,
      `${preset.title} duration: ${song.duration}`,
    );
    assert.deepEqual(
      readScore(new TextEncoder().encode(song.xml), preset.id + '.musicxml').notes,
      song.notes,
    );
  }
});
test('voices, chords, rests, ties and changing tempos share one clock', () => {
  const xml = wrap(
    `<measure><attributes><divisions>4</divisions></attributes><direction><sound tempo="60"/></direction>${note('C', '<tie type="start"/><staff>1</staff>')}${note('C', '<tie type="stop"/><staff>1</staff>')}<backup><duration>8</duration></backup>${note('E', '<staff>2</staff>')}<note><chord/><pitch><step>G</step><octave>3</octave></pitch><duration>4</duration><staff>2</staff></note><direction><sound tempo="120"/></direction><note><rest/><duration>12</duration><staff>2</staff></note></measure>`,
  );
  const score = parseScore(xml);
  assert.equal(score.notes.length, 3);
  assert.equal(score.notes.find((n) => n.hand === 'right')!.duration, 1.5);
  assert.equal(score.duration, 3.3);
  for (const beat of [0, 0.5, 1, 2, 4])
    assert.ok(Math.abs(beatAt(secondsAt(beat, score.tempos), score.tempos) - beat) < 1e-8);
});
test('invalid and unsupported uploads fail clearly', () => {
  for (const xml of [
    'bad',
    wrap('<measure/>'),
    wrap(`<measure>${note('C', '', 0)}</measure>`),
    wrap(`<measure><barline><repeat direction="backward"/></barline>${note()}</measure>`),
    wrap(`<measure>${note('C', '<tie type="stop"/>')}</measure>`),
    wrap(`<measure>${note('C', '<grace/>')}</measure>`),
  ])
    assert.throws(() => parseScore(xml));
});

test('MXL resolves the container root rather than the first XML entry', () => {
  const xml = wrap(`<measure>${note()}</measure>`);
  const archive = zipSync({
    'preview.xml': strToU8('<preview/>'),
    'META-INF/container.xml': strToU8(
      '<container><rootfiles><rootfile full-path="nested/score.xml"/></rootfiles></container>',
    ),
    'nested/score.xml': strToU8(xml),
  });
  assert.deepEqual(readScore(archive, 'Example.MXL').notes, parseScore(xml).notes);
  assert.equal(readScore(archive, 'Example.MXL').title, 'Example');
});
test('invalid, missing and oversized archive contents fail', () => {
  assert.throws(() => readScore(strToU8('not a zip'), 'bad.mxl'));
  assert.throws(
    () => readScore(zipSync({ 'score.xml': strToU8('x') }), 'bad.mxl'),
    /missing META-INF/,
  );
  const container = strToU8(
    '<container><rootfiles><rootfile full-path="score.xml"/></rootfiles></container>',
  );
  assert.throws(
    () => readScore(zipSync({ 'META-INF/container.xml': container }), 'bad.mxl'),
    /missing score.xml/,
  );
  assert.throws(
    () =>
      readScore(
        zipSync({ 'META-INF/container.xml': container, 'score.xml': new Uint8Array(5_000_001) }),
        'large.mxl',
      ),
    /too large/,
  );
  assert.throws(() => readScore(new Uint8Array(5_000_001), 'large.musicxml'), /5 MB/);
  assert.throws(() => readScore(strToU8('x'), 'score.mid'), /Choose/);
});
test('cross-voice ties on the same staff retain one sustained note', () => {
  const score = parseScore(
    wrap(
      `<measure implicit="yes"><attributes><divisions>4</divisions></attributes>${note('D', '<voice>1</voice><tie type="start"/>')}</measure><measure>${note('D', '<voice>2</voice><tie type="stop"/>')}</measure>`,
    ),
  );
  assert.equal(score.notes.length, 1);
  assert.equal(score.notes[0].duration, 1.2);
});
test('grace notes borrow time without shifting the following measure', () => {
  const score = parseScore(
    wrap(
      `<measure><attributes><divisions>4</divisions></attributes><direction><sound tempo="60"/></direction><note><grace slash="yes"/><pitch><step>B</step><octave>4</octave></pitch></note>${note('C')}</measure><measure>${note('D')}</measure>`,
    ),
  );
  assert.deepEqual(
    score.notes.map((n) => [n.start, n.duration]),
    [
      [0, 0.125],
      [0.125, 0.875],
      [4, 1],
    ],
  );
});
test('octave-shift engraving does not transpose the sounding pitch twice', () => {
  const score = parseScore(
    wrap(
      `<measure><direction><direction-type><octave-shift type="down" size="8"/></direction-type></direction>${note('C')}</measure>`,
    ),
  );
  assert.equal(score.notes[0].midi, 60);
});
test('unison voices share a key and reattacks release the earlier press', () => {
  const score = parseScore(
    wrap(
      `<measure><attributes><divisions>4</divisions></attributes>${note('C', '<voice>1</voice>', 8)}<backup><duration>8</duration></backup>${note('C', '<voice>2</voice>')}${note('C', '<voice>2</voice>')}</measure>`,
    ),
  );
  assert.deepEqual(
    score.notes.map((n) => [n.start, n.duration]),
    [
      [0, 0.6],
      [0.6, 0.6],
    ],
  );
});

test('arpeggios roll in both directions, share cross-staff numbering and keep their end times', () => {
  for (const direction of ['up', 'down']) {
    const mark = `<notations><arpeggiate number="1" direction="${direction}"/></notations>`;
    const score = parseScore(
      wrap(
        `<measure><attributes><divisions>4</divisions></attributes>${note('C', mark + '<staff>2</staff>')}${note('E', '<chord/>' + mark + '<staff>1</staff>')}${note('G', '<chord/>' + mark + '<staff>1</staff>')}</measure>`,
      ),
    );
    assert.deepEqual(
      score.notes.map((n) => n.midi),
      direction === 'up' ? [60, 64, 67] : [67, 64, 60],
    );
    assert.deepEqual(
      score.notes.map((n) => n.start),
      [0, 0.035, 0.07],
    );
    assert.ok(score.notes.every((n) => Math.abs(n.start + n.duration - 0.6) < 1e-9));
  }
});
test('independent arpeggio numbers and unmarked chords do not roll together', () => {
  const mark = (number: number) => `<notations><arpeggiate number="${number}"/></notations>`;
  const score = parseScore(
    wrap(
      `<measure>${note('C', mark(1))}${note('E', '<chord/>' + mark(1))}${note('G', '<chord/>' + mark(2))}${note('B', '<chord/>' + mark(2))}${note('D', '<chord/>')}</measure>`,
    ),
  );
  assert.equal(score.notes.find((n) => n.midi === 67)!.start, 0);
  assert.equal(score.notes.find((n) => n.midi === 62)!.start, 0);
  assert.equal(score.notes.find((n) => n.midi === 64)!.start, 0.035);
  assert.equal(score.notes.find((n) => n.midi === 71)!.start, 0.035);
});
test('dynamics respect staff, offsets, numeric sound values and note overrides', () => {
  const score = parseScore(
    wrap(
      `<measure><attributes><divisions>4</divisions></attributes><direction><direction-type><dynamics><pp/></dynamics></direction-type><staff>1</staff></direction>${note('C', '<staff>1</staff>')}<direction><direction-type><dynamics><f/></dynamics></direction-type><staff>1</staff></direction>${note('D', '<staff>1</staff>')}<backup><duration>8</duration></backup>${note('E', '<staff>2</staff>')}<direction><offset>0</offset><staff>2</staff><sound dynamics="100"/></direction>${note('G', '<staff>2</staff>')}<note dynamics="50"><pitch><step>A</step><octave>4</octave></pitch><duration>4</duration><staff>2</staff></note></measure>`,
    ),
  );
  assert.deepEqual(
    [60, 62, 64, 67, 69].map((m) => score.notes.find((n) => n.midi === m)!.velocity),
    [38, 92, 76, 90, 45],
  );
});
test('pedal notation and sound events follow tempo changes and keep hand durations intact', () => {
  const score = parseScore(
    wrap(
      `<measure><attributes><divisions>4</divisions></attributes><direction><sound tempo="60"/></direction><direction><direction-type><pedal type="start"/></direction-type></direction>${note()}<direction><direction-type><pedal type="change"/></direction-type><sound tempo="120"/></direction>${note('E')}<direction><sound damper-pedal="no"/></direction></measure>`,
    ),
  );
  assert.deepEqual(score.pedals, [
    { time: 0, down: true },
    { time: 1, down: false },
    { time: 1, down: true },
    { time: 1.5, down: false },
  ]);
  assert.deepEqual(
    score.notes.map((n) => n.duration),
    [1, 0.5],
  );
  const open = parseScore(wrap(`<measure><sound damper-pedal="yes"/>${note()}</measure>`));
  assert.deepEqual(open.pedals, [
    { time: 0, down: true },
    { time: 2.4, down: false },
  ]);
});
test('offset dynamics apply by musical time even when voices are serialized later', () => {
  const score = parseScore(
    wrap(
      `<measure><attributes><divisions>4</divisions></attributes><direction><direction-type><dynamics><p/></dynamics></direction-type></direction>${note('C')}${note('D')}<direction><direction-type><dynamics><ff/></dynamics></direction-type><offset>-4</offset><staff>1</staff></direction><backup><duration>8</duration></backup>${note('E', '<staff>2</staff>')}${note('G', '<staff>2</staff>')}</measure>`,
    ),
  );
  assert.deepEqual(
    [60, 62, 64, 67].map((m) => score.notes.find((n) => n.midi === m)!.velocity),
    [49, 108, 49, 49],
  );
});

test('paired crescendo and diminuendo wedges interpolate their staff and retain an explicit target', () => {
  const direction = (contents: string, staff = '1') =>
    `<direction><direction-type>${contents}</direction-type><staff>${staff}</staff></direction>`;
  const wedge = (type: string, number = '1') => `<wedge type="${type}" number="${number}"/>`;
  const dynamics = (mark: string) => `<dynamics><${mark}/></dynamics>`;
  const score = parseScore(
    wrap(
      `<measure><attributes><divisions>4</divisions></attributes>${direction(dynamics('p'))}${note('C', '<staff>1</staff>')}${direction(wedge('crescendo'))}${note('D', '<staff>1</staff>')}${note('E', '<staff>1</staff>')}${direction(wedge('stop') + dynamics('f'))}${note('F', '<staff>1</staff>')}<backup><duration>16</duration></backup>${note('G', '<staff>2</staff>')}${note('A', '<staff>2</staff>')}${note('B', '<staff>2</staff>')}${note('C', '<staff>2</staff>')}</measure>`,
    ),
  );
  assert.deepEqual(
    score.notes.filter((note) => note.hand === 'right').map((note) => note.velocity),
    [49, 49, 71, 92],
  );
  assert.deepEqual(
    score.notes.filter((note) => note.hand === 'left').map((note) => note.velocity),
    [76, 76, 76, 76],
  );

  const diminuendo = parseScore(
    wrap(
      `<measure><attributes><divisions>4</divisions></attributes>${direction(dynamics('mf'))}${note('D')}${direction(wedge('diminuendo'))}${note('E')}${note('F')}${direction(wedge('stop'))}${note('G')}</measure>`,
    ),
  );
  assert.deepEqual(
    diminuendo.notes.map((note) => note.velocity),
    [76, 76, 69, 62],
  );
});

test('hairpin wedges must be paired and consecutive hairpins close the previous one', () => {
  const wedge = (type: string) =>
    `<direction><direction-type><wedge type="${type}"/></direction-type></direction>`;

  // A genuinely unclosed hairpin is still invalid.
  assert.throws(
    () => parseScore(
      wrap(`<measure>${wedge('crescendo')}${note()}</measure>`)
    ),
    /stop wedge/,
  );

  // Starting a new hairpin implicitly closes the previous one.
  assert.doesNotThrow(() =>
    parseScore(
      wrap(
        `<measure>${wedge('crescendo')}${note()}${wedge('diminuendo')}${note()}${wedge('stop')}</measure>`,
      ),
    ),
  );
});

test('If Only applies every dynamic to both staves throughout the preset', () => {
  const song = readScore(
    readFileSync(new URL('../public/scores/IfOnly.mxl', import.meta.url)),
    'IfOnly.mxl',
  );
  const directions = [...song.xml.matchAll(/<direction\b[\s\S]*?<\/direction>/g)]
    .map((m) => m[0])
    .filter((d) => d.includes('<dynamics'));
  assert.equal(directions.length, 32);
  for (let i = 0; i < directions.length; i += 2) {
    assert.notEqual(
      directions[i].match(/<staff>(\d)<\/staff>/)?.[1],
      directions[i + 1].match(/<staff>(\d)<\/staff>/)?.[1],
    );
    assert.equal(
      directions[i].replace(/<staff>\d<\/staff>/, ''),
      directions[i + 1].replace(/<staff>\d<\/staff>/, ''),
    );
  }
  const globalDynamics = song.xml.replace(/<direction\b[\s\S]*?<\/direction>/g, (d) =>
    d.includes('<dynamics') ? d.replace(/<staff>\d<\/staff>/, '') : d,
  );
  assert.deepEqual(song.notes, parseScore(globalDynamics).notes);
});
