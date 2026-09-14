// Produce a browser-only URDF from the downloaded official xacro and limits.
// Keep the original joint transforms; omit ROS, collision and dynamics macros.
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../public/models/franka/', import.meta.url);
const source = readFileSync(new URL('franka_arm.xacro', root), 'utf8');
const limits = readFileSync(new URL('joint_limits.yaml', root), 'utf8');
let xml = '<?xml version="1.0"?><robot name="panda">\n';
for (let i=0;i<=8;i++) xml += `<link name="panda_link${i}">${i<8?`<visual><origin rpy="0 0 ${i===7?Math.PI/4:0}"/><geometry><mesh filename="link${i}.dae"/></geometry></visual>`:''}</link>\n`;
for(let i=1;i<=8;i++) {
  const block = source.match(new RegExp(`<joint name="\\$\\{arm_id\\}_joint${i}"[\\s\\S]*?</joint>`))[0];
  const origin = block.match(/<origin[^>]*\/>/)[0].replaceAll('${-pi/2}',String(-Math.PI/2)).replaceAll('${pi/2}',String(Math.PI/2));
  const range = i<8 ? limits.match(new RegExp(`joint${i}:[\\s\\S]*?lower:\\s*([-.\\d]+)[\\s\\S]*?upper:\\s*([-.\\d]+)`)) : null;
  xml += `<joint name="panda_joint${i}" type="${i<8?'revolute':'fixed'}">${origin}<parent link="panda_link${i-1}"/><child link="panda_link${i}"/><axis xyz="0 0 1"/>${range?`<limit lower="${range[1]}" upper="${range[2]}" effort="87" velocity="2"/>`:''}</joint>\n`;
}
writeFileSync(new URL('robot.urdf',root),xml+'</robot>\n');
console.log('Prepared Franka visual URDF from official joint definitions.');
