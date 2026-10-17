const fs = require('fs');
const zlib = require('zlib');
const path = require('path');

// CRC32 implementation
function crc32(buf) {
  let table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xFF];
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function createZip(filenameInZip, contentBuffer) {
  const nameBuf = Buffer.from(filenameInZip, 'utf8');
  const compressed = zlib.deflateRawSync(contentBuffer);
  const fileCrc = crc32(contentBuffer);
  const uncompressedSize = contentBuffer.length;
  const compressedSize = compressed.length;

  const now = new Date();
  const time = ((now.getHours() << 11) | (now.getMinutes() << 5) | (Math.floor(now.getSeconds() / 2))) & 0xFFFF;
  const date = (((now.getFullYear() - 1980) << 9) | ((now.getMonth() + 1) << 5) | now.getDate()) & 0xFFFF;

  // Local File Header
  const localHeader = Buffer.alloc(30);
  localHeader.writeUInt32LE(0x04034b50, 0); // Signature
  localHeader.writeUInt16LE(20, 4);          // Version needed
  localHeader.writeUInt16LE(0, 6);           // Flags
  localHeader.writeUInt16LE(8, 8);           // Method (Deflate)
  localHeader.writeUInt16LE(time, 10);
  localHeader.writeUInt16LE(date, 12);
  localHeader.writeUInt32LE(fileCrc, 14);
  localHeader.writeUInt32LE(compressedSize, 18);
  localHeader.writeUInt32LE(uncompressedSize, 22);
  localHeader.writeUInt16LE(nameBuf.length, 26);
  localHeader.writeUInt16LE(0, 28);          // Extra field length

  const localOffset = 0;

  // Central Directory Header
  const centralHeader = Buffer.alloc(46);
  centralHeader.writeUInt32LE(0x02014b50, 0); // Signature
  centralHeader.writeUInt16LE(20, 4);          // Version made by
  centralHeader.writeUInt16LE(20, 6);          // Version needed
  centralHeader.writeUInt16LE(0, 8);           // Flags
  centralHeader.writeUInt16LE(8, 10);          // Method
  centralHeader.writeUInt16LE(time, 12);
  centralHeader.writeUInt16LE(date, 14);
  centralHeader.writeUInt32LE(fileCrc, 16);
  centralHeader.writeUInt32LE(compressedSize, 20);
  centralHeader.writeUInt32LE(uncompressedSize, 24);
  centralHeader.writeUInt16LE(nameBuf.length, 28);
  centralHeader.writeUInt16LE(0, 30);          // Extra field length
  centralHeader.writeUInt16LE(0, 32);          // Comment length
  centralHeader.writeUInt16LE(0, 34);          // Disk start
  centralHeader.writeUInt16LE(0, 36);          // Internal attributes
  centralHeader.writeUInt32LE(0, 38);          // External attributes
  centralHeader.writeUInt32LE(localOffset, 42); // Offset of local header

  const centralDirOffset = localHeader.length + nameBuf.length + compressed.length;
  const centralDirSize = centralHeader.length + nameBuf.length;

  // End of Central Directory
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // start disk
  eocd.writeUInt16LE(1, 8); // entries on disk
  eocd.writeUInt16LE(1, 10); // total entries
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([
    localHeader,
    nameBuf,
    compressed,
    centralHeader,
    nameBuf,
    eocd
  ]);
}

const launcherPath = path.join(__dirname, 'Play Counter-Strike 1.6.html');
const content = fs.readFileSync(launcherPath);
const zipBuffer = createZip('Play Counter-Strike 1.6.html', content);

fs.writeFileSync(path.join(__dirname, 'CS16_Launcher.zip'), zipBuffer);
console.log('CS16_Launcher.zip created successfully in project folder! Size:', zipBuffer.length, 'bytes');

// Also try to copy to Desktop if accessible
try {
  const desktopZip = '/Users/macbookair/Desktop/CS16_Launcher.zip';
  fs.writeFileSync(desktopZip, zipBuffer);
  console.log('CS16_Launcher.zip also copied to Desktop!');
} catch (e) {
  console.log('Desktop note:', e.message);
}

try {
  const desktopHtml = '/Users/macbookair/Desktop/Play Counter-Strike 1.6.html';
  fs.writeFileSync(desktopHtml, content);
  console.log('Play Counter-Strike 1.6.html also copied to Desktop!');
} catch (e) {
  console.log('Desktop note:', e.message);
}
