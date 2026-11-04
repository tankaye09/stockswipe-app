// Prints what was on screen when each Maestro command failed, as text,
// so CI logs show the cause without needing to open screenshots.
const fs = require('fs');
const path = require('path');

const root = path.join(process.env.HOME, '.maestro', 'tests');
const files = [];
const walk = (dir) => {
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (/^commands-.*\.json$/.test(f)) files.push(p);
  }
};
walk(root);

const collect = (node, out) => {
  if (!node || typeof node !== 'object') return;
  const a = node.attributes || {};
  const label = [a['resource-id'], a.text, a.accessibilityText].filter(Boolean).join(' | ');
  if (label) out.push(`${label}${a.bounds ? `  ${a.bounds}` : ''}`);
  for (const c of node.children || []) collect(c, out);
};

for (const file of files) {
  const commands = JSON.parse(fs.readFileSync(file, 'utf8'));
  const failed = commands.filter((c) => c.metadata && c.metadata.status === 'FAILED');
  if (!failed.length) continue;
  console.log(`\n=== ${path.basename(file)}`);
  for (const c of failed) {
    console.log('Failed command:', JSON.stringify(c.command).slice(0, 300));
    console.log('Error:', JSON.stringify(c.metadata.error || {}).slice(0, 300));
    const out = [];
    collect(c.metadata.hierarchy || (c.metadata.error && c.metadata.error.hierarchy), out);
    console.log(out.length ? `On screen:\n  ${out.join('\n  ')}` : 'No hierarchy recorded.');
  }
}
