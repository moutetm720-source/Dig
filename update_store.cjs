const fs = require('fs');
const file = 'src/services/store.ts';
let content = fs.readFileSync(file, 'utf8');

const newSaveToStorage = `function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e: any) {
    console.error(\`Failed to save \${key} to storage\`, e);
    if (e.name === 'QuotaExceededError' || e.message.includes('quota')) {
      console.warn('LocalStorage quota exceeded! Attempting to free up space by clearing logs...');
      try {
        localStorage.removeItem(STORAGE_PREFIX + 'systemLogs');
        localStorage.removeItem(STORAGE_PREFIX + 'systemJobs');
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
        console.log('Successfully saved after freeing space.');
      } catch (retryError) {
        console.error('Still failed to save after freeing space.', retryError);
      }
    }
  }
}`;

content = content.replace(
  /function saveToStorage<T>\(key: string, value: T\): void \{[\s\S]*?\}\n/,
  newSaveToStorage + '\n'
);

fs.writeFileSync(file, content);
console.log('store.ts saveToStorage updated successfully');
