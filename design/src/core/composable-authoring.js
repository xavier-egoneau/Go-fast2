export async function exposeComposableChildPart(payload) {
  const res = await fetch('/__design_api/components/expose-child', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  const text = await res.text()
  let data = null

  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }

  if (!res.ok) {
    throw new Error(data?.error || text || 'Child exposure request failed')
  }

  if (!data || data.ok !== true || !data.nodeId) {
    throw new Error('Child exposure bridge returned an invalid response')
  }

  return data
}
