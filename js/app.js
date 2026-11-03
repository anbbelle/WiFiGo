const $=s=>document.querySelector(s);
const D=Store.d;
const rp=n=>'Rp'+Math.round(n).toLocaleString('id-ID');
const tgl=s=>s?new Date(s+'T00:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'}):'-';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const today=()=>new Date().toISOString().slice(0,10);
const thisMonth=()=>today().slice(0,7);
const tag=(t)=>{const m={Lunas:'ok',Terverifikasi:'ok',Aktif:'ok',Sebagian:'warn','Menunggu verifikasi':'warn','Belum lunas':'bad',Terlambat:'bad',Nonaktif:'off'};return `<span class="tag t-${m[t]||'off'}">${t}</span>`;};
const empty=t=>`<div class="empty">${t}</div>`;
const q={};
const BULAN=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const mpick=(val,attr)=>{const[y,m]=val.split('-').map(Number),cy=new Date().getFullYear();let ys='';for(let i=cy-3;i<=cy+1;i++)ys+=`<option ${i===y?'selected':''}>${i}</option>`;return `<span class="mp" ${attr}><select>${BULAN.map((b,i)=>`<option value="${i+1}" ${i+1===m?'selected':''}>${b}</option>`).join('')}</select><select>${ys}</select></span>`;};
const dpick=v=>{const[y,m,d]=v.split('-').map(Number),cy=new Date().getFullYear();let ys='',ds='';for(let i=cy-3;i<=cy+2;i++)ys+=`<option ${i===y?'selected':''}>${i}</option>`;for(let i=1;i<=31;i++)ds+=`<option ${i===d?'selected':''}>${i}</option>`;return `<span class="mp" data-dp><select>${ds}</select><select>${BULAN.map((b,i)=>`<option value="${i+1}" ${i+1===m?'selected':''}>${b}</option>`).join('')}</select><select>${ys}</select></span>`;};
const dpval=el=>{const[d,m,y]=[...el.querySelectorAll('select')];const max=new Date(y.value,m.value,0).getDate();if(+d.value>max)d.value=max;return `${y.value}-${String(m.value).padStart(2,'0')}-${String(d.value).padStart(2,'0')}`;};
const mpval=el=>{const s=el.querySelectorAll('select');return `${s[1].value}-${String(s[0].value).padStart(2,'0')}`;};

function toast(m,err){const t=$('#toast');t.textContent=m;t.className='toast'+(err?' err':'');t.hidden=false;clearTimeout(t.h);t.h=setTimeout(()=>t.hidden=true,3000);}

function openForm(title,fields,onOk,okLabel='Simpan'){
  const m=$('#modal');
  m.innerHTML=`<form><h2>${title}</h2>${fields.map(f=>`<div class="f"><label>${f.label}</label>${
    f.t==='date'?`<input type="hidden" name="${f.n}" value="${f.v}">${dpick(f.v)}`:f.t==='month'?`<input type="hidden" name="${f.n}" value="${f.v}">${mpick(f.v,'data-mp')}`:f.opts?`<select name="${f.n}">${f.opts.map(o=>Array.isArray(o)?o:[o,o]).map(o=>`<option value="${esc(o[0]??o)}" ${(o[0]??o)==f.v?'selected':''}>${esc(o[1]??o)}</option>`).join('')}</select>`
    :f.area?`<textarea name="${f.n}" rows="2">${esc(f.v)}</textarea>`
    :`<input name="${f.n}" type="${f.t==='money'||f.t==='wa'?'text':f.t||'text'}" ${f.t==='money'?'inputmode="numeric" data-money':f.t==='wa'?'inputmode="numeric" maxlength="13" placeholder="08xxxxxxxxxx" data-wa':''} value="${esc(f.t==='money'?fmtn(f.v):f.v)}" ${f.req?'required':''}>${f.t==='wa'?'<small class="fe"></small>':''}`}</div>`).join('')}
    <div class="row" style="justify-content:flex-end"><button type="button" id="cx">Batal</button><button class="pri">${okLabel}</button></div></form>`;
  m.hidden=false;
  $('#cx').onclick=()=>m.hidden=true;
  m.querySelector('form').onsubmit=e=>{
    e.preventDefault();const b=e.submitter;if(b.disabled)return;b.disabled=true;
    try{onOk(Object.fromEntries(new FormData(e.target)));m.hidden=true;render();}
    catch(err){toast(err.message,1);b.disabled=false;}
  };
}

const head=(t,btns='')=>`<div class="head"><h1>${t}</h1><div class="row">${btns}</div></div>`;
const table=(cols,rows,msg)=>rows.length?`<div class="tw"><table><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr>${rows.join('')}</table></div>`:`<div class="tw">${empty(msg)}</div>`;
const searchBox=p=>`<input class="search" id="q" placeholder="Cari…" value="${esc(q[p]||'')}">`;
const hit=(p,...v)=>!q[p]||v.join(' ').toLowerCase().includes(q[p].toLowerCase());

const pages={
dashboard(){
  const m=q.month||thisMonth();
  const inv=D.invoices.filter(i=>i.period===m);
  const diterima=D.payments.filter(p=>p.status==='Terverifikasi'&&p.date.startsWith(m)).reduce((s,p)=>s+p.amount,0);
  const keluar=D.expenses.filter(e=>e.date.startsWith(m)).reduce((s,e)=>s+e.amount,0);
  const lain=D.incomes.filter(x=>x.date.startsWith(m)).reduce((s,x)=>s+x.amount,0),tunggu=D.payments.filter(p=>p.status!=='Terverifikasi'&&p.date.startsWith(m)).reduce((s,p)=>s+p.amount,0);
  const card=(l,v,s='')=>`<div class="card"><small>${l}</small><b>${v}</b><i>${s}</i></div>`;
  return head('Dashboard',`${mpick(m,'id="month"')}`)+`<div class="grid">
   ${card('Pelanggan aktif',D.customers.filter(c=>c.status==='Aktif').length)}
   ${card('Total tagihan',rp(inv.reduce((s,i)=>s+i.amount,0)),inv.length+' tagihan')}
   ${card('Pembayaran diterima',rp(diterima),'Hanya yang terverifikasi')}
   ${card('Belum lunas',inv.filter(i=>Store.calc(i).status!=='Lunas').length+' pelanggan')}
   ${card('Pemasukan lain',rp(lain))}
   ${card('Menunggu verifikasi',rp(tunggu),'Belum dihitung')}
   ${card('Total pemasukan',rp(diterima+lain),'Terverifikasi + lain')}
   ${card('Pengeluaran',rp(keluar))}
   ${card('Estimasi laba',rp(diterima+lain-keluar),'Pemasukan − pengeluaran')}</div>
   <p class="note">Hanya pembayaran terverifikasi yang dihitung sebagai uang diterima. Estimasi laba = pemasukan terverifikasi (termasuk pemasukan lain) − pengeluaran dan belum tentu sama dengan laba akuntansi formal.</p>`;
},
pelanggan(){
  const rows=D.customers.filter(c=>hit('pelanggan',c.id,c.name,c.address,c.wa)).map(c=>`<tr><td>${c.id}</td><td>${esc(c.name)}</td><td>${esc(c.wa)}</td><td>${esc(c.service)}</td><td>${rp(c.fee)}</td><td>${c.start?'Tgl '+Store.dueDay(c):'-'}</td><td>${tag(c.status)}</td><td><button class="sm" data-edit="${c.id}">Edit</button> <button class="sm" data-del="${c.id}" style="color:#b42318">Hapus</button></td></tr>`);
  return head('Pelanggan',searchBox('pelanggan')+'<button class="pri" id="add">Tambah pelanggan</button>')+table(['ID','Nama','WhatsApp','Layanan','Biaya/bulan','Jatuh tempo','Status',''],rows,'Belum ada pelanggan. Klik “Tambah pelanggan” untuk memulai.');
},
tagihan(){
  const rows=D.invoices.filter(i=>hit('tagihan',i.id,Store.customer(i.customerId)?.name)).slice().reverse().map(i=>{const c=Store.calc(i),cu=Store.customer(i.customerId);
    return `<tr><td>${i.id}</td><td>${esc(cu?.name)}</td><td>${i.period}</td><td>${tgl(i.due)}</td><td>${rp(i.amount)}</td><td>${rp(c.left)}</td><td>${tag(c.status)}</td><td><button class="sm" data-inv="${i.id}">Detail</button> ${c.left?`<button class="sm" data-pay="${i.id}">Catat bayar</button>`:''}</td></tr>`;});
  return head('Tagihan',searchBox('tagihan')+'<button id="svc">Tagihan jasa</button><button class="pri" id="gen">Buat tagihan bulanan</button>')+table(['No. invoice','Pelanggan','Periode','Jatuh tempo','Nominal','Sisa','Status',''],rows,'Belum ada tagihan. Buat tagihan bulanan untuk pelanggan aktif.');
},
pembayaran(){
  const rows=D.payments.filter(p=>hit('pembayaran',p.id,p.invoiceId)).slice().reverse().map(p=>`<tr><td>${p.id}</td><td>${p.invoiceId}</td><td>${tgl(p.date)}</td><td>${rp(p.amount)}</td><td>${p.method}</td><td>${esc(p.officer)}</td><td>${tag(p.status)}</td><td>${p.status!=='Terverifikasi'?`<button class="sm" data-verify="${p.id}">Verifikasi</button>`:''}</td></tr>`);
  return head('Pembayaran',searchBox('pembayaran')+'<button class="pri" id="pay">Catat pembayaran</button>')+table(['No. transaksi','Invoice','Tanggal','Nominal','Metode','Petugas','Status',''],rows,'Belum ada pembayaran tercatat.');
},
pengeluaran(){
  const rows=D.expenses.filter(e=>hit('pengeluaran',e.desc,e.category)).slice().reverse().map(e=>`<tr><td>${e.id}</td><td>${tgl(e.date)}</td><td>${e.category}</td><td>${esc(e.desc)}</td><td>${rp(e.amount)}</td><td><button class="sm" data-eedit="${e.id}">Edit</button></td></tr>`);
  return head('Pengeluaran',searchBox('pengeluaran')+'<button class="pri" id="exp">Tambah pengeluaran</button>')+table(['ID','Tanggal','Kategori','Deskripsi','Nominal',''],rows,'Belum ada pengeluaran tercatat.');
}};

const unpaid=()=>D.invoices.filter(i=>Store.calc(i).left>0).map(i=>[i.id,`${i.id} — ${Store.customer(i.customerId)?.name} (sisa ${rp(Store.calc(i).left)})`]);

function payForm(invId){
  if(!unpaid().length)return toast('Tidak ada tagihan yang belum lunas',1);
  openForm('Catat pembayaran',[
    {n:'invoiceId',label:'Tagihan',opts:unpaid(),v:invId},
    {n:'date',label:'Tanggal pembayaran',t:'date',v:today(),req:1},
    {n:'amount',label:'Nominal (Rp)',t:'money',req:1},
    {n:'method',label:'Metode',opts:['Tunai','Transfer'],v:'Tunai'},
    {n:'officer',label:'Petugas',req:1},
    {n:'note',label:'Catatan',area:1}
  ],x=>{
    if(Store.dupPayment(x)&&!confirm('Pembayaran dengan tagihan, tanggal, dan nominal sama sudah ada. Tetap simpan?'))throw new Error('Dibatalkan agar tidak tercatat ganda');
    Store.addPayment(x);toast(x.method==='Transfer'?'Tersimpan, menunggu verifikasi':'Pembayaran tunai tercatat');
  });
}

function custForm(c={}){
  openForm(c.id?'Edit pelanggan':'Tambah pelanggan',[
    {n:'name',label:'Nama',v:c.name,req:1},{n:'address',label:'Alamat',v:c.address,area:1},
    {n:'wa',label:'Nomor WhatsApp',t:'wa',v:c.wa,req:1},{n:'start',label:'Mulai berlangganan',t:'date',v:c.start||today(),req:1},
    {n:'fee',label:'Biaya bulanan (Rp)',t:'money',v:c.fee,req:1},
    {n:'service',label:'Jenis layanan',opts:['Wi-Fi bulanan','Wi-Fi + CCTV','Wi-Fi + Android'],v:c.service},
    {n:'status',label:'Status',opts:['Aktif','Nonaktif'],v:c.status||'Aktif'},{n:'note',label:'Catatan',v:c.note,area:1}
  ],x=>{x.id=c.id;Store.saveCustomer(x);const n=Store.auto();toast(n?'Pelanggan tersimpan, tagihan bulan ini dibuat':'Pelanggan tersimpan');});
}

document.addEventListener('click',e=>{
  const t=e.target,id=t.id,ds=t.dataset;
  if(id==='add')custForm();
  if(ds.edit)custForm(Store.customer(ds.edit));
  if(ds.del){
    const c=Store.customer(ds.del),u=Store.usage(ds.del);
    if(confirm(`Hapus pelanggan ${c.name} (${c.id})?\n\nIkut terhapus: ${u.inv} tagihan dan ${u.pay} pembayaran.\nTindakan ini tidak bisa dibatalkan.`)&&(!u.pay||confirm('Ada pembayaran yang tercatat. Pemasukan di Dashboard dan Laporan akan ikut berkurang. Tetap hapus?'))){
      Store.removeCustomer(ds.del);toast('Pelanggan dihapus');render();
    }
  }
  if(id==='gen')openForm('Buat tagihan bulanan',[{n:'period',label:'Periode',t:'month',v:thisMonth(),req:1},
    {n:'cid',label:'Pelanggan',opts:[['','Semua pelanggan aktif'],...D.customers.filter(c=>c.status==='Aktif').map(c=>[c.id,`${c.id} — ${c.name} (tagihan tiap tgl ${Store.dueDay(c)})`])]},
    {n:'mode',label:'Jatuh tempo',opts:[['own','Sebulan setelah tanggal mulai pelanggan'],['custom','Tentukan tanggal sendiri']],v:'own'},
    {n:'due',label:'Tanggal (hanya dipakai jika “Tentukan tanggal sendiri”)',t:'date',v:today()}],
    x=>{const n=Store.generate(x.period,x.due,x.cid,x.mode==='own');toast(n?`${n} tagihan dibuat`:'Tagihan periode ini sudah ada');},'Buat');
  if(id==='pay')payForm();
  if(ds.pay)payForm(ds.pay);
  if(ds.verify&&confirm('Pastikan dana sudah masuk ke rekening. Verifikasi pembayaran ini?')){Store.verify(ds.verify);toast('Pembayaran terverifikasi');render();}
  if(id==='exp')openForm('Tambah pengeluaran',[{n:'date',label:'Tanggal',t:'date',v:today(),req:1},
    {n:'category',label:'Kategori',opts:['Gaji karyawan','Bandwidth PT Indana','Perbaikan','Upgrade perangkat','Biaya operasional','Pengeluaran tak terduga','Lainnya']},
    {n:'desc',label:'Deskripsi',req:1},{n:'amount',label:'Nominal (Rp)',t:'money',req:1}],x=>{Store.addExpense(x);toast('Pengeluaran tersimpan');});
});
document.addEventListener('input',e=>{
  const t=e.target;
  if(t.dataset.money!==undefined)t.value=fmtn(t.value);
  if(t.dataset.wa!==undefined){t.value=t.value.replace(/\D/g,'').slice(0,13);const m=t.nextElementSibling;if(m)m.textContent=t.value&&!WA.test(t.value)?'Harus diawali 08 dan 10–13 digit':'';}
  if(e.target.id==='q'){q[page()]=e.target.value;const p=pos=e.target.selectionStart;render();const i=$('#q');i.focus();i.setSelectionRange(p,p);}
});
document.addEventListener('change',e=>{
  const mo=e.target.closest('#month');if(mo){q.month=mpval(mo);render();}
  const dp=e.target.closest('[data-dp]');if(dp&&dp.previousElementSibling)dp.previousElementSibling.value=dpval(dp);
  const r=e.target.closest('[data-r]');if(r){q['r'+r.dataset.r]=dpval(r.firstElementChild);render();}
  const w=e.target.closest('[data-mp]');if(w)w.previousElementSibling.value=mpval(w);
});

const WA=/^08\d{8,11}$/,fmtn=s=>{s=String(s??'').replace(/\D/g,'');return s?Number(s).toLocaleString('id-ID'):'';};
const EXPCAT=['Gaji karyawan','Bandwidth PT Indana','Perbaikan','Upgrade perangkat','Biaya operasional','Pengeluaran tak terduga','Lainnya'];
const INCCAT=['Jasa pemasangan baru','Jasa perbaikan','Penyambungan CCTV','Penyambungan perangkat Android','Pemasukan lainnya'];
const kartu=(l,v,s='')=>`<div class="card"><small>${l}</small><b>${v}</b><i>${s}</i></div>`;
const msg=(i,cu,c)=>`Halo ${cu.name}, kami mengingatkan tagihan Wi-Fi periode ${i.period} sebesar ${rp(c.left)} (jatuh tempo ${tgl(i.due)}). Jika sudah transfer, mohon kirim bukti transfer agar kami catat. Terima kasih.`;

pages.pemasukan=()=>{
  const m=q.month||thisMonth(),nm=id=>Store.customer(D.invoices.find(i=>i.id===id)?.customerId)?.name||'-';
  const pay=D.payments.filter(p=>p.date.startsWith(m)&&hit('pemasukan',p.id,p.invoiceId,nm(p.invoiceId))).map(p=>({date:p.date,id:p.id,cat:'Pembayaran pelanggan',desc:`${p.invoiceId} — ${nm(p.invoiceId)} (${p.method})`,amount:p.amount,st:tag(p.status),ok:p.status==='Terverifikasi'}));
  const lain=D.incomes.filter(x=>x.date.startsWith(m)&&hit('pemasukan',x.id,x.category,x.desc)).map(x=>({date:x.date,id:x.id,cat:x.category,desc:x.desc,amount:x.amount,st:'-',ok:1}));
  const all=[...pay,...lain].sort((a,b)=>a.date<b.date?1:-1),S=a=>a.filter(x=>x.ok).reduce((s,x)=>s+x.amount,0);
  const rows=all.map(x=>`<tr><td>${x.id}</td><td>${tgl(x.date)}</td><td>${x.cat}</td><td>${esc(x.desc)}</td><td>${rp(x.amount)}</td><td>${x.st}</td></tr>`);
  return head('Pemasukan',`${mpick(m,'id="month"')}${searchBox('pemasukan')}<button class="pri" id="inc">Tambah pemasukan lain</button>`)+
  `<div class="grid">${kartu('Dari pembayaran pelanggan',rp(S(pay)),'Terverifikasi, otomatis dari menu Pembayaran')}${kartu('Pemasukan lain',rp(S(lain)),'Diinput manual')}${kartu('Total pemasukan',rp(S(all)))}</div>
  <p class="note">Pembayaran pelanggan masuk otomatis ke sini setelah dicatat di menu Pembayaran. Hanya yang berstatus Terverifikasi yang dihitung di total. Pemasukan lain (jasa pemasangan dll.) diinput lewat tombol di atas.</p>`+
  table(['ID','Tanggal','Sumber','Deskripsi','Nominal','Status'],rows,'Belum ada pemasukan pada bulan ini.');
};
pages.pengingat=()=>{
  const late=i=>Math.round((new Date(today())-new Date(i.due))/864e5);
  const rows=D.invoices.slice().sort((a,b)=>a.due<b.due?-1:1).map(i=>[i,Store.calc(i),Store.customer(i.customerId)]).filter(([i,c,cu])=>c.left>0&&hit('pengingat',i.id,cu?.name)).map(([i,c,cu])=>`<tr><td>${esc(cu?.name)}</td><td>${i.period}</td><td>${tgl(i.due)}</td><td>${late(i)>0?tag('Terlambat')+' '+late(i)+' hari':late(i)===0?'Jatuh tempo hari ini':-late(i)+' hari lagi'}</td><td>${rp(i.amount)}</td><td>${rp(c.left)}</td><td>${c.pending?tag('Menunggu verifikasi'):'-'}</td><td><button class="sm" data-wasend="${i.id}">Kirim WA</button> <button class="sm" data-copy="${i.id}">Salin pesan</button></td></tr>`);
  return head('Pengingat pembayaran',searchBox('pengingat'))+table(['Pelanggan','Periode','Jatuh tempo','Keterangan','Nominal','Sisa','Transfer','' ],rows,'Semua tagihan sudah lunas.');
};
pages.audit=()=>head('Audit log')+table(['Waktu','Aksi','Detail'],D.audit.slice().reverse().map(a=>`<tr><td>${new Date(a.waktu).toLocaleString('id-ID')}</td><td>${esc(a.aksi)}</td><td>${esc(a.detail)}</td></tr>`),'Belum ada aktivitas tercatat.');

function lap(){
  const f=q.rf||today().slice(0,8)+'01',t=q.rt||today(),inR=s=>s>=f&&s<=t;
  const S=a=>a.reduce((s,x)=>s+x.amount,0),nm=id=>Store.customer(id)?.name||'-';
  const pay=D.payments.filter(p=>p.status==='Terverifikasi'&&inR(p.date)),inc=D.incomes.filter(x=>inR(x.date)),ex=D.expenses.filter(x=>inR(x.date)),invs=D.invoices.filter(i=>inR(i.due));
  const hist=[...pay.map(p=>[p.date,'Pembayaran',`${p.invoiceId} ${nm(D.invoices.find(i=>i.id===p.invoiceId)?.customerId)}`,p.amount,0]),...inc.map(x=>[x.date,'Pemasukan lain',`${x.category}: ${x.desc}`,x.amount,0]),...ex.map(x=>[x.date,'Pengeluaran',`${x.category}: ${x.desc}`,0,x.amount])].sort((a,b)=>a[0]<b[0]?-1:1);
  const piutang=D.invoices.filter(i=>i.due<=t).map(i=>[i,Store.calc(i)]).filter(([,c])=>c.left>0);
  const cat={};ex.forEach(x=>cat[x.category]=(cat[x.category]||0)+x.amount);
  return{f,t,pay,inc,ex,invs,hist,piutang,cat,S,nm};
}
pages.laporan=()=>{
  const L=lap(),S=L.S,masuk=S(L.pay)+S(L.inc),keluar=S(L.ex);
  return head('Laporan',`<div class="rg"><span data-r="f">${dpick(L.f)}</span><b>–</b><span data-r="t">${dpick(L.t)}</span></div><button id="xls">Ekspor Excel</button><button class="pri" id="prt">Cetak</button>`)+
  `<p class="note">Periode ${tgl(L.f)} – ${tgl(L.t)}. Pemasukan hanya dari pembayaran terverifikasi dan pemasukan lain, bukan nilai tagihan. Laba sederhana belum tentu sama dengan laba akuntansi formal.</p>
  <div class="grid">${kartu('Rekap tagihan',rp(S(L.invs)),L.invs.length+' tagihan jatuh tempo')}${kartu('Pembayaran diterima',rp(S(L.pay)),L.pay.length+' transaksi terverifikasi')}${kartu('Pemasukan lain',rp(S(L.inc)))}${kartu('Total pemasukan',rp(masuk))}${kartu('Total pengeluaran',rp(keluar))}${kartu('Laba sederhana',rp(masuk-keluar))}</div>
  <h3 class="sec">Pengeluaran per kategori</h3>${table(['Kategori','Total'],Object.entries(L.cat).map(([k,v])=>`<tr><td>${k}</td><td>${rp(v)}</td></tr>`),'Tidak ada pengeluaran pada periode ini.')}
  <h3 class="sec">Piutang (belum lunas, jatuh tempo s.d. akhir periode)</h3>${table(['Pelanggan','Invoice','Jatuh tempo','Sisa','Transfer'],L.piutang.map(([i,c])=>`<tr><td>${esc(L.nm(i.customerId))}</td><td>${i.id}</td><td>${tgl(i.due)}</td><td>${rp(c.left)}</td><td>${c.pending?tag('Menunggu verifikasi'):'-'}</td></tr>`),'Tidak ada piutang.')}
  <h3 class="sec">Riwayat transaksi</h3>${table(['Tanggal','Jenis','Keterangan','Masuk','Keluar'],L.hist.map(h=>`<tr><td>${tgl(h[0])}</td><td>${h[1]}</td><td>${esc(h[2])}</td><td>${h[3]?rp(h[3]):'-'}</td><td>${h[4]?rp(h[4]):'-'}</td></tr>`),'Belum ada transaksi pada periode ini.')}`;
};
async function xlsExport(){
  if(!window.ExcelJS)return toast('Library Excel gagal dimuat. Cek koneksi internet.',1);
  try{
  const L=lap(),S=L.S,nm=id=>Store.customer(id)?.name||'-',masuk=S(L.pay)+S(L.inc),keluar=S(L.ex),wb=new ExcelJS.Workbook();
  wb.creator='WiFigo';
  const RP='"Rp"#,##0',TG='dd mmm yyyy',BR={style:'thin',color:{argb:'FFD9DEE7'}},BD={top:BR,bottom:BR,left:BR,right:BR};
  const fill=a=>({type:'pattern',pattern:'solid',fgColor:{argb:a}});
  const dt=s=>{if(!s)return null;const[y,m,d]=s.split('-').map(Number);return new Date(Date.UTC(y,m-1,d));};
  const hdr=r=>{r.height=22;r.eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill=fill('FF1F6FEB');c.alignment={vertical:'middle',horizontal:'left'};c.border=BD;});};
  const page={orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0};

  const rs=wb.addWorksheet('Ringkasan',{views:[{showGridLines:false}],pageSetup:page});
  rs.columns=[{width:40},{width:22},{width:16},{width:18},{width:24}];
  rs.mergeCells('A1:E1');Object.assign(rs.getCell('A1'),{value:'Laporan WiFigo'});rs.getCell('A1').font={bold:true,size:16,color:{argb:'FF1F6FEB'}};
  rs.getCell('A2').value=`Periode: ${tgl(L.f)} – ${tgl(L.t)}`;rs.getCell('A2').font={color:{argb:'FF6B7689'}};
  let r=4;
  const sec=h=>{const row=rs.getRow(r++);h.forEach((v,i)=>row.getCell(i+1).value=v);hdr(row);};
  const line=(a,v,b)=>{const row=rs.getRow(r++);row.getCell(1).value=a;const c=row.getCell(2);c.value=v;c.numFmt=RP;c.alignment={horizontal:'right'};[1,2].forEach(i=>{const x=row.getCell(i);x.border=BD;if(b){x.font={bold:true};x.fill=fill('FFE8F0FE');}});};
  const note=t=>{const c=rs.getRow(r++).getCell(1);c.value=t;c.font={italic:true,color:{argb:'FF6B7689'}};};
  sec(['Ringkasan keuangan','Jumlah']);
  line('Rekap tagihan (jatuh tempo)',S(L.invs));line('Pembayaran diterima (terverifikasi)',S(L.pay));line('Pemasukan lain',S(L.inc));
  line('Total pemasukan',masuk,1);line('Total pengeluaran',keluar);line('Laba sederhana',masuk-keluar,1);
  r++;sec(['Pengeluaran per kategori','Total']);
  Object.entries(L.cat).forEach(([k,v])=>line(k,v));if(!Object.keys(L.cat).length)note('Tidak ada pengeluaran pada periode ini.');
  r++;sec(['Piutang (pelanggan)','Invoice','Jatuh tempo','Sisa','Transfer']);
  L.piutang.forEach(([i,c])=>{const row=rs.getRow(r++);[nm(i.customerId),i.id,dt(i.due),c.left,c.pending?'Menunggu verifikasi':'-'].forEach((v,n)=>{const x=row.getCell(n+1);x.value=v;x.border=BD;if(n===2){x.numFmt=TG;x.alignment={horizontal:'left'};}if(n===3)x.numFmt=RP;});});
  if(!L.piutang.length)note('Tidak ada piutang.');
  r++;note('Catatan: laba sederhana belum tentu sama dengan laba akuntansi formal.');

  const sheet=(name,cols,rows,total)=>{
    const ws=wb.addWorksheet(name,{views:[{state:'frozen',ySplit:1}],pageSetup:page});
    ws.columns=cols.map(c=>({header:c.h,key:c.k,width:c.w}));hdr(ws.getRow(1));
    const fmt=(row,i)=>row.eachCell({includeEmpty:true},(c,n)=>{const t=cols[n-1]?.t;c.border=BD;if(t==='rp'){c.numFmt=RP;c.alignment={horizontal:'right'};}if(t==='tgl'){c.numFmt=TG;c.alignment={horizontal:'left'};}if(i%2)c.fill=fill('FFF6F8FB');});
    rows.forEach((x,i)=>fmt(ws.addRow(x),i));
    if(!rows.length){const c=ws.addRow({[cols[0].k]:'Belum ada data'}).getCell(1);c.font={italic:true,color:{argb:'FF6B7689'}};}
    else{ws.autoFilter={from:{row:1,column:1},to:{row:1,column:cols.length}};if(total){const row=ws.addRow(total);fmt(row,0);row.font={bold:true};row.eachCell({includeEmpty:true},c=>c.fill=fill('FFE8F0FE'));}}
  };
  sheet('Pelanggan',[{h:'ID',k:'a',w:10},{h:'Nama',k:'b',w:26},{h:'Alamat',k:'c',w:36},{h:'WhatsApp',k:'d',w:16},{h:'Mulai berlangganan',k:'e',w:18,t:'tgl'},{h:'Biaya bulanan',k:'f',w:16,t:'rp'},{h:'Layanan',k:'g',w:18},{h:'Status',k:'h',w:12},{h:'Catatan',k:'i',w:30}],
    D.customers.map(c=>({a:c.id,b:c.name,c:c.address,d:c.wa,e:dt(c.start),f:c.fee,g:c.service,h:c.status,i:c.note})));
  sheet('Tagihan',[{h:'Invoice',k:'a',w:22},{h:'ID pelanggan',k:'b',w:13},{h:'Pelanggan',k:'c',w:26},{h:'Periode',k:'d',w:11},{h:'Jatuh tempo',k:'e',w:15,t:'tgl'},{h:'Nominal',k:'f',w:15,t:'rp'},{h:'Terbayar',k:'g',w:15,t:'rp'},{h:'Sisa',k:'h',w:15,t:'rp'},{h:'Status',k:'i',w:14}],
    D.invoices.map(i=>{const c=Store.calc(i);return{a:i.id,b:i.customerId,c:nm(i.customerId),d:i.period,e:dt(i.due),f:i.amount,g:c.paid,h:c.left,i:c.status};}));
  sheet('Pembayaran',[{h:'Transaksi',k:'a',w:12},{h:'Invoice',k:'b',w:22},{h:'Pelanggan',k:'c',w:26},{h:'Tanggal',k:'d',w:15,t:'tgl'},{h:'Nominal',k:'e',w:15,t:'rp'},{h:'Metode',k:'f',w:11},{h:'Petugas',k:'g',w:16},{h:'Status',k:'h',w:20},{h:'Catatan',k:'i',w:30}],
    D.payments.map(p=>({a:p.id,b:p.invoiceId,c:nm(D.invoices.find(i=>i.id===p.invoiceId)?.customerId),d:dt(p.date),e:p.amount,f:p.method,g:p.officer,h:p.status,i:p.note})));
  sheet('Pemasukan lain',[{h:'ID',k:'a',w:10},{h:'Tanggal',k:'b',w:15,t:'tgl'},{h:'Sumber',k:'c',w:30},{h:'Deskripsi',k:'d',w:36},{h:'Nominal',k:'e',w:15,t:'rp'}],
    D.incomes.map(x=>({a:x.id,b:dt(x.date),c:x.category,d:x.desc,e:x.amount})));
  sheet('Pengeluaran',[{h:'ID',k:'a',w:10},{h:'Tanggal',k:'b',w:15,t:'tgl'},{h:'Kategori',k:'c',w:26},{h:'Deskripsi',k:'d',w:36},{h:'Nominal',k:'e',w:15,t:'rp'}],
    D.expenses.map(x=>({a:x.id,b:dt(x.date),c:x.category,d:x.desc,e:x.amount})));
  sheet('Riwayat (periode laporan)',[{h:'Tanggal',k:'a',w:15,t:'tgl'},{h:'Jenis',k:'b',w:16},{h:'Keterangan',k:'c',w:48},{h:'Masuk',k:'d',w:16,t:'rp'},{h:'Keluar',k:'e',w:16,t:'rp'}],
    L.hist.map(h=>({a:dt(h[0]),b:h[1],c:h[2],d:h[3],e:h[4]})),{c:'Total',d:masuk,e:keluar});

  wb.eachSheet(ws=>ws.eachRow({includeEmpty:true},row=>row.eachCell({includeEmpty:true},c=>{c.font={size:10,...c.font,name:'Poppins'};})));
  const buf=await wb.xlsx.writeBuffer(),a=document.createElement('a');
  a.href=URL.createObjectURL(new Blob([buf],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  a.download=`wifigo_${L.f}_${L.t}.xlsx`;a.click();
  }catch(err){toast('Gagal membuat Excel: '+err.message,1);}
}
function invDetail(id){
  const i=D.invoices.find(x=>x.id===id),c=Store.calc(i),cu=Store.customer(i.customerId),ps=D.payments.filter(p=>p.invoiceId===id);
  const m=$('#modal');
  m.innerHTML=`<div class="inv"><h2>Invoice ${i.id}</h2><p><b>WiFigo</b></p><p>${esc(cu?.name)} (${cu?.id})<br>${esc(cu?.address||'')}</p>
  <p>Jenis: ${i.type==='Jasa'?esc(i.desc):'Langganan Wi-Fi'}<br>Periode: ${i.period}<br>Jatuh tempo: ${tgl(i.due)}</p>
  <p>Nominal: <b>${rp(i.amount)}</b><br>Terbayar (terverifikasi): ${rp(c.paid)}<br>Sisa: <b>${rp(c.left)}</b> ${tag(c.status)}</p>
  ${ps.length?table(['Transaksi','Tanggal','Nominal','Status'],ps.map(p=>`<tr><td>${p.id}</td><td>${tgl(p.date)}</td><td>${rp(p.amount)}</td><td>${tag(p.status)}</td></tr>`)):''}
  <p class="note">Invoice adalah tagihan, bukan bukti pembayaran.</p>
  <div class="row noprint" style="justify-content:flex-end"><button id="cx2">Tutup</button><button class="pri" id="inprint">Cetak / simpan PDF</button></div></div>`;
  m.hidden=false;
}
function expForm(e={}){
  openForm(e.id?'Edit pengeluaran':'Tambah pengeluaran',[{n:'date',label:'Tanggal',t:'date',v:e.date||today(),req:1},{n:'category',label:'Kategori',opts:EXPCAT,v:e.category},{n:'desc',label:'Deskripsi',v:e.desc,req:1},{n:'amount',label:'Nominal (Rp)',t:'money',v:e.amount,req:1}],x=>{x.id=e.id;Store.saveExpense(x);toast('Pengeluaran tersimpan');});
}
window.addEventListener('afterprint',()=>document.body.classList.remove('pi'));
document.addEventListener('click',e=>{
  const t=e.target,ds=t.dataset,id=t.id;
  if(ds.inv)invDetail(ds.inv);
  if(id==='cx2')$('#modal').hidden=true;
  if(id==='inprint'){document.body.classList.add('pi');print();}
  if(id==='prt')print();
  if(id==='xls')xlsExport();
  if(ds.eedit)expForm(D.expenses.find(x=>x.id===ds.eedit));
  if(id==='inc')openForm('Tambah pemasukan lain',[{n:'date',label:'Tanggal',t:'date',v:today(),req:1},{n:'category',label:'Sumber',opts:INCCAT},{n:'desc',label:'Deskripsi',req:1},{n:'amount',label:'Nominal (Rp)',t:'money',req:1}],x=>{Store.addIncome(x);toast('Pemasukan tersimpan');});
  if(id==='svc'){
    const cs=D.customers.filter(c=>c.status==='Aktif');if(!cs.length)return toast('Belum ada pelanggan aktif',1);
    openForm('Tagihan jasa tambahan',[{n:'customerId',label:'Pelanggan',opts:cs.map(c=>[c.id,`${c.id} — ${c.name}`])},{n:'desc',label:'Jenis jasa',req:1},{n:'amount',label:'Nominal (Rp)',t:'money',req:1},{n:'due',label:'Jatuh tempo',t:'date',v:today(),req:1}],x=>{Store.addService(x);toast('Tagihan jasa dibuat');},'Buat');
  }
  if(ds.wasend){
    const i=D.invoices.find(x=>x.id===ds.wasend),cu=Store.customer(i.customerId);
    window.open('https://wa.me/62'+cu.wa.slice(1)+'?text='+encodeURIComponent(msg(i,cu,Store.calc(i))),'_blank');
  }
  if(ds.copy){
    const i=D.invoices.find(x=>x.id===ds.copy),m=msg(i,Store.customer(i.customerId),Store.calc(i));
    (navigator.clipboard?navigator.clipboard.writeText(m):Promise.reject()).then(()=>toast('Pesan disalin'),()=>prompt('Salin pesan ini:',m));
  }
});

const page=()=>pages[location.hash.slice(1)]?location.hash.slice(1):'dashboard';
function render(){
  const p=page();$('#view').innerHTML=pages[p]();
  document.querySelectorAll('nav a').forEach(a=>a.classList.toggle('on',a.hash==='#'+p));
}
window.addEventListener('hashchange',render);
render();
