import { useStore } from '@/store'
import { STATUS_ORDER, STATUS_META } from '@/lib/constants'
import { Menu, MenuItem } from './Menu'
import { StatusPill } from './ui'
import type { Status } from '@/types'

// Inline status change without opening the editor (PRD §5.2). A click on the
// pill opens a small menu of the four statuses.
export function StatusControl({ id, status }: { id: string; status: Status }) {
  const setStatus = useStore((s) => s.setStatus)
  return (
    <Menu
      width={150}
      trigger={(_open, toggle) => <StatusPill status={status} onClick={toggle} />}
      children={(close) => (
        <>
          {STATUS_ORDER.map((s) => (
            <MenuItem
              key={s}
              active={s === status}
              onClick={() => {
                setStatus(id, s)
                close()
              }}
            >
              <span className="dot" style={{ background: `var(${STATUS_META[s].var})` }} />
              {STATUS_META[s].label}
            </MenuItem>
          ))}
        </>
      )}
    />
  )
}
