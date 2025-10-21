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
        const normalized = (response.leaderboard || [])
          .filter((i: any) => typeof i.userId === 'string' && i.userId.trim() !== '')
          .map((item: any) => ({
            userId: item.userId as string,
            username: item.username ?? 'Unknown',
            wins: Number(item.wins ?? 0),
            losses: Number(item.losses ?? 0),
            draws: Number(item.draws ?? 0),
            totalGames: Number(item.totalGames ?? 0),
            winRate: Number(item.winRate ?? 0),
            rank: typeof item.rank === 'number' ? item.rank : undefined,
          })) as LeaderboardEntry[];

        setEntries(normalized);
      } else {
        console.error('Leaderboard fetch failed:', response);
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
