export async function runAgentRequest(payload) {
  const res = await fetch('/__design_api/agent/run', {
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
    throw new Error(data?.error || text || 'Agent request failed')
  }

  return data
}
