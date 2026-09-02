const fs = require('fs');
const content = fs.readFileSync('dist/assets/index-CouK4zxb.js', 'utf-8');
const match = content.match(/class [a-zA-Z0-9_$]*\{opportunities;(.*?)\}\}/);
if (!match) {
  const match2 = content.match(/class [a-zA-Z0-9_$]*\{constructor\(\)\{this\.opportunities=(.*?)\}\}/);
  if (match2) {
    fs.writeFileSync('extracted_store.js', match2[0]);
    console.log("Extracted format 2!");
  } else {
    console.log("Not found!");
  }
} else {
  fs.writeFileSync('extracted_store.js', match[0]);
  console.log("Extracted!");
}
