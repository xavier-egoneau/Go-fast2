import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { scaffoldProject } from '../../scripts/init-project.js'

let tmpDir

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gofast-init-'))
  // Copier templates/scss/base nécessaire pour le scaffolding SCSS
  const templatesSrc = path.join(process.cwd(), 'templates')
  if (fs.existsSync(templatesSrc)) {
    copyDir(templatesSrc, path.join(tmpDir, 'templates'))
  }
  // package.json minimal
  fs.writeFileSync(
    path.join(tmpDir, 'package.json'),
    JSON.stringify({ name: 'old-name', version: '1.0.0' }, null, 2),
    'utf8'
  )
  // gofast.config.json initial
  fs.writeFileSync(
    path.join(tmpDir, 'gofast.config.json'),
    JSON.stringify({ projectName: '', scss: true, tailwind: false }),
    'utf8'
  )
})

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true })
})

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true })
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name)
    const d = path.join(dest, entry.name)
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d)
  }
}

describe('scaffoldProject — SCSS seul', () => {
  it('crée les dossiers dev/ attendus', () => {
    scaffoldProject({ projectName: 'mon-projet', scss: true, tailwind: false }, tmpDir)
    expect(fs.existsSync(path.join(tmpDir, 'dev', 'components'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'dev', 'pages'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'dev', 'data'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'dev', 'assets', 'scss', 'components'))).toBe(true)
    expect(fs.existsSync(path.join(tmpDir, 'dev', 'assets', 'icons', 'unitaires'))).toBe(true)
  })

  it('génère style.scss avec les imports base', () => {
    scaffoldProject({ projectName: 'mon-projet', scss: true, tailwind: false }, tmpDir)
    const scss = fs.readFileSync(path.join(tmpDir, 'dev', 'assets', 'scss', 'style.scss'), 'utf8')
    expect(scss).toContain("@use 'base/variables'")
    expect(scss).toContain("@use 'base/reset'")
    expect(scss).toContain('mon-projet')
  })

  it('crée showcase.json vide', () => {
    scaffoldProject({ projectName: 'mon-projet', scss: true, tailwind: false }, tmpDir)
    const showcase = JSON.parse(fs.readFileSync(path.join(tmpDir, 'dev', 'data', 'showcase.json'), 'utf8'))
    expect(showcase.components).toEqual([])
    expect(showcase.pages).toEqual([])
  })

  it('met à jour gofast.config.json', () => {
    scaffoldProject({ projectName: 'mon-projet', scss: true, tailwind: false }, tmpDir)
    const config = JSON.parse(fs.readFileSync(path.join(tmpDir, 'gofast.config.json'), 'utf8'))
    expect(config.projectName).toBe('mon-projet')
    expect(config.scss).toBe(true)
    expect(config.tailwind).toBe(false)
    expect(config.styleEntry).toBe('/dev/assets/scss/style.scss')
  })

  it('met à jour package.json avec le nom du projet', () => {
    scaffoldProject({ projectName: 'Mon Super Projet', scss: true, tailwind: false }, tmpDir)
    const pkg = JSON.parse(fs.readFileSync(path.join(tmpDir, 'package.json'), 'utf8'))
    expect(pkg.name).toBe('mon-super-projet')
    expect(pkg.description).toBe('Mon Super Projet')
  })
})

describe('scaffoldProject — Tailwind seul', () => {
  it('génère style.css avec @import tailwindcss', () => {
    scaffoldProject({ projectName: 'tw-projet', scss: false, tailwind: true }, tmpDir)
    const css = fs.readFileSync(path.join(tmpDir, 'dev', 'assets', 'style.css'), 'utf8')
    expect(css).toContain('@import "tailwindcss"')
  })

  it('configure styleEntry vers style.css', () => {
    scaffoldProject({ projectName: 'tw-projet', scss: false, tailwind: true }, tmpDir)
    const config = JSON.parse(fs.readFileSync(path.join(tmpDir, 'gofast.config.json'), 'utf8'))
    expect(config.styleEntry).toBe('/dev/assets/style.css')
  })
})

describe('scaffoldProject — SCSS + Tailwind', () => {
  it('génère style.scss avec tailwindcss et imports base', () => {
    scaffoldProject({ projectName: 'hybrid', scss: true, tailwind: true }, tmpDir)
    const scss = fs.readFileSync(path.join(tmpDir, 'dev', 'assets', 'scss', 'style.scss'), 'utf8')
    expect(scss).toContain("@use 'base/variables'")
    expect(scss).toContain('@import "tailwindcss"')
  })
})

describe('scaffoldProject — dev/.gitignore', () => {
  it('supprime dev/.gitignore après scaffolding', () => {
    fs.mkdirSync(path.join(tmpDir, 'dev'), { recursive: true })
    fs.writeFileSync(path.join(tmpDir, 'dev', '.gitignore'), '*\n!.gitignore', 'utf8')
    scaffoldProject({ projectName: 'test', scss: true, tailwind: false }, tmpDir)
    expect(fs.existsSync(path.join(tmpDir, 'dev', '.gitignore'))).toBe(false)
  })
})
