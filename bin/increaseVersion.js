const fs = require('fs')
const path = require('path')

const manifestPath = path.join(__dirname, '../public/manifest.json')
const manifest = require(manifestPath)
const versionSplits = manifest.version.split('.')
versionSplits[2] = parseInt(versionSplits[2], 10) + 1
const version = versionSplits.join('.')
Object.assign(manifest, { version })
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
console.log('New version is', version)