const app = getApp()
const dayjs = require('../../utils/dayjs.min.js')
const io = require('../../utils/weapp.socket.io.js')

var socket = null;

//=====================================
var service_end = true;

const hostname = "192.168.1.4";
const http_protocol = "http";
const http_port = "8035";
const socket_protocol = "ws";
const socket_port = "8036";
const service_appid = "09xqjd"; //渠道ID，添加渠道后获得

Page({
    data: {
        content: "", //输入框值
        InputBottom: 0,
        config: {},

        messageList: [],
        notice: "",

        myAvatar: "http://api.btstu.cn/sjtx/api.php?lx=c1&format=images&method=mobile",
        servicerAvatar: "https://api.uomg.com/api/rand.avatar?sort=%E5%A5%B3&format=images",

        openStickerPanel: false,
    },
    onLoad() {
        this.connect();
    },
    InputFocus(e) {
        this.setData({
            InputBottom: e.detail.height
        })
    },
    InputBlur(e) {
        this.setData({
            InputBottom: 0
        })
    },
    inputing() {
        if (!socket) return;
        socket.emit('message', {
            appid: this.data.config.appid,
            userid: this.data.config.userid,
            type: "writing",
            session: this.data.config.sessionid,
            orgi: this.data.config.orgi,
            message: this.data.content,
        });
    },
    /**
     * 选择图片并上传发送
     */
    chooseImage() {
        let _this = this;
        wx.chooseImage({
            count: 1,
            sizeType: ['compressed'],
            success: (res) => {
                const tempFilePath = res.tempFilePaths[0];
                wx.uploadFile({
                    url: `${http_protocol}://${hostname}:${http_port}/im/image/upload.html?userid=${_this.data.config.userid}&appid=${_this.data.config.appid}&username=${_this.data.config.name}&orgi=${_this.data.config.orgi}`,
                    name: 'imgFile',
                    filePath: tempFilePath,
                })
            },
            fail: (res) => {},
            complete: (res) => {},
        })
    },
    sendMsg() {
        if (!socket) return;
        socket.emit('message', {
            appid: this.data.config.appid,
            userid: this.data.config.userid,
            type: "writing",
            session: this.data.config.sessionid,
            orgi: this.data.config.orgi,
            message: "",
        });
        if (!this.data.content) return;
        socket.emit('message', {
            appid: this.data.config.appid,
            userid: this.data.config.userid,
            type: "message",
            session: this.data.config.sessionid,
            orgi: this.data.config.orgi,
            message: this.data.content,
        });
        this.setData({
            content: "",
            openStickerPanel: false,
        })
    },
    async connect() {
        let _this = this;

        let response = await this.request({
            url: `${http_protocol}://${hostname}:${http_port}/im/text/${service_appid}`,
            method: "POST",
            header: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data: {
                userid: "123465",
                name: "SHIH",
            },
        })
        //console.log(response.data);
        let {
            userid,
            name,
            orgi,
            sessionid,
            appid,
        } = response.data;
        this.setData({
            config: response.data,
        })

        socket = io(
            `${socket_protocol}://${hostname}:${socket_port}/im/user?userid=${userid}&name=${name}&nickname=${name}&orgi=${orgi}&session=${sessionid}&appid=${appid}`, {
                transports: ['websocket']
            }
        );

        // socket.on('connect', () => {
        //     console.log('connection created.')
        // });

        socket.on('connect', function () {
            //console.log("on connect ...");
            //提交详细资料
            // socket.emit('new', {
            //     name: "张三",
            //     phone: "15200004793",
            //     email: "123@qq.com",
            //     memo: "测试微信小程序连接春松客服",
            //     orgi: `${orgi}`,
            //     appid: `${appid}`
            // });
        })
        socket.on("agentstatus", function (data) {
            //console.log("agentstatus", data);
        })
        socket.on("status", function (data) {
            //console.log("[status]", data);

            if (data.messageType == "end") {
                service_end = true;
                _this.setData({
                    notice: data
                })

            } else if (data.messageType == "text") {
                service_end = false;
                //console.log(data.message);
                _this.setData({
                    notice: data
                })
            } else if (data.messageType == "message" && !data.noagent) {
                // 服务恢复
                service_end = false;
                //console.log(data.message);
                _this.setData({
                    notice: data
                })
            }
        })
        socket.on('message', function (data) {
            //console.log("on message", data);
            //处理时间
            data.createtime = dayjs(data.createtime).format('MM-DD HH:mm:ss');
            //处理表情
            data.message = data.message.replaceAll(
                "src='/im/js/kindeditor/plugins/emoticons/images/",
                `src='${http_protocol}://${hostname}:${http_port}/im/js/kindeditor/plugins/emoticons/images/`
            );
            _this.setData({
                messageList: [..._this.data.messageList, ...[data]],
            })
            if (data.msgtype == "image") {} else if (data.msgtype == "file") {}
            if (data.calltype == "呼入") {

            } else if (data.calltype == "呼出") {
                let context = wx.createInnerAudioContext();
                context.autoplay = true;
                context.src = "/utils/14039.mp3";
                context.onPlay(() => {
                    //console.log("play");
                });
                context.onError((res) => { //打印错误
                    console.log(res.errMsg); //错误信息
                    console.log(res.errCode); //错误码
                })
                context.play();
            }
            _this.pageScrollToBottom();
        });

        socket.on('disconnect', function (error) {
            console.log('连接失败', error);
        });

        socket.on('satisfaction', function () {
            console.log("[satisfaction]");
        });
    },

    request: (options) => {
        return new Promise((resolve, reject) => {
            options.success = (e) => {
                resolve(e);
            }
            options.fail = (e) => {
                reject(e);
            }
            wx.request(options);
        })

    },

    // 获取容器高度，使页面滚动到容器底部
    pageScrollToBottom: function () {
        wx.createSelectorQuery().select('#page').boundingClientRect(function (rect) {
            if (rect) {
                // 使页面滚动到底部
                console.log(rect.height);
                wx.pageScrollTo({
                    scrollTop: rect.height
                })
            }
        }).exec()
    },

    /**
     * 图片预览
     */
    previewImage(e) {
        let src = e.currentTarget.dataset.src;
        wx.previewImage({
            current: src,
            urls: [src],
        })
    },
    /**
     * 表情面板开关
     */
    switchStickerPanel() {
        this.setData({
            openStickerPanel: !this.data.openStickerPanel,
        })
    },
    chooseSticker(e) {
        let idx = e.currentTarget.dataset.idx;
        this.setData({
            content: this.data.content + `[${idx}]`,
        })
    },
})