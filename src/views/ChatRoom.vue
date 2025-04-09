<script setup lang="ts">
import { ref, watch, onMounted, watchEffect, nextTick, onBeforeUnmount } from 'vue'
import dayjs from 'dayjs'
import { useRoute, useRouter } from 'vue-router'
import { useWebSocket } from '@/hooks'
import { get, post } from '@/ajax'
import { ModeEnum, useLoginStore } from '@/stores'
import { getRandomColor, generateColorFromString } from '@/utils'

enum CodeEnum {
  SUCCESS = '00000',
  FAIL = 'A0001'
}

// 约定传参方式
type wsType = {
  type: 'message' | 'ping' | 'tip'
  room: string
  user: string
  msg: string
  code?: CodeEnum
  password?: string
  time?: string
  total?: number
  timestamp?: number
}

// 表情包列表
const emojiList = [
  '😀',
  '😄',
  '😁',
  '😆',
  '😅',
  '😂',
  '🙂',
  '🙃',
  '🫠',
  '😉',
  '😇',
  '🥰',
  '😍',
  '😘',
  '😚',
  '🥲',
  '😋',
  '😛',
  '🤪',
  '🤑',
  '🤗',
  '🤭',
  '🫢',
  '🫣',
  '🤫',
  '🤔',
  '🫡',
  '🤐',
  '🤨',
  '😐',
  '😑',
  '🙄',
  '😬',
  '😌',
  '😔',
  '😪',
  '🤤',
  '😴',
  '😷',
  '🤮',
  '🥵',
  '🥶',
  '😵',
  '😵‍💫',
  '🤯',
  '🥳',
  '🤓',
  '😕',
  '😟',
  '😮',
  '🥺',
  '😨',
  '😭',
  '😱',
  '😡',
  '💀',
  '💩',
  '🤡',
  '👻'
]

const now = dayjs()

const router = useRouter()

const store = useLoginStore()

// 这里ts校验有问题
const { mode, room, password, user } = useRoute().query as any

if (!room || !user) {
  console.log('room', room)
  console.log('user', user)
  console.log(333)

  ElMessage({
    type: 'error',
    message: '房间配置错误！',
    plain: true
  })
  // router.push('home')
}

const { sendMsg, backMsg, closeWs } = useWebSocket<wsType>(true, {
  room: room,
  user: user,
  password: password,
  isAnonymity: mode
})

// 文本框内容
const textarea = ref('')

// 当前房间总人数
const total = ref(0)

// 聊天列表
const messageList = ref<wsType[]>([])

// 滚动到底部锚点
const bottomAnchor = ref<HTMLElement>()

// 参与人员颜色
const userListColor = ref<Record<string, string>>({})

const send = () => {
  if (!textarea.value.trim()) return
  sendMsg({
    type: 'message',
    user,
    room,
    password,
    msg: textarea.value.trim(),
    time: now.format('YYYY-MM-DD HH:mm:ss'),
    timestamp: new Date().getTime()
  })
  textarea.value = ''
}

const keyDown = (e: KeyboardEvent) => {
  if (!e.shiftKey && e.key === 'Enter') {
    e.preventDefault()
    send()
  }
}

const addText = (item: string) => {
  textarea.value += item
}

const leaveRoom = async () => {
  const res = await post('/chat_room/leave', { room, user })
  if (res.successful) {
    ElMessage({
      type: 'success',
      message: '房间退出成功！',
      plain: true
    })
    closeWs()
    if (mode === ModeEnum.ANONYMITY) {
      store.userName = ''
    }
    router.push('home')
  }
}

watch(backMsg, async (nv) => {
  if (!nv) return
  // 成功处理
  if (nv.code === CodeEnum.SUCCESS) {
    // 判断是否为初始化/退出信息

    if (nv.total) total.value = nv.total

    if (!userListColor.value[nv.user]) {
      const string = mode + user + password + room
      const randomColor = generateColorFromString(string)
      // console.log('randomColor', randomColor)
      userListColor.value[nv.user] = randomColor
      // console.log('userListColor', userListColor.value)
    }

    if (nv.type === 'tip') {
      if (nv.msg) {
        ElMessage({
          type: 'success',
          message: nv.msg,
          plain: true
        })
      }
      return
    }
    // 更新
    messageList.value.push(nv)
    if (bottomAnchor.value) {
      await nextTick()
      // 滚动到临时子元素的位置（即滚动到底部）
      bottomAnchor.value.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  } else {
    ElMessage({
      type: 'error',
      message: '房间配置错误！',
      plain: true
    })
    // router.push('home')
    // console.log('执行退出操作')
  }
})

// watch(
//   messageList,
//   (nv) => {
//     console.log('messageList', nv)
//   },
//   { deep: true }
// )

onMounted(() => {
  if (mode === ModeEnum.ANONYMITY) {
    store.mode = mode
    document.documentElement.classList.add('dark')
  }
})

// onBeforeUnmount(() => {
//   console.log('正常退出页面！！！')
// })

// Define your component logic here
</script>

<template>
  <div class="roomContianer">
    <div class="head">
      <el-tooltip content="离开房间" placement="bottom-start">
        <ChatIcon :name="'icon-leave'" size="25px" class="icon" @click="leaveRoom"></ChatIcon>
      </el-tooltip>
      <div>当前房间总人数：{{ total }}</div>
    </div>
    <div class="content">
      <template v-for="item in messageList" :key="item.timestamp">
        <div class="right" v-if="item.user === user">
          <div class="item">
            <div class="msgContent">
              <div class="time">{{ item.time }}</div>
              <div class="msgItem">{{ item.msg }}</div>
            </div>
            <div class="avatar">{{ item.user }}</div>
          </div>
        </div>
        <div class="left" v-else>
          <div class="item">
            <div class="avatar" :style="`background: ${userListColor[item.user]}`">
              {{ item.user }}
            </div>
            <div class="msgContent">
              <div class="time">{{ item.time }}</div>
              <div class="msgItem" :style="`background: ${userListColor[item.user]}`">
                {{ item.msg }}
              </div>
            </div>
          </div>
        </div>
      </template>
      <div class="bottomAnchor" ref="bottomAnchor"></div>
    </div>
    <div class="bottom">
      <div class="operateContainer">
        <el-popover
          trigger="click"
          placement="top-start"
          width="85%"
          popper-style="max-width: 450px"
        >
          <template #reference>
            <ChatIcon :name="'icon-emoji'" size="28px"></ChatIcon>
          </template>
          <template #default>
            <div class="emojiList">
              <div v-for="(item, index) in emojiList" :key="index" @click="() => addText(item)">
                {{ item }}
              </div>
            </div>
          </template>
        </el-popover>
      </div>
      <el-input
        v-model="textarea"
        class="text-input"
        :rows="5"
        type="textarea"
        placeholder="通过shift+回车换行"
        :onkeydown="keyDown"
      />
      <el-button class="bottom-btn" @click="send">发送 (Enter)</el-button>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.icon {
  cursor: pointer;
}
.roomContianer {
  margin: 0 auto;
  max-width: 950px;
  height: 100%;
  display: flex;
  flex-direction: column;
  .head {
    padding: 0 15px;
    height: 55px;
    line-height: 55px;
    border-bottom: 1px solid var(--border-color);
    position: relative;
    & > div {
      position: absolute;
      line-height: 55px;
      right: 15px;
      top: 0;
      font-size: 15.5px;
    }
  }
  .content {
    flex: 1;
    overflow-y: scroll;
    padding: 14px 8px 14px 14px;
    margin: 2px;
    .right {
      justify-content: flex-end;
      width: 100%;
      display: flex;
    }
    .left {
      justify-content: flex-start;
      width: 100%;
      display: flex;
      .msgContent {
        text-align: left !important;
      }
    }
    .item {
      display: flex;
      max-width: 66%;
      margin: 15px 0;
      .msgContent {
        flex: 1;
        margin: 0 9px;
        text-align: right;
        .time {
          font-size: 13px;
        }
        .msgItem {
          text-align: left;
          display: inline-block;
          font-size: 17px;
          background: #007fff;
          padding: 5px;
          border-radius: 5px;
          margin-top: 5px;
          max-width: 100%;
          word-break: break-word;
        }
      }
      .avatar {
        font-size: 17px;
        border-radius: 50%;
        background: #007fff;
        text-align: center;
        overflow: hidden;
        line-height: 40px;
        width: 40px;
        height: 40px;
        position: relative;
        // top: 3px;
      }
    }

    /*定义滚动条高宽及背景高宽分别对应横竖滚动条的尺寸*/
    &::-webkit-scrollbar {
      width: 5px;
      height: 6px;
      // background-color:#F5F5F5;
    }
    //滚动条里面的小方块，能上下左右移动（取决于是垂直滚动条还是水平滚动条）
    &::-webkit-scrollbar-thumb {
      // 宽度无效，由上面的决定
      // width: 5px;
      // -webkit-box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
      // background: linear-gradient(270deg, #64e6c0 0%, #687ff9 100%);
      background: rgba(255, 255, 255, 0.5);
      // 控制右侧间隙，会导致圆角不完整问题
      border-right: 3px solid rgba(255, 255, 255, 0.5);
      /*滚动条里面小方块*/
      border-radius: 513px;
      box-shadow: 8px 0 0 rgba(255, 255, 255, 0.5) inset;
    }
    //滑块的浮动行为
    &::-webkit-scrollbar-thumb:hover {
      // box-shadow: 8px 0 0 #4a4a4a inset;
      cursor: pointer;
    }
    //滚动条的轨道（里面装有thumb）滚动槽
    &::-webkit-scrollbar-track {
      // 无效
      // padding-right: 93px;
      // border-right: 10px solid white;
      /*滚动条里面轨道*/
      // -webkit-box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.2);
      border-radius: 3px;
      // background: #262335;
      // margin: 3px;
    }
    // &::-webkit-scrollbar-corner {
    //   /* 垂直和水平的交叉角 */
    //   background: #262335;
    // }
  }
  .bottom {
    height: 177px;
    border-top: 1px solid var(--border-color);
    position: relative;
    .operateContainer {
      height: 30px;
      padding: 2px 5px;
      box-sizing: border-box;
    }

    :deep(.el-textarea__inner) {
      border: none;
      outline: none;
      resize: none;
      box-shadow: none;
      background: none;
      padding: 2px 5px;
      font-size: 16px;
      &:focus {
        font-size: 16px;
      }
    }
    .bottom-btn {
      position: absolute;
      bottom: 7px;
      right: 7px;
    }
  }
}
.emojiList {
  display: flex;
  flex-wrap: wrap;
  font-size: 20px;
  & > div {
    width: 10%;
    height: 10%;
    margin: 0.5%;
    cursor: pointer;
    text-align: center;
    &:hover {
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 5px;
    }
  }
}
</style>
