/**
 * Merges generated base content into checklist JSON files.
 * Usage: node scripts/merge-content.js <content-file.js> <checklist.json>
 */
const fs = require('fs');
const path = require('path');

const contentFile = process.argv[2];
const checklistFile = process.argv[3];

if (!contentFile || !checklistFile) {
  console.error('Usage: node merge-content.js <content-file.js> <checklist.json>');
  process.exit(1);
}

const content = require(path.resolve(contentFile));
const checklist = JSON.parse(fs.readFileSync(checklistFile, 'utf-8'));

let updated = 0;
let skipped = 0;

const contentKeys = Object.keys(content);

function normalize(s) { return s.replace(/_/g, ''); }

function findContentMatch(itemId) {
  // Exact match first
  if (content[itemId]) return content[itemId];
  var normId = normalize(itemId);
  // Prefix match: content key starts with item id or vice versa
  for (var i = 0; i < contentKeys.length; i++) {
    var normKey = normalize(contentKeys[i]);
    if (normId.startsWith(normKey) || normKey.startsWith(normId)) {
      return content[contentKeys[i]];
    }
  }
  return null;
}

function processItems(items) {
  items.forEach(function(item) {
    var match = findContentMatch(item.id);
    if (match) {
      item.baseContent = match;
      updated++;
    } else {
      skipped++;
    }
  });
}

checklist.sections.forEach(function(section) {
  if (section.items) processItems(section.items);
  if (section.subsections) {
    section.subsections.forEach(function(sub) {
      if (sub.items) processItems(sub.items);
    });
  }
});

fs.writeFileSync(checklistFile, JSON.stringify(checklist, null, 2) + '\n');
console.log('Updated: ' + updated + ' items, Skipped: ' + skipped + ' items (no content provided)');
