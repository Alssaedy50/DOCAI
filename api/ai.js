const crypto = require('node:crypto');
function verified(req,secret){const c=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('clinic_session='));if(!c)return false;const p=c.slice(15).split('.');if(p.length!==2)return false;const sig=crypto.createHmac('sha256',secret).update(p[0]).digest('base64url'),a=Buffer.from(p[1]),b=Buffer.from(sig);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return false;try{return JSON.parse(Buffer.from(p[0],'base64url').toString()).exp>Math.floor(Date.now()/1000)}catch{return false}}
const MODELS={
 'gemini:gemini-2.5-flash':{provider:'gemini',model:'gemini-2.5-flash'},
 'gemini:gemini-2.0-flash':{provider:'gemini',model:'gemini-2.0-flash'},
 'groq:llama-3.3-70b-versatile':{provider:'groq',model:'llama-3.3-70b-versatile'},
 'groq:llama-3.1-8b-instant':{provider:'groq',model:'llama-3.1-8b-instant'},
 'openrouter:deepseek/deepseek-r1:free':{provider:'openrouter',model:'deepseek/deepseek-r1:free'},
 'openrouter:qwen/qwen-2.5-72b-instruct:free':{provider:'openrouter',model:'qwen/qwen-2.5-72b-instruct:free'}
};
async function invoke(provider,model,prompt,system){
 let url,key,body,headers={'Content-Type':'application/json'},r,d;
 if(provider==='gemini'){
  key=process.env.GEMINI_API_KEY;if(!key)throw Error('GEMINI_API_KEY غير مضبوط');
  url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent?key='+encodeURIComponent(key);
  body={contents:[{parts:[{text:String(system||'مساعد عيادة')+'\n\n'+prompt}]}],generationConfig:{temperature:0.2}};
 }else{
  key=provider==='groq'?process.env.GROQ_API_KEY:process.env.OPENROUTER_API_KEY;if(!key)throw Error('مفتاح '+provider.toUpperCase()+' غير مضبوط');
  url=provider==='groq'?'https://api.groq.com/openai/v1/chat/completions':'https://openrouter.ai/api/v1/chat/completions';headers.Authorization='Bearer '+key;
  if(provider==='openrouter'){headers['HTTP-Referer']='https://alssaedy-clinic-erp.vercel.app';headers['X-Title']='ALSSAEDY CLINIC ERP';}
  body={model:model,messages:[{role:'system',content:String(system||'مساعد عيادة')},{role:'user',content:prompt}],temperature:0.2};
 }
 r=await fetch(url,{method:'POST',headers:headers,body:JSON.stringify(body)});d=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(provider.toUpperCase()+' HTTP '+r.status);
 const result=provider==='gemini'?(d.candidates&&d.candidates[0]&&d.candidates[0].content&&d.candidates[0].content.parts||[]).map(x=>x.text||'').join(''):(d.choices&&d.choices[0]&&d.choices[0].message&&d.choices[0].message.content);
 if(!result)throw Error(provider.toUpperCase()+' لم يرجع نصاً');
 return {result:typeof result==='string'?result:JSON.stringify(result),provider:model};
}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
 const secret=process.env.SESSION_SECRET;if(!secret||secret.length<32||!process.env.CLINIC_APP_PASSWORD)return res.status(503).json({error:'إعداد الخادم ناقص؛ راجع README واضبط CLINIC_APP_PASSWORD و SESSION_SECRET.'});
 if(!verified(req,secret))return res.status(401).json({error:'يلزم تسجيل الدخول إلى خدمة AI أولاً.'});
 const b=typeof req.body==='string'?(()=>{try{return JSON.parse(req.body)}catch{return {}}})():(req.body||{}),p=String(b.prompt||''),sys=String(b.systemPrompt||''),ctx=String(b.clinicContext||'');
 if(!p.trim())return res.status(400).json({error:'الرسالة فارغة.'});
 if(Buffer.byteLength(p+sys+ctx,'utf8')>900000)return res.status(413).json({error:'الطلب كبير جداً؛ قلّل نطاق السجلات أو قسّم السؤال.'});
 const mode=String(b.model||'auto'),chosen=MODELS[mode],list=chosen?[chosen]:[
 ...(process.env.GEMINI_API_KEY?[MODELS['gemini:gemini-2.5-flash']]:[]),
 ...(process.env.GROQ_API_KEY?[MODELS['groq:llama-3.3-70b-versatile']]:[]),
 ...(process.env.OPENROUTER_API_KEY?[MODELS['openrouter:deepseek/deepseek-r1:free']]:[])
 ];
 if(!list.length)return res.status(503).json({error:'اضبط مفتاحاً واحداً على الأقل: GEMINI_API_KEY أو GROQ_API_KEY أو OPENROUTER_API_KEY.'});
 for(const m of list){try{return res.status(200).json(await invoke(m.provider,m.model,p+(ctx?'\n\n'+ctx:''),sys));}catch(e){}}
 return res.status(502).json({error:'تعذر إكمال الطلب. تحقق من المفتاح واسم النموذج وحصة المزود.',providersTried:list.map(x=>x.provider)});
};