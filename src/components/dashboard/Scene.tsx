"use client";

import { Canvas } from "@react-three/fiber";
import { Sparkles, OrbitControls, Environment } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import StarField from "./StarField";
import OrbitalRings from "./OrbitalRings";
import NeuralBrain from "./NeuralBrain";

export default function Scene() {
    return (
        <Canvas 
            camera={{ position: [0, 6, 10], fov: 50 }}
            gl={{ antialias: true, alpha: true }}
            style={{ background: 'transparent' }} // Let the CSS gradient show through
        >
            <OrbitControls target={[0, 0, 0]} enablePan={false} enableZoom={false} enableRotate={false} makeDefault />
            
            <StarField />
            <OrbitalRings />
            <NeuralBrain />
            <Sparkles count={80} scale={6} size={1.5} speed={0.3} color="#c8a84b" />
            <Environment preset="city" />
            
            <EffectComposer>
                <Bloom intensity={1.8} luminanceThreshold={0.1} luminanceSmoothing={0.9} />
            </EffectComposer>
            
            <ambientLight intensity={0.2} />
            <pointLight position={[0, 0, 0]} intensity={2} color="#4488ff" />
        </Canvas>
    );
}
