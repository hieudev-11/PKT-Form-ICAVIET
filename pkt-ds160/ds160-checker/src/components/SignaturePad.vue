<template>
  <div class="sig-pad">
    <canvas
      ref="canvasRef"
      class="sig-pad-canvas"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @pointerleave="onPointerUp"
    ></canvas>
    <div class="sig-pad-hint" v-if="isEmpty">Ký vào khung này</div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const emit = defineEmits(['change'])

const canvasRef = ref(null)
const isEmpty = ref(true)
let ctx = null
let drawing = false
let lastPoint = null
let resizeObserver = null

function setupCanvas(preserve = true) {
  const canvas = canvasRef.value
  if (!canvas) return
  const rect = canvas.getBoundingClientRect()
  const width = Math.max(1, Math.round(rect.width))
  const height = Math.max(1, Math.round(rect.height))
  const ratio = window.devicePixelRatio || 1

  // Giữ lại nét đã vẽ khi khung bị resize (mở/thu sidebar, đổi zoom...).
  const snapshot = preserve && !isEmpty.value ? canvas.toDataURL('image/png') : ''

  canvas.width = Math.round(width * ratio)
  canvas.height = Math.round(height * ratio)
  ctx = canvas.getContext('2d')
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#111827'

  if (snapshot) {
    const img = new Image()
    img.onload = () => ctx.drawImage(img, 0, 0, width, height)
    img.src = snapshot
  }
}

function pointFrom(event) {
  const rect = canvasRef.value.getBoundingClientRect()
  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

function onPointerDown(event) {
  if (!ctx) setupCanvas()
  drawing = true
  lastPoint = pointFrom(event)
  canvasRef.value.setPointerCapture?.(event.pointerId)
  // Chấm đầu tiên để nét chấm đơn cũng hiện ra.
  ctx.beginPath()
  ctx.arc(lastPoint.x, lastPoint.y, 1, 0, Math.PI * 2)
  ctx.fillStyle = '#111827'
  ctx.fill()
  markDirty()
  event.preventDefault()
}

function onPointerMove(event) {
  if (!drawing || !ctx) return
  const point = pointFrom(event)
  ctx.beginPath()
  ctx.moveTo(lastPoint.x, lastPoint.y)
  ctx.lineTo(point.x, point.y)
  ctx.stroke()
  lastPoint = point
  event.preventDefault()
}

function onPointerUp(event) {
  if (!drawing) return
  drawing = false
  lastPoint = null
  canvasRef.value?.releasePointerCapture?.(event.pointerId)
}

function markDirty() {
  if (isEmpty.value) {
    isEmpty.value = false
    emit('change', false)
  }
}

function clear() {
  if (!ctx) setupCanvas(false)
  const canvas = canvasRef.value
  const ratio = window.devicePixelRatio || 1
  ctx.clearRect(0, 0, canvas.width / ratio, canvas.height / ratio)
  isEmpty.value = true
  emit('change', true)
}

function loadImage(dataUrl) {
  if (!dataUrl) {
    clear()
    return
  }
  if (!ctx) setupCanvas(false)
  const canvas = canvasRef.value
  const ratio = window.devicePixelRatio || 1
  const width = canvas.width / ratio
  const height = canvas.height / ratio
  const img = new Image()
  img.onload = () => {
    ctx.clearRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)
    isEmpty.value = false
    emit('change', false)
  }
  img.src = dataUrl
}

// PNG nền trong suốt để chèn lên phiếu mà không che khung.
function toDataURL() {
  if (isEmpty.value) return ''
  return canvasRef.value?.toDataURL('image/png') || ''
}

onMounted(() => {
  setupCanvas(false)
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => setupCanvas(true))
    resizeObserver.observe(canvasRef.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

// Khung bị ẩn (v-show) có kích thước 0 -> phải đo lại ngay khi hiện ra,
// nếu không canvas chỉ còn 1x1 và nét ký sẽ bị vẽ sai chỗ.
function resize() {
  setupCanvas(false)
  isEmpty.value = true
  emit('change', true)
}

defineExpose({ clear, loadImage, toDataURL, resize, isEmpty })
</script>

<style scoped>
.sig-pad {
  position: relative;
  width: 100%;
}

.sig-pad-canvas {
  display: block;
  width: 100%;
  height: 120px;
  background: #fff;
  border: 1px dashed #94a3b8;
  border-radius: 6px;
  cursor: crosshair;
  touch-action: none;
}

.sig-pad-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: Arial, sans-serif;
  font-size: 13px;
  color: #94a3b8;
  pointer-events: none;
}
</style>
