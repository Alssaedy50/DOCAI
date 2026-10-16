const crypto = require('node:crypto');
function safeEqual(a,b){const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&crypto.timingSafeEqual(x,y);}
function sign(payload,secret){const data=Buffer.from(JSON.stringify(payload)).toString('base64url');return data+'.'+crypto.createHmac('sha256',secret).update(data).digest('base64url');}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
 const password=process.env.CLINIC_APP_PASSWORD,secret=process.env.SESSION_SECRET;
 if(!password||!secret||secret.length<32)return res.status(503).json({error:'إعداد الدخول ناقص: اضبط CLINIC_APP_PASSWORD و SESSION_SECRET (32 حرفاً على الأقل).'});
 const body=typeof req.body==='string'?(()=>{try{return JSON.parse(req.body)}catch{return {}}})():(req.body||{});
 if(!safeEqual(body.password,password))return res.status(401).json({error:'كلمة المرور غير صحيحة.'});
 const now=Math.floor(Date.now()/1000),data=Buffer.from(JSON.stringify({iat:now,exp:now+8*60*60})).toString('base64url'),sig=crypto.createHmac('sha256',secret).update(data).digest('base64url');
 res.setHeader('Set-Cookie','clinic_session='+data+'.'+sig+'; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800');
 return res.status(200).json({ok:true,expiresIn:28800});
};