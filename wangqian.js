const express = require('express')
    // 连接数据库 用于保存图片地址信息
const mongoose = require('mongoose');
const path = require('path')
const cors = require('cors');
const app = express();
const sms = require('./src/utils/aliMsg');
const MD5 = require('md5-node');

// 导入路由模块
const upload = require('./src/upload');
const user = require('./src/user');
const order = require('./src/orderManage/order');
const statement = require('./src/orderManage/statement');
const dispatch = require('./src/orderManage/dispatch');



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
app.use('/orderForm',order.router);   // 处理订货单
app.use('/statementForm',statement.router);   // 处理订货单
app.use('/dispatchForm',dispatch.router);   // 处理发货单




function MathRand() {
    var Num = "";
    for (var i = 0; i < 6; i++) {
        Num += Math.floor(Math.random() * 10);
    }
    return Num;
}

// 获取验证码 
app.get('/getCode',function(req,res,next){
    let query = req.query;
    console.log(query,sms.send);
    let code = MathRand();
    sms.send(query.phone,'SMS_226825561',{custName:code}).then((result) => {
        console.log("短信发送成功")
        console.log(result)
    }, (ex) => {
        console.log("短信发送失败")
        console.log(ex)
    });


    res.send({
        code: 200,
        checkCode: code
    })
})

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