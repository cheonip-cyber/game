import { useEffect, useState } from 'react';
import { subscribeTopRankings } from '../services/rankings';
import type { GameScore } from '../types';

export function useRankings() {
  const [rankings, setRankings] = useState<GameScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeTopRankings((nextRankings) => {
      setRankings(nextRankings);
      setError(null);
      setIsLoading(false);
    }, (subscriptionError) => {
      console.error('Realtime rankings subscription failed', subscriptionError);
      setError('실시간 랭킹 연결에 실패했습니다.');
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  return { rankings, isLoading, error };
}
