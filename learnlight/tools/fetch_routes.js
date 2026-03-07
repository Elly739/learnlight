(async ()=>{
  try {
    const r1 = await (await fetch('http://localhost:5173')).text();
    const r2 = await (await fetch('http://localhost:5173/dashboard')).text();
    console.log('root_len='+r1.length);
    console.log('dash_len='+r2.length);
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  }
})();