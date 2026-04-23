'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { VRM, VRMLoaderPlugin, VRMExpressionPresetName } from '@pixiv/three-vrm';

interface VRMAvatarProps {
  audioLevel: number;
  isAISpeaking: boolean;
}

export default function VRMAvatar({ audioLevel, isAISpeaking }: VRMAvatarProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const vrmRef = useRef<VRM | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    console.log('[VRM] Initializing scene...');

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf8fafc);

    // Camera
    const camera = new THREE.PerspectiveCamera(
      30,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      20
    );
    camera.position.set(0, 1.3, 1.5);
    camera.lookAt(0, 1.3, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    rendererRef.current = renderer;
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Lights
    const light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Load VRM - use relative path that works with i18n routing
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const vrmPath = '/models/AvatarSample_A.vrm';
    console.log('[VRM] Loading model from:', vrmPath);

    loader.load(
      vrmPath,
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        vrmRef.current = vrm;
        scene.add(vrm.scene);

        console.log('[VRM] Model loaded successfully!');
        console.log('[VRM] Available expressions:', Object.keys(vrm.expressionManager?.expressionMap || {}));
        setIsLoading(false);
      },
      (progress) => {
        const percent = (progress.loaded / progress.total) * 100;
        console.log('[VRM] Loading progress:', percent.toFixed(1), '%');
      },
      (error) => {
        console.error('[VRM] Error loading model:', error);
        setLoadError('Failed to load avatar');
        setIsLoading(false);
      }
    );

    // Animation loop
    const clock = new THREE.Clock();
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      const deltaTime = clock.getDelta();

      if (vrmRef.current) {
        vrmRef.current.update(deltaTime);
      }

      renderer.render(scene, camera);
    };
    animate();

    // Handle resize
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (rendererRef.current && containerRef.current && containerRef.current.contains(rendererRef.current.domElement)) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Lip sync and expressions based on audio level
  useEffect(() => {
    if (!vrmRef.current?.expressionManager) return;

    const expressionManager = vrmRef.current.expressionManager;

    console.log('[VRM] Animation update - isAISpeaking:', isAISpeaking, 'audioLevel:', audioLevel);

    if (isAISpeaking && audioLevel > 0.01) {
      // AI is speaking - animate mouth with visemes
      const time = Date.now() / 80;
      const visemes = ['aa', 'ih', 'ou', 'ee', 'oh'] as VRMExpressionPresetName[];
      const visemeIndex = Math.floor(time * Math.max(audioLevel * 10, 1)) % visemes.length;
      const currentViseme = visemes[visemeIndex];

      // Reset all expressions
      ['aa', 'ih', 'ou', 'ee', 'oh', 'happy', 'angry', 'sad', 'relaxed', 'surprised', 'neutral'].forEach(v => {
        expressionManager.setValue(v as VRMExpressionPresetName, 0);
      });

      // Set current viseme with stronger intensity
      const intensity = Math.min(audioLevel * 3, 1);
      expressionManager.setValue(currentViseme, intensity);

      // Add slight happy expression when speaking
      expressionManager.setValue('happy', 0.2);

      console.log('[VRM] AI speaking - viseme:', currentViseme, 'intensity:', intensity);
    } else if (!isAISpeaking && audioLevel > 0.01) {
      // User is speaking - show attentive/listening expression
      ['aa', 'ih', 'ou', 'ee', 'oh', 'angry', 'sad', 'surprised'].forEach(v => {
        expressionManager.setValue(v as VRMExpressionPresetName, 0);
      });

      expressionManager.setValue('relaxed', 0.4);
      expressionManager.setValue('happy', 0.2);

      console.log('[VRM] User speaking - attentive expression');
    } else {
      // Idle - neutral with slight happy expression
      ['aa', 'ih', 'ou', 'ee', 'oh', 'angry', 'sad', 'surprised'].forEach(v => {
        expressionManager.setValue(v as VRMExpressionPresetName, 0);
      });

      expressionManager.setValue('neutral', 0.3);
      expressionManager.setValue('happy', 0.1);
    }
  }, [audioLevel, isAISpeaking]);

  // Add blinking animation
  useEffect(() => {
    if (!vrmRef.current?.expressionManager) return;

    const blinkInterval = setInterval(() => {
      const expressionManager = vrmRef.current?.expressionManager;
      if (!expressionManager) return;

      // Blink animation
      expressionManager.setValue('blink', 1);
      setTimeout(() => {
        expressionManager?.setValue('blink', 0);
      }, 150);
    }, 3000 + Math.random() * 2000); // Random blink every 3-5 seconds

    return () => clearInterval(blinkInterval);
  }, []);

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-stem-50">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-accent-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p className="text-sm text-stem-600 font-medium">Loading avatar...</p>
          </div>
        </div>
      )}

      {loadError && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50">
          <p className="text-sm text-red-600 font-medium">{loadError}</p>
        </div>
      )}
    </div>
  );
}
