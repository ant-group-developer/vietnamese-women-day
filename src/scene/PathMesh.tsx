import { useMemo } from 'react'
import * as THREE from 'three'
import { layout } from './path'

const UP = new THREE.Vector3(0, 1, 0)

/** Tạo dải mặt phẳng ôm theo đường cong. */
function ribbonGeometry(curve: THREE.CatmullRomCurve3, width: number, y: number, segments = 600) {
  const positions: number[] = []
  const indices: number[] = []
  const normal = new THREE.Vector3()
  for (let i = 0; i <= segments; i++) {
    const u = i / segments
    const p = curve.getPointAt(u)
    const tangent = curve.getTangentAt(u)
    normal.crossVectors(UP, tangent).normalize()
    positions.push(p.x + normal.x * width, y, p.z + normal.z * width)
    positions.push(p.x - normal.x * width, y, p.z - normal.z * width)
    if (i < segments) {
      const a = i * 2
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  return geo
}

export function PathMesh() {
  const [border, road, dots] = useMemo(() => {
    const border = ribbonGeometry(layout.curve, 1.0, 0.03)
    const road = ribbonGeometry(layout.curve, 0.78, 0.05)
    const dots = layout.curve.getSpacedPoints(Math.round(layout.length / 1.2))
    return [border, road, dots]
  }, [])

  return (
    <group>
      <mesh geometry={border} receiveShadow>
        <meshStandardMaterial color="#f3c7a6" side={THREE.DoubleSide} />
      </mesh>
      <mesh geometry={road} receiveShadow>
        <meshStandardMaterial color="#fff2dc" side={THREE.DoubleSide} />
      </mesh>
      {/* Chấm tròn dọc đường cho vui mắt */}
      {dots.map((p, i) => (
        <mesh key={i} position={[p.x, 0.07, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.14, 10]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#ffb3c6' : '#ffd166'} />
        </mesh>
      ))}
    </group>
  )
}
