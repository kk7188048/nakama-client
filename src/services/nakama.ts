import { Client, Session } from '@heroiclabs/nakama-js';
import type { Socket, Notification, Match, MatchData } from '@heroiclabs/nakama-js';

const SERVER_KEY = 'defaultkey';
const HOST = 'nakama-server-r3sh.onrender.com';
const PORT = '443';
const USE_SSL = true;

const SESSION_TOKEN_KEY = 'nakama_session_token';
const REFRESH_TOKEN_KEY = 'nakama_refresh_token';

const OpCodes = {
  MOVE: 1,
  UPDATE: 2,
  GAME_OVER: 3,
  OPPONENT_LEFT: 4
};

class NakamaService {
  client: Client;
  session: Session | null = null;
  socket: Socket | null = null;
  currentMatchId: string | null = null;
  currentMatchTicket: string | null = null;
  private socketConnecting: Promise<Socket> | null = null;
  private matchmakingPending: Promise<{ ticket: string }> | null = null;
  
  private matchFoundCb: ((matchId: string) => void) | null = null;
  private matchDataCb: ((matchData: any) => void) | null = null;
  private matchPresenceCb: ((joins: any[], leaves: any[]) => void) | null = null;

  constructor() {
    this.client = new Client(SERVER_KEY, HOST, PORT, USE_SSL);
    console.log('🔗 Nakama client initialized');
    console.log('🔗 Server URL:', `http${USE_SSL ? 's' : ''}://${HOST}:${PORT}`);
    this.restoreSession();
  }

  private toJson(payload: any): any {
    if (payload == null) return {};
    if (typeof payload === 'string') {
      try { return JSON.parse(payload || '{}'); } catch { return {}; }
    }
    return payload;
  }

  private restoreSession() {
    try {
      const authToken = localStorage.getItem(SESSION_TOKEN_KEY);
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      
      if (authToken && refreshToken) {
        this.session = Session.restore(authToken, refreshToken);
        
        const nowPlusFiveMinutes = Date.now() + (5 * 60 * 1000);
        
        if (this.session.isexpired(nowPlusFiveMinutes / 1000)) {
          console.log('⚠️ Session expired or expiring soon, will need refresh');
          this.session = null;
          this.clearStoredSession();
        } else {
          console.log('Session restored from storage');
        }
      }
    } catch (error) {
      console.error('Failed to restore session:', error);
      this.clearStoredSession();
    }
  }

  private saveSession(session: Session) {
    try {
      localStorage.setItem(SESSION_TOKEN_KEY, session.token);
      localStorage.setItem(REFRESH_TOKEN_KEY, session.refresh_token);
      console.log('💾 Session saved to storage');
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  private clearStoredSession() {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  async refreshSession(): Promise<Session> {
    if (!this.session) {
      throw new Error('No session to refresh');
    }

    try {
      this.session = await this.client.sessionRefresh(this.session);
      this.saveSession(this.session);
      return this.session;
    } catch (error) {
      console.error('Session refresh failed:', error);
      this.clearStoredSession();
      this.session = null;
      throw new Error('Session refresh failed. Please re-authenticate.');
    }
  }

  async ensureValidSession(): Promise<Session> {
    if (!this.session) {
      throw new Error('No session found. Please authenticate first.');
    }

    const nowPlusFiveMinutes = Date.now() + (5 * 60 * 1000);
    
    if (this.session.isexpired(nowPlusFiveMinutes / 1000)) {
      return await this.refreshSession();
    }

    return this.session;
  }

  getSession(): Session | null {
    return this.session;
  }

  isAuthenticated(): boolean {
    return this.session !== null && !this.session.isexpired();
  }

  async authenticate(username: string): Promise<Session> {
    try {
      const deviceId = `device-${username}-${Date.now()}`.substring(0, 128);
      
      console.log('Authenticating with device ID:', deviceId);
      console.log('Client config:', { HOST, PORT, USE_SSL });
      
      this.session = await this.client.authenticateDevice(
        deviceId,
        true,
        username
      );
      
      this.saveSession(this.session);
      
      console.log('Authenticated successfully:', {
        userId: this.session.user_id,
        username: this.session.username,
        expiresAt: new Date(this.session.expires_at * 1000).toISOString()
      });
      
      return this.session;
    } catch (error: any) {
      console.error('Authentication failed:', error);
      this.clearStoredSession();
      throw new Error('Authentication failed. Check console for details.');
    }
  }

  async createSocket(): Promise<Socket> {
    await this.ensureValidSession();

    if (!this.session) throw new Error('No valid session found.');
    if (this.socket) return this.socket;
    if (this.socketConnecting) return this.socketConnecting;

    this.socketConnecting = (async () => {
      try {
        const socket = this.client.createSocket(USE_SSL, false);
        await socket.connect(this.session!, true);

        socket.onnotification = (notification: Notification) => {
          console.log('Notification received:', notification);
          if (notification.code === 1 && notification.content) {
            const content = notification.content as any;
            if (content.matchId) {
              console.log('Match found via notification! Match ID:', content.matchId);
              this.currentMatchTicket = null; // Clear ticket
              if (this.matchFoundCb) this.matchFoundCb(content.matchId);
            }
          }
        };

        (socket as any).onmatchmakermatched = (matched: any) => {
          try {
            const matchId = matched && (matched.matchId || matched.match_id || matched.match ? matched.match : null);
            if (matchId) {
              console.log('Match found via matchmaker! Match ID:', matchId);
              this.currentMatchTicket = null; // Clear ticket
              if (this.matchFoundCb) this.matchFoundCb(String(matchId));
            } else {
              console.log('ℹonmatchmakermatched payload:', matched);
            }
          } catch (e) {
            console.warn('onmatchmakermatched handler error:', e);
          }
        };

        // ✅ NEW: Setup match data listener
        socket.onmatchdata = (matchData: MatchData) => {
          console.log('Match data received:', {
            opCode: matchData.op_code,
            data: matchData.data
          });
          
          if (this.matchDataCb) {
            try {
              const decoder = new TextDecoder();
              const jsonStr = decoder.decode(matchData.data);
              const data = JSON.parse(jsonStr);
              
              this.matchDataCb({
                opCode: matchData.op_code,
                data: data,
                rawMatchData: matchData
              });
            } catch (e) {
              console.error('Error parsing match data:', e);
            }
          }
        };

        socket.onmatchpresence = (presenceEvent: any) => {
          console.log('👥 Match presence update:', presenceEvent);
          
          if (this.matchPresenceCb) {
            this.matchPresenceCb(
              presenceEvent.joins || [],
              presenceEvent.leaves || []
            );
          }
        };

        socket.ondisconnect = (event: any) => {
          console.log('Socket disconnected:', event);
          this.socket = null;
          this.socketConnecting = null;
        };

        socket.onerror = (event: any) => {
          console.error('Socket error:', event);
        };

        this.socket = socket;
        console.log('Socket connected successfully');
        return socket;
      } catch (err) {
        this.socketConnecting = null;
        console.error('Socket connection failed:', err);
        throw new Error('Failed to connect socket');
      } finally {
        setTimeout(() => { this.socketConnecting = null; }, 0);
      }
    })();

    return this.socketConnecting;
  }

  private async getOrCreateSocket(): Promise<Socket> {
    if (this.socket) return this.socket;
    return await this.createSocket();
  }

  async createMatch(): Promise<string> {
    await this.ensureValidSession();

    const response = await this.client.rpc(
      this.session!,
      'create_match_rpc',
      '{}'
    );

    const data = this.toJson(response.payload);
    
    if (!data.success) {
      throw new Error(data.error || 'Failed to create match');
    }
    
    return data.matchId;
  }

  async findMatch(): Promise<{ ticket: string }> {
    await this.ensureValidSession();
    await this.getOrCreateSocket();

    console.log('Adding player to matchmaker queue...');
    if (!this.socket) throw new Error('Socket connection has not been established yet.');

    if (this.matchmakingPending) {
      console.log('Matchmaking already in progress');
      return this.matchmakingPending;
    }

    this.matchmakingPending = (async () => {
      try {
        const raw = await this.socket!.addMatchmaker('*', 2, 2);
        const ticketValue = (raw && typeof raw === 'object' && 'ticket' in raw) ? (raw as any).ticket : String(raw);
        this.currentMatchTicket = ticketValue;
        console.log('Added to matchmaker with ticket:', ticketValue);
        return { ticket: ticketValue };
      } finally {
        this.matchmakingPending = null;
      }
    })();

    return this.matchmakingPending;
  }

  async cancelMatchmaking(): Promise<void> {
    if (!this.currentMatchTicket) {
      console.warn('No active matchmaking ticket to cancel');
      return;
    }

    await this.ensureValidSession();

    console.log('Cancelling matchmaking with ticket:', this.currentMatchTicket);
    if (!this.socket) {
      this.currentMatchTicket = null;
      return;
    }
    
    try {
      await this.socket.removeMatchmaker(this.currentMatchTicket);
      console.log('Matchmaking cancelled successfully');
    } catch (error) {
      console.error('Failed to cancel matchmaking:', error);
    } finally {
      this.currentMatchTicket = null;
    }
  }

  onMatchFound(callback: (matchId: string) => void) {
    this.matchFoundCb = callback;
  }

  onMatchData(callback: (matchData: any) => void) {
    this.matchDataCb = callback;
  }

  onMatchPresence(callback: (joins: any[], leaves: any[]) => void) {
    this.matchPresenceCb = callback;
  }

  async joinMatch(matchId: string): Promise<Match> {
    if (!this.socket) {
      await this.createSocket();
    }
    
    this.currentMatchId = matchId;
    const match = await this.socket!.joinMatch(matchId);
    console.log('Joined match:', match);
    return match;
  }

  sendMove(position: number) {
    if (!this.socket) throw new Error('Socket not connected');
    if (!this.currentMatchId) throw new Error('No active match');

    const data = JSON.stringify({ position });
    this.socket.sendMatchState(
      this.currentMatchId,
      OpCodes.MOVE,
      data
    );
  }

  leaveMatch() {
    if (!this.socket || !this.currentMatchId) {
      console.warn('No active match to leave');
      return;
    }

    try {
      this.socket.leaveMatch(this.currentMatchId);
      console.log('Left match:', this.currentMatchId);
    } catch (error) {
      console.error('Error leaving match:', error);
    } finally {
      this.currentMatchId = null;
    }
  }


  async getPlayerStats() {
    await this.ensureValidSession();
    
    try {
        
        const response = await this.client.rpc(
            this.session!,
            'get_player_stats_rpc',
            '{}'
        );
        console.log('Player stats response:', response);
        return this.toJson(response.payload);
      
        
    } catch (error) {
        console.error('Player stats fetch failed:', error);
        throw error;
    }
}

 
  async refreshStatsAfterGame(delayMs: number = 1000): Promise<any> {
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return await this.getPlayerStats();
  }

  

  // logout() {
    
  //   if (this.currentMatchTicket) {
  //     this.cancelMatchmaking().catch(err => 
  //       console.error('Failed to cancel matchmaking on logout:', err)
  //     );
  //   }
    
  //   if (this.socket) {
  //     this.socket.disconnect(false);
  //     this.socket = null;
  //   }
    
  //   this.session = null;
  //   this.currentMatchId = null;
  //   this.currentMatchTicket = null;
  //   this.matchFoundCb = null;
  //   this.matchDataCb = null;
  //   this.matchPresenceCb = null;
  //   this.clearStoredSession();
    
  // }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect(false);
      this.socket = null;
    }
    this.currentMatchId = null;
  }

  getCurrentMatchId(): string | null {
    return this.currentMatchId;
  }

  getCurrentTicket(): string | null {
    return this.currentMatchTicket;
  }

  isMatchmaking(): boolean {
    return this.currentMatchTicket !== null;
  }

  isInMatch(): boolean {
    return this.currentMatchId !== null;
  }

async getLeaderboard(limit: number = 100) {
  await this.ensureValidSession();
  
  try {
      const leaderboardId = 'tictactoe_wins';
      
      const result = await this.client.listLeaderboardRecords(
          this.session!,
          leaderboardId,
          [],
          limit
      );
      
      
      const leaderboard = result.records?.map(record => {
          const wins = record.score || 0;
          const totalGames = record.subscore || 0;
          const winRate = totalGames > 0 ? (wins / totalGames) * 100 : 0;
          
          const username = record.username?.value || record.username || 'Unknown';
          
          return {
              userId: record.owner_id,
              username: username,
              wins: wins,
              losses: totalGames - wins, // Calculate losses
              draws: 0, // If you need this, track in detailed stats
              totalGames: totalGames,
              winRate: Math.round(winRate * 100) / 100, // Round to 2 decimals
              rank: record.rank
          };
      }) || [];
      
      console.log('Processed leaderboard:', leaderboard);
      
      return { success: true, leaderboard };
  } catch (error) {
      console.error('Leaderboard fetch failed:', error);
      throw error;
  }
}


async getPlayerLeaderboardPosition(numAbove: number = 5, numBelow: number = 5) {
  await this.ensureValidSession();
  
  try {
      const leaderboardId = 'tictactoe_wins';
      
      const result = await this.client.listLeaderboardRecordsAroundOwner(
          this.session!,
          leaderboardId,
          this.session!.user_id,
          numAbove + numBelow + 1 // Total records to fetch
      );
      
      const playerRecord = result.records?.find(
          r => r.owner_id === this.session!.user_id
      );
      
      const nearbyPlayers = result.records?.map(record => ({
          userId: record.owner_id,
          username: record.username?.value || 'Unknown',
          wins: record.score,
          rank: record.rank,
          isCurrentPlayer: record.owner_id === this.session!.user_id
      })) || [];
      
      return {
          success: true,
          rank: playerRecord?.rank || null,
          wins: playerRecord?.score || 0,
          nearbyPlayers: nearbyPlayers
      };
  } catch (error) {
      console.error('Player position fetch failed:', error);
      return { 
          success: false, 
          rank: null, 
          wins: 0,
          nearbyPlayers: []
      };
  }
}

async getLeaderboardRPC() {
  await this.ensureValidSession();
  
  try {
      const response = await this.client.rpc(
          this.session!,
          'get_leaderboard_rpc',
          '{}'
      );
      return this.toJson(response.payload);
  } catch (error) {
      console.error('Leaderboard RPC failed:', error);
      throw error;
  }
}


}

export const nakamaService = new NakamaService();