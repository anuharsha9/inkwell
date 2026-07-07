import { writingHeatmap } from '@/lib/craft'
import type { Article } from '@/types'

// A GitHub-calendar-style writing heatmap. Columns are weeks, rows Sun→Sat;
// intensity = words touched that day. It's the habit goal made visible.
export function Heatmap({ articles }: { articles: Article[] }) {
  const cells = writingHeatmap(articles)
  const activeDays = cells.filter((c) => c.level > 0).length
  const weeks = Math.round(cells.length / 7)

  return (
    <div className="heatmap">
      <div className="heatmap-grid" role="img" aria-label={`${activeDays} writing days in the last ${weeks} weeks`}>
        {cells.map((c) => (
          <span
            key={c.date}
            className={`heat-cell l${c.level}${c.future ? ' future' : ''}`}
            title={c.future ? undefined : `${c.date} · ${c.words.toLocaleString()} words`}
          />
        ))}
      </div>
      <div className="heatmap-foot">
        <span className="heatmap-count">{activeDays} writing days</span>
        <span className="heatmap-legend">
          Less
          <span className="heat-cell l0" />
          <span className="heat-cell l1" />
          <span className="heat-cell l2" />
          <span className="heat-cell l3" />
          <span className="heat-cell l4" />
          More
        </span>
      </div>
    </div>
  )
}
