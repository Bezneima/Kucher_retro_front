# Socket.IO React Example

This is a React + TypeScript example equivalent to the Vue implementation in this repo.

```tsx
import { useEffect, useState } from 'react'
import { createWs } from '@/shared/socket'

type WsConnectionStatus = 'idle' | 'connecting' | 'connected' | 'unauthorized' | 'error'

type Props = {
  accessToken: string | null
  onUnauthorized?: () => void
}

export function WsStatusWidget({ accessToken, onUnauthorized }: Props) {
  const [status, setStatus] = useState<WsConnectionStatus>('idle')
  const [lastMessage, setLastMessage] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    setStatus('connecting')

    const socket = createWs(accessToken?.trim() ?? '')

    const onConnect = () => {
      setStatus('connected')
      setErrorMessage('')
    }

    const onMessage = (payload: string) => {
      setLastMessage(payload)
    }

    const onConnectError = (error: Error) => {
      const message = error?.message ?? 'Connection error'
      setErrorMessage(message)

      if (message === 'Unauthorized') {
        setStatus('unauthorized')
        socket.disconnect()
        onUnauthorized?.()
        return
      }

      setStatus('error')
    }

    socket.on('connect', onConnect)
    socket.on('message', onMessage)
    socket.on('connect_error', onConnectError)

    return () => {
      socket.off('connect', onConnect)
      socket.off('message', onMessage)
      socket.off('connect_error', onConnectError)
      socket.disconnect()
    }
  }, [accessToken, onUnauthorized])

  return (
    <section>
      <p>WS status: {status}</p>
      <p>Last message: {lastMessage || '-'}</p>
      {errorMessage && <p>Error: {errorMessage}</p>}
    </section>
  )
}
```

Expected behavior:
- Valid token: socket `connect` + `message` with `"hello world"`.
- Missing/invalid token: `connect_error` with `"Unauthorized"`.
