import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { nakamaService } from '../services/nakama';
import { useGameStore } from '../store/gameStore';

export const Menu = () => {
  const navigate = useNavigate();
  const { setMatchId, setCurrentPlayer } = useGameStore();
  

  useEffect(() => {
    if (!nakamaService.isAuthenticated()) {
      console.log('No session found, redirecting to home');
      navigate('/');
    } else {
      const session = nakamaService.getSession();
      console.log('Session found:', session?.user_id);
    }
  }, [navigate]);

  const handleCreateMatch = async () => {
    try {
      console.log('Checking session before creating match:', nakamaService.getSession());
      
      if (!nakamaService.isAuthenticated()) {
        throw new Error('No session found. Please authenticate first.');
      }

      nakamaService.onMatchFound(async (matchId: string) => {
        try {
          console.log('Match found callback with matchId:', matchId);
          setMatchId(matchId);
          await nakamaService.joinMatch(matchId);

          const session = nakamaService.getSession();
          if (session && session.user_id) {
            setCurrentPlayer({
              userId: session.user_id,
              username: session.username || 'Player',
              symbol: 'X', 
              sessionId: session.user_id
            });
          }

          navigate('/game');
        } catch (err) {
          console.error('Failed to join matched game:', err);
          alert('Failed to join matched game.');
        }
      });

      const { ticket } = await nakamaService.findMatch();
      console.log('Matchmaking ticket (Create Game):', ticket);
    } catch (error) {
      console.error('Error creating match:', error);
      alert('Failed to create match');
    }
  };

  const handleFindMatch = async () => {
    try {
      console.log('Checking session before finding match:', nakamaService.getSession());
      
      if (!nakamaService.isAuthenticated()) {
        throw new Error('No session found. Please authenticate first.');
      }

      nakamaService.onMatchFound(async (matchId: string) => {
        try {
          console.log('Match found callback with matchId:', matchId);
          setMatchId(matchId);
          await nakamaService.joinMatch(matchId);

          const session = nakamaService.getSession();
          if (session && session.user_id) {
            setCurrentPlayer({
              userId: session.user_id,
              username: session.username || 'Player',
              symbol: 'O',
              sessionId: session.user_id
            });
          }

          navigate('/game');
        } catch (err) {
          console.error('Failed to join matched game:', err);
          alert('Failed to join matched game.');
        }
      });

      // Queue into the matchmaker. This returns a ticket, not a matchId.
      const { ticket } = await nakamaService.findMatch();
      console.log('Matchmaking ticket:', ticket);
      // Now wait for server to notify a match via onMatchFound callback (or Nakama onmatchmakermatched)
    } catch (error) {
      console.error('Error finding match:', error);
      alert('Failed to find match');
    }
  };

  return (
    <div className="menu-page">
      <h1>Tic-Tac-Toe</h1>
      
      <div className="menu-buttons">
        <button className="primary-btn" onClick={handleCreateMatch}>
          🎮 Create Game
        </button>
        <button className="primary-btn" onClick={handleFindMatch}>
          🔍 Find Game
        </button>
        <button className="secondary-btn" onClick={() => navigate('/leaderboard')}>
          🏆 Leaderboard
        </button>
      </div>
    </div>
  );
};
