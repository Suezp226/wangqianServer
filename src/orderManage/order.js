// 七周年用户信息
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router(); // 输出一个路由中间件
const fs = require('fs');
const json2xls = require('json2xls'); //生成excel
const MD5 = require('md5-node');
const sms = require("../utils/aliMsg");

// 2、创建 schema
let Schema = mongoose.Schema;
let consumerInfo = new Schema({
    orderNo: String,
    company: String,    // 客户单位
    bookName: String,
    bookPhone: String,
    bookIdNum: String,
    ywyName: String,
    ywyPhone: String,
    fileList: Array,
    makerName: String,
    makerPhone: String,
    makeTime: String,
    confirmTime: String,
    orderStat: String,  // 订单状态
    location: String,  // 确认位置信息
    deviceInfo: String,  //设备信息
    imei: String,
});


// 3、 创建Model 对象  对接表名称
let consumer = mongoose.model("orderForm", consumerInfo)

// 拦截器  所有请求会经过这里
router.all('*', function(req, res, next) {
    if (req.url == '/wqLogin') {
        next();
    } else {
        next();
        return
        let nowDate = new Date();
        let year = nowDate.getFullYear();
        let month = nowDate.getMonth() * 1 + 1;
        let day = nowDate.getDate();
        // 判断token
        let kmToken = 'Wq ' + token;
        if (req.headers.authorization == kmToken) {
            next();
        } else {
            res.send({ code: 401, msg: '未登入' })
        }
    }
})



// 查询列表
router.get('/', function(req, res, next) {
    let query = req.query
        // pages->  page,pageNum,total
        // query-> name phone date keyword
    let { orderStat, keyword, orderNo } = query;
    let qq = { orderStat, keyword, orderNo};
    for (const key in query) {
        if (query[key].trim() == '') {
            delete qq[key]
        }
    }

    consumer.find(qq, {}, (err, docs) => { //定义查询结果显示字段
        if (!err) {
            let pages = {
                page: query.page,
                pageNum: query.pageNum,
                total: docs.length
            }
            let list = [];
            if (query.keyword && query.keyword.trim() !== '') {
                docs.forEach((ele) => {
                    let str = ele.name + '' + ele.orderNo + ''+ ele.bookName + ele.bookPhone + ele.bookIdNum + ele.ywyName + ele.ywyPhone + ele.makerName + ele.makerPhone;
                    if (!(str.indexOf(query.keyword) === -1)) {
                        list.unshift(ele); //倒序
                    }
                })
                pages.total = list.length;
            } else {
                list = docs.reverse();
            }
            list = list.splice((query.page - 1) * query.pageNum, query.pageNum);
            res.send({ code:200,list, pages })
            next();
        } else {
            throw err
        }
    })
});

// 导出excel
router.get('/exportExcel', function(req, res, next) {
    let query = req.query
    let { name, phone } = query;
    let qq = { name, phone };
    for (const key in query) {
        if (query[key].trim() == '') {
            delete qq[key]
        }
    }
    consumer.find(qq, {}, (err, docs) => { //定义查询结果显示字段
        if (!err) {
            let jsonArray = [];
            if (query.keyword.trim() !== '') {
                docs.forEach((ele) => {
                    let str = ele.name + '' + ele.phone + '' + ele.comment + '' + ele.principal;
                    if (!(str.indexOf(query.keyword) === -1)) {
                        let temp = {
                            '姓名': ele.name,
                            '手机号': ele.phone,
                        }
                        jsonArray.push(temp)
                    }
                })
            } else {
                docs.forEach(ele => {
                    let temp = {
                        '姓名': ele.name,
                        '手机号': ele.phone,
                    }
                    jsonArray.push(temp)
                })
            }
            let xls = json2xls(jsonArray);
            let date = (new Date().getMonth() + 1) + '-' + new Date().getDate();
            fs.writeFileSync('static/excel/user' + date + '.xlsx', xls, 'binary');
             res.send({ url: 'http://127.0.0.1:1112/' + 'user' + date + '.xlsx' }); // 本地环境
            // res.send({ url: 'https://suezp.cn/server/' + 'km' + date + '.xlsx' }); //线上环境
            next();
        } else {
            throw err
        }
    })
});


//  POST请求处理
router.use(express.json())
router.use(express.urlencoded({ extended: true }))

// 修改用户信息
router.post('/editOrder', function(req, res, next) {
    console.log(req.body);

    let query = req.body;

    if(query.orderStat == '1') {  // 记录确认时间
        query.confirmTime = new Date().valueOf() + '';
    }

    consumer.updateOne({ _id: query._id }, {...query,confirmTime: new Date().valueOf() + '' }, function(err, resp) {
        if (err) {
            console.log(err);
            return;
        }

        console.log('成功', resp)
        consumer.find({ _id: query._id }, {}, (err, docs) => {
            let {company,orderNo,bookPhone,bookName} = query;
            if(query.orderStat == '1') {  // 确认订单
                // 发送给 订货人
                sms.send(query.bookPhone,'SMS_229648209',{company,orderNum:orderNo,bookPhone,bookName}).then((result) => {
                    console.log("短信发送成功")
                    console.log(result)
                }, (ex) => {
                    console.log("短信发送失败")
                    console.log(ex)
                });
                // 发送给业务员
                sms.send(query.ywyPhone,'SMS_229648209',{company,orderNum:orderNo,bookPhone,bookName}).then((result) => {
                    console.log("短信发送成功")
                    console.log(result)
                }, (ex) => {
                    console.log("短信发送失败")
                    console.log(ex)
                });
                // 发送给销售内勤
                sms.send(query.makerPhone,'SMS_229648209',{company,orderNum:orderNo,bookPhone,bookName}).then((result) => {
                    console.log("短信发送成功")
                    console.log(result)
                }, (ex) => {
                    console.log("短信发送失败")
                    console.log(ex)
                });
            }
    
            if(query.orderStat == '9') {  //
                
            }
            res.send({ docs, code: 200 })
            next();
        })
    })
})

// 删除订单
router.post('/deleteOrder', function(req, res, next) {
    console.log(req.body);
    let query = req.body;

    consumer.remove({ _id: query._id }, function (err, resp) {
        if (err) {
            console.log(err);
            return;
        }
        consumer.find({ _id: query._id }, {}, (err, docs) => {
            res.send({ docs, code: 200 })
            
            next();
        })
    });
})

// 新增订单
router.post('/addOrder', function(req, res, next) {
    let query = req.body;
    console.log(query.orderNo);
    consumer.find({ orderNo: query.orderNo }, {}, (err, docs) => {
        if (docs.length === 0 || query.phone.trim() == '') {
            
            let newOrder = {...query,token:''};
            newOrder.makeTime = new Date().valueOf() + '';
            console.log(newOrder,'新增参数')
            consumer.create([newOrder], (err) => {
                if (!err) {
                    let {company,orderNo} = query;
                    // 发送给 订货人
                    // sms.send(query.bookPhone,'SMS_230010505',{company,orderNo}).then((result) => {
                    //     console.log("短信发送成功")
                    //     console.log(result)
                    // }, (ex) => {
                    //     console.log("短信发送失败")
                    //     console.log(ex)
                    // });
                    // // 发送给业务员
                    // sms.send(query.ywyPhone,'SMS_229643237',{company,orderNo}).then((result) => {
                    //     console.log("短信发送成功")
                    //     console.log(result)
                    // }, (ex) => {
                    //     console.log("短信发送失败")
                    //     console.log(ex)
                    // });
                    consumer.find({...query }, {}, (err, docs) => {
                        res.send({ docs, code: 200 })
                        return
                    })
                } else {
                    throw err;
                }
            })
        } else {
            res.send({ code: 302, msg: '该订单好已存在' });
        }
    })
})


// 定时任务 备份保存文件在本地
const saveDataLocal = function() {
    consumer.find({}, {}, (err, docs) => { //定义查询结果显示字段
        if (!err) {
            let jsonArray = [];
            docs.forEach(ele => {
                let temp = {
                    '姓名': ele.name,
                    '手机号': ele.phone,
                }
                jsonArray.push(temp)
            })
            let date = new Date().getFullYear() + '-' +(new Date().getMonth() + 1) + '-' + new Date().getDate() +' '+
            new Date().getHours()+':'+ new Date().getMinutes();;
            jsonArray.push({
                '日期': '备份时间'+date,
            });
            let xls = json2xls(jsonArray);
            fs.writeFileSync('static/excel/用户列表' + '.xlsx', xls, 'binary');
        } else {
            throw err
        }
    })
}



// 导出模块（在 app.js 中引入）
module.exports = { router, consumer, saveDataLocal };