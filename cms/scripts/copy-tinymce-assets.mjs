import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
import { resolve } from "node:path"

const source = resolve(import.meta.dirname, "../node_modules/tinymce")
const destination = resolve(import.meta.dirname, "../public/tinymce")

if (!existsSync(source)) process.exit(0)

rmSync(destination, { force: true, recursive: true })
mkdirSync(destination, { recursive: true })
cpSync(source, destination, { recursive: true })
