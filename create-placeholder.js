// Script tạo placeholder PNG đơn giản (1x1 pixel PNG base64)
const fs = require('fs');
const path = require('path');

// 1x1 pixel PNG (gray) base64 decoded
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

const pngBuffer = Buffer.from(pngBase64, 'base64');
const publicDir = path.join(__dirname, 'apps', 'web', 'public');
const outputPath = path.join(publicDir, 'placeholder-product.png');

fs.writeFileSync(outputPath, pngBuffer);
console.log('✅ Created: placeholder-product.png');

