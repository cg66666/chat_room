/*
 * @Description: file content
 * @Author: cg
 * @Date: 2024-08-16 11:35:37
 * @LastEditors: cg
 * @LastEditTime: 2025-01-05 04:10:49
 */
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { ElementPlusResolver } from 'unplugin-vue-components/resolvers'

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
  // 根据当前工作目录中的 `mode` 加载 .env 文件
  // 设置第三个参数为 '' 来加载所有环境变量，而不管是否有 `VITE_` 前缀。
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: `/${env.VITE_PREFIX}/`,
    plugins: [
      vue(),
      AutoImport({
        resolvers: [ElementPlusResolver()]
      }),
      Components({
        // 指定组件按需引入所在文件夹的位置，默认是src/components
        dirs: ['src/components'],
        // 配置type文件生成位置，默认是components.d.ts
        dts: 'components.d.ts',
        resolvers: [ElementPlusResolver()]
      })
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url))
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          api: 'modern-compiler'
        }
      }
    },
    server: {
      port: Number(env.VITE_BASE_PORT),
      proxy: {
        '/chat/chat_room': {
          target: env.VITE_BASE_URL, // 真实接口地址, 后端给的基地址
          changeOrigin: true, // 允许跨域
          rewrite: (path) => path.replace(/^\/chat\/chat_room/, '/room')
        },
        '/ws': {
          target: env.VITE_BASE_URL, // 真实接口地址, 后端给的基地址
          changeOrigin: true, // 允许跨域
          ws: true,
          rewrite: (path) => path.replace(/^\/ws/, '/')
        }
      }
    },
    build: {
      outDir: 'chat_room'
    }
  }
})
