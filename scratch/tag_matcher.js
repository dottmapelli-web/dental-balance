import fs from 'fs';

const content = fs.readFileSync('src/app/page.tsx', 'utf8');

const stack = [];
const lines = content.split('\n');

const tagList = [
    'div', 'motion.div', 'Card', 'CardHeader', 'CardTitle', 'CardDescription', 'CardContent',
    'Alert', 'AlertTitle', 'AlertDescription', 'Button', 'Badge', 'Link', 'Select',
    'SelectTrigger', 'SelectValue', 'SelectContent', 'SelectItem', 'Tabs', 'TabsList',
    'TabsTrigger', 'TabsContent', 'TooltipProvider', 'Tooltip', 'TooltipTrigger',
    'TooltipContent', 'Progress', 'AnimatePresence', 'AlertDialog', 'AlertDialogTrigger',
    'AlertDialogContent', 'AlertDialogHeader', 'AlertDialogTitle', 'AlertDialogDescription',
    'AlertDialogFooter', 'AlertDialogAction', 'AlertDialogCancel', 'Label'
];

const tagPattern = tagList.join('|').replace(/\./g, '\\.');
const tagRegex = new RegExp(`</(${tagPattern})>|<(${tagPattern})(?:\\s[^>]*)?\\/>|<(${tagPattern})(?:\\s[^>]*)?>`, 'g');

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  let match;
  while ((match = tagRegex.exec(line)) !== null) {
    const fullTag = match[0];
    const closingTag = match[1];
    const selfClosingTag = match[2];
    const openingTag = match[3];
    
    if (closingTag) {
      if (stack.length === 0) {
        console.log(`Error: Unexpected closing tag </${closingTag}> at line ${i + 1}`);
      } else {
        const last = stack.pop();
        if (last.name !== closingTag) {
          console.log(`Error: Mismatched tag. Expected </${last.name}> but got </${closingTag}> at line ${i + 1}. Opening tag was at line ${last.line}`);
        }
      }
    } else if (selfClosingTag) {
      // Ignore self-closing
    } else if (openingTag) {
      stack.push({ name: openingTag, line: i + 1 });
    }
  }
}

console.log('Final stack:', stack);
