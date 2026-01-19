export function Toast({
  message,
  type = 'success',
}: {
  message: string
  type?: 'success' | 'error'
}) {
  const bg = type === 'success' ? '#111' : '#c0392b'
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: 24,
        transform: 'translateX(-50%)',
        background: bg,
        color: '#fff',
        padding: '10px 14px',
        borderRadius: 999,
        fontSize: 13,
        zIndex: 9999,
        boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
      }}
    >
      {message}
    </div>
  )
}
