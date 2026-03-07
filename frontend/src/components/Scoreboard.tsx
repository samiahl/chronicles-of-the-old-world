import type { ScoreboardEntry } from '../types'

interface Props {
  scoreboard: ScoreboardEntry[]
}

export default function Scoreboard({ scoreboard }: Props) {
  if (!scoreboard.length) {
    return (
      <EmptyState icon="⚔" text="No commanders enlisted yet. Add players and log your first battle." />
    )
  }

  return (
    <div>
      <div className="section-header">
        <div>
          <h2 className="section-title">Campaign Standings</h2>
          <p className="section-desc">The fate of the realm, tallied in blood and glory</p>
        </div>
      </div>

      <div className="table-wrap">
        <table className="scoreboard-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Commander</th>
              <th>Faction</th>
              <th>Points</th>
              <th>GP</th>
              <th className="col-win">W</th>
              <th className="col-draw">D</th>
              <th className="col-loss">L</th>
              <th>VP+</th>
              <th>VP−</th>
            </tr>
          </thead>
          <tbody>
            {scoreboard.map((entry, i) => (
              <tr key={entry.id} className={i === 0 ? 'rank-first' : ''}>
                <td className="rank-cell">
                  {i === 0 ? '👑' : i + 1}
                </td>
                <td className="name-cell">{entry.name}</td>
                <td className="faction-cell">{entry.faction ?? '—'}</td>
                <td className="points-cell">{entry.points}</td>
                <td className="stat-cell">{entry.gamesPlayed}</td>
                <td className="stat-cell col-win">{entry.wins}</td>
                <td className="stat-cell col-draw">{entry.draws}</td>
                <td className="stat-cell col-loss">{entry.losses}</td>
                <td className="stat-cell">{entry.vpFor}</td>
                <td className="stat-cell">{entry.vpAgainst}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="scoring-note">Win = 3 pts · Draw = 1 pt · Loss = 0 pts</p>
    </div>
  )
}

function EmptyState({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-text">{text}</div>
    </div>
  )
}
