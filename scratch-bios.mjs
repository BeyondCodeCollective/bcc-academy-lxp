import { chromium } from "@playwright/test";
const OUT="/private/tmp/claude-505/-Users-fonz-morris-conductor-repos-bcc-academy-lxp/95cda9ae-c161-428f-9439-e218351c9868/scratchpad";
const b=await chromium.launch();
const p=await (await b.newContext({viewport:{width:1440,height:1000},deviceScaleFactor:2})).newPage();
await p.goto("http://localhost:3000/bcc",{waitUntil:"domcontentloaded"}).catch(()=>{});
await p.waitForTimeout(3000);
let el=await p.$('text=/Our People|OUR PEOPLE/i');
if(!el){ await p.goto("http://localhost:3000/",{waitUntil:"domcontentloaded"}); await p.waitForTimeout(3500);
  el=await p.$('text=/Our People|OUR PEOPLE/i'); }
console.log("url:",p.url(),"| found people section:", !!el);
if(el){
  await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(1800);
  const sizes=await p.evaluate(()=>{
    const out=[];
    document.querySelectorAll('article p, article h3').forEach(e=>{
      const t=(e.textContent||'').trim(); if(!t) return;
      out.push(getComputedStyle(e).fontSize+"  "+t.slice(0,46));
    });
    return out.slice(0,10);
  });
  console.log(sizes.join("\n"));
  await p.screenshot({path:`${OUT}/bios.png`});
}
await b.close();
