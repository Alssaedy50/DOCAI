const CANDIDATES=[
 {id:'gemini:gemini-2.5-flash',provider:'gemini',model:'gemini-2.5-flash',name:'Gemini 2.5 Flash',specialty:'سريع ومتوازن'},
 {id:'gemini:gemini-2.0-flash',provider:'gemini',model:'gemini-2.0-flash',name:'Gemini 2.0 Flash',specialty:'مهام سريعة'},
 {id:'groq:llama-3.3-70b-versatile',provider:'groq',model:'llama-3.3-70b-versatile',name:'Llama 3.3 70B · Groq',specialty:'تحليل واستدلال'},
 {id:'groq:llama-3.1-8b-instant',provider:'groq',model:'llama-3.1-8b-instant',name:'Llama 3.1 8B Instant · Groq',specialty:'استجابة سريعة'},
 {id:'openrouter:deepseek/deepseek-r1:free',provider:'openrouter',model:'deepseek/deepseek-r1:free',name:'DeepSeek R1 Free · OpenRouter',specialty:'استدلال وتحليل'},
 {id:'openrouter:qwen/qwen-2.5-72b-instruct:free',provider:'openrouter',model:'qwen/qwen-2.5-72b-instruct:free',specialty:'العربية والتعليمات'}
];
const json=req=>typeof req.body==='string'?(()=>{try{return JSON.parse(req.body)}catch{return {}}})():(req.body||{});
async function test(m,keys){
 let key,url,headers={'Content-Type':'application/json'},body;
 if(m.provider==='gemini'){key=keys.gemini;if(!key)return null;url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(m.model)+':generateContent?key='+encodeURIComponent(key);body={contents:[{parts:[{text:'Reply with exactly: OK'}]}],generationConfig:{temperature:0,maxOutputTokens:8}};}
 else{key=m.provider==='groq'?keys.groq:keys.openrouter;if(!key)return null;url=m.provider==='groq'?'https://api.groq.com/openai/v1/chat/completions':'https://openrouter.ai/api/v1/chat/completions';headers.Authorization='Bearer '+key;if(m.provider==='openrouter'){headers['HTTP-Referer']='https://alssaedy-clinic-erp.vercel.app';headers['X-Title']='ALSSAEDY CLINIC ERP';}body={model:m.model,messages:[{role:'user',content:'Reply with exactly: OK'}],temperature:0,max_tokens:8};}
 const r=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(9000)}),d=await r.json().catch(()=>({}));
 if(!r.ok)return null;
 const answer=m.provider==='gemini'?(d.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join(''):(d.choices?.[0]?.message?.content||'');
 if(!String(answer).trim())return null;
 const free=m.provider==='openrouter'&&m.model.endsWith(':free'),limits={};
 for(const [h,k] of [['x-ratelimit-limit-requests','requestsLimit'],['x-ratelimit-remaining-requests','requestsRemaining'],['x-ratelimit-reset-requests','requestsReset'],['x-ratelimit-limit-tokens','tokensLimit'],['x-ratelimit-remaining-tokens','tokensRemaining']]){const v=r.headers.get(h);if(v!==null)limits[k]=v;}
 return {...m,status:'tested-ok',testedAt:new Date().toISOString(),testResponse:String(answer).trim().slice(0,80),costClass:free?'مسار مجاني معلن؛ الحصة اليومية/الدقيقة حسب حسابك':m.provider==='groq'?'خطة وحدود حساب Groq':m.provider==='gemini'?'خطة وحدود حساب Gemini':'تحقق من تسعير المزود',limits};
}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Use POST with provider keys from the settings screen.'});}
 const b=json(req),k=b.keys||{},keys={gemini:String(k.gemini||'').slice(0,500),groq:String(k.groq||'').slice(0,500),openrouter:String(k.openrouter||'').slice(0,500)};
 if(!keys.gemini&&!keys.groq&&!keys.openrouter)return res.status(400).json({error:'أدخل مفاتيح المزود في الإعدادات أولاً.'});
 const checks=await Promise.all(CANDIDATES.map(async m=>{try{return await test(m,keys)}catch{return null}})),results=checks.filter(Boolean);
 return res.status(200).json({testedAt:new Date().toISOString(),models:results,notice:'تعرض هذه القائمة النماذج التي أعادت استجابة فعلية غير فارغة الآن. قد تتغير الحصص والإتاحة لاحقاً.'});
};
