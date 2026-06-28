import { useStore } from '@/store'
import { Icon } from './Icon'
import { Menu, MenuItem } from './Menu'
import {
  PHASE_META,
  PHASE_ORDER,
  PLATFORM_META,
  PLATFORM_ORDER,
  STATUS_META,
  STATUS_ORDER,
  TAG_META,
  TAG_ORDER,
} from '@/lib/constants'
import type { Phase, Platform, Status, Tag } from '@/types'

// A multi-select filter dropdown for one facet.
function FacetMenu<T extends string>({
  label,
  options,
  selected,
  optionLabel,
  onToggle,
}: {
  label: string
  options: T[]
  selected: T[]
  optionLabel: (o: T) => string
  onToggle: (o: T) => void
}) {
  const n = selected.length
  return (
    <Menu
      width={184}
      trigger={(open, toggle) => (
        <button className={`chip ${n ? 'on' : ''} ${open ? 'open' : ''}`} onClick={toggle}>
          {label}
          {n > 0 && <span className="chip-count">{n}</span>}
          <Icon name="chevron" size={13} style={{ transform: 'rotate(90deg)', opacity: 0.6 }} />
        </button>
      )}
      children={() => (
        <>
          {options.map((o) => (
            <MenuItem key={o} active={selected.includes(o)} onClick={() => onToggle(o)}>
              <span className="check-slot">{selected.includes(o) && <Icon name="check" size={13} strokeWidth={2.4} />}</span>
              {optionLabel(o)}
            </MenuItem>
          ))}
        </>
      )}
    />
  )
}

export function FilterBar() {
  const filters = useStore((s) => s.filters)
  const setFilters = useStore((s) => s.setFilters)
  const clearFilters = useStore((s) => s.clearFilters)

  const toggle = <T,>(arr: T[], v: T): T[] => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v])
  const active =
    filters.statuses.length + filters.phases.length + filters.tags.length + filters.platforms.length > 0 ||
    filters.search.trim().length > 0

  return (
    <div className="filterbar">
      <div className="searchbar">
        <Icon name="search" size={17} />
        <input
          value={filters.search}
          onChange={(e) => setFilters({ search: e.target.value })}
          placeholder="Search titles, hooks, bodies…"
          aria-label="Search articles"
        />
        {filters.search && (
          <button className="icon-btn sm" onClick={() => setFilters({ search: '' })} aria-label="Clear search">
            <Icon name="close" size={14} />
          </button>
        )}
      </div>

      <FacetMenu<Status>
        label="Status"
        options={STATUS_ORDER}
        selected={filters.statuses}
        optionLabel={(s) => STATUS_META[s].label}
        onToggle={(s) => setFilters({ statuses: toggle(filters.statuses, s) })}
      />
      <FacetMenu<Phase>
        label="Phase"
        options={PHASE_ORDER}
        selected={filters.phases}
        optionLabel={(p) => `${PHASE_META[p].roman}. ${PHASE_META[p].title}`}
        onToggle={(p) => setFilters({ phases: toggle(filters.phases, p) })}
      />
      <FacetMenu<Tag>
        label="Tag"
        options={TAG_ORDER}
        selected={filters.tags}
        optionLabel={(t) => TAG_META[t].label}
        onToggle={(t) => setFilters({ tags: toggle(filters.tags, t) })}
      />
      <FacetMenu<Platform>
        label="Platform"
        options={PLATFORM_ORDER}
        selected={filters.platforms}
        optionLabel={(p) => PLATFORM_META[p].label}
        onToggle={(p) => setFilters({ platforms: toggle(filters.platforms, p) })}
      />

      {active && (
        <button className="chip clear" onClick={clearFilters}>
          <Icon name="close" size={13} /> Clear
        </button>
      )}
    </div>
  )
}
