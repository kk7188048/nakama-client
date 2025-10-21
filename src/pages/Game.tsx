import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nakamaService } from '../services/nakama';
import { useGameStore } from '../store/gameStore';
import { Board } from '../components/Board';
import { PlayerInfo } from '../components/PlayerInfo';

export const Game = () => {
  const navigate = useNavigate();
  const { gameState, setGameState, matchId, currentPlayer } = useGameStore();
  const [isMyTurn, setIsMyTurn] = useState(false);

  useEffect(() => {
    if (!matchId) {
      navigate('/menu');
      return;
    }

    const socket = nakamaService.socket;
    if (!socket) return;

    socket.onmatchdata = (matchData) => {
      const message = JSON.parse(new TextDecoder().decode(matchData.data));
      
      switch (matchData.op_code) {
        case 2: 
          if (message.type === 'game_start') {
            setGameState({
              board: Array(9).fill(null),
              players: message.players,
              currentTurn: message.currentTurn,
              winner: null,
              gameStatus: 'active',
              startTime: Date.now(),
              moveHistory: []
            });
          } else if (message.type === 'board_update') {
            setGameState({
              ...gameState!,
              board: message.board,
              currentTurn: message.currentTurn
            });
          }
          break;

        case 3: 
          console.log('Game Over! Winner:', message.winner, 'Reason:', message.reason);
          setGameState({
            ...gameState!,
            board: message.board,
            winner: message.winner,
            gameStatus: 'completed'
          });
          setTimeout(() => {
            alert(
              message.winner
                ? `Game Over! Winner: ${message.winner}`
                : 'Game Over! It\'s a draw!'
            );
            console.log('Game completed, stats should be updated on server');
            navigate('/menu');
          }, 1000);
          break;

        case 4: 
          alert('Opponent left the game');
          navigate('/menu');
          break;
      }
    };

    return () => {
      socket.onmatchdata = () => {};
    };
  }, [matchId, navigate, setGameState, gameState]);

  useEffect(() => {
    if (gameState && currentPlayer) {
      const myPlayerIndex = gameState.players.findIndex(
        (p) => p.userId === currentPlayer.userId
      );
      setIsMyTurn(myPlayerIndex === gameState.currentTurn);
    }
  }, [gameState, currentPlayer]);

  const handleCellClick = (index: number) => {
    if (!isMyTurn || !gameState || gameState.board[index]) return;
    nakamaService.sendMove(index);
  };

  if (!gameState) {
    return (
      <div className="game-page">
        <h2>Waiting for opponent...</h2>
        <div className="loader"></div>
      </div>
    );
  }

  return (
    <div className="game-page">
      <PlayerInfo players={gameState.players} currentTurn={gameState.currentTurn} />
      <Board
        board={gameState.board}
        onCellClick={handleCellClick}
        isMyTurn={isMyTurn}
      />
      <div className="game-status">
        {isMyTurn ? 'Your Turn' : 'Opponent\'s Turn'}
      </div>
    </div>
  );
};
