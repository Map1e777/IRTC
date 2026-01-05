import { log, warn, error } from './utils/log';
import WHITEBOARD from './whiteBoard';
import BackgroundReplacement from './backgroundReplacement/index';
import Recorder from './recorder';

import * as tf from "@tensorflow/tfjs";
import { loadGraphModel } from "@tensorflow/tfjs-converter";

export default class WRTC {
  constructor(options) {
    // rtc接口实例
    this.RTCPeerConnection = null;
    // 数据通道实例
    this.DataChannel = null;
    // 白板实例
    this.WHITEBOARD = null;
    // 背景替换实例
    this.BackgroundReplacement = null;
    // 录制实例
    this.Recorder = null;
    // 媒体流
    this.webcamStream = null;
    // 远端流
    this.remoteStream = null;
    // 视频状态
    this.videoEnabled = true;
    // 音频状态
    this.audioEnabled = true;
    //SR状态
    this.srEnabled = true;

    this.modelUrl = "http://localhost:8000/SESR2_m5_x2_1_tfjs/model.json";

    this.model = null;

    this.timer = null;
    // 模式  用于区分共享屏幕还是普通视频流
    this.mode = 'camera';
    // 处理options
    const {
      localVideoId = 'localVideo',
      remoteVideoId = 'remoteVideo',
      whiteboardId = 'whiteboard',
      backgroundCanvasId = 'localCanvas',
      vsrCanvasId = "remote_canvas",
      iceServers = [],
      modelUrl = "http://localhost:8000/SESR2_m5_x2_1_tfjs/model.json",
      socket,
      room = location.href,
      mediaConstraint = { video: true, audio: true },
      maskImg,
    } = options;
    // 本地video dom
    this.localVideo = document.getElementById(localVideoId);
    // 远端video dom
    this.remoteVideo = document.getElementById(remoteVideoId);
    // sr dom
    this.srVideo = document.getElementById(vsrCanvasId);
    // turn服务
    this.iceServers = iceServers;
    // socket链接
    this.socket = socket;
    // 加入的房间号
    this.room = room;
    // 媒体约束
    this.mediaConstraint = mediaConstraint;
    // 白板dom
    this.whiteboardId = whiteboardId;
    // 背景图片dom
    this.maskImg = maskImg;
    // 背景canvas dom id
    this.backgroundCanvasId = backgroundCanvasId;
    this.receivedBuffer = []; //存放数据的数组
    this.receivedSize = 0; //数据大小
    this.fileSize = 0;
    this.fileName = '';
    // 缓存的icecancidate
    this.icecandidateArr = [];

    // 接受到对等端 『准备完成』的信号, 开始邀请通话
    socket.on('ready', this.invite);
    // 监听offer
    socket.on('offer', this.onOffer);
    // 监听answer
    socket.on('answer', this.onAnswer);
    // 监听ice候选者
    socket.on('icecandidate', this.onIceCandidata);
    // 获取webcam
    this.getUserMedia().then(() => {
      log(`加入房间${this.room}`);
      this.socket.emit('join', this.room);
    });
  }

  //  创建peerconnection
  createPeerConnection = () => {
    log('创建rtcpeerconnection');
    this.RTCPeerConnection = new RTCPeerConnection({
      iceServers: this.iceServers,
    });
    this.RTCPeerConnection.onconnectionstatechange = this.handleConnectionStateChange;
    this.RTCPeerConnection.onicecandidateerror = error;
    this.RTCPeerConnection.onicecandidate = this.handleICECandidateEvent;
    this.RTCPeerConnection.oniceconnectionstatechange = this.handleICEConnectionStateChange;
    this.RTCPeerConnection.onicegatheringstatechange = this.handleICEGatheringStateChange;
    this.RTCPeerConnection.onsignalingstatechange = this.handleSignalingStateChange;
    this.RTCPeerConnection.onnegotiationneeded = this.handleNegotiationNeededEvent;
    this.RTCPeerConnection.ontrack = this.handleTrackEvent;

    /* --- 数据传输通道 --- */
    //将通用数据通道添加到对等连接，
    //用于文字聊天，字幕和切换发送字幕
    //TODO RTCDataChannel拆分点1
    this.DataChannel = this.RTCPeerConnection.createDataChannel('chat', {
      negotiated: true,
      // both peers must have same id
      id: 0,
      ordered: true,
      maxRetransmits: 30,
    });
    //TODO RTCDataChannel拆分点2
    //成功打开dataChannel时调用
    this.DataChannel.onopen = (event) => {
      log('dataChannel opened');
    };
    //TODO RTCDataChannel拆分点3
    //处理不同的dataChannel类型
    this.DataChannel.onmessage = (event) => {
      console.log('event: ', event);
      if (event.data instanceof Blob || event.data instanceof ArrayBuffer) {
        console.log('blob');
        this.receivedBuffer.push(event.data);
        //更新已经收到的数据的长度
        this.receivedSize += event.data.byteLength || event.data.size;
        //如果接收到的字节数与文件大小相同，则创建文件
        if (this.receivedSize === this.fileSize) {
          //创建文件
          const received = new Blob(this.receivedBuffer, { type: 'application/octet-stream' });
          console.log('received: ', received);
          // 通过onRecieveFile抛出文件url给用户自行处理
          this.onRecieveFile({ url: URL.createObjectURL(received), fileName: this.fileName, fileSize: this.fileSize });
          //将buffer和 size 清空，为下一次传文件做准备
          this.receivedBuffer = [];
          this.receivedSize = 0;
          this.fileSize = 0;
          this.fileName = '';
        }
        return;
      }
      try {
        const receivedData = JSON.parse(event.data);
        console.log("解析后的JSON：", receivedData);
        const dataType = receivedData.type;
        const cleanedMessage = receivedData.data;
        console.log("消息类型type：", dataType);
        console.log("消息内容data：", cleanedMessage);

        if (dataType === 'whiteboard') {
          this.handleRecieveWhiteboard(cleanedMessage);
        } else if (dataType === 'file') {
          this.fileName = receivedData.fileName;
          this.fileSize = receivedData.fileSize;
        } else {
          console.log("是普通消息，调用onRecieveMessage");
          this.onRecieveMessage(cleanedMessage);
        }
      } catch (e) {
        console.error("JSON解析/文本消息处理报错：", e);
      }
    };
    /* --- 数据传输通道 --- */

    // 初始化白板
    // this.WHITEBOARD = new WHITEBOARD({ dataChanel: this.DataChanel, whiteboardId: this.whiteboardId });
  };

  //TODO 视频质量增强拆分点2
  VSR(video) {
    console.log("SR--------SR")
    tf.tidy(() => {
      //做一些异步操作
      let src_img = tf.browser.fromPixels(video);
      const maxTextureSize = 16384; // WebGL 最大纹理大小
      const targetHeight = Math.min(src_img.shape[0], maxTextureSize); // 确保图像高度不超过最大值
      const targetWidth = Math.min(src_img.shape[1], maxTextureSize); // 确保图像宽度不超过最大值
      let img = tf.image.resizeBilinear(src_img, [targetHeight, targetWidth]);

      // img.dispose()
      img = tf.cast(img, "float32");
      const offset = tf.scalar(255);
      let normalized = img.div(offset); //图像归一化
      normalized = normalized.mul(offset).clipByValue(0, 255);
      normalized = tf.transpose(normalized, [2, 0, 1]); // 张量维度变换
      // const batched = normalized.reshape([3, normalized.shape[1], normalized.shape[2], 1]);
      const batched = normalized.expandDims(3);
      let pred = this.model.predict(batched);
      pred = pred.clipByValue(0, 255);
      pred = tf.cast(pred, "int32");
      const output = tf.transpose(
        pred.reshape([3, pred.shape[1], pred.shape[2]]),
        [1, 2, 0]
      ); //维度变换
      tf.browser.toPixels(output, this.srVideo).then(() => {
        output.dispose(); //内存中释放tf.Tensor。
        console.log("Make sure we cleaned up", tf.memory().numTensors);
      }); // 将张量转为png图片
      tf.dispose(src_img); // 清除原始图像张量
      tf.dispose(img); // 清除调整大小后的图像张量
      tf.dispose(normalized); // 清除归一化后的张量
      tf.dispose(pred); // 清除归一化后的张量
      tf.dispose(batched);
      tf.dispose(output); // 清除归一化后的张量
    });
  }
  //TODO 视频质量增强拆分点1
  async demo() {
    if (this.srEnabled) {
      this.remoteVideo.style.display = "none"
      this.srVideo.style.display = "block"
      this.srEnabled = false
      this.model = await loadGraphModel(this.modelUrl);
      tf.setBackend("webgl");
      //this.timer = setInterval(this.VSR(this.remoteVideo), 500);
      this.timer = setInterval(() => {
        // 确保调用 VSR 时传递正确的上下文，防止直接执行时丢失上下文
        this.VSR(this.remoteVideo);
      }, 500);
    } else {
      this.srEnabled = true
      this.remoteVideo.style.display = "block"
      this.srVideo.style.display = "none"
      this.model = null
      clearInterval(this.timer);
      this.timer = null
    }
  };
  // TODO RTCPeerConnection拆分点1
  // 发起呼叫
  invite = () => {
    log('发起呼叫');
    this.createPeerConnection();
    try {
      log('getTracks');
      this.webcamStream.getTracks().forEach((track) => {
        log('addTracks');
        this.RTCPeerConnection.addTrack(track, this.webcamStream);
      });
    }
    catch (err) {
      error(err);
    }
  };

  //  获取webcam 
  //TODO 摄像头拆分点1
  getUserMedia = async () => {
    log('获取媒体流');
    try {
      this.webcamStream = await navigator.mediaDevices.getUserMedia(this.mediaConstraint);
      this.localVideo.srcObject = this.webcamStream;
      this.onGetUserMedia();
      return this.webcamStream;
    } catch (err) {
      this.onGetUserMediaError();
      error(err);
    }
  };

  //  获取桌面流 //TODO 桌面流拆分点1
  getDisplayMedia = async () => {
    log('获取桌面流');
    try {
      this.webcamStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      this.localVideo.srcObject = this.webcamStream;
      this.onGetDisplayMedia();
      return this.webcamStream;
    } catch (err) {
      this.onGetDisplayMediaError();
      error(err);
    }
  };

  // TODO RTCPeerConnection拆分点7
  //  需要协商
  handleNegotiationNeededEvent = async () => {
    log('开始协商');
    try {
      if (
        this.RTCPeerConnection.signalingState != 'stable' ||
        this.RTCPeerConnection.connectionState === 'connecting'
      ) {
        log('signalingState != stable, 推迟协商');
        return;
      }

      log('setLocalDescription(设置本地描述)');
      await this.RTCPeerConnection.setLocalDescription();

      log('发送offer给对等端');
      this.socket.emit('offer', this.RTCPeerConnection.localDescription, this.room);
    } catch (err) {
      error(err);
    }
  };

  //  连接状态变化
  handleConnectionStateChange = () => {
    warn('连接状态变更为: ' + this.RTCPeerConnection.connectionState);
    switch (this.RTCPeerConnection.connectionState) {
      case 'connected':
        const config = this.RTCPeerConnection.getConfiguration();
        log('*** 连接配置为: ' + JSON.stringify(config));
        if (this.BackgroundReplacement && this.BackgroundReplacement.state === 'active') {
          this.switchStream(this.BackgroundReplacement.stream);
        }
        break;
      case 'disconnected':
        break;
      case 'failed':
        warn('连接失败，现在开始重新协商');
        this.RTCPeerConnection.restartIce();
        setTimeout(() => {
          if (this.RTCPeerConnection.iceConnectionState !== 'connected') {
            log('重新协商失败，新建rtcpeerconnection,重新呼叫');
            this.invite();
          }
        }, 10000);
        break;
    }
  };
  // TODO RTCPeerConnection拆分点6
  // 当媒体流添加到track时触发
  handleTrackEvent = (event) => {
    log('Track event: ', event);
    this.remoteVideo.srcObject = event.streams[0];
    this.remoteStream = event.streams[0];
    this.onTrack(event);
  };
  // TODO RTCPeerConnection拆分点5
  //  当收集到ice候选者
  handleICECandidateEvent = (event) => {
    if (event.candidate) {
      log('发送ICE candidate: ' + event.candidate.candidate);
      this.socket.emit('icecandidate', event.candidate, this.room);
    }
  };

  //  ice连接状态变更
  handleICEConnectionStateChange = (event) => {
    log('ICE连接状态变更为 ' + this.RTCPeerConnection.iceConnectionState);
  };

  //  信令状态变更
  handleSignalingStateChange = (event) => {
    log('信令状态变更为: ' + this.RTCPeerConnection.signalingState);
    switch (this.RTCPeerConnection.signalingState) {
      case 'closed':
        this.invite();
        break;
    }
  };

  // ICE收集状态变更
  handleICEGatheringStateChange = (event) => {
    log('ICE收集状态变更为 : ' + this.RTCPeerConnection.iceGatheringState);
  };

  // TODO RTCPeerConnection拆分点2
  //  收到offer
  onOffer = async (offer) => {
    log('收到offer', offer);

    // 如果还没有创建RTCPeerConnection，先创建并添加tracks
    if (!this.RTCPeerConnection) {
      this.createPeerConnection();
      try {
        log('添加tracks到RTCPeerConnection');
        this.webcamStream.getTracks().forEach((track) => {
          log('addTrack:', track.kind);
          this.RTCPeerConnection.addTrack(track, this.webcamStream);
        });
      } catch (err) {
        error(err);
      }
    }

    if (this.RTCPeerConnection.signalingState != 'stable') {
      log(' - 信令状态非stable, 回滚');
      await Promise.all([
        this.RTCPeerConnection.setLocalDescription({ type: 'rollback' }),
        this.RTCPeerConnection.setRemoteDescription(new RTCSessionDescription(offer)),
      ]);
      return;
    } else {
      log('setRemoteDescription(设置远端描述)');
      await this.RTCPeerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    }

    log('创建并发送answer给对等端');
    await this.RTCPeerConnection.setLocalDescription();
    log('将缓存的icecandidate addIceCandidate');
    this.icecandidateArr.forEach((icecandidate) => {
      console.log('ic:', icecandidate);
      this.RTCPeerConnection.addIceCandidate(new RTCIceCandidate(icecandidate));
    });
    this.socket.emit('answer', this.RTCPeerConnection.localDescription, this.room);
  };
  // TODO RTCPeerConnection拆分点3
  //  收到answer
  onAnswer = async (answer) => {
    log('收到answer' + JSON.stringify(answer));
    await this.RTCPeerConnection.setRemoteDescription(new RTCSessionDescription(answer)).catch(error);
  };
  // TODO RTCPeerConnection拆分点4
  //  从对等端收到icecandidate
  onIceCandidata = async (icecandidate) => {
    log('从对等端收到icecandidate:' + JSON.stringify(icecandidate));
    if (!this.RTCPeerConnection) {
      this.icecandidateArr.push(icecandidate);
      return;
    }
    try {
      await this.RTCPeerConnection.addIceCandidate(new RTCIceCandidate(icecandidate));
    } catch (err) {
      error(err);
    }
  };
  //TODO RTCDataChannel拆分点4
  //  发送数据
  // sendData = (data) => {
  //   console.log('data: ', data);
  //   this.DataChannel.send(JSON.stringify(data));
  // };
  sendData = (data) => {
    console.log("===== WRTC.sendData 被调用 =====");
    console.log("待发送的原始数据：", data);
    try {
      const jsonStr = JSON.stringify(data);
      console.log("转为JSON字符串：", jsonStr);
      this.DataChannel.send(jsonStr);
      console.log("文本消息已通过DataChannel发出");
    } catch (e) {
      console.error("sendData报错：", e);
    }
  };
  //  静音
  // TODO 一对一视频通话拆分点5
  muteMicrophone = () => {
    this.webcamStream.getTracks().forEach((track) => {
      if (track.kind === 'audio') {
        track.enabled = !track.enabled;
        this.audioEnabled = track.enabled;
        this.onMuteMicrophone(track.enabled);
      }
    });
  };

  //  关闭是视频流
  // TODO 一对一视频通话拆分点4
  pauseVideo = () => {
    if (this.BackgroundReplacement && this.BackgroundReplacement.state === 'active') {
      this.replaceBackground('origin');
    }
    this.webcamStream.getTracks().forEach((track) => {
      if (track.kind === 'video') {
        track.enabled = !track.enabled;
        this.videoEnabled = track.enabled;
        this.onPauseVideo(track.enabled);
      }
    });
  };

  //画中画
  togglePictureInPicture = () => {
    if ('pictureInPictureEnabled' in document || this.remoteVideo.webkitSetPresentationMode) {
      if (document.pictureInPictureElement) {
        document.exitPictureInPicture().catch((error) => {
          log(error);
        });
      } else if (this.remoteVideo.webkitPresentationMode === 'inline') {
        this.remoteVideo.webkitSetPresentationMode('picture-in-picture');
      } else if (this.remoteVideo.webkitPresentationMode === 'picture-in-picture') {
        this.remoteVideo.webkitSetPresentationMode('inline');
      } else {
        this.remoteVideo.requestPictureInPicture().catch((error) => {
          alert('您必须连接到其他人才能进入画中画模式');
        });
      }
    } else {
      alert('你的浏览器不支持画中画。考虑使用Chrome或Safari。');
    }
    this.onTogglePictureInPicture();
  };

  //   切换发送流
  // TODO 桌面流拆分点6
  switchStream = (stream) => {
    if (!this.RTCPeerConnection) {
      return;
    }
    const videoTrack = stream.getVideoTracks()[0];
    console.log('videoTrack: ', videoTrack);
    const sender = this.RTCPeerConnection.getSenders().find(function (s) {
      return s.track.kind === videoTrack.kind;
    });
    sender.replaceTrack(videoTrack);
  };

  // 切换流类型
  swap = async () => {
    if (this.mode === 'camera') {
      // TODO 桌面流拆分点2
      try {
        this.webcamStream = await this.getDisplayMedia();
        this.mode = 'screen';
        this.switchStream(this.webcamStream);
      } catch (err) {
        log(err);
      }
    } else {
      //TODO 摄像头拆分点2
      try {
        this.webcamStream = await this.getUserMedia();
        this.mode = 'camera';
        this.switchStream(this.webcamStream);
      } catch (err) {
        log(err);
      }
    }
  };

  //当通过dataChannel接收到消息时调用
  handleRecieveWhiteboard(data) {
    if (this.WHITEBOARD.whiteboard.style.display === 'none') {
      this.WHITEBOARD.toggleWhiteboard();
    }
    const w = this.WHITEBOARD.whiteboard.width;
    const h = this.WHITEBOARD.whiteboard.height;
    this.WHITEBOARD.drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
  }

  // 替换背景 type: 'replace' | 'origin' | 'virtual'
  // TODO 虚化背景/背景替换拆分点4
  replaceBackground(type = 'replace') {
    if (!this.BackgroundReplacement) {
      this.BackgroundReplacement = new BackgroundReplacement({
        localVideo: this.localVideo,
        webcamStream: this.webcamStream,
        maskImg: this.maskImg,
        backgroundCanvasId: this.backgroundCanvasId,
        mode: type
      });
      if (this.RTCPeerConnection && this.RTCPeerConnection.connectionState === 'connected') {
        this.switchStream(this.BackgroundReplacement.stream);
      }
      return;
    }
    const premode = this.BackgroundReplacement.mode;
    this.BackgroundReplacement.mode = type;
    if (this.BackgroundReplacement.state === 'inactive' && type !== 'origin') {
      this.BackgroundReplacement.restart();
      if (this.RTCPeerConnection && this.RTCPeerConnection.connectionState === 'connected') {
        this.switchStream(this.BackgroundReplacement.stream);
      }
    } else if ((type === premode || type === 'origin') && this.BackgroundReplacement.state === 'active') {
      this.BackgroundReplacement.stop();
      if (this.RTCPeerConnection && this.RTCPeerConnection.connectionState === 'connected') {
        this.switchStream(this.webcamStream);
      }
    }
  }

  sendFile = (file) => {
    let offset = 0; //偏移量
    const chunkSize = 16384; //每次传输的块大小
    const fileReader = new FileReader();
    this.sendData({ type: 'file', fileName: file.name, fileSize: file.size }); //发送数据
    fileReader.onload = (e) => {
      console.log('e: ', e);
      //当数据被加载时触发该事件
      this.DataChannel.send(e.target.result);
      offset += e.target.result.byteLength; //更改已读数据的偏移量
      if (offset < file.size) {
        //如果文件没有被读完
        readSlice(offset); // 读取数据
      }
    };

    var readSlice = (o) => {
      const slice = file.slice(offset, o + chunkSize); //计算数据位置
      fileReader.readAsArrayBuffer(slice); //读取 16K 数据
    };

    readSlice(0); //开始读取数据
  };

  // 截图 
  // TODO 截图拆分点1
  screenshot = () => {
    if (!this.RTCPeerConnection) {
      return;
    }
    const tmpCanvas = document.createElement('canvas');
    tmpCanvas.width = this.remoteVideo.videoWidth;
    tmpCanvas.height = this.remoteVideo.videoHeight;
    const tmpCanvas2D = tmpCanvas.getContext('2d');
    tmpCanvas2D.drawImage(this.remoteVideo, 0, 0);
    return tmpCanvas.toDataURL();
  };

  // 录制 
  // TODO 录屏拆分点1
  record = (timeSlice) => {
    if (!this.remoteStream) {
      return;
    }
    this.Recorder = new Recorder({
      stream: this.remoteStream,
    });
    this.Recorder.start(timeSlice);
  };

  // 停止录制 
  // TODO 录屏拆分点2
  stopRecord = () => {
    const blob = this.Recorder.stop();
    //生成下载地址
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = URL.createObjectURL(blob);
    downloadAnchor.download = '录制文件';
    downloadAnchor.click();
    this.Recorder = null;
  };
}
// 触发静音事件时触发
WRTC.prototype.onMuteMicrophone = (enabled) => {
  console.log({ enabled });
};

// 触发关闭视频流事件触发
WRTC.prototype.onPauseVideo = (enabled) => {
  console.log({ enabled });
};

WRTC.prototype.onTogglePictureInPicture = () => {
  console.log('onTogglePictureInPicture');
};

WRTC.prototype.onRecieveMessage = (msg) => {
  console.log('msg: ', msg);
};

WRTC.prototype.onTrack = (event) => {
  console.log('event: ', event);
};

WRTC.prototype.onRecieveFile = (url) => {
  console.log('url: ', url);
};

WRTC.prototype.onGetDisplayMedia = () => { };

WRTC.prototype.onGetDisplayMediaError = () => { };

WRTC.prototype.onGetUserMedia = () => { };

WRTC.prototype.onGetUserMediaError = () => { };
