import { GameCell } from './GameCell';

interface BoardProps {
  board: (string | null)[];
  onCellClick: (index: number) => void;
  isMyTurn: boolean;
}

export const Board: React.FC<BoardProps> = ({ board, onCellClick, isMyTurn }) => {
  return (
    <div className="board">
      {board.map((cell, index) => (
        <GameCell
          key={index}
          value={cell}
          onClick={() => onCellClick(index)}
          disabled={!isMyTurn}
        />
      ))}
    </div>
  );
};
