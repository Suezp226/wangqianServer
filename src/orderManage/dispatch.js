// 发货单
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router(); // 输出一个路由中间件
const fs = require('fs');
const json2xls = require('json2xls'); //生成excel
const MD5 = require('md5-node');
const sms = require("../utils/aliMsg");
const moment = require("moment");
const user = require('../user');  // 用户list 用来判别新增用户
const excel = require('../utils/excel');
const log = require('../log');

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
    signTime2: String,       // 二次签收时间
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
    qq.ywyName = query.ywyName?query.ywyName:'';
    qq.makerName = query.makerName?query.makerName:'';
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
                    let str = ele.name + '' + ele.orderNo + ''+ ele.payName + ele.payPhone + ele.payIdNum + ele.changeName + ele.changePhone + ele.changeIdNum +
                         ele.ywyName + ele.ywyPhone + ele.makerName + ele.makerPhone + ele.deliveryName + ele.deliveryPhone + ele.deliveryIdNum;
                    // let str = ele.name + '' + ele.orderNo + ''+ ele.payName + ele.payPhone + ele.payIdNum + ele.changeName;
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

function getStatuStr(num) {
    let str= '';
    switch(num) {
        case '0': 
            str = '待启运';
        break
        case '1': 
            str = '运输中';
        break
        case '2': 
            str = '已签收';
        break
        case '3': 
            str = '已签收(有异议)';
        break
        case '9': 
            str = '已作废';
        break
        default: 
            str = '';
        break
    }

    return str;

}

// 导出excel
router.get('/exportExcel', function(req, res, next) {
    let query = req.query;
    let { orderStat, keyword, orderNo } = query;
    let qq = { orderStat, keyword, orderNo};
    qq.ywyName = query.ywyName?query.ywyName:'';
    qq.makerName = query.makerName?query.makerName:'';
    for (const key in query) {
        if (query[key].trim() == '') {
            delete qq[key]
        }
    }
    consumer.find(qq, {}, (err, docs) => { //定义查询结果显示字段
        if (!err) {
            let list = [];

            if (query.keyword && query.keyword.trim() !== '') {  // 存在关键字
                docs.forEach((ele) => {
                    let str = ele.name + '' + ele.orderNo + ''+ ele.payName + ele.payPhone + ele.payIdNum + ele.changeName + ele.changePhone + ele.changeIdNum +
                         ele.ywyName + ele.ywyPhone + ele.makerName + ele.makerPhone + ele.deliveryName + ele.deliveryPhone + ele.deliveryIdNum;

                         if (!(str.indexOf(query.keyword) === -1)) {
                            let temp = ele;
                            temp.orderStat = getStatuStr(ele.orderStat);
                            list.unshift(temp); //倒序
                        }
                })
            } else {
                list = docs.reverse();
                list.forEach((ele,ind)=>{
                    list[ind].orderStat = getStatuStr(ele.orderStat)
                })
            }
       
            let date = (new Date().getMonth() + 1) + '-' + new Date().getDate();
            let header = [
                {'makeTime':'制单时间'},
                {'orderNo':'订单号'},
                {'orderStat':'状态'},
                {'company':'客户单位'},
                {'goodsPrice':'货物金额'},
                {'destination':'目的地'},
                {'carNum':'车牌号'},
                {'payName':'结算人'},
                {'payPhone':'结算人电话'},
                {'payIdNum':'结算人身份证'},
                {'deliveryName':'送货人'},
                {'deliveryPhone':'送货人电话'},
                {'deliveryIdNum':'送货人身份证'},
                {'problem':'异议'},
                {'ywyName':'业务员'},
                {'ywyPhone':'电话'},
                {'makerName':'制单员'},
                {'makerPhone':'电话'}
            ]
            
            //  参数 路excel 下的路径 + 文件名； sheet名称； 描述信息（暂时无用）； 表头； 表数据
            let filename = excel.createReportFile('/dispatch' + date,'sheet1',[],header,list);

            res.send({ url: 'https://shwq.mobile.xqzbk.top/api/' + filename + '.xlsx' }); // 线上环境
            // res.send({ url: 'http://localhost:1115/' + 'dispatch' + date + '.xlsx' }); // 本地环境
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

    if(query.orderStat == '1') {  // 记录启运时间
        query.bootUpTime = moment().format('YYYY年MM月DD日 HH:mm');
    }

    if(query.orderStat == '2' || query.orderStat == '3') {  // 记录 一次签收
        query.signTime = moment().format('YYYY年MM月DD日 HH:mm');
    }

    if(query.orderStat == '4') {  //记录 二次签收
        query.signTime2 = moment().format('YYYY年MM月DD日 HH:mm');
    }



    consumer.updateOne({ _id: query._id }, {...query }, function(err, resp) {
        if (err) {
            console.log(err);
            return;
        }

        // 订单状态 0-待启运  1-运输中  2-无异议签收   3-有异议签收   4-二次签收(无异议)  9-作废
        let {bootUpTime,carNum,company,orderNo,goodsPrice,destination,deliveryFeeType,deliveryFee,
                liveName,livePhone,deliveryName,deliveryPhone,signTime,signTime2,changeName,changePhone,changeIdNum,
                ywyName,ywyPhone,makerName,makerPhone,problem,payName,payPhone,payIdNum} = query;

         // 要判断下是否有变更收货人  运输中状态变更收货人
        if(query.orderStat == '1' && query.changeName) {   // 判定为 变更收货人
            console.log('变更收货人')
             // 打印日志
             let newLog = {
                orderNo: orderNo,
                name: payName,
                phone: payPhone,
                idNum: payIdNum,
                time: moment().format('YYYY年MM月DD日 HH:mm'),
                doneStr: '变更收货人',
                platform: '',
                location: '',
            }
            log.consumer.create([newLog], (err) => {
                if (!err) {
                    console.log('日志新增成功')
                } else {
                    throw err;
                }
            })

            // 新增用户
            user.consumer.find({ phone: changePhone }, {}, (err, docs) => {
                if(docs.length == 0) {  // 不存在该用户 创建一个用户角色
        
                    // 不存在用户 走新增 
                    let newUser = {
                        company: company,  //客户单位
                        name: changeName,
                        password: '',
                        phone: changePhone,
                        idNumber: changeIdNum,
                        carNum: carNum,
                        userType: '',
                        roleName: '',  // 工作人员角色中文
                        token: '',
                        randomNum: '',
                        menuList: '',
                        mark: '',
                    }
                    
                    user.consumer.create([newUser], (err) => {
                        if (!err) {
                            console.log('添加成功')

                            let nowTime = moment().format('YYYY年MM月DD日 HH:mm');
                            // 发送给 新收货人
                            sms.send(changePhone,'SMS_231215573',{company,nowTime,carNum,orderNo,goodsPrice,deliveryName,deliveryPhone,payName}).then((result) => {
                                console.log("短信发送成功-变更人")
                                console.log(result)
                            }, (ex) => {
                                console.log("短信发送失败")
                                console.log(ex)
                            });
                            res.send({ code: 200,msg: '变更成功' })
                        } else {
                            throw err;
                        }
                    })
                    return
                } else {
                    // 发送给 新收货人
                    let nowTime = moment().format('YYYY年MM月DD日 HH:mm');
                    sms.send(changePhone,'SMS_231215573',{company,nowTime,carNum,orderNo,goodsPrice,deliveryName,deliveryPhone,payName}).then((result) => {
                        console.log("短信发送成功-变更人")
                        console.log(result)
                    }, (ex) => {
                        console.log("短信发送失败")
                        console.log(ex)
                    });
                    res.send({ code: 200,msg: '变更成功' })
                }
        
            })
            return
        }
        if(query.orderStat == '1') {  // 启运操作  通知 结算人、司机、业务员  需要判断运费

            let deliveryStr = deliveryFeeType=='0'?deliveryFee+'元':'客户运费'   // 根据运费类型设置  三个都一样

            let smsParam = {
                nowDate: bootUpTime,
                carNum,company,orderNo,goodsPrice,destination
            }
            // 发送给 司机
            sms.send(query.deliveryPhone,'SMS_229648220',{...smsParam,liveName,livePhone,deliveryStr}).then((result) => {
                console.log("短信发送成功-司机")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败")
                console.log(ex)
            });
            // 发送给 结算人（本人） 不用传运费
            sms.send(query.payPhone,'SMS_230641609',{...smsParam,deliveryName,deliveryPhone}).then((result) => {
                console.log("短信发送成功-结算人")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败")
                console.log(ex)
            });
            // 发送给 业务员
            console.log({...smsParam,liveName,livePhone,deliveryStr},'业务员传参')
            sms.send(query.ywyPhone,'SMS_229643215',{...smsParam,liveName,livePhone,deliveryStr,deliveryName,deliveryPhone}).then((result) => {
                console.log("短信发送成功-业务员")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败")
                console.log(ex)
            });

             // 打印日志
             let newLog = {
                orderNo: orderNo,
                name: deliveryName,
                phone: deliveryPhone,
                idNum: query.deliveryIdNum,
                time: moment().format('YYYY年MM月DD日 HH:mm'),
                doneStr: '司机启运货物',
                platform: query.BdeviceInfo,
                location: query.Blocation,
            }
            log.consumer.create([newLog], (err) => {
                if (!err) {
                    console.log('日志新增成功')
                } else {
                    throw err;
                }
            })
        }
    
        if(query.orderStat == '2' || query.orderStat == '4') {  // 签收操作 无异议   通知结算人、司机、业务员、内勤
            
            let smsParam2 = {
                company,
                nowDate: query.orderStat == '2'?signTime:signTime2,
                carNum,orderNo,goodsPrice,destination,makerName,makerPhone,ywyName,ywyPhone
            }

            // 发送给 结算人（本人）
            sms.send(query.payPhone,'SMS_229613403',smsParam2).then((result) => {
                console.log("短信发送成功-结算人")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败")
                console.log(ex)
            });

            let baseSmsParam = {
                company, carNum, orderNo,goodsPrice,destination,
                signTime: query.orderStat == '2'?signTime:signTime2,
                signStr: '无异议',
            }

            console.log(baseSmsParam, '工作人员参数');

            // 发送给 司机
            sms.send(query.deliveryPhone,'SMS_229638303',{...baseSmsParam}).then((result) => {
                console.log("短信发送成功-司机")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败-司机")
                console.log(ex)
            });
            // 发送给 销售内勤
            sms.send(query.makerPhone,'SMS_229638303',{...baseSmsParam}).then((result) => {
                console.log("短信发送成功-内勤")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败-内勤")
                console.log(ex)
            });
            // 发送给 业务员
            sms.send(query.ywyPhone,'SMS_229638303',{...baseSmsParam}).then((result) => {
                console.log("短信发送成功-业务员")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败-业务员")
                console.log(ex)
            });
            console.log('确认订单')

             // 打印日志
             let newLog = {
                orderNo: orderNo,
                name: changeName?changeName:payName,
                phone: changePhone?changePhone:payPhone,
                idNum: changeIdNum?changeIdNum:payIdNum,
                time: moment().format('YYYY年MM月DD日 HH:mm'),
                doneStr: '确认签收',
                platform: query.SdeviceInfo,
                location: query.Slocation,
            }
            log.consumer.create([newLog], (err) => {
                if (!err) {
                    console.log('日志新增成功')
                } else {
                    throw err;
                }
            })

        }

        if(query.orderStat == '3') {  // 签收操作 有异议

            let smsParam3 = {
                company,problem,
                nowDate: query.orderStat == '2'?signTime:signTime2,
                carNum,orderNo,goodsPrice,destination,makerName,makerPhone,ywyName,ywyPhone
            }
            // 发送给 结算人（本人）
            sms.send(query.payPhone,'SMS_229643228',smsParam3).then((result) => {
                console.log("短信发送成功-结算人")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败-结算人")
                console.log(ex)
            });

            let baseSmsParam = {
                company, carNum, orderNo,goodsPrice,destination,problem,
                signTime: query.orderStat == '2'?signTime:signTime2,
            }

            // signStr 根据接受短信人变化
            // 有异议：XXX货物数量短少XXXX,请立即联系内勤13312204545或业务员XXX电话XXX处理

            let signStr1 = `有异议：${problem},请立即联系内勤${makerName}电话${makerPhone}或业务员${ywyName}电话${ywyPhone}处理`

            console.log({...baseSmsParam,makerName,makerPhone,ywyName,ywyPhone},'司机传参')

            // 发送给 司机
            sms.send(query.deliveryPhone,'SMS_230185013',{...baseSmsParam,makerName,makerPhone,ywyName,ywyPhone}).then((result) => {
                console.log("短信发送成功-司机")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败-司机")
                console.log(ex)
            });

            // 有异议：XXX货物数量短少XXXX,请立即联系结算人徐超电话13312204525或业务员XXX电话XXX处理
            let signStr2 = `有异议：${problem},请立即联系结算人${payName}电话${payPhone}或业务员${ywyName}电话${ywyPhone}处理`
            // 发送给 销售内勤
            sms.send(query.makerPhone,'SMS_230175022',{...baseSmsParam,payName,payPhone,ywyName,ywyPhone}).then((result) => {
                console.log("短信发送成功-内勤")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败-内勤")
                console.log(ex)
            });

            // 有异议：XXX货物数量短少XXXX,请立即联系内勤13312204545或结算人徐超电话13312204525处理
            let signStr3 = `有异议：${problem},请立即联系内勤${makerName}电话${makerPhone}或结算人${payName}电话${payPhone}处理`
            // 发送给 业务员
            sms.send(query.ywyPhone,'SMS_230220010',{...baseSmsParam,makerName,makerPhone,payName,payPhone}).then((result) => {
                console.log("短信发送成功-业务员")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败-业务员")
                console.log(ex)
            });
            console.log('确认订单')
            // 打印日志
            let newLog = {
                orderNo: orderNo,
                name: changeName?changeName:payName,
                phone: changePhone?changePhone:payPhone,
                idNum: changeIdNum?changeIdNum:payIdNum,
                time: moment().format('YYYY年MM月DD日 HH:mm'),
                doneStr: '确认签收(有异议)',
                platform: query.SdeviceInfo,
                location: query.Slocation,
            }
            log.consumer.create([newLog], (err) => {
                if (!err) {
                    console.log('日志新增成功')
                } else {
                    throw err;
                }
            })
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

    consumer.deleteOne({ _id: query._id }, function (err, resp) {
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


function judgeUser(userType,name,phone,id,company,carNum) {
    user.consumer.find({ phone: phone }, {}, (err, docs) => {
        if(docs.length == 0) {  // 不存在该用户 创建一个用户角色

            let roleName = '';
            if(userType=='ywy') {
                roleName = '业务员'
            }
            if(userType=='xsnq') {
                roleName = '销售内勤'
            }
            if(userType=='cw') {
                roleName = '财务'
            }

            // 不存在用户 走新增 没有姓名
            let newUser = {
                company: company,  //客户单位
                name: name,
                password: '',
                phone: phone,
                idNumber: id,
                carNum: carNum,
                userType: userType,
                roleName: roleName,  // 工作人员角色中文
                token: '',
                randomNum: '',
                menuList: '',
                mark: '',
            }

            if(['xsnq','cw'].includes(newUser.userType)) {  // 工作人员 要保存密码
                newUser.password = '123456';
                newUser.menuList = JSON.stringify([{"muaId":1,"roleCode":"admin","menuCode":"home","menuUrl":"/dashboard","authType":"menu","buttonCode":null,"menuName":"系统首页","menuIcon":"el-icon-lx-home","parentId":"","path":"/dashboard","title":"系统首页","icon":"el-icon-lx-home","subs":null},{"muaId":2,"roleCode":"admin","menuCode":"order","menuUrl":"8","authType":"menu","buttonCode":null,"menuName":"订单管理","menuIcon":"el-icon-lx-calendar","parentId":"","path":"8","title":"订单管理","icon":"el-icon-lx-calendar","subs":[{"muaId":3,"roleCode":"admin","menuCode":"orderForm","menuUrl":"/orderForm","authType":"menu","buttonCode":null,"menuName":"订货单","menuIcon":null,"parentId":"order","path":"/orderForm","title":"订货单","icon":"","subs":null},{"muaId":4,"roleCode":"admin","menuCode":"dispatchForm","menuUrl":"/dispatchForm","authType":"menu","buttonCode":null,"menuName":"发货单","menuIcon":null,"parentId":"order","path":"/dispatchForm","title":"发货单","icon":"","subs":null},{"muaId":5,"roleCode":"admin","menuCode":"statementForm","menuUrl":"/statementForm","authType":"menu","buttonCode":null,"menuName":"对账单","menuIcon":null,"parentId":"order","path":"/statementForm","title":"对账单","icon":"","subs":null}]},{"muaId":6,"roleCode":"admin","menuCode":"role","menuUrl":"9","authType":"menu","buttonCode":null,"menuName":"基础档案","menuIcon":"el-icon-lx-people","parentId":"","path":"9","title":"基础档案","icon":"el-icon-lx-people","subs":[{"muaId":7,"roleCode":"admin","menuCode":"customerManage","menuUrl":"/customerManage","authType":"menu","buttonCode":null,"menuName":"客户","menuIcon":null,"parentId":"role","path":"/customerManage","title":"客户","icon":"","subs":null},{"muaId":8,"roleCode":"admin","menuCode":"workerManage","menuUrl":"/workerManage","authType":"menu","buttonCode":null,"menuName":"员工","menuIcon":null,"parentId":"role","path":"/workerManage","title":"员工","icon":"","subs":null}]},{"muaId":9,"roleCode":"admin","menuCode":"system","menuUrl":"/i18n","authType":"menu","buttonCode":null,"menuName":"系统日志","menuIcon":"el-icon-lx-global","parentId":"","path":"/i18n","title":"系统日志","icon":"el-icon-lx-global","subs":null}]);
            }  
            if(['ywy'].includes(newUser.userType)) {
                newUser.menuList = JSON.stringify([{
                    "muaId":1,"roleCode":"admin","menuCode":"home","menuUrl":"/dashboard","authType":"menu","buttonCode":null,"menuName":"系统首页",
                    "menuIcon":"el-icon-lx-home","parentId":"","path":"/dashboard","title":"系统首页","icon":"el-icon-lx-home","subs":null},
                    {"muaId":2,"roleCode":"admin","menuCode":"order","menuUrl":"8","authType":"menu","buttonCode":null,"menuName":"订单管理","menuIcon":"el-icon-lx-calendar",
                        "parentId":"","path":"8","title":"订单管理","icon":"el-icon-lx-calendar",
                        "subs":[
                            {"muaId":3,"roleCode":"admin","menuCode":"orderForm","menuUrl":"/orderForm","authType":"menu","buttonCode":null,"menuName":"订货单",
                                "menuIcon":null,"parentId":"order","path":"/orderForm","title":"订货单","icon":"","subs":null},
                            {"muaId":4,"roleCode":"admin","menuCode":"dispatchForm","menuUrl":"/dispatchForm","authType":"menu","buttonCode":null,
                                "menuName":"发货单","menuIcon":null,"parentId":"order","path":"/dispatchForm","title":"发货单","icon":"","subs":null},
                            {"muaId":5,"roleCode":"admin","menuCode":"statementForm","menuUrl":"/statementForm","authType":"menu","buttonCode":null,"menuName":"对账单",
                                "menuIcon":null,"parentId":"order","path":"/statementForm","title":"对账单","icon":"","subs":null}
                            ]
                    }
                ])
            }

            user.consumer.create([newUser], (err) => {
                if (!err) {
                    console.log('添加成功')
                } else {
                    throw err;
                }
            })

            return
        }

        // 存在用户角色 更新用户信息
        let param = docs[0];
        param.name = name;
        param.idNumber = id;
        if(carNum) {
            param.carNum = carNum;
        }
        if(company) {
            param.company = company;
        }
        user.consumer.updateOne({ _id: param._id }, param , function(err, resp) {
            if (err) {
                console.log(err);
                return;
            }
            console.log('成功', resp)
        })
    })
}


// 新增订单
router.post('/addOrder', function(req, res, next) {
    let query = req.body;
    console.log(query.orderNo);
    consumer.find({ orderNo: query.orderNo }, {}, (err, docs) => {
        if (docs.length === 0 || query.phone.trim() == '') {
            
            let newOrder = {...query,token:''};
            newOrder.makeTime = moment().format('YYYY年MM月DD日 HH:mm');

            consumer.create([newOrder], (err) => {
                if (!err) {
                    console.log('添加成功')

                    let {carNum,company,payName,payPhone,payIdNum,ywyName,ywyPhone,orderNo,deliveryName,deliveryPhone} = query;

                    judgeUser('ywy',ywyName,ywyPhone,'','','');  // 业务员
                    judgeUser('',payName,payPhone,payIdNum,company,''); // 结算人
                    judgeUser('',deliveryName,deliveryPhone,'','',carNum);   // 司机 送货人


                    let smsParam = {
                        nowDate: newOrder.makeTime,
                        carNum,
                        company,
                        orderNo,
                        deliveryName,
                        deliveryPhone
                    }

                    // 发送给 司机
                    sms.send(query.deliveryPhone,'SMS_230656484',smsParam).then((result) => {
                        console.log("短信发送成功")
                        console.log(result)
                    }, (ex) => {
                        console.log("短信发送失败")
                        console.log(ex)
                    });


                    // 打印日志
                    let newLog = {
                        orderNo: query.orderNo,
                        name: query.makerName,
                        phone: query.makerPhone,
                        idNum: query.makerIdNum,
                        time: moment().format('YYYY年MM月DD日 HH:mm'),
                        doneStr: '新增发货单',
                        platform: 'web后台',
                        location: '',
                    }
                    log.consumer.create([newLog], (err) => {
                        if (!err) {
                            console.log('日志新增成功')
                        } else {
                            throw err;
                        }
                    })

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