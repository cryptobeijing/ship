"use client";

import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  DependencyList,
  useCallback,
} from "react";
import { type Address as AddressType } from "viem";
//import { useOpenUrl } from "@coinbase/onchainkit/minikit";
import {
  ConnectWallet,
  ConnectWalletText,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from "@coinbase/onchainkit/wallet";
import {
  Name,
  Identity,
  EthBalance,
  Address,
  Avatar,
} from "@coinbase/onchainkit/identity";
import { useAccount } from "wagmi";
//import ArrowSvg from "../svg/ArrowSvg";
import BaseLogoHorizontal from "../svg/BaseLogoHorizontal";

//const MAX_SCORES = 8;
const FPS = 60;
const MS_PER_FRAME = 1000 / FPS;
const COLORS = {
  blue: "#0052FF",
  white: "#FFFFFF",
  black: "#000000",
  random: () =>
    `#${Math.floor(Math.random() * 12582912)
      .toString(16)
      .padStart(6, "0")}`,
};

// New game constants
const BULLET_SPEED = 5;
const ENEMY_SPEED = 1;
const BULLET_SIZE = 5;
const ENEMY_SIZE = 50;
const SHIP_WIDTH = 40;
const SHIP_HEIGHT = 20;
const SHIP_Y_POSITION = 450;

// Update ship movement speed
const SHIP_MOVE_SPEED = 20; // Increased from 10

const GameState = {
  INTRO: 0,
  PAUSED: 1,
  RUNNING: 2,
  WON: 3,
  DEAD: 4,
  AWAITINGNEXTLEVEL: 5,
};

const MoveState = {
  NONE: 0,
  UP: 1,
  RIGHT: 2,
  DOWN: 3,
  LEFT: 4,
};

export type Score = {
  attestationUid: string;
  transactionHash: string;
  address: AddressType;
  score: number;
};

/*type Attestation = {
  decodedDataJson: string;
  attester: string;
  time: string;
  id: string;
  txid: string;
};*/

/*async function fetchLastAttestations() {
  const query = `
    query GetAttestations {
      attestations(
        where: { schemaId: { equals: "${SCHEMA_UID}" } }
        orderBy: { time: desc }
        take: 8
      ) {
        decodedDataJson
        attester
        time
        id
        txid
      }
    }
  `;

  const response = await fetch(EAS_GRAPHQL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });

  const { data } = await response.json();
  return (data?.attestations ?? [])
    .map((attestation: Attestation) => {
      const parsedData = JSON.parse(attestation?.decodedDataJson ?? "[]");
      const pattern = /(0x[a-fA-F0-9]{40}) scored (\d+) on minikit/;
      const match = parsedData[0].value?.value?.match(pattern);
      if (match) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_, address, score] = match;
        return {
          score: parseInt(score),
          address,
          attestationUid: attestation.id,
          transactionHash: attestation.txid,
        };
      }
      return null;
    })
    .sort((a: Score, b: Score) => b.score - a.score);
}*/

const LevelMaps: {
  [key: number]: { x1: number; y1: number; width: number; height: number }[];
} = {
  1: [
    { x1: 0, y1: 0, width: 10, height: 500 },
    { x1: 0, y1: 0, width: 500, height: 10 },
    { x1: 490, y1: 0, width: 10, height: 500 },
    { x1: 0, y1: 490, width: 500, height: 10 },
  ],
  2: [
    { x1: 0, y1: 0, width: 10, height: 500 },
    { x1: 0, y1: 0, width: 500, height: 10 },
    { x1: 490, y1: 0, width: 10, height: 500 },
    { x1: 0, y1: 490, width: 500, height: 10 },
    { x1: 250, y1: 0, width: 10, height: 200 },
    { x1: 250, y1: 300, width: 10, height: 200 },
  ],
  3: [
    { x1: 0, y1: 0, width: 10, height: 500 },
    { x1: 0, y1: 0, width: 500, height: 10 },
    { x1: 490, y1: 0, width: 10, height: 500 },
    { x1: 0, y1: 490, width: 500, height: 10 },
    { x1: 250, y1: 0, width: 10, height: 200 },
    { x1: 250, y1: 300, width: 10, height: 200 },
    { x1: 0, y1: 250, width: 200, height: 10 },
    { x1: 300, y1: 250, width: 200, height: 10 },
  ],
  4: [
    { x1: 0, y1: 0, width: 10, height: 500 },
    { x1: 0, y1: 0, width: 500, height: 10 },
    { x1: 490, y1: 0, width: 10, height: 500 },
    { x1: 0, y1: 490, width: 500, height: 10 },
    { x1: 100, y1: 0, width: 10, height: 200 },
    { x1: 200, y1: 0, width: 10, height: 200 },
    { x1: 300, y1: 0, width: 10, height: 200 },
    { x1: 400, y1: 0, width: 10, height: 200 },
    { x1: 100, y1: 300, width: 10, height: 200 },
    { x1: 200, y1: 300, width: 10, height: 200 },
    { x1: 300, y1: 300, width: 10, height: 200 },
    { x1: 400, y1: 300, width: 10, height: 200 },
  ],
};

function useKonami(gameState: number) {
  const CODE = [
    MoveState.UP,
    MoveState.UP,
    MoveState.DOWN,
    MoveState.DOWN,
    MoveState.LEFT,
    MoveState.RIGHT,
    MoveState.LEFT,
    MoveState.RIGHT,
  ];
  const [konami, setKonami] = useState(false);
  const [sequence, setSequence] = useState<number[]>([]);

  const updateSequence = (input: number) => {
    if (!konami && gameState === GameState.INTRO) {
      const newSequence = sequence.concat(input);
      if (newSequence.length > CODE.length) {
        newSequence.shift();
      }
      if (newSequence.join(",") === CODE.join(",")) {
        setKonami(true);
        console.log("Slow motion activated!");
      } else {
        setSequence(newSequence);
      }
    }
  };

  return { konami, updateSequence };
}

type ControlButtonProps = {
  className?: string;
  children?: React.ReactNode;
  onClick: () => void;
};

function ControlButton({ children, onClick, className }: ControlButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  return (
    <button
      type="button"
      className={`w-12 h-12 bg-[#0052FF] rounded-full cursor-pointer select-none
        transition-all duration-150 border-[1px] border-[#0052FF] ${className}
        ${
          isPressed
            ? "translate-y-1 [box-shadow:0_0px_0_0_#002299,0_0px_0_0_#0033cc33] border-b-[0px]"
            : "[box-shadow:0_5px_0_0_#002299,0_8px_0_0_#0033cc33]"
        }`}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerLeave={() => setIsPressed(false)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function WalletControl() {
  return (
    <Wallet className="[&>div:nth-child(2)]:!opacity-20 md:[&>div:nth-child(2)]:!opacity-100">
      <ConnectWallet className="w-12 h-12 bg-[#0052FF] rounded-full hover:bg-[#0052FF] focus:bg-[#0052FF] cursor-pointer select-none transition-all duration-150 border-[1px] border-[#0052FF] min-w-12 [box-shadow:0_5px_0_0_#002299,0_8px_0_0_#0033cc33]">
        <ConnectWalletText>{""}</ConnectWalletText>
      </ConnectWallet>
      <WalletDropdown>
        <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
          <Avatar />
          <Name />
          <Address />
          <EthBalance />
        </Identity>
        <WalletDropdownDisconnect />
      </WalletDropdown>
    </Wallet>
  );
}

type ControlButtonsProps = {
  gameState: number;
  handleMobileGameState: () => void;
};

function ControlButtons({
  gameState,
  handleMobileGameState,
}: ControlButtonsProps) {
  const { address } = useAccount();

  return (
    <>
      <div className="absolute left-8 top-16 w-24">
        <ControlButton className="block" onClick={handleMobileGameState} />
        <div className="ml-6 w-16 text-center -rotate-45 leading-[1.2]">
          {gameState === GameState.RUNNING ? "PAUSE" : "PLAY"}
        </div>
      </div>
      <div className="absolute right-0 top-4 w-24">
        <WalletControl />
        <div className="ml-4 w-20 text-center -rotate-45 leading-[1.2]">
          {address ? "LOGOUT" : "LOGIN"}
        </div>
      </div>
    </>
  );
}

type DPadProps = {
  onDirectionChange: (direction: number) => void;
};

function DPad({ onDirectionChange }: DPadProps) {
  return (
    <div className="flex">
      <div className="grid grid-cols-3">
        <div className="h-12 w-12" />
        <button
          className="h-12 w-12 bg-black rounded-t-lg hover:shadow-dpad-hover active:shadow-dpad-pressed active:translate-y-[1px] bg-dpad-gradient shadow-dpad"
          onClick={() => onDirectionChange(MoveState.UP)}
        />
        <div className="h-12 w-12" />
        <button
          className="h-12 w-12 bg-black rounded-t-lg hover:shadow-dpad-hover active:shadow-dpad-pressed active:translate-x-[1px] bg-dpad-gradient -rotate-90"
          onClick={() => onDirectionChange(MoveState.LEFT)}
        />
        <div className="h-12 w-12 bg-black" />
        <button
          className="h-12 w-12 bg-black rounded-t-lg hover:shadow-dpad-hover active:shadow-dpad-pressed active:translate-x-[-1px] bg-dpad-gradient shadow-dpad rotate-90"
          onClick={() => onDirectionChange(MoveState.RIGHT)}
        />
        <div className="h-12 w-12" />
        <button
          className="h-12 w-12 bg-black rounded-t-lg hover:shadow-dpad-hover active:shadow-dpad-pressed active:translate-y-[-1px] bg-dpad-gradient shadow-dpad rotate-180"
          onClick={() => onDirectionChange(MoveState.DOWN)}
        />
        <div className="h-12 w-12" />
      </div>
    </div>
  );
}

type StatsProps = {
  score: number;
  level: number;
  width?: number;
};

function Stats({ score, level, width = 390 }: StatsProps) {
  return (
    <div className="grid grid-cols-2" style={{ width }}>
      <div className="text-lg mb-4 w-[200px]">LEVEL</div>
      <div className="text-lg mb-4 text-right">{level}</div>
      <div className="text-lg mb-4 w-[200px]">SCORE</div>
      <div className="text-lg mb-4 text-right">{score}</div>
    </div>
  );
}

type AwaitingNextLevelProps = {
  score: number;
  level: number;
};

function AwaitingNextLevel({ score, level }: AwaitingNextLevelProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 z-20 m-[10px] mb-[30px]">
      <h1 className="text-5xl mb-4">LEVEL COMPLETE!</h1>
      <Stats score={score} level={level} />
      <p className="absolute bottom-4 text-lg">
        Press play or space for the next level
      </p>
    </div>
  );
}

type DeadProps = {
  score: number;
  level: number;
  isWin: boolean;
};

export function Dead({ score, level, isWin }: DeadProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 z-20 m-[10px] mb-[30px]">
      <h1 className="text-6xl mb-4">{isWin ? "YOU WON!" : "GAME OVER"}</h1>
      <Stats score={score} level={level} width={250} />
      <p className="text-lg mb-4 absolute bottom-0">
        Press play or space to play again
      </p>
    </div>
  );
}

/*function HighScores() {
  const openUrl = useOpenUrl();

  const handleHighScoreClick = (score: Score) => {
    openUrl(`https://basescan.org/tx/${score.transactionHash}`);
  };

  return (
    <div className="flex flex-col items-center justify-center absolute top-32 w-[80%]">
      <h1 className="text-2xl mb-4">RECENT HIGH SCORES</h1>
      {fetchLastAttestations()
        .then(scores => scores?.sort((a: Score, b: Score) => b.score - a.score)
          .map((score: Score, index: number) => (
            <button
              type="button"
              key={score.attestationUid}
              className="flex items-center w-full"
              onClick={() => handleHighScoreClick(score)}
            >
              <span className="text-black w-8">{index + 1}.</span>
              <div className="flex items-center flex-grow">
                <Identity
                  className="!bg-inherit space-x-1 px-0 [&>div]:space-x-2"
                  address={score.address}
                >
                  <Name className="text-black" />
                </Identity>
                <div className="px-2">
                  <ArrowSvg />
                </div>
              </div>
              <div className="text-black text-right flex-grow">{score.score}</div>
            </button>
          )))}
    </div>
  );
}*/

type IntroProps = {
  konami: boolean;
};

function Intro({  }: IntroProps) {
  return (
    <div className="absolute inset-0 flex flex-col items-center bg-white/70 z-20 m-[10px] mb-[30px] pb-6">
      <div className="absolute top-12">
        <BaseLogoHorizontal />
      </div>
      <div className="absolute bottom-4">Press play or space to start</div>
    </div>
  );
}

let msPrev = performance.now();
const useGameLoop = (callback: () => void, dependencies: DependencyList) => {
  useEffect(() => {
    let frameId: number;
    const loop = () => {
      const msNow = performance.now();
      const delta = msNow - msPrev;
      if (delta > MS_PER_FRAME) {
        callback();
        msPrev = msNow - (delta % MS_PER_FRAME);
      }
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...dependencies, callback]);
};

type Bullet = {
  x: number;
  y: number;
};

type Enemy = {
  x: number;
  y: number;
};

const Sammy = () => {
  const gameCanvasRef = useRef<HTMLCanvasElement>(null);
  const mapCanvasRef = useRef<HTMLCanvasElement>(null);
  const sammyCanvasRef = useRef<HTMLCanvasElement>(null);
  const scoreCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const levelRef = useRef(1);

  const [gameState, setGameState] = useState(GameState.INTRO);
  const [level, setLevel] = useState(1);
  const [score, setScore] = useState({ points: 2000, total: 0 });
  const [ship, setShip] = useState({
    x: 250,
    y: SHIP_Y_POSITION,
  });
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [scale, setScale] = useState<number | null>(null);
  const { konami } = useKonami(gameState);

  const moveShip = useCallback((newX: number) => {
    setShip(prev => ({
      ...prev,
      x: Math.max(0, Math.min(500 - SHIP_WIDTH, newX))
    }));
  }, []);

  const getStartingScore = useCallback(
    (level: number, adjust = false) => {
      const startingScore = 2000 + (level - 1) * 500;
      if (adjust) {
        return konami ? startingScore + 1 : startingScore + 2;
      }
      return startingScore;
    },
    [konami],
  );

  const updateGameState = useCallback(() => {
    setGameState((prev) => {
      switch (prev) {
        case GameState.RUNNING:
          return GameState.PAUSED;
        case GameState.PAUSED:
        case GameState.INTRO:
          return GameState.RUNNING;
        case GameState.WON:
        case GameState.DEAD:
          setShip({
            x: 250,
            y: SHIP_Y_POSITION,
          });
          setScore({ points: getStartingScore(1), total: 0 });
          setEnemies([]);
          setBullets([]);
          setLevel(1);
          return GameState.RUNNING;
        case GameState.AWAITINGNEXTLEVEL:
          setShip({
            x: 250,
            y: SHIP_Y_POSITION,
          });
          setScore((prevScore) => ({
            ...prevScore,
            points: getStartingScore(levelRef.current + 1),
          }));
          setEnemies([]);
          setBullets([]);
          setLevel(levelRef.current + 1);
          return GameState.RUNNING;
        default:
          return prev;
      }
    });
  }, [getStartingScore, setGameState]);

  useEffect(() => {
    const handleResize = () => {
      setScale(
        Math.min(
          window.document.body.clientWidth / 520,
          window.document.body.clientHeight / 520,
          1,
        ),
      );
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    levelRef.current = level;
  }, [level]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        updateGameState();
      } else if (e.code === "ArrowLeft") {
        moveShip(ship.x - SHIP_MOVE_SPEED);
      } else if (e.code === "ArrowRight") {
        moveShip(ship.x + SHIP_MOVE_SPEED);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [updateGameState, moveShip, ship.x]);

  const drawMap = useCallback(() => {
    const ctx = mapCanvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, 500, 520);
      ctx.fillStyle = COLORS.white;
      ctx.fillRect(0, 0, 500, 520);
      LevelMaps[level].forEach((wall) => {
        ctx.fillStyle = COLORS.blue;
        ctx.fillRect(wall.x1, wall.y1, wall.width, wall.height);
      });
    }
  }, [level]);

  useEffect(() => {
    if (mapCanvasRef.current) {
      drawMap();
    }
  }, [drawMap, level, scale]);

  const updateGame = useCallback(() => {
    // Move bullets
    setBullets(prev => 
      prev.map(bullet => ({
        ...bullet,
        y: bullet.y - BULLET_SPEED
      })).filter(bullet => bullet.y > 0)
    );

    // Move enemies
    setEnemies(prev =>
      prev.map(enemy => ({
        ...enemy,
        y: enemy.y + ENEMY_SPEED
      })).filter(enemy => enemy.y < 500)
    );

    // Create new bullets
    if (Math.random() < 0.1) {
      setBullets(prev => [...prev, {
        x: ship.x + SHIP_WIDTH / 2,
        y: ship.y
      }]);
    }

    // Create new enemies
    if (Math.random() < 0.02) {
      setEnemies(prev => [...prev, {
        x: Math.random() * (500 - ENEMY_SIZE),
        y: -ENEMY_SIZE
      }]);
    }
  }, [ship.x]);

  const checkCollisions = useCallback(() => {
    // Check bullet-enemy collisions
    bullets.forEach(bullet => {
      enemies.forEach((enemy, enemyIndex) => {
        if (
          bullet.x < enemy.x + ENEMY_SIZE &&
          bullet.x + BULLET_SIZE > enemy.x &&
          bullet.y < enemy.y + ENEMY_SIZE &&
          bullet.y + BULLET_SIZE > enemy.y
        ) {
          // Remove bullet and enemy
          setBullets(prev => prev.filter(b => b !== bullet));
          setEnemies(prev => prev.filter((_, i) => i !== enemyIndex));
          
          // Update score
          setScore(prev => ({
            points: getStartingScore(levelRef.current),
            total: prev.total + prev.points
          }));
        }
      });
    });

    // Check enemy-ship collision
    enemies.forEach(enemy => {
      if (
        ship.x < enemy.x + ENEMY_SIZE &&
        ship.x + SHIP_WIDTH > enemy.x &&
        ship.y < enemy.y + ENEMY_SIZE &&
        ship.y + SHIP_HEIGHT > enemy.y
      ) {
        setGameState(GameState.DEAD);
      }
    });
  }, [bullets, enemies, ship, setGameState, setScore, getStartingScore]);

  const updateScore = useCallback(() => {
    const scoreCtx = scoreCanvasRef.current?.getContext("2d");
    if (scoreCtx) {
      scoreCtx.clearRect(0, 0, 500, 530);
      scoreCtx.font = "20px Pixelify Sans";
      scoreCtx.fillStyle = COLORS.black;
      scoreCtx.fillText(`Score: ${score.total}`, 10, 520);
      scoreCtx.fillText(`Points: ${score.points}`, 200, 520);
      scoreCtx.fillText(`Level: ${level}`, 400, 520);
    }
  }, [level, score]);

  const drawGame = useCallback(() => {
    if (gameState !== GameState.RUNNING) {
      return;
    }

    const ctx = sammyCanvasRef.current?.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, 500, 520);

      // Draw ship
      ctx.fillStyle = COLORS.blue;
      ctx.fillRect(ship.x, ship.y, SHIP_WIDTH, SHIP_HEIGHT);

      // Draw bullets
      ctx.fillStyle = COLORS.black;
      bullets.forEach(bullet => {
        ctx.fillRect(bullet.x, bullet.y, BULLET_SIZE, BULLET_SIZE);
      });

      // Draw enemies as BaseLogo
      enemies.forEach(enemy => {
        const img = new Image();
        img.src = "data:image/svg+xml;base64," + btoa(`
          <svg width="111" height="111" viewBox="0 0 111 111" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M54.921 110.034C85.359 110.034 110.034 85.402 110.034 55.017C110.034 24.6319 85.359 0 54.921 0C26.0432 0 2.35281 22.1714 0 50.3923H72.8467V59.6416H3.9565e-07C2.35281 87.8625 26.0432 110.034 54.921 110.034Z" fill="#0052FF"/>
          </svg>
        `);
        ctx.drawImage(img, enemy.x, enemy.y, ENEMY_SIZE, ENEMY_SIZE);
      });
    }

    updateScore();
  }, [gameState, ship, bullets, enemies, updateScore]);

  useGameLoop(() => {
    if (gameState === GameState.RUNNING) {
      updateGame();
      checkCollisions();
      drawGame();
      setScore((prev) => ({
        ...prev,
        points: Math.max(0, prev.points - (konami ? 1 : 2)),
      }));
    } else if (gameState === GameState.AWAITINGNEXTLEVEL) {
      updateScore();
    }
  }, [gameState, ship, bullets, enemies, score]);

  const overlays = useMemo(() => {
    switch (gameState) {
      case GameState.INTRO:
      case GameState.PAUSED:
        return <Intro konami={konami} />;
      case GameState.WON:
      case GameState.DEAD:
        return (
          <Dead
            score={score.total}
            level={level}
            isWin={gameState === GameState.WON}
          />
        );
      case GameState.AWAITINGNEXTLEVEL:
        return <AwaitingNextLevel score={score.total} level={level} />;
      default:
        return null;
    }
  }, [gameState, konami, level, score.total, setGameState, updateGameState]);

  if (!scale) {
    return (
      <div className="flex flex-col justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="mt-1 mx-2">
      <div
        ref={containerRef}
        className="relative origin-top-left w-[500px] h-[520px]"
        style={{
          transform: `scale(${scale})`,
          marginBottom: `${-520 * (1 - scale)}px`,
        }}
      >
        <canvas
          ref={gameCanvasRef}
          id="gamestate"
          width={500}
          height={500}
          className="absolute top-0 left-0 z-4"
        />
        <canvas
          ref={mapCanvasRef}
          id="map"
          width={500}
          height={500}
          className="absolute top-0 left-0 z-3"
        />
        <canvas
          ref={sammyCanvasRef}
          id="sammy"
          width={500}
          height={500}
          className="absolute top-0 left-0 z-2"
        />
        <canvas
          ref={scoreCanvasRef}
          id="score"
          width={500}
          height={530}
          className="absolute top-0 left-0 z-1"
        />
        {overlays}
      </div>

      <div className="flex mt-6">
        <div className="flex flex-1 justify-center">
          <DPad
            onDirectionChange={(direction: number) => {
              if (direction === MoveState.LEFT) {
                moveShip(ship.x - SHIP_MOVE_SPEED);
              } else if (direction === MoveState.RIGHT) {
                moveShip(ship.x + SHIP_MOVE_SPEED);
              }
            }}
          />
        </div>
        <div className="flex flex-1 relative">
          <ControlButtons
            gameState={gameState}
            handleMobileGameState={updateGameState}
          />
        </div>
      </div>
    </div>
  );
};

export default Sammy;
