/* Lapisan data WiFigo.
   - API_URL kosong  -> mode lokal (localStorage, data hanya di browser ini).
   - API_URL terisi  -> data disimpan di Google Sheets lewat Apps Script, dipakai bersama. */
const API_URL='https://script.google.com/macros/s/AKfycbwT4LwFlU-tTbB4BIWtEElU-VDkLehelF65c3RQs7z1cCFLHp80Zkq4xzubH6R-Whp6mg/exec'; // tempel URL Web App Apps Script (berakhiran /exec) di sini

const Store=(()=>{
  const K='wifigo_v1',PWK='wifigo_pw',ONLINE=!!API_URL;
  const blank=()=>({customers:[],invoices:[],payments:[],expenses:[],incomes:[],audit:[],seq:{c:0,i:0,p:0,e:0,n:0}});
  const d=blank();
  // isi d di tempat (referensi d tidak boleh berganti karena dipakai app.js)
  const fill=x=>{
    const b=blank();x=x&&typeof x==='object'?x:{};
    Object.keys(b).forEach(k=>{if(x[k]===undefined)x[k]=b[k];});
    x.seq=Object.assign(b.seq,x.seq);
    Object.keys(d).forEach(k=>delete d[k]);Object.assign(d,x);
  };

  let pw=localStorage.getItem(PWK)||'',rev=0,dirty=false,busy=false,el=null;
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const notify=(m,err)=>{if(typeof toast==='function')toast(m,err);};
  const status=(t,err)=>{
    if(!ONLINE)return;
    if(!el){el=document.createElement('div');el.style.cssText='margin-top:auto;font-size:12px;padding:8px 12px;color:#6b7689';
      const nav=document.getElementById('nav');(nav||document.body).appendChild(el);}
    el.textContent=t;el.style.color=err?'#b42318':'#6b7689';
  };

  async function api(body){
    // tanpa header khusus supaya tidak memicu preflight CORS
    const res=await fetch(API_URL,{method:'POST',body:JSON.stringify({...body,pw})});
    if(!res.ok)throw new Error('Server membalas '+res.status);
    return res.json();
  }
  const askPw=msg=>new Promise(res=>{
    const m=document.getElementById('modal');
    m.innerHTML=`<form><h2>Masuk ke WiFigo</h2><div class="f"><label>Password</label><input type="password" name="pw" required></div><small class="fe">${msg||''}</small><div class="row" style="justify-content:flex-end"><button class="pri">Masuk</button></div></form>`;
    m.hidden=false;
    m.querySelector('form').onsubmit=e=>{e.preventDefault();const v=e.target.pw.value;m.hidden=true;m.innerHTML='';res(v);};
    setTimeout(()=>m.querySelector('input').focus(),0);
  });
  const relogin=async msg=>{localStorage.removeItem(PWK);pw=await askPw(msg);};

  async function init(){
    if(!ONLINE){fill(JSON.parse(localStorage.getItem(K)||'null'));return;}
    let err='';
    for(;;){
      if(!pw)pw=await askPw(err);
      const r=await api({action:'load'});
      if(r.auth){localStorage.removeItem(PWK);pw='';err='Password salah';continue;}
      if(!r.ok)throw new Error(r.error||'Gagal memuat data');
      localStorage.setItem(PWK,pw);rev=r.rev;
      if(r.data)fill(r.data);
      else{ // server masih kosong: tawarkan data lama dari browser ini
        fill(null);
        const old=JSON.parse(localStorage.getItem(K)||'null');
        if(old&&((old.customers||[]).length||(old.invoices||[]).length)&&confirm('Server masih kosong, tapi ada data lama di browser ini. Upload data lama ke server?')){fill(old);dirty=true;flush();}
      }
      break;
    }
    status('Tersimpan ✓');
    setInterval(refresh,15000);
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
    window.addEventListener('beforeunload',e=>{if(dirty||busy){e.preventDefault();e.returnValue='';}});
  }

  async function refresh(){
    if(!ONLINE||busy||dirty||document.hidden)return;
    let r;try{r=await api({action:'load'});}catch(e){return;}
    if(!r.ok||r.rev===rev||busy||dirty)return;
    const mod=document.getElementById('modal'),ae=document.activeElement;
    if((mod&&!mod.hidden)||(ae&&/^(INPUT|SELECT|TEXTAREA)$/.test(ae.tagName)))return; // jangan ganggu yang sedang mengisi
    rev=r.rev;fill(r.data);if(typeof render==='function')render();
  }

  async function flush(){
    if(busy)return;busy=true;
    try{
      while(dirty){
        dirty=false;status('Menyimpan…');
        let r;
        try{r=await api({action:'save',rev,data:d});}
        catch(e){dirty=true;status('Gagal menyimpan, mencoba lagi…',1);await sleep(4000);continue;}
        if(r.ok){rev=r.rev;}
        else if(r.conflict){
          rev=r.rev;fill(r.data);dirty=false;
          notify('Data baru saja diubah pengguna lain. Perubahan terakhirmu tidak tersimpan, silakan ulangi.',1);
          if(typeof render==='function')render();
        }
        else if(r.auth){dirty=true;await relogin('Password salah atau sudah diganti');}
        else{dirty=true;status('Gagal menyimpan: '+(r.error||'error'),1);await sleep(4000);continue;}
      }
      status('Tersimpan ✓');
    }finally{busy=false;}
  }
  const save=()=>{
    if(!ONLINE){localStorage.setItem(K,JSON.stringify(d));return;}
    dirty=true;flush();
  };
  const nid=(k,p)=>p+String(++d.seq[k]).padStart(4,'0');
  const log=(aksi,detail)=>{d.audit.push({waktu:new Date().toISOString(),aksi,detail});};
  const num=v=>{v=Number(String(v).replace(/\./g,''));if(!isFinite(v)||v<=0)throw new Error('Nominal harus lebih dari 0');return v;};
  const wa=v=>{v=String(v||'');if(!/^08\d{8,11}$/.test(v))throw new Error('Nomor WhatsApp harus diawali 08 dan 10–13 digit');return v;};
  const date=v=>{if(!v||isNaN(new Date(v)))throw new Error('Tanggal tidak valid');return v;};
  const sum=a=>a.reduce((s,x)=>s+x.amount,0);
  // Siklus per pelanggan: tanggal mulai berlangganan = tanggal tagihan tiap bulan, jatuh tempo = sebulan setelahnya
  const nextM=p=>{const[y,m]=p.split('-').map(Number);return m===12?`${y+1}-01`:`${y}-${String(m+1).padStart(2,'0')}`;};
  const dueDay=c=>Number(c.start.slice(8,10));
  const cyc=(c,p)=>{const[y,m]=p.split('-').map(Number);return p+'-'+String(Math.min(dueDay(c),new Date(y,m,0).getDate())).padStart(2,'0');}; // tanggal mulai siklus bulan p
  const dueFor=(c,p)=>cyc(c,nextM(p)); // mulai 3 Nov -> jatuh tempo 3 Des
  const localToday=()=>{const t=new Date();return `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;};

  function calc(i){
    const ps=d.payments.filter(p=>p.invoiceId===i.id);
    const paid=sum(ps.filter(p=>p.status==='Terverifikasi'));
    const pending=sum(ps.filter(p=>p.status==='Menunggu verifikasi'));
    return{paid,pending,left:Math.max(0,i.amount-paid),status:paid>=i.amount?'Lunas':paid>0?'Sebagian':'Belum lunas'};
  }
  return{
    d,calc,init,dueDay,
    customer:id=>d.customers.find(c=>c.id===id),
    saveCustomer(x){
      if(!x.name.trim())throw new Error('Nama wajib diisi');
      x.fee=num(x.fee);x.wa=wa(x.wa);
      date(x.start);
      if(x.id){Object.assign(Store.customer(x.id),x);log('Ubah pelanggan',x.id);}
      else{x.id=nid('c','P');d.customers.push(x);log('Tambah pelanggan',x.id);}
      save();
    },
    // cid kosong = semua pelanggan aktif; own=true -> jatuh tempo ikut tanggal tiap pelanggan
    generate(period,due,cid,own){
      if(!own)date(due);let n=0;
      d.customers.filter(c=>c.status==='Aktif'&&(!cid||c.id===cid)&&c.start.slice(0,7)<=period).forEach(c=>{
        if(d.invoices.some(i=>i.customerId===c.id&&i.period===period&&i.type==='Langganan'))return;
        d.invoices.push({id:`INV-${period.replace('-','')}-${c.id}`,customerId:c.id,period,due:own?dueFor(c,period):due,amount:c.fee,type:'Langganan'});n++;
      });
      log('Buat tagihan bulanan',`${period}: ${n}`);save();return n;
    },
    // Otomatis: buat tagihan bulan ini saat tanggal siklus pelanggan tiba, dan samakan jatuh tempo tagihan yang belum dibayar (aman dipanggil berulang)
    auto(){
      const t=localToday(),p=t.slice(0,7);let ch=0;
      d.invoices.forEach(i=>{
        if(i.type!=='Langganan'||d.payments.some(x=>x.invoiceId===i.id))return;
        const c=Store.customer(i.customerId);if(!c||!c.start)return;
        const x=dueFor(c,i.period);if(i.due!==x){i.due=x;ch++;}
      });
      const need=d.customers.filter(c=>c.status==='Aktif'&&cyc(c,p)>=c.start&&cyc(c,p)<=t&&!d.invoices.some(i=>i.customerId===c.id&&i.period===p&&i.type==='Langganan'));
      if(!need.length&&!ch)return 0;
      need.forEach(c=>d.invoices.push({id:`INV-${p.replace('-','')}-${c.id}`,customerId:c.id,period:p,due:dueFor(c,p),amount:c.fee,type:'Langganan'}));
      if(need.length)log('Tagihan otomatis',`${p}: ${need.length}`);
      if(ch)log('Sinkron jatuh tempo',`${ch} tagihan`);
      save();return need.length;
    },
    addPayment(x){
      const inv=d.invoices.find(i=>i.id===x.invoiceId);
      if(!inv)throw new Error('Pilih tagihan');
      x.amount=num(x.amount);date(x.date);
      if(x.amount>calc(inv).left)throw new Error('Nominal melebihi sisa tagihan');
      x.id=nid('p','TRX');
      x.status=x.method==='Tunai'?'Terverifikasi':'Menunggu verifikasi';
      d.payments.push(x);log('Catat pembayaran',`${x.id} ${x.amount}`);save();
    },
    dupPayment:x=>d.payments.some(p=>p.invoiceId===x.invoiceId&&p.date===x.date&&p.amount===Number(String(x.amount).replace(/\./g,''))),
    verify(id){const p=d.payments.find(p=>p.id===id);p.status='Terverifikasi';log('Verifikasi pembayaran',id);save();},
    addExpense(x){return Store.saveExpense(x);},
    saveExpense(x){
      x.amount=num(x.amount);date(x.date);if(!x.desc.trim())throw new Error('Deskripsi wajib diisi');
      const o=d.expenses.find(e=>e.id===x.id);
      if(o){log('Ubah pengeluaran',`${o.id} ${o.amount}→${x.amount}`);Object.assign(o,x);}
      else{x.id=nid('e','OUT');d.expenses.push(x);log('Tambah pengeluaran',x.id);}
      save();
    },
    addIncome(x){
      x.amount=num(x.amount);date(x.date);if(!x.desc.trim())throw new Error('Deskripsi wajib diisi');
      x.id=nid('n','IN');d.incomes.push(x);log('Tambah pemasukan lain',x.id);save();
    },
    addService(x){
      const c=Store.customer(x.customerId);if(!c)throw new Error('Pilih pelanggan');
      x.amount=num(x.amount);date(x.due);if(!x.desc.trim())throw new Error('Jenis jasa wajib diisi');
      const id=nid('i','INV-JS-');d.invoices.push({id,customerId:c.id,period:x.due.slice(0,7),due:x.due,amount:x.amount,type:'Jasa',desc:x.desc});
      log('Buat tagihan jasa',id);save();
    }
  };
})();