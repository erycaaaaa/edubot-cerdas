// Browser integration with HTTP fixtures only; no Supabase project or email is contacted.
// Requires playwright via NODE_PATH and installed Edge. Run from repository root.
const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');
const assert = require('node:assert/strict');
const id = '00000000-0000-4000-8000-000000000010';
const base = 'http://127.0.0.1:5176';
const jwt = 'eyJhbGciOiJIUzI1NiJ9.' + Buffer.from(JSON.stringify({ sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated' })).toString('base64url') + '.fixture';
const user = { id, email:'admin@test.invalid', aud:'authenticated', app_metadata:{provider:'email'}, user_metadata:{}, created_at:new Date().toISOString() };
const session = { access_token:jwt,refresh_token:'fixture-refresh',token_type:'bearer',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,user };
async function main() {
 const frontend = path.resolve(__dirname,'..');
 const server = spawn(process.execPath,[path.join(frontend,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5176'],{
  cwd:frontend,windowsHide:true,env:{...process.env,VITE_SUPABASE_URL:'https://fixture.supabase.co',VITE_SUPABASE_ANON_KEY:'fixture-public-key',VITE_API_URL:'http://127.0.0.1:5009'},stdio:'ignore'
 });
 let browser;
 try {
  for(let i=0;i<60;i++) { try { if((await fetch(base)).ok) break; } catch {} await new Promise(r=>setTimeout(r,500)); }
  browser=await chromium.launch({channel:'msedge',headless:true});
  async function context(role, signedIn=true) {
   const ctx=await browser.newContext();
   if(signedIn) await ctx.addInitScript(session => localStorage.setItem('sb-fixture-auth-token',JSON.stringify(session)),session);
   let schools=[{id:'school-a',name:'Sekolah Contoh',code:'SD01',is_active:true,teacher_count:1}];
   let teachers=[{id,name:'Guru Contoh',email:'guru@test.invalid',school_id:'school-a',is_blocked:false}];
   const invitations=[];
   await ctx.route('https://fixture.supabase.co/**',route=>route.fulfill({json:route.request().url().includes('/rest/v1/profiles')?{id,name:'Admin',role}:user}));
   await ctx.route('http://127.0.0.1:5009/**',async route=>{
    const req=route.request(),url=new URL(req.url()),body=req.postDataJSON();
    const send=(data,status=200)=>route.fulfill({status,json:data});
    if(url.pathname==='/api/auth/login') return send({user:{...user,name:'Admin',role,schoolId:'',avatar:'A'},session});
    if(url.pathname==='/api/auth/me') return send({user:{...user,name:'Admin',role,schoolId:'school-a',avatar:'A'}});
    if(url.pathname==='/api/admin/schools') {
     if(req.method()==='POST') schools.push({id:'school-b',...body,is_active:true,teacher_count:0});
     return send({success:true,data:schools});
    }
    if(url.pathname.startsWith('/api/admin/schools/')) {schools=schools.map(s=>s.id===url.pathname.split('/').at(-1)?{...s,...body}:s);return send({success:true});}
    if(url.pathname==='/api/admin/teachers') return send({success:true,data:{teachers,invitations}});
    if(url.pathname==='/api/admin/teachers/invite') {invitations.push({id:'invite',...body,user_id:null,school_id:body.schoolId,status:'sent'});return send({success:true},201);}
    if(url.pathname.endsWith('/status')) {teachers=teachers.map(t=>({...t,is_blocked:body.isBlocked}));return send({success:true});}
    if(url.pathname.endsWith('/school')) {teachers=teachers.map(t=>({...t,school_id:body.schoolId}));return send({success:true});}
    if(url.pathname==='/api/auth/accept-invite') return send({success:true});
    return send({success:true,data:[]});
   });
   return ctx;
  }
  let ctx=await context('admin',false),page=await ctx.newPage();
  await page.goto(base+'/admin/dashboard');await page.waitForURL('**/login/admin');
  await page.getByLabel('Email',{exact:true}).fill('admin@test.invalid');
  await page.getByLabel('Password',{exact:true}).fill('fixture-password');
  await page.getByRole('button',{name:'Masuk',exact:true}).click();
  await page.waitForURL('**/admin/dashboard');
  await page.getByRole('heading',{name:'Administrasi pusat'}).waitFor();
  await page.getByText('Guru Contoh',{exact:true}).waitFor();
  await page.getByLabel('Nama sekolah',{exact:true}).fill('Sekolah Baru');
  await page.getByLabel('Kode sekolah',{exact:true}).fill('SD02');
  await page.getByRole('button',{name:'Tambah sekolah',exact:true}).click();
  await page.getByRole('cell',{name:'Sekolah Baru',exact:true}).waitFor();
  await page.getByLabel('Nama guru',{exact:true}).fill('Guru Baru');
  await page.getByLabel('Email guru',{exact:true}).fill('baru@test.invalid');
  await page.getByRole('combobox').nth(0).selectOption('school-b');
  await page.getByRole('button',{name:'Undang guru',exact:true}).click();
  await page.getByText('Undangan dikirim.',{exact:false}).waitFor();
  const row=page.getByRole('row').filter({hasText:'Guru Contoh'});
  await row.getByRole('button',{name:'Nonaktifkan',exact:true}).click();
  await row.getByRole('cell',{name:'Nonaktif',exact:true}).waitFor();
  await row.getByRole('button',{name:'Pindah sekolah'}).click();
  await page.getByRole('combobox').nth(2).selectOption('school-b');
  await page.getByRole('button',{name:'Simpan penempatan'}).click();
  await row.getByRole('cell',{name:'Sekolah Baru',exact:true}).waitFor();
  await page.setViewportSize({width:390,height:844});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
  await page.screenshot({path:path.join(process.env.TEMP,'edubuz-admin-mobile.png'),fullPage:true});
  await ctx.close();
  for(const [role,destination] of [['student','/student/chat'],['teacher','/teacher/dashboard'],['parent','/parent/dashboard']]) {
   ctx=await context(role);page=await ctx.newPage();await page.goto(base+'/admin/dashboard');await page.waitForURL('**'+destination);await ctx.close();
  }
  ctx=await context('teacher');page=await ctx.newPage();await page.goto(base+'/accept-invite');
  await page.getByLabel('Password baru',{exact:true}).fill('new-password');await page.getByLabel('Ulangi password').fill('new-password');
  await page.getByRole('button',{name:'Aktifkan akun',exact:true}).click();
  await page.getByRole('link',{name:'Login Guru'}).waitFor();await ctx.close();
  console.log('PASS: admin login, anonymous/role redirects, create school, invite, disable/move teacher, activation and 390px layout (HTTP fixtures)');
 } finally { if(browser)await browser.close();server.kill(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
