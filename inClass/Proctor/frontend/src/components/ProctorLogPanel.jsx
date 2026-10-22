const EVENT_LABELS = {
  'exam-started': { label: 'Exam Started', className: 'log-tag-info' },
  'camera-snapshot': { label: 'Camera Snapshot', className: 'log-tag-neutral' },
  'fullscreen-exit': { label: 'Full Screen Exited', className: 'log-tag-warning' },
  'window-blur': { label: 'Window Lost Focus', className: 'log-tag-warning' },
  'exam-submitted': { label: 'Exam Submitted', className: 'log-tag-success' },
}

function describeEvent(type) {
  return EVENT_LABELS[type] || { label: type, className: 'log-tag-neutral' }
}

/**
 * @param {{ events: Array<{ type: string, message: string, occurredAt: string }>, compact?: boolean }} props
 */
function ProctorLogPanel({ events, compact = false }) {
  const visibleEvents = compact ? events.slice(-5) : events

  return (
    <div className="proctor-log-panel">
      <div className="proctor-log-header">
        <h4>Proctor Log</h4>
        <span className="proctor-log-count">{events.length} event{events.length === 1 ? '' : 's'}</span>
      </div>

      {events.length === 0 ? (
        <p className="proctor-log-empty">No proctoring activity recorded yet.</p>
      ) : (
        <ul className="proctor-log-list">
          {visibleEvents.map((event, index) => {
            const { label, className } = describeEvent(event.type)
            return (
              <li key={`${event.occurredAt}-${index}`} className="proctor-log-item">
                <span className={`log-tag ${className}`}>{label}</span>
                <span className="proctor-log-message">{event.message}</span>
                <span className="proctor-log-time">
                  {new Date(event.occurredAt).toLocaleTimeString()}
                </span>
              </li>
            )
          })}
        </ul>
      )}

      {compact && events.length > visibleEvents.length && (
        <p className="proctor-log-more">+{events.length - visibleEvents.length} earlier event(s)</p>
      )}
    </div>
  )
}

export default ProctorLogPanel
