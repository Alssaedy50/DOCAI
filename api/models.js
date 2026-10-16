const C=[
{id:'gemini:gemini-2.5-flash',provider:'gemini',model:'gemini-2.5-flash',name:'Gemini 2.5 Flash',specialty:'سريع ومتوازن'},
{id:'gemini:gemini-2.0-flash',provider:'gemini',model:'gemini-2.0-flash',name:'Gemini 2.0 Flash',specialty:'مهام سريعة'},
{id:'groq:llama-3.3-70b-versatile',provider:'groq',model:'llama-3.3-70b-versatile',name:'Llama 3.3 70B · Groq',specialty:'تحليل واستدلال'},
{id:'groq:llama-3.1-8b-instant',provider:'groq',model:'llama-3.1-8b-instant',name:'Llama 3.1 8B Instant · Groq',specialty:'استجابة سريعة'},
{id:'openrouter:deepseek/deepseek-r1:free',provider:'openrouter',model:'deepseek/deepseek-r1:free',name:'DeepSeek R1 Free · OpenRouter',specialty:'استدلال وتحليل'},
{id:'openrouter:qwen/qwen-2.5-72b-instruct:free',provider:'openrouter',model:'qwen/qwen-2.5-72b-instruct:free',name:'Qwen 2.5 72B Free · OpenRouter',specialty:'العربية والتعليمات'}];
module.exports=async function(req,res){
res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'استخدم POST لإرسال مفاتيح الجلسة للاختبار.'});}
const b=typeof req.body==='string'?(()=>{try{return JSON.parse(req.body)}catch{return {}}})():(req.body||{}),keys=b.keys||{};
const available=C.filter(m=>String(keys[m.provider]||'').trim());if(!available.length)return res.status(400).json({error:'أدخل مفتاحاً واحداً على الأقل من إعدادات الموقع.'});
const results=await Promise.all(available.map(async m=>{try{
let url,headers={'Content-Type':'application/json'},body,key=String(keys[m.provider]).trim();
if(m.provider==='gemini'){url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(m.model)+':generateContent?key='+encodeURIComponent(key);body={contents:[{parts:[{text:'Reply with exactly: OK'}]}],generationConfig:{temperature:0,maxOutputTokens:8}};}
else{url=m.provider==='groq'?'https://api.groq.com/openai/v1/chat/completions':'https://openrouter.ai/api/v1/chat/completions';headers.Authorization='Bearer '+key;if(m.provider==='openrouter'){headers['HTTP-Referer']='https://github.com/Alssaedy50/DOCAI';headers['X-Title']='ALSSAEDY CLINIC ERP';}body={model:m.model,messages:[{role:'user',content:'Reply with exactly: OK'}],temperature:0,max_tokens:8};}
const r=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(9000)}),d=await r.json().catch(()=>({}));if(!r.ok)return null;
const ans=m.provider==='gemini'?(d.candidates?.[0]?.content?.parts||[]).map(p=>p.text||'').join(''):(d.choices?.[0]?.message?.content||'');if(!String(ans).trim())return null;
const limits={};for(const [h,k] of [['x-ratelimit-limit-requests','requestsLimit'],['x-ratelimit-remaining-requests','requestsRemaining'],['x-ratelimit-reset-requests','requestsReset'],['x-ratelimit-limit-tokens','tokensLimit'],['x-ratelimit-remaining-tokens','tokensRemaining']]){const v=r.headers.get(h);if(v!==null)limits[k]=v;}
return {...m,status:'tested-ok',testedAt:new Date().toISOString(),testResponse:String(ans).slice(0,40),costClass:m.provider==='openrouter'&&m.model.endsWith(':free')?'مسار مجاني؛ الحصة حسب الحساب':m.provider==='gemini'?'حصة مجانية/مدفوعة حسب حساب Gemini':'حصة حسب حساب Groq',limits};
}catch{return null;}}));
return res.status(200).json({testedAt:new Date().toISOString(),models:results.filter(Boolean),notice:'عرض النماذج الناجحة فقط. الاختبار يستهلك طلباً وقد تتغير الحصة.'});
};