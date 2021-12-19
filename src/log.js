// 日志
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router(); // 输出一个路由中间件
const fs = require('fs');
const json2xls = require('json2xls'); //生成excel
const moment = require("moment");

// 2、创建 schema
let Schema = mongoose.Schema;
let consumerInfo = new Schema({
    name: String,
    phone: String, 
    idNum: String,
    time: String,
    doneStr: String,
    platform: String,
});

// 3、 创建Model 对象  对接表名称
let consumer = mongoose.model("log", consumerInfo)


// 查询日志
router.get('/', function(req, res, next) {
    let query = req.query
    let { time } = query;
    let qq = { time};

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
            list = docs.reverse();
            list = list.splice((query.page - 1) * query.pageNum, query.pageNum);
            res.send({ code:200,list, pages })
            next();
        } else {
            throw err
        }
    })
});


// 新增日志
router.post('/addLog', function(req, res, next) {
    let query = req.body;
    consumer.create([newOrder], (err) => {
        if (!err) {

            let {name,phone, idNum, time,doneStr,platform} = newOrder;

            consumer.find({...query }, {}, (err, docs) => {
                res.send({ docs, code: 200, msg:'新增成功' })
                return
            })
        } else {
            throw err;
        }
    })
})

// 导出模块（在 其他木块 中引入）
module.exports = { router, consumer };