const express = require('express')
    // 连接数据库 用于保存图片地址信息
const mongoose = require('mongoose');
const path = require('path')
const cors = require('cors');
const app = express()
const MD5 = require('md5-node');

// 导入路由模块
const upload = require('./src/upload')
const user = require('./src/user')



app.use(cors()); // 解决跨域问题

// 1、连接数据库
mongoose.connect('mongodb://localhost/wangqian', { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.once("open", () => {
    console.log('数据库链接成功，库名：kmdb')
})

// 开放静态资源库
app.use(express.static(path.join(__dirname, 'static/images')))
app.use(express.static(path.join(__dirname, 'static/excel')))
app.use(express.static(path.join(__dirname, 'src')))
app.use(express.static(path.join(__dirname, 'pages')))

// 测试服务器恢状态
app.get('/api', (req, res) => {
    res.send({
        text: 'You are Success!'
    })
})

// 统一挂载路由
// 上传文件
app.use('/upload', upload.router);
app.use('/user',user.router);   // 处理用户


function MathRand() {
    var Num = "";
    for (var i = 0; i < 6; i++) {
        Num += Math.floor(Math.random() * 10);
    }
    return Num;
}

// 获取文件列表
app.use('/getImglist', (req, res) => {
    upload.imgModel.find({}, { key: 1, _id: 0, url: 1 }, (err, docs) => { //定义查询结果显示字段
        if (!err) {
            console.log(docs)
            res.send(docs)
        } else {
            throw err
        }
    })
})

app.listen('1113', () => {
    console.log('正在监听1113')
})