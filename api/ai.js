const MODELS={
 'gemini:gemini-2.5-flash':{provider:'gemini',model:'gemini-2.5-flash'},
 'gemini:gemini-2.0-flash':{provider:'gemini',model:'gemini-2.0-flash'},
 'groq:llama-3.3-70b-versatile':{provider:'groq',model:'llama-3.3-70b-versatile'},
 'groq:llama-3.1-8b-instant':{provider:'groq',model:'llama-3.1-8b-instant'},
 'openrouter:deepseek/deepseek-r1:free':{provider:'openrouter',model:'deepseek/deepseek-r1:free'},
 'openrouter:qwen/qwen-2.5-72b-instruct:free':{provider:'openrouter',model:'qwen/qwen-2.5-72b-instruct:free'}
};
const json=(req)=>typeof req.body==='string'?(()=>{try{return JSON.parse(req.body)}catch{return {}}})():(req.body||{});
const clean=(x,n)=>String(x||'').slice(0,n);
function keysFrom(b){return {gemini:clean(b.keys?.gemini,500),groq:clean(b.keys?.groq,500),openrouter:clean(b.keys?.openrouter,500)}}
async function invoke(m,keys,prompt,system,attachments=[]){
 let url,key,headers={'Content-Type':'application/json'},body;
 if(m.provider==='gemini'){
  key=keys.gemini;if(!key)throw Error('أدخل مفتاح Gemini من الإعدادات.');
  url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(m.model)+':generateContent?key='+encodeURIComponent(key);
  const parts=[{text:clean(system||'مساعد عيادة',12000)+'\n\n'+prompt}];
  for(const a of attachments){if(a.type==='image'&&/^image\/(png|jpeg|webp|gif)$/.test(a.mime||'')&&typeof a.data==='string'&&a.data.length<5_000_000)parts.push({inlineData:{mimeType:a.mime,data:a.data}});else if(a.type==='text')parts.push({text:'\n\nمحتوى ملف '+clean(a.name,100)+':\n'+clean(a.text,50000)});}
  body={contents:[{parts}],generationConfig:{temperature:0.2}};
 }else{
  key=m.provider==='groq'?keys.groq:keys.openrouter;if(!key)throw Error('أدخل مفتاح '+m.provider.toUpperCase()+' من الإعدادات.');
  if(attachments.some(a=>a.type==='image'))throw Error('تحليل الصور في هذه النسخة يتطلب نموذج Gemini؛ أدخل مفتاح Gemini من الإعدادات أو أزل الصورة.');
  url=m.provider==='groq'?'https://api.groq.com/openai/v1/chat/completions':'https://openrouter.ai/api/v1/chat/completions';headers.Authorization='Bearer '+key;
  if(m.provider==='openrouter'){headers['HTTP-Referer']='https://alssaedy-clinic-erp.vercel.app';headers['X-Title']='ALSSAEDY CLINIC ERP';}
  const content=clean(system||'مساعد عيادة',12000)+'\n\n'+prompt+attachments.filter(a=>a.type==='text').map(a=>'\n\nمحتوى ملف '+clean(a.name,100)+':\n'+clean(a.text,50000)).join('');
  body={model:m.model,messages:[{role:'user',content}],temperature:0.2};
 }
 const r=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(45000)}),d=await r.json().catch(()=>({}));
 if(!r.ok)throw Error(m.provider.toUpperCase()+' HTTP '+r.status+' '+clean(d.error?.message||d.error||'',180));
 const result=m.provider==='gemini'?(d.candidates?.[0]?.content?.parts||[]).map(x=>x.text||'').join(''):(d.choices?.[0]?.message?.content);
 if(!result||!String(result).trim())throw Error(m.provider.toUpperCase()+' لم يرجع نصاً.');
 return {result:typeof result==='string'?result:JSON.stringify(result),provider:m.model};
}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
 const b=json(req),keys=keysFrom(b),p=clean(b.prompt,60000),sys=clean(b.systemPrompt,12000),ctx=clean(b.clinicContext,70000),attachments=Array.isArray(b.attachments)?b.attachments.slice(0,5):[];
 if(!p.trim())return res.status(400).json({error:'الرسالة فارغة.'});
 if(Buffer.byteLength(p+sys+ctx,'utf8')>150000)return res.status(413).json({error:'الطلب كبير جداً؛ قلّل نطاق السجلات أو قسّم السؤال.'});
 if(attachments.some(a=>!a||!['image','text'].includes(a.type)))return res.status(400).json({error:'نوع مرفق غير مدعوم.'});
 const mode=clean(b.model,100),chosen=MODELS[mode];
 const available=Object.entries(keys).filter(([k,v])=>!!v).map(([k])=>k);
 if(!available.length)return res.status(400).json({error:'أدخل مفتاح مزود واحداً على الأقل من الإعدادات ثم اضغط فحص النماذج.'});
 let list=chosen?[chosen]:[
 ...(keys.gemini?[MODELS['gemini:gemini-2.5-flash']]:[]),
 ...(keys.groq?[MODELS['groq:llama-3.3-70b-versatile']]:[]),
 ...(keys.openrouter?[MODELS['openrouter:deepseek/deepseek-r1:free']]:[])
 ];
 if(attachments.some(a=>a.type==='image'))list=list.filter(m=>m.provider==='gemini');
 if(!list.length)return res.status(400).json({error:'لتحليل الصور، أدخل مفتاح Gemini واختر نموذج Gemini اجتاز الاختبار.'});
 const prompt=p+(ctx?'\n\nالسياق المحدد من بيانات العيادة:\n'+ctx:'');
 const errors=[];
 for(const m of list){try{return res.status(200).json(await invoke(m,keys,prompt,sys,attachments));}catch(e){errors.push(m.provider+': '+clean(e.message,180));}}
 return res.status(502).json({error:'فشل الطلب لدى النماذج المتاحة.',details:errors});
};
