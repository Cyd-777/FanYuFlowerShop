import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import path from 'path'
import { execSync } from 'child_process'
import devConfig from './dev'
import prodConfig from './prod'
import NutUIResolver from '@nutui/auto-import-resolver'
import Components from 'unplugin-vue-components/webpack'

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
export default defineConfig<'webpack5'>(async (merge, { command, mode }) => {
  const baseConfig: UserConfigExport<'webpack5'> = {
    projectName: 'fan-yu-flower-shop',
    date: '2026-06-16',
    designWidth (input) {
      // 配置 NutUI 375 尺寸
      if (input?.file?.replace(/\\+/g, '/').indexOf('@nutui') > -1) {
        return 375
      }
      // 全局使用 Taro 默认的 750 尺寸
      return 750
    },
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2 / 1,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    onBuildFinish() {
      try {
        execSync('node scripts/patch-dist-config.js', {
          cwd: path.resolve(__dirname, '..'),
          stdio: 'inherit',
        })
      } catch (err) {
        console.warn('[patch] dist/project.config.json 修补失败', err)
      }
    },
    plugins: [
      ['@tarojs/plugin-html', {
        // NutUI 官方推荐：避免 pxtransform 二次转换 NutUI 样式
        pxtransformBlackList: [/nutui/i],
      }],
    ],
    defineConstants: {
    },
    copy: {
      patterns: [
        { from: 'src/images/', to: 'images/' },
      ],
      options: {
      }
    },
    framework: 'vue3',
    compiler: {
      type: 'webpack5',
      prebundle: {
        enable: false
      }
    },
    cache: {
      enable: false // Webpack 持久化缓存配置，建议开启。默认配置请参考：https://docs.taro.zone/docs/config-detail#cache
    },
    mini: {
      miniCssExtractPluginOption: {
        ignoreOrder: true,
      },
      postcss: {
        pxtransform: {
          enable: true,
          config: {

          }
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      webpackChain(chain) {
        chain.resolve.alias.set('@', path.resolve(__dirname, '..', 'src'))
        chain.plugin('unplugin-vue-components').use(Components({
          resolvers: [NutUIResolver({taro: true})]
        }))
        chain.module
          .rule('less')
          .oneOf('normal')
          .use('less-loader')
          .tap((options: Record<string, unknown> = {}) => {
            const lessOptions = (options.lessOptions as Record<string, unknown>) || {}
            const tokenPath = path.resolve(__dirname, '..', 'src/styles/tokens.less').replace(/\\/g, '/')
            const prefix = `@import "${tokenPath}";`
            const existing = String(lessOptions.additionalData || '')
            lessOptions.additionalData = existing.includes(tokenPath) ? existing : `${prefix}\n${existing}`
            return { ...options, lessOptions }
          })
      }
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      output: {
        filename: 'js/[name].[hash:8].js',
        chunkFilename: 'js/[name].[chunkhash:8].js'
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css'
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      webpackChain(chain) {
        chain.resolve.alias.set('@', path.resolve(__dirname, '..', 'src'))
        chain.plugin('unplugin-vue-components').use(Components({
          resolvers: [NutUIResolver({taro: true})]
        }))
        chain.module
          .rule('less')
          .oneOf('normal')
          .use('less-loader')
          .tap((options: Record<string, unknown> = {}) => {
            const lessOptions = (options.lessOptions as Record<string, unknown>) || {}
            const tokenPath = path.resolve(__dirname, '..', 'src/styles/tokens.less').replace(/\\/g, '/')
            const prefix = `@import "${tokenPath}";`
            const existing = String(lessOptions.additionalData || '')
            lessOptions.additionalData = existing.includes(tokenPath) ? existing : `${prefix}\n${existing}`
            return { ...options, lessOptions }
          })
      }
    },
    rn: {
      appName: 'taroDemo',
      postcss: {
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
        }
      }
    }
  }
  if (process.env.NODE_ENV === 'development') {
    // 本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig)
  }
  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig)
})
