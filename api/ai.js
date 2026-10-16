const MODELS={
 'gemini:gemini-2.5-flash':{provider:'gemini',model:'gemini-2.5-flash'},
 'gemini:gemini-2.0-flash':{provider:'gemini',model:'gemini-2.0-flash'},
 'groq:llama-3.3-70b-versatile':{provider:'groq',model:'llama-3.3-70b-versatile'},
 'groq:llama-3.1-8b-instant':{provider:'groq',model:'llama-3.1-8b-instant'},
 'openrouter:deepseek/deepseek-r1:free':{provider:'openrouter',model:'deepseek/deepseek-r1:free'},
 'openrouter:qwen/qwen-2.5-72b-instruct:free':{provider:'openrouter',model:'qwen/qwen-2.5-72b-instruct:free'}
};
function sendError(res,status,error){return res.status(status).json({error});}
async function invoke(provider,model,prompt,system,keys,attachments=[]){
 const key=String(keys[provider]||'').trim();if(!key)throw Error('أدخل مفتاح '+provider.toUpperCase()+' من الإعدادات.');
 let url,headers={'Content-Type':'application/json'},body;
 if(provider==='gemini'){
  url='https://generativelanguage.googleapis.com/v1beta/models/'+encodeURIComponent(model)+':generateContent?key='+encodeURIComponent(key);
  const parts=[{text:String(system||'مساعد عيادة')+'\n\n'+prompt}];
  for(const a of attachments){if(a&&a.type==='image'){const mime=String(a.mime||'image/jpeg'),data=String(a.data||'');if(/^image\/(png|jpeg|webp|gif)$/.test(mime)&&/^[A-Za-z0-9+/=]+$/.test(data)&&data.length<3500000)parts.push({inlineData:{mimeType:mime,data}});}}
  body={contents:[{parts}],generationConfig:{temperature:.2,maxOutputTokens:4096}};
 }else{
  url=provider==='groq'?'https://api.groq.com/openai/v1/chat/completions':'https://openrouter.ai/api/v1/chat/completions';
  headers.Authorization='Bearer '+key;if(provider==='openrouter'){headers['HTTP-Referer']='https://github.com/Alssaedy50/DOCAI';headers['X-Title']='ALSSAEDY CLINIC ERP';}
  body={model,messages:[{role:'system',content:String(system||'مساعد عيادة')},{role:'user',content:prompt}],temperature:.2,max_tokens:4096};
 }
 const r=await fetch(url,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(30000)}),d=await r.json().catch(()=>({}));
 if(!r.ok){const msg=d?.error?.message||d?.message||('HTTP '+r.status);throw Error(provider.toUpperCase()+': '+String(msg).slice(0,180));}
 const answer=provider==='gemini'?(d.candidates?.[0]?.content?.parts||[]).map(x=>x.text||'').join(''):(d.choices?.[0]?.message?.content||'');
 if(!String(answer).trim())throw Error(provider.toUpperCase()+' لم يُرجع نصاً.');
 return {result:String(answer),provider,model};
}
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
 if(req.method!=='POST'){res.setHeader('Allow','POST');return sendError(res,405,'Method not allowed');}
 const b=typeof req.body==='string'?(()=>{try{return JSON.parse(req.body)}catch{return {}}})():(req.body||{});
 const prompt=String(b.prompt||''),system=String(b.systemPrompt||''),ctx=String(b.clinicContext||''),keys=b.keys&&typeof b.keys==='object'?b.keys:{};
 if(!prompt.trim())return sendError(res,400,'الرسالة فارغة.');
 if(Buffer.byteLength(prompt+system+ctx,'utf8')>180000)return sendError(res,413,'حجم السياق كبير. حدّد السؤال أو قسّم التقرير.');
 const attachments=Array.isArray(b.attachments)?b.attachments.slice(0,4):[];
 if(attachments.some(a=>String(a?.dataUrl||'').length>4500000))return sendError(res,413,'حجم المرفق كبير؛ قلّل الحجم.');
 const id=String(b.model||'auto'),chosen=MODELS[id],list=chosen?[chosen]:Object.values(MODELS).filter(m=>String(keys[m.provider]||'').trim()).filter((m,i,a)=>a.findIndex(x=>x.provider===m.provider)===i);
 if(!list.length)return sendError(res,400,'أدخل مفتاح Gemini أو Groq أو OpenRouter في الإعدادات ثم افحص النماذج.');
 const errors=[];
 for(const m of list){try{const out=await invoke(m.provider,m.model,prompt+(ctx?'\n\nالسياق المحدد:\n'+ctx:''),system,keys,attachments);return res.status(200).json(out);}catch(e){errors.push(String(e.message||e));}}
 return sendError(res,502,'لم ينجح أي نموذج مختار: '+errors.slice(0,3).join(' | '));
};