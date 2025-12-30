import WebWorker from 'web-worker:./worker';

//TODO 背景模糊/替换拆分点1
export default class BackgroundReplacement {
  constructor(options) {
   
  }

  //   是否支持离线画布
  checkSupported = () => {
    if (this.canvas.transferControlToOffscreen) {
      return true;
    }
    return false;
  };
  // TODO 背景模糊/替换拆分点2
  initWorker = () => {
    
  };

  // TODO 背景模糊/替换拆分点3
  //   传递离线画布
  transOffscreen = () => {
    
  };
  
  //   传递蒙版图片
  transMaskImg = () => {
    createImageBitmap(this.maskImg).then((res) => {
      this.worker.postMessage({ type: 'maskImg', maskImgBitmap: res }, [res]);
      this.renderCanvasImg();
    });
  };
  // TODO 背景模糊/替换拆分点4
  // 渲染canvas
  renderCanvasImg = async () => {
    //  从本地视频track中拿到位图数据给worker线程
    
  };
  // TODO 背景模糊/替换拆分点5
  //   处理与worker的通信
  handleMessage = (evt) => {
    
  };

  initListener = () => {
    this.worker.addEventListener('message', this.handleMessage);
  };
  
  // TODO 背景模糊/替换拆分点6
  //   暂停背景替换，移出listener即可
  stop = () => {
    
  };

  //   重启背景替换
  restart = () => {
 
  };
}

BackgroundReplacement.prototype.onSuccess = () => {
  console.log('success');
};

BackgroundReplacement.prototype.onInit = () => {
  console.log('init');
};
