import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { nakamaService } from '../services/nakama';

export const Home = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const checkExistingSession = async () => {
      try {
        if (nakamaService.isAuthenticated()) {
          console.log('Found existing session, redirecting to menu...');
          navigate('/menu');
          return;
        }
      } catch (error) {
        console.log('No valid session found');
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSession();
  }, [navigate]);

 
  const handleAuthenticate = async () => {
    setError('');
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    if (username.length < 3) {
      setError('Username must be at least 3 characters');
      return;
    }

    setIsLoading(true);
    try {
      await nakamaService.authenticate(username);
      await nakamaService.createSocket();
      navigate('/menu');
    } catch (error: any) {
      setError(error.message || 'Failed to connect to server');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="home-page"><div className="loader"></div></div>;
  }

  return (
    <div className="home-page">
      <h1>Tic-Tac-Toe with Nakama</h1>
      <p>Multiplayer Handling Game</p>
      
      <div className="login-form">
        <input
          type="text"
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAuthenticate()}
          disabled={isLoading}
        />
        
        {error && <div className="error-message">{error}</div>}
        
        <button onClick={handleAuthenticate} disabled={isLoading}>
          {isLoading ? 'Connecting...' : 'Play Now'}
        </button>
        
      </div>
    </div>
  );
};
