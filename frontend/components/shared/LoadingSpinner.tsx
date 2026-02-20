'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import styled, { keyframes } from 'styled-components';

// ── animations ────────────────────────────────────────────────────────────────
const upNDown = keyframes`
  0%, 49% { transform: translateY(0px); }
  50%, 100% { transform: translateY(-10px); }
`;

const flicker0 = keyframes`
  0%, 49%  { background-color: #6366f1; }
  50%, 100% { background-color: transparent; }
`;

const flicker1 = keyframes`
  0%, 49%  { background-color: transparent; }
  50%, 100% { background-color: #6366f1; }
`;

const eyesMovement = keyframes`
  0%, 49%  { transform: translateX(0px); }
  50%, 99% { transform: translateX(10px); }
  100%     { transform: translateX(0px); }
`;

const shadowMovement = keyframes`
  0%, 49%  { opacity: 0.4; }
  50%, 100% { opacity: 0.15; }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to   { opacity: 1; }
`;

const fadeOut = keyframes`
  from { opacity: 1; }
  to   { opacity: 0; }
`;

// ── styled components ─────────────────────────────────────────────────────────
const Overlay = styled.div<{ $leaving: boolean }>`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  background: radial-gradient(circle at 30% 40%, #111827, #0B1220);
  animation: ${({ $leaving }) => ($leaving ? fadeOut : fadeIn)} 0.3s ease forwards;
  pointer-events: all;
`;

const Label = styled.p`
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #6366f1;
  opacity: 0.8;
`;

const Ghost = styled.div`
  position: relative;
  transform: scale(1);
`;

const GhostBody = styled.div`
  animation: ${upNDown} 0.5s infinite;
  position: relative;
  width: 140px;
  height: 140px;
  display: grid;
  grid-template-columns: repeat(14, 1fr);
  grid-template-rows: repeat(14, 1fr);
  grid-column-gap: 0px;
  grid-row-gap: 0px;
  grid-template-areas:
    "a1  a2  a3  a4  a5  top0  top0  top0  top0  a10 a11 a12 a13 a14"
    "b1  b2  b3  top1 top1 top1 top1 top1 top1 top1 top1 b12 b13 b14"
    "c1 c2 top2 top2 top2 top2 top2 top2 top2 top2 top2 top2 c13 c14"
    "d1 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 d14"
    "e1 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 e14"
    "f1 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 top3 f14"
    "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
    "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
    "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
    "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
    "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
    "top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4 top4"
    "st0 st0 an4 st1 an7 st2 an10 an10 st3 an13 st4 an16 st5 st5"
    "an1 an2 an3 an5 an6 an8 an9 an9 an11 an12 an14 an15 an17 an18";

  #top0 { grid-area: top0; background-color: #6366f1; }
  #top1 { grid-area: top1; background-color: #6366f1; }
  #top2 { grid-area: top2; background-color: #6366f1; }
  #top3 { grid-area: top3; background-color: #6366f1; }
  #top4 { grid-area: top4; background-color: #6366f1; }
  #st0  { grid-area: st0;  background-color: #6366f1; }
  #st1  { grid-area: st1;  background-color: #6366f1; }
  #st2  { grid-area: st2;  background-color: #6366f1; }
  #st3  { grid-area: st3;  background-color: #6366f1; }
  #st4  { grid-area: st4;  background-color: #6366f1; }
  #st5  { grid-area: st5;  background-color: #6366f1; }

  #an1  { grid-area: an1;  animation: ${flicker0} 0.5s infinite; }
  #an18 { grid-area: an18; animation: ${flicker0} 0.5s infinite; }
  #an6  { grid-area: an6;  animation: ${flicker0} 0.5s infinite; }
  #an12 { grid-area: an12; animation: ${flicker0} 0.5s infinite; }
  #an7  { grid-area: an7;  animation: ${flicker0} 0.5s infinite; }
  #an13 { grid-area: an13; animation: ${flicker0} 0.5s infinite; }
  #an8  { grid-area: an8;  animation: ${flicker0} 0.5s infinite; }
  #an11 { grid-area: an11; animation: ${flicker0} 0.5s infinite; }

  #an2  { grid-area: an2;  animation: ${flicker1} 0.5s infinite; }
  #an17 { grid-area: an17; animation: ${flicker1} 0.5s infinite; }
  #an3  { grid-area: an3;  animation: ${flicker1} 0.5s infinite; }
  #an16 { grid-area: an16; animation: ${flicker1} 0.5s infinite; }
  #an4  { grid-area: an4;  animation: ${flicker1} 0.5s infinite; }
  #an15 { grid-area: an15; animation: ${flicker1} 0.5s infinite; }
  #an9  { grid-area: an9;  animation: ${flicker1} 0.5s infinite; }
  #an10 { grid-area: an10; animation: ${flicker1} 0.5s infinite; }

  #an5  { grid-area: an5; }
  #an14 { grid-area: an14; }
`;

const Eye = styled.div<{ $side: 'left' | 'right' }>`
  width: 40px;
  height: 50px;
  position: absolute;
  top: 30px;
  ${({ $side }) => $side === 'left' ? 'left: 10px;' : 'right: 30px;'}

  &::before {
    content: "";
    background-color: white;
    width: 20px;
    height: 50px;
    transform: translateX(10px);
    display: block;
    position: absolute;
  }

  &::after {
    content: "";
    background-color: white;
    width: 40px;
    height: 30px;
    transform: translateY(10px);
    display: block;
    position: absolute;
  }
`;

const Pupil = styled.div<{ $side: 'left' | 'right' }>`
  width: 20px;
  height: 20px;
  background-color: #818cf8;
  position: absolute;
  top: 50px;
  ${({ $side }) => $side === 'left' ? 'left: 10px;' : 'right: 50px;'}
  z-index: 1;
  animation: ${eyesMovement} 3s infinite;
`;

const Shadow = styled.div`
  background-color: #6366f1;
  width: 140px;
  height: 140px;
  position: absolute;
  border-radius: 50%;
  transform: rotateX(80deg);
  filter: blur(20px);
  top: 80%;
  animation: ${shadowMovement} 0.5s infinite;
  opacity: 0.3;
`;

// ── ghost visual ──────────────────────────────────────────────────────────────
function GhostLoader() {
  return (
    <Ghost>
      <GhostBody>
        <Pupil $side="left" />
        <Pupil $side="right" />
        <Eye $side="left" />
        <Eye $side="right" />
        <div id="top0" /><div id="top1" /><div id="top2" />
        <div id="top3" /><div id="top4" />
        <div id="st0" /><div id="st1" /><div id="st2" />
        <div id="st3" /><div id="st4" /><div id="st5" />
        <div id="an1" /><div id="an2" /><div id="an3" />
        <div id="an4" /><div id="an5" /><div id="an6" />
        <div id="an7" /><div id="an8" /><div id="an9" />
        <div id="an10" /><div id="an11" /><div id="an12" />
        <div id="an13" /><div id="an14" /><div id="an15" />
        <div id="an16" /><div id="an17" /><div id="an18" />
      </GhostBody>
      <Shadow />
    </Ghost>
  );
}

// ── overlay ───────────────────────────────────────────────────────────────────
function LoadingOverlay({ leaving }: { leaving: boolean }) {
  return (
    <Overlay $leaving={leaving}>
      <GhostLoader />
      <Label>Loading…</Label>
    </Overlay>
  );
}

// ── inner: watches route + search param changes ───────────────────────────────
// Must be inside <Suspense> because useSearchParams() suspends
function NavigationWatcher({ onStart, onEnd }: { onStart: () => void; onEnd: () => void }) {
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const key          = `${pathname}?${searchParams.toString()}`;
  const prevKey      = useRef<string | null>(null);
  const endTimer     = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (prevKey.current === null) {
      prevKey.current = key;
      return;
    }
    if (prevKey.current === key) return;
    prevKey.current = key;

    // Clear any pending end timer from a previous fast navigation
    if (endTimer.current) clearTimeout(endTimer.current);

    // All setState calls are deferred — no synchronous setState in effect body
    const t = setTimeout(() => {
      onStart();
      endTimer.current = setTimeout(onEnd, 700);
    }, 0);

    return () => {
      clearTimeout(t);
      if (endTimer.current) clearTimeout(endTimer.current);
    };
  }, [key, onStart, onEnd]);

  return null;
}

// ── detect client mount without useEffect ────────────────────────────────────
// useSyncExternalStore returns the server snapshot ('false') during SSR,
// and the client snapshot ('true') after hydration — no setState, no effect needed.
const noop = () => () => {};
function useIsClient() {
  return useSyncExternalStore(noop, () => true, () => false);
}

// ── public component ──────────────────────────────────────────────────────────
export default function LoadingSpinner() {
  const isClient = useIsClient();
  const [phase, setPhase] = useState<'hidden' | 'showing' | 'leaving'>('hidden');

  // Runs only on the client, only once — all setState calls are inside setTimeout
  // so none are synchronous in the effect body (lint-safe).
  useEffect(() => {
    const showTimer   = setTimeout(() => setPhase('showing'), 0);
    const leaveTimer  = setTimeout(() => setPhase('leaving'), 700);
    const removeTimer = setTimeout(() => setPhase('hidden'),  1000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(leaveTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  const handleStart = useCallback(() => setPhase('showing'), []);
  const handleEnd   = useCallback(() => {
    setPhase('leaving');
    setTimeout(() => setPhase('hidden'), 300);
  }, []);

  // SSR / pre-hydration: render nothing so styled-components never flashes
  if (!isClient) return null;

  return (
    <>
      <Suspense fallback={null}>
        <NavigationWatcher onStart={handleStart} onEnd={handleEnd} />
      </Suspense>

      {phase !== 'hidden' && <LoadingOverlay leaving={phase === 'leaving'} />}
    </>
  );
}