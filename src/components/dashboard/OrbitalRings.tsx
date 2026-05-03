"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function Particles({ radiusX, radiusY, count }: { radiusX: number, radiusY: number, count: number }) {
    const positions = useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            const t = Math.random() * Math.PI * 2;
            const jitterX = (Math.random() - 0.5) * 0.15;
            const jitterY = (Math.random() - 0.5) * 0.08;
            const jitterZ = (Math.random() - 0.5) * 0.15;

            pos[i * 3] = Math.cos(t) * radiusX + jitterX;
            pos[i * 3 + 1] = jitterY; // Y is up
            pos[i * 3 + 2] = Math.sin(t) * radiusY + jitterZ;
        }
        return pos;
    }, [radiusX, radiusY, count]);

    return (
        <points>
            <bufferGeometry>
                <bufferAttribute attach="attributes-position" count={count} args={[positions, 3]} />
            </bufferGeometry>
            <pointsMaterial size={0.02} color="#ffffff" transparent opacity={0.6} sizeAttenuation />
        </points>
    );
}

function OrbitalRing({ radiusX, radiusY, tubeRadius, color, rotationOffset = 0 }: any) {
    const groupRef = useRef<THREE.Group>(null!);
    
    const geometry = useMemo(() => {
        const points = [];
        for (let i = 0; i <= 200; i++) {
            const t = (i / 200) * Math.PI * 2;
            points.push(new THREE.Vector3(
                Math.cos(t) * radiusX,
                0,
                Math.sin(t) * radiusY  // radiusY < radiusX makes it an ellipse
            ));
        }
        const curve = new THREE.CatmullRomCurve3(points, true);
        return new THREE.TubeGeometry(curve, 300, tubeRadius, 8, true);
    }, [radiusX, radiusY, tubeRadius]);

    useFrame(() => {
        if (groupRef.current) {
            groupRef.current.rotation.y += 0.002;
        }
    });

    return (
        <group ref={groupRef} rotation={[0, rotationOffset, 0]}>
            <mesh geometry={geometry}>
                <meshStandardMaterial 
                    color={color} 
                    emissive={color} 
                    emissiveIntensity={3} 
                    toneMapped={false}
                />
            </mesh>
            <Particles radiusX={radiusX} radiusY={radiusY} count={150} />
        </group>
    );
}

export default function OrbitalRings() {
    return (
        <group>
            {/* The exact values provided by the user */}
            <OrbitalRing radiusX={5.5} radiusY={1.8} tubeRadius={0.018} color="#c8a84b" rotationOffset={0} />
            <OrbitalRing radiusX={4.5} radiusY={1.5} tubeRadius={0.014} color="#b8942a" rotationOffset={0.2} />
            <OrbitalRing radiusX={3.5} radiusY={1.2} tubeRadius={0.016} color="#c8a84b" rotationOffset={0.4} />
            <OrbitalRing radiusX={6.5} radiusY={2.1} tubeRadius={0.010} color="#a07020" rotationOffset={-0.1} />
        </group>
    );
}
