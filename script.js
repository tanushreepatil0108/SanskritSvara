let sounds = [];
let words = [];
let currentSoundFilter = "All";
let speechBusy = false;

const $ = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", init);

async function init(){
  bindTabs();
  bindEvents();
  try{
    const [sRes,wRes] = await Promise.all([fetch("/api/sounds"), fetch("/api/words")]);
    if(!sRes.ok || !wRes.ok) throw new Error("Could not load data");
    sounds = await sRes.json();
    words = await wRes.json();
    $("dataStatus").textContent = `✓ ${sounds.length} sounds • ${words.length} words`;
    renderSoundFilters();
    renderSoundChart();
    renderSuggestions();
  }catch(err){
    console.error(err);
    $("dataStatus").textContent = "⚠ Data loading error";
    showToast("Could not load JSON data. Check that the Node server is running.");
  }
}

function bindTabs(){
  document.querySelectorAll(".tab").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".tab").forEach(b=>b.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach(p=>p.classList.remove("active"));
      btn.classList.add("active");
      $(btn.dataset.tab).classList.add("active");
    });
  });
}

function bindEvents(){
  $("analyzeSoundBtn").onclick = analyzeSound;
  $("analyzeWordBtn").onclick = analyzeWord;
  $("voiceTestBtn").onclick = ()=>speakText("नमस्ते");
  $("soundInput").addEventListener("keydown",e=>{if(e.key==="Enter") analyzeSound()});
  $("wordInput").addEventListener("keydown",e=>{if(e.key==="Enter") analyzeWord()});
}

function renderSoundFilters(){
  const categories = ["All","Vowel","Ka-varga","Cha-varga","Ta-varga","Pa-varga","Antastha","Ushman"];
  $("soundFilters").innerHTML = categories.map(c=>`<button class="filter ${c==="All"?"active":""}" data-filter="${c}">${c}</button>`).join("");
  document.querySelectorAll(".filter").forEach(btn=>{
    btn.onclick=()=>{
      currentSoundFilter=btn.dataset.filter;
      document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b===btn));
      renderSoundChart();
    };
  });
}

function renderSoundChart(){
  const list = currentSoundFilter==="All" ? sounds : sounds.filter(s=>s.type===currentSoundFilter || s.varga===currentSoundFilter);
  $("soundChart").innerHTML = list.map(s=>`
    <button class="sound-card" title="Analyze ${escapeHtml(s.character)}" onclick="showSoundDetails('${escapeAttr(s.character)}')">
      ${escapeHtml(s.character)}
    </button>
  `).join("");
}

function analyzeSound(){
  const input = $("soundInput").value.trim();
  if(!input){showToast("Enter a Sanskrit character first.");return;}
  const found = sounds.find(s=>s.character===input);
  if(!found){
    $("soundResult").classList.remove("hidden");
    $("soundResult").innerHTML = `<div><h3>❌ Sound not found</h3><p>Try a sound from the chart such as अ, क, ख, ग, च, त or प.</p></div>`;
    return;
  }
  showSoundDetails(input,true);
}

function showSoundDetails(char,scroll=false){
  const s=sounds.find(x=>x.character===char);
  if(!s) return;
  $("soundInput").value=s.character;
  $("soundResult").classList.remove("hidden");
  $("soundResult").innerHTML=`
    <div class="result-head">
      <div class="big-char">${escapeHtml(s.character)}</div>
      <div class="roman">${escapeHtml(s.category)} • ${escapeHtml(s.type)}</div>
      <button class="speak" onclick="speakText('${escapeAttr(s.character)}')">🔊 Hear ${escapeHtml(s.character)}</button>
    </div>
    <div class="info-grid">
      <div class="info-box"><h3>🧩 Classification</h3>
        ${row("Type",s.type)}${row("Category",s.category)}${row("Varga",s.varga)}
      </div>
      <div class="info-box"><h3>👄 Articulation</h3>
        ${row("Place",s.place)}${row("Voicing",s.voicing)}${row("Aspiration",s.aspiration)}
      </div>
    </div>
  `;
  if(scroll) $("soundResult").scrollIntoView({behavior:"smooth",block:"center"});
}

function renderSuggestions(){
  $("wordSuggestions").innerHTML=words.slice(0,8).map(w=>
    `<button class="try-btn" onclick="useWord('${escapeAttr(w.word)}')">${escapeHtml(w.word)}</button>`
  ).join("");
}

function useWord(word){
  $("wordInput").value=word;
  analyzeWord();
}

function analyzeWord(){
  const input=$("wordInput").value.trim();
  if(!input){showToast("Enter a Sanskrit word first.");return;}
  const w=words.find(x=>x.word===input);
  if(!w){
    $("wordResult").classList.remove("hidden");
    $("wordResult").innerHTML=`<div class="result"><h3>❌ Word not found</h3><p>This demo dictionary does not contain <b>${escapeHtml(input)}</b> yet. Add it to <code>data/words.json</code> to expand the application.</p></div>`;
    return;
  }
  renderWord(w);
}

function renderWord(w){
  $("wordResult").classList.remove("hidden");
  const meanings=w.meanings.map(m=>`<span class="try-btn">${escapeHtml(m)}</span>`).join(" ");
  const phonetic=w.phonetics.map((p,i)=>`
    <button class="phonetic-sound" onclick="phoneticClick('${escapeAttr(p)}')" title="Click to hear/analyze ${escapeHtml(p)}">${escapeHtml(p)}</button>
    ${i<w.phonetics.length-1?'<span class="phonetic-plus">+</span>':''}
  `).join("");
  $("wordResult").innerHTML=`
    <div class="result">
      <div class="result-head">
        <div class="big-char">${escapeHtml(w.word)}</div>
        <div class="roman">${escapeHtml(w.transliteration)}</div>
        <button class="speak" onclick="speakText('${escapeAttr(w.word)}')">🔊 Listen to Pronunciation</button>
      </div>

      <div class="info-box" style="margin-top:20px"><h3>📖 Meaning</h3><div class="filters">${meanings}</div></div>

      <div class="info-grid">
        <div class="info-box"><h3>🌱 Root / Dhātu</h3>
          ${row("Root",w.root)}${row("Transliteration",w.rootTransliteration)}${row("Root meaning",w.rootMeaning)}
        </div>
        <div class="info-box"><h3>🏷️ Word Information</h3>
          ${row("Word type",w.type)}${row("Prefix / Upasarga",w.prefix)}${row("Prefix meaning",w.prefixMeaning)}${row("Suffix / Ending",w.suffix)}${row("Suffix type",w.suffixType)}${row("Suffix meaning",w.suffixMeaning)}
        </div>
        <div class="info-box"><h3>📚 Grammar</h3>
          ${row("Lakāra",w.lakara)}${row("Tense",w.tense)}${row("Person",w.person)}${row("Number",w.number)}${row("Pada",w.pada)}
        </div>
        <div class="info-box"><h3>🧩 Word Formation</h3>
          <div class="formation">${escapeHtml(w.formation)}</div>
        </div>
      </div>

      <div class="phonetic">
        <h3>🔊 Phonetic Breakdown</h3>
        <p>Click any unit to hear it and open its articulation analysis.</p>
        <div class="phonetic-list">${phonetic}</div>
      </div>

      <div class="info-box" style="margin-top:18px">
        <h3>💡 How is this word formed?</h3>
        <p>${escapeHtml(w.explanation)}</p>
      </div>

      <div class="info-box" style="margin-top:18px">
        <h3>🗣️ Example</h3>
        ${w.examples.map(e=>`<div style="font-size:24px;font-family:'Noto Sans Devanagari','Nirmala UI',sans-serif">${escapeHtml(e)}</div>`).join("")}
      </div>
    </div>
  `;
  $("wordResult").scrollIntoView({behavior:"smooth",block:"start"});
}

function phoneticClick(unit){
  // Try speech first, then show the sound card if it exists.
  speakText(unit);
  const exact=sounds.find(s=>s.character===unit);
  if(exact){
    showSoundDetails(unit);
    $("soundInput").value=unit;
  }else{
    showToast(`Pronunciation unit: ${unit}`);
  }
}

function row(label,value){
  return `<div class="info-row"><span>${escapeHtml(label)}</span><span class="value">${escapeHtml(value ?? "—")}</span></div>`;
}

/* ---------- Pronunciation engine ---------- */

/*
  Pronunciation:
  1) Try an online Hindi/Devanagari TTS audio stream first.
     This avoids depending on which voices are installed in Windows.
  2) If the online voice cannot be loaded, fall back to the browser's
     installed speechSynthesis voice.
*/
let currentAudio = null;
let audioRequestId = 0;

function speakText(text){
  text = String(text || "").trim();
  if(!text) return;

  // Give every click a unique ID.
  // This prevents an older audio request from interfering
  // with the new one.
  const requestId = ++audioRequestId;

  // Stop previous online audio
  if(currentAudio){
    try{
      currentAudio.pause();
      currentAudio.removeAttribute("src");
      currentAudio.load();
    }catch(e){}
    currentAudio = null;
  }

  // Stop previous browser speech
  if("speechSynthesis" in window){
    try{
      window.speechSynthesis.cancel();
    }catch(e){}
  }

  /*
   * Online Hindi/Devanagari pronunciation.
   *
   * A unique cache-busting value is added so mobile browsers
   * request fresh audio every time.
   */
  const onlineUrl =
    "https://translate.google.com/translate_tts" +
    "?ie=UTF-8&client=tw-ob&tl=hi&q=" +
    encodeURIComponent(text) +
    "&cb=" + Date.now();

  const audio = new Audio();
  currentAudio = audio;

  audio.preload = "auto";
  audio.playbackRate = 0.9;

  let fallbackUsed = false;

  const useBrowserFallback = () => {

    if(fallbackUsed || requestId !== audioRequestId) return;

    fallbackUsed = true;

    console.log("Online pronunciation unavailable. Using browser TTS.");

    if(!("speechSynthesis" in window)){
      showToast("Speech is not available on this phone.");
      return;
    }

    try{
      window.speechSynthesis.cancel();
    }catch(e){}

    const utterance = new SpeechSynthesisUtterance(text);

    utterance.rate = 0.62;
    utterance.pitch = 1;
    utterance.volume = 1;

    const voices = window.speechSynthesis.getVoices();

    const preferred =
      voices.find(v => /^sa(-|_)/i.test(v.lang)) ||
      voices.find(v => /^hi(-|_)/i.test(v.lang)) ||
      voices.find(v => /^en(-|_)in/i.test(v.lang)) ||
      voices.find(v => v.default) ||
      voices[0];

    if(preferred){
      utterance.voice = preferred;
      utterance.lang = preferred.lang;

      console.log(
        "Using fallback voice:",
        preferred.name,
        preferred.lang
      );
    }else{
      utterance.lang = "hi-IN";
    }

    utterance.onstart = () => {
      console.log("🔊 Browser speech started:", text);
    };

    utterance.onend = () => {
      console.log("✅ Browser speech finished:", text);
    };

    utterance.onerror = e => {
      console.error("❌ Browser speech error:", e.error);
    };

    // Small delay helps mobile Chrome/Safari
    // start speech after the previous speech is cancelled.
    setTimeout(() => {

      if(requestId !== audioRequestId) return;

      try{
        window.speechSynthesis.speak(utterance);
      }catch(e){
        console.error("Speech failed:", e);
      }

    }, 100);
  };

  audio.onplay = () => {

    if(requestId !== audioRequestId){
      try{
        audio.pause();
      }catch(e){}
      return;
    }

    console.log(
      "🔊 Online pronunciation started:",
      text
    );
  };

  audio.onended = () => {

    if(requestId === audioRequestId){
      console.log(
        "✅ Online pronunciation finished:",
        text
      );

      currentAudio = null;
    }
  };

  audio.onerror = () => {

    if(requestId !== audioRequestId) return;

    console.warn(
      "Online pronunciation failed. Trying browser voice..."
    );

    if(currentAudio === audio){
      currentAudio = null;
    }

    useBrowserFallback();
  };

  // Set the NEW audio source
  audio.src = onlineUrl;

  // Important for mobile browsers
  audio.load();

  const playAudio = audio.play();

  if(playAudio !== undefined){

    playAudio.catch(error => {

      console.warn(
        "Mobile audio play failed:",
        error
      );

      if(requestId === audioRequestId){
        useBrowserFallback();
      }

    });

  }
}

function showToast(message){
  const t=$("toast");t.textContent=message;t.classList.add("show");
  clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove("show"),2600);
}

function escapeHtml(value){
  return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]));
}
function escapeAttr(value){return String(value).replace(/\\/g,"\\\\").replace(/'/g,"\\'");}

// Expose functions used by inline buttons
window.showSoundDetails=showSoundDetails;
window.useWord=useWord;
window.phoneticClick=phoneticClick;
window.speakText=speakText;
