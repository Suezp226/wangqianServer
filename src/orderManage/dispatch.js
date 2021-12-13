// 发货单
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
    goodsPrice: String, // 货物加个
    company: String,  // 客户单位
    payName: String,   // 结算人相关
    payPhone: String,
    payIdNum: String,
    destination: String,  // 目的地
    carNum: String,       // 车牌号
    deliveryName: String,   // 送货人人相关
    deliveryPhone: String,
    deliveryIdNum: String,
    ywyName: String,
    ywyPhone: String,
    fileList: Array,
    deliveryFeeType: String,  // 运费类型  0 公司运费  需要输入运费金额， 1客户运费 不需要金额
    deliveryFee: String,   // 运费
    liveName: String,     // 现场人
    livePhone: String,     // 现场联系电话
    mark: String,          // 备注
    makerName: String,
    makerPhone: String,
    makeTime: String,
    bootUpTime: String,     // 启运时间
    signTime: String,       // 签收时间
    changeName: String,   // 变更人
    changePhone: String,
    changeIdNum: String,
    signType: String,       // 0 无异议  1有异议
    problem: String,    // 异议
    orderStat: String,  // 订单状态 0-待启运  1-运输中  2-无异议签收   3-有异议签收   4-二次签收(无异议)  9-作废
    // 启运设备
    Blocation: String,  // 确认位置信息
    BdeviceInfo: String,  //设备信息
    Bimei: String,
    // 签收设备
    Slocation: String,  // 确认位置信息
    SdeviceInfo: String,  //设备信息
    Simei: String,
});


// 3、 创建Model 对象  对接表名称
let consumer = mongoose.model("dispatchForm", consumerInfo)

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
                    // let str = ele.name + '' + ele.orderNo + ''+ ele.payName + ele.payPhone + ele.payIdNum + ele.changeName + ele.changePhone + ele.changeIdNum +
                    //      ele.ywyName + ele.ywyPhone + ele.makerName + ele.makerPhone + ele.deliveryName + ele.deliveryPhone + ele.deliveryIdNum;
                    let str = ele.name + '' + ele.orderNo + ''+ ele.payName + ele.payPhone + ele.payIdNum + ele.changeName;
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

    consumer.updateOne({ _id: query._id }, {...query }, function(err, resp) {
        if (err) {
            console.log(err);
            return;
        }

        // 订单状态 0-待启运  1-运输中  2-无异议签收   3-有异议签收   4-二次签收(无异议)  9-作废
        let {} = query;
        // 要判断下是否有变更收货人
        if(query.orderStat == '1') {  // 启运操作  通知 结算人、司机、业务员
            // 发送给 司机
            sms.send(query.deliveryPhone,'SMS_229648220',{}).then((result) => {
                console.log("短信发送成功")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败")
                console.log(ex)
            });
            // 发送给 结算人（本人）
            sms.send(query.payPhone,'SMS_229643238',{}).then((result) => {
                console.log("短信发送成功")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败")
                console.log(ex)
            });
            // 发送给 业务员
            sms.send(query.ywyPhone,'SMS_229643215',{}).then((result) => {
                console.log("短信发送成功")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败")
                console.log(ex)
            });
        }
    
        if(query.orderStat == '2' || query.orderStat == '4') {  // 签收操作 无异议   通知结算人、司机、业务员、内勤
            // 发送给 结算人（本人）
            sms.send(query.payPhone,'SMS_229613403',{}).then((result) => {
                console.log("短信发送成功")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败")
                console.log(ex)
            });

            // 发送给 司机
            sms.send(query.deliveryPhone,'SMS_229638303',{}).then((result) => {
                console.log("短信发送成功")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败")
                console.log(ex)
            });
            // 发送给 销售内勤
            sms.send(query.makerPhone,'SMS_229638303',{}).then((result) => {
                console.log("短信发送成功")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败")
                console.log(ex)
            });
            // 发送给 业务员
            sms.send(query.ywyPhone,'SMS_229638303',{}).then((result) => {
                console.log("短信发送成功")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败")
                console.log(ex)
            });
            console.log('确认订单')
        }

        if(query.orderStat == '3') {  // 签收操作 有异议
            // 发送给 结算人（本人）
            sms.send(query.payPhone,'SMS_229643228',{}).then((result) => {
                console.log("短信发送成功")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败")
                console.log(ex)
            });
            // 发送给 司机
            sms.send(query.deliveryPhone,'SMS_229638303',{}).then((result) => {
                console.log("短信发送成功")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败")
                console.log(ex)
            });
            
            // 发送给 销售内勤
            sms.send(query.makerPhone,'SMS_229638303',{}).then((result) => {
                console.log("短信发送成功")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败")
                console.log(ex)
            });
            // 发送给 业务员
            sms.send(query.ywyPhone,'SMS_229638303',{}).then((result) => {
                console.log("短信发送成功")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败")
                console.log(ex)
            });
            console.log('确认订单')
        }

        if(query.orderStat == '4') {  // 签收操作 二次签收
            console.log('二次确认订单')
        }




        console.log('成功', resp)
        consumer.find({ _id: query._id }, {}, (err, docs) => {
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
            
            let newOrder = {...query,token:'',randomNum:''};

            consumer.create([newOrder], (err) => {
                if (!err) {
                    console.log('添加成功')
                    // let {company,ywyName,ywyPhone} = query;
                    // // 发送给 司机
                    // sms.send(query.checkPhone,'SMS_229638319',{company,ywyName,ywyPhone}).then((result) => {
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