/**
 * Electron Forge configuration.
 * Uses the @electron-forge/plugin-vite plugin to build main/preload/utility-process
 * code with Vite, in addition to the renderer process.
 */
export default {
  packagerConfig: {
    asar: true,
    extraResource: ['./configs']
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        name: 'ScriptFlow'
      }
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin', 'linux', 'win32']
    }
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        build: [
          {
            entry: 'electron/main.js',
            config: 'vite.main.config.js'
          },
          {
            entry: 'electron/preload.js',
            config: 'vite.preload.config.js'
          },
          {
            entry: 'shared/script-runner.js',
            config: 'vite.runner.config.js'
          }
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.config.js'
          }
        ]
      }
    }
  ]
}
