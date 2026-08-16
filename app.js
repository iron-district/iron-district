/* Iron District - full feature build with Supabase accounts/saves */
const OWNER_USER='IronDistrict';

const templates=[
'Your chat access has been restricted for {TIME} due to a violation of the chat rules.',
'Advertising is not permitted in public chat. Your chat access has been restricted for {TIME}.',
'Your recent message was removed for spam. Please stop posting repetitive content.',
'You have received an official warning for inappropriate language. Further violations may result in a chat restriction.',
'Your chat access has been restricted for {TIME} following a harassment report.',
'Please do not impersonate staff members. Continued impersonation may result in account action.',
'Advertising external services or websites is prohibited without staff approval.',
'Your message was removed because it contained prohibited advertising.',
'Chat flooding is prohibited. Please slow down and allow other players to participate.',
'Your account has been placed under moderation review. Please follow the district rules.',
'Please review the Community Rules before continuing to use public chat.',
'Your forum posting access has been temporarily restricted for {TIME}.',
'Your market listing was removed because it violated marketplace rules.',
'Your account has received a warning for suspected rule circumvention.',
'Please do not share another player’s private information.',
'Your message was removed because it contained a prohibited link.',
'Your chat restriction has expired. Please follow the rules going forward.',
'Your appeal has been received and will be reviewed by staff.',
'Your report has been received. Staff will review the reported content.',
'Your report did not result in action at this time. Thank you for helping moderate the district.'
];
const categories=['Chat','Advertising','Spam','Harassment','Warnings','Forums','Market','Security','Account','Faction','Reports','Appeals'];

const DEFAULT_DATA={
  users:{},
  staffRoles:{},
  customForums:[],
  forumPosts:{},
  messages:[{user:'System',text:'Welcome to Iron District chat. Read the rules before posting.',system:true,time:'05:30'}],
  mail:[{id:1,from:'Iron District Staff',subject:'Welcome to Iron District',body:'Your account is ready. Explore the city, build your stats, and stay out of trouble.',system:true,unread:true}],
  restriction:null,
  level:1,energy:100,nerve:50,life:100,cash:1000,respect:0,jail:0,hospital:0,
  settings:{clock:true,compact:false,sound:false}
};

let data=structuredClone(DEFAULT_DATA);
let user=null;

function roleOf(name){return name==='IronDistrict'?'Owner':(data.staffRoles&&data.staffRoles[name])||'Player'}
function isStaff(){return ['Owner','Administrator','Moderator','Support'].includes(user?.role)}
function now(){return new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}
function toast(t){const x=document.getElementById('toast');if(!x)return;x.textContent=t;x.style.display='block';clearTimeout(window.__toast);window.__toast=setTimeout(()=>x.style.display='none',2500)}

async function save(){
  if(!user?.id)return;
  const {error}=await supabaseClient.from('player_data').upsert({user_id:user.id,username:user.name,data,updated_at:new Date().toISOString()});
  if(error){console.error(error);toast('Could not save your game.');}
}

async function loadPlayerData(){
  if(!user?.id)return;
  const {data:row,error}=await supabaseClient.from('player_data').select('*').eq('user_id',user.id).maybeSingle();
  if(error){console.error(error);toast('Could not load your account.');return;}
  if(row?.data){
    data={...structuredClone(DEFAULT_DATA),...row.data,settings:{...DEFAULT_DATA.settings,...(row.data.settings||{})}};
    data.staffRoles=data.staffRoles||{};data.customForums=data.customForums||[];data.forumPosts=data.forumPosts||{};data.messages=data.messages||[];data.mail=data.mail||[];
  }else{
    data=structuredClone(DEFAULT_DATA);
    const ins=await supabaseClient.from('player_data').insert({user_id:user.id,username:user.name,data});
    if(ins.error){console.error(ins.error);toast('Could not create player data.');}
  }
  user.role=roleOf(user.name);
}

function authMode(mode){
  document.querySelectorAll('.tab').forEach((x,i)=>x.classList.toggle('active',(mode==='login'?i===0:i===1)));
  document.getElementById('authForm').innerHTML=mode==='login'
    ? `<input id="authEmail" type="email" autocomplete="email" placeholder="Email"><input id="authPass" type="password" autocomplete="current-password" placeholder="Password"><button class="primary" onclick="login()">LOGIN</button><div class="notice small">Log in to your online Iron District account.</div>`
    : `<input id="authEmail" type="email" autocomplete="email" placeholder="Email"><input id="authUser" autocomplete="username" placeholder="Choose username"><input id="authPass" type="password" autocomplete="new-password" placeholder="Choose password"><input id="authPass2" type="password" autocomplete="new-password" placeholder="Confirm password"><button class="primary" onclick="signup()">CREATE ACCOUNT</button>`;
}

async function signup(){
  const email=document.getElementById('authEmail')?.value.trim();
  const u=document.getElementById('authUser')?.value.trim();
  const p=document.getElementById('authPass')?.value;
  const p2=document.getElementById('authPass2')?.value;
  if(!email||!email.includes('@'))return toast('Enter a valid email address.');
  if(!/^[A-Za-z0-9_]{3,20}$/.test(u||''))return toast('Username must be 3-20 letters, numbers or _.');
  if(!p||p.length<8)return toast('Use at least 8 characters.');
  if(p!==p2)return toast('Passwords do not match.');
  const {data:authData,error}=await supabaseClient.auth.signUp({email,password:p,options:{data:{username:u}}});
  if(error){console.error(error);return toast(error.message);}
  if(!authData?.user)return toast('Account creation failed.');
  if(!authData.session)return toast('Account created. Check your email before logging in.');
  user={id:authData.user.id,name:u,role:u==='IronDistrict'?'Owner':'Player'};
  await loadPlayerData();
  enter();
}

async function login(){
  const email=document.getElementById('authEmail')?.value.trim();
  const p=document.getElementById('authPass')?.value;
  if(!email||!p)return toast('Enter your email and password.');
  const {data:authData,error}=await supabaseClient.auth.signInWithPassword({email,password:p});
  if(error){console.error(error);return toast(error.message||'Invalid email or password.');}
  const u=authData.user;
  const username=u.user_metadata?.username||u.email?.split('@')[0]||'Player';
  user={id:u.id,name:username,role:username==='IronDistrict'?'Owner':'Player'};
  await loadPlayerData();
  enter();
}

async function logout(){await supabaseClient.auth.signOut();user=null;data=structuredClone(DEFAULT_DATA);document.getElementById('app').classList.add('hidden');document.getElementById('auth').classList.remove('hidden');authMode('login')}
function enter(){document.getElementById('auth').classList.add('hidden');document.getElementById('app').classList.remove('hidden');buildNav();page('home');update()}

function buildNav(){
 const n=[['home','⌂ Dashboard'],['rules','▣ Rules'],['staffteam','♟ Staff Team'],['forums','☷ Forums'],['city','◈ City'],['crimes','⚔ Crimes'],['chat','☁ Chat'],['mail','✉ Mail'],['market','▤ Market'],['credits','★ Credits'],['hospital','✚ Hospital'],['jail','▣ Jail'],['settings','⚙ Settings'],['profile','◉ Profile']];
 if(isStaff())n.push(['staff','⚙ Staff Center']);
 document.getElementById('nav').innerHTML=n.map(x=>`<button class="nav" onclick="page('${x[0]}',this)">${x[1]}</button>`).join('');
}

function page(p,btn){
 document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));if(btn)btn.classList.add('active');
 const m=document.getElementById('main');
 if(p==='home')m.innerHTML=`<div class="hero"><h1>Welcome back, ${esc(user.name)}</h1><p>Build your reputation in the Iron District.</p></div><div class="grid"><div class="card"><h3>Cash</h3><div class="stat">$${data.cash.toLocaleString()}</div></div><div class="card"><h3>Respect</h3><div class="stat">${data.respect}</div></div><div class="card"><h3>Status</h3><div class="stat">${data.jail?'Jailed':data.hospital?'Hospital':'Free'}</div></div></div><div class="card" style="margin-top:12px"><h3>Recent Activity</h3><div class="notice">${data.restriction?`Chat restricted: ${data.restriction.remaining} remaining.`:'Your account is in good standing.'}</div><button class="button" onclick="openMail()">OPEN MAIL</button></div>`;
 if(p==='city')m.innerHTML=`<div class="hero"><h1>The City</h1><p>Explore districts and activities.</p></div><div class="grid">${['Downtown','Market Row','Industrial Ward','Nightlife','Train Station','Docks','Casino District','University','Red Light Ward'].map(x=>`<div class="card"><h3>${x}</h3><p class="muted">Explore this district.</p><button class="button" onclick="action('${x}')">ENTER</button></div>`).join('')}</div>`;
 if(p==='crimes')m.innerHTML=`<div class="hero"><h1>Crimes</h1><p>Use nerve to attempt crimes.</p></div><div class="card"><table class="table"><tr><th>Crime</th><th>Nerve</th><th>Risk</th><th></th></tr>${[['Pickpocket',3,'Low',400],['Shoplift',5,'Low',600],['Burglary',8,'Medium',900],['Car theft',12,'High',1500],['Armed robbery',18,'Extreme',2500]].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td><td><button class="button" onclick="crime(${r[1]},${r[3]})">ATTEMPT</button></td></tr>`).join('')}</table></div>`;
 if(p==='chat'){renderChat();return}
 if(p==='mail'){openMail();return}
 if(p==='market')m.innerHTML=`<div class="hero"><h1>Market</h1><p>Buy and sell items.</p></div><div class="card"><table class="table"><tr><th>Item</th><th>Seller</th><th>Price</th><th></th></tr>${[['Lockpick Set','Razor',850],['Med Kit','Mika',1200],['Kevlar Vest','Nova',4800],['Energy Drink','Axel',950]].map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td><td>$${r[2]}</td><td><button class="button" onclick="buy(${r[2]})">BUY</button></td></tr>`).join('')}</table></div>`;
 if(p==='settings')return renderSettings();
 if(p==='profile')return renderProfile();
 if(p==='forums')return renderForums();
 if(p==='rules')return renderRules('General');
 if(p==='staffteam')return renderStaffTeam();
 if(p==='credits')m.innerHTML=`<div class="hero"><h1>Credits</h1><p>Iron District development credits.</p></div><div class="card"><h3>Iron District</h3><p class="muted">Original text-based RPG prototype, UI, gameplay systems and moderation concepts.</p><p>Inspired by the genre of browser crime RPGs without using Torn's proprietary source code or assets.</p></div>`;
if(p==='hospital')m.innerHTML=`
<div class="hero">
  <h1>Hospital</h1>
  <p>Recovery and medical status.</p>
</div>

<div class="card hospital-card">
  <h3>Life: ${data.life}/100</h3>

  ${
    data.hospital
      ? `
        <div class="notice">
          <b>You are currently hospitalized.</b>
          <br>
          Most actions are unavailable until your recovery timer expires.
        </div>

        <p class="muted">
          Recovery remaining:
          ${formatRemaining(data.hospital)}
        </p>
      `
      : `
        <div class="notice">
          You are not currently hospitalized.
        </div>

        <p class="muted">
          Hospital treatment is applied automatically when you are injured.
        </p>
      `
  }
</div>`;
 if(p==='jail')m.innerHTML=`<div class="hero"><h1>Jail</h1><p>Serve your sentence.</p></div><div class="card"><h3>${data.jail?'You are jailed.':'You are free.'}</h3><p class="muted">${data.jail?'City actions, crimes and chat are disabled while jailed.':'No active sentence.'}</p><button class="button" onclick="jailAction()">${data.jail?'SERVE TIME':'TEST JAIL'}</button></div>`;
 if(p==='staff'&&isStaff())return renderStaff('messages','Advertising');
 update();
}

function isRestricted(){if(!data.restriction)return false;if(Date.now()>=data.restriction.until){data.restriction=null;save();return false}data.restriction.remaining=formatRemaining(data.restriction.until-Date.now());return true}
function formatRemaining(ms){let s=Math.ceil(ms/1000),d=Math.floor(s/86400);s%=86400;let h=Math.floor(s/3600);s%=3600;let m=Math.floor(s/60),sec=s%60;return d?`${d}d ${h}h ${m}m`:h?`${h}h ${m}m`:m?`${m}m ${sec}s`:`${sec}s`}

function renderChat(){
 const blocked=data.jail||data.hospital||isRestricted();
 document.getElementById('main').innerHTML=`<div class="hero"><h1>District Chat</h1><p>Public player communication.</p></div>${data.jail?'<div class="restriction">You are jailed. Chat is unavailable.</div>':''}${data.hospital?'<div class="restriction">You are hospitalized. Chat is unavailable.</div>':''}${isRestricted()?`<div class="restriction"><b>CHAT RESTRICTION</b><br>${esc(data.restriction.reason)}<br>Remaining: ${data.restriction.remaining}</div>`:''}<div class="chat"><div class="chat-window"><div class="messages" id="messages">${data.messages.map(x=>`<div class="msg ${x.system?'system':''}"><b>${x.system?'SYSTEM':esc(x.user)}</b> <span class="muted">${esc(x.time)}</span><br>${esc(x.text)}</div>`).join('')}</div><div class="chat-input"><input id="chatText" ${blocked?'disabled':''} placeholder="${blocked?'Chat unavailable':'Type a message...'}"><button class="primary" ${blocked?'disabled':''} onclick="sendChat()">SEND</button></div></div><div class="card"><h3>Chat Rules</h3><p class="muted">No spam, advertising, harassment or abuse.</p><span class="pill">${blocked?'RESTRICTED':'CHAT OPEN'}</span></div></div>`;
 setTimeout(()=>{let x=document.getElementById('messages');if(x)x.scrollTop=x.scrollHeight},10)
}
function sendChat(){if(data.jail||data.hospital||isRestricted())return toast('You cannot chat right now.');let v=document.getElementById('chatText').value.trim();if(!v)return;if(v.length>250)return toast('Message is too long.');data.messages.push({user:user.name,text:v,time:now()});save();renderChat()}

function renderRules(tab='General'){
 const sections={
  General:['Treat other players and staff respectfully.','Do not attempt to bypass moderation actions.','Do not exploit bugs or vulnerabilities.','Use reports and appeals in good faith.','Keep account credentials private.'],
  Advertising:['Do not advertise services, websites, communities, referral links, or products without permission.','Do not repeatedly promote the same content.','Do not disguise advertisements as ordinary conversation.','Do not use unsolicited messages to advertise.'],
  Chat:['No spam, flooding, harassment, threats, or targeted abuse.','Do not impersonate staff or system accounts.','Do not evade a chat restriction with alternate accounts.','Keep discussion appropriate.'],
  Forums:['Post threads in the appropriate section.','Do not create duplicate or low-effort threads.','No forum spam or unauthorized advertising.','Do not derail or harass other users.'],
  Market:['Listings must accurately describe the item and price.','Do not use deceptive listings or prohibited trades.','Do not manipulate listings through spam.','Report suspected scams.'],
  Factions:['Recruitment must follow advertising rules.','Do not impersonate another faction.','No recruitment spam or targeted harassment.','Faction disputes should be reported.'],
  Accounts:['Never share passwords or authentication secrets.','Do not impersonate another player.','Do not use alternate accounts to evade restrictions.','Keep recovery information secure.'],
  Exploits:['Do not intentionally abuse bugs.','Report serious bugs to staff.','Do not distribute exploit instructions.','Unauthorized automation may be reviewed.']
 };
 const tabs=Object.keys(sections);
 document.getElementById('main').innerHTML=`<div class="hero"><h1>Community Rules</h1><p>Review the rules by category.</p></div><div class="rule-tabs">${tabs.map(x=>`<button class="button ${tab===x?'selected':''}" onclick="renderRules('${x}')">${x}</button>`).join('')}</div><div class="card rule-panel"><h2>${tab}</h2>${sections[tab].map((x,i)=>`<div class="notice"><b>${i+1}. ${esc(x)}</b></div>`).join('')}<p class="muted">Staff may issue warnings, restrictions, removals, or other account actions depending on severity and history.</p></div>`;
}

function renderStaffTeam(){
 let members=[['IronDistrict','Owner','Community administration']];
 Object.entries(data.staffRoles||{}).forEach(([n,r])=>members.push([n,r,r==='Administrator'?'Game operations':r==='Moderator'?'Chat & forums':r==='Support'?'Player support':'Player']));
 document.getElementById('main').innerHTML=`<div class="hero"><h1>Staff Team</h1><p>Current staff members and responsibilities.</p></div><div class="card">${members.map(x=>`<div class="member"><span><b>${esc(x[0])}</b><br><span class="muted">${esc(x[2])}</span></span><span class="tag">${esc(x[1])}</span></div>`).join('')}</div>`;
}

function forumBuilt(){return {general:['General Discussion','Talk about the district.'],announcements:['Announcements','Official staff announcements.'],guides:['Guides & Tutorials','Share strategies and guides.'],factions:['Faction Recruitment','Find or recruit faction members.'],market:['Marketplace Discussion','Trading and item discussion.'],suggestions:['Suggestions','Suggest improvements.']}}
function forumName(id){let built=forumBuilt();if(built[id])return built[id];return (data.customForums||[]).find(x=>x.id===id)}
function ensureForumData(){data.forumPosts=data.forumPosts||{};if(!data.forumPosts.graveyard)data.forumPosts.graveyard=[];Object.keys(forumBuilt()).forEach(id=>{if(!data.forumPosts[id])data.forumPosts[id]=[]});(data.customForums||[]).forEach(x=>{if(!data.forumPosts[x.id])data.forumPosts[x.id]=[]})}
function renderForums(){
 ensureForumData();
 const built=Object.entries(forumBuilt()).map(([id,x])=>[id,x[0],x[1]]);
 const custom=(data.customForums||[]).map(x=>[x.id,x.name,x.description]);
 const tabs=[...built,...custom,['graveyard','Graveyard','Staff-archived threads.']];
 document.getElementById('main').innerHTML=`<div class="hero"><h1>Forums</h1><p>Everyone can participate in normal forums. Staff can lock threads or move them to the Graveyard.</p></div><div class="forum-tabs">${tabs.map(x=>`<button class="button" onclick="openForum('${x[0]}')">${esc(x[1])}</button>`).join('')}</div><div class="card"><h3>Create Custom Forum</h3><input id="forumName" placeholder="Forum name"><input id="forumDesc" placeholder="Description"><button class="primary" onclick="createForum()">CREATE FORUM TAB</button><p class="muted small">Custom forums and posts are saved with your current player data until shared forum tables are enabled.</p></div>`;
}
function createForum(){let n=document.getElementById('forumName').value.trim(),d=document.getElementById('forumDesc').value.trim()||'Community forum';if(!n||n.length<3)return toast('Forum name is too short.');if((data.customForums||[]).some(x=>x.name.toLowerCase()===n.toLowerCase()))return toast('A forum with that name already exists.');let id='custom_'+Date.now();data.customForums.push({id,name:n,description:d,createdBy:user.name,createdAt:now()});data.forumPosts[id]=[];save();toast('Custom forum created.');openForum(id)}
function deleteCustomForum(id){if(user?.role!=='Owner')return toast('Only the Owner can permanently delete forums.');let f=(data.customForums||[]).find(x=>x.id===id);if(!f)return toast('Forum not found.');if(!confirm(`Permanently delete the forum "${f.name}"?`))return;data.customForums=data.customForums.filter(x=>x.id!==id);delete data.forumPosts[id];save();toast('Forum permanently deleted.');renderForums()}
function openForum(id){
 ensureForumData();let f=forumName(id);if(id==='graveyard')f={name:'Graveyard',description:'Staff-archived threads.'};if(!f)return toast('Forum not found.');
 const title=f.name||f[0],desc=f.description||f[1],posts=data.forumPosts[id]||[],grave=id==='graveyard';
 const ownerDelete=(user?.role==='Owner'&&id.startsWith('custom_'))?`<button class="danger" onclick="deleteCustomForum('${id}')">DELETE FORUM</button>`:'';
 document.getElementById('main').innerHTML=`<div class="hero"><button class="button" onclick="renderForums()">← ALL FORUMS</button>${ownerDelete}<h1>${esc(title)}</h1><p>${esc(desc)}</p>${grave?'<div class="restriction">GRAVEYARD: Everyone can read archived threads. Only staff can reply.</div>':''}</div>${!grave?`<div class="card"><h3>New Thread</h3><input id="threadTitle" placeholder="Thread title"><textarea id="threadBody" placeholder="Write your post..."></textarea><button class="primary" onclick="createThread('${id}')">POST THREAD</button></div>`:''}<div class="card"><h3>${grave?'Archived Threads':'Threads'}</h3>${posts.length?posts.map((x,i)=>`<div class="forum-thread"><button class="button" onclick="openThread('${id}',${i})">OPEN</button> <b>${esc(x.title)}</b><div class="muted">by ${esc(x.user)} • ${esc(x.time)} ${x.locked?' • 🔒 LOCKED':''}</div><p>${esc(x.body)}</p>${x.graveyard?'<span class="pill">MOVED TO GRAVEYARD BY STAFF</span>':x.locked?'<span class="pill">LOCKED</span>':''}</div>`).join(''):'<p class="muted">No threads yet. Start the first discussion.</p>'}</div>`;
}
function createThread(id){if(id==='graveyard')return toast('The Graveyard is read-only.');let t=document.getElementById('threadTitle').value.trim(),b=document.getElementById('threadBody').value.trim();if(!t||!b)return toast('Enter a title and message.');ensureForumData();data.forumPosts[id].unshift({title:t,body:b,user:user.name,time:now(),locked:false,graveyard:false,replies:[]});save();openForum(id)}
function openThread(id,index){ensureForumData();let x=(data.forumPosts[id]||[])[index];if(!x)return;x.replies=x.replies||[];let grave=id==='graveyard'||x.graveyard;let staffControls=isStaff()&&!grave?`<div class="forum-moderation"><button class="button" onclick="toggleThreadLock('${id}',${index})">${x.locked?'UNLOCK THREAD':'LOCK THREAD'}</button><button class="danger" onclick="moveThreadToGraveyard('${id}',${index})">MOVE TO GRAVEYARD</button></div>`:'';let replyBox=grave?(isStaff()&&!x.locked?`<div class="card"><h3>Staff Reply</h3><textarea id="replyBody" placeholder="Write a staff reply..."></textarea><button class="primary" onclick="replyThread('${id}',${index})">POST STAFF REPLY</button></div>`:'<div class="restriction">Only staff can reply to Graveyard threads, and locked threads cannot receive replies.</div>'):(!x.locked?`<div class="card"><h3>Reply</h3><textarea id="replyBody" placeholder="Write a reply..."></textarea><button class="primary" onclick="replyThread('${id}',${index})">POST REPLY</button></div>`:'<div class="restriction">This thread is locked by staff.</div>');document.getElementById('main').innerHTML=`<div class="hero"><button class="button" onclick="openForum('${id}')">← BACK TO FORUM</button><h1>${esc(x.title)}</h1><p>Started by ${esc(x.user)} • ${esc(x.time)} ${x.locked?' • 🔒 LOCKED':''}</p>${x.graveyard?'<span class="pill">MOVED TO GRAVEYARD BY STAFF</span>':''}</div><div class="card"><div class="forum-post"><b>${esc(x.user)}</b><span class="muted"> • ${esc(x.time)}</span><p>${esc(x.body)}</p></div>${x.replies.map(r=>`<div class="forum-post reply"><b>${esc(r.user)}${r.staff?' <span class="tag">STAFF</span>':''}</b><span class="muted"> • ${esc(r.time)}</span><p>${esc(r.body)}</p></div>`).join('')}</div>${replyBox}${staffControls}`}
function replyThread(id,index){let x=(data.forumPosts[id]||[])[index];if(!x)return;let grave=id==='graveyard'||x.graveyard;if(grave&&!isStaff())return toast('Only staff can reply.');if(x.locked)return toast('Replies are disabled.');let b=document.getElementById('replyBody').value.trim();if(!b)return toast('Enter a reply.');x.replies=x.replies||[];x.replies.push({user:user.name,time:now(),body:b,staff:isStaff()&&grave});save();openThread(id,index)}
function toggleThreadLock(id,index){if(!isStaff())return toast('Staff access required.');let x=(data.forumPosts[id]||[])[index];if(!x||x.graveyard)return;x.locked=!x.locked;save();toast(x.locked?'Thread locked.':'Thread unlocked.');openThread(id,index)}
function moveThreadToGraveyard(id,index){if(!isStaff())return toast('Staff access required.');if(id==='graveyard')return;let x=(data.forumPosts[id]||[])[index];if(!x)return;x.graveyard=true;x.locked=true;x.movedBy=user.name;x.movedAt=now();data.forumPosts.graveyard.unshift(x);data.forumPosts[id].splice(index,1);save();toast('Thread moved to the Graveyard.');openForum('graveyard')}

function duration(v,custom){if(v==='custom')return Number(custom)*60000;let map={m:60000,h:3600000,d:86400000};let n=parseInt(v);let u=v.endsWith('d')?'d':v.endsWith('h')?'h':'m';return n*map[u]}
function renderStaff(tab='messages',cat='Advertising'){
 if(!isStaff())return toast('Staff access required.');
const tabs=[
    ['messages','Automated Messages'],
    ['restrictions','Restrictions'],
    ['roles','Staff Roles'],
    ['log','Moderation Log']
];
 document.getElementById('main').innerHTML=`<div class="hero"><h1>Staff Center</h1><p>Organized moderation tools with grouped automated messages.</p></div><div class="staff-tabs">${tabs.map(x=>`<button class="button ${tab===x[0]?'selected':''}" onclick="renderStaff('${x[0]}','${cat}')">${x[1]}</button>`).join('')}</div><div id="staffContent"></div>`;
 const c=document.getElementById('staffContent');
 if(tab==='messages'){
  const groups={Advertising:['Advertising warning','Public advertising restriction','Repeated advertising','External website promotion'],Chat:['Chat restriction','Spam warning','Flooding warning','Harassment warning'],Spam:['Repeated messages','Message flooding','Duplicate posts','Forum spam'],Harassment:['Harassment warning','Targeted abuse','Bullying warning','Final harassment warning'],Warnings:['General warning','Official warning','Final warning','Conduct warning'],Forums:['Wrong forum section','Duplicate thread','Forum spam','Forum restriction'],Market:['Misleading listing','Market spam','Trade dispute notice','Listing removed'],Security:['Suspicious login notice','Account security review','Suspicious activity warning','Security warning'],Account:['Account warning','Restriction evasion','Account review','Account action notice'],Faction:['Faction advertising','Faction recruitment warning','Faction harassment warning','Faction restriction notice'],Reports:['Report received','Report under review','Report resolved','No action taken'],Appeals:['Appeal received','Appeal under review','Appeal approved','Appeal denied']};
  const cats=Object.keys(groups);if(!groups[cat])cat='Advertising';
  const msgs=(groups[cat]||[]).map(t=>`${t}. Please review the applicable rules. Further violations may result in additional action.`);
  c.innerHTML=`<div class="message-groups"><div class="card message-cats">${cats.map(x=>`<button class="${cat===x?'selected':''}" onclick="renderStaff('messages','${x}')">${x}</button>`).join('')}</div><div><div class="card"><h3>${cat} Messages</h3><div class="message-list">${msgs.map((x,i)=>`<div class="message-option" onclick="chooseStaffMessage(${JSON.stringify(x)})"><b>${esc(x.split('.')[0])}</b><div class="muted">${esc(x)}</div></div>`).join('')}</div></div><div class="card"><h3>Send Automated System Message</h3><input id="staffTarget" value="${esc(user.name)}" placeholder="Target player"><input id="staffSubject" value="${esc(cat)} Notice" placeholder="Subject"><textarea id="staffBody" placeholder="Message"></textarea><button class="primary" onclick="staffSend()">SEND SYSTEM MESSAGE</button></div></div></div>`;
 }
 if(tab==='restrictions'){
  const opts=['1m','2m','5m','10m','15m','20m','30m','45m','1h','2h','3h','4h','6h','8h','12h','24h','2d','3d','5d','7d','14d','30d','custom'];
  c.innerHTML=`<div class="card"><h3>Restriction Controls</h3><p class="muted">Choose a preset duration or enter any custom duration in minutes.</p><div class="restriction-grid"><div><label>Player</label><input id="restrictTarget" value="${esc(user.name)}"></div><div><label>Duration</label><select id="restrictTime">${opts.map(x=>`<option>${x}</option>`).join('')}</select></div><div><label>Custom minutes</label><input id="restrictCustom" type="number" min="1" placeholder="e.g. 90" disabled></div><div><label>Reason</label><input id="restrictReason" value="Advertising in public chat"></div></div><button class="danger" onclick="restrictPlayer()">APPLY CHAT RESTRICTION</button><button class="button" onclick="clearRestriction()">CLEAR CURRENT RESTRICTION</button></div>`;
  document.getElementById('restrictTime').onchange=e=>document.getElementById('restrictCustom').disabled=e.target.value!=='custom';
 }
 if(tab==='roles'){
  if(user.role!=='Owner'){c.innerHTML='<div class="card"><h3>Owner Only</h3><p class="muted">Only the Owner can assign or remove staff roles.</p></div>';return}
  c.innerHTML=`<div class="card"><h3>Assign Staff Role</h3><input id="roleUser" placeholder="Username"><select id="roleValue"><option>Administrator</option><option>Moderator</option><option>Support</option><option>Player</option></select><button class="primary" onclick="assignRole()">SAVE ROLE</button></div><div class="card"><h3>Current Staff</h3>${Object.entries(data.staffRoles||{}).map(([n,r])=>`<div class="member"><span><b>${esc(n)}</b><br><span class="muted">${esc(r)}</span></span><button class="button" onclick="removeRole('${esc(n)}')">REMOVE ROLE</button></div>`).join('')||'<p class="muted">No additional staff roles assigned.</p>'}</div>`;
 }
}
function chooseStaffMessage(body){const x=document.getElementById('staffBody');if(x)x.value=body}
function staffSend(){if(!isStaff())return toast('Staff access required.');const target=document.getElementById('staffTarget').value.trim()||user.name;const subject=document.getElementById('staffSubject').value.trim()||'System Notice';const body=document.getElementById('staffBody').value.trim();if(!body)return toast('Write a message first.');data.mail.unshift({id:Date.now(),from:'Iron District Staff',to:target,subject,body,system:true,unread:true});save();toast(`Automated message sent to ${target}.`);update()}
function restrictPlayer(){const t=document.getElementById('restrictTime').value;const ms=duration(t,document.getElementById('restrictCustom').value);const reason=document.getElementById('restrictReason').value||'Violation of district rules';data.restriction={until:Date.now()+ms,reason,remaining:formatRemaining(ms)};data.mail.unshift({id:Date.now(),from:'Iron District Staff',subject:'Chat Restriction',body:`Your chat access has been restricted for ${formatRemaining(ms)}. Reason: ${reason}`,system:true,unread:true});save();toast('Chat restriction applied.');page('chat')}
function clearRestriction(){data.restriction=null;save();toast('Restriction cleared.');page('chat')}
function assignRole(){if(user.role!=='Owner')return toast('Only the Owner can assign roles.');const n=document.getElementById('roleUser').value.trim(),r=document.getElementById('roleValue').value;if(!n)return toast('Enter a username.');if(n==='IronDistrict')return toast('The Owner role cannot be changed.');data.staffRoles=data.staffRoles||{};data.staffRoles[n]=r;save();toast(`${n} is now ${r}.`);renderStaff('roles')}
function removeRole(n){if(user.role!=='Owner')return toast('Only the Owner can remove roles.');delete data.staffRoles[n];save();toast('Staff role removed.');renderStaff('roles')}

function openMail(){renderMail();document.getElementById('mailModal').classList.add('open')}
function closeModal(id){document.getElementById(id).classList.remove('open')}
function renderMail(){const list=document.getElementById('mailList');list.innerHTML=(data.mail||[]).map(x=>`<div class="mail-row ${x.unread?'unread':''}" onclick="readMail(${x.id})"><b>${esc(x.subject)}</b><div class="muted">${esc(x.from)}</div><div>${esc(x.body)}</div></div>`).join('')||'<p class="muted">No mail.</p>';update()}
function readMail(id){const x=data.mail.find(y=>y.id===id);if(x){x.unread=false;save();renderMail()}}
function sendMail(){const to=document.getElementById('mailTo').value.trim(),s=document.getElementById('mailSubject').value.trim(),b=document.getElementById('mailBody').value.trim();if(!to||!s||!b)return toast('Complete all mail fields.');data.mail.unshift({id:Date.now(),from:user.name,to,subject:s,body:b,system:false,unread:true});save();toast('Mail saved to your account.');document.getElementById('mailTo').value='';document.getElementById('mailSubject').value='';document.getElementById('mailBody').value='';renderMail()}

function crime(n){if(data.jail||data.hospital||isRestricted())return toast('You cannot perform that action right now.');if(data.nerve<n)return toast('Not enough nerve.');data.nerve-=n;if(Math.random()>.32){data.cash+=750;data.respect+=2;toast('Crime succeeded: +$750')}else{data.life=Math.max(1,data.life-10);toast('Crime failed and you were injured.')}save();update()}
function jailAction(){if(data.jail){data.jail=0;toast('Released from jail.')}else{data.jail=15*60000;toast('You are jailed for 15 minutes.')}save();page('jail')}
function hospitalize(){if(data.hospital){data.hospital=0;data.life=100;toast('Recovered.')}else{data.hospital=10*60000;data.life=30;toast('You are hospitalized for 10 minutes.')}save();page('hospital')}
function buy(p){if(data.cash<p)return toast('Not enough cash.');data.cash-=p;save();update();toast('Purchase completed.')}
function action(x){if(data.jail||data.hospital)return toast('Unavailable while jailed or hospitalized.');toast(`${x} entered.`)}
function rank(){return data.level>=10?'District Boss':data.level>=8?'Street Operator':'New Blood'}

function renderProfile(){document.getElementById('main').innerHTML=`<div class="hero"><h1>Profile</h1><p>Your Iron District account.</p></div><div class="card"><h3>${esc(user.name)}</h3><p class="muted">Role: ${esc(user.role)} • Level ${data.level}</p><p>Cash: $${data.cash.toLocaleString()} • Respect: ${data.respect}</p><button class="button" onclick="page('settings')">ACCOUNT SETTINGS</button></div>`}
function renderSettings(){document.getElementById('main').innerHTML=`<div class="hero"><h1>Settings</h1><p>Customize your Iron District account and interface.</p></div><div class="grid"><div class="card"><h3>Account</h3><label>Username</label><input value="${esc(user.name)}" disabled><label>Role</label><input value="${esc(user.role)}" disabled><label>New Password</label><input id="newPass" type="password" placeholder="8+ characters"><label>Confirm Password</label><input id="newPass2" type="password" placeholder="Repeat password"><button class="primary" onclick="changePassword()">CHANGE PASSWORD</button></div><div class="card"><h3>Interface</h3><label><input type="checkbox" ${data.settings?.compact?'checked':''} onchange="toggleSetting('compact',this.checked)"> Compact layout</label><br><label><input type="checkbox" ${data.settings?.clock!==false?'checked':''} onchange="toggleSetting('clock',this.checked)"> Show clock</label><br><label><input type="checkbox" ${data.settings?.sound?'checked':''} onchange="toggleSetting('sound',this.checked)"> Notification sounds</label></div><div class="card"><h3>Notifications</h3><button class="button" onclick="markAllMailRead()">MARK ALL MAIL READ</button><button class="button" onclick="resetInterface()">RESET INTERFACE SETTINGS</button></div><div class="card"><h3>Data</h3><p class="muted">Export a backup of your saved data.</p><button class="button" onclick="exportGameData()">EXPORT DATA</button></div></div>`}
async function changePassword(){const a=document.getElementById('newPass').value,b=document.getElementById('newPass2').value;if(a.length<8||a!==b)return toast('Password must be 8+ characters and match.');const {error}=await supabaseClient.auth.updateUser({password:a});if(error)return toast(error.message);document.getElementById('newPass').value='';document.getElementById('newPass2').value='';toast('Password changed.')}
function toggleSetting(k,v){data.settings=data.settings||{};data.settings[k]=v;save();if(k==='clock'){const c=document.getElementById('clock');if(c)c.style.display=v?'':'none'}if(k==='compact')document.body.classList.toggle('compact',v);toast('Setting saved.')}
function resetInterface(){data.settings={clock:true,compact:false,sound:false};save();document.body.classList.remove('compact');const c=document.getElementById('clock');if(c)c.style.display='';renderSettings()}
function markAllMailRead(){(data.mail||[]).forEach(x=>x.unread=false);save();update();toast('All mail marked as read.')}
function exportGameData(){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='iron-district-backup.json';a.click();URL.revokeObjectURL(a.href)}

function update(){
 if(!user)return;
 document.getElementById('playerName').textContent=user.name;document.getElementById('level').textContent=data.level;document.getElementById('rank').textContent=rank();document.getElementById('avatar').textContent=user.name.slice(0,2).toUpperCase();document.getElementById('energy').textContent=`${data.energy}/100`;document.getElementById('nerve').textContent=`${data.nerve}/50`;document.getElementById('life').textContent=`${data.life}/100`;document.getElementById('energyBar').style.width=data.energy+'%';document.getElementById('nerveBar').style.width=Math.min(100,data.nerve*2)+'%';document.getElementById('lifeBar').style.width=data.life+'%';document.getElementById('mailBadge').textContent=(data.mail||[]).filter(x=>x.unread).length;
}

setInterval(()=>{
 const c=document.getElementById('clock');if(c)c.textContent=new Date().toLocaleTimeString();
 let changed=false;
 if(data.jail>0){data.jail=Math.max(0,data.jail-1000);changed=true}
 if(data.hospital>0){data.hospital=Math.max(0,data.hospital-1000);changed=true}
 if(data.restriction&&Date.now()>=data.restriction.until){data.restriction=null;changed=true}
 if(changed&&user)save();update();
},1000);

window.addEventListener('load',async()=>{
 authMode('login');
 const {data:sessionData}=await supabaseClient.auth.getSession();
 const session=sessionData?.session;
 if(!session?.user)return;
 const authUser=session.user;
 const username=authUser.user_metadata?.username||authUser.email?.split('@')[0]||'Player';
 user={id:authUser.id,name:username,role:username==='IronDistrict'?'Owner':'Player'};
 await loadPlayerData();
 enter();
});
/* =========================================================
   SHARED MULTIPLAYER CHAT
   Uses Supabase chat_messages + Realtime.
   Does NOT remove the existing Iron District systems.
   ========================================================= */

let sharedChatChannel = null;

async function loadSharedChat() {
    if (!user?.id) return;

    const { data: rows, error } = await supabaseClient
        .from("chat_messages")
        .select("id,user_id,username,message,system,created_at")
        .order("created_at", { ascending: true })
        .limit(200);

    if (error) {
        console.error("Shared chat load error:", error);
        return toast("Could not load shared chat.");
    }

    data.messages = (rows || []).map(row => ({
        id: row.id,
        user: row.username,
        text: row.message,
        system: !!row.system,
        time: new Date(row.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
        })
    }));

    renderChat();
}

function startSharedChat() {
    if (!user?.id) return;

    if (sharedChatChannel) {
        supabaseClient.removeChannel(sharedChatChannel);
        sharedChatChannel = null;
    }

    sharedChatChannel = supabaseClient
        .channel("iron-district-shared-chat")
        .on(
            "postgres_changes",
            {
                event: "INSERT",
                schema: "public",
                table: "chat_messages"
            },
            payload => {
                const row = payload.new;

                data.messages = data.messages || [];

                // Prevent duplicates.
                if (
                    data.messages.some(
                        message => String(message.id) === String(row.id)
                    )
                ) {
                    return;
                }

                data.messages.push({
                    id: row.id,
                    user: row.username,
                    text: row.message,
                    system: !!row.system,
                    time: new Date(row.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                    })
                });

                // Keep the local display from becoming huge.
                if (data.messages.length > 200) {
                    data.messages = data.messages.slice(-200);
                }

                if (document.getElementById("messages")) {
                    renderChat();
                }
            }
        )
        .subscribe(status => {
            console.log("Shared chat status:", status);
        });
}

/* Replace the old local chat renderer */
renderChat = function() {
    const blocked =
        data.jail ||
        data.hospital ||
        isRestricted();

    const messages = data.messages || [];

    document.getElementById("main").innerHTML = `
        <div class="hero">
            <h1>District Chat</h1>
            <p>Public player communication.</p>
        </div>

        ${
            data.jail
                ? `<div class="restriction">
                    You are jailed. Chat is unavailable.
                   </div>`
                : ""
        }

        ${
            data.hospital
                ? `<div class="restriction">
                    You are hospitalized. Chat is unavailable.
                   </div>`
                : ""
        }

        ${
            isRestricted()
                ? `<div class="restriction">
                    <b>CHAT RESTRICTION</b><br>
                    ${esc(data.restriction.reason)}<br>
                    Remaining: ${esc(data.restriction.remaining)}
                   </div>`
                : ""
        }

        <div class="chat">
            <div class="chat-window">

                <div class="messages" id="messages">

                    ${
                        messages.length
                            ? messages.map(message => `
                                <div class="msg ${message.system ? "system" : ""}">

                                    <b>
                                        ${
                                            message.system
                                                ? "SYSTEM"
                                                : esc(message.user)
                                        }
                                    </b>

                                    <span class="muted">
                                        ${esc(message.time)}
                                    </span>

                                    <br>

                                    ${esc(message.text)}

                                </div>
                              `).join("")
                            : `
                                <div class="msg system">
                                    <b>SYSTEM</b><br>
                                    No chat messages yet.
                                </div>
                              `
                    }

                </div>

                <div class="chat-input">

                    <input
                        id="chatText"
                        ${blocked ? "disabled" : ""}
                        maxlength="250"
                        placeholder="${
                            blocked
                                ? "Chat unavailable"
                                : "Type a message..."
                        }">

                    <button
                        class="primary"
                        ${blocked ? "disabled" : ""}
                        onclick="sendChat()">
                        SEND
                    </button>

                </div>

            </div>

            <div class="card">

                <h3>Chat Rules</h3>

                <p class="muted">
                    No spam, advertising, harassment or abuse.
                </p>

                <span class="pill">
                    ${blocked ? "RESTRICTED" : "CHAT OPEN"}
                </span>

            </div>

        </div>
    `;

    setTimeout(() => {
        const box = document.getElementById("messages");

        if (box) {
            box.scrollTop = box.scrollHeight;
        }
    }, 10);
};

/* Replace the old local chat sender */
sendChat = async function() {

    if (data.jail || data.hospital) {
        return toast("You cannot chat right now.");
    }

    if (isRestricted()) {
        return toast("Your chat access is restricted.");
    }

    if (!user?.id) {
        return toast("You must be logged in.");
    }

    const input = document.getElementById("chatText");

    if (!input) return;

    const message = input.value.trim();

    if (!message) return;

    if (message.length > 250) {
        return toast("Message is too long.");
    }

    const { error } = await supabaseClient
        .from("chat_messages")
        .insert({
            user_id: user.id,
            username: user.name,
            message: message,
            system: false
        });

    if (error) {
        console.error("Shared chat send error:", error);
        return toast("Message could not be sent.");
    }

    input.value = "";
};

/* Start shared chat whenever a player enters the game */
const originalEnterForChat = enter;

enter = function() {
    originalEnterForChat();
    startSharedChat();
    loadSharedChat();
};

/* Stop Realtime subscription when logging out */
const originalLogoutForChat = logout;

logout = async function() {

    if (sharedChatChannel) {
        await supabaseClient.removeChannel(sharedChatChannel);
        sharedChatChannel = null;
    }

    await originalLogoutForChat();
};
/* =========================================================
   SHARED PLAYER MAIL
   ========================================================= */

async function registerPlayerDirectory(){

    if(!user?.id || !user?.name) return;

    const { error } =
        await supabaseClient
            .from('player_directory')
            .upsert({
                user_id:user.id,
                username:user.name
            });

    if(error){
        console.error('Directory error:',error);
    }
}

/* Make sure every successful login/signup registers the player. */

const _loadPlayerDataOriginal = loadPlayerData;

loadPlayerData = async function(){

    await _loadPlayerDataOriginal();

    await registerPlayerDirectory();
};


/* Replace the mail display with online mail */

renderMail = async function(){

    if(!user?.id) return;

    const { data:mail,error } =
        await supabaseClient
            .from('player_mail')
            .select('*')
            .eq('recipient_id',user.id)
            .order('created_at',{ascending:false});

    if(error){
        console.error(error);
        return toast('Could not load your mail.');
    }

    const list =
        document.getElementById('mailList');

    if(!list) return;

    list.innerHTML =
        (mail || []).length
        ?
        mail.map(x => `
            <div
                class="mail-row ${x.unread ? 'unread' : ''}"
                onclick="readOnlineMail(${x.id})">

                <b>${esc(x.subject)}</b>

                <div class="muted">
                    ${esc(x.sender_name)}
                </div>

                <div>
                    ${esc(x.body)}
                </div>

            </div>
        `).join('')
        :
        '<p class="muted">No mail.</p>';

    update();
};


/* Open mail */

openMail = async function(){

    await renderMail();

    const modal =
        document.getElementById('mailModal');

    if(modal){
        modal.classList.add('open');
    }
};


/* Read mail */

async function readOnlineMail(id){

    if(!user?.id) return;

    const { error } =
        await supabaseClient
            .from('player_mail')
            .update({
                unread:false
            })
            .eq('id',id)
            .eq('recipient_id',user.id);

    if(error){
        console.error(error);
        return toast('Could not update mail.');
    }

    await renderMail();
}


/* Send mail to another player */

sendMail = async function(){

    if(!user?.id){
        return toast('You must be logged in.');
    }

    const recipient =
        document
            .getElementById('mailTo')
            ?.value
            .trim();

    const subject =
        document
            .getElementById('mailSubject')
            ?.value
            .trim();

    const body =
        document
            .getElementById('mailBody')
            ?.value
            .trim();

    if(!recipient || !subject || !body){
        return toast(
            'Complete all mail fields.'
        );
    }

    if(recipient === user.name){
        return toast(
            'You cannot mail yourself.'
        );
    }

    /* Find the recipient safely through the public directory. */

    const { data:target,error:targetError } =
        await supabaseClient
            .from('player_directory')
            .select('user_id,username')
            .eq('username',recipient)
            .maybeSingle();

    if(targetError){
        console.error(targetError);
        return toast(
            'Could not find that player.'
        );
    }

    if(!target){
        return toast(
            'That player does not exist.'
        );
    }

    const { error } =
        await supabaseClient
            .from('player_mail')
            .insert({
                recipient_id:target.user_id,
                sender_id:user.id,
                sender_name:user.name,
                subject:subject,
                body:body,
                system:false,
                unread:true
            });

    if(error){
        console.error(error);
        return toast(
            'Message could not be sent.'
        );
    }

    document.getElementById('mailTo').value='';
    document.getElementById('mailSubject').value='';
    document.getElementById('mailBody').value='';

    toast(
        `Mail sent to ${recipient}.`
    );

    await renderMail();
};
/* =========================================================
   SHARED MULTIPLAYER FORUMS
   ========================================================= */

const ONLINE_FORUMS = [
    {
        id: "general",
        name: "General Discussion",
        description: "Talk about the district."
    },
    {
        id: "announcements",
        name: "Announcements",
        description: "Official staff announcements."
    },
    {
        id: "guides",
        name: "Guides & Tutorials",
        description: "Share strategies and guides."
    },
    {
        id: "factions",
        name: "Faction Recruitment",
        description: "Find or recruit faction members."
    },
    {
        id: "market",
        name: "Marketplace Discussion",
        description: "Trading and item discussion."
    },
    {
        id: "suggestions",
        name: "Suggestions",
        description: "Suggest improvements."
    }
];

async function ensureOnlineForums() {
    for (const forum of ONLINE_FORUMS) {
        const { data: existing, error: findError } =
            await supabaseClient
                .from("forums")
                .select("id")
                .eq("name", forum.name)
                .maybeSingle();

        if (findError) {
            console.error("Forum lookup error:", findError);
            continue;
        }

        if (!existing) {
            const { error } = await supabaseClient
                .from("forums")
                .insert({
                    name: forum.name,
                    description: forum.description,
                    created_by: user.id
                });

            if (error) {
                console.error("Forum creation error:", error);
            }
        }
    }
}

async function getOnlineForums() {
    const { data: forums, error } =
        await supabaseClient
            .from("forums")
            .select("*")
            .order("created_at", { ascending: true });

    if (error) {
        console.error("Forum load error:", error);
        toast("Could not load forums.");
        return [];
    }

    return forums || [];
}

/* Replace forum list with shared forums */

renderForums = async function() {

    if (!user?.id) {
        return toast("You must be logged in.");
    }

    await ensureOnlineForums();

    const forums = await getOnlineForums();

    document.getElementById("main").innerHTML = `
        <div class="hero">
            <h1>Forums</h1>
            <p>
                Everyone can participate in normal forums.
                Staff can lock threads or move them to the Graveyard.
            </p>
        </div>

        <div class="forum-tabs">

            ${forums.map(forum => `
                <button
                    class="button"
                    onclick="openSharedForum(${forum.id})">
                    ${esc(forum.name)}
                </button>
            `).join("")}

            <button
                class="button"
                onclick="openSharedForum('graveyard')">
                Graveyard
            </button>

        </div>

        ${
            isStaff()
            ?
            `
            <div class="card">
                <h3>Create Custom Forum</h3>

                <input
                    id="onlineForumName"
                    placeholder="Forum name">

                <input
                    id="onlineForumDescription"
                    placeholder="Description">

                <button
                    class="primary"
                    onclick="createSharedForum()">
                    CREATE FORUM
                </button>
            </div>
            `
            :
            ""
        }

        <div class="card">
            <h3>Community Forums</h3>

            <p class="muted">
                Select a forum above to view its threads.
            </p>
        </div>
    `;
};


/* Open shared forum */

async function openSharedForum(forumId) {

    if (forumId === "graveyard") {
        return openSharedGraveyard();
    }

    const { data: forum, error } =
        await supabaseClient
            .from("forums")
            .select("*")
            .eq("id", forumId)
            .maybeSingle();

    if (error || !forum) {
        console.error(error);
        return toast("Forum not found.");
    }

    const { data: threads, error: threadError } =
        await supabaseClient
            .from("forum_threads")
            .select("*")
            .eq("forum_id", forum.id)
            .eq("archived", false)
            .order("created_at", { ascending: false });

    if (threadError) {
        console.error(threadError);
        return toast("Could not load forum threads.");
    }

    document.getElementById("main").innerHTML = `

        <div class="hero">

            <button
                class="button"
                onclick="renderForums()">
                ← ALL FORUMS
            </button>

            <h1>${esc(forum.name)}</h1>

            <p>${esc(forum.description || "")}</p>

        </div>

        <div class="card">

            <h3>New Thread</h3>

            <input
                id="sharedThreadTitle"
                placeholder="Thread title">

            <textarea
                id="sharedThreadBody"
                placeholder="Write your post..."></textarea>

            <button
                class="primary"
                onclick="createSharedThread(${forum.id})">
                POST THREAD
            </button>

        </div>

        <div class="card">

            <h3>Threads</h3>

            ${
                threads?.length
                ?
                threads.map(thread => `
                    <div class="forum-thread">

                        <button
                            class="button"
                            onclick="openSharedThread(${thread.id})">
                            OPEN
                        </button>

                        <b>
                            ${esc(thread.title)}
                        </b>

                        <div class="muted">
                            by ${esc(thread.username)}
                            •
                            ${new Date(thread.created_at).toLocaleString()}
                            ${thread.locked ? " • 🔒 LOCKED" : ""}
                        </div>

                        <p>
                            ${esc(thread.body)}
                        </p>

                    </div>
                `).join("")
                :
                `<p class="muted">
                    No threads yet. Start the first discussion.
                </p>`
            }

        </div>
    `;
}


/* Create shared forum */

async function createSharedForum() {

    if (!isStaff()) {
        return toast("Staff access required.");
    }

    const name =
        document.getElementById("onlineForumName")
        ?.value.trim();

    const description =
        document.getElementById("onlineForumDescription")
        ?.value.trim() || "Community forum";

    if (!name || name.length < 3) {
        return toast("Forum name is too short.");
    }

    const { error } =
        await supabaseClient
            .from("forums")
            .insert({
                name,
                description,
                created_by: user.id
            });

    if (error) {
        console.error(error);
        return toast(error.message);
    }

    toast("Forum created.");

    await renderForums();
}


/* Create shared thread */

async function createSharedThread(forumId) {

    const title =
        document.getElementById("sharedThreadTitle")
        ?.value.trim();

    const body =
        document.getElementById("sharedThreadBody")
        ?.value.trim();

    if (!title || !body) {
        return toast("Enter a title and message.");
    }

    const { error } =
        await supabaseClient
            .from("forum_threads")
            .insert({
                forum_id: forumId,
                user_id: user.id,
                username: user.name,
                title,
                body,
                locked: false,
                archived: false
            });

    if (error) {
        console.error(error);
        return toast("Thread could not be created.");
    }

    toast("Thread created.");

    await openSharedForum(forumId);
}


/* Open shared thread */

async function openSharedThread(threadId) {

    const { data: thread, error } =
        await supabaseClient
            .from("forum_threads")
            .select("*")
            .eq("id", threadId)
            .maybeSingle();

    if (error || !thread) {
        console.error(error);
        return toast("Thread not found.");
    }

    const { data: replies, error: replyError } =
        await supabaseClient
            .from("forum_replies")
            .select("*")
            .eq("thread_id", thread.id)
            .order("created_at", { ascending: true });

    if (replyError) {
        console.error(replyError);
        return toast("Could not load replies.");
    }

    const controls =
        isStaff()
        ?
        `
        <div class="forum-moderation">

            <button
                class="button"
                onclick="toggleSharedThread(${thread.id}, ${!thread.locked})">
                ${thread.locked ? "UNLOCK THREAD" : "LOCK THREAD"}
            </button>

            ${
                !thread.archived
                ?
                `
                <button
                    class="danger"
                    onclick="archiveSharedThread(${thread.id})">
                    MOVE TO GRAVEYARD
                </button>
                `
                :
                ""
            }

        </div>
        `
        :
        "";

    const replyBox =
        thread.locked
        ?
        `
        <div class="restriction">
            This thread is locked by staff.
        </div>
        `
        :
        `
        <div class="card">

            <h3>Reply</h3>

            <textarea
                id="sharedReplyBody"
                placeholder="Write a reply..."></textarea>

            <button
                class="primary"
                onclick="replyToSharedThread(${thread.id})">
                POST REPLY
            </button>

        </div>
        `;

    document.getElementById("main").innerHTML = `

        <div class="hero">

            <button
                class="button"
                onclick="openSharedForum(${thread.forum_id})">
                ← BACK TO FORUM
            </button>

            <h1>${esc(thread.title)}</h1>

            <p>
                Started by ${esc(thread.username)}
                •
                ${new Date(thread.created_at).toLocaleString()}
                ${thread.locked ? " • 🔒 LOCKED" : ""}
            </p>

        </div>

        <div class="card">

            <div class="forum-post">

                <b>${esc(thread.username)}</b>

                <p>
                    ${esc(thread.body)}
                </p>

            </div>

            ${
                (replies || []).map(reply => `
                    <div class="forum-post reply">

                        <b>
                            ${esc(reply.username)}

                            ${
                                reply.is_staff
                                ? `<span class="tag">STAFF</span>`
                                : ""
                            }
                        </b>

                        <span class="muted">
                            •
                            ${new Date(reply.created_at).toLocaleString()}
                        </span>

                        <p>
                            ${esc(reply.body)}
                        </p>

                    </div>
                `).join("")
            }

        </div>

        ${replyBox}

        ${controls}
    `;
}


/* Reply */

async function replyToSharedThread(threadId) {

    const body =
        document
            .getElementById("sharedReplyBody")
            ?.value.trim();

    if (!body) {
        return toast("Enter a reply.");
    }

    const { data: thread } =
        await supabaseClient
            .from("forum_threads")
            .select("locked")
            .eq("id", threadId)
            .maybeSingle();

    if (!thread) {
        return toast("Thread not found.");
    }

    if (thread.locked) {
        return toast("Replies are disabled.");
    }

    const { error } =
        await supabaseClient
            .from("forum_replies")
            .insert({
                thread_id: threadId,
                user_id: user.id,
                username: user.name,
                body,
                is_staff: isStaff()
            });

    if (error) {
        console.error(error);
        return toast("Reply could not be posted.");
    }

    toast("Reply posted.");

    await openSharedThread(threadId);
}


/* Staff lock/unlock */

async function toggleSharedThread(threadId, newLocked) {

    if (!isStaff()) {
        return toast("Staff access required.");
    }

    const { error } =
        await supabaseClient
            .from("forum_threads")
            .update({
                locked: newLocked
            })
            .eq("id", threadId);

    if (error) {
        console.error(error);
        return toast("Could not update thread.");
    }

    toast(
        newLocked
            ? "Thread locked."
            : "Thread unlocked."
    );

    await openSharedThread(threadId);
}


/* Move thread to Graveyard */

async function archiveSharedThread(threadId) {

    if (!isStaff()) {
        return toast("Staff access required.");
    }

    const { error } =
        await supabaseClient
            .from("forum_threads")
            .update({
                archived: true,
                locked: true
            })
            .eq("id", threadId);

    if (error) {
        console.error(error);
        return toast("Could not move thread.");
    }

    toast("Thread moved to the Graveyard.");

    await openSharedGraveyard();
}


/* Shared Graveyard */

async function openSharedGraveyard() {

    const { data:threads, error } =
        await supabaseClient
            .from("forum_threads")
            .select("*")
            .eq("archived", true)
            .order("created_at", { ascending: false });

    if (error) {
        console.error(error);
        return toast("Could not load Graveyard.");
    }

    document.getElementById("main").innerHTML = `

        <div class="hero">

            <button
                class="button"
                onclick="renderForums()">
                ← ALL FORUMS
            </button>

            <h1>Graveyard</h1>

            <p>
                Staff-archived threads.
            </p>

            <div class="restriction">
                Everyone can read archived threads.
                Staff can manage them.
            </div>

        </div>

        <div class="card">

            <h3>Archived Threads</h3>

            ${
                threads?.length
                ?
                threads.map(thread => `
                    <div class="forum-thread">

                        <button
                            class="button"
                            onclick="openSharedThread(${thread.id})">
                            OPEN
                        </button>

                        <b>
                            ${esc(thread.title)}
                        </b>

                        <div class="muted">
                            by ${esc(thread.username)}
                            •
                            ${new Date(thread.created_at).toLocaleString()}
                            • 🔒 ARCHIVED
                        </div>

                    </div>
                `).join("")
                :
                `<p class="muted">
                    The Graveyard is empty.
                </p>`
            }

        </div>
    `;
}
/* =========================================================
   FAST SHARED FORUM LOADER
   ========================================================= */

const FAST_FORUM_DEFINITIONS = [
    ["General Discussion", "Talk about the district."],
    ["Announcements", "Official staff announcements."],
    ["Guides & Tutorials", "Share strategies and guides."],
    ["Faction Recruitment", "Find or recruit faction members."],
    ["Marketplace Discussion", "Trading and item discussion."],
    ["Suggestions", "Suggest improvements."]
];

async function ensureOnlineForumsFast() {
    const { data: existing, error } = await supabaseClient
        .from("forums")
        .select("id,name,description")
        .order("created_at", { ascending: true });

    if (error) {
        console.error("Forum lookup error:", error);
        toast("Could not load forums.");
        return [];
    }

    const existingNames = new Set(
        (existing || []).map(x => x.name)
    );

    const missing = FAST_FORUM_DEFINITIONS
        .filter(([name]) => !existingNames.has(name));

    if (missing.length) {
        const rows = missing.map(([name, description]) => ({
            name,
            description,
            created_by: user.id
        }));

        const { error: insertError } = await supabaseClient
            .from("forums")
            .insert(rows);

        if (insertError) {
            console.error("Forum seed error:", insertError);
        }
    }

    const { data: forums, error: reloadError } = await supabaseClient
        .from("forums")
        .select("id,name,description,created_at")
        .order("created_at", { ascending: true });

    if (reloadError) {
        console.error("Forum reload error:", reloadError);
        toast("Could not load forums.");
        return [];
    }

    return forums || [];
}


/* Replace the slow forum page */

renderForums = async function() {

    if (!user?.id) {
        return toast("You must be logged in.");
    }

    document.getElementById("main").innerHTML = `
        <div class="hero">
            <h1>Forums</h1>
            <p>Loading forums...</p>
        </div>
    `;

    const forums = await ensureOnlineForumsFast();

    document.getElementById("main").innerHTML = `
        <div class="hero">
            <h1>Forums</h1>
            <p>
                Community discussion, guides, recruitment,
                announcements and more.
            </p>
        </div>

        <div class="forum-tabs">

            ${forums.map(forum => `
                <button
                    class="button"
                    onclick="openSharedForum(${forum.id})">
                    ${esc(forum.name)}
                </button>
            `).join("")}

            <button
                class="button"
                onclick="openSharedGraveyard()">
                Graveyard
            </button>

        </div>

        ${
            isStaff()
            ?
            `
            <div class="card">
                <h3>Create Custom Forum</h3>

                <input
                    id="onlineForumName"
                    placeholder="Forum name">

                <input
                    id="onlineForumDescription"
                    placeholder="Description">

                <button
                    class="primary"
                    onclick="createSharedForum()">
                    CREATE FORUM
                </button>
            </div>
            `
            :
            ""
        }

        <div class="card">
            <h3>Community Forums</h3>
            <p class="muted">
                Select a forum to view its threads.
            </p>
        </div>
    `;
};


/* Faster forum opening */

openSharedForum = async function(forumId) {

    const { data: forum, error } =
        await supabaseClient
            .from("forums")
            .select("id,name,description")
            .eq("id", forumId)
            .maybeSingle();

    if (error || !forum) {
        console.error(error);
        return toast("Forum not found.");
    }

    const { data: threads, error: threadError } =
        await supabaseClient
            .from("forum_threads")
            .select(
                "id,forum_id,user_id,username,title,body,locked,archived,created_at"
            )
            .eq("forum_id", forum.id)
            .eq("archived", false)
            .order("created_at", { ascending: false });

    if (threadError) {
        console.error(threadError);
        return toast("Could not load forum threads.");
    }

    document.getElementById("main").innerHTML = `
        <div class="hero">

            <button
                class="button"
                onclick="renderForums()">
                ← ALL FORUMS
            </button>

            <h1>${esc(forum.name)}</h1>

            <p>${esc(forum.description || "")}</p>

        </div>

        <div class="card">

            <h3>New Thread</h3>

            <input
                id="sharedThreadTitle"
                placeholder="Thread title">

            <textarea
                id="sharedThreadBody"
                placeholder="Write your post..."></textarea>

            <button
                class="primary"
                onclick="createSharedThread(${forum.id})">
                POST THREAD
            </button>

        </div>

        <div class="card">

            <h3>Threads</h3>

            ${
                threads?.length
                ?
                threads.map(thread => `
                    <div class="forum-thread">

                        <button
                            class="button"
                            onclick="openSharedThread(${thread.id})">
                            OPEN
                        </button>

                        <b>${esc(thread.title)}</b>

                        <div class="muted">
                            by ${esc(thread.username)}
                            •
                            ${new Date(thread.created_at).toLocaleString()}
                            ${thread.locked ? " • 🔒 LOCKED" : ""}
                        </div>

                        <p>
                            ${esc(thread.body)}
                        </p>

                    </div>
                `).join("")
                :
                `<p class="muted">
                    No threads yet.
                </p>`
            }

        </div>
    `;
};


/* Fix Graveyard loading */

openSharedGraveyard = async function() {

    const { data:threads, error } =
        await supabaseClient
            .from("forum_threads")
            .select(
                "id,forum_id,username,title,body,locked,archived,created_at"
            )
            .eq("archived", true)
            .order("created_at", { ascending: false });

    if (error) {
        console.error("Graveyard error:", error);
        return toast("Could not load the Graveyard.");
    }

    document.getElementById("main").innerHTML = `
        <div class="hero">

            <button
                class="button"
                onclick="renderForums()">
                ← ALL FORUMS
            </button>

            <h1>Graveyard</h1>

            <p>
                Staff-archived threads.
            </p>

            <div class="restriction">
                Everyone can read archived threads.
                Staff can manage them.
            </div>

        </div>

        <div class="card">

            <h3>Archived Threads</h3>

            ${
                threads?.length
                ?
                threads.map(thread => `
                    <div class="forum-thread">

                        <button
                            class="button"
                            onclick="openSharedThread(${thread.id})">
                            OPEN
                        </button>

                        <b>${esc(thread.title)}</b>

                        <div class="muted">
                            by ${esc(thread.username)}
                            •
                            ${new Date(thread.created_at).toLocaleString()}
                            • 🔒 ARCHIVED
                        </div>

                    </div>
                `).join("")
                :
                `<p class="muted">
                    The Graveyard is empty.
                </p>`
            }

        </div>
    `;
};


/* Fix archive permission handling */

archiveSharedThread = async function(threadId) {

    if (!isStaff()) {
        return toast("Staff access required.");
    }

    const { error } =
        await supabaseClient
            .from("forum_threads")
            .update({
                archived: true,
                locked: true
            })
            .eq("id", threadId);

    if (error) {
        console.error("Archive error:", error);
        return toast("Could not move thread to the Graveyard.");
    }

    toast("Thread moved to the Graveyard.");

    await openSharedGraveyard();
};
/* =========================================================
   SHARED MULTIPLAYER MARKET
   ========================================================= */

let marketChannel = null;

async function loadMarketListings() {
    const { data: listings, error } =
        await supabaseClient
            .from("market_listings")
            .select("id,seller_id,seller_name,item_name,price,quantity,active,created_at")
            .eq("active", true)
            .gt("quantity", 0)
            .order("created_at", { ascending: false });

    if (error) {
        console.error("Market load error:", error);
        toast("Could not load the market.");
        return [];
    }

    return listings || [];
}

function startMarketRealtime() {
    if (marketChannel) {
        supabaseClient.removeChannel(marketChannel);
    }

    marketChannel = supabaseClient
        .channel("iron-district-market")
        .on(
            "postgres_changes",
            {
                event: "*",
                schema: "public",
                table: "market_listings"
            },
            () => {
                if (document.getElementById("marketListings")) {
                    renderSharedMarket();
                }
            }
        )
        .subscribe();
}

async function renderSharedMarket() {
    const listings = await loadMarketListings();

    document.getElementById("main").innerHTML = `
        <div class="hero">
            <h1>Market</h1>
            <p>Buy and sell items with other Iron District players.</p>
        </div>

        <div class="card">
            <h3>Create Market Listing</h3>

            <div class="restriction-grid">

                <div>
                    <label>Item</label>
                    <input
                        id="marketItemName"
                        maxlength="60"
                        placeholder="Item name">
                </div>

                <div>
                    <label>Price</label>
                    <input
                        id="marketItemPrice"
                        type="number"
                        min="1"
                        step="1"
                        placeholder="Price">
                </div>

                <div>
                    <label>Quantity</label>
                    <input
                        id="marketItemQuantity"
                        type="number"
                        min="1"
                        step="1"
                        value="1">
                </div>

            </div>

            <button
                class="primary"
                onclick="createSharedMarketListing()">
                LIST ITEM
            </button>
        </div>

        <div class="card" id="marketListings">
            <h3>Available Listings</h3>

            ${
                listings.length
                ?
                `
                <table class="table">
                    <tr>
                        <th>Item</th>
                        <th>Seller</th>
                        <th>Price</th>
                        <th>Quantity</th>
                        <th></th>
                    </tr>

                    ${listings.map(listing => `
                        <tr>
                            <td>${esc(listing.item_name)}</td>

                            <td>${esc(listing.seller_name)}</td>

                            <td>
                                $${Number(listing.price).toLocaleString()}
                            </td>

                            <td>
                                ${listing.quantity}
                            </td>

                            <td>
                                ${
                                    listing.seller_id === user.id
                                    ?
                                    `<button class="button" disabled>
                                        YOUR LISTING
                                    </button>`
                                    :
                                    `<button
                                        class="button"
                                        onclick="buySharedMarketListing(${listing.id})">
                                        BUY
                                    </button>`
                                }
                            </td>
                        </tr>
                    `).join("")}

                </table>
                `
                :
                `<p class="muted">
                    There are currently no player listings.
                </p>`
            }
        </div>

        <div class="card">
            <h3>Your Listings</h3>

            ${
                listings.filter(x => x.seller_id === user.id).length
                ?
                `
                <p class="muted">
                    Your active listings are marked "YOUR LISTING".
                </p>
                `
                :
                `
                <p class="muted">
                    You have no active listings.
                </p>
                `
            }
        </div>
    `;
}

async function createSharedMarketListing() {
    if (!user?.id) {
        return toast("You must be logged in.");
    }

    if (data.jail || data.hospital) {
        return toast("You cannot use the market right now.");
    }

    const itemName =
        document.getElementById("marketItemName")
            ?.value.trim();

    const price =
        Number(
            document.getElementById("marketItemPrice")
                ?.value
        );

    const quantity =
        Number(
            document.getElementById("marketItemQuantity")
                ?.value
        );

    if (!itemName || itemName.length < 2) {
        return toast("Enter an item name.");
    }

    if (!Number.isInteger(price) || price <= 0) {
        return toast("Enter a valid price.");
    }

    if (!Number.isInteger(quantity) || quantity <= 0) {
        return toast("Enter a valid quantity.");
    }

    if (price > 1000000000) {
        return toast("Price is too high.");
    }

    if (quantity > 100000) {
        return toast("Quantity is too high.");
    }

    const { error } =
        await supabaseClient
            .from("market_listings")
            .insert({
                seller_id: user.id,
                seller_name: user.name,
                item_name: itemName,
                price: price,
                quantity: quantity,
                active: true
            });

    if (error) {
        console.error("Market listing error:", error);
        return toast(error.message || "Listing could not be created.");
    }

    document.getElementById("marketItemName").value = "";
    document.getElementById("marketItemPrice").value = "";
    document.getElementById("marketItemQuantity").value = "1";

    toast("Item listed on the market.");

    await renderSharedMarket();
}

async function buySharedMarketListing(listingId) {
    if (!user?.id) {
        return toast("You must be logged in.");
    }

    if (data.jail || data.hospital) {
        return toast("You cannot use the market right now.");
    }

    if (!confirm("Buy this item?")) {
        return;
    }

    const { data: result, error } =
        await supabaseClient
            .rpc("buy_market_listing", {
                p_listing_id: listingId
            });

    if (error) {
        console.error("Market purchase error:", error);
        return toast(error.message || "Purchase failed.");
    }

    if (!result) {
        return toast("Purchase failed.");
    }

    /*
       The database function already deducted the buyer's cash.
       Reload the player's saved data so the UI reflects the
       authoritative database value.
    */

    await loadPlayerData();

    toast(
        `Purchased ${result.item_name} for $${Number(
            result.price
        ).toLocaleString()}.`
    );

    await renderSharedMarket();
    update();
}

async function openSharedMarket() {
    if (!user?.id) {
        return toast("You must be logged in.");
    }

    document.getElementById("main").innerHTML = `
        <div class="hero">
            <h1>Market</h1>
            <p>Loading marketplace...</p>
        </div>
    `;

    await renderSharedMarket();
}

/*
   Replace the original fixed Market page.
*/

const originalPageForMarket = page;

page = function(section, button) {

    if (section === "market") {
        document
            .querySelectorAll(".nav")
            .forEach(x => x.classList.remove("active"));

        if (button) {
            button.classList.add("active");
        }

        openSharedMarket();
        return;
    }

    return originalPageForMarket(section, button);
};

/*
   Start realtime market updates after the player logs in.
*/

const originalEnterForMarket = enter;

enter = function() {
    originalEnterForMarket();
    startMarketRealtime();
};
/* MARKET PURCHASE REFRESH FIX */

async function refreshMarketAfterPurchase() {
    await loadPlayerData();
    await renderSharedMarket();
    update();
}

/* Replace the existing purchase function */

buySharedMarketListing = async function(listingId) {

    if (!user?.id) {
        return toast("You must be logged in.");
    }

    if (data.jail || data.hospital) {
        return toast("You cannot use the market right now.");
    }

    const { data: result, error } =
        await supabaseClient.rpc("buy_market_listing", {
            p_listing_id: listingId
        });

    if (error) {
        console.error("Purchase error:", error);
        return toast(error.message || "Purchase failed.");
    }

    if (!result) {
        return toast("Purchase failed.");
    }

    await refreshMarketAfterPurchase();

    toast(
        `Purchased ${result.item_name} for $${Number(result.price).toLocaleString()}.`
    );
};
/* =========================================================
   PLAYER INVENTORY
   ========================================================= */

function getInventory() {
    if (!data.inventory || typeof data.inventory !== "object") {
        data.inventory = {};
    }
    return data.inventory;
}

function renderInventory() {
    const inventory = getInventory();

    const entries = Object.entries(inventory)
        .filter(([_, quantity]) => Number(quantity) > 0);

    document.getElementById("main").innerHTML = `
        <div class="hero">
            <h1>Inventory</h1>
            <p>Your items and possessions.</p>
        </div>

        <div class="card">
            <h3>Your Items</h3>

            ${
                entries.length
                    ? `
                        <table class="table">
                            <tr>
                                <th>Item</th>
                                <th>Quantity</th>
                            </tr>

                            ${entries.map(([item, quantity]) => `
                                <tr>
                                    <td>${esc(item)}</td>
                                    <td>${Number(quantity)}</td>
                                </tr>
                            `).join("")}
                        </table>
                      `
                    : `
                        <p class="muted">
                            Your inventory is empty.
                        </p>
                      `
            }
        </div>
    `;
}

/* Add Inventory to the navigation */

const originalBuildNavWithInventory = buildNav;

buildNav = function() {
    originalBuildNavWithInventory();

    const nav = document.getElementById("nav");

    if (!nav || nav.querySelector('[data-inventory-tab="true"]')) {
        return;
    }

    const inventoryButton = document.createElement("button");

    inventoryButton.className = "nav";
    inventoryButton.dataset.inventoryTab = "true";
    inventoryButton.textContent = "▣ Inventory";
    inventoryButton.onclick = function() {
        document
            .querySelectorAll(".nav")
            .forEach(x => x.classList.remove("active"));

        inventoryButton.classList.add("active");
        renderInventory();
    };

    nav.appendChild(inventoryButton);
};
/* =========================================================
   SHARED STAFF MODERATION
   ========================================================= */

async function loadSharedModeration() {
    if (!user?.id) return;

    const { data: moderation, error } = await supabaseClient
        .from("player_moderation")
        .select("*")
        .eq("target_user_id", user.id)
        .eq("active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (error) {
        console.error("Moderation load error:", error);
        return;
    }

    if (!moderation) {
        data.restriction = null;
        return;
    }

    const expires = moderation.expires_at
        ? new Date(moderation.expires_at).getTime()
        : null;

    if (expires && Date.now() >= expires) {
        data.restriction = null;
        return;
    }

    data.restriction = {
        id: moderation.id,
        until: expires,
        reason: moderation.reason || "Violation of district rules",
        remaining: expires
            ? formatRemaining(expires - Date.now())
            : "Active",
        shared: true
    };
}


/* Replace the old local restriction checker */

isRestricted = function() {

    if (!data.restriction) return false;

    if (
        data.restriction.until &&
        Date.now() >= data.restriction.until
    ) {
        data.restriction = null;
        return false;
    }

    if (data.restriction.until) {
        data.restriction.remaining =
            formatRemaining(
                data.restriction.until - Date.now()
            );
    }

    return true;
};


/* Find a player safely */

async function findPlayerForStaff(username) {

    const name = username?.trim();

    if (!name) return null;

    const { data: player, error } =
        await supabaseClient
            .from("player_directory")
            .select("user_id,username")
            .eq("username", name)
            .maybeSingle();

    if (error) {
        console.error("Player lookup error:", error);
        toast("Could not find that player.");
        return null;
    }

    return player || null;
}


/* Shared staff restriction */

restrictPlayer = async function() {

    if (!isStaff()) {
        return toast("Staff access required.");
    }

    const target =
        document.getElementById("restrictTarget")
            ?.value.trim();

    const durationValue =
        document.getElementById("restrictTime")
            ?.value;

    const customValue =
        document.getElementById("restrictCustom")
            ?.value;

    const reason =
        document.getElementById("restrictReason")
            ?.value.trim()
        || "Violation of district rules";

    if (!target) {
        return toast("Enter a player username.");
    }

    if (target === user.name) {
        return toast("Enter the player you want to moderate.");
    }

    let milliseconds =
        duration(
            durationValue,
            customValue
        );

    if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
        return toast("Enter a valid restriction duration.");
    }

    const minutes = Math.max(
        1,
        Math.ceil(milliseconds / 60000)
    );

    const player =
        await findPlayerForStaff(target);

    if (!player) {
        return toast("That player does not exist.");
    }

    const { data: result, error } =
        await supabaseClient
            .rpc("apply_player_restriction", {
                p_target_user_id: player.user_id,
                p_target_username: player.username,
                p_action_type: "chat_restriction",
                p_reason: reason,
                p_minutes: minutes
            });

    if (error) {
        console.error("Restriction error:", error);
        return toast(error.message || "Restriction failed.");
    }

    /* Send the official staff notice directly to the target. */

    const { error: mailError } =
        await supabaseClient
            .from("player_mail")
            .insert({
                recipient_id: player.user_id,
                sender_id: user.id,
                sender_name: "Iron District Staff",
                subject: "Chat Restriction",
                body:
                    `Your chat access has been restricted for ` +
                    `${formatRemaining(milliseconds)}. ` +
                    `Reason: ${reason}`,
                system: true,
                unread: true
            });

    if (mailError) {
        console.error("Moderation mail error:", mailError);
    }

    toast(
        `${player.username} has been restricted for ` +
        `${formatRemaining(milliseconds)}.`
    );

    renderStaff("restrictions");
};


/* Clear a player's active restrictions */

clearRestriction = async function() {

    if (!isStaff()) {
        return toast("Staff access required.");
    }

    const target =
        document.getElementById("restrictTarget")
            ?.value.trim();

    if (!target) {
        return toast("Enter a player username.");
    }

    const player =
        await findPlayerForStaff(target);

    if (!player) {
        return toast("That player does not exist.");
    }

    const { error } =
        await supabaseClient
            .from("player_moderation")
            .update({
                active: false
            })
            .eq("target_user_id", player.user_id)
            .eq("active", true);

    if (error) {
        console.error("Clear restriction error:", error);
        return toast("Could not clear restriction.");
    }

    const { error: mailError } =
        await supabaseClient
            .from("player_mail")
            .insert({
                recipient_id: player.user_id,
                sender_id: user.id,
                sender_name: "Iron District Staff",
                subject: "Restriction Cleared",
                body:
                    "Your active chat restriction has been cleared. " +
                    "Please follow the Iron District rules going forward.",
                system: true,
                unread: true
            });

    if (mailError) {
        console.error("Clear restriction mail error:", mailError);
    }

    toast(`${player.username}'s restriction was cleared.`);

    renderStaff("restrictions");
};


/* Load moderation whenever a player logs in */

const originalLoadPlayerDataForModeration = loadPlayerData;

loadPlayerData = async function() {

    await originalLoadPlayerDataForModeration();

    await loadSharedModeration();
};


/* Refresh moderation status when the player enters */

const originalEnterForModeration = enter;

enter = function() {

    originalEnterForModeration();

    loadSharedModeration().then(() => {
        update();

        if (
            document.getElementById("messages") &&
            typeof renderChat === "function"
        ) {
            renderChat();
        }
    });
};


/* Make the Staff Center target field start blank instead of
   accidentally restricting the staff member themselves. */

const originalRenderStaffForModeration = renderStaff;

renderStaff = function(tab = "messages", cat = "Advertising") {

    originalRenderStaffForModeration(tab, cat);

    if (tab === "restrictions") {

        const target =
            document.getElementById("restrictTarget");

        if (target) {
            target.value = "";
            target.placeholder = "Player username";
        }
    }
};


/* Keep the active shared restriction current */

setInterval(() => {

    if (!user?.id) return;

    if (data.restriction?.shared) {
        loadSharedModeration().then(() => {
            update();
        });
    }

}, 10000);
/* =========================================================
   FINAL SHARED STAFF MAIL + NOTIFICATIONS
   ========================================================= */

let ironMailChannel = null;
let ironMailBadgeBusy = false;


/* ---------- Load unread count ---------- */

async function refreshIronMailBadge() {

    if (!user?.id || ironMailBadgeBusy) return;

    ironMailBadgeBusy = true;

    try {

        const { count, error } = await supabaseClient
            .from("player_mail")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq("recipient_id", user.id)
            .eq("unread", true);

        if (error) {
            console.error("Mail badge:", error);
            return;
        }

        const badge =
            document.getElementById("mailBadge");

        if (badge) {
            badge.textContent = String(count || 0);
        }

    } finally {
        ironMailBadgeBusy = false;
    }
}


/* ---------- Load actual shared mailbox ---------- */

renderMail = async function () {

    if (!user?.id) return;

    const { data:mail, error } =
        await supabaseClient
            .from("player_mail")
            .select(`
                id,
                sender_id,
                sender_name,
                subject,
                body,
                system,
                unread,
                created_at
            `)
            .eq("recipient_id", user.id)
            .order("created_at", {
                ascending: false
            });

    if (error) {
        console.error("Mailbox:", error);
        return toast("Could not load your mail.");
    }

    const list =
        document.getElementById("mailList");

    if (!list) return;

    list.innerHTML =
        mail?.length
        ?
        mail.map(message => `
            <div
                class="mail-row ${message.unread ? "unread" : ""}"
                onclick="readIronMail(${message.id})">

                <b>
                    ${esc(message.subject)}
                </b>

                <div class="muted">
                    ${esc(message.sender_name)}
                    ${message.system ? " • SYSTEM" : ""}
                </div>

                <div>
                    ${esc(message.body)}
                </div>

            </div>
        `).join("")
        :
        `<p class="muted">No mail.</p>`;

    await refreshIronMailBadge();
};


/* ---------- Open mailbox ---------- */

openMail = async function () {

    await renderMail();

    const modal =
        document.getElementById("mailModal");

    if (modal) {
        modal.classList.add("open");
    }
};


/* ---------- Read mail ---------- */

async function readIronMail(id) {

    if (!user?.id) return;

    const { error } =
        await supabaseClient
            .from("player_mail")
            .update({
                unread: false
            })
            .eq("id", id)
            .eq("recipient_id", user.id);

    if (error) {
        console.error("Read mail:", error);
        return toast("Could not mark mail as read.");
    }

    await renderMail();
}


/* ---------- Find player ---------- */

async function findIronDistrictPlayer(username) {

    const name =
        String(username || "").trim();

    if (!name) return null;

    const { data:player, error } =
        await supabaseClient
            .from("player_directory")
            .select("user_id,username")
            .eq("username", name)
            .maybeSingle();

    if (error) {
        console.error("Player lookup:", error);
        toast("Could not search for that player.");
        return null;
    }

    return player;
}


/* ---------- Send normal player mail ---------- */

sendMail = async function () {

    if (!user?.id) {
        return toast("You must be logged in.");
    }

    const recipient =
        document.getElementById("mailTo")
            ?.value.trim();

    const subject =
        document.getElementById("mailSubject")
            ?.value.trim();

    const body =
        document.getElementById("mailBody")
            ?.value.trim();

    if (!recipient || !subject || !body) {
        return toast("Complete all mail fields.");
    }

    if (recipient === user.name) {
        return toast("You cannot mail yourself.");
    }

    const target =
        await findIronDistrictPlayer(recipient);

    if (!target) {
        return toast("That player does not exist.");
    }

    const { error } =
        await supabaseClient
            .from("player_mail")
            .insert({
                recipient_id: target.user_id,
                sender_id: user.id,
                sender_name: user.name,
                subject,
                body,
                system: false,
                unread: true
            });

    if (error) {
        console.error("Send mail:", error);
        return toast(error.message || "Mail could not be sent.");
    }

    document.getElementById("mailTo").value = "";
    document.getElementById("mailSubject").value = "";
    document.getElementById("mailBody").value = "";

    toast(`Mail sent to ${target.username}.`);

    await renderMail();
};


/* =========================================================
   STAFF AUTOMATED SYSTEM MESSAGES
   ========================================================= */

chooseStaffMessage = function (body) {
    const field = document.getElementById("staffBody");

    if (!field) {
        return toast("Message editor is unavailable.");
    }

    field.value = String(body || "");
    field.focus();
};


/* Send automated system message to selected player */

staffSend = async function () {
    if (!isStaff()) {
        return toast("Staff access required.");
    }

    const targetName =
        document.getElementById("staffTarget")?.value.trim();

    const subject =
        document.getElementById("staffSubject")?.value.trim()
        || "System Notice";

    const body =
        document.getElementById("staffBody")?.value.trim();

    if (!targetName) {
        return toast("Enter a player username.");
    }

    if (!body) {
        return toast("Choose an automated message or write one first.");
    }

    if (targetName === user.name) {
        return toast("Enter the player who should receive the message.");
    }

    const { data: target, error: lookupError } =
        await supabaseClient
            .from("player_directory")
            .select("user_id,username")
            .eq("username", targetName)
            .maybeSingle();

    if (lookupError) {
        console.error(lookupError);
        return toast("Could not find that player.");
    }

    if (!target) {
        return toast("That player does not exist.");
    }

    const { error } =
        await supabaseClient
            .rpc("send_staff_system_mail", {
                p_target_user_id: target.user_id,
                p_target_username: target.username,
                p_subject: subject,
                p_body: body
            });

    if (error) {
        console.error(error);
        return toast(error.message || "System message could not be sent.");
    }

    toast(`System message sent to ${target.username}.`);
};

/* =========================================================
   REALTIME MAIL NOTIFICATIONS
   ========================================================= */

function startIronMailNotifications() {

    if (!user?.id) return;

    if (ironMailChannel) {
        supabaseClient.removeChannel(
            ironMailChannel
        );

        ironMailChannel = null;
    }

    ironMailChannel =
        supabaseClient
            .channel(
                `iron-mail-${user.id}`
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "player_mail",
                    filter:
                        `recipient_id=eq.${user.id}`
                },
                payload => {

                    const message =
                        payload.new;

                    if (!message) return;

                    /* Update only the recipient's badge. */
                    refreshIronMailBadge();

                    toast(
                        `New mail from ${message.sender_name}`
                    );
                }
            )
            .subscribe(status => {
                console.log(
                    "Iron District mail status:",
                    status
                );
            });
}


/* Start notifications after login */

const ironOriginalEnter =
    enter;

enter = function () {

    ironOriginalEnter();

    registerPlayerDirectory();

    refreshIronMailBadge();

    startIronMailNotifications();
};


/* Clean subscription during logout */

const ironOriginalLogout =
    logout;

logout = async function () {

    if (ironMailChannel) {

        await supabaseClient
            .removeChannel(
                ironMailChannel
            );

        ironMailChannel = null;
    }

    await ironOriginalLogout();
};
/* =========================================================
   SHARED STAFF ROLES
   ========================================================= */

async function loadSharedStaffRoles() {
    const { data: roles, error } = await supabaseClient
        .from("staff_roles")
        .select("user_id,username,role");

    if (error) {
        console.error("Staff roles:", error);
        return;
    }

    data.staffRoles = {};

    for (const row of roles || []) {
        data.staffRoles[row.username] = row.role;
    }

    if (user?.name === "IronDistrict") {
        user.role = "Owner";
    } else {
        user.role = data.staffRoles[user.name] || "Player";
    }
}

assignRole = async function () {
    if (user?.role !== "Owner") {
        return toast("Only the Owner can assign roles.");
    }

    const username =
        document.getElementById("roleUser")?.value.trim();

    const role =
        document.getElementById("roleValue")?.value;

    if (!username || !role) {
        return toast("Enter a username and role.");
    }

    if (username === "IronDistrict") {
        return toast("The Owner role cannot be changed.");
    }

    const target = await findIronDistrictPlayer(username);

    if (!target) {
        return toast("That player does not exist.");
    }

    const { error } = await supabaseClient
        .from("staff_roles")
        .upsert({
            user_id: target.user_id,
            username: target.username,
            role: role
        });

    if (error) {
        console.error(error);
        return toast(error.message || "Role could not be saved.");
    }

    await loadSharedStaffRoles();

    toast(`${username} is now ${role}.`);

    renderStaff("roles");
};

removeRole = async function (username) {
    if (user?.role !== "Owner") {
        return toast("Only the Owner can remove roles.");
    }

    if (username === "IronDistrict") {
        return toast("The Owner cannot be removed.");
    }

    const { error } = await supabaseClient
        .from("staff_roles")
        .delete()
        .eq("username", username);

    if (error) {
        console.error(error);
        return toast("Staff role could not be removed.");
    }

    await loadSharedStaffRoles();

    toast("Staff role removed.");

    renderStaff("roles");
};


/* Load roles whenever the account loads */

const previousLoadForRoles = loadPlayerData;

loadPlayerData = async function () {
    await previousLoadForRoles();
    await loadSharedStaffRoles();
};
/* =========================================================
   INVENTORY + ITEM USE
   ========================================================= */

const ITEM_DEFINITIONS = {
    "Energy Drink": {
        description: "Restores 25 energy.",
        use: "energy",
        amount: 25
    },

    "Med Kit": {
        description: "Restores 30 life.",
        use: "life",
        amount: 30
    },

    "Lockpick Set": {
        description: "A useful criminal tool.",
        use: "none",
        amount: 0
    },

    "Kevlar Vest": {
        description: "Protective equipment.",
        use: "none",
        amount: 0
    },

    "Lockpick": {
        description: "A basic lockpicking tool.",
        use: "none",
        amount: 0
    }
};

function ensureInventory() {
    if (!data.inventory || typeof data.inventory !== "object") {
        data.inventory = {};
    }

    return data.inventory;
}

function itemQuantity(itemName) {
    const inventory = ensureInventory();
    return Number(inventory[itemName] || 0);
}

function addItem(itemName, amount = 1) {
    const inventory = ensureInventory();

    inventory[itemName] =
        Number(inventory[itemName] || 0) + amount;

    save();
}

function removeItem(itemName, amount = 1) {
    const inventory = ensureInventory();

    const current =
        Number(inventory[itemName] || 0);

    if (current < amount) {
        return false;
    }

    const remaining = current - amount;

    if (remaining <= 0) {
        delete inventory[itemName];
    } else {
        inventory[itemName] = remaining;
    }

    return true;
}

function renderInventory() {
    const inventory = ensureInventory();

    const entries =
        Object.entries(inventory)
            .filter(([_, quantity]) => Number(quantity) > 0);

    document.getElementById("main").innerHTML = `
        <div class="hero">
            <h1>Inventory</h1>
            <p>Your items and possessions.</p>
        </div>

        <div class="card">
            <h3>Your Items</h3>

            ${
                entries.length
                ?
                `
                <table class="table">

                    <tr>
                        <th>Item</th>
                        <th>Description</th>
                        <th>Quantity</th>
                        <th></th>
                    </tr>

                    ${entries.map(([item, quantity]) => {

                        const definition =
                            ITEM_DEFINITIONS[item] || {
                                description:
                                    "No description available.",
                                use: "none"
                            };

                        const usable =
                            definition.use !== "none";

                        return `
                            <tr>

                                <td>
                                    <b>${esc(item)}</b>
                                </td>

                                <td>
                                    ${esc(definition.description)}
                                </td>

                                <td>
                                    ${quantity}
                                </td>

                                <td>
                                    ${
                                        usable
                                        ?
                                        `
                                        <button
                                            class="button"
                                            onclick="useInventoryItem('${esc(item)}')">
                                            USE
                                        </button>
                                        `
                                        :
                                        `
                                        <span class="pill">
                                            EQUIPMENT
                                        </span>
                                        `
                                    }
                                </td>

                            </tr>
                        `;
                    }).join("")}

                </table>
                `
                :
                `
                <p class="muted">
                    Your inventory is empty.
                </p>
                `
            }
        </div>
    `;
}

async function useInventoryItem(itemName) {

    const inventory =
        ensureInventory();

    if (itemQuantity(itemName) <= 0) {
        return toast("You don't have that item.");
    }

    const definition =
        ITEM_DEFINITIONS[itemName];

    if (!definition || definition.use === "none") {
        return toast("That item cannot be used.");
    }

    if (data.jail && definition.use !== "life") {
        return toast(
            "You cannot use that item while jailed."
        );
    }

    if (definition.use === "energy") {

        const oldEnergy =
            Number(data.energy || 0);

        if (oldEnergy >= 100) {
            return toast(
                "Your energy is already full."
            );
        }

        data.energy =
            Math.min(
                100,
                oldEnergy + definition.amount
            );
    }

    if (definition.use === "life") {

        const oldLife =
            Number(data.life || 0);

        if (oldLife >= 100) {
            return toast(
                "Your life is already full."
            );
        }

        data.life =
            Math.min(
                100,
                oldLife + definition.amount
            );
    }

    if (!removeItem(itemName, 1)) {
        return toast("Could not use that item.");
    }

    await save();

    toast(`${itemName} used.`);

    renderInventory();
    update();
}


/* Put Inventory into the navigation */

const oldBuildNavInventory =
    buildNav;

buildNav = function() {

    oldBuildNavInventory();

    const nav =
        document.getElementById("nav");

    if (!nav) return;

    if (
        nav.querySelector(
            '[data-inventory-button="true"]'
        )
    ) {
        return;
    }

    const button =
        document.createElement("button");

    button.className = "nav";
    button.dataset.inventoryButton = "true";
    button.textContent = "▣ Inventory";

    button.onclick = function() {

        document
            .querySelectorAll(".nav")
            .forEach(x =>
                x.classList.remove("active")
            );

        button.classList.add("active");

        renderInventory();
    };

    nav.appendChild(button);
};


/* Ensure old player accounts have an inventory */

const oldLoadForInventory =
    loadPlayerData;

loadPlayerData = async function() {

    await oldLoadForInventory();

    ensureInventory();

    if (!Array.isArray(data.inventory)) {
        data.inventory = data.inventory || {};
    }
};
/* =========================================================
   INVENTORY NAVIGATION CLEANUP
   ========================================================= */

(function ensureInventoryNavigation() {

    const originalBuildNavInventoryFinal = buildNav;

    buildNav = function () {

        originalBuildNavInventoryFinal();

        const nav = document.getElementById("nav");

        if (!nav) return;

        if (nav.querySelector('[data-inventory-final="true"]')) {
            return;
        }

        const inventoryButton =
            document.createElement("button");

        inventoryButton.className = "nav";
        inventoryButton.dataset.inventoryFinal = "true";
        inventoryButton.textContent = "▣ Inventory";

        inventoryButton.onclick = function () {

            document
                .querySelectorAll(".nav")
                .forEach(button =>
                    button.classList.remove("active")
                );

            inventoryButton.classList.add("active");

            renderInventory();
        };

        nav.appendChild(inventoryButton);
    };

})();
/* =========================================================
   MODERATION LOG
   ========================================================= */

async function loadModerationLog() {

    if (!isStaff()) {
        return [];
    }

    const { data: logs, error } =
        await supabaseClient
            .from("moderation_log")
            .select("*")
            .order("created_at", {
                ascending: false
            })
            .limit(100);

    if (error) {
        console.error("Moderation log:", error);
        toast("Could not load moderation history.");
        return [];
    }

    return logs || [];
}

async function showModerationLog() {

    const logs =
        await loadModerationLog();

    document.getElementById("main").innerHTML = `
        <div class="hero">
            <h1>Moderation Log</h1>
            <p>Recent staff moderation actions.</p>
        </div>

        <div class="card">

            ${
                logs.length
                ?
                `
                <table class="table">

                    <tr>
                        <th>Player</th>
                        <th>Action</th>
                        <th>Reason</th>
                        <th>Staff</th>
                        <th>Date</th>
                    </tr>

                    ${logs.map(log => `
                        <tr>

                            <td>
                                ${esc(log.target_username)}
                            </td>

                            <td>
                                ${esc(log.action_type)}
                            </td>

                            <td>
                                ${esc(log.reason)}
                            </td>

                            <td>
                                ${esc(log.staff_username)}
                            </td>

                            <td>
                                ${new Date(
                                    log.created_at
                                ).toLocaleString()}
                            </td>

                        </tr>
                    `).join("")}

                </table>
                `
                :
                `
                <p class="muted">
                    No moderation actions have been recorded.
                </p>
                `
            }

        </div>
    `;
}
/* =========================================================
   MODERATION LOG TAB
   ========================================================= */

const originalRenderStaffWithLog = renderStaff;

renderStaff = async function(tab = "messages", cat = "Advertising") {

    if (tab === "log") {
        await showModerationLog();
        return;
    }

    return originalRenderStaffWithLog(tab, cat);
};

async function showModerationLog() {

    if (!isStaff()) {
        return toast("Staff access required.");
    }

    const { data: logs, error } =
        await supabaseClient
            .from("moderation_log")
            .select("*")
            .order("created_at", {
                ascending: false
            })
            .limit(100);

    if (error) {
        console.error("Moderation log error:", error);
        return toast("Could not load moderation history.");
    }

    document.getElementById("main").innerHTML = `
        <div class="hero">
            <h1>Moderation Log</h1>
            <p>Recent staff moderation actions.</p>
        </div>

        <div class="card">

            ${
                logs?.length
                ?
                `
                <table class="table">

                    <tr>
                        <th>Player</th>
                        <th>Action</th>
                        <th>Reason</th>
                        <th>Staff</th>
                        <th>Date</th>
                    </tr>

                    ${logs.map(log => `
                        <tr>
                            <td>${esc(log.target_username)}</td>
                            <td>${esc(log.action_type)}</td>
                            <td>${esc(log.reason)}</td>
                            <td>${esc(log.staff_username)}</td>
                            <td>
                                ${new Date(
                                    log.created_at
                                ).toLocaleString()}
                            </td>
                        </tr>
                    `).join("")}

                </table>
                `
                :
                `
                <p class="muted">
                    No moderation actions have been recorded.
                </p>
                `
            }

        </div>
    `;
};
/* =========================================================
   RECORD STAFF RESTRICTIONS IN MODERATION LOG
   ========================================================= */

const originalRestrictPlayerForLog = restrictPlayer;

restrictPlayer = async function () {

    if (!isStaff()) {
        return toast("Staff access required.");
    }

    const targetName =
        document.getElementById("restrictTarget")?.value.trim();

    const durationValue =
        document.getElementById("restrictTime")?.value;

    const customValue =
        document.getElementById("restrictCustom")?.value;

    const reason =
        document.getElementById("restrictReason")?.value.trim()
        || "Violation of district rules";

    if (!targetName) {
        return toast("Enter a player username.");
    }

    const target =
        await findIronDistrictPlayer(targetName);

    if (!target) {
        return toast("That player does not exist.");
    }

    const milliseconds =
        duration(durationValue, customValue);

    if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
        return toast("Invalid restriction duration.");
    }

    const minutes =
        Math.max(1, Math.ceil(milliseconds / 60000));

    const { error: restrictionError } =
        await supabaseClient.rpc(
            "apply_player_restriction",
            {
                p_target_user_id: target.user_id,
                p_target_username: target.username,
                p_action_type: "chat_restriction",
                p_reason: reason,
                p_minutes: minutes
            }
        );

    if (restrictionError) {
        console.error(restrictionError);
        return toast(
            restrictionError.message ||
            "Restriction failed."
        );
    }

    const { error: logError } =
        await supabaseClient
            .from("moderation_log")
            .insert({
                target_user_id: target.user_id,
                target_username: target.username,
                action_type: "Chat Restriction",
                reason: reason,
                duration_minutes: minutes,
                staff_user_id: user.id,
                staff_username: user.name
            });

    if (logError) {
        console.error("Moderation log:", logError);
    }

    const { error: mailError } =
        await supabaseClient
            .from("player_mail")
            .insert({
                recipient_id: target.user_id,
                sender_id: user.id,
                sender_name: "Iron District Staff",
                subject: "Chat Restriction",
                body:
                    `Your chat access has been restricted for ` +
                    `${formatRemaining(milliseconds)}. ` +
                    `Reason: ${reason}`,
                system: true,
                unread: true
            });

    if (mailError) {
        console.error("Moderation mail:", mailError);
    }

    toast(
        `${target.username} has been restricted.`
    );

    renderStaff("restrictions");
};
/* =========================================================
   IRON DISTRICT MOBILE SUPPORT
   ========================================================= */

* {
  box-sizing: border-box;
}

html,
body {
  width: 100%;
  min-width: 0;
  overflow-x: hidden;
}

img,
video,
canvas,
iframe {
  max-width: 100%;
}

button,
input,
textarea,
select {
  max-width: 100%;
}

@media (max-width: 900px) {

  body {
    font-size: 14px;
  }

  .topbar {
    height: auto;
    min-height: 56px;
    padding: 10px;
    flex-wrap: wrap;
    gap: 8px;
  }

  .layout {
    display: block;
  }

  .sidebar {
    width: 100%;
    min-height: 0;
    position: static;
  }

  #nav {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 6px;
  }

  .nav {
    width: 100%;
    min-height: 44px;
    padding: 10px;
  }

  #main {
    width: 100%;
    min-width: 0;
    padding: 10px;
  }

  .hero,
  .card {
    width: 100%;
    min-width: 0;
  }

  .grid {
    grid-template-columns: 1fr;
    gap: 10px;
  }

  .table {
    display: block;
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  .chat {
    display: block;
  }

  .chat-window {
    width: 100%;
  }

  .chat-input {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .chat-input input,
  .chat-input button {
    width: 100%;
    min-height: 44px;
  }

  input,
  textarea,
  select {
    width: 100%;
    font-size: 16px;
    min-height: 44px;
  }

  textarea {
    min-height: 120px;
  }

  .button,
  .primary,
  .danger {
    width: 100%;
    min-height: 44px;
    margin-top: 6px;
  }

  .forum-tabs,
  .rule-tabs,
  .staff-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .restriction-grid {
    display: block;
  }

  .restriction-grid > * {
    margin-bottom: 10px;
  }

  .messages {
    max-height: 55vh;
    overflow-y: auto;
  }

  .mail-row,
  .forum-thread,
  .forum-post,
  .member {
    overflow-wrap: anywhere;
  }
}

@media (max-width: 480px) {

  #nav {
    grid-template-columns: 1fr;
  }

  .forum-tabs,
  .rule-tabs,
  .staff-tabs {
    grid-template-columns: 1fr;
  }

  #main {
    padding: 8px;
  }

  .hero {
    padding: 12px;
  }

  .hero h1 {
    font-size: 21px;
  }

  .stat {
    font-size: 24px;
  }

  .topbar {
    padding: 8px;
  }
}