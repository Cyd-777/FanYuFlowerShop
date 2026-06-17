const fs = require('fs')
const path = require('path')

const configPath = path.join(__dirname, '../dist/project.config.json')

if (!fs.existsSync(configPath)) {
  process.exit(0)
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
config.cloudfunctionRoot = '../cloudfunctions/'
fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`)

console.log('[patch] dist/project.config.json cloudfunctionRoot -> ../cloudfunctions/')
