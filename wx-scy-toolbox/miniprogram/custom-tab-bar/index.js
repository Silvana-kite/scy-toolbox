const lottie = require("lottie-miniprogram");
const homeAnimation = require("../images/navIcons/首页");
const directoryAnimation = require("../images/navIcons/星球");
const mineAnimation = require("../images/navIcons/个人");

const tabItems = [
  {
    pagePath: "pages/index/index",
    text: "首页",
    fallbackImage: "/images/navIcons/home-inactive.svg",
  },
  {
    pagePath: "pages/category/category",
    text: "工具大全",
    fallbackImage: "/images/navIcons/category-inactive.svg",
  },
  {
    pagePath: "pages/mine/mine",
    text: "我的",
    fallbackImage: "/images/navIcons/mine-inactive.svg",
  },
];

const animations = [homeAnimation, directoryAnimation, mineAnimation];

Component({
  data: {
    selected: 0,
    tabItems,
  },

  lifetimes: {
    ready() {
      this.isReady = true;
      this.queueSelectedAnimation(this.data.selected, true);
    },

    detached() {
      this.destroyActiveAnimation();
    },
  },

  methods: {
    setSelected(selected, shouldPlay = true) {
      if (selected === this.data.selected && this.activeAnimation) {
        this.playActiveAnimation(shouldPlay);
        return;
      }

      this.destroyActiveAnimation();
      this.setData({ selected });
      if (this.isReady) {
        this.queueSelectedAnimation(selected, shouldPlay);
      }
    },

    onTabTap(event) {
      const selected = Number(event.currentTarget.dataset.index);
      if (selected === this.data.selected) {
        this.setSelected(selected, true);
        return;
      }

      wx.switchTab({ url: `/${tabItems[selected].pagePath}` });
    },

    queueSelectedAnimation(selected, shouldPlay) {
      this.animationRequestId = (this.animationRequestId || 0) + 1;
      const requestId = this.animationRequestId;
      wx.nextTick(() => {
        this.createSelectedAnimation(selected, shouldPlay, requestId);
      });
    },

    createSelectedAnimation(selected, shouldPlay, requestId) {
      if (requestId !== this.animationRequestId || selected !== this.data.selected) {
        return;
      }

      wx.createSelectorQuery().in(this)
        .select(`#tab-lottie-${selected}`)
        .fields({ node: true, size: true }, (canvasInfo) => {
          if (
            !canvasInfo ||
            !canvasInfo.node ||
            requestId !== this.animationRequestId ||
            selected !== this.data.selected
          ) {
            return;
          }

          const canvas = canvasInfo.node;
          const pixelRatio = wx.getSystemInfoSync().pixelRatio;
          const width = canvasInfo.width || 28;
          const height = canvasInfo.height || 28;
          canvas.width = width * pixelRatio;
          canvas.height = height * pixelRatio;

          const context = canvas.getContext("2d");
          context.scale(pixelRatio, pixelRatio);
          lottie.setup(canvas);
          this.activeAnimation = lottie.loadAnimation({
            animationData: animations[selected],
            autoplay: false,
            loop: false,
            rendererSettings: { context },
          });
          this.playActiveAnimation(shouldPlay);
        })
        .exec();
    },

    playActiveAnimation(shouldPlay) {
      if (!this.activeAnimation) {
        return;
      }
      if (shouldPlay) {
        this.activeAnimation.goToAndPlay(0, true);
        return;
      }
      this.activeAnimation.goToAndStop(Math.max(this.activeAnimation.totalFrames - 1, 0), true);
    },

    destroyActiveAnimation() {
      if (this.activeAnimation && typeof this.activeAnimation.destroy === "function") {
        this.activeAnimation.destroy();
      }
      this.activeAnimation = null;
    },
  },
});
