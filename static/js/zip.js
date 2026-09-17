// 最小 ZIP(STORE 不压缩)生成器 —— .mcpack 本质是 zip，无需引入 JSZip。
// ponytail: 不压缩导致包体偏大（皮肤 PNG 本身已是压缩格式，实际影响很小）。
// 如需 DEFLATE 再换 JSZip，升级路径：替换本文件即可，接口不变。
(function (global) {
  'use strict';

  var CRC_TABLE = (function () {
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })();

  function crc32(bytes) {
    var c = 0xffffffff;
    for (var i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }

  function dosTimeDate(d) {
    var time = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
    var date = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
    return [time, date];
  }

  // files: [{ name: string, data: Uint8Array }]  返回: Uint8Array(zip)
  function createZip(files) {
    var enc = new TextEncoder();
    var now = dosTimeDate(new Date());
    var chunks = [];
    var central = [];
    var offset = 0;

    function push(bytes) {
      chunks.push(bytes);
      offset += bytes.length;
    }

    files.forEach(function (f) {
      var name = enc.encode(f.name);
      var crc = crc32(f.data);
      var head = new Uint8Array(30);
      var dv = new DataView(head.buffer);
      dv.setUint32(0, 0x04034b50, true);
      dv.setUint16(4, 20, true);           // version needed
      dv.setUint16(6, 0x0800, true);       // UTF-8 文件名
      dv.setUint16(8, 0, true);            // STORE
      dv.setUint16(10, now[0], true);
      dv.setUint16(12, now[1], true);
      dv.setUint32(14, crc, true);
      dv.setUint32(18, f.data.length, true);
      dv.setUint32(22, f.data.length, true);
      dv.setUint16(26, name.length, true);
      dv.setUint16(28, 0, true);
      push(head);
      push(name);
      push(f.data);

      var cd = new Uint8Array(46);
      var cv = new DataView(cd.buffer);
      cv.setUint32(0, 0x02014b50, true);
      cv.setUint16(4, 20, true);
      cv.setUint16(6, 20, true);
      cv.setUint16(8, 0x0800, true);
      cv.setUint16(10, 0, true);
      cv.setUint16(12, now[0], true);
      cv.setUint16(14, now[1], true);
      cv.setUint32(16, crc, true);
      cv.setUint32(20, f.data.length, true);
      cv.setUint32(24, f.data.length, true);
      cv.setUint16(28, name.length, true);
      cv.setUint32(42, offset - f.data.length - name.length - 30, true);
      central.push(cd);
      central.push(name);
    });

    var cdSize = central.reduce(function (s, c) { return s + c.length; }, 0);
    var eocd = new Uint8Array(22);
    var ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(8, files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, cdSize, true);
    ev.setUint32(16, offset, true);
    return concat(chunks.concat(central, [eocd]));
  }

  function concat(chunks) {
    var total = chunks.reduce(function (s, c) { return s + c.length; }, 0);
    var out = new Uint8Array(total);
    var pos = 0;
    chunks.forEach(function (c) { out.set(c, pos); pos += c.length; });
    return out;
  }

  // 解析 zip（支持 STORE 与 DEFLATE），返回 Promise<[{
  //   name: string, data: Uint8Array }]>
  // ponytail: 不校验 CRC32（浏览器场景读自己导出的包足够），遇损坏文件由调用方兜底。
  async function parseZip(bytes) {
    var dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    var eocd = -1;
    for (var i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('不是有效的 zip 文件');
    var count = dv.getUint16(eocd + 10, true);
    var pos = dv.getUint32(eocd + 16, true);
    var dec = new TextDecoder();
    var out = [];
    for (var n = 0; n < count; n++) {
      if (dv.getUint32(pos, true) !== 0x02014b50) throw new Error('zip 目录损坏');
      var method = dv.getUint16(pos + 10, true);
      var compSize = dv.getUint32(pos + 20, true);
      var nameLen = dv.getUint16(pos + 28, true);
      var extraLen = dv.getUint16(pos + 30, true);
      var commentLen = dv.getUint16(pos + 32, true);
      var localOff = dv.getUint32(pos + 42, true);
      var name = dec.decode(bytes.subarray(pos + 46, pos + 46 + nameLen));
      pos += 46 + nameLen + extraLen + commentLen;
      var lNameLen = dv.getUint16(localOff + 26, true);
      var lExtraLen = dv.getUint16(localOff + 28, true);
      var start = localOff + 30 + lNameLen + lExtraLen;
      var data = bytes.subarray(start, start + compSize);
      if (method === 8) data = await inflateRaw(data);
      else if (method !== 0) throw new Error('不支持的压缩方法: ' + method);
      out.push({ name: name, data: data });
    }
    return out;
  }

  function inflateRaw(data) {
    var ds = new DecompressionStream('deflate-raw');
    return new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer()
      .then(function (buf) { return new Uint8Array(buf); });
  }

  global.createZip = createZip;
  global.parseZip = parseZip;
  if (typeof module !== 'undefined') module.exports = { createZip: createZip, parseZip: parseZip, crc32: crc32 };
})(typeof window !== 'undefined' ? window : globalThis);
