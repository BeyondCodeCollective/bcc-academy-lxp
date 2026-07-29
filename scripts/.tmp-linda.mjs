import { createClient } from "@supabase/supabase-js";
import { chromium } from "@playwright/test";
const URL_=process.env.NEXT_PUBLIC_SUPABASE_URL, ANON=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const svc=createClient(URL_,process.env.SUPABASE_SERVICE_ROLE_KEY);
const ref=new URL(URL_).hostname.split(".")[0];
const { data:progs }=await svc.from("programs").select("id, slug");
const cat=progs.find(p=>p.slug==="catalyst"), bcc=progs.find(p=>p.slug==="beyond-code-centers");
// Linda's exact shape: admin, home Catalyst, ONE grant (Beyond Code Centers).
const email=`zz-linda-${crypto.randomUUID().slice(0,8)}@example.invalid`, password=crypto.randomUUID();
const { data:c }=await svc.auth.admin.createUser({email,password,email_confirm:true});
const uid=c.user.id;
await svc.from("students").insert({id:uid,email,first_name:"Zz",last_name:"Linda",role:"admin",program_id:cat.id});
const g=await svc.from("staff_program_access").insert({student_id:uid,program_id:bcc.id});
console.log("grant insert:", g.error? "FAILED "+g.error.message : "ok (beyond-code-centers)");
try{
  const pub=createClient(URL_,ANON);
  const { data:s }=await pub.auth.signInWithPassword({email,password});
  const p="base64-"+Buffer.from(JSON.stringify(s.session)).toString("base64");
  const nm=`sb-${ref}-auth-token`;
  const mk=(extra=[])=>{const ck=[...extra]; if(p.length<=3180) ck.push({name:nm,value:p,domain:"localhost",path:"/"}); else for(let i=0,n=0;i<p.length;i+=3180,n++) ck.push({name:`${nm}.${n}`,value:p.slice(i,i+3180),domain:"localhost",path:"/"}); return ck;};
  const b=await chromium.launch();
  // THE STRANDING CASE: she is sitting ON her only granted program.
  for (const [label, override] of [["on beyond-code-centers (the stranding case)","beyond-code-centers"],["on catalyst (home)","catalyst"]]) {
    const c2=await b.newContext({viewport:{width:1300,height:900}});
    await c2.addCookies(mk([{name:"program-override",value:override,domain:"localhost",path:"/"}]));
    const page=await c2.newPage();
    await page.goto("http://localhost:3000/dashboard/admin",{waitUntil:"domcontentloaded"});
    await page.waitForTimeout(3000);
    await page.locator('button[aria-haspopup], header button').last().click().catch(()=>{});
    await page.waitForTimeout(900);
    const txt=await page.locator("body").innerText();
    const hasSwitcher=/Switch program/i.test(txt);
    console.log(`  ${label}: switcher present -> ${hasSwitcher?"YES ✓":"NO ✗"}`);
    await c2.close();
  }
  await b.close();
}catch(e){console.log("ERR",e.message);}
finally{ await svc.from("staff_program_access").delete().eq("student_id",uid); await svc.from("students").delete().eq("id",uid); await svc.auth.admin.deleteUser(uid); console.log("fixture removed"); }
