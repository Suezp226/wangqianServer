/**
 * sms.send(手机号) 发送短信验证码
 * sms.verify(手机号,验证码) 校验验证码是否正确
 **/
 
 const Core = require('@alicloud/pop-core');
  
 // 阿里云控制台 - 短信服务 - 国内消息
 const SignName = "贵州黔峰管业有限公司";
//  const TemplateCode = "SMS_226825561";
  
 // https://usercenter.console.aliyun.com/
 const accessKeyId = "LTAI5tGLoMGky94EuDVF4CXB";
 const accessKeySecret = "fEbrPWF6fiG08rmbQEUM7EFvsz8oOo";
  
 var client = new Core({
     accessKeyId,
     accessKeySecret,
     endpoint: 'https://dysmsapi.aliyuncs.com',
     apiVersion: '2017-05-25'
 });
  
 exports.send = function(phone,TemplateCode,param) {
     console.log(phone)
    // 发送短信
     return new Promise((resolve, reject) => {
         try {
             client.request('SendSms', {
                 RegionId: "cn-hangzhou",
                 PhoneNumbers: phone,
                 SignName,
                 TemplateCode,
                 TemplateParam: JSON.stringify(param)
             }, {
                 method: 'POST'
             }).then((result) => {
                 if (result.Message && result.Message == "OK" && result.Code && result.Code == "OK") { // 短信发送成功
                     resolve(result)
                 } else {
                     reject(result)
                 }
             }, (ex) => {
                 reject(ex)
             })
         } catch (error) {
             reject(error)
         }
     })
 }