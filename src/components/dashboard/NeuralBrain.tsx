"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { createNoise3D } from "simplex-noise";

// Component for a single animated neural connection line
function NeuralLine({ p1, p2, speed, offset }: { p1: THREE.Vector3, p2: THREE.Vector3, speed: number, offset: number }) {
    const matRef = useRef<THREE.LineBasicMaterial>(null!);
    
    const geometry = useMemo(() => {
        return new THREE.BufferGeometry().setFromPoints([p1, p2]);
    }, [p1, p2]);

    useFrame((state) => {
        if (matRef.current) {
            // Animate opacity between 0 and 1 using sin wave
            matRef.current.opacity = Math.max(0, Math.sin(state.clock.elapsedTime * speed + offset));
        }
    });

    return (
        <lineSegments geometry={geometry}>
            <lineBasicMaterial ref={matRef} color="#c8a84b" transparent opacity={0} />
        </lineSegments>
    );
}

export default function NeuralBrain() {
    const groupRef = useRef<THREE.Group>(null!);
    const innerGlowRef = useRef<THREE.Mesh>(null!);

    const { geometry, lines } = useMemo(() => {
        // STEP A: Base organic shape
        const geo = new THREE.SphereGeometry(1.6, 256, 256);
        const noise3D = createNoise3D();
        
        const posAttribute = geo.attributes.position;
        const vertex = new THREE.Vector3();
        
        for (let i = 0; i < posAttribute.count; i++) {
            vertex.fromBufferAttribute(posAttribute, i);
            
            // Normalize direction
            vertex.normalize();
            
            // Multiple octaves of simplex noise
            const n1 = noise3D(vertex.x * 1.2, vertex.y * 1.2, vertex.z * 1.2) * 0.35;
            const n2 = noise3D(vertex.x * 3.0, vertex.y * 3.0, vertex.z * 3.0) * 0.12;
            const n3 = noise3D(vertex.x * 7.0, vertex.y * 7.0, vertex.z * 7.0) * 0.04;
            
            const scalar = 1.6 + n1 + n2 + n3;
            vertex.multiplyScalar(scalar);
            
            posAttribute.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        
        geo.computeVertexNormals();

        // STEP C: Neural spark lines
        const newLines = [];
        const count = posAttribute.count;
        for (let i = 0; i < 25; i++) {
            const idx1 = Math.floor(Math.random() * count);
            const idx2 = Math.floor(Math.random() * count);
            const v1 = new THREE.Vector3().fromBufferAttribute(posAttribute, idx1);
            const v2 = new THREE.Vector3().fromBufferAttribute(posAttribute, idx2);
            newLines.push({
                p1: v1,
                p2: v2,
                speed: 1.0 + Math.random() * 2.0,
                offset: Math.random() * Math.PI * 2
            });
        }

        return { geometry: geo, lines: newLines };
    }, []);

    // STEP D: Brain animation
    useFrame((state) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += 0.004;
        }
        if (innerGlowRef.current) {
            const mat = innerGlowRef.current.material as THREE.MeshStandardMaterial;
            mat.emissiveIntensity = 0.8 + Math.sin(state.clock.elapsedTime * 1.5) * 0.6;
        }
    });

    return (
        <group ref={groupRef}>
            {/* STEP B: Material stack */}
            
            {/* Mesh 1 (inner glow core) */}
            <mesh ref={innerGlowRef} geometry={geometry} scale={[1.08, 1.08, 1.08]}>
                <meshStandardMaterial 
                    color="#1a2a6c"
                    emissive="#2244cc"
                    emissiveIntensity={2}
                    transparent={true}
                    opacity={0.4}
                    side={THREE.BackSide}
                />
            </mesh>

            {/* Mesh 2 (main body) */}
            <mesh geometry={geometry}>
                <meshPhysicalMaterial 
                    color="#8ab4ff"
                    emissive="#1a3080"
                    emissiveIntensity={0.8}
                    metalness={0}
                    roughness={0.1}
                    transmission={0.5}
                    thickness={1.2}
                    transparent={true}
                    opacity={0.55}
                />
            </mesh>

            {/* Mesh 3 (wireframe overlay) */}
            <mesh geometry={geometry}>
                <meshBasicMaterial 
                    color="#4477ff"
                    wireframe={true}
                    transparent={true}
                    opacity={0.25}
                />
            </mesh>

            {/* Neural Spark Lines */}
            {lines.map((line, i) => (
                <NeuralLine key={i} p1={line.p1} p2={line.p2} speed={line.speed} offset={line.offset} />
            ))}
        </group>
    );
}
