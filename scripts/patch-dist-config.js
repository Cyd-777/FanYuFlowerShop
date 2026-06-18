const fs = require('fs')
const path = require('path')

const PACK_IGNORE = [
  { type: 'suffix', value: '.map' },
  { type: 'suffix', value: '.LICENSE.txt' },
]

function patchProjectConfig(configPath) {
  if (!fs.existsSync(configPath)) return

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
  config.cloudfunctionRoot = configPath.includes(`${path.sep}dist${path.sep}`)
    ? '../cloudfunctions/'
    : 'cloudfunctions/'
  if (configPath.includes(`${path.sep}dist${path.sep}`)) {
    if (!config.miniprogramRoot || config.miniprogramRoot === 'dist/') {
      config.miniprogramRoot = './'
    }
  }

  config.setting = {
    ...config.setting,
    minified: true,
    uploadWithSourceMap: false,
  }

  config.packOptions = {
    ignore: PACK_IGNORE,
    include: [],
  }

  fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`)
}

const distConfigPath = path.join(__dirname, '../dist/project.config.json')
const rootConfigPath = path.join(__dirname, '../project.config.json')

patchProjectConfig(distConfigPath)
patchProjectConfig(rootConfigPath)

// 清理 source map 与 LICENSE 旁注文件，减少上传提示
function removeBuildArtifacts(dir) {
  if (!fs.existsSync(dir)) return
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name)
    const st = fs.statSync(full)
    if (st.isDirectory()) {
      removeBuildArtifacts(full)
    } else if (name.endsWith('.map') || name.endsWith('.LICENSE.txt')) {
      fs.unlinkSync(full)
    }
  }
}
removeBuildArtifacts(path.join(__dirname, '../dist'))

console.log('[patch] project.config.json packOptions + 清理 .map / .LICENSE.txt')
