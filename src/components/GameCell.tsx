interface GameCellProps {
    value: string | null;
    onClick: () => void;
    disabled: boolean;
  }
  
  export const GameCell: React.FC<GameCellProps> = ({ value, onClick, disabled }) => {
    return (
      <button
        className={`game-cell ${value ? `cell-${value}` : ''}`}
        onClick={onClick}
        disabled={disabled || !!value}
      >
        {value}
      </button>
    );
  };
  