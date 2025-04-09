/*
 * @Description: file content
 * @Author: cg
 * @Date: 2024-08-20 17:20:35
 * @LastEditors: cg
 * @LastEditTime: 2025-04-09 15:30:47
 */
import { onMounted, onUnmounted, ref } from 'vue'
import dayjs from 'dayjs'

/**
 *
 * @param isHeart 是否开启心跳检测
 * @param pingConfig ping值中携带的内容
 * @param wsUrl webSocket对应url
 * @returns
 */
export function useWebSocket<T>(isHeart: boolean, pingConfig?: Record<any, any>, wsUrl?: string) {
  let ws: WebSocket | null
  const pingTime = 2000
  let ping: number
  let closeWebSocket = false
  // 重启最高次数
  const maxTime = 10
  const backMsg = ref<T>()
  const initWs = () => {
    ws = new WebSocket(
      wsUrl ?? 'wss://' + location.host + `/${import.meta.env.VITE_PREFIX}` + '/ws/chat'
    )
    // ws = new WebSocket(wsUrl ?? import.meta.env.VITE_WS_URL)
    ws.onopen = () => {
      console.log('WebSocket 连接已建立！')
      if (isHeart) {
        checkHeart()
      }
    }
    ws.onmessage = (event) => {
      backMsg.value = JSON.parse(event.data)
    }
    ws.onerror = function () {
      console.log('链接断开')
      pingHeart()
    }
    ws.onclose = function () {
      console.log('链接断开')
      pingHeart()
    }
  }
  const sendMsg = (msg: T) => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws?.send(JSON.stringify(msg))
    } else {
      console.error('webSocket未连接')
    }
  }
  // 心跳检测
  const checkHeart = () => {
    if (ws?.readyState === WebSocket.OPEN) {
      const now = dayjs()
      ws.send(
        JSON.stringify({
          type: 'init',
          timestamp: new Date().getTime(),
          time: now.format('YYYY-MM-DD HH:mm:ss'),
          ...pingConfig
        })
      )
    }
    clearInterval(ping)
    ping = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'ping', ...pingConfig }))
      }
    }, pingTime)
  }
  // 重复唤醒webSocket
  const pingHeart = () => {
    clearInterval(ping)
    if (!closeWebSocket) {
      ws = null
      let time = 0
      ping = setInterval(() => {
        initWs()
        time++
        if (time === maxTime) clearInterval(ping)
      }, pingTime)
    }
  }
  // 关闭webSocket
  const closeWs = async () => {
    clearInterval(ping)
    closeWebSocket = true
    ws?.close()
  }
  onMounted(() => {
    initWs()
  })
  onUnmounted(() => {
    closeWs()
  })
  return { sendMsg, closeWs, backMsg }
}
