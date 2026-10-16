const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const html = fs.readFileSync('index.html', 'utf8');
const client = fs.readFileSync('clinic-enhancements.js', 'utf8');
const apiFiles = ['api/ai.js', 'api/models.js', 'api/tts.js'];
for (const file of ['clinic-enhancements.js', ...apiFiles]) {
  new vm.Script(fs.readFileSync(file, 'utf8'), { filename: file });
  console.log('syntax OK:', file);
}
const inline = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
  .map(match => match[1]).filter(source => source.trim());
assert.ok(inline.length, 'Expected at least one inline script');
inline.forEach((source, index) => new vm.Script(source, { filename: 'index.html:inline-' + index }));
console.log('syntax OK: index.html inline scripts');

const combined = html + '\n' + client;
const required = [
  'cfg-gemini-key', 'cfg-groq-key', 'cfg-openrouter-key',
  'renderRecordsTable', 'runInventoryAuditAI', 'parseReceiptWithSmartAI',
  'resetReceiptForm', 'addNewServiceRow', 'syncDataToCloud', 'syncDataFromCloud',
  'downloadClinicBackup', 'importClinicBackup', 'saveReceiptOnly',
  'testAndDiscoverAllModels', 'sendChatMessage', 'startClinicVoiceConversation',
  'chat-file-input', 'models-health-status'
];
for (const item of required) assert.ok(combined.includes(item), 'Missing required feature/handler: ' + item);
assert.ok(html.includes('clinic-enhancements.js'), 'Client enhancement script is not linked');
assert.ok(client.includes('window.getClinicProviderKeys'), 'Settings keys are not connected to API requests');
assert.ok(client.includes('AES-GCM') && client.includes('PBKDF2'), 'Encrypted cloud backup is missing');
console.log('feature smoke checks OK:', required.length, 'required hooks');
