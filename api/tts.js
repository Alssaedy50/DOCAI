const crypto = require('node:crypto');
function verified(req,secret){const c=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('clinic_session='));if(!c)return false;const p=c.slice(15).split('.');if(p.length!==2)return false;const sig=crypto.createHmac('sha256',secret).update(p[0]).digest('base64url'),a=Buffer.from(p[1]),b=Buffer.from(sig);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return false;try{return JSON.parse(Buffer.from(p[0],'base64url').toString()).exp>Math.floor(Date.now()/1000)}catch{return false}}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
 const secret=process.env.SESSION_SECRET;if(!secret||secret.length<32||!process.env.CLINIC_APP_PASSWORD)return res.status(503).json({error:'إعداد الدخول غير مكتمل.'});
 if(!verified(req,secret))return res.status(401).json({error:'يلزم تسجيل الدخول.'});
 if(!process.env.GROQ_API_KEY)return res.status(503).json({error:'الصوت المولّد بالنموذج يحتاج GROQ_API_KEY في إعدادات Vercel.'});
 const b=typeof req.body==='string'?(()=>{try{return JSON.parse(req.body)}catch{return {}}})():(req.body||{}),input=String(b.text||'').trim();
 if(!input)return res.status(400).json({error:'النص فارغ.'});
 if(input.length>200)return res.status(413).json({error:'حد خدمة الصوت العربي 200 حرف لكل طلب؛ قسّم النص.'});
 const voices=['abdullah','fahad','sultan','lulwa','noura','aisha'],voice=voices.includes(String(b.voice||'').toLowerCase())?String(b.voice).toLowerCase():'fahad';
 const r=await fetch('https://api.groq.com/openai/v1/audio/speech',{method:'POST',headers:{Authorization:'Bearer '+process.env.GROQ_API_KEY,'Content-Type':'application/json'},body:JSON.stringify({model:'canopylabs/orpheus-arabic-saudi',voice,input,response_format:'wav'}),signal:AbortSignal.timeout(25000)});
 if(!r.ok){const d=await r.text().catch(()=> '');return res.status(r.status===429?429:502).json({error:r.status===429?'بلغت حصة خدمة الصوت أو حد الطلبات.':'فشل توليد صوت النموذج: '+d.slice(0,180)});}
 const audio=Buffer.from(await r.arrayBuffer());res.setHeader('Content-Type','audio/wav');res.setHeader('Content-Length',audio.length);return res.status(200).send(audio);
};