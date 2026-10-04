// 生成每个工具的独立落地页到 /t/<slug>.html,并重建 sitemap.xml。
// 目的:单页应用只能被搜索引擎收录一个页面,而每个工具对应的搜索词是不同的。
// 用法:node scripts/gen-seo-pages.cjs
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SITE = 'https://tuqingsong.pages.dev';
const TOOLS = require('./seo-tools-data.cjs');

// ---- 校验:view 必须真的存在于 index.html,否则生成的链接是死的 ----
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const realViews = new Set([...html.matchAll(/data-view="([a-z0-9]+)"/g)].map((m) => m[1]));
const badViews = TOOLS.filter((t) => !realViews.has(t.view));
if (badViews.length) {
  console.error('❌ 这些 view 在 index.html 里不存在(链接会是死的):');
  badViews.forEach((t) => console.error(`   ${t.view}  (${t.slug})`));
  process.exit(1);
}
// slug 不能重复
const slugs = TOOLS.map((t) => t.slug);
const dup = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (dup.length) { console.error('❌ slug 重复:', dup.join(', ')); process.exit(1); }
// 没覆盖到的工具也提醒一下
const covered = new Set(TOOLS.map((t) => t.view));
const uncovered = [...realViews].filter((v) => !covered.has(v));
if (uncovered.length) console.warn('⚠️ 这些工具还没有落地页:', uncovered.join(', '));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;
background:radial-gradient(900px 500px at 15% -10%,rgba(47,107,255,.07),transparent 60%),#f4f7fc;
color:#16233f;line-height:1.85;padding:0 0 60px}
header{background:rgba(255,255,255,.85);backdrop-filter:blur(12px);border-bottom:1px solid rgba(15,23,42,.06);
padding:14px 22px;position:sticky;top:0;z-index:9}
header a{color:#16233f;text-decoration:none;font-weight:800;font-size:17px}
header a::before{content:"";display:inline-block;width:9px;height:9px;border-radius:50%;
background:linear-gradient(135deg,#2f6bff,#5b8cff);margin-right:8px;vertical-align:1px}
main{max-width:760px;margin:0 auto;padding:34px 20px}
h1{font-size:27px;line-height:1.4;margin-bottom:14px;letter-spacing:-.3px}
.lead{font-size:16px;color:#455468;margin-bottom:22px}
.cta{display:inline-block;background:linear-gradient(135deg,#2f6bff,#5b8cff);color:#fff;text-decoration:none;
padding:13px 30px;border-radius:12px;font-weight:700;font-size:16px;box-shadow:0 8px 22px rgba(47,107,255,.28);
margin:6px 0 8px;transition:transform .15s}
.cta:hover{transform:translateY(-2px)}
.cta-note{font-size:13px;color:#6b7a94;margin-bottom:30px}
h2{font-size:19px;margin:30px 0 10px;padding-left:11px;border-left:4px solid #2f6bff}
h3{font-size:15px;margin:18px 0 6px;color:#2f6bff}
p{margin:10px 0;color:#2c3a52}
ol,ul{padding-left:22px;margin:10px 0}
li{margin:7px 0;color:#2c3a52}
.steps{background:#fff;border:1px solid #e2e8f2;border-radius:14px;padding:18px 22px;margin:14px 0;
box-shadow:0 2px 12px rgba(31,67,130,.05)}
.steps li{margin:9px 0}
.faq{background:#fff;border:1px solid #e2e8f2;border-radius:14px;padding:6px 22px;margin:14px 0;
box-shadow:0 2px 12px rgba(31,67,130,.05)}
.faq dt{font-weight:700;margin:16px 0 4px}
.faq dd{color:#455468;margin-bottom:16px;font-size:14px}
.privacy{background:linear-gradient(135deg,rgba(47,107,255,.06),rgba(0,180,216,.06));
border:1px solid rgba(47,107,255,.18);border-radius:14px;padding:16px 20px;margin:26px 0;font-size:14px}
.privacy b{color:#2f6bff}
.others{margin-top:36px;padding-top:22px;border-top:1px solid #e2e8f2}
.others h2{border:none;padding:0;font-size:15px;color:#6b7a94;margin-bottom:12px}
.others a{display:inline-block;background:#fff;border:1px solid #e2e8f2;border-radius:9px;
padding:7px 14px;margin:0 8px 8px 0;color:#2c3a52;text-decoration:none;font-size:13px;transition:.15s}
.others a:hover{border-color:#2f6bff;color:#2f6bff}
footer{max-width:760px;margin:40px auto 0;padding:20px;color:#6b7a94;font-size:12.5px;text-align:center;
border-top:1px solid #e2e8f2}
@media(max-width:600px){h1{font-size:22px}main{padding:24px 16px}}
`;

function page(t, all) {
  const url = `${SITE}/t/${t.slug}.html`;
  const others = all.filter((x) => x.slug !== t.slug).slice(0, 12);
  const faqLd = {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: t.faq.map(([q, a]) => ({
      '@type': 'Question', name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };
  const appLd = {
    '@context': 'https://schema.org', '@type': 'WebApplication',
    name: t.nav, url, applicationCategory: 'MultimediaApplication', operatingSystem: 'Web',
    description: t.desc,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'CNY' },
  };
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(t.title)}</title>
<meta name="description" content="${esc(t.desc)}" />
<meta name="keywords" content="${esc(t.keywords)}" />
<meta name="robots" content="index,follow" />
<meta name="theme-color" content="#2f6bff" />
<link rel="canonical" href="${url}" />
<meta property="og:type" content="article" />
<meta property="og:site_name" content="图轻松" />
<meta property="og:title" content="${esc(t.title)}" />
<meta property="og:description" content="${esc(t.desc)}" />
<meta property="og:url" content="${url}" />
<script type="application/ld+json">${JSON.stringify(appLd)}</script>
<script type="application/ld+json">${JSON.stringify(faqLd)}</script>
<style>${CSS}</style>
</head>
<body>
<header><a href="/">图轻松</a></header>
<main>
  <h1>${esc(t.nav)}</h1>
  <p class="lead">${esc(t.lead)}</p>
  <a class="cta" href="/?tool=${t.view}">免费使用 →</a>
  <p class="cta-note">不用注册,不用安装,打开就能用。</p>

${t.body.map(([h, p]) => `  <h2>${esc(h)}</h2>\n  <p>${esc(p)}</p>`).join('\n')}

  <h2>怎么用</h2>
  <div class="steps"><ol>
${t.steps.map((s) => `    <li>${esc(s)}</li>`).join('\n')}
  </ol></div>

  <div class="privacy">
    <b>文件不上传服务器。</b>这个页面对应的功能全部在你的浏览器里完成,文件不会发送到任何服务器,
    断网也能用。你可以打开浏览器开发者工具的 Network 面板自己验证。
  </div>

  <h2>常见问题</h2>
  <dl class="faq">
${t.faq.map(([q, a]) => `    <dt>${esc(q)}</dt>\n    <dd>${esc(a)}</dd>`).join('\n')}
  </dl>

  <a class="cta" href="/?tool=${t.view}">免费使用 ${esc(t.nav)} →</a>

  <div class="others">
    <h2>其他工具</h2>
${others.map((o) => `    <a href="/t/${o.slug}.html">${esc(o.nav)}</a>`).join('\n')}
    <a href="/">全部 ${all.length} 个工具</a>
  </div>
</main>
<footer>图轻松 · 图片与 PDF 工具,全部在浏览器本地处理,文件不上传服务器</footer>
</body>
</html>
`;
}

// ---- 写出页面 ----
const outDir = path.join(ROOT, 't');
fs.mkdirSync(outDir, { recursive: true });
for (const t of TOOLS) {
  fs.writeFileSync(path.join(outDir, `${t.slug}.html`), page(t, TOOLS), 'utf8');
}

// ---- 重建 sitemap ----
const today = new Date().toISOString().slice(0, 10);
const urls = [
  { loc: `${SITE}/`, priority: '1.0' },
  ...TOOLS.map((t) => ({ loc: `${SITE}/t/${t.slug}.html`, priority: '0.8' })),
];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf8');

console.log(`✅ 生成 ${TOOLS.length} 个落地页到 /t/`);
console.log(`✅ sitemap.xml 共 ${urls.length} 个 URL`);
