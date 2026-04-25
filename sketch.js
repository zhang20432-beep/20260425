let seeds = [];
let vinePoints = [];
let shortVinePoints = []; // 存放短藤蔓路徑
let stars = [];
let clouds = []; // 存放緩慢移動的雲朵
let particles = []; // 存放飄落的花瓣粒子
let meteors = []; // 存放流星
let memoryShards = []; // 新增：記憶碎片
let fireflyTrail = []; // 存放螢火蟲的尾跡粒子
let dustParticles = []; // 存放環境塵埃粒子
let fireflyPos;        // 螢火蟲當前位置
let fireflyBezier = []; // 貝茲曲線點
let conceptTextElement; // 用於顯示設計理念的 HTML 元素
let fireflyT = 0;      // 曲線進度 (0-1)
let isFireflyFree = false; // 是否開始隨機飛行

let currentExhibitName = ""; // 目前正在展示的作品名稱
let loadingMessage = ""; // 存放載入提示文字
let loadingTimer = 0;    // 載入提示顯示計時器
let showConceptDetails = false; // 控制設計理念詳細說明的顯示
let growth = 0;    // 生長進度 (0 到 1)
const GROWTH_SPEED = 0.005; 
const TOTAL_WEEKS = 6; // 修改為 6 週

function setup() {
  // 調整畫布為全視窗大小，作為整個頁面的背景
  let canvas = createCanvas(windowWidth, windowHeight);
  // 將畫布定位為固定，並置於最底層，使其作為背景
  canvas.style('position', 'fixed');
  canvas.style('top', '0');
  canvas.style('left', '0');
  canvas.style('z-index', '-1'); // 確保畫布在其他內容之下

  // 初始化星空 (現在會分佈在整個視窗)
  for (let i = 0; i < 100; i++) {
    stars.push({
      x: random(width),
      y: random(height),
      size: random(1, 3),
      phase: random(TWO_PI), // 隨機初始相位，讓閃爍錯開
      twinkleSpeed: random(0.02, 0.05) // 隨機閃爍速度
    });
  }

  // 1. 初始化藤蔓路徑 (Vertex & For)
  // 我們從底部向上生長
  for (let i = 0; i <= 100; i++) {
    let y = map(i, 0, 100, height + 50, -50);
    // 將藤蔓的 x 軸基準點設定在左側 30% 區域的中心
    let xBase = windowWidth * 0.3 / 2;
    vinePoints.push({ xBase: xBase, y: y, angleOffset: i * 0.1 });
  }

  // 1.1 初始化短藤蔓路徑 (用於期末初稿)
  for (let i = 0; i <= 40; i++) {
    let y = map(i, 0, 40, height + 50, height * 0.5); // 只生長到螢幕一半高度
    // 將短藤蔓放在主藤蔓右側一點
    let xBase = windowWidth * 0.3 * 0.8;
    shortVinePoints.push({ xBase: xBase, y: y, angleOffset: i * 0.15 });
  }

  // 2. 在路徑上放置「週次種子」 (Class)
  for (let i = 1; i <= TOTAL_WEEKS; i++) {
    // 依比例找到路徑上的座標
    let idx = Math.floor(map(i, 1, TOTAL_WEEKS, 20, 80));
    let pos = vinePoints[idx];

    // 根據需求調整週次標記與資料夾路徑 (w2->w2-1, w3->w2-2, w4->w3, w5->w4, w6->w5)
    let weekLabel = i;
    if (i === 2) weekLabel = "2-1";
    else if (i === 3) weekLabel = "2-2";
    else if (i > 3) weekLabel = i - 1;

    let weekUrl = `week${weekLabel}/index.html`; 
    seeds.push(new Seed(pos.xBase, pos.y, weekLabel, weekUrl, idx));
  }

  // 2.1 在短藤蔓上放置「期末初稿」花苞
  let finalIdx = 35;
  let finalPos = shortVinePoints[finalIdx];
  // 已根據你的需求，將資料夾路徑修改為 Wfinal/index.html
  seeds.push(new Seed(finalPos.xBase, finalPos.y, "Final", "Wfinal/index.html", finalIdx, true));

  // 3. 初始化記憶碎片
  for (let i = 0; i < 8; i++) {
    memoryShards.push(new MemoryShard());
  }

  // 4. 初始化塵埃粒子
  for (let i = 0; i < 60; i++) {
    dustParticles.push(new Dust());
  }

  // 6. 初始化雲朵粒子
  for (let i = 0; i < 10; i++) { // 可以調整雲朵的數量
    clouds.push(new Cloud());
  }

  // 5. 調整右側展示視窗 (iframe) 的樣式：縮小比例並加上裝飾邊框
  let iframe = document.getElementById('exhibit-frame');
  if (iframe) {
    iframe.style.width = '65%';
    iframe.style.height = '85vh';
    iframe.style.border = '8px double #4eaf7a';
    iframe.style.borderRadius = '20px';
    iframe.style.marginTop = '5vh';
    iframe.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.6)';
    iframe.style.backgroundColor = 'transparent'; // 讓 iframe 背景透明，顯示後方的 p5.js 畫布
    iframe.style.zIndex = '1';          // 確保 iframe 在背景畫布之上
  }

  // 獲取設計理念的 HTML 元素
  conceptTextElement = document.getElementById('concept-text-scroll-area');
  conceptTextElement.style.zIndex = '2'; // 確保在背景畫布和 iframe 之間
}

function draw() {
  background(10, 15, 30); // 深藍色夜空

  // 繪製投射燈光暈效果
  drawSpotlight();

  // 更新生長進度
  if (growth < 1) {
    growth += GROWTH_SPEED;
  }

  // --- 繪製背景圖譜元素 (Grid & Constellations) ---
  drawBackgroundAtlas();

  // 繪製星空
  noStroke();
  for (let star of stars) {
    // 使用 sin 函數計算呼吸效果，範圍在 100 到 255 之間
    let alpha = map(sin(frameCount * star.twinkleSpeed + star.phase), -1, 1, 100, 255);
    fill(255, 255, 255, alpha);
    ellipse(star.x, star.y, star.size);
  }

  // 繪製環境塵埃 (在背景與藤蔓之間)
  for (let d of dustParticles) {
    d.update();
    d.display();
  }

  // 繪製雲朵 (在塵埃之後，藤蔓之前)
  for (let cloud of clouds) {
    cloud.update();
    cloud.display();
  }

  // 繪製標題：時光記憶圖譜-我的程式種子
  push();
  let titleY = 50 + sin(frameCount * 0.03) * 5; // 隨時間輕微上下漂浮
  let leftContentWidth = windowWidth * 0.3; // 定義左側內容區域的寬度
  textAlign(CENTER, CENTER);
  drawingContext.shadowBlur = 15;
  drawingContext.shadowColor = 'rgba(255, 255, 255, 0.6)';
  
  // 主標題
  fill(255, 255, 220);
  textSize(22);
  text("時光記憶圖譜", leftContentWidth / 2, titleY); // 居中於左側 30% 區域
  
  // 副標題
  textSize(14);
  fill(200, 200, 200, 200);
  text("我的程式種子", leftContentWidth / 2, titleY + 30); // 居中於左側 30% 區域
  pop();

  // --- 新增設計理念區塊 ---
  push();
  let conceptX = 20; 
  let conceptY = 110; 
  let lineHeight = 18; // 預設行高
  let wrapWidth = leftContentWidth - 40; // 自動換行寬度，限制在左側 30% 區域內
  let maxBoxHeight = height - conceptY - 40; // 根據螢幕高度動態計算區塊最大高度

  // 如果展開，繪製半透明背景邊框盒
  if (showConceptDetails) {
    push();
    fill(10, 20, 40, 210); // 半透明深色背景
    stroke(150, 255, 255, 150); // 神祕青色邊框
    strokeWeight(1.5);
    drawingContext.shadowBlur = 15;
    drawingContext.shadowColor = 'rgba(0, 255, 255, 0.4)';
    // 讓背景框高度隨視窗自動調整
    rect(conceptX - 15, conceptY - 30, wrapWidth + 30, maxBoxHeight, 15);
    pop();
  }
  
  textAlign(LEFT);
  
  // 檢查滑鼠是否懸停在"設計理念"標題上 (簡單邊界偵測)
  let isHoveringConcept = mouseX > conceptX && mouseX < conceptX + 100 && mouseY > conceptY - 20 && mouseY < conceptY + 10;
  
  if (isHoveringConcept) {
    fill(255, 255, 150); // 懸停時變淡黃色
    drawingContext.shadowBlur = 15;
  } else {
    fill(220, 220, 220, 230);
    drawingContext.shadowBlur = 8;
  }
  drawingContext.shadowColor = 'rgba(255, 255, 255, 0.4)';

  // 設計理念標題
  textSize(18);
  text("▶ 設計理念與心得" + (showConceptDetails ? " (點擊收合)" : " (點擊展開)"), conceptX, conceptY);

  // 如果點開了，才顯現詳細文字
  if (showConceptDetails) {
    conceptY += lineHeight * 1.5;
    fill(230, 245, 255, 255); // 稍微調亮文字顏色以利閱讀
    textSize(12.5); // 稍微縮小字體以確保容納性
    drawingContext.shadowBlur = 0;
    noStroke();
    
    let fullText = "【技術指令運用】\n\n" +
                   "● Vertex & For：運用 vertex() 配合 for 迴圈與 frameCount，模擬藤蔓隨風擺動的有機動態。\n\n" +
                   "● Class：定義 Seed (週次節點) 與 Petal (花瓣) 類別，透過物件導向封裝運動與繪圖邏輯，實現 hover 開花效果。\n\n" +
                   "● Math (sin/map/dist)：利用 sin() 控制閃爍感，map() 轉換數據範圍，dist() 精確判斷滑鼠與種子的互動距離。\n\n" +
                   "● DOM 整合：點擊節點時連動 Iframe 的 src 切換，無縫展示各週網頁作品。\n\n" +
                   "【學習心得】\n\n" +
                   "本學期從基礎座標開始，掌握了如何將程式邏輯轉化為視覺美感。學習過程中體會到，代碼不再只是冰冷的字元，而是具備生命力的工具。透過調整數學參數，我學會了如何賦予虛擬物件自然界般的擺動與韻律，這是一場科技與藝術融合的奇妙探索。";

    // 將文字內容設定到 HTML 元素中
    conceptTextElement.innerHTML = fullText.replace(/\n/g, '<br>'); // 將換行符轉換為 <br>
    conceptTextElement.style.fontFamily = 'sans-serif'; // 保持字體一致
    conceptTextElement.style.color = 'rgb(230, 245, 255)'; // 保持文字顏色一致
    conceptTextElement.style.fontSize = '12.5px'; // 保持字體大小一致
    conceptTextElement.style.lineHeight = '1.5'; // 設置行高

    // 定位和尺寸調整
    conceptTextElement.style.left = `${conceptX}px`;
    conceptTextElement.style.top = `${conceptY + lineHeight * 1.5}px`; // 位於標題下方
    conceptTextElement.style.width = `${wrapWidth}px`;
    // 計算高度：總背景框高度 - (標題上方空間 + 標題高度 + 標題下方間距) - 底部內邊距
    conceptTextElement.style.height = `${maxBoxHeight - (lineHeight * 1.5 + 30) - 15}px`; // 15px 底部內邊距
    conceptTextElement.style.padding = '0px'; // 移除內邊距，讓文字緊貼邊框
    conceptTextElement.style.visibility = 'visible';
  } else {
    conceptTextElement.style.visibility = 'hidden';
    conceptTextElement.innerHTML = ''; // 清空內容以節省資源
  }
  pop();
  // --- 設計理念區塊結束 ---

  // 偶爾產生流星 (約每 200 幀一次)
  if (random(1) < 0.005) meteors.push(new Meteor());

  // 更新與繪製流星
  for (let i = meteors.length - 1; i >= 0; i--) {
    meteors[i].update();
    meteors[i].display();
    if (meteors[i].isFinished()) meteors.splice(i, 1);
  }

  // 繪製生長脈絡 (Vertex & For)
  noFill();
  stroke(60, 179, 113, 100); // 調整透明度
  strokeWeight(4);
  beginShape();
  // 根據 growth 進度決定繪製多少點
  let displayLimit = floor(vinePoints.length * growth);
  for (let i = 0; i < displayLimit; i++) {
    let p = vinePoints[i];
    let x = p.xBase + sin(frameCount * 0.02 + p.angleOffset) * 15;
    vertex(x, p.y);
  }
  endShape();

  // 繪製短藤蔓生長脈絡
  stroke(60, 179, 113, 80);
  strokeWeight(3);
  beginShape();
  let shortDisplayLimit = floor(shortVinePoints.length * growth);
  for (let i = 0; i < shortDisplayLimit; i++) {
    let p = shortVinePoints[i];
    let x = p.xBase + sin(frameCount * 0.02 + p.angleOffset) * 10;
    vertex(x, p.y);
  }
  endShape();

  // 繪製短藤蔓的葉子
  for (let i = 5; i < shortDisplayLimit; i += 15) {
    let p = shortVinePoints[i];
    let x = p.xBase + sin(frameCount * 0.02 + p.angleOffset) * 10;
    let side = (i % 30 === 5) ? 1 : -1;
    drawLeaf(x, p.y, side);
  }

  // 繪製螢火蟲 (藤蔓頂端的光點)
  if (displayLimit > 0) {
    let fx, fy;

    if (growth < 1) {
      let tipIdx = min(displayLimit - 1, vinePoints.length - 1);
      let pTip = vinePoints[tipIdx];
      fx = pTip.xBase + sin(frameCount * 0.02 + pTip.angleOffset) * 15; // 藤蔓頂端位置
      fy = pTip.y;
      fireflyPos = createVector(fx, fy);
    } else {
      if (!isFireflyFree) {
        initNewBezierPath(fireflyPos.x, fireflyPos.y);
        isFireflyFree = true;
      }

      fx = bezierPoint(fireflyBezier[0].x, fireflyBezier[1].x, fireflyBezier[2].x, fireflyBezier[3].x, fireflyT);
      fy = bezierPoint(fireflyBezier[0].y, fireflyBezier[1].y, fireflyBezier[2].y, fireflyBezier[3].y, fireflyT);
      fireflyPos.set(fx, fy);

      // 螢火蟲在整個畫布範圍內自由飛行
      fireflyT += 0.005;
      if (fireflyT >= 1) initNewBezierPath(fx, fy);
    }

    fireflyTrail.push(new FireflyTail(fx, fy));
    for (let i = fireflyTrail.length - 1; i >= 0; i--) {
      fireflyTrail[i].update();
      fireflyTrail[i].display();
      if (fireflyTrail[i].isFinished()) fireflyTrail.splice(i, 1);
    }

    push();
    drawingContext.shadowBlur = 25;
    drawingContext.shadowColor = 'rgba(255, 255, 150, 0.9)';
    fill(255, 255, 200);
    noStroke();
    let flicker = sin(frameCount * 0.1) * 2;
    ellipse(fx, fy, 8 + flicker, 8 + flicker);
    pop();
  }

  for (let i = 10; i < displayLimit; i += 20) {
    let p = vinePoints[i];
    let x = p.xBase + sin(frameCount * 0.02 + p.angleOffset) * 15;
    let side = (i % 40 === 10) ? 1 : -1;
    drawLeaf(x, p.y, side);
  }

  // 繪製所有種子
  for (let s of seeds) {
    s.update();
    s.display();
  }

  // 繪製記憶碎片 (漂浮的幾何體)
  for (let shard of memoryShards) {
    shard.update();
    shard.display();
  }

  // 繪製與更新粒子 (花瓣飄落)
  for (let i = particles.length - 1; i >= 0; i--) {
    particles[i].update();
    particles[i].display();
    if (particles[i].isFinished()) {
      particles.splice(i, 1);
    }
  }

  // --- 繪製展覽區 UI (iframe 上方) ---
  let contentCenterX = windowWidth * 0.3 + (windowWidth * 0.7) / 2;

  // 繪製目前展示標題
  if (currentExhibitName !== "" && loadingTimer <= 0) {
    push();
    textAlign(CENTER, TOP);
    fill(150, 255, 200, 150);
    textSize(14);
    text("— Currently Exhibiting —", contentCenterX, 15);
    fill(255, 255, 255, 220);
    textSize(20);
    text(currentExhibitName, contentCenterX, 38);
    pop();
  }

  // 繪製載入提示文字 (置於最上層)
  if (loadingTimer > 0) {
    push();
    textAlign(CENTER, TOP);
    textSize(22);
    fill(255, 255, 150, map(loadingTimer, 0, 120, 0, 255));
    text(loadingMessage, contentCenterX, 40);
    loadingTimer--;
    pop();
  }
}

// 初始化一段新的貝茲飛行路徑
function initNewBezierPath(startX, startY) {
  fireflyBezier = [
    createVector(startX, startY),
    createVector(random(width), random(height)),
    createVector(random(width), random(height)),
    createVector(random(width), random(height))
  ];
  fireflyT = 0;
}

// 繪製投射燈光暈效果
function drawSpotlight() {
  push();
  // 增加一點隨機閃爍感
  let flicker = sin(frameCount * 0.05) * 10;
  
  let gradient = drawingContext.createRadialGradient(
    windowWidth * 0.3 / 2, -20, 20,              // 內圓：光源中心 (左側 30% 區域的中心)
    windowWidth * 0.3 / 2, 0, windowWidth * 0.3 * 0.8 + flicker // 外圓：光暈擴散範圍 (限制在左側 30% 區域)
  );
  gradient.addColorStop(0, 'rgba(255, 255, 220, 0.5)');   // 最亮核心
  gradient.addColorStop(0.3, 'rgba(255, 255, 200, 0.2)'); // 中層暖色
  gradient.addColorStop(1, 'rgba(10, 15, 30, 0)');       // 融入背景深藍色
  drawingContext.fillStyle = gradient;
  rect(0, 0, width, height); // 覆蓋整個畫布，讓光影更自然
  pop();
}

// 繪製背景圖譜質感的輔助函式
function drawBackgroundAtlas() {
  push();
  // 1. 繪製星座連線 (讓星星之間產生關聯)
  stroke(255, 255, 255, 20); // 極淡的白線
  strokeWeight(0.5);
  for (let i = 0; i < stars.length; i += 10) { // 每隔幾個點連一次，避免畫面太亂
    let nextIdx = (i + 10) % stars.length;
    line(stars[i].x, stars[i].y, stars[nextIdx].x, stars[nextIdx].y);
  }

  // 2. 繪製座標網格 (Atlas 質感)
  stroke(100, 150, 255, 30); // 淡藍色網格
  for (let x = 0; x <= width; x += 50) {
    line(x, 0, x, height); // 網格線會遍佈整個畫布
    if (x % 100 === 0 && x < windowWidth * 0.3) { // 座標文字只顯示在左側 30% 區域
      fill(100, 150, 255, 50);
      noStroke();
      textSize(9);
      text(nf(x, 3), x + 2, 10);
    }
  }
  for (let y = 0; y <= height; y += 50) {
    stroke(100, 150, 255, 30);
    line(0, y, width, y);
  }
  pop();
}

// 記憶碎片類別 (漂浮的記憶感)
class MemoryShard {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = createVector(random(-0.2, 0.2), random(-0.1, -0.5)); // 緩慢向上漂浮
    this.size = random(10, 25);
    this.angle = random(TWO_PI);
    this.rotSpeed = random(0.01, 0.02);
    this.glow = 0; // 新增：發光強度屬性
  }
  update() {
    this.pos.add(this.vel);
    this.angle += this.rotSpeed;
    this.glow = lerp(this.glow, 0, 0.05); // 隨時間自動冷卻發光

    // --- 新增：滑鼠排斥邏輯 ---
    let mouseVec = createVector(mouseX, mouseY);
    let d = p5.Vector.dist(this.pos, mouseVec);
    if (d < 100) { // 當滑鼠距離小於 100 像素時觸發
      let push = p5.Vector.sub(this.pos, mouseVec); // 計算從滑鼠指向碎片的向量
      push.normalize();
      let strength = map(d, 0, 100, 4, 0); // 距離越近，推力越強 (最大 4)
      this.glow = map(d, 0, 100, 255, 50); // 距離越近，發光強度越高
      this.pos.add(push.mult(strength));
    }

    if (this.pos.y < -20) this.pos.y = height + 20; // 循環回到畫面
    if (this.pos.x < -20) this.pos.x = width + 20;  // 處理水平被推出去的情況
    if (this.pos.x > width + 20) this.pos.x = -20;
  }
  display() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);

    // 根據發光強度設定陰影效果
    if (this.glow > 5) {
      drawingContext.shadowBlur = map(this.glow, 0, 255, 0, 15);
      drawingContext.shadowColor = 'rgba(200, 220, 255, 0.8)';
    }

    noFill();
    stroke(200, 220, 255, map(this.glow, 0, 255, 40, 200)); // 動態調整邊框透明度
    rect(-this.size/2, -this.size/2, this.size, this.size);
    pop();
  }
}

// 繪製葉子的輔助函式
function drawLeaf(x, y, side) {
  push();
  translate(x, y);
  rotate(side * QUARTER_PI + sin(frameCount * 0.02) * 0.2);
  fill(46, 139, 87, 200);
  noStroke();
  // 畫一個簡單的葉片形狀
  ellipse(10 * side, 0, 15, 7);
  pop();
}

// 當滑鼠點擊時，檢查是否點到種子
function mousePressed() {
  // 檢查是否點擊到"設計理念"標題區域 (x:20~150, y:90~120)
  if (mouseX > 20 && mouseX < 150 && mouseY > 90 && mouseY < 125) {
    if (mouseX < windowWidth * 0.3) showConceptDetails = !showConceptDetails; // 確保只在左側 30% 區域內點擊才有效
    return; // 點擊標題後不觸發種子檢查
  }

  for (let s of seeds) {
    if (s.isHovered()) {
      s.clicked();
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight); // 調整畫布為新的全視窗大小

  // 重新初始化所有藤蔓路徑
  vinePoints = [];
  for (let i = 0; i <= 100; i++) {
    let y = map(i, 0, 100, height + 50, -50);
    let xBase = windowWidth * 0.3 / 2; // 重新計算左側 30% 區域的中心
    vinePoints.push({ xBase: xBase, y: y, angleOffset: i * 0.1 });
  }

  shortVinePoints = [];
  for (let i = 0; i <= 40; i++) {
    let y = map(i, 0, 40, height + 50, height * 0.5);
    let xBase = windowWidth * 0.3 * 0.8;
    shortVinePoints.push({ xBase: xBase, y: y, angleOffset: i * 0.15 });
  }

  // 重新調整 iframe 的位置和大小 (如果它存在)
  let iframe = document.getElementById('exhibit-frame');
  if (iframe) {
    iframe.style.width = '65%';
    iframe.style.height = '85vh';
    iframe.style.marginTop = '5vh';
  }
  // 重新調整設計理念文字框的位置和大小
  if (conceptTextElement) {
    let leftContentWidth = windowWidth * 0.3;
    let wrapWidth = leftContentWidth - 40;
    let conceptX = 20;
    let conceptY = 110;
    let lineHeight = 18;
    let maxBoxHeight = height - conceptY - 40;
    conceptTextElement.style.left = `${conceptX}px`;
    conceptTextElement.style.top = `${conceptY + lineHeight * 1.5}px`;
    conceptTextElement.style.width = `${wrapWidth}px`;
    conceptTextElement.style.height = `${maxBoxHeight - (lineHeight * 1.5 + 30) - 15}px`;
  }
}

// 週次節點類別 (Class)
class Seed {
  constructor(x, y, week, url, pathIdx, isShort = false) {
    this.week = week;
    this.url = url;
    this.pathIdx = pathIdx; // 記錄在藤蔓路徑中的索引
    this.isShort = isShort; // 紀錄是否屬於短藤蔓
    this.baseSize = 40;
    this.currentSize = 40;
    this.angle = 0;
    // 若是期末初稿，則使用金黃色；一般週次使用淺綠色
    this.color = (this.week === "Final") ? color(255, 215, 0) : color(144, 238, 144);
    this.isBlooming = false; 
    
    // 初始化種子位置
    this.x = x;
    this.y = y;

    // 根據週次設定單元說明文字
    const descriptions = {
      "1": "單元0 課程前置作業",
      "2-1": "單元1 增添色彩 - 玩耍色彩與留下痕跡",
      "2-2": "單元1 增添色彩 - 玩耍色彩與留下痕跡",
      "3": "單元2 網頁元素(DOM) - 取得文字、數值和其他輸入",
      "4": "單元3 增添色彩 海葵繪製",
      "5": "電流急急棒",
      "Final": "期末初稿《博物館失竊事件》"
    };
    this.unitDesc = descriptions[this.week] || "";
  }

  update() {
    // 讓種子座標跟著藤蔓的擺動與位置更新
    let p = this.isShort ? shortVinePoints[this.pathIdx] : vinePoints[this.pathIdx];
    this.y = p.y;

    // 重要：加上與藤蔓繪製邏輯同步的 sin() 擺動，點擊判定才會準確
    let swingOffset = this.isShort ? 10 : 15;
    this.x = p.xBase + sin(frameCount * 0.02 + p.angleOffset) * swingOffset;

    let hovered = this.isHovered();
    
    // 檢查滑鼠是否剛移入，觸發粒子噴發
    if (hovered && !this.isBlooming) {
      for (let i = 0; i < 15; i++) {
        particles.push(new Petal(this.x, this.y, color(255, 200, 200)));
      }
    }

    // 狀態與滑鼠懸停同步
    this.isBlooming = hovered;

    // 如果開花了，尺寸會持續輕微膨脹
    if (this.isBlooming) {
      this.currentSize = lerp(this.currentSize, this.baseSize * 1.8, 0.1);
      this.angle += 0.05;
    } else {
      this.currentSize = lerp(this.currentSize, this.baseSize, 0.1);
      this.angle = 0;
    }
  }

  display() {
    push();
    translate(this.x, this.y);
    rotate(sin(this.angle) * 0.2); // 輕微晃動

    // 設定發光效果
    if (this.isBlooming) {
      drawingContext.shadowBlur = 20;
      drawingContext.shadowColor = 'white';
    }

    noStroke();
    if (this.isBlooming) {
      // 繪製花瓣
      // 期末初稿開出金白色的花，一般則是粉色
      fill(this.week === "Final" ? color(255, 250, 200) : color(255, 200, 200));
      for (let i = 0; i < 6; i++) {
        push();
        rotate(TWO_PI * i / 6 + frameCount * 0.02);
        ellipse(this.currentSize * 0.4, 0, this.currentSize * 0.8, this.currentSize * 0.4);
        pop();
      }
      // 花蕊
      fill(255, 255, 150);
      ellipse(0, 0, this.currentSize * 0.6);
    } else if (this.isHovered()) {
      fill(255, 100, 100); // 懸停變色 (開花預兆)
    } else {
      fill(this.color);
    }
    
    // 如果還沒開花，畫種子
    if (!this.isBlooming) {
      ellipse(0, 0, this.currentSize, this.currentSize * 1.2);
    }
    
    // 取消發光，避免影響文字
    drawingContext.shadowBlur = 0;

    // 當懸停或開花時，在旁邊顯示單元說明並加上發光效果
    if (this.isBlooming) {
      push();
      fill(255, 255, 230); // 淺米色文字
      textAlign(LEFT, CENTER);
      textSize(15);
      drawingContext.shadowBlur = 15; // 文字發光強度
      drawingContext.shadowColor = 'rgba(255, 255, 150, 0.9)'; // 黃色發光
      text(this.unitDesc, this.currentSize * 0.8, 0); // 顯示在花朵右側
      pop();
    }
    
    // 標註週次
    fill(this.isBlooming ? 0 : 50);
    textAlign(CENTER, CENTER);
    textSize(12);
    text("W" + this.week, 0, 0);
    pop();
  }

  isHovered() {
    let d = dist(mouseX, mouseY, this.x, this.y);
    return d < this.currentSize / 2;
  }

  clicked() {
    // Iframe 整合：切換右側頁面
    let iframe = document.getElementById('exhibit-frame');
    if (iframe) {
      iframe.src = this.url;
      currentExhibitName = this.unitDesc; // 更新目前展示名稱
      
      if (this.week.toLowerCase() === "final") {
        loadingMessage = "期末進度載入中...";
        loadingTimer = 120; 
      } else {
        loadingMessage = `正在開啟 Week ${this.week} ...`;
        loadingTimer = 60;
      }
      console.log(`切換至第 ${this.week} 週作品: ${this.url}`);
    }
  }
}

// 花瓣粒子類別
class Petal {
  constructor(x, y, col) {
    this.pos = createVector(x, y);
    // 初始速度：向四周隨機散開
    this.vel = p5.Vector.random2D().mult(random(2, 5));
    this.acc = createVector(0, 0.05); // 微弱的重力
    this.lifespan = 255;
    this.color = col;
    this.size = random(5, 10);
    this.angle = random(TWO_PI);
    this.rotSpeed = random(-0.1, 0.1);
  }

  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.lifespan -= 2; // 隨著時間消失
    this.angle += this.rotSpeed;
  }

  display() {
    push();
    translate(this.pos.x, this.pos.y);
    rotate(this.angle);
    fill(red(this.color), green(this.color), blue(this.color), this.lifespan);
    noStroke();
    // 畫一個簡單的小花瓣形狀 (橢圓)
    ellipse(0, 0, this.size, this.size * 0.6);
    pop();
  }

  isFinished() {
    return this.lifespan < 0;
  }
}

// 環境塵埃類別 - 模擬光線下的微粒
class Dust {
  constructor() {
    this.pos = createVector(random(width), random(height));
    // 極慢的漂浮速度
    this.vel = createVector(random(-0.3, 0.3), random(0.1, 0.5));
    this.size = random(1, 3);
    this.wobble = random(TWO_PI); // 用於隨機晃動
  }

  update() {
    this.pos.add(this.vel);
    // 增加微小的正弦波晃動感
    this.pos.x += sin(frameCount * 0.02 + this.wobble) * 0.2;

    // 畫面邊界循環處理
    if (this.pos.y > height) this.pos.y = 0;
    if (this.pos.x > width) this.pos.x = 0;
    if (this.pos.x < 0) this.pos.x = width;
  }

  display() {
    // 計算塵埃距離光源中心 (width/2, -20) 的距離
    let d = dist(this.pos.x, this.pos.y, width / 2, -20);
    let lightRadius = windowWidth * 0.3 * 0.8; // 光源範圍限制在左側 30% 區域

    if (d < lightRadius) {
      // 關鍵：透明度隨距離光源的遠近而變化
      // 距離中心越近，alpha 越高 (越亮)
      let alpha = map(d, 0, lightRadius, 180, 0);
      
      // 增加一點隨機閃爍感 (Glint effect)
      let glint = map(sin(frameCount * 0.05 + this.wobble), -1, 1, 0.5, 1);
      
      noStroke();
      fill(255, 255, 230, alpha * glint);
      circle(this.pos.x, this.pos.y, this.size);
    }
  }
}

// 雲朵類別 - 緩慢移動的背景雲
class Cloud {
  constructor() {
    this.pos = createVector(random(width), random(height));
    this.vel = createVector(random(0.1, 0.5), 0); // 緩慢向右移動
    this.size = random(80, 150);
    this.opacity = random(50, 100); // 半透明
    this.wobble = random(TWO_PI); // 輕微上下浮動
  }

  update() {
    this.pos.add(this.vel);
    // 輕微的上下浮動
    this.pos.y += sin(frameCount * 0.01 + this.wobble) * 0.1;

    // 循環回到畫面左側
    if (this.pos.x > width + this.size / 2) {
      this.pos.x = -this.size / 2;
      this.pos.y = random(height); // 重新隨機 Y 座標
    }
  }

  display() {
    push();
    noStroke();
    fill(255, 255, 255, this.opacity); // 半透明白色
    ellipse(this.pos.x, this.pos.y, this.size, this.size * 0.6); // 橢圓形狀模擬雲朵
    pop();
  }
}

// 流星類別
class Meteor {
  constructor() {
    // 隨機從上方或側邊出現
    this.pos = createVector(random(width), random(height * 0.5));
    this.vel = createVector(random(5, 10), random(5, 10)); // 向右下疾馳
    this.len = random(40, 80); // 尾跡長度
    this.life = 255;
  }

  update() {
    this.pos.add(this.vel);
    this.life -= 4; // 衰減速度
  }

  display() {
    push();
    // 流星發光效果
    drawingContext.shadowBlur = 15;
    drawingContext.shadowColor = 'rgba(255, 255, 255, 0.5)';
    
    stroke(255, this.life);
    strokeWeight(2);
    
    // 繪製流星本身與尾跡 (一條漸細的線)
    let tailX = this.pos.x - this.vel.x * (this.len / 10);
    let tailY = this.pos.y - this.vel.y * (this.len / 10);
    
    // 使用漸層感的線條
    for (let i = 0; i < 10; i++) {
      let alpha = map(i, 0, 10, this.life, 0);
      stroke(255, alpha);
      let x1 = this.pos.x - this.vel.x * i;
      let y1 = this.pos.y - this.vel.y * i;
      let x2 = this.pos.x - this.vel.x * (i + 1);
      let y2 = this.pos.y - this.vel.y * (i + 1);
      line(x1, y1, x2, y2);
    }
    pop();
  }

  isFinished() {
    return this.life < 0 || this.pos.x > width || this.pos.y > height;
  }
}

// 螢火蟲尾跡粒子類別
class FireflyTail {
  constructor(x, y) {
    this.pos = createVector(x, y);
    this.lifespan = 150; // 尾跡消失的速度
    this.size = random(3, 6);
  }

  update() {
    this.lifespan -= 10;
    // 讓尾跡有一點點向上飄散的隨機位移
    this.pos.x += random(-0.5, 0.5);
    this.pos.y += random(-0.2, 0.2);
  }

  display() {
    push();
    noStroke();
    // 顏色與螢火蟲一致，但透明度隨生命值降低
    let alpha = map(this.lifespan, 0, 150, 0, 200);
    fill(255, 255, 200, alpha);
    let currentSize = map(this.lifespan, 0, 150, 0, this.size);
    ellipse(this.pos.x, this.pos.y, currentSize);
    pop();
  }

  isFinished() {
    return this.lifespan < 0;
  }
}