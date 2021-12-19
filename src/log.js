// 日志
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router(); // 输出一个路由中间件
const fs = require('fs');
const json2xls = require('json2xls'); //生成excel
const MD5 = require('md5-node');
const sms = require("../utils/aliMsg");
const moment = require("moment");
const user = require('../user');  // 用户list 用来判别新增用户

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