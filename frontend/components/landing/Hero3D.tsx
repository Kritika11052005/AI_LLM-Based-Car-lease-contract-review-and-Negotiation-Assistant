/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useRef, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Environment } from '@react-three/drei';
import { motion, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Upload, Play, Sparkles } from 'lucide-react';
import { BackgroundBeams } from '../ui/background-beams';
import { TypewriterEffectSmooth } from '../ui/typewriter-effect';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import * as THREE from 'three';

const CAR_CONFIG = {
  scale: 55,
  positionY: -0.5,
  cameraDistance: 3,
  cameraHeight: 1,
  cameraFOV: 60,
};

function CarModel() {
  const gltf = useGLTF('/models/car.glb');

  return (
    <primitive
      object={gltf.scene}
      scale={CAR_CONFIG.scale}
      position={[0, CAR_CONFIG.positionY, 0]}
      rotation={[0, 0, 0]}
    />
  );
}

function CameraRig() {
  useFrame(({ camera, clock }) => {
    const time = clock.getElapsedTime() * 0.2;
    const radius = CAR_CONFIG.cameraDistance;

    camera.position.x = Math.sin(time) * radius;
    camera.position.z = Math.cos(time) * radius;
    camera.position.y = CAR_CONFIG.cameraHeight;

    camera.lookAt(0, CAR_CONFIG.positionY, 0);
  });

  return null;
}

function Counter({ end, suffix = '', prefix = '', label }: { end: number; suffix?: string; prefix?: string; label: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (inView) {
      let start = 0;
      const duration = 2000;
      const increment = end / (duration / 16);

      const timer = setInterval(() => {
        start += increment;
        if (start >= end) {
          setCount(end);
          clearInterval(timer);
        } else {
          setCount(Math.floor(start));
        }
      }, 16);

      return () => clearInterval(timer);
    }
  }, [inView, end]);

  return (
    <div ref={ref}>
      <div className="text-3xl font-bold text-foreground">
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export default function Hero() {
  const [key, setKey] = useState(0);
  const [showLine2, setShowLine2] = useState(false);
  const router = useRouter();
  const { user } = useAuth();
  // Split into two lines for better fit
  const line1 = [
    { text: "Stop" },
    { text: "Paying" },
    { text: "for" },
    { text: "Fees" },
  ];

  const line2 = [
    { text: "You" },
    { text: "Never" },
    { text: "Saw" },
    { text: "Coming", className: "text-primary dark:text-primary" },
  ];

  useEffect(() => {
    // Show line 2 after line 1 completes (estimate ~2 seconds for 4 words)
    const line1Timer = setTimeout(() => {
      setShowLine2(true);
    }, 2000);

    // Reset entire animation every 8 seconds (5 seconds after completion)
    const resetTimer = setTimeout(() => {
      setShowLine2(false);
      setKey(prevKey => prevKey + 1);
    }, 8000);

    return () => {
      clearTimeout(line1Timer);
      clearTimeout(resetTimer);
    };
  }, [key]);

  return (
    <section className="relative min-h-screen flex items-center pt-32 pb-20 px-4 overflow-hidden bg-neutral-950">
      {/* Background Beams Effect */}
      <BackgroundBeams />

      {/* Additional Gradient glows on top of beams */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary rounded-full blur-[128px] opacity-20" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary rounded-full blur-[128px] opacity-10" />
      </div>

      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left side - Text content */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="order-2 lg:order-1"
        >
          {/* Badge */}
          <motion.div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 backdrop-blur-sm"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">AI-Powered Contract Analysis</span>
          </motion.div>

          {/* Typewriter Effect Heading - Sequential Lines */}
          <div className="mb-6">
            <div key={`line1-${key}`}>
              <TypewriterEffectSmooth words={line1} />
            </div>
            {showLine2 && (
              <div key={`line2-${key}`}>
                <TypewriterEffectSmooth words={line2} />
              </div>
            )}
          </div>

          <motion.p
            className="text-xl text-muted-foreground mb-8 max-w-xl leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
          >
            Upload your car lease contract and let AI uncover hidden fees, unfair terms,
            and negotiation opportunities in seconds.
          </motion.p>

          <motion.div
            className="flex flex-wrap gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                className="bg-primary hover:bg-primary/80 text-primary-foreground px-8 py-6 text-lg relative group overflow-hidden"
                onClick={() => router.push(user ? '/dashboard/upload' : '/login')}
              >
                <Upload className="mr-2" />
                <span className="relative z-10">Analyze My Contract</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                size="lg"
                variant="outline"
                className="border-primary/30 text-foreground hover:bg-primary/10 px-8 py-6 text-lg backdrop-blur-sm"
              >
                <Play className="mr-2" />
                See How It Works
              </Button>
            </motion.div>
          </motion.div>

          {/* Stats with Counting Animation */}
          <motion.div
            className="mt-12 grid grid-cols-3 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Counter end={2400} prefix="$" label="Avg. Savings" />
            <Counter end={94} suffix="%" label="Success Rate" />
            <Counter end={10} suffix="K+" label="Analyzed" />
          </motion.div>
        </motion.div>

        {/* Right side - 3D Car Model */}
        <motion.div
          className="relative h-[500px] lg:h-[600px] order-1 lg:order-2"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.4 }}
        >
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <Canvas camera={{ position: [CAR_CONFIG.cameraDistance, CAR_CONFIG.cameraHeight, CAR_CONFIG.cameraDistance], fov: CAR_CONFIG.cameraFOV }}>
              <Suspense fallback={null}>
                {/* Lighting */}
                <ambientLight intensity={0.6} />
                <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
                <spotLight position={[-5, 10, 0]} angle={0.4} penumbra={1} intensity={1} />
                <pointLight position={[5, 2, 5]} intensity={1} color="#2563eb" />
                <pointLight position={[-5, 2, -5]} intensity={0.8} color="#00d4a8" />

                <Environment preset="city" />
                <CarModel />
                <CameraRig />
              </Suspense>
            </Canvas>
          </div>

          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-secondary/20 blur-3xl -z-10" />
        </motion.div>
      </div>
    </section>
  );
}

// Preload the GLB model
useGLTF.preload('/models/car.glb');