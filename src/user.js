// 用户信息
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
    password: String,
    phone: String,
    idNumber: String,
    userType: String,
    roleName: String,  // 工作人员角色中文
    token: String,
    randomNum: String,
    menuList: String,
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
    let { name, phone, userType } = query;
    let qq = { name, phone, userType };
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
            
            let newUser = {...query,token:'',randomNum:''};

            if(['ywy','xsnq'].includes(newUser.userType)) {  // 工作人员 要保存密码
                newUser.password = '123456';
                newUser.menuList = JSON.stringify([{"muaId":1,"roleCode":"admin","menuCode":"home","menuUrl":"/dashboard","authType":"menu","buttonCode":null,"menuName":"系统首页","menuIcon":"el-icon-lx-home","parentId":"","path":"/dashboard","title":"系统首页","icon":"el-icon-lx-home","subs":null},{"muaId":2,"roleCode":"admin","menuCode":"order","menuUrl":"8","authType":"menu","buttonCode":null,"menuName":"订单管理","menuIcon":"el-icon-lx-calendar","parentId":"","path":"8","title":"订单管理","icon":"el-icon-lx-calendar","subs":[{"muaId":3,"roleCode":"admin","menuCode":"orderForm","menuUrl":"/orderForm","authType":"menu","buttonCode":null,"menuName":"订货单","menuIcon":null,"parentId":"order","path":"/orderForm","title":"订货单","icon":"","subs":null},{"muaId":4,"roleCode":"admin","menuCode":"dispatchForm","menuUrl":"/dispatchForm","authType":"menu","buttonCode":null,"menuName":"发货单","menuIcon":null,"parentId":"order","path":"/dispatchForm","title":"发货单","icon":"","subs":null},{"muaId":5,"roleCode":"admin","menuCode":"statementForm","menuUrl":"/statementForm","authType":"menu","buttonCode":null,"menuName":"对账单","menuIcon":null,"parentId":"order","path":"/statementForm","title":"对账单","icon":"","subs":null}]},{"muaId":6,"roleCode":"admin","menuCode":"role","menuUrl":"9","authType":"menu","buttonCode":null,"menuName":"角色管理","menuIcon":"el-icon-lx-people","parentId":"","path":"9","title":"角色管理","icon":"el-icon-lx-people","subs":[{"muaId":7,"roleCode":"admin","menuCode":"customerManage","menuUrl":"/customerManage","authType":"menu","buttonCode":null,"menuName":"客户管理","menuIcon":null,"parentId":"role","path":"/customerManage","title":"客户管理","icon":"","subs":null},{"muaId":8,"roleCode":"admin","menuCode":"workerManage","menuUrl":"/workerManage","authType":"menu","buttonCode":null,"menuName":"员工管理","menuIcon":null,"parentId":"role","path":"/workerManage","title":"员工管理","icon":"","subs":null},{"muaId":24,"roleCode":"admin","menuCode":"driverManage","menuUrl":"/driverManage","authType":"menu","buttonCode":null,"menuName":"司机管理","menuIcon":null,"parentId":"role","path":"/driverManage","title":"司机管理","icon":"","subs":null}]},{"muaId":9,"roleCode":"admin","menuCode":"system","menuUrl":"/i18n","authType":"menu","buttonCode":null,"menuName":"系统设置","menuIcon":"el-icon-lx-global","parentId":"","path":"/i18n","title":"系统设置","icon":"el-icon-lx-global","subs":null}]);
            }  

            consumer.create([newUser], (err) => {
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

// web 登录
router.post('/webLogin', function(req, res, next) {
    let query = req.body;
    consumer.find({ name: query.name, phone: query.phone }, {}, (err, docs) => {

        if (docs.length === 0 || query.phone.trim() == '') {

            res.send({ code: 302, message: '该用户不存在' });
            
        } else {
            let person = {...docs[0]._doc};

            // 判断是否有后台权限

            if(!['ywy','xsnq'].includes(person.userType)) {
                res.send({ code: 302, message: '该用户无后台权限' });
                return
            } 



            // 将token添加进去
            let token = MD5(person.name + '' + person.phone);
            person.token = 'WQ ' + token;
            consumer.updateOne({ _id: person._id }, {...person }, function(err, resp) {
                if (err) {
                    console.log(err);
                    return;
                }
                console.log('成功')
                consumer.find({ _id: person._id }, {}, (err, Redocs) => {
                    res.send({ 
                        code: 200,
                        message: '登录成功',
                        data: {
                            user:Redocs[0],
                            menuList: Redocs[0].menuList
                        }
                    })
                    next();
                })
            })
        }
    })
})

// mobile 登录


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