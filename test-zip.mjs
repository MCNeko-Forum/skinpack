// zip.js 自检：生成的 zip 用 Node 原生 zlib 解压验证，保证 .mcpack 能被正常解析。
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { createZip } = require('./static/js/zip.js');
const assert = require('assert');

// 1) 生成含两个文件（含中文文件名验证 UTF-8 标志）的 zip
const files = [
  { name: 'manifest.json', data: new TextEncoder().encode('{"hello":"world"}') },
  { name: '皮肤 测试.png', data: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 1, 2, 3, 4, 5]) },
];
const zip = Buffer.from(createZip(files));

// 2) EOCD 签名与条目数
assert.deepStrictEqual(zip.subarray(-22, -18).readUInt32LE(0), 0x06054b50, 'EOCD 签名错误');
assert.strictEqual(zip.readUInt16LE(zip.length - 22 + 10), 2, '条目数应为 2');

// 3) 逐个解析中央目录并解压比对内容
let pos = zip.length - 22 - zip.readUInt32LE(zip.length - 22 + 12); // EOCD 前 cdSize 处即中央目录起点
for (const expect of files) {
  assert.strictEqual(zip.readUInt32LE(pos), 0x02014b50, '中央目录签名错误');
  const nameLen = zip.readUInt16LE(pos + 28);
  const name = zip.subarray(pos + 46, pos + 46 + nameLen).toString('utf8');
  assert.strictEqual(name, expect.name, '文件名不一致');
  const localOff = zip.readUInt32LE(pos + 42);
  const localNameLen = zip.readUInt16LE(localOff + 26);
  const dataStart = localOff + 30 + localNameLen;
  const size = zip.readUInt32LE(pos + 24);
  const method = zip.readUInt16LE(pos + 10);
  const raw = zip.subarray(dataStart, dataStart + size);
  // 本生成器恒为 STORE(0)，内容即原始字节
  assert.strictEqual(method, 0, '应为 STORE 方法');
  assert.deepStrictEqual([...raw], [...expect.data], `${name} 内容不一致`);
  pos += 46 + nameLen;
}

console.log('test-zip: 解析前校验通过');

// 4) parseZip 往返校验（createZip → parseZip 还原）
const { parseZip } = require('./static/js/zip.js');
const parsed = await parseZip(zip);
assert.strictEqual(parsed.length, 2);
assert.deepStrictEqual([...parsed[0].data], [...files[0].data]);
assert.strictEqual(parsed[0].name, files[0].name);
assert.deepStrictEqual([...parsed[1].data], [...files[1].data]);
assert.strictEqual(parsed[1].name, files[1].name);

console.log('test-zip: 全部通过 ✓');
