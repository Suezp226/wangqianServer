// 七周年用户信息
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router(); // 输出一个路由中间件
const fs = require('fs');
const json2xls = require('json2xls'); //生成excel
const MD5 = require('md5-node');

// 2、创建 schema
let Schema = mongoose.Schema;
let consumerInfo = new Schema({
    name: String,
    phone: String,
    idNumber: String,
    userType: String,
    roleName: String,  // 工作人员角色中文
    token: String,
    randomNum: String
});

// 监控历史操作表
let processInfo = new Schema({
    doneDate: String,
    oldInfo: Object,
    newInfo: Object
});


// 3、 创建Model 对象
let consumer = mongoose.model("user", consumerInfo)
let kmPorcess = mongoose.model("kmPorcess", processInfo)
const token = 'f84d78f03d6c375a3558c02888803f148ddcff3a80f4189ca1c9d4d902c3c909';

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
    let { name, phone } = query;
    let qq = { name, phone };
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
                    let str = ele.name + '' + ele.phone + ''+ ele.idNumber;
                    if (!(str.indexOf(query.keyword) === -1)) {
                        list.unshift(ele); //倒序
                    }
                })
                pages.total = list.length;
            } else {
                list = docs.reverse();
            }
            list = list.splice((query.page - 1) * query.pageNum, query.pageNum);
            res.send({ list, pages })
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
router.post('/editUser', function(req, res, next) {
    console.log(req.body);
    let query = req.body;
    consumer.updateOne({ _id: query._id }, {...query }, function(err, resp) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('成功', resp)
        consumer.find({ _id: query._id }, {}, (err, docs) => {
            res.send({ docs, code: 200 })
            next();
        })
    })
})

// 删除用户
router.post('/deleteUser', function(req, res, next) {
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

// 新增用户信息
router.post('/addUser', function(req, res, next) {
    let query = req.body;
    console.log(query.phone);
    consumer.find({ phone: query.phone }, {}, (err, docs) => {
        if (docs.length === 0 || query.phone.trim() == '') {
            consumer.create([{...query,token:'',randomNum:''}], (err) => {
                if (!err) {
                    console.log('添加成功')
                    consumer.find({...query }, {}, (err, docs) => {
                        res.send({ docs, code: 200 })
                        return
                    })
                } else {
                    throw err;
                }
            })
        } else {
            res.send({ code: 302, msg: '已有改手机号的用户数据' });
        }
    })
})

// 登入

// 账号km1234   密码 8888888
router.post('/wqLogin', function(req, res, next) {
    let query = req.body;
    if (query.username === 'km1234' && query.password === MD5('88888888')) {
        let token = MD5(query.username) + query.password;
        let nowDate = new Date();
        let year = nowDate.getFullYear();
        let month = nowDate.getMonth() * 1 + 1;
        let day = nowDate.getDate();
        let kmToken = token + year + month;
        res.send({ code: 200, token: kmToken })
    } else {
        res.send({ code: 403, msg: '用户名或密码错误!' })
    }
    next();
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