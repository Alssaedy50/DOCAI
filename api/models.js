const crypto = require('node:crypto');
function verified(req,secret){const c=String(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith('clinic_session='));if(!c)return false;const p=c.slice(15).split('.');if(p.length!==2)return false;const sig=crypto.createHmac('sha256',secret).update(p[0]).digest('base64url'),a=Buffer.from(p[1]),b=Buffer.from(sig);if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return false;try{return JSON.parse(Buffer.from(p[0],'base64url').toString()).exp>Math.floor(Date.now()/1000)}catch{return false}}
const CANDIDATES=[
 {id:'gemini:gemini-2.5-flash',provider:'gemini',model:'gemini-2.5-flash',name:'Gemini 2.5 Flash',specialty:'سريع ومتوازن'},
 {id:'gemini:gemini-2.0-flash',provider:'gemini',model:'gemini-2.0-flash',name:'Gemini 2.0 Flash',specialty:'مهام سريعة'},
 {id:'groq:llama-3.3-70b-versatile',provider:'groq',model:'llama-3.3-70b-versatile',name:'Llama 3.3 70B · Groq',specialty:'تحليل واستدلال'},
 {id:'groq:llama-3.1-8b-instant',provider:'groq',model:'llama-3.1-8b-instant',name:'Llama 3.1 8B Instant · Groq',specialty:'استجابة سريعة'},
 {id:'openrouter:deepseek/deepseek-r1:free',provider:'openrouter',model:'deepseek/deepseek-r1:free',name:'DeepSeek R1 Free · OpenRouter',specialty:'استدلال وتحليل'},
 {id:'openrouter:qwen/qwen-2.5-72b-instruct:free',provider:'openrouter',model:'qwen/qwen-2.5-72b-instruct:free',name:'Qwen 2.5 72B Free · OpenRouter',specialty:'العربية والتعليمات'}
];
async function test(m){
 let url,key,headers={'Content-Type':'application/json'},body;
 if(m.provider==='gemini'){key=process.env.GEMINI_API_KEY;if(!key)return null;url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(m.model)+':generateContent?key='+encodeURIComponent(key);body={contents:[{parts:[{text:'Reply with exactly: OK'}]}],generationConfig:{temperature:0,maxOutputTokens:8}};}
 else{key=m.provider==='groq'?process.env.GROQ_API_KEY:process.env.OPENROUTER_API_KEY;if(!key)return null;url=m.provider==='groq'?'https://api.groq.com/openai/v1/chat/completions':'https://openrouter.ai/api/v1/chat/completions';headers.Authorization='Bearer '+key;if(m.provider==='openrouter'){headers['HTTP-Referer']='https://alssaedy-clinic-erp.vercel.app';headers['X-Title']='ALSSAEDY CLINIC ERP';}body={model:m.model,messages:[{role:'user',content:'Reply with exactly: OK'}],temperature:0,max_tokens:8};}
 const r=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(7000)});const d=await r.json().catch(()=>({}));
 if(!r.ok)return null;
 const answer=m.provider==='gemini'?(d.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join(''):(d.choices?.[0]?.message?.content||'');
 if(!String(answer).trim())return null;
 const free=m.provider==='openrouter'&&m.model.endsWith(':free');
 const limits={};
 for(const [h,k] of [['x-ratelimit-limit-requests','requestsLimit'],['x-ratelimit-remaining-requests','requestsRemaining'],['x-ratelimit-reset-requests','requestsReset'],['x-ratelimit-limit-tokens','tokensLimit'],['x-ratelimit-remaining-tokens','tokensRemaining']]){const v=r.headers.get(h);if(v!==null)limits[k]=v;}
 return {...m,status:'tested-ok',testedAt:new Date().toISOString(),testResponse:String(answer).trim().slice(0,80),costClass:free?'مجاني حسب مسار OpenRouter':(m.provider==='groq'?'حصة/حدود حساب Groq':m.provider==='gemini'?'حصة/حدود حساب Gemini':'تحقق من التسعير'),limits};
}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='GET'&&req.method!=='POST'){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Method not allowed'});}
 const secret=process.env.SESSION_SECRET;if(!secret||secret.length<32||!process.env.CLINIC_APP_PASSWORD)return res.status(503).json({error:'إعداد الدخول غير مكتمل.'});
 if(!verified(req,secret))return res.status(401).json({error:'يلزم تسجيل الدخول.'});
 const results=[];for(const m of CANDIDATES){try{const v=await test(m);if(v)results.push(v);}catch(e){}}
 return res.status(200).json({testedAt:new Date().toISOString(),models:results,notice:'تظهر هنا النماذج التي أعادت استجابة اختبار ناجحة الآن فقط. قد تتغير الحصة أو الإتاحة بعد الاختبار.'});
};