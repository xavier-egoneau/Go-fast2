export async function saveSceneFile(fileName, scene) {
  const res = await fetch('/__design_api/scenes/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName, scene })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function deleteSceneFile(fileName) {
  const res = await fetch('/__design_api/scenes/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName })
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
