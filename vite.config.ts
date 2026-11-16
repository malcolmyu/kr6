import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({ plugins: [vue()],server:{watch:{ignored:['**/analysis/**','**/reference/**','**/runtime/**','**/tools/**','**/scripts/**','**/dist/**']}} })
