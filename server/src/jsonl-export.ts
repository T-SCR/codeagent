import fs from 'fs';
import path from 'path';
import pdfParse from 'pdf-parse';
import * as XLSX from 'xlsx';

const FILES_DIR = path.join(__dirname, '../../files');

async function pdfToJsonl(pdfPath: string, outPath: string) {
  const buffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(buffer);
  const lines = data.text.split('\n').filter(Boolean);
  const jsonl = lines.map(line => JSON.stringify({ prompt: line, completion: line })).join('\n');
  fs.writeFileSync(outPath, jsonl);
}

function xlsxToJsonl(xlsxPath: string, outPath: string) {
  const workbook = XLSX.readFile(xlsxPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const jsonl = rows.map(row => {
    const safeRow = Array.isArray(row) ? row : [];
    return JSON.stringify({ prompt: safeRow.join(' '), completion: safeRow.join(' ') });
  }).join('\n');
  fs.writeFileSync(outPath, jsonl);
}

async function main() {
  if (!fs.existsSync(FILES_DIR)) return;
  const files = fs.readdirSync(FILES_DIR);
  for (const filename of files) {
    const ext = path.extname(filename).toLowerCase();
    const filePath = path.join(FILES_DIR, filename);
    const outPath = filePath.replace(ext, '.jsonl');
    if (ext === '.pdf') {
      console.log(`Converting ${filename} to JSONL...`);
      await pdfToJsonl(filePath, outPath);
    } else if (ext === '.xlsx') {
      console.log(`Converting ${filename} to JSONL...`);
      xlsxToJsonl(filePath, outPath);
    }
  }
  console.log('Done!');
}

main(); 