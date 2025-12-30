/* 
webrtc 以外的部分需自行实现
*/

const webSocket = io();
// 聊天区
// TODO 文字聊天文件传输拆分点2

// // 聊天消息输入框
const chatInput = document.getElementById("chat-input");
// 消息区
// const chatZone = document.getElementById("chat-zone");
// 可移动的元素
const moveableEles = document.getElementsByClassName("moveable");
// 远端视频
const remoteVideo = document.getElementById("remote_video");
// 远端文字
const remoteVideoText = document.getElementById("remote_video_text");
// 本地视频容器
const localVideoMoveable = document.getElementById("local_video_moveable");
// 本地视频文字
const localVideoText = document.getElementById("local_video_text");
// 控制区 
const controlsArea = document.getElementById("controls_area");

// TODO 虚化背景/背景替换拆分点2
// 背景图片


// TODO 文字聊天文件传输拆分点3
// 文件传输input

// TODO 录屏拆分点6
// 录制文字

// TODO 桌面流拆分点5


// 处理url判断是否需要密码
const url = window.location.href;
const urlPath = window.location.pathname;
const urlType = urlPath
  .substring(urlPath.indexOf("/") + 1, urlPath.indexOf("/") + 5)
  .toLowerCase();
const urlSuffix = url.substring(url.lastIndexOf("/") + 1).toLowerCase();
let roomHash = urlSuffix;

function suggestPCChrome() {
  if (isIos()) {
    alert("iPhone暂不支持此功能,建议使用pc端Chrome浏览器以体验全部功能");
    return true;
  }
  if (getBrowserName() !== "Chrome") {
    alert("该浏览器暂不支持此功能，建议使用Chrome浏览器以体验全部功能");
    return true;
  }
  return false;
}

// 要求输入密码
function requestPassword() {
  const sessionPassword = sessionStorage.getItem("wrtc");
  if (!sessionPassword) {
    const promptPassword = prompt("请输入密码", "");
    if (promptPassword != null && promptPassword != "") {
      sessionStorage.setItem("wrtc", promptPassword);
      password = promptPassword;
    }
  } else {
    password = sessionPassword;
  }
  roomHash = urlSuffix + password;
}

//将本地视频重新定位到远程视频的左上方
function rePositionLocalVideo() {
  // 安全检查：确保元素存在
  if (!remoteVideo || !localVideoMoveable) {
    console.warn('rePositionLocalVideo: 视频元素未找到');
    return;
  }
  //获取远程视频的位置
  const bounds = remoteVideo.getBoundingClientRect();
  if (isMobile()) {
    localVideoMoveable.style.top = `${
      bounds.top - localVideoMoveable.clientHeight
    }px`;
    localVideoMoveable.style.left = `${bounds.left}px`;
  } else {
    //设置本地视频的位置
    localVideoMoveable.style.top = `${bounds.top}px`;
    localVideoMoveable.style.left = `${
      bounds.left - localVideoMoveable.clientWidth
    }px`;
  }
}

// 开关音频
// TODO 一对一视频通话拆分点2
function toggleAudio() {
 
}

// 开关视频
// TODO 一对一视频通话拆分点3
function toggleVideo() {
  
}

// 开关画中画模式
function togglePictureInPicture() {
  // if (getBrowserName() === "Firefox") {
  //   alert(
  //     "火狐浏览器请使用自带的画中画功能，鼠标悬浮于视频上方可见画中画功能按钮"
  //   );
  //   return;
  // }
  // WRTCEntity.togglePictureInPicture();
}

// 开关屏幕共享模式
// TODO 桌面流拆分点4
function toggleScreen() {
  
}
//TODO 视频质量增强拆分点3
function toggleSR() {
 

  // if (WRTCEntity.WHITEBOARD) {
  //   WRTCEntity.WHITEBOARD.toggleWhiteboard();
  // } else {
  //   alert("您必须建立会话之后才能开启白板功能");
  // }
}
// TODO 文字聊天文件传输拆分点4
// 开关聊天功能
function toggleChat() {
  
}

// TODO 虚化背景/背景替换拆分点3
function replaceBackground(type) {
  
}

// 结束通话
//  TODO 一对一视频通话拆分点7
function endCall() {
  
}

// TODO 文字聊天文件传输拆分点5
//将信息添加到页面上的聊天屏幕
function addMessageToScreen(msg, isOwnMessage) {
  if (!WRTCEntity.DataChanel) {
    alert("请先建立会话后再发送消息");
    return;
  }
  const msgContent = document.createElement("div");
  msgContent.setAttribute("class", "message");
  msgContent.innerHTML = msg;
  const msgItem = document.createElement("div");
  msgItem.appendChild(msgContent);
  if (isOwnMessage) {
    msgItem.setAttribute("class", "message_item message_self");
  } else {
    msgItem.setAttribute("class", "message_item message_peer");
  }
  chatZone.appendChild(msgItem);
}
// TODO 文字聊天文件传输拆分点6
function sendMessage() {
  
}
// TODO 文字聊天文件传输拆分点7
// 监听输入框 键盘 enter
chatInput.addEventListener("keypress", function (event) {
  
});

//当套接字接收到房间已满的消息时调用
function chatRoomFull() {
  alert(
    "聊天室已满。检查以确保您没有多个打开的标签，或者尝试使用新的会议室链接。"
  );
  //退出房间并重定向
  window.locat
  ion.href = "/";
}
// TODO 文字聊天文件传输拆分点9
function clickFileInput() {
  
}

// TODO 文字聊天文件传输拆分点8
function transFile() {
  
}
// TODO 录屏拆分点4
function record() {

}
// 展示背景图片
function showBackground() {
  fadeIn(maskImg);
}

// 隐藏背景图片
function hideBackground() {
  fadeOut(maskImg);
}

function showFps() {
  const stats = new Stats();
  stats.showPanel(0); // 0: fps, 1: ms, 2: mb, 3+: custom
  document.body.appendChild(stats.dom);

  function animate() {
    stats.update();
    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

// TODO 截图拆分点2
function screenshot() {
  
}

// 启动程序
async function bootstrap() {
  urlType === "auth" && requestPassword();
  /* 提示用户共享URL */
  Snackbar.show({
    text: "这是这次通话的加入链接: " + window.location.href,
    actionText: "复制链接",
    actionTextColor: "#f66496",
    pos: "top-center",
    duration: 10000000,
    customClass: "custom_snackbar",
    onActionClick: function (element) {
      const copyInput = document.createElement("input");
      copyInput.value = window.location.href;
      document.body.appendChild(copyInput);
      copyInput.select();
      document.execCommand("copy");
      document.body.removeChild(copyInput);
      Snackbar.close();
    },
  });

  if (getBrowserName() !== "Chrome") {
    remoteVideoText.innerText =
      "正在等待其他用户加入,建议使用PC端Chrome浏览器以体验全部功能";
  }

  rePositionLocalVideo();

  Array.from(moveableEles).forEach((element) => {
    draggable(element);
  });

  setTimeout(() => {
    fadeOut(localVideoText);
  }, 5000);

  webSocket.on("full", chatRoomFull);

  const videoConstraint = isMobile()
    ? { width: 480, height: 480 }
    : { width: 1280, height: 720 };
  // 新建WRTC实例  封装了WebRTC联通过程
  window.WRTCEntity = new WRTC({
    socket: webSocket,
    room: roomHash,
    localVideoId: "local_video",
    remoteVideoId: "remote_video",
    backgroundCanvasId: "local_canvas",
    vsrCanvasId: "remote_canvas",
    modelUrl: "http://localhost:8000/SESR2_m5_x2_1_tfjs/model.json",
    maskImg: document.getElementById("maskImg"),
    mediaConstraint: { audio: true, video: videoConstraint },
    iceServers: [
      { urls: "stun:8.210.95.88:3478" },
      {
        urls: "turn:8.210.95.88:3478",
        username: "lqf",
        credential: "123456",
      },
    ],
  });

  // 监听消息接收事件
  WRTCEntity.onRecieveMessage = (msg) => {
    addMessageToScreen(msg, false);
    chatZone.scrollTop = chatZone.scrollHeight;
    if (entireChat.style.display === "none") {
      toggleChat();
    }
  };

  // 监听消息接收事件
  WRTCEntity.onRecieveFile = ({ url, fileName }) => {
    const msg = `<a href=${url} download=${fileName} >${fileName}</a>`;
    addMessageToScreen(msg);
    chatZone.scrollTop = chatZone.scrollHeight;
    if (entireChat.style.display === "none") {
      toggleChat();
    }
  };
  // 监听track事件
  WRTCEntity.onTrack = (msg) => {
    Snackbar.close();
    fadeOut(remoteVideoText);
  };

  WRTCEntity.onGetDisplayMedia = () => {
    shareScreenText.textContent = "停止共享";
  };

  WRTCEntity.onGetUserMediaError = (error) => {
    console.error('获取摄像头失败:', error);
    alert('无法获取摄像头，请检查：\n1. 是否授予了摄像头权限\n2. 摄像头是否被其他程序占用\n3. 浏览器是否支持WebRTC');
    Snackbar.show({
      text: '无法获取摄像头权限，请刷新页面重试',
      pos: 'top-center',
      duration: 5000,
    });
  };

  // !isMobile() && showFps();
}

bootstrap();
