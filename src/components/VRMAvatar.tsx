'use client';

import { useEffect, useRef } from 'react';
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

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xffffff);

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
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    rendererRef.current = renderer;
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);

    // Lights
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Load VRM
    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    loader.load(
      '/models/AvatarSample_A.vrm',
      (gltf) => {
        const vrm = gltf.userData.vrm as VRM;
        vrmRef.current = vrm;
        scene.add(vrm.scene);

        console.log('[VRM] Model loaded successfully');
        console.log('[VRM] Available expressions:', vrm.expressionManager?.expressionMap);
      },
      (progress) => {
        console.log('[VRM] Loading:', (progress.loaded / progress.total) * 100, '%');
      },
      (error) => {
        console.error('[VRM] Error loading model:', error);
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
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // Lip sync based on audio level
  useEffect(() => {
    if (!vrmRef.current?.expressionManager) return;

    const expressionManager = vrmRef.current.expressionManager;

    if (isAISpeaking && audioLevel > 0.02) {
      // Simple lip sync: alternate between visemes based on audio level
      const time = Date.now() / 100;
      const visemes = ['aa', 'ih', 'ou', 'ee', 'oh'] as VRMExpressionPresetName[];
      const visemeIndex = Math.floor(time * audioLevel * 10) % visemes.length;
      const currentViseme = visemes[visemeIndex];

      // Reset all visemes
      visemes.forEach(v => {
        expressionManager.setValue(v, 0);
      });

      // Set current viseme
      expressionManager.setValue(currentViseme, Math.min(audioLevel * 2, 1));
    } else {
      // Reset to neutral
      ['aa', 'ih', 'ou', 'ee', 'oh'].forEach(v => {
        expressionManager.setValue(v as VRMExpressionPresetName, 0);
      });
    }
  }, [audioLevel, isAISpeaking]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: '400px' }}
    />
  );
}
