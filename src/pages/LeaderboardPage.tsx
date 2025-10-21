import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nakamaService } from '../services/nakama';
import { Leaderboard } from '../components/LeaderBoard';
import type { LeaderboardEntry } from '../types/game.types';

export const LeaderboardPage = () => {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    try {
      console.log('Fetching leaderboard...');
      const response = await nakamaService.getLeaderboard();
      console.log('Leaderboard response:', response);
      
      if (response.success) {
        console.log('Leaderboard data:', response.leaderboard);
        setEntries(response.leaderboard);
      } else {
        console.error('Leaderboard fetch failed:', response.error);
      }
    } catch (error) {
      console.error('Error fetching leaderboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="leaderboard-page">
      <div className="leaderboard-header">
        <button className="back-btn" onClick={() => navigate('/menu')}>
          ← Back
        </button>
      </div>
      
      {isLoading ? (
        <div className="loader"></div>
      ) : (
        <Leaderboard entries={entries} />
      )}
    </div>
  );
};
