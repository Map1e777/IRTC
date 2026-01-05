/* 
webrtc 以外的部分需自行实现
*/

const webSocket = io();
// 聊天区
// TODO 文字聊天文件传输拆分点2
const entireChat = document.getElementById("chat");
// // 聊天消息输入框
const chatInput = document.getElementById("chat-input");
// 消息区
const chatZone = document.getElementById("chat-zone");
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
const maskImg = document.getElementById("maskImg");

// TODO 文字聊天文件传输拆分点3
// 文件传输input
const fileInput = document.getElementById("file_input");
// TODO 录屏拆分点6
// 录制文字
const recordText = document.getElementById("record_text");
// TODO 桌面流拆分点5
const shareScreenText = document.getElementById("swap_text");

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
    localVideoMoveable.style.top = `${bounds.top - localVideoMoveable.clientHeight
      }px`;
    localVideoMoveable.style.left = `${bounds.left}px`;
  } else {
    //设置本地视频的位置
    localVideoMoveable.style.top = `${bounds.top}px`;
    localVideoMoveable.style.left = `${bounds.left - localVideoMoveable.clientWidth
      }px`;
  }
}

// 开关音频
// TODO 一对一视频通话拆分点2
function toggleAudio() {
  WRTCEntity.muteMicrophone();
  const audioIcon = document.getElementById("audio_icon");
  if (!WRTCEntity.audioEnabled) {
    audioIcon.classList.remove("fa-microphone");
    audioIcon.classList.add("fa-microphone-slash");
  } else {
    audioIcon.classList.add("fa-microphone");
    audioIcon.classList.remove("fa-microphone-slash");
  }
}

// 开关视频
// TODO 一对一视频通话拆分点3
function toggleVideo() {
  WRTCEntity.pauseVideo();
  const videoIcon = document.getElementById("video_icon");
  console.log("videoIcon:", videoIcon);
  if (!WRTCEntity.videoEnabled) {
    videoIcon.classList.remove("fa-video");
    videoIcon.classList.add("fa-video-slash");
  } else {
    videoIcon.classList.add("fa-video");
    videoIcon.classList.remove("fa-video-slash");
  }
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
  shareScreenText.textContent = "屏幕共享";
  WRTCEntity.swap();
}
//TODO 视频质量增强拆分点3

function toggleSR() {
  const videoIcon = document.getElementById("video_icon2");
  WRTCEntity.demo();
  console.log(WRTCEntity.srEnabled);
  if (!WRTCEntity.srEnabled) {
    videoIcon.classList.remove("fa-video");
    videoIcon.classList.add("fa-video-slash");
  } else {
    videoIcon.classList.remove("fa-video-slash");
    videoIcon.classList.add("fa-video");
  }
}
// function toggleSR() {


//   // if (WRTCEntity.WHITEBOARD) {
//   //   WRTCEntity.WHITEBOARD.toggleWhiteboard();
//   // } else {
//   //   alert("您必须建立会话之后才能开启白板功能");
//   // }
// }
// TODO 文字聊天文件传输拆分点4
// 开关聊天功能
function toggleChat() {
  const chatIcon = document.getElementById("chat_icon");
  if (entireChat.style.display !== "none") {
    fadeOut(entireChat);
    chatIcon.classList.remove("fa-comment-slash");
    chatIcon.classList.add("fa-comment");
  } else {
    fadeIn(entireChat);
    chatIcon.classList.remove("fa-comment");
    chatIcon.classList.add("fa-comment-slash");
  }
}

// TODO 虚化背景/背景替换拆分点3
function replaceBackground(type) {
  if (suggestPCChrome()) return;
  Snackbar.show({
    text: "正在处理，请稍候",
    pos: "top-left",
    duration: 8000,
    customClass: "custom_snackbar",
    actionText: "知道了",
    actionTextColor: "#f66496",
  });
  WRTCEntity.replaceBackground(type);
}

// 结束通话
//  TODO 一对一视频通话拆分点7
function endCall() {
  window.location.href = "/";
}

// TODO 文字聊天文件传输拆分点5
//将信息添加到页面上的聊天屏幕
function addMessageToScreen(msg, isOwnMessage) {
  if (!WRTCEntity.DataChannel) {
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
  console.log("===== 开始发送文本消息 =====");
  if (!WRTCEntity.DataChannel || WRTCEntity.DataChannel.readyState !== 'open') {
    console.error("DataChannel未就绪：", WRTCEntity.DataChannel?.readyState);
    return;
  }

  let msg = chatInput.value.trim();
  console.log("原始输入消息：", msg);
  if (!msg) {
    console.log("消息为空，跳过发送");
    return;
  }

  // 转义+自动链接（重点：检查autolink是否存在）
  try {
    msg = msg.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    console.log("转义后消息：", msg);
    // 若autolink未定义，注释这行先测试
    // msg = msg.autolink(); 
    // console.log("autolink后消息：", msg);
  } catch (e) {
    console.error("消息处理报错（大概率autolink未定义）：", e);
    return;
  }

  // 构造发送数据（核心：type必须是"msg"）
  const sendData = { type: "msg", data: msg };
  console.log("准备发送的JSON数据：", sendData);

  // 调用sendData发送
  WRTCEntity.sendData(sendData);
  console.log("已调用sendData发送");

  // 本地显示消息（先确认本地能显示）
  addMessageToScreen(msg, true);
  chatZone.scrollTop = chatZone.scrollHeight;
  chatInput.value = "";
  console.log("===== 本地消息显示完成 =====");
}
// TODO 文字聊天文件传输拆分点7
// 监听输入框 键盘 enter
chatInput.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    sendMessage();
  }
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
  fileInput.click();
}

// TODO 文字聊天文件传输拆分点8
function transFile() {
  if (!WRTCEntity.DataChannel) {
    Snackbar.show({
      text: "必须先建立通话才能发送消息",
      pos: "top-right",
      duration: 3000,
      customClass: "custom_snackbar",
      actionText: "知道了",
      actionTextColor: "#f66496",
    });
    return;
  }
  const file = fileInput.files[0];
  console.log("file: ", file);
  WRTCEntity.sendFile(file);
  const fileUrl = URL.createObjectURL(file);
  const msg = `<a href=${fileUrl} download=${file.name} >${file.name}</a>`;
  addMessageToScreen(msg, true);
}
// TODO 录屏拆分点4
function record() {
  if (!WRTCEntity.RTCPeerConnection) {
    alert("必须先建立通话才能录制远端视频");
    return;
  }
  if (!WRTCEntity.Recorder) {
    WRTCEntity.record(1000);
    recordText.textContent = "停止";
    Snackbar.show({
      text: "开始录制",
      pos: "top-center",
      duration: 2000,
      customClass: "custom_snackbar",
      actionText: "好的",
      actionTextColor: "#f66496",
    });
  } else {
    WRTCEntity.stopRecord();
    recordText.textContent = "录制";
  }
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
  if (!WRTCEntity.RTCPeerConnection) {
    alert("必须先建立通话才能截图");
    return;
  }
  const imgUrl = WRTCEntity.screenshot();
  console.log("imgUrl: ", imgUrl);
  const anchor = document.createElement('a');
  anchor.download = "截图";
  anchor.href = imgUrl;
  anchor.click();
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
    : { width: 320, height: 180 };
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
