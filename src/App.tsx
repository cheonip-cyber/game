import { useEffect, useRef } from 'react';
import { startGame } from './game/main';
import './styles.css';

export default function App() {
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!gameRef.current) gameRef.current = startGame('game-root');
    return () => {
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <main className="app-shell">
      <div id="game-root" />
    </main>
  );
}
