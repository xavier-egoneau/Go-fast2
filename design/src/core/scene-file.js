const SCENES_BASE = '/design/scenes'
const SCENE_INDEX = `${SCENES_BASE}/index.json`

export async function listSceneFiles() {
  try {
    const res = await fetch(SCENE_INDEX)
    if (res.ok) {
      const data = await res.json()
      if (Array.isArray(data)) return data
    }
  } catch {}

  return [
    {
      id: 'default-scene',
      name: 'Default scene',
      file: 'default.scene.json'
    }
  ]
}

export async function loadSceneFile(fileName = 'default.scene.json') {
  const res = await fetch(`${SCENES_BASE}/${fileName}`)
  if (!res.ok) throw new Error(`Impossible de charger ${fileName}`)
  return res.json()
}
