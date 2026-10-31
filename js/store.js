/* Lapisan data. Sekarang memakai localStorage; nanti ganti isi fungsi ini
   dengan google.script.run agar terhubung ke Google Sheets. */
const Store=(()=>{
  const K='wifigo_v1';
  const d=JSON.parse(localStorage.getItem(K)||'null')||{customers:[],invoices:[],payments:[],expenses:[],audit:[],seq:{c:0,i:0,p:0,e:0}};
  d.incomes=d.incomes||[];d.seq.n=d.seq.n||0;
  const save=()=>localStorage.setItem(K,JSON.stringify(d));
  const nid=(k,p)=>p+String(++d.seq[k]).padStart(4,'0');
  const log=(aksi,detail)=>{d.audit.push({waktu:new Date().toISOString(),aksi,detail});};
  const num=v=>{v=Number(String(v).replace(/\./g,''));if(!isFinite(v)||v<=0)throw new Error('Nominal harus lebih dari 0');return v;};
  const wa=v=>{v=String(v||'');if(!/^08\d{8,11}$/.test(v))throw new Error('Nomor WhatsApp harus diawali 08 dan 10–13 digit');return v;};
  const date=v=>{if(!v||isNaN(new Date(v)))throw new Error('Tanggal tidak valid');return v;};
  const sum=a=>a.reduce((s,x)=>s+x.amount,0);

  function calc(i){
    const ps=d.payments.filter(p=>p.invoiceId===i.id);
    const paid=sum(ps.filter(p=>p.status==='Terverifikasi'));
    const pending=sum(ps.filter(p=>p.status==='Menunggu verifikasi'));
    return{paid,pending,left:Math.max(0,i.amount-paid),status:paid>=i.amount?'Lunas':paid>0?'Sebagian':'Belum lunas'};
  }
  return{
    d,calc,
    customer:id=>d.customers.find(c=>c.id===id),
    saveCustomer(x){
      if(!x.name.trim())throw new Error('Nama wajib diisi');
      x.fee=num(x.fee);x.wa=wa(x.wa);
      date(x.start);
      if(x.id){Object.assign(Store.customer(x.id),x);log('Ubah pelanggan',x.id);}
      else{x.id=nid('c','P');d.customers.push(x);log('Tambah pelanggan',x.id);}
      save();
    },
    generate(period,due){
      date(due);let n=0;
      d.customers.filter(c=>c.status==='Aktif').forEach(c=>{
        if(d.invoices.some(i=>i.customerId===c.id&&i.period===period&&i.type==='Langganan'))return;
        d.invoices.push({id:`INV-${period.replace('-','')}-${c.id}`,customerId:c.id,period,due,amount:c.fee,type:'Langganan'});n++;
      });
      log('Buat tagihan bulanan',`${period}: ${n}`);save();return n;
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
