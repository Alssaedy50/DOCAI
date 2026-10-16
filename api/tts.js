module.exports=async function(req,res){
res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
if(req.method!=='POST'){res.setHeader('Allow','POST');return res.status(405).json({error:'Method not allowed'});}
const b=typeof req.body==='string'?(()=>{try{return JSON.parse(req.body)}catch{return {}}})():(req.body||{}),key=String(b.keys?.groq||'').trim(),input=String(b.text||'').trim();
if(!key)return res.status(400).json({error:'اضبط GROQ_API_KEY في Vercel أو أدخل Groq API Key في إعدادات الموقع لتوليد الصوت.'});
if(!input)return res.status(400).json({error:'النص فارغ.'});if(input.length>200)return res.status(413).json({error:'حد الصوت 200 حرف لكل مقطع.'});
const voices=['abdullah','fahad','sultan','lulwa','noura','aisha'],voice=voices.includes(String(b.voice||'').toLowerCase())?String(b.voice).toLowerCase():'fahad';
const r=await fetch('https://api.groq.com/openai/v1/audio/speech',{method:'POST',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({model:'canopylabs/orpheus-arabic-saudi',voice,input,response_format:'wav'}),signal:AbortSignal.timeout(25000)});
if(!r.ok){const msg=await r.text().catch(()=> '');return res.status(r.status===429?429:502).json({error:r.status===429?'بلغت الحصة أو حد الطلبات.':'فشل توليد صوت النموذج: '+msg.slice(0,140)});}
const audio=Buffer.from(await r.arrayBuffer());res.setHeader('Content-Type','audio/wav');res.setHeader('Content-Length',audio.length);return res.status(200).send(audio);
};