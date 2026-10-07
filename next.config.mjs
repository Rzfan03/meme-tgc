import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Ada package-lock.json lain di ~ (proyek lain), jadi Next bisa salah pilih
// workspace root → artefak build ketukar. Kunci root ke folder proyek ini.
const nextConfig = {
  outputFileTracingRoot: path.dirname(fileURLToPath(import.meta.url)),
}

export default nextConfig
