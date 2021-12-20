// 对账单
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

// 2、创建 schema
let Schema = mongoose.Schema;
let consumerInfo = new Schema({
    orderNo: String,
    company: String,  // 客户单位
    checkName: String,
    checkPhone: String,
    checkIdNum: String,
    ywyName: String,
    ywyPhone: String,
    finaceName: String,
    finacePhone: String,
    fileList: Array,
    makerName: String,
    makerPhone: String,
    makeTime: String,
    confirmTime: String,
    orderStat: String,  // 订单状态
    location: String,  // 确认位置信息
    deviceInfo: String,  //设备信息
    imei: String,
    timePeriod: String,  // 短信通知往来时间
});


// 3、 创建Model 对象  对接表名称
let consumer = mongoose.model("statementForm", consumerInfo)

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
                    let str = ele.name + '' + ele.orderNo + ''+ ele.checkName + ele.checkPhone + ele.checkIdNum +
                         ele.ywyName + ele.ywyPhone + ele.makerName + ele.makerPhone + ele.finaceName + ele.finacePhone;
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
            str = '待确认';
        break
        case '1': 
            str = '已确认';
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
            let list = [];

            if (query.keyword && query.keyword.trim() !== '') {  // 存在关键字
                docs.forEach((ele) => {
                    let str = ele.name + '' + ele.orderNo + ''+ ele.checkName + ele.checkPhone + ele.checkIdNum +
                         ele.ywyName + ele.ywyPhone + ele.makerName + ele.makerPhone + ele.finaceName + ele.finacePhone;

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
                {'checkName':'对账人'},
                {'checkPhone':'对账人电话'},
                {'checkIdNum':'对账人身份证'},
                {'ywyName':'业务员'},
                {'ywyPhone':'电话'},
                {'makerName':'制单员'},
                {'makerPhone':'电话'}
            ]
            
            //  参数 路excel 下的路径 + 文件名； sheet名称； 描述信息（暂时无用）； 表头； 表数据
            let filename = excel.createReportFile('/statement' + date,'sheet1',[],header,list);

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

    if(query.orderStat == '1') {  // 记录确认时间
        query.confirmTime = moment().format('YYYY年MM月DD日 HH:mm');
    }

    consumer.updateOne({ _id: query._id }, {...query }, function(err, resp) {
        if (err) {
            console.log(err);
            return;
        }
        if(query.orderStat == '9') {
            console.log('作废')
        }
    
        if(query.orderStat == '1') {
            console.log('确认对账单')
            let {company,timePeriod,finaceName,finacePhone,ywyName,ywyPhone,checkName,checkPhone} = query;
            // 发送给 对账人
            sms.send(query.checkPhone,'SMS_230675129',{company,timePeriod,finaceName,checkName,finacePhone,ywyName,ywyPhone}).then((result) => {
                console.log("短信发送成功")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败")
                console.log(ex)
            });
            // 发送给 业务员
            sms.send(query.ywyPhone,'SMS_229643202',{company,timePeriod,checkName,checkPhone}).then((result) => {
                console.log("短信发送成功")
                console.log(result)
            }, (ex) => {
                console.log("短信发送失败")
                console.log(ex)
            });
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


function judgeUser(userType,name,phone,id,company) {
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
                userType: userType,
                roleName: roleName,  // 工作人员角色中文
                token: '',
                randomNum: '',
                menuList: '',
                mark: '',
            }

            if(['xsnq','cw'].includes(newUser.userType)) {  // 工作人员 要保存密码
                newUser.password = '123456';
                newUser.menuList = JSON.stringify([{"muaId":1,"roleCode":"admin","menuCode":"home","menuUrl":"/dashboard","authType":"menu","buttonCode":null,"menuName":"系统首页","menuIcon":"el-icon-lx-home","parentId":"","path":"/dashboard","title":"系统首页","icon":"el-icon-lx-home","subs":null},{"muaId":2,"roleCode":"admin","menuCode":"order","menuUrl":"8","authType":"menu","buttonCode":null,"menuName":"订单管理","menuIcon":"el-icon-lx-calendar","parentId":"","path":"8","title":"订单管理","icon":"el-icon-lx-calendar","subs":[{"muaId":3,"roleCode":"admin","menuCode":"orderForm","menuUrl":"/orderForm","authType":"menu","buttonCode":null,"menuName":"订货单","menuIcon":null,"parentId":"order","path":"/orderForm","title":"订货单","icon":"","subs":null},{"muaId":4,"roleCode":"admin","menuCode":"dispatchForm","menuUrl":"/dispatchForm","authType":"menu","buttonCode":null,"menuName":"发货单","menuIcon":null,"parentId":"order","path":"/dispatchForm","title":"发货单","icon":"","subs":null},{"muaId":5,"roleCode":"admin","menuCode":"statementForm","menuUrl":"/statementForm","authType":"menu","buttonCode":null,"menuName":"对账单","menuIcon":null,"parentId":"order","path":"/statementForm","title":"对账单","icon":"","subs":null}]},{"muaId":6,"roleCode":"admin","menuCode":"role","menuUrl":"9","authType":"menu","buttonCode":null,"menuName":"基础档案","menuIcon":"el-icon-lx-people","parentId":"","path":"9","title":"基础档案","icon":"el-icon-lx-people","subs":[{"muaId":7,"roleCode":"admin","menuCode":"customerManage","menuUrl":"/customerManage","authType":"menu","buttonCode":null,"menuName":"客户","menuIcon":null,"parentId":"role","path":"/customerManage","title":"客户","icon":"","subs":null},{"muaId":8,"roleCode":"admin","menuCode":"workerManage","menuUrl":"/workerManage","authType":"menu","buttonCode":null,"menuName":"员工","menuIcon":null,"parentId":"role","path":"/workerManage","title":"员工","icon":"","subs":null}]},{"muaId":9,"roleCode":"admin","menuCode":"system","menuUrl":"/i18n","authType":"menu","buttonCode":null,"menuName":"系统设置","menuIcon":"el-icon-lx-global","parentId":"","path":"/i18n","title":"系统设置","icon":"el-icon-lx-global","subs":null}]);
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
                    console.log('添加成功',newUser)
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
                    let {company,timePeriod,finaceName,finacePhone,ywyName,ywyPhone,checkName,checkPhone,checkIdNum} = query;


                    // 用户信息判断
                    judgeUser('ywy',ywyName,ywyPhone,'','');
                    judgeUser('cw',finaceName,finacePhone,'','');
                    judgeUser('',checkName,checkPhone,checkIdNum,company);


                    // 发送给 对账人
                    sms.send(query.checkPhone,'SMS_230010501',{company,timePeriod,finaceName,finacePhone,ywyName,ywyPhone}).then((result) => {
                        console.log("短信发送成功")
                        console.log(result)
                    }, (ex) => {
                        console.log("短信发送失败")
                        console.log(ex)
                    });
                    // 发送给 业务员
                    sms.send(query.ywyPhone,'SMS_229648309',{company,timePeriod,finaceName,finacePhone,checkName,checkPhone}).then((result) => {
                        console.log("短信发送成功")
                        console.log(result)
                    }, (ex) => {
                        console.log("短信发送失败")
                        console.log(ex)
                    });
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