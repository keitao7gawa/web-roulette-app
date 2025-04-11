'use client';

import { useEffect, useRef } from 'react';

interface ConfettiProps {
  isActive: boolean;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export function Confetti({ isActive, containerRef }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!isActive || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスのサイズをコンテナサイズに合わせる
    const resizeCanvas = () => {
      if (containerRef && containerRef.current) {
        // コンテナが指定されている場合はそのサイズに合わせる
        const rect = containerRef.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        
        // キャンバスをコンテナ内に配置（相対位置に変更）
        canvas.style.position = 'absolute';
        canvas.style.top = '0';
        canvas.style.left = '0';
      } else {
        // コンテナが指定されていない場合は画面全体に
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // 紙吹雪のパーティクル
    const particles: {
      x: number;
      y: number;
      size: number;
      color: string;
      speedX: number;
      speedY: number;
      rotation: number;
      rotationSpeed: number;
      gravity: number;
      life: number;
      maxLife: number;
    }[] = [];

    // 色の配列 - よりカラフルな色を使用
    const colors = [
      '#FF6B6B', // 赤
      '#4ECDC4', // 青緑
      '#45B7D1', // 水色
      '#96CEB4', // 緑
      '#FFEEAD', // 黄色
      '#FFD700', // 金色
      '#FF69B4', // ピンク
      '#9B59B6', // 紫
      '#FF7F50', // サーモン
      '#00BFFF', // 空色
    ];

    // クラッカーの発射位置（下部中央から左右に分かれて発射）
    const leftEmitterX = canvas.width * 0.3; // 左側の発射位置
    const rightEmitterX = canvas.width * 0.7; // 右側の発射位置
    const emitterY = canvas.height * 0.95; // 下部からやや上

    // パーティクルの生成
    const particleCount = 150; // 紙吹雪の量を増やす
    for (let i = 0; i < particleCount; i++) {
      // 左右どちらから発射するかランダムに決定
      const emitterX = Math.random() > 0.5 ? leftEmitterX : rightEmitterX;
      
      // 初期の飛び出し角度（上向きに広がるように）
      const angle = Math.random() * Math.PI * 0.7 + Math.PI * 0.15; // 15〜85度の間
      
      // 初期速度（より速く）
      const speed = Math.random() * 8 + 8; // 8〜16の速度
      
      particles.push({
        x: emitterX,
        y: emitterY,
        size: Math.random() * 10 + 2, // サイズはそのまま
        color: colors[Math.floor(Math.random() * colors.length)],
        speedX: Math.cos(angle) * speed * (emitterX === leftEmitterX ? -1 : 1), // 左右に分散
        speedY: -Math.sin(angle) * speed, // 上向きの速度（マイナス）
        rotation: Math.random() * 360,
        rotationSpeed: Math.random() * 10 - 5, // 回転速度up
        gravity: 0.1 + Math.random() * 0.1, // 重力の影響
        life: 0,
        maxLife: 100 + Math.random() * 50 // 寿命にバリエーションを持たせる
      });
    }

    let animationFrameId: number;
    const startTime = Date.now();
    const duration = 1800; // 3秒間表示

    const animate = () => {
      const currentTime = Date.now();
      const elapsed = currentTime - startTime;

      if (elapsed > duration) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        window.removeEventListener('resize', resizeCanvas);
        return;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        // 時間経過による透明度計算（終わりに向けてフェードアウト）
        const alpha = 1 - Math.min(1, particle.life / particle.maxLife);
        
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate((particle.rotation * Math.PI) / 180);
        ctx.globalAlpha = alpha;

        ctx.fillStyle = particle.color;
        ctx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);

        ctx.restore();

        // 物理演算の適用
        particle.speedY += particle.gravity; // 重力の適用
        particle.x += particle.speedX;
        particle.y += particle.speedY;
        particle.rotation += particle.rotationSpeed;
        particle.life++;

        // 画面外に出たり寿命を超えたりしたら再利用
        if (particle.y > canvas.height || particle.x < 0 || particle.x > canvas.width || particle.life > particle.maxLife) {
          // 左右どちらから発射するかランダムに決定
          const emitterX = Math.random() > 0.5 ? leftEmitterX : rightEmitterX;
          
          // 再初期化せず、画面外に隠しておく（演出が終わりに近づいたら）
          if (elapsed > duration * 0.8) {
            particle.y = canvas.height + particle.size * 2;
            return;
          }
          
          // 初期の飛び出し角度（上向きに広がるように）
          const angle = Math.random() * Math.PI * 0.7 + Math.PI * 0.15; // 15〜85度の間
          
          // 初期速度（より速く）
          const speed = Math.random() * 8 + 8; // 8〜16の速度
          
          // パーティクルを再利用
          particle.x = emitterX;
          particle.y = emitterY;
          particle.speedX = Math.cos(angle) * speed * (emitterX === leftEmitterX ? -1 : 1);
          particle.speedY = -Math.sin(angle) * speed;
          particle.life = 0;
        }
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [isActive, containerRef]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none z-50 absolute inset-0"
      style={{ display: isActive ? 'block' : 'none' }}
    />
  );
} 