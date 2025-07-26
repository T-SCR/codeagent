"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const XLSX = __importStar(require("xlsx"));
const FILES_DIR = path_1.default.join(__dirname, '../../files');
async function pdfToJsonl(pdfPath, outPath) {
    const buffer = fs_1.default.readFileSync(pdfPath);
    const data = await (0, pdf_parse_1.default)(buffer);
    const lines = data.text.split('\n').filter(Boolean);
    const jsonl = lines.map(line => JSON.stringify({ prompt: line, completion: line })).join('\n');
    fs_1.default.writeFileSync(outPath, jsonl);
}
function xlsxToJsonl(xlsxPath, outPath) {
    const workbook = XLSX.readFile(xlsxPath);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    const jsonl = rows.map(row => {
        const safeRow = Array.isArray(row) ? row : [];
        return JSON.stringify({ prompt: safeRow.join(' '), completion: safeRow.join(' ') });
    }).join('\n');
    fs_1.default.writeFileSync(outPath, jsonl);
}
async function main() {
    if (!fs_1.default.existsSync(FILES_DIR))
        return;
    const files = fs_1.default.readdirSync(FILES_DIR);
    for (const filename of files) {
        const ext = path_1.default.extname(filename).toLowerCase();
        const filePath = path_1.default.join(FILES_DIR, filename);
        const outPath = filePath.replace(ext, '.jsonl');
        if (ext === '.pdf') {
            console.log(`Converting ${filename} to JSONL...`);
            await pdfToJsonl(filePath, outPath);
        }
        else if (ext === '.xlsx') {
            console.log(`Converting ${filename} to JSONL...`);
            xlsxToJsonl(filePath, outPath);
        }
    }
    console.log('Done!');
}
main();
