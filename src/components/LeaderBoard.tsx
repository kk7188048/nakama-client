import type { LeaderboardEntry } from '../types/game.types';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries }) => {
  return (
    <div className="leaderboard">
      <h2>Leaderboard</h2>
      <table>
        <thead>
          <tr>
            <th>Rank</th>
            <th>Player</th>
            <th>Wins</th>
            <th>Losses</th>
            <th>Draws</th>
            
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => (
            <tr key={entry.userId}>
              <td>{index + 1}</td>
              <td>{entry.username}</td>
              <td>{entry.wins}</td>
              <td>{entry.losses}</td>
              <td>{entry.draws}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
