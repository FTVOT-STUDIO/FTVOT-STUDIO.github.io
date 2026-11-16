// 언어 선택: 한국어(HTML 원문) · English · 日本語
// 각 항목은 [선택자, 영어 배열, 일본어 배열]. 같은 선택자에 여러 요소가 있으면 문서 순서대로 대응합니다
const T = [
  ['.back', ['FTVOT Studio'], ['FTVOT Studio']],
  ['.release > span:first-child', ['Coming December 2029'], ['2029年12月 発売予定']],
  ['.scroll-cue', ['Learn more'], ['もっと見る']],
  ['.main-tag', ['If refusing salvation is a sin,<br>then gladly I shall be a sinner.'], ['救いを拒むことが罪ならば、<br>喜んで罪人となろう。']],
  ['.sub-tag', ['Not even salvation granted by a god can take the place of my freedom.'], ['神が与えた救いでさえ、私の自由の代わりにはならない。']],
  ['#about .lead', [
    '<i>Contra Vincula: The Defiant Exile</i> is a narrative RPG set in the dark fantasy world of <b>ARCA</b>, about the oppression carried out in the name of divinity and those who rise against that order.',
    'You play as Seraphina Lilith, a former angel cast out of heaven, uncovering the truth hidden within the Faust Church.'
  ], [
    '『コントラ・ヴィンクラ：ザ・ディファイアント・エグザイル』は、ダークファンタジー世界<b>アルカ（ARCA）</b>を舞台に、神性の名のもとに行われる抑圧と、その秩序に抗う者たちを描くナラティブRPGです。',
    'プレイヤーは天界を追放された元天使セラフィナ・リリスとなり、ファウスト教に隠された真実を調べます。'
  ]],
  ['#about dt', ['Genre', 'World', 'Themes'], ['ジャンル', '世界観', 'テーマ']],
  ['#about dd', ['Narrative RPG · Dark Fantasy', 'ARCA', 'Freedom · Bondage · Salvation · Faith · Choice · Defiance'], ['ナラティブRPG · ダークファンタジー', 'ARCA（アルカ）', '自由 · 束縛 · 救済 · 信仰 · 選択 · 抵抗']],
  ['#world .lead', ['ARCA is a world where transcendent beings of divinity and power clash, each pursuing their own ideals. Here, salvation is not always mercy, and a decision made to protect someone can rob them of their freedom.'], ['アルカは、神性と権能を持つ超越的な存在たちがそれぞれの理想を追い求めて衝突する世界です。ここでの救いは必ずしも慈悲ではなく、誰かを守るための決断がその者の自由を奪うこともあります。']],
  ['#world h3', ['The Sephirot', 'The Faust Church'], ['セフィラ', 'ファウスト教']],
  ['#world article p', [
    'Beings who govern the order and principles of the world. Transcendents who oppose them or hold other ideals, and the lives under their influence, are bound together in a tangled web.',
    'A church centered on Tiphareth, the Sephira who wields the power of beauty. The deeper the faith, the more each will is subjected to its order. What lies beneath its splendid, sacred surface is for you to uncover.'
  ], [
    '世界の秩序と原理を司る存在。彼らと対立し、あるいは異なる理想を抱く超越者たち、そしてその影響下で生きる命が複雑に絡み合っています。',
    '美の権能を持つセフィラ、ティフェレトを中心とした教団。信仰が深まるほど、個人の意志は信仰の秩序に従属していきます。華やかで神聖な外見の下に何が隠されているのかは、プレイヤー自身が暴かなければなりません。'
  ]],
  ['#story h2', ['Only Seven Days'], ['与えられた時間は、わずか7日']],
  ['#story .lead', [
    'Lilith lost her wings and her station as the price of defying the order. The Faust Church she reached offered no new life, only another demand for obedience in the name of salvation. Imprisoned in place of the one she sought to protect, she is robbed even of her voice.',
    'On the day an unexpected hand frees her from her cell, the memories of everyone in the church but Tiphareth grow briefly clouded. For the one week this lasts, Lilith must find <b>seven pieces of valid evidence</b> to stand against Tiphareth.'
  ], [
    '秩序に抗った代償として翼と地位を奪われたリリス。たどり着いたファウスト教は新たな人生ではなく、救いを名目に再び服従を強いる場所でした。守ろうとした者の身代わりに幽閉された彼女は、声さえも奪われます。',
    '思いがけない助けで牢を抜け出した日、ティフェレトを除く教団の人々の記憶が一時的に曇ります。その状態が続く一週間のうちに、リリスはティフェレトに立ち向かうための<b>七つの有効な情報</b>を見つけなければなりません。'
  ]],
  ['#story .quote', ['What she seeks is not revenge, but the freedom to decide her own life, bound by no one\'s command.'], ['彼女が望むのは復讐ではなく、誰の命令にも縛られず、自らの生き方を自分で決める自由です。']],
  ['.cast .role', ['The Defiant Exile', 'The Beauty That Enthralls the World', 'Tiphareth\'s Most Beloved Saint', 'Tiphareth\'s Devoted Believer'], ['抗う追放者', '世界を魅了する美', 'ティフェレトが最も慈しむ聖女', 'ティフェレトの忠実な信徒']],
  ['.cast h3', ['Seraphina Lilith', 'Tiphareth', 'Julos de Pore', 'Andromalius'], ['セラフィナ・リリス', 'ティフェレト', 'ジュロス・ド・ポア', 'アンドロマリウス']],
  ['.cast article > p:not(.role)', [
    'A former angel who lost her wings for defying the order of heaven. She is neither a righteous hero nor a flawless savior, and will not shy from cruel choices to win back her freedom.',
    'The Sephira of beauty and head of the Faust Church. She seeks to mend a divided world through salvation, yet that salvation is faith to some and a chain upon freedom to others.',
    'The saint of the Faust Church whom Tiphareth cherishes above all.',
    'A man of absolute faith in Tiphareth. She lies at the heart of every judgment he makes, and that faith shapes how he sees the world and others, as well as his conflict with Lilith.'
  ], [
    '天界の秩序に抗い翼を失った元天使。正義の英雄でも完全無欠の救世主でもなく、自由を取り戻すためなら残酷な選択もためらいません。',
    '美の権能を持つセフィラにしてファウスト教の教主。救いによって分かたれた世界をつなごうとしますが、その救いはある者には信仰であり、ある者には自由を奪う鎖です。',
    'ティフェレトが誰よりも寵愛するファウスト教の聖女。',
    'ティフェレトへの絶対的な信仰を抱く人物。彼の判断の中心には常にティフェレトがあり、その信仰は世界と他者を見る目、そしてリリスとの対立にも深く絡み合っています。'
  ]],
  ['.systems h3', ['Investigation', 'Dialogue & Choices', 'Deduction & Mind Games', 'Time Management', 'RPG Elements', 'Relationships', 'Branching Story'], ['調査・探索', '会話・選択肢', '推理・心理戦', '時間管理', 'RPG要素', '人物関係', '分岐するストーリー']],
  ['.systems p', [
    'Search places and people to gather clues, records, and evidence.',
    'Read what others say and do, and steer conversations with your choices.',
    'Find contradictions in testimony and use evidence to expose hidden truths.',
    'Plan where to search and whom to meet within seven days.',
    'Weigh health, action points, and suspicion before every move.',
    'Affection, emotion, and past actions change how people react and what they reveal.',
    'Your choices and findings change how events unfold.'
  ], [
    '場所や人物を調べ、手がかり・記録・証拠を集めます。',
    '相手の発言と行動を分析し、選択によって会話の流れを変えます。',
    '証言の矛盾を見つけ、証拠で隠された情報を暴きます。',
    '7日の中で、どこを調べ誰に会うかを計画します。',
    '体力・行動力・疑念度を考えながら行動を決めます。',
    '好感度や感情、これまでの行動によって反応や得られる情報が変わります。',
    '選択と調査の結果が物語の展開を変えます。'
  ]],
  ['#news dt', ['Developer', 'Release', 'Engine', 'Platforms'], ['開発', '発売', 'エンジン', 'プラットフォーム']],
  ['#news dd', ['FTVOT Studio', 'December 2029', 'Unity', 'TBA'], ['FTVOT STUDIO（セグスタジオ）', '2029年12月予定', 'Unity', '後日発表']],
  ['.foot a', ['Back to FTVOT Studio'], ['FTVOT Studioへ戻る']],
];

const LANGS = ['ko', 'en', 'ja'];
const original = T.map(([sel]) => [...document.querySelectorAll(sel)].map((el) => el.innerHTML)); // 한국어 원문 보관

function apply(lang) {
  const k = LANGS.indexOf(lang);
  T.forEach(([sel, en, ja], i) => {
    const list = k === 0 ? original[i] : k === 1 ? en : ja;
    document.querySelectorAll(sel).forEach((el, j) => { if (list[j] != null) el.innerHTML = list[j]; });
  });
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-lang]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
  try { localStorage.setItem('cv-lang', lang); } catch {}
}

let saved = null; try { saved = localStorage.getItem('cv-lang'); } catch {}
const guess = (navigator.language || 'ko').slice(0, 2);
const start = LANGS.includes(saved) ? saved : LANGS.includes(guess) ? guess : 'en';
document.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => apply(b.dataset.lang)));
if (start !== 'ko') apply(start); else apply('ko');
