# Agent Runtime Bridge

## Purpose

Define the local bridge between the Design Surface frontend and provider-specific runtimes.

This sits **below** the canvas ↔ brain contract.
The canvas still speaks in terms of:

- intent
- scene/system context
- normalized output

The bridge is responsible for:

- provider selection
- invocation transport
- future auth/connection status
- provider-specific adaptation

## Initial architecture

### Frontend

The frontend sends a POST request to:

`/__design_api/agent/run`

Payload shape:

```json
{
  "providerId": "manual-json",
  "intent": "Make this hero feel more premium",
  "prompt": "...",
  "context": {},
  "manualJson": "{ ... }"
}
```

### Bridge response

```json
{
  "ok": true,
  "provider": {
    "id": "manual-json",
    "label": "Manual JSON"
  },
  "output": {
    "summary": "...",
    "actions": [],
    "warnings": [],
    "requiresNewComponent": false,
    "unresolved": []
  }
}
```

## Provider lifecycle states

Providers should eventually expose:

- `available`
- `connected`
- `authRequired`
- `reason`

For now only static availability is exposed in the frontend runtime registry.

## First implementation rule

Do not call external CLIs directly from the browser layer.
All real runtime execution must pass through the local bridge.

This keeps:

- security boundaries clearer
- invocation semantics centralized
- provider swapping easier
- future OAuth/auth flows possible

## Planned providers

- manual-json
- codex-cli
- claude-code

## Current status

- frontend provider abstraction: in place
- prompt generation: in place
- local bridge endpoint: MVP placeholder
- real CLI invocation: not implemented yet
