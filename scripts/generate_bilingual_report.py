# -*- coding: utf-8 -*-
"""
Generate the bilingual (English / 中文) PDF:
  Part 1 — How to Use 使用指南
  Part 2 — Technical Report 技术报告

Output: docs/OralScan_AI_UserGuide_TechReport_EN_CN.pdf
Run:    python scripts/generate_bilingual_report.py
Fonts:  Microsoft YaHei (Windows system font) — covers Latin + 简体中文.
"""

import os
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    HRFlowable,
)

# ── Fonts (YaHei covers EN + CN) ─────────────────────────────────────────────
pdfmetrics.registerFont(TTFont("YaHei", r"C:\Windows\Fonts\msyh.ttc", subfontIndex=0))
pdfmetrics.registerFont(TTFont("YaHei-Bold", r"C:\Windows\Fonts\msyhbd.ttc", subfontIndex=0))

# YaHei has no emoji glyphs — they render as tofu boxes in the PDF, so
# strip every emoji/symbol outside the CJK + Latin ranges before layout.
_EMOJI_RE = re.compile(
    "["
    "\U0001F000-\U0001FAFF"  # emoji blocks
    "\U00002600-\U000027BF"  # misc symbols + dingbats
    "\U00002B00-\U00002BFF"
    "\U0001F1E6-\U0001F1FF"  # flags
    "️‍⃣"     # variation selectors / ZWJ
    "]+"
)

def clean(text):
    out = _EMOJI_RE.sub("", text)
    out = re.sub(r"  +", " ", out)
    return out.strip()

LAVENDER = colors.HexColor("#6d28d9")
LAVENDER_DARK = colors.HexColor("#3b1d6e")
LAVENDER_LIGHT = colors.HexColor("#ede9fe")
GRAY = colors.HexColor("#4b5563")
AMBER_LIGHT = colors.HexColor("#fef3c7")

def S(name, **kw):
    base = dict(fontName="YaHei", fontSize=10, leading=15, wordWrap="CJK",
                textColor=colors.black, spaceAfter=4)
    base.update(kw)
    return ParagraphStyle(name, **base)

st_title    = S("title", fontName="YaHei-Bold", fontSize=24, leading=30,
                alignment=TA_CENTER, textColor=LAVENDER_DARK, spaceAfter=8)
st_subtitle = S("subtitle", fontSize=13, leading=19, alignment=TA_CENTER,
                textColor=GRAY, spaceAfter=4)
st_part     = S("part", fontName="YaHei-Bold", fontSize=18, leading=24,
                textColor=colors.white, alignment=TA_CENTER)
st_h1       = S("h1", fontName="YaHei-Bold", fontSize=14, leading=20,
                textColor=LAVENDER_DARK, spaceBefore=14, spaceAfter=6)
st_h2       = S("h2", fontName="YaHei-Bold", fontSize=11.5, leading=17,
                textColor=LAVENDER, spaceBefore=10, spaceAfter=4)
st_en       = S("en", fontSize=10, leading=15, spaceAfter=2)
st_cn       = S("cn", fontSize=10, leading=15.5, textColor=GRAY, spaceAfter=8)
st_bullet_en = S("bullet_en", fontSize=10, leading=14.5, leftIndent=14, spaceAfter=1)
st_bullet_cn = S("bullet_cn", fontSize=10, leading=15, leftIndent=14,
                 textColor=GRAY, spaceAfter=5)
st_small    = S("small", fontSize=8.5, leading=12, textColor=GRAY)
st_cell     = S("cell", fontSize=8.5, leading=12)
st_cell_b   = S("cell_b", fontName="YaHei-Bold", fontSize=8.5, leading=12)
st_warn     = S("warn", fontSize=9.5, leading=14, textColor=colors.HexColor("#92400e"))

story = []
A = story.append

def para(en, cn):
    A(Paragraph(clean(en), st_en))
    A(Paragraph(clean(cn), st_cn))

def bullet(en, cn):
    A(Paragraph("• " + clean(en), st_bullet_en))
    A(Paragraph("　" + clean(cn), st_bullet_cn))

def part_banner(text):
    t = Table([[Paragraph(clean(text), st_part)]], colWidths=[17 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LAVENDER),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
        ("ROUNDEDCORNERS", [8, 8, 8, 8]),
    ]))
    A(t)
    A(Spacer(1, 10))

def make_table(header, rows, widths, header_bg=LAVENDER, zebra=True):
    data = [[Paragraph(clean(h), S("th", fontName="YaHei-Bold", fontSize=8.5,
                                   leading=12, textColor=colors.white)) for h in header]]
    for r in rows:
        data.append([Paragraph(clean(c), st_cell) for c in r])
    t = Table(data, colWidths=widths, repeatRows=1)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), header_bg),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d8d4ee")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
    ]
    if zebra:
        for i in range(1, len(data)):
            if i % 2 == 0:
                style.append(("BACKGROUND", (0, i), (-1, i), colors.HexColor("#f6f4fc")))
    t.setStyle(TableStyle(style))
    A(t)
    A(Spacer(1, 6))

# ════════════════════════════════ COVER ══════════════════════════════════════
A(Spacer(1, 3.2 * cm))
A(Paragraph("OralScan AI", st_title))
A(Paragraph("Agentic AI for Oral Cancer Screening &amp; Tooth Health",
            S("c1", fontSize=14, leading=20, alignment=TA_CENTER,
              textColor=LAVENDER, spaceAfter=2)))
A(Paragraph("口腔癌筛查与牙齿健康的多智能体 AI 系统",
            S("c2", fontSize=14, leading=20, alignment=TA_CENTER,
              textColor=LAVENDER, spaceAfter=18)))
A(Paragraph("User Guide &amp; Technical Report — Bilingual Edition", st_subtitle))
A(Paragraph("使用指南 与 技术报告 — 中英双语版", st_subtitle))
A(Spacer(1, 1.2 * cm))

cover_rows = [
    ["Live App 在线系统", "https://um-idp-oral-cancer-agentic-ai.vercel.app"],
    ["Architecture 架构介绍页", "https://um-idp-oral-cancer-agentic-ai.vercel.app/introduction"],
    ["Source 源代码", "github.com/TKY0527/um-idp-oral-cancer-agentic-ai"],
    ["Version 版本", "June 2026 · University IDP Prototype 大学 IDP 原型"],
]
t = Table([[Paragraph(a, st_cell_b), Paragraph(b, st_cell)] for a, b in cover_rows],
          colWidths=[5 * cm, 12 * cm])
t.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (0, -1), LAVENDER_LIGHT),
    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#d8d4ee")),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LEFTPADDING", (0, 0), (-1, -1), 8),
]))
A(t)
A(Spacer(1, 1.4 * cm))
A(Paragraph("<b>Important:</b> Educational prototype — NOT a medical device, NOT a diagnosis. "
            "Always consult a qualified dentist or doctor.", st_warn))
A(Paragraph("<b>重要提示：</b>本系统为教育用途原型，不是医疗器械，结果不构成诊断。如有疑虑请咨询专业牙医或医生。",
            st_warn))
A(PageBreak())

# ═══════════════════════════ PART 1 — HOW TO USE ═════════════════════════════
part_banner("PART 1 · HOW TO USE — 使用指南")

A(Paragraph("1. Accounts &amp; Quick Start · 账号与快速开始", st_h1))
para("Open the live app and sign in with a one-tap demo account. Each role sees a different dashboard.",
     "打开在线系统，点击登录页上的一键演示账号即可进入。不同角色看到不同的工作台。")
make_table(
    ["Account 账号", "Password 密码", "Role 角色", "What you see 看到什么"],
    [
        ["patient1", "patient1", "Patient 患者",
         "Demo patient Aisyah (29, Malay) — profile, brushing chart, history 演示患者 Aisyah 的资料、刷牙图表与历史"],
        ["patient2", "patient2", "Patient 患者",
         "Demo patient Tan Wei Ming (58, smoker, high risk) 演示患者陈伟明（吸烟、高风险）"],
        ["test1", "test1", "Patient 患者", "Empty test account 空白测试账号"],
        ["doctor", "doctor", "Doctor 医生",
         "Triage queue, all patients, AI agents 分诊队列、全部患者、AI 智能体"],
        ["admin", "123456", "Admin 管理员",
         "/admin — control the 3 API keys 管理 3 个 API 密钥"],
    ],
    [2.6 * cm, 2.4 * cm, 2.6 * cm, 9.4 * cm],
)

A(Paragraph("2. Patient — Run a Screening · 患者端：运行筛查", st_h1))
bullet("Step 1 — Provide a mouth photo: pick a sample case, upload a file, or use the camera.",
       "第一步——提供口腔照片：选择示例病例、上传文件或直接用相机拍摄。")
bullet("Step 2 — Fill the short risk questionnaire (age, tobacco, alcohol, betel quid, lesion duration…).",
       "第二步——填写简短风险问卷（年龄、烟酒、槟榔、病灶持续时间等）。")
bullet("Step 3 — Pick the vision AI: Mock (offline) / Gemini / Claude / ChatGPT, then press Run.",
       "第三步——选择视觉 AI：Mock（离线）/ Gemini / Claude / ChatGPT，然后点击运行。")
bullet("Optional — '🔑 Plug in your own API key': paste your own ChatGPT / Gemini / Claude key; it is "
       "used directly for your requests and stays in your browser only.",
       "可选——『🔑 使用自己的 API 密钥』：粘贴你自己的 ChatGPT / Gemini / Claude 密钥，"
       "仅保存在你的浏览器中，并直接用于你的请求。")
para("ONE photo returns TWO results: <b>Function 1 — oral-cancer cues</b> (visual finding, region, "
     "probability, 0–100 risk score) and <b>Function 2 — tooth health</b> (cavity 蛀牙 risk, gum condition, "
     "plaque, staining, hygiene score, and whether professional scaling is needed).",
     "一张照片同时得到两类结果：功能一——口腔癌线索（视觉发现、部位、概率、0–100 风险分）；"
     "功能二——牙齿健康（蛀牙风险、牙龈状况、牙菌斑、染色、卫生评分，以及是否需要洗牙）。")
para("On Medium/High risk a 3-expert AI panel automatically debates the case and a moderator "
     "summarises the verdict. The History page shows your risk-trend chart.",
     "当风险为中/高时，3 位 AI 专家会自动会诊并由主持人汇总结论。『历史』页面会显示你的风险趋势图。")

A(Paragraph("3. Doctor — Review &amp; AI Agents · 医生端：审阅与 AI 智能体", st_h1))
bullet("Triage Queue: every screening from web AND Telegram, sorted by urgency.",
       "分诊队列：来自网页和 Telegram 的所有筛查，按紧急程度排序。")
bullet("Patients page: click '🌱 Load demo patients' once — Aisyah / Tan / Muthu appear with full records "
       "(name, age, race, habits, brushing times, last scaling date, prior reports, charts, heatmap).",
       "患者页面：点一次『🌱 加载演示患者』——Aisyah / Tan / Muthu 即出现，包含完整档案"
       "（姓名、年龄、种族、习惯、刷牙时间、上次洗牙日期、过往报告、图表与热力图）。")
bullet("AI Triage Agent (top of Patients page): ask 'Which patient should I see first?' — the agent calls "
       "its compare_all_patients tool and ranks the cohort with reasons. Watch the 🔧 tool-trace chips.",
       "AI 分诊智能体（患者页顶部）：问『我应该先看哪位病人？』——智能体调用 compare_all_patients "
       "工具，给出带理由的排序。🔧 标签实时显示它调用了哪些工具。")
bullet("Per-patient AI Assistant: summarise history, risk trend, red flags, scaling status — answers with "
       "real numbers fetched live by its tools.",
       "单个患者的 AI 助手：总结病史、风险趋势、危险信号、洗牙情况——其工具实时取数，用真实数字回答。")
bullet("Session review: agree / upgrade / downgrade / refer, with notes — saved to the record.",
       "病例审阅：同意 / 升级 / 降级 / 转诊，可填写备注——写入档案。")

A(Paragraph("4. Admin — Control the 3 API Keys · 管理员：管理 3 个 API 密钥", st_h1))
para("Log in as <b>admin / 123456</b> → you land on <b>/admin</b>. Paste any of the 3 provider keys "
     "(ChatGPT / Gemini / Claude) and click Save. They apply to EVERY user instantly — web and the "
     "Telegram bot — no redeploy. Keys are masked after saving.",
     "用 admin / 123456 登录后自动进入 /admin 页面。粘贴任意 3 个供应商密钥（ChatGPT / Gemini / Claude）"
     "并保存，立即对所有用户生效——包括网页端和 Telegram 机器人，无需重新部署。保存后密钥只显示掩码。")
para("Key precedence everywhere: user's own pasted key → admin key → backend env key → offline mock.",
     "密钥优先级（全局一致）：用户自己粘贴的密钥 → 管理员密钥 → 服务器环境变量密钥 → 离线 Mock。")

A(Paragraph("5. Telegram Bot — Zero-Press · Telegram 机器人：零点击", st_h1))
para("Just send the bot a photo of the inside of a mouth — that's it. No buttons, no questions. "
     "The full agent pipeline runs immediately using the active demo patient's stored records "
     "(history, habits, last scaling date) and replies with BOTH reports plus the agent trace.",
     "直接给机器人发送一张口腔内部照片即可——无需任何按钮或回答问题。系统立刻用当前演示患者的档案"
     "（病史、习惯、上次洗牙日期）运行完整智能体流水线，回复两类报告及智能体运行轨迹。")
make_table(
    ["Command 指令", "Effect 作用"],
    [
        ["(send a photo 发送照片)", "Instant screening as the active demo patient 立即以当前演示患者身份筛查"],
        ["/changepatient", "Switch demo patient: Aisyah → Tan → Muthu 切换演示患者（别名 /anotherpatient）"],
        ["/language", "English ↔ Bahasa Malaysia 切换语言"],
        ["/help · /start", "Show the welcome card with the active patient 显示欢迎信息与当前患者卡片"],
    ],
    [5.2 * cm, 11.8 * cm],
)

A(Paragraph("6. Two-Minute Demo Script · 两分钟演示脚本", st_h1))
bullet("① Login doctor/doctor → Patients → 'Load demo patients' → ask the triage agent who to see first.",
       "① 用 doctor/doctor 登录 → 患者页 → 加载演示患者 → 问分诊智能体应先看谁。")
bullet("② Login patient1 → New Screening → run a sample case → show the two-function result and the "
       "live agent pipeline animation.",
       "② 用 patient1 登录 → 新筛查 → 运行示例病例 → 展示双功能结果与智能体流水线动画。")
bullet("③ On Telegram, send a photo → instant result; /changepatient → send again as high-risk Tan.",
       "③ 在 Telegram 发一张照片 → 立即出结果；/changepatient 后再发一张，以高风险患者陈伟明身份筛查。")
bullet("④ Open /introduction → walk the architecture diagram and the OpenClaw / Claude Code / Hermes "
       "pattern table.",
       "④ 打开 /introduction → 讲解架构分层图，以及借鉴 OpenClaw / Claude Code / Hermes 的设计模式表。")
A(PageBreak())

# ═══════════════════════ PART 2 — TECHNICAL REPORT ═══════════════════════════
part_banner("PART 2 · TECHNICAL REPORT — 技术报告")

A(Paragraph("1. System Overview · 系统概览", st_h1))
para("OralScan AI is a hierarchical multi-agent system: ~14 specialised agents collaborate on every "
     "screening. One photo enters through any channel (web or Telegram); a single gateway routes it to "
     "the Orchestrator, which dispatches the specialist agents in order; every LLM output is structured "
     "JSON; every result becomes a shared record visible to both patient and doctor.",
     "OralScan AI 是一个分层多智能体系统：每次筛查由约 14 个专职智能体协作完成。一张照片从任意渠道"
     "（网页或 Telegram）进入，由统一网关交给『编排者』智能体依序调度各专职智能体；所有大模型输出均为"
     "结构化 JSON；所有结果都写入共享存储，患者端与医生端同步可见。")

A(Paragraph("2. Seven-Layer Architecture · 七层架构", st_h2))
make_table(
    ["Layer 层", "What it does 职责", "Key files 关键文件"],
    [
        ["1 · Channels 渠道", "Patient web / Doctor web / Telegram / Admin — four doors, one brain "
         "四个入口共用同一大脑", "app/* · lib/telegram/handler.ts"],
        ["2 · Gateway 网关", "Role-checked auth, channel adapters, key resolution "
         "角色鉴权、渠道适配、密钥解析", "middleware.ts · app/api/*"],
        ["3 · Lead agent 主智能体", "Orchestrator dispatches all agents + audit log "
         "编排者依序调度并记录审计日志", "lib/agents/orchestratorAgent.ts"],
        ["4 · Specialists 专职智能体", "IoT → Vision → Risk → RAG → Expert Panel → Report → Referral → "
         "Triage → Dental 流水线", "lib/agents/*"],
        ["5 · Models 模型层", "ChatGPT / Gemini / Claude / mock — swappable 可热切换",
         "lib/visionProviders/*"],
        ["6 · Memory 记忆层", "KV records: sessions, profiles, messages, admin keys "
         "会话、档案、消息、密钥记录", "lib/server/repository.ts · kv.ts"],
        ["7 · Outcomes 输出", "Patient report · doctor queue · Telegram reply 三种视图同一数据",
         "components/*"],
    ],
    [3.2 * cm, 8.6 * cm, 5.2 * cm],
)

A(Paragraph("3. The Agent Registry · 智能体清单", st_h1))
make_table(
    ["Agent 智能体", "Role 职责"],
    [
        ["🧠 Orchestrator 编排者", "Knows the full pipeline; dispatches every agent; writes the audit log. "
         "掌握全流程，逐一调度并记录审计日志。"],
        ["🪥 Toothbrush IoT 牙刷物联网", "Simulated smart-toothbrush telemetry: duration, pressure, coverage. "
         "模拟智能牙刷遥测：时长、压力、覆盖率。"],
        ["👁️ Vision Screening 视觉筛查", "ONE image → TWO functions: cancer cues + tooth-health signs; "
         "provider pluggable with mock fallback. 一图双检：癌症线索 + 牙齿健康；模型可插拔并自动回退。"],
        ["📊 Cancer Risk Scoring 风险评分", "Deterministic 0–100 score, literature-calibrated weights "
         "(IARC / INHANCE). 确定性 0–100 评分，权重源自文献。"],
        ["🦷 Dental Wellness 牙齿健康", "Cavity 蛀牙 / gums / plaque / staining / hygiene + scaling (洗牙) "
         "advice using the last-scaling record. 结合上次洗牙记录给出洗牙建议。"],
        ["🧑‍⚕️ Multi-Expert Panel 专家会诊", "3 role-prompted experts in PARALLEL (Pathologist on Claude; "
         "Epidemiologist + Dentist on Gemini) + deterministic Moderator. 三专家并行会诊 + 主持人汇总，保留分歧。"],
        ["🤝 Consensus 共识核对", "Second model re-reads the same image; agreement score. "
         "第二个模型复核同一张图，计算一致性分数。"],
        ["📚 Retrieval (RAG) 知识检索", "Grounds results in a curated oral-cancer knowledge base. "
         "用口腔癌知识库为结论提供依据。"],
        ["💬 Patient Communication 患者沟通", "Plain-language report with mandatory disclaimer. "
         "通俗语言报告，强制附带免责声明。"],
        ["🏥 Clinician Referral 转诊", "Structured referral packet — generated ONLY on High risk. "
         "仅在高风险时生成结构化转诊单。"],
        ["🚦 Triage Prioritization 分诊排序", "Urgency + SLA for the doctor queue. 为医生队列计算紧急度与时限。"],
        ["🤖 Doctor Assistant 医生助手", "REAL tool loop: model → tool → observation → repeat (≤4 steps) over "
         "a registry (profile / sessions / compare-all). 真实工具循环，最多 4 步，含全员比较工具。"],
        ["🗨️ Patient Chat 患者聊天", "Multi-provider chain (Gemini → Claude → ChatGPT) + safe deterministic "
         "fallback. 多供应商链式回退 + 安全离线兜底。"],
        ["📲 Telegram Gateway 渠道网关", "Zero-press channel adapter into the same pipeline and store. "
         "零点击渠道适配器，与网页共用流水线与存储。"],
    ],
    [4.6 * cm, 12.4 * cm],
)

A(Paragraph("4. One Picture, Two Functions · 一图双检设计", st_h1))
para("A single shared prompt (lib/visionProviders/shared.ts) instructs whichever vision model is selected "
     "to return BOTH detections in one call: (1) oral-cancer cues — finding / region / probability / "
     "bounding boxes; (2) dental signs — cavity signs, gum redness, plaque/tartar, staining. The response "
     "is forced into typed JSON, coerced and clamped before any downstream agent reads it. The Dental "
     "Wellness agent then combines the image signs with toothbrush telemetry, the questionnaire, and the "
     "patient's last-scaling record to decide cavity risk and whether scaling is due.",
     "统一提示词（lib/visionProviders/shared.ts）让所选视觉模型在一次调用中同时返回两类检测："
     "（1）口腔癌线索——发现/部位/概率/检测框；（2）牙齿体征——蛀牙迹象、牙龈红肿、牙菌斑、染色。"
     "返回内容强制为类型化 JSON，并经过约束与裁剪后才进入后续智能体。『牙齿健康』智能体再结合牙刷遥测、"
     "问卷与上次洗牙记录，判断蛀牙风险与是否需要洗牙。")

A(Paragraph("5. API Key Management · 密钥管理", st_h1))
make_table(
    ["Priority 优先级", "Source 来源", "Scope 作用范围"],
    [
        ["1 (highest 最高)", "User-pasted demo key (browser localStorage) 用户自己粘贴的密钥（仅存浏览器）",
         "That user's own requests 仅该用户的请求"],
        ["2", "Admin keys pasted at /admin (KV) 管理员在 /admin 粘贴的密钥（存 KV）",
         "ALL users + Telegram, instantly 全体用户与 Telegram，即时生效"],
        ["3", "Backend env vars (Vercel) 服务器环境变量", "Server-wide fallback 服务器级兜底"],
        ["4 (lowest 最低)", "Deterministic mock 离线确定性 Mock",
         "Never crashes — degrades and says so 永不崩溃，降级并明确提示"],
    ],
    [3.2 * cm, 8.2 * cm, 5.6 * cm],
)
para("Safety: keys are never logged or echoed; the admin API returns masked previews only; the Gemini key "
     "travels in a header (not the URL) to keep it out of proxy logs.",
     "安全性：密钥不写日志、不回显；管理员接口仅返回掩码；Gemini 密钥放在请求头而非 URL，避免进入代理日志。")

A(Paragraph("6. Patterns Borrowed from Leading Agent Harnesses · 借鉴的前沿智能体设计模式", st_h1))
make_table(
    ["Source 来源", "Pattern 模式", "Our implementation 我们的实现"],
    [
        ["OpenClaw", "Gateway: many channels, one loop 多渠道单循环网关",
         "Web + Telegram are thin adapters over one pipeline 网页与 Telegram 共用同一流水线"],
        ["OpenClaw", "Zero-press proactive agent 零点击主动智能体",
         "Photo is the only input needed 一张照片即触发全流程"],
        ["OpenClaw", "Inspectable memory 可检视记忆",
         "Plain JSON records per patient in KV 每位患者的纯 JSON 记录"],
        ["Claude Code", "Lead agent + parallel subagents 主智能体+并行子智能体",
         "Orchestrator + 3-expert panel with moderator 编排者 + 三专家并行会诊"],
        ["Claude Code", "Structured outputs 结构化输出",
         "Typed JSON everywhere; Gemini hard responseSchema 全链路类型化 JSON"],
        ["Claude Code", "Audit log + permissions 审计日志与权限",
         "Per-session agent trace; role-gated APIs 每次会话的智能体轨迹；角色鉴权"],
        ["Hermes", "Self-describing tool registry 自描述工具注册表",
         "doctorTools.ts — add a tool, agent uses it 新增工具即用"],
        ["Hermes", "Core loop: model→tool→observe→repeat 核心循环",
         "Doctor Assistant ≤4-step tool loop with visible 🔧 trace 可见工具轨迹"],
        ["Hermes", "Provider abstraction + fallbacks 模型抽象与回退",
         "3 APIs behind one interface; graceful chain 三家 API 单接口，链式优雅降级"],
    ],
    [2.6 * cm, 6.4 * cm, 8 * cm],
)

A(Paragraph("7. Technology Stack &amp; Deployment · 技术栈与部署", st_h1))
make_table(
    ["Layer 层面", "Technology 技术"],
    [
        ["Frontend 前端", "Next.js 16 (App Router, Turbopack) · React 19 · TypeScript 5 · Tailwind CSS 3 · "
         "bilingual EN/BM UI 双语界面"],
        ["Backend 后端", "Next.js API routes (Node runtime) · Edge middleware auth · SSE streaming 实时流式进度"],
        ["AI 模型", "Gemini (generateContent + responseSchema) · Claude (Messages API) · ChatGPT "
         "(chat-completions, vision) · deterministic mock"],
        ["Storage 存储", "Upstash Redis (Vercel KV REST) · in-memory dev fallback 本地内存兜底"],
        ["Channels 渠道", "Web (Vercel) · Telegram webhook (production) / long-poll bot (dev)"],
        ["Deployment 部署", "GitHub → Vercel auto-deploy on push to main 推送即自动部署"],
        ["Auth 鉴权", "HMAC-SHA256 signed cookies (Web Crypto) · roles: patient / doctor / admin"],
    ],
    [3.4 * cm, 13.6 * cm],
)

A(Paragraph("8. Safety &amp; Limitations · 安全与限制", st_h1))
bullet("Educational prototype only — not a medical device; every output carries a disclaimer; the chat "
       "agent refuses diagnosis requests.",
       "仅为教育原型——不是医疗器械；所有输出均附免责声明；聊天助手会拒绝诊断类请求。")
bullet("Demo-grade auth (seeded plaintext-compared passwords) and demo-grade key storage (KV, not a "
       "secret manager) — replace both before any real use.",
       "演示级鉴权（内置明文比对密码）与演示级密钥存储（KV 而非专用密钥库）——任何真实使用前必须替换。")
bullet("Risk weights are literature-calibrated heuristics, not a clinically validated model; the toothbrush "
       "telemetry is simulated pending real IoT hardware.",
       "风险权重为文献校准的启发式规则，并非经临床验证的模型；牙刷遥测目前为模拟数据，待接入真实硬件。")
bullet("If a provider key is missing or a call fails, the pipeline degrades to mock and clearly labels the "
       "fallback in the provider badge and audit log.",
       "若缺少密钥或调用失败，流水线降级为 Mock，并在供应商标识与审计日志中明确标注。")

A(Spacer(1, 12))
A(HRFlowable(width="100%", thickness=0.6, color=LAVENDER_LIGHT))
A(Spacer(1, 6))
A(Paragraph("OralScan AI · University IDP · June 2026 — Generated bilingual edition "
            "本文档为自动生成的中英双语版。", st_small))

# ── Build with header/footer ─────────────────────────────────────────────────
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
                   "docs", "OralScan_AI_UserGuide_TechReport_EN_CN.pdf")

def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFont("YaHei", 7.5)
    canvas.setFillColor(GRAY)
    if doc.page > 1:
        canvas.drawString(2 * cm, 1.1 * cm,
                          "OralScan AI — User Guide & Technical Report 使用指南与技术报告")
        canvas.drawRightString(A4[0] - 2 * cm, 1.1 * cm, f"Page {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate(
    OUT, pagesize=A4,
    leftMargin=2 * cm, rightMargin=2 * cm, topMargin=1.8 * cm, bottomMargin=1.8 * cm,
    title="OralScan AI — User Guide & Technical Report (EN/CN)",
    author="OralScan AI Team",
)
doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print("OK:", OUT)
