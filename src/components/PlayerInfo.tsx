import type { Player } from '../types/game.types';

interface PlayerInfoProps {
  players: Player[];
  currentTurn: number;
}

export const PlayerInfo: React.FC<PlayerInfoProps> = ({ players, currentTurn }) => {
  return (
    <div className="player-info">
      {players.map((player, index) => (
        <div
          key={player.userId}
          className={`player ${currentTurn === index ? 'active' : ''}`}
        >
          <span className="player-symbol">{player.symbol}</span>
          <span className="player-name">{player.username}</span>
          {currentTurn === index && <span className="turn-indicator">Your Turn</span>}
        </div>
      ))}
    </div>
  );
};
