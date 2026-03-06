/**
 * Creates a checklist JSON file from a definition object.
 * Usage: node scripts/create-checklist.js
 * Modify the definitions below to create new checklists.
 */
const fs = require('fs');
const path = require('path');

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 80);
}

function createChecklist(def) {
  const checklist = {
    meta: {
      id: def.id,
      mode: def.mode || 'review',
      title: def.title,
      shortTitle: def.shortTitle,
      description: def.description,
      icon: def.icon,
      totalItems: 0,
      version: '1.0.0'
    },
    sections: []
  };

  let totalItems = 0;

  def.sections.forEach(function(sectionDef) {
    const section = {
      id: def.id + '.' + slugify(sectionDef.title),
      title: sectionDef.title
    };

    if (sectionDef.subsections) {
      section.subsections = sectionDef.subsections.map(function(subDef) {
        const sub = {
          id: def.id + '.' + slugify(sectionDef.title) + '.' + slugify(subDef.title),
          title: subDef.title,
          items: subDef.items.map(function(itemDef) {
            totalItems++;
            return {
              id: def.id + '.' + slugify(sectionDef.title) + '.' + slugify(subDef.title) + '.' + slugify(itemDef.text),
              text: itemDef.text,
              severity: itemDef.severity || 'minor',
              tags: itemDef.tags || [],
              baseContent: {
                whatItMeans: '',
                whyItMatters: '',
                howToVerify: '',
                exampleComment: '',
                codeExamples: [],
                keyTakeaway: '',
                references: []
              }
            };
          })
        };
        return sub;
      });
    } else if (sectionDef.items) {
      section.items = sectionDef.items.map(function(itemDef) {
        totalItems++;
        return {
          id: def.id + '.' + slugify(sectionDef.title) + '.' + slugify(itemDef.text),
          text: itemDef.text,
          severity: itemDef.severity || 'minor',
          tags: itemDef.tags || [],
          baseContent: {
            whatItMeans: '',
            whyItMatters: '',
            howToVerify: '',
            exampleComment: '',
            codeExamples: [],
            keyTakeaway: '',
            references: []
          }
        };
      });
    }

    checklist.sections.push(section);
  });

  checklist.meta.totalItems = totalItems;

  const outPath = path.join(__dirname, '..', 'assets', 'data', 'checklists', def.id + '.json');
  fs.writeFileSync(outPath, JSON.stringify(checklist, null, 2) + '\n');
  console.log('Created: ' + outPath + ' (' + totalItems + ' items)');
  return totalItems;
}

// Helper
function items(arr) { return arr.map(function(a) { return typeof a === 'string' ? { text: a } : a; }); }
function sitems(severity, arr) { return arr.map(function(a) { return { text: a, severity: severity }; }); }

module.exports = { createChecklist, items, sitems, slugify };
