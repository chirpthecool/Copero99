// Builds the userscript players install: joins the parts in src/ in name order into dist/copero99.user.js.
// The parts all live inside one wrapper function (opened in 00-header.js, closed in 99-end.js), so they are
// simply glued together, unchanged. Usage: node build.js
const fs = require('fs');
const path = require('path');

const src = path.join(__dirname, 'src');
const out = path.join(__dirname, 'dist', 'copero99.user.js');
const parts = fs.readdirSync(src).filter(f => f.endsWith('.js')).sort();

const problems = [];
parts.slice(0, -1).forEach(f => {
    if (!fs.readFileSync(path.join(src, f), 'utf8').endsWith('\n')) problems.push(f + ' does not end with a line break');
});
const code = parts.map(f => fs.readFileSync(path.join(src, f), 'utf8')).join('');
const header = (code.match(/@version\s+(\S+)/) || [])[1];
const inCode = (code.match(/const VERSION = '([^']+)'/) || [])[1];
if (header !== inCode) problems.push(`@version (${header}) and VERSION (${inCode}) differ`);
if (problems.length) {
    console.error('Build failed:\n- ' + problems.join('\n- '));
    process.exit(1);
}

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, code);
console.log(`Built ${path.relative(__dirname, out)} (version ${header}) from ${parts.length} parts.`);
