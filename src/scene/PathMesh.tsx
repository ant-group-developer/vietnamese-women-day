import { useMemo } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { layout, PATH_Y } from './path'
import { groundRuns, PATH_HALF_WIDTH, route, wrapU } from './route'

const UP = new THREE.Vector3(0, 1, 0)
/** Nửa bề rộng mặt đường (phần kem bên trong viền). */
const ROAD_HALF_WIDTH = 0.78

/** Dải mặt phẳng ôm theo đoạn [u0, u1] của đường đi, giữ độ cao từng điểm (đảo phụ cao thấp khác nhau). */
function ribbonGeometry(u0: number, u1: number, width: number, lift: number) {
  const segments = Math.max(4, Math.round(((u1 - u0) * route.length) / 0.12))
  const positions: number[] = []
  const indices: number[] = []
  const normal = new THREE.Vector3()
  const p = new THREE.Vector3()
  const tangent = new THREE.Vector3()
  for (let i = 0; i <= segments; i++) {
    const u = wrapU(u0 + ((u1 - u0) * i) / segments)
    route.curve.getPointAt(u, p)
    route.curve.getTangentAt(u, tangent).setY(0).normalize()
    normal.crossVectors(UP, tangent).normalize()
    const y = p.y - PATH_Y + lift
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

/** Toàn bộ đường đi trên mặt đất (đảo chính và đảo phụ, trừ cầu) vẽ liền một dải cùng bề rộng. */
export function PathMesh() {
  const [border, road, dots] = useMemo(() => {
    const border = mergeGeometries(groundRuns.map(([u0, u1]) => ribbonGeometry(u0, u1, PATH_HALF_WIDTH, 0.03)))
    const road = mergeGeometries(groundRuns.map(([u0, u1]) => ribbonGeometry(u0, u1, ROAD_HALF_WIDTH, 0.05)))
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
      {/* Chấm tròn dọc đường chính cho vui mắt */}
      {dots.map((p, i) => (
        <mesh key={i} position={[p.x, 0.07, p.z]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.14, 20]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#ffb3c6' : '#ffd166'} />
        </mesh>
      ))}
    </group>
  )
}
